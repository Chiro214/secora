// backend/src/engines/cveMatch.js
import prisma from '../config/prisma.js';

/**
 * CVE matching engine
 * Matches discovered services to known CVEs
 */
export async function cveMatchEngine({ scanId, assets }) {
    console.log(`🔍 Starting CVE matching for scan ${scanId}`);
    
    const findings = [];
    
    for (const asset of assets) {
        // Extract service information
        const services = asset.services || {};
        const ports = asset.ports || [];
        
        for (const port of ports) {
            const service = port.service;
            const version = port.versionGuess;
            
            if (!service) continue;
            
            // Query CVE database
            const cves = await prisma.cVE.findMany({
                where: {
                    product: {
                        contains: service,
                        mode: 'insensitive'
                    }
                },
                take: 10
            });
            
            for (const cve of cves) {
                // Check if version matches (simplified)
                if (version && isVersionAffected(version, cve)) {
                    findings.push({
                        assetId: asset.id,
                        title: `${cve.cveId}: ${cve.product} Vulnerability`,
                        description: cve.description,
                        severity: cve.severity,
                        cvss: cve.cvssScore,
                        cveId: cve.cveId,
                        remediation: `Update ${service} to a patched version. See references for details.`,
                        references: cve.references,
                        confidence: version ? 90 : 60
                    });
                }
            }
        }
    }
    
    console.log(`✅ CVE matching completed: ${findings.length} CVEs found`);
    
    return { findings };
}

function isVersionAffected(version, cve) {
    // Simplified version matching
    // Real implementation would parse version ranges
    if (!cve.versionStart && !cve.versionEnd) {
        return true; // No version info, assume affected
    }
    
    // TODO: Implement proper version comparison
    return true;
}
