import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { sendAlert } from '../utils/alerting.js';

const prisma = new PrismaClient();

/**
 * Compares the completed scan against the most recent previous scan for the same target.
 * Determines new endpoints, new vulnerabilities, and reopened vulnerabilities.
 * @param {string} scanId - The ID of the newly completed scan
 */
export async function runScanDiff(scanId) {
    try {
        const currentScan = await prisma.scan.findUnique({
            where: { id: scanId },
            include: { findings: true }
        });

        if (!currentScan) return;

        // Find the previous completed scan for this target
        const previousScan = await prisma.scan.findFirst({
            where: {
                targetId: currentScan.targetId,
                status: 'COMPLETED',
                id: { not: scanId }, // Exclude current scan
                createdAt: { lt: currentScan.createdAt }
            },
            orderBy: { createdAt: 'desc' },
            include: { findings: true }
        });

        if (!previousScan) {
            logger.info(`[ScanDiffer] No previous scan found for target ${currentScan.targetId}. Baseline established.`);
            // Mark all findings in current scan as NEW
            await prisma.finding.updateMany({
                where: { scanId },
                data: { status: 'NEW' }
            });
            return;
        }

        logger.info(`[ScanDiffer] Comparing scan ${currentScan.id} with previous scan ${previousScan.id}`);

        const prevFindingsMap = new Map();
        for (const pf of previousScan.findings) {
            // Create a unique fingerprint for the finding: title + category + endpointId + assetId
            const fingerprint = `${pf.title}-${pf.category}-${pf.endpointId}-${pf.assetId}`;
            prevFindingsMap.set(fingerprint, pf);
        }

        let newHighCritCount = 0;

        for (const cf of currentScan.findings) {
            const fingerprint = `${cf.title}-${cf.category}-${cf.endpointId}-${cf.assetId}`;
            const pf = prevFindingsMap.get(fingerprint);

            let newStatus = 'OPEN';

            if (!pf) {
                // Not found in previous scan -> completely new!
                newStatus = 'NEW';
                if (cf.severity === 'HIGH' || cf.severity === 'CRITICAL') {
                    newHighCritCount++;
                    // Trigger alert for new high/critical
                    sendAlert(currentScan.targetId, `🚨 NEW Vulnerability Detected: [${cf.severity}] ${cf.title}`);
                }
            } else {
                // It existed before. Was it marked FIXED/RESOLVED previously?
                if (pf.status === 'FIXED' || pf.status === 'FALSE_POSITIVE' || pf.status === 'ACCEPTED_RISK') {
                    // It's back!
                    newStatus = 'REOPENED';
                    sendAlert(currentScan.targetId, `⚠️ Vulnerability REOPENED: [${cf.severity}] ${cf.title} (Previously marked as ${pf.status})`);
                } else {
                    // Still open
                    newStatus = 'OPEN';
                }
            }

            // Update the finding in the DB
            await prisma.finding.update({
                where: { id: cf.id },
                data: { status: newStatus }
            });
        }

        logger.info(`[ScanDiffer] Diff complete. Found ${newHighCritCount} new HIGH/CRITICAL findings.`);

    } catch (err) {
        logger.error(`[ScanDiffer] Failed to run scan diff: ${err.message}`);
    }
}
