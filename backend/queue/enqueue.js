// backend/queue/enqueue.js
import { enqueueScanJob } from "./producer.js";

/**
 * Wrapper function to enqueue a new scan
 * @param {string} url - The target URL to scan
 * @param {object} meta - Optional metadata (userId, priority, etc.)
 * @returns {Promise<{success: boolean, jobId?: string, error?: any}>}
 */
export async function enqueueScan(url, meta = {}) {
  const jobId = meta.scanId || url; // use scanId if present, fallback to URL

  const payload = {
    url,
    timestamp: Date.now(),
    ...meta,
  };

  console.log(`[Queue] Enqueuing scan for ${url}...`);

  const result = await enqueueScanJob(jobId, payload);

  if (result.success) {
    console.log(`[Queue] ✅ Scan job queued successfully: ${result.jobId}`);
  } else {
    console.error(`[Queue] ❌ Failed to enqueue job:`, result.error);
  }

  return result;
}
