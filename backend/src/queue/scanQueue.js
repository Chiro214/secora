// backend/src/queue/scanQueue.js
import { Queue, Worker } from 'bullmq';
import redis, { isRedisConnected } from '../config/redis.js';
import prisma from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { executeScanPipeline } from '../engines/scanPipeline.js';
import { triggerWebhooks } from '../utils/webhookManager.js';
import {
    emitScanStarted,
    emitScanComplete,
    emitScanFailed,
    emitScanProgress
} from '../websocket/scanEvents.js';

// Mock queue for development when Redis is not available
const mockQueue = {
    add: async (name, data, options) => {
        console.log('⚠️ Mock queue: scan would be enqueued', data.scanId);
        return { id: data.scanId };
    }
};

const mockWorker = {
    isRunning: () => false,
    on: () => { }
};

// Create scan queue only if Redis is available
let scanQueue = mockQueue;
let scanWorkerInstance = mockWorker;

// Initialize real queue if Redis is available
setTimeout(async () => {
    if (redis && isRedisConnected()) {
        try {
            scanQueue = new Queue('scans', {
                connection: redis,
                defaultJobOptions: {
                    attempts: 2,
                    backoff: {
                        type: 'exponential',
                        delay: 5000
                    },
                    removeOnComplete: {
                        age: 86400, // Keep for 24 hours
                        count: 100
                    },
                    removeOnFail: {
                        age: 604800 // Keep failures for 7 days
                    }
                }
            });
            console.log('✅ BullMQ queue initialized');
        } catch (error) {
            console.warn('⚠️ Could not initialize queue:', error.message);
        }
    } else {
        console.log('ℹ️ Running without Redis - queue features disabled');
    }
}, 1000);

// Enqueue scan
export async function enqueueScan(scan) {
    const job = await scanQueue.add('scan', {
        scanId: scan.id,
        targetId: scan.targetId,
        userId: scan.userId,
        profile: scan.profile,
        config: scan.config,
        target: scan.target
    }, {
        jobId: scan.id,
        priority: scan.profile === 'QUICK_RECON' ? 1 : 5
    });

    console.log(`✅ Scan ${scan.id} enqueued as job ${job.id}`);
    return job;
}

// Scan worker - use mock if Redis not available
export const scanWorker = mockWorker;

// Initialize real worker if Redis becomes available
function initializeWorker() {
    if (redis && isRedisConnected()) {
        try {
            const realWorker = new Worker('scans', async (job) => {
                const { scanId, target, profile, config } = job.data;

                console.log(`🔍 Starting scan ${scanId} for ${target.value}`);

                try {
                    // Update scan status to RUNNING
                    await prisma.scan.update({
                        where: { id: scanId },
                        data: {
                            status: 'RUNNING',
                            startedAt: new Date(),
                            progress: 0
                        }
                    });

                    // Emit scan started event
                    emitScanStarted(scanId, {
                        target: target.value,
                        profile
                    });

                    // Execute scan pipeline with progress callback
                    const results = await executeScanPipeline({
                        scanId,
                        target,
                        profile,
                        config,
                        onProgress: async (progress, message) => {
                            await prisma.scan.update({
                                where: { id: scanId },
                                data: {
                                    progress,
                                    currentPhase: message
                                }
                            });
                            emitScanProgress(scanId, message, progress, message);
                            await job.updateProgress(progress);
                        }
                    });

                    // Update scan status to COMPLETED
                    const completedAt = new Date();
                    const scan = await prisma.scan.update({
                        where: { id: scanId },
                        data: {
                            status: 'COMPLETED',
                            completedAt,
                            progress: 100,
                            duration: Math.floor((completedAt - new Date(job.timestamp)) / 1000),
                            stats: results.stats
                        },
                        include: {
                            findings: {
                                select: {
                                    severity: true
                                }
                            }
                        }
                    });

                    // Emit scan complete event
                    emitScanComplete(scanId, {
                        duration: scan.duration,
                        stats: results.stats,
                        findingsCount: scan.findings.length
                    });

                    // Fire Webhooks (if any configured)
                    // Currently we look up webhooks from config or DB. 
                    // Assuming config.webhooks is an array of webhook objects passed to the scan.
                    if (config.webhooks && config.webhooks.length > 0) {
                        // Pass the full scan object (augmented with results.findings)
                        const fullScanForWebhooks = { ...scan, findings: results.findings };
                        await triggerWebhooks(fullScanForWebhooks, target, config.webhooks);
                    }

                    console.log(`✅ Scan ${scanId} completed successfully`);
                    return results;

                } catch (error) {
                    console.error(`❌ Scan ${scanId} failed:`, error);

                    // Update scan status to FAILED
                    await prisma.scan.update({
                        where: { id: scanId },
                        data: {
                            status: 'FAILED',
                            error: error.message,
                            completedAt: new Date()
                        }
                    });

                    // Emit scan failed event
                    emitScanFailed(scanId, error);

                    throw error;
                }
            }, {
                connection: redis,
                concurrency: parseInt(process.env.SCAN_CONCURRENCY) || 3,
                limiter: {
                    max: 5,
                    duration: 60000 // Max 5 scans per minute
                }
            });

            // Worker event handlers
            realWorker.on('completed', (job) => {
                console.log(`✅ Job ${job.id} completed`);
            });

            realWorker.on('failed', (job, err) => {
                console.error(`❌ Job ${job?.id} failed:`, err.message);
            });

            realWorker.on('progress', (job, progress) => {
                console.log(`📊 Job ${job.id} progress: ${progress}%`);
            });

            console.log('✅ BullMQ worker initialized');
            return realWorker;
        } catch (error) {
            console.warn('⚠️ Could not initialize worker:', error.message);
        }
    }
    return mockWorker;
}

// Initialize worker after a delay to allow Redis connection
setTimeout(() => {
    initializeWorker();
}, 1500);

export { scanQueue };
export default scanQueue;
