// backend/src/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { scanTarget } from "./utils/scan.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: "dev" });
});

app.post("/scan", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });
  try {
    const result = await scanTarget(url);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Scan failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Secora backend running on http://localhost:${PORT}`)
);
