import express from "express";
import fs from "fs";
import path from "path";
import { generateAISummary, saveSummary } from "../utils/aiSummary.js";

const router = express.Router();

router.post("/api/summarize/:scanId", async (req, res) => {
  const { scanId } = req.params;

  try {
    const possibleDirs = [
      path.join(process.cwd(), "backend", "scan-results"),
      path.join(process.cwd(), "scan-results"),
    ];
    const scansDir = possibleDirs.find((dir) => fs.existsSync(dir));
    if (!scansDir) return res.status(404).json({ error: "Scan results directory missing" });

    const files = fs.readdirSync(scansDir);
    const encoded = encodeURIComponent(scanId) + ".json";
    const matchFile = files.find((f) => f === encoded);
    if (!matchFile) return res.status(404).json({ error: "Scan file not found" });

    const scanPath = path.join(scansDir, matchFile);
    const remediationFile = files.find((f) =>
      f.includes(matchFile.replace(".json", "")) && f.includes("remediation.json")
    );

    const scanData = JSON.parse(fs.readFileSync(scanPath, "utf8"));
    const remediation = remediationFile
      ? JSON.parse(fs.readFileSync(path.join(scansDir, remediationFile), "utf8"))
      : [];

    const summaryData = await generateAISummary(scanData, remediation);
    saveSummary(scanPath, summaryData);

    res.json({ message: "Summary generated successfully", summaryData });
  } catch (error) {
    console.error("❌ Summary error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
