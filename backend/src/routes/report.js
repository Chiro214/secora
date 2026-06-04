import express from "express";
import fs from "fs";
import path from "path";
import { generateScanReportPDF } from "../utils/pdfGenerator.js";

const router = express.Router();

router.get("/api/report/:scanId/pdf", async (req, res) => {
  const { scanId } = req.params;

  try {
    // 1️⃣ Locate scan-results folder
    const possibleDirs = [
      path.join(process.cwd(), "backend", "scan-results"),
      path.join(process.cwd(), "scan-results"),
    ];
    const scansDir = possibleDirs.find((dir) => fs.existsSync(dir));
    if (!scansDir) {
      return res.status(404).json({ error: "Scan results directory missing" });
    }

    // 2️⃣ Find the correct file
    const files = fs.readdirSync(scansDir);
    const decodedId = decodeURIComponent(scanId);
    const normalize = (s) =>
      s.toLowerCase().replace(/[%:/\\._\-]/g, "").replace(/https/g, "");

    const matchFile = files.find(
      (f) =>
        (normalize(f).includes(normalize(scanId)) ||
        normalize(f).includes(normalize(decodedId))) && f.endsWith('.json') && !f.includes('remediation') && !f.includes('summary')
    );

    if (!matchFile) {
      return res
        .status(404)
        .json({ error: "Scan file not found", debug: { scanId, files } });
    }

    const scanFilePath = path.join(scansDir, matchFile);

    // 3️⃣ Load JSON data
    const scanData = JSON.parse(fs.readFileSync(scanFilePath, "utf8"));
    const remediationFile = files.find(
      (f) => f.includes(matchFile.replace(".json", "")) && f.includes("remediation.json")
    );
    
    const remediation = remediationFile
      ? JSON.parse(fs.readFileSync(path.join(scansDir, remediationFile), "utf8"))
      : [];

    // Map the remediation data into the findings for the PDF generator
    const mappedFindings = (scanData.vulnerabilities || []).map(v => {
      // Find matching remediation if any
      const rem = remediation.find(r => r.vulnerability === v.title || r.vulnerability === v.name);
      return {
        id: v.id || Math.random().toString(36).substr(2, 9),
        title: v.title || v.name || 'Unknown Finding',
        severity: (v.severity || "INFO").toUpperCase(),
        description: v.description || (rem ? rem.description : "No description provided."),
        remediation: v.remediation || (rem ? rem.remediation : "No remediation provided."),
        impact: v.impact || (rem ? rem.impact : null),
        evidence: v.exploit?.examplePayload ? `Payload: ${v.exploit.examplePayload}` : null,
        cvssVector: null, // Let Phase 6 compute it
        ...v
      };
    });

    // 4️⃣ Construct Phase 6 compatible report object
    const reportObj = {
        createdAt: new Date().toISOString(),
        scan: {
            target: { name: scanData.target || 'Unknown', value: scanData.target || 'Unknown' },
            profile: "FULL_VAPT",
            startedAt: scanData.generatedAt || new Date().toISOString(),
            completedAt: scanData.generatedAt || new Date().toISOString(),
            technologies: ['React', 'Node.js', 'Express'], // Mocked or inferred
            findings: mappedFindings
        }
    };

    console.log("📄 Generating Phase 6 Enriched PDF...");
    
    // 5️⃣ Generate PDF using the Phase 6 enhanced generator
    const pdfBuffer = await generateScanReportPDF(reportObj);

    const filename = `Secora-Pro-Report-${path.basename(matchFile, ".json")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("❌ PDF Report Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
