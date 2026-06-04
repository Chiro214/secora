import axios from 'axios';
import { logger } from './logger.js';

/**
 * Evaluates a completed scan and fires webhooks (e.g., Jira, Slack)
 * if vulnerabilities exceed the configured severity threshold.
 * 
 * @param {Object} scan The completed scan object including findings
 * @param {Object} target The target object (for context)
 * @param {Array} webhooks Array of webhook configuration objects
 */
export async function triggerWebhooks(scan, target, webhooks) {
    if (!webhooks || webhooks.length === 0) return;

    logger.info(`Evaluating ${webhooks.length} webhooks for scan ${scan.id}`);

    const severityHierarchy = { 'INFO': 0, 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };

    for (const hook of webhooks) {
        try {
            const threshold = severityHierarchy[hook.triggerSeverity || 'HIGH'] || 3;
            
            // Filter findings that meet the threshold
            const actionableFindings = scan.findings.filter(f => 
                (severityHierarchy[f.severity.toUpperCase()] || 0) >= threshold
            );

            if (actionableFindings.length === 0) {
                logger.debug(`Webhook ${hook.name} skipped: No findings meet the ${hook.triggerSeverity} threshold.`);
                continue;
            }

            logger.info(`Firing webhook ${hook.name} (${actionableFindings.length} actionable findings)`);

            // Format payload
            const payload = formatWebhookPayload(hook.type, scan, target, actionableFindings);

            // Send request
            await axios.post(hook.url, payload, {
                headers: hook.headers || { 'Content-Type': 'application/json' },
                timeout: 5000
            });

            logger.info(`✅ Webhook ${hook.name} delivered successfully.`);

        } catch (err) {
            logger.error(`❌ Failed to deliver webhook ${hook.name}: ${err.message}`);
        }
    }
}

function formatWebhookPayload(type, scan, target, findings) {
    if (type === 'JIRA_AUTOMATION') {
        // Formatted for Jira Automation Webhooks (to create an issue)
        return {
            data: {
                summary: `SECORA Security Alert: ${findings.length} High+ Vulnerabilities on ${target.name}`,
                description: `SECORA automated scan has detected vulnerabilities exceeding the configured threshold on target ${target.value}.\n\n*Top Findings:*\n` + 
                    findings.slice(0, 5).map(f => `- [${f.severity}] ${f.name}`).join('\n') +
                    `\n\n*Scan ID:* ${scan.id}\n*View Full Report:* https://secora.io/reports/${scan.id}`,
                priority: findings.some(f => f.severity === 'CRITICAL') ? 'Highest' : 'High',
                customFields: {
                    scanId: scan.id,
                    target: target.value
                }
            }
        };
    } else if (type === 'SLACK') {
        return {
            text: `🚨 *SECORA Security Alert*\nScan on ${target.value} completed with *${findings.length}* high-severity findings!`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🚨 *SECORA Security Alert*\nScan on *${target.value}* completed with *${findings.length}* high-severity findings!\n\n<https://secora.io/reports/${scan.id}|View Full Report>`
                    }
                }
            ]
        };
    }

    // Default generic payload
    return {
        event: 'scan_completed_with_findings',
        scanId: scan.id,
        target: target.value,
        findingsCount: findings.length,
        topFindings: findings.slice(0, 3).map(f => ({ name: f.name, severity: f.severity }))
    };
}
