// backend/queue/worker.js
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { scanTarget } from "../src/utils/scan.js";
import fs from "fs";

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null, // ✅ Fix for BullMQ error
});

const worker = new Worker(
  "scanQueue",
  async (job) => {
    const { url } = job.data;
    console.log("🔍 Worker: running scan for", url);
    try {
      const result = await scanTarget(url);
      fs.mkdirSync("./scan-results", { recursive: true });
      const file = `./scan-results/${encodeURIComponent(url)}-${Date.now()}.json`;
      fs.writeFileSync(file, JSON.stringify(result, null, 2));
      return { ok: true, file };
    } catch (err) {
      console.error("Worker scan error:", err.message);
      throw err;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log("✅ Job completed:", job.id);
});

worker.on("failed", (job, err) => {
  console.error("❌ Job failed:", job.id, err.message);
});
