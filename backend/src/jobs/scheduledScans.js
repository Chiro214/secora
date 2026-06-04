import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { enqueueScan } from '../queue/scanQueue.js';
import { updateTargetSubdomains } from '../engines/attackSurface.js';

const prisma = new PrismaClient();

export function startScheduledJobs() {
    logger.info('[Scheduler] Starting Attack Surface Management Cron Jobs...');

    // Run every minute to check for due scans
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            // Find all enabled scheduled scans that are due
            const dueScans = await prisma.scheduledScan.findMany({
                where: {
                    enabled: true,
                    nextRunAt: { lte: now }
                },
                include: { target: true }
            });

            for (const sched of dueScans) {
                logger.info(`[Scheduler] Executing scheduled scan: ${sched.name} for target ${sched.target.value}`);

                // 1. Attack Surface Discovery (crt.sh)
                if (sched.target.type === 'DOMAIN') {
                    await updateTargetSubdomains(sched.targetId, sched.target.value);
                }

                // 2. Create the actual Scan record
                const scan = await prisma.scan.create({
                    data: {
                        targetId: sched.targetId,
                        userId: sched.userId,
                        profile: sched.profile,
                        config: sched.config || {},
                        status: 'PENDING',
                        scheduledScanId: sched.id
                    },
                    include: { target: true }
                });

                // 3. Enqueue the scan
                await enqueueScan(scan);

                // 4. Calculate next run time based on cron expression
                // node-cron doesn't natively expose a "next date" calculator from a cron string easily in all versions,
                // so we use a simple heuristic: parse basic schedules. For MVP, we will just add 7 days if the schedule is weekly
                // The user requested: "rescan every target every 7 days". We will just set nextRunAt to 7 days from now.
                const nextRun = new Date();
                nextRun.setDate(nextRun.getDate() + 7);

                await prisma.scheduledScan.update({
                    where: { id: sched.id },
                    data: {
                        lastRunAt: now,
                        nextRunAt: nextRun
                    }
                });
            }
        } catch (err) {
            logger.error(`[Scheduler] Error running cron job: ${err.message}`);
        }
    });
}
