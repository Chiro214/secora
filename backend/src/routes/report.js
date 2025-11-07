// backend/src/routes/report.js
import express from "express";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const router = express.Router();

/**
 * GET /api/report/:scanId/pdf
 * Combines scan + AI remediation into a styled Dark Pro PDF report
 */
router.get("/api/report/:scanId/pdf", async (req, res) => {
  const { scanId } = req.params;

  try {
    // 🧭 Auto-detect scan-results folder
    const possibleDirs = [
      path.join(process.cwd(), "backend", "scan-results"),
      path.join(process.cwd(), "scan-results"),
      path.join(process.cwd(), "backend", "src", "scan-results"),
    ];
    const scansDir = possibleDirs.find((dir) => fs.existsSync(dir));

    if (!scansDir) {
      return res.status(404).json({
        error: "Scan results directory missing",
        checked: possibleDirs,
      });
    }

    const files = fs.readdirSync(scansDir);
    const decodedId = decodeURIComponent(scanId);

    console.log("📁 scansDir:", scansDir);
    console.log("📂 Files:", files);
    console.log("🔍 Looking for:", scanId, "| decoded:", decodedId);

    // 🧠 Normalize filenames (handles all encodings)
    const normalize = (s = "") =>
      String(s)
        .replace(/%/g, "")
        .replace(/[:/\\._\-]/g, "")
        .replace(/https/g, "")
        .toLowerCase();

    // 🔍 Smart matching logic
    let matchFileName =
      files.find((f) => f.includes(scanId)) ||
      files.find((f) => f.includes(decodedId)) ||
      files.find((f) => f.includes(path.basename(decodedId))) ||
      files.find((f) => f.includes(path.basename(scanId))) ||
      files.find((f) => normalize(f).includes(normalize(decodedId))) ||
      files.find((f) => normalize(f).includes(normalize(scanId)));

    console.log("🔎 Matched file:", matchFileName);

    if (!matchFileName) {
      return res.status(404).json({
        error: "Scan file not found after all matching passes",
        debug: { scanId, decodedId, files },
      });
    }

    const scanFilePath = path.join(scansDir, matchFileName);

    // 🧩 Find remediation file (if exists)
    const baseName = path.basename(matchFileName, ".json");
    const remediationFileName = files.find(
      (f) => f.includes(baseName) && f.includes("remediation")
    );
    const remediationFilePath = remediationFileName
      ? path.join(scansDir, remediationFileName)
      : null;

    // 📖 Load JSON
    const scanData = JSON.parse(fs.readFileSync(scanFilePath, "utf8"));
    const remediation = remediationFilePath
      ? JSON.parse(fs.readFileSync(remediationFilePath, "utf8"))
      : [];

    // 🖼️ Embed Secora banner
    const logoPath = "C:/Users/Chirag/Documents/secora/assets/banner.png";
    const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
      : "";

    // 🧠 Build Dark Pro styled PDF HTML
    const html = `
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 25mm; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      background: linear-gradient(180deg, #0d1117 0%, #001d3d 100%);
      color: #e6edf3;
      padding: 40px;
      font-size: 14px;
    }
    header { text-align: center; margin-bottom: 40px; }
    header img { max-height: 80px; margin-bottom: 10px; }
    header h1 { font-size: 28px; color: #58a6ff; text-shadow: 0 0 10px #007bff; margin: 0; }
    .meta { text-align: center; font-size: 14px; opacity: 0.9; }

    .summary {
      background: rgba(88, 166, 255, 0.08);
      border: 1px solid rgba(88, 166, 255, 0.2);
      border-radius: 10px;
      padding: 20px;
      margin-top: 30px;
      box-shadow: 0 0 12px rgba(88, 166, 255, 0.12);
    }
    h2 {
      color: #58a6ff;
      border-bottom: 1px solid rgba(88, 166, 255, 0.25);
      padding-bottom: 6px;
      margin-top: 40px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .vuln-card {
      border: 1px solid rgba(88, 166, 255, 0.16);
      background: rgba(10, 14, 20, 0.45);
      border-radius: 8px;
      padding: 16px;
      margin-top: 20px;
      box-shadow: 0 0 10px rgba(88, 166, 255, 0.08);
    }
    .vuln-card h3 { color: #79c0ff; margin-top: 0; }
    pre {
      background: rgba(13, 17, 23, 0.9);
      color: #c9d1d9;
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
    }
    footer {
      position: fixed;
      bottom: 10mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
    }
  </style>
</head>
<body>
  <header>
    ${logoBase64 ? `<img src="${logoBase64}" alt="Secora Logo" />` : ""}
    <h1>Secora Security Report</h1>
    <div class="meta">
      <p>Prepared for: <strong>Chirag</strong></p>
      <p>Target: <strong>${scanData.target || "Unknown Target"}</strong></p>
      <p>Date: ${new Date().toLocaleString()}</p>
    </div>
  </header>

  <section class="summary">
    <h2>Executive Summary</h2>
    <p>${
      remediation.summary ||
      "Automated AI-generated vulnerability remediation insights and scan summary."
    }</p>
    <p><strong>Total Vulnerabilities:</strong> ${
      scanData.vulnerabilities?.length || 0
    }</p>
  </section>

  <h2>Vulnerability Details</h2>
  ${
    remediation.length
      ? remediation
          .map(
            (r) => `
        <div class="vuln-card">
          <h3>${r.vulnerability || "Issue"}</h3>
          <p><strong>Description:</strong> ${r.description || "N/A"}</p>
          <p><strong>Impact:</strong> ${r.impact || "N/A"}</p>
          <p><strong>Remediation:</strong> ${r.remediation || "N/A"}</p>
          ${r.example_fix ? `<pre>${r.example_fix}</pre>` : ""}
        </div>`
          )
          .join("")
      : "<p>No AI remediation data available.</p>"
  }

  <footer>
    Secora AI Security Report © ${new Date().getFullYear()} — Confidential
  </footer>
</body>
</html>
`;

    // 🧾 Generate PDF via Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm" },
    });

    await browser.close();

    const filename = `Secora-Final-Report-${path.basename(
      matchFileName,
      ".json"
    )}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(pdf);
  } catch (error) {
    console.error("❌ PDF Report Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
