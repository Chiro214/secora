import express from "express";
import { generateScanReportPDF } from "../utils/pdfGenerator.js";
import prisma from "../config/prisma.js";

const router = express.Router();

router.get("/api/report/:scanId/pdf", async (req, res) => {
  const { scanId } = req.params;

  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        target: true,
        findings: true
      }
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found in database" });
    }

    const mappedFindings = scan.findings.map(v => ({
      id: v.id,
      title: v.title,
      severity: v.severity.toUpperCase(),
      description: v.description || "No description provided.",
      remediation: v.remediation || "No remediation provided.",
      impact: v.impact || null,
      evidence: null,
      cvssVector: v.cvss || null,
      ...v
    }));

    const reportObj = {
        createdAt: new Date().toISOString(),
        scan: {
            target: { name: scan.target.name || scan.target.value, value: scan.target.value },
            profile: scan.profile || "FULL_VAPT",
            startedAt: scan.startedAt || new Date().toISOString(),
            completedAt: scan.completedAt || new Date().toISOString(),
            technologies: ['React', 'Node.js', 'Express'],
            findings: mappedFindings
        }
    };

    console.log("📄 Generating Phase 6 Enriched PDF from database...");
    
    const pdfBuffer = await generateScanReportPDF(reportObj);

    const filename = `Secora-Pro-Report-${scanId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("❌ PDF Report Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
