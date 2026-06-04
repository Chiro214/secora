// backend/src/jobs/cveFeedImporter.js
import axios from 'axios';
import prisma from '../config/prisma.js';

const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const BATCH_SIZE = 100;

/**
 * Check if database is available
 */
async function isDatabaseAvailable() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch {
        return false;
    }
}

/**
 * Import CVE data from NVD
 * @param {Object} options - Import options
 */
export async function importCVEFeed(options = {}) {
    // Check database first
    if (!await isDatabaseAvailable()) {
        console.log('ℹ️ CVE import skipped - database not available');
        return { imported: 0, updated: 0, errors: 0, skipped: true };
    }

    const {
        startDate = getLastWeek(),
        endDate = new Date(),
        apiKey = process.env.NVD_API_KEY
    } = options;

    console.log(`📥 Starting CVE import from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    let imported = 0;
    let updated = 0;
    let errors = 0;
    let startIndex = 0;

    try {
        while (true) {
            const params = {
                pubStartDate: startDate.toISOString(),
                pubEndDate: endDate.toISOString(),
                resultsPerPage: BATCH_SIZE,
                startIndex
            };

            const headers = apiKey ? { 'apiKey': apiKey } : {};

            const response = await axios.get(NVD_API_BASE, {
                params,
                headers,
                timeout: 30000
            });

            const { vulnerabilities, totalResults } = response.data;

            if (!vulnerabilities || vulnerabilities.length === 0) {
                break;
            }

            for (const item of vulnerabilities) {
                try {
                    await importCVE(item.cve);
                    imported++;
                } catch (error) {
                    errors++;
                }
            }

            console.log(`📊 Progress: ${imported + errors}/${totalResults} CVEs processed`);

            startIndex += BATCH_SIZE;

            if (startIndex >= totalResults) {
                break;
            }

            // Rate limiting: wait 6 seconds between requests (NVD limit)
            await sleep(apiKey ? 600 : 6000);
        }

        console.log(`✅ CVE import complete: ${imported} imported, ${updated} updated, ${errors} errors`);

        return { imported, updated, errors };
    } catch (error) {
        console.error('❌ CVE import failed:', error.message);
        return { imported, updated, errors, failed: true };
    }
}


/**
 * Import a single CVE
 */
async function importCVE(cveData) {
    const cveId = cveData.id;
    const published = new Date(cveData.published);
    const lastModified = new Date(cveData.lastModified);

    // Extract CVSS scores
    const cvssV3 = cveData.metrics?.cvssMetricV31?.[0]?.cvssData;
    const cvssV2 = cveData.metrics?.cvssMetricV2?.[0]?.cvssData;

    // Extract description
    const description = cveData.descriptions?.find(d => d.lang === 'en')?.value || '';

    // Extract references
    const references = cveData.references?.map(ref => ref.url) || [];

    // Map NVD severity to our Severity enum (CRITICAL, HIGH, MEDIUM, LOW, INFO)
    const rawSeverity = (cvssV3?.baseSeverity || cvssV2?.baseSeverity || '').toUpperCase();
    const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    const severity = VALID_SEVERITIES.includes(rawSeverity) ? rawSeverity : 'INFO';

    // Extract vendor/product from CPE if available
    let vendor = null;
    let product = null;
    if (cveData.configurations) {
        for (const config of cveData.configurations) {
            for (const node of config.nodes || []) {
                for (const match of node.cpeMatch || []) {
                    if (match.criteria) {
                        // CPE format: cpe:2.3:a:vendor:product:version:...
                        const parts = match.criteria.split(':');
                        if (parts.length >= 5) {
                            vendor = vendor || parts[3];
                            product = product || parts[4];
                        }
                    }
                }
            }
        }
    }

    // Upsert CVE
    await prisma.cVE.upsert({
        where: { cveId },
        update: {
            description,
            cvssScore: cvssV3?.baseScore || cvssV2?.baseScore || 0,
            cvssVector: cvssV3?.vectorString || cvssV2?.vectorString || null,
            severity,
            vendor,
            product,
            publishedDate: published,
            lastModified,
            references
        },
        create: {
            cveId,
            description,
            cvssScore: cvssV3?.baseScore || cvssV2?.baseScore || 0,
            cvssVector: cvssV3?.vectorString || cvssV2?.vectorString || null,
            severity,
            vendor,
            product,
            publishedDate: published,
            lastModified,
            references
        }
    });
}

/**
 * Get date one week ago
 */
function getLastWeek() {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Schedule periodic CVE updates
 */
export function scheduleCVEUpdates(intervalHours = 24) {
    console.log(`⏰ Scheduling CVE updates every ${intervalHours} hours`);

    // Run immediately (will skip if DB not available)
    importCVEFeed().catch(() => { });

    // Schedule periodic updates
    setInterval(() => {
        importCVEFeed().catch(() => { });
    }, intervalHours * 60 * 60 * 1000);
}

export default {
    importCVEFeed,
    scheduleCVEUpdates
};
