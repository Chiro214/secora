// backend/queue/enqueue.js
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null, // ✅ Fix for BullMQ
});

export const scanQueue = new Queue("scanQueue", { connection });

export async function enqueueScan(url, meta = {}) {
  const job = await scanQueue.add(
    "scan",
    { url, ...meta },
    { attempts: 3, backoff: { type: "exponential", delay: 500 } }
  );
  return job;
}
