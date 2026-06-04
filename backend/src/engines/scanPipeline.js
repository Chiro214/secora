// backend/src/engines/scanPipeline.js
// Main scan pipeline orchestrator — Full VAPT with OAST, JS crawling, and enterprise reporting
import { networkScanEngine } from './networkScan.js';
import { webCrawlerEngine } from './webCrawler.js';
import { jsCrawlerEngine } from './jsCrawler.js';
import { parseApiSchemas } from './apiSchemaParser.js';
import { batchDiscoverParameters } from './paramDiscovery.js';
import { vulnTestEngine } from './vulnTest.js';
import { cveMatchEngine } from './cveMatch.js';
import { correlationEngine } from './correlation.js';
import { startOASTServer, stopOASTServer } from '../oast/oastServer.js';
import { logger } from '../utils/logger.js';
import { computeAllCVSS } from '../reporting/cvssCalculator.js';
import { generateComplianceSummary, mapToCompliance } from '../reporting/complianceMapper.js';
import { generateExecutiveSummary } from '../reporting/executiveSummary.js';
import { generateAllBusinessImpacts } from '../reporting/businessImpact.js';
import { generateRemediation } from '../reporting/remediationEngine.js';
import prisma from '../config/prisma.js';
import { 
    emitScanProgress, 
    emitScanPhaseComplete, 
    emitAssetDiscovered,
    emitEndpointDiscovered,
    emitFindingDiscovered,
    emitCVEMatched,
    emitScanStats
} from '../websocket/scanEvents.js';
import { closeSharedBrowser } from '../utils/screenshotCapture.js';

/**
 * Main scan pipeline orchestrator
 * Executes scan phases based on profile
 */
export async function executeScanPipeline({ scanId, target, profile, config, onProgress }) {
    const results = {
        assets: [],
        endpoints: [],
        findings: [],
        technologies: [],
        wafInfo: null,
        executiveSummary: null,
        complianceSummary: null,
        stats: {
            assetsFound: 0,
            endpointsFound: 0,
            findingsCount: 0,
            criticalCount: 0,
            highCount: 0,
            mediumCount: 0,
            lowCount: 0
        }
    };
    
    try {
        // Phase 0: Start OAST Callback Server
        try {
            await startOASTServer();
            logger.info('🔔 OAST callback server initialized');
        } catch (err) {
            logger.warn(`⚠️ OAST server failed to start: ${err.message}`);
            logger.warn('   Blind vulnerability detection will be limited');
        }

        // Phase 1: Network Reconnaissance (if applicable)
        if (['FULL_VAPT', 'QUICK_RECON'].includes(profile)) {
            await onProgress(10, 'Network Reconnaissance');
            emitScanProgress(scanId, 'NETWORK_SCAN', 10, 'Starting network reconnaissance...');
            
            try {
                const networkResults = await networkScanEngine({
                    target: target.value,
                    type: target.type,
                    config: {
                        ports: config.ports || 'top1000',
                        timeout: config.timeout || 5000,
                        ...config
                    }
                });
                
                // Store assets
                if (networkResults && networkResults.hosts) {
                    for (const host of networkResults.hosts) {
                        const asset = await prisma.asset.create({
                            data: {
                                targetId: target.id,
                                type: 'HOST',
                                value: host.hostname || host.ip,
                            ipAddress: host.ip,
                            ports: host.ports,
                            services: host.services,
                            discoveredBy: 'network-scan'
                        }
                    });
                    results.assets.push(asset);
                    emitAssetDiscovered(scanId, asset);
                }
                }
            } catch (err) {
                logger.error(`Network scan failed: ${err.message}`);
            }
            
            results.stats.assetsFound = results.assets.length;
            emitScanPhaseComplete(scanId, 'NETWORK_SCAN', { assetsFound: results.assets.length });
        }
        
        // Phase 2: Web Discovery & Crawling (JS-aware + API Schema + Param Discovery)
        if (['FULL_VAPT', 'WEB_APP_SCAN'].includes(profile)) {
            await onProgress(25, 'Web Discovery');
            emitScanProgress(scanId, 'WEB_CRAWL', 25, 'Discovering web endpoints...');

            // 2a: API Schema Discovery (Swagger/OpenAPI/GraphQL)
            let schemaEndpoints = [];
            try {
                const targetUrl = target.type === 'DOMAIN' ? `https://${target.value}` : target.value;
                const schemaResults = await parseApiSchemas(targetUrl, { headers: config.authHeaders });
                schemaEndpoints = schemaResults.endpoints;
                logger.info(`  📋 API schemas: ${schemaEndpoints.length} endpoints from specs`);
            } catch (err) {
                logger.warn(`  API schema discovery skipped: ${err.message}`);
            }

            // 2b: JS-Rendering Crawler (primary) with HTTP fallback
            let crawlResults;
            try {
                crawlResults = await jsCrawlerEngine({
                    target: target.value,
                    type: target.type,
                    config: {
                        maxDepth: config.maxDepth || 3,
                        maxUrls: config.maxUrls || 500,
                        auth: config.auth || null,
                        respectRobots: config.respectRobots !== false,
                        ...config
                    }
                });
                results.technologies = crawlResults.technologies || [];
            } catch (err) {
                logger.warn(`  JS crawler failed, falling back to HTTP crawler: ${err.message}`);
                try {
                    crawlResults = await webCrawlerEngine({
                        target: target.value,
                        type: target.type,
                        config: {
                            maxDepth: config.maxDepth || 3,
                            maxUrls: config.maxUrls || 500,
                            respectRobots: config.respectRobots !== false,
                            ...config
                        }
                    });
                } catch (fallbackErr) {
                    logger.error(`  HTTP crawler fallback failed: ${fallbackErr.message}`);
                    crawlResults = { urls: [], technologies: [] };
                }
            }

            // Merge schema + crawl endpoints
            const allUrls = [...(crawlResults.urls || []), ...schemaEndpoints];
            
            // Store endpoints
            for (const url of allUrls) {
                const hostname = new URL(url.url).hostname;
                let asset = results.assets.find(a => a.value === hostname);
                
                if (!asset) {
                    asset = await prisma.asset.create({
                        data: {
                            targetId: target.id,
                            type: 'URL',
                            value: hostname,
                            technologies: results.technologies,
                            discoveredBy: url.discoveredBy || 'js-crawler'
                        }
                    });
                    results.assets.push(asset);
                }
                
                const endpoint = await prisma.endpoint.create({
                    data: {
                        assetId: asset.id,
                        url: url.url,
                        method: url.method || 'GET',
                        statusCode: url.statusCode,
                        parameters: url.parameters,
                        discoveredBy: url.discoveredBy || 'js-crawler'
                    }
                });
                results.endpoints.push(endpoint);
            }

            // 2c: Hidden Parameter Discovery
            try {
                await onProgress(35, 'Parameter Discovery');
                const paramResults = await batchDiscoverParameters(
                    results.endpoints.slice(0, 20),
                    { headers: config.authHeaders }
                );
                // Enrich endpoints with discovered params
                for (const pr of paramResults) {
                    const ep = results.endpoints.find(e => e.url === pr.endpoint);
                    if (ep && pr.discovered.length > 0) {
                        const existingParams = ep.parameters || {};
                        for (const dp of pr.discovered) {
                            existingParams[dp.name] = { in: 'query', type: 'string', discovered: true };
                        }
                        await prisma.endpoint.update({
                            where: { id: ep.id },
                            data: { parameters: existingParams }
                        });
                        ep.parameters = existingParams;
                    }
                }
            } catch (err) {
                logger.warn(`  Parameter discovery skipped: ${err.message}`);
            }
            
            results.stats.endpointsFound = results.endpoints.length;
            results.stats.assetsFound = results.assets.length;
            emitScanPhaseComplete(scanId, 'WEB_CRAWL', {
                endpointsFound: results.endpoints.length,
                technologies: results.technologies
            });
        }
        
        // Phase 3: Vulnerability Testing (all 14 modules)
        if (['FULL_VAPT', 'WEB_APP_SCAN'].includes(profile)) {
            await onProgress(45, 'Vulnerability Testing');
            emitScanProgress(scanId, 'VULN_TEST', 45, 'Running vulnerability tests...');
            
            try {
                const vulnResults = await vulnTestEngine({
                    scanId,
                    assets: results.assets,
                    endpoints: results.endpoints,
                    config: {
                        testTypes: config.testTypes || ['all'],
                        aggressive: config.aggressive || false,
                        wafEvasion: config.wafEvasion || false,
                        accounts: config.accounts || null,
                        ...config
                    }
                });

                results.wafInfo = vulnResults.wafInfo;
                
                // Store findings with CVSS and compliance
                for (const finding of vulnResults.findings) {
                    const created = await prisma.finding.create({
                        data: {
                            scanId,
                            assetId: finding.assetId,
                            endpointId: finding.endpointId,
                            title: finding.title,
                            description: finding.description,
                            category: finding.category,
                            severity: finding.severity,
                            cvss: finding.cvss,
                            cwe: finding.cwe,
                            owasp: finding.owasp,
                            remediation: finding.remediation,
                            references: finding.references || [],
                            detectedBy: finding.detectedBy,
                            confidence: finding.confidence || 100,
                            evidence: {
                                create: finding.evidence || []
                            }
                        },
                        include: {
                            evidence: true
                        }
                    });
                    results.findings.push(created);
                    emitFindingDiscovered(scanId, created);
                }
            } catch (err) {
                logger.error(`Vulnerability testing engine failed: ${err.message}`);
            }

            emitScanPhaseComplete(scanId, 'VULN_TEST', { findingsCount: results.findings.length });
        }
        
        // Phase 4: CVE Matching
        if (['FULL_VAPT', 'COMPLIANCE_SNAPSHOT'].includes(profile)) {
            await onProgress(70, 'CVE Intelligence');
            emitScanProgress(scanId, 'CVE_MATCH', 70, 'Matching CVE database...');
            
            try {
                const cveResults = await cveMatchEngine({
                    scanId,
                    assets: results.assets
                });
                
                // Store CVE findings
                for (const cveFinding of cveResults.findings) {
                    const created = await prisma.finding.create({
                        data: {
                            scanId,
                            assetId: cveFinding.assetId,
                            title: cveFinding.title,
                            description: cveFinding.description,
                            category: 'VULNERABLE_COMPONENTS',
                            severity: cveFinding.severity,
                            cvss: cveFinding.cvss,
                            cveId: cveFinding.cveId,
                            remediation: cveFinding.remediation,
                            references: cveFinding.references || [],
                            detectedBy: 'cve-matcher',
                            confidence: cveFinding.confidence || 90
                        }
                    });
                    results.findings.push(created);
                }
            } catch (err) {
                logger.error(`CVE Match engine failed: ${err.message}`);
            }

            emitScanPhaseComplete(scanId, 'CVE_MATCH', { cveFindings: results.findings.filter(f => f.category === 'VULNERABLE_COMPONENTS').length });
        }
        
        // Phase 5: Correlation & Deduplication
        await onProgress(80, 'Correlating Findings');
        emitScanProgress(scanId, 'CORRELATION', 80, 'Correlating and deduplicating findings...');
        
        try {
            const correlatedFindings = await correlationEngine({
                scanId,
                findings: results.findings
            });
            
            results.findings = correlatedFindings;
        } catch (err) {
            logger.error(`Correlation engine failed: ${err.message}`);
        }

        // Phase 6: Enterprise Reporting Enhancement
        await onProgress(90, 'Generating Report Intelligence');
        emitScanProgress(scanId, 'REPORTING', 90, 'Computing CVSS scores and compliance mappings...');

        try {
            // 6a: Compute CVSS 3.1 vectors for all findings
            const enrichedFindings = computeAllCVSS(results.findings);

            // 6b: Generate business impact statements
            const impactedFindings = generateAllBusinessImpacts(enrichedFindings);

            // 6c: Generate tech-specific remediations
            for (const finding of impactedFindings) {
                const techRemediation = generateRemediation(finding, results.technologies);
                finding.techRemediation = techRemediation;
                finding.complianceMappings = mapToCompliance(finding);
            }

            results.findings = impactedFindings;

            // 6d: Generate executive summary
            results.executiveSummary = generateExecutiveSummary({
                target,
                findings: results.findings,
                stats: results.stats,
                duration: 0, // Will be set by caller
                technologies: results.technologies
            });

            // 6e: Generate compliance summary
            results.complianceSummary = generateComplianceSummary(results.findings);

        } catch (err) {
            logger.warn(`Report enrichment error: ${err.message}`);
        }
        
        // Calculate final stats
        results.stats.findingsCount = results.findings.length;
        results.stats.criticalCount = results.findings.filter(f => f.severity === 'CRITICAL').length;
        results.stats.highCount = results.findings.filter(f => f.severity === 'HIGH').length;
        results.stats.mediumCount = results.findings.filter(f => f.severity === 'MEDIUM').length;
        results.stats.lowCount = results.findings.filter(f => f.severity === 'LOW').length;
        
        emitScanStats(scanId, results.stats);
        await onProgress(100, 'Completed');
        
        return results;
        
    } catch (error) {
        logger.error(`Scan pipeline fatal error: ${error.message}`, error);
        throw error;
    } finally {
        // Cleanup
        try {
            await stopOASTServer();
        } catch (e) {
            logger.warn(`OAST cleanup error: ${e.message}`);
        }
        try {
            await closeSharedBrowser();
        } catch (e) {
            logger.warn(`Browser cleanup error: ${e.message}`);
        }
    }
}
