// backend/src/engines/correlation.js
import prisma from '../config/prisma.js';

/**
 * Correlation and deduplication engine
 * Merges duplicate findings and aggregates evidence
 */
export async function correlationEngine({ scanId, findings }) {
    console.log(`🔗 Starting correlation for scan ${scanId}`);
    
    // Group findings by similarity
    const groups = new Map();
    
    for (const finding of findings) {
        // Create correlation key
        const key = `${finding.title}-${finding.assetId || 'global'}-${finding.endpointId || 'global'}`;
        
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        
        groups.get(key).push(finding);
    }
    
    // Merge duplicates
    const correlatedFindings = [];
    
    for (const [key, group] of groups.entries()) {
        if (group.length === 1) {
            // No duplicates
            correlatedFindings.push(group[0]);
        } else {
            // Merge duplicates
            const merged = mergeFindingsGroup(group);
            correlatedFindings.push(merged);
        }
    }
    
    console.log(`✅ Correlation completed: ${findings.length} → ${correlatedFindings.length} findings`);
    
    return correlatedFindings;
}

function mergeFindingsGroup(group) {
    // Take the first finding as base
    const base = group[0];
    
    // Merge evidence from all findings
    const allEvidence = [];
    for (const finding of group) {
        if (finding.evidence) {
            allEvidence.push(...finding.evidence);
        }
    }
    
    // Take highest severity
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    const highestSeverity = group.reduce((max, f) => {
        const maxIndex = severities.indexOf(max.severity);
        const fIndex = severities.indexOf(f.severity);
        return fIndex < maxIndex ? f : max;
    }, group[0]).severity;
    
    // Take highest CVSS
    const highestCvss = Math.max(...group.map(f => f.cvss || 0));
    
    // Take highest confidence
    const highestConfidence = Math.max(...group.map(f => f.confidence || 100));
    
    return {
        ...base,
        severity: highestSeverity,
        cvss: highestCvss,
        confidence: highestConfidence,
        evidence: allEvidence,
        description: base.description + `\n\n(Merged from ${group.length} similar findings)`
    };
}
