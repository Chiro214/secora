// backend/src/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

import { scanTarget } from "./utils/scan.js";
import aiRemediateRoute from "./routes/aiRemediate.js";
import reportRoute from "./routes/report.js";
import summarizeRoute from "./routes/summarize.js"; // ✅ Fixed path

const app = express(); // ✅ must be before using routes

app.use(cors());
app.use(express.json());

// 🧠 Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: "dev" });
});

// 🔍 Enhanced scan endpoint — saves scan results locally
app.post("/scan", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const result = await scanTarget(url);

    const dir = path.resolve("scan-results");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log("📁 Created scan-results directory");
    }

    const safeName = encodeURIComponent(url);
    const file = path.join(dir, `${safeName}-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));

    console.log(`✅ Scan saved: ${file}`);
    res.json(result);
  } catch (e) {
    console.error("❌ Scan error:", e);
    res.status(500).json({ error: e?.message || "Scan failed" });
  }
});

// 🧩 Attach AI Remediation + PDF report + Summary routes
app.use(aiRemediateRoute);
app.use(reportRoute);
app.use(summarizeRoute); // ✅ should come here

// 🚀 Start backend
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Secora backend running on http://localhost:${PORT}`)
);
