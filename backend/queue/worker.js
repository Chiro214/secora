// backend/queue/worker.js
import { Worker, Queue, QueueEvents } from "bullmq";
import fs from "fs";
import { redisConnection } from "./connection.js";
import { scanTarget } from "../src/utils/scan.js";

// Main scan queue
const queueName = "scanQueue";

// Dead Letter Queue (for permanently failed jobs)
const dlq = new Queue(`${queueName}_dlq`, { connection: redisConnection });

// Create the worker
const worker = new Worker(
  queueName,
  async (job) => {
    const { url } = job.data;
    console.log(`🔍 [Worker] Running scan for ${url}`);

    try {
      // Run actual scanning logic
      const result = await scanTarget(url);

      // Save results locally (JSON file)
      fs.mkdirSync("./scan-results", { recursive: true });
      const filePath = `./scan-results/${encodeURIComponent(url)}-${Date.now()}.json`;
      fs.writeFileSync(filePath, JSON.stringify(result, null, 2));

      console.log(`📁 [Worker] Results saved: ${filePath}`);

      return { ok: true, file: filePath };
    } catch (err) {
      console.error(`❌ [Worker] Scan error for ${url}:`, err.message);
      throw err; // triggers retry/backoff
    }
  },
  {
    connection: redisConnection,
    concurrency: Number(process.env.SCAN_WORKER_CONCURRENCY || 2),
  }
);

// Queue events listener (for monitoring)
const events = new QueueEvents(queueName, { connection: redisConnection });

events.on("completed", ({ jobId }) => {
  console.log(`✅ [Worker] Job completed: ${jobId}`);
});

events.on("failed", async ({ jobId, failedReason }) => {
  console.error(`⚠️ [Worker] Job failed: ${jobId}, reason: ${failedReason}`);
  const job = await worker.getJob(jobId);

  if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
    console.warn(`💀 [DLQ] Job moved to Dead Letter Queue: ${jobId}`);
    await dlq.add("failed-scan", {
      jobId,
      data: job.data,
      reason: failedReason,
      failedAt: new Date().toISOString(),
    });
  }
});

process.on("SIGINT", async () => {
  console.log("🛑 [Worker] Gracefully shutting down...");
  await worker.close();
  await events.close();
  process.exit(0);
});

console.log(`🚀 [Worker] Listening on queue: ${queueName}`);
