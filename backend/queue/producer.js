// backend/queue/producer.js
import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

// Create or reuse a BullMQ queue named 'scanQueue'
export const scanQueue = new Queue("scanQueue", { connection: redisConnection });

/**
 * Add a new scan job to the queue
 * @param {string} jobId - Unique job ID (e.g., scanId or URL)
 * @param {object} payload - The job data (URL, scan options, etc.)
 */
export async function enqueueScanJob(jobId, payload = {}) {
  try {
    const job = await scanQueue.add("scan-job", payload, {
      jobId, // ensures deduplication
      attempts: 5, // retry up to 5 times
      backoff: {
        type: "exponential",
        delay: 1000, // start retry delay at 1s
      },
      removeOnComplete: { age: 3600, count: 1000 }, // keep successful jobs for 1hr
      removeOnFail: { age: 86400, count: 500 }, // keep failed jobs for 24hr
      timeout: 1000 * 60 * 10, // 10 minutes max
    });

    console.log(`[Queue] Job added successfully: ${job.id}`);
    return { success: true, jobId: job.id };
  } catch (error) {
    console.error("[Queue] Failed to enqueue job:", error);
    return { success: false, error };
  }
}
