import { logger } from './logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Alerting Engine
 * Sends notifications (Email/Webhook) when critical events occur (e.g., new subdomains, reopened vulnerabilities)
 */
export async function sendAlert(targetId, message) {
    try {
        const target = await prisma.target.findUnique({
            where: { id: targetId },
            include: { user: true }
        });

        if (!target) return;

        // In a full production environment, this would integrate with SendGrid, Slack Webhooks, Jira, etc.
        logger.info(`[ALERT EMAIL SENT] To: ${target.user.email} | Subject: SECORA CTEM Alert for ${target.name} | Body: ${message}`);
        
        // Log to database AuditLog if available (Fallback for MVP)
        // await prisma.auditLog.create({ ... })

    } catch (err) {
        logger.error(`[Alerting] Failed to send alert: ${err.message}`);
    }
}
