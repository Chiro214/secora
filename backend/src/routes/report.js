/*
import express from "express";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const router = express.Router();

router.get("/api/report/:scanId/pdf", async (req, res) => {
  const { scanId } = req.params;

  try {
    // 1️⃣ Locate scan-results folder dynamically
    const possibleDirs = [
      path.join(process.cwd(), "backend", "scan-results"),
      path.join(process.cwd(), "scan-results"),
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

    console.log("📁 Using scansDir:", scansDir);
    console.log("📂 Files:", files);
    console.log("🔍 Looking for:", scanId, "| decoded:", decodedId);

    // 2️⃣ Improved file matching logic (works with encoded/decoded names)
    const normalize = (s) =>
      s.toLowerCase().replace(/[%:/\\._\-]/g, "").replace(/https/g, "");

    let matchFile = files.find(
      (f) =>
        normalize(f).includes(normalize(scanId)) ||
        normalize(f).includes(normalize(decodedId))
    );

    if (!matchFile) {
      return res.status(404).json({
        error: "Scan file not found",
        debug: { scanId, decodedId, files },
      });
    }

    const scanFilePath = path.join(scansDir, matchFile);

    // 3️⃣ Locate the remediation file if present
    const remediationFile = files.find(
      (f) =>
        f.includes(path.basename(matchFile).replace(".json", "")) &&
        f.includes("remediation.json")
    );

    const scanData = JSON.parse(fs.readFileSync(scanFilePath, "utf8"));
    const remediation = remediationFile
      ? JSON.parse(fs.readFileSync(path.join(scansDir, remediationFile), "utf8"))
      : [];

    // 4️⃣ Load your banner
    const logoPath = "C:/Users/Chirag/Documents/secora/assets/banner.png";
    const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
      : "";

    // 5️⃣ Generate PDF HTML (Dark Pro design)
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
              background: rgba(88, 166, 255, 0.1);
              border: 1px solid rgba(88, 166, 255, 0.3);
              border-radius: 10px;
              padding: 20px;
              margin-top: 30px;
              box-shadow: 0 0 12px rgba(88, 166, 255, 0.25);
            }
            h2 {
              color: #58a6ff;
              border-bottom: 1px solid rgba(88, 166, 255, 0.4);
              padding-bottom: 6px;
              margin-top: 40px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .vuln-card {
              border: 1px solid rgba(88, 166, 255, 0.3);
              background: rgba(0, 0, 0, 0.4);
              border-radius: 8px;
              padding: 16px;
              margin-top: 20px;
              box-shadow: 0 0 10px rgba(88, 166, 255, 0.15);
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
            <p>${remediation.summary || "Automated AI-generated vulnerability remediation insights."}</p>
            <p><strong>Total Vulnerabilities:</strong> ${scanData.vulnerabilities?.length || 0}</p>
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
            Secora AI Security Report © 2025 — Confidential
          </footer>
        </body>
      </html>
    `;

    // 6️⃣ Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "20mm" },
    });

    await browser.close();

    const filename = `Secora-Final-Report-${path.basename(matchFile, ".json")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    console.error("❌ PDF Report Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
*/

//Option style test 2//
/*
import express from "express";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const router = express.Router();

router.get("/api/report/:scanId/pdf", async (req, res) => {
  const { scanId } = req.params;

  try {
    const possibleDirs = [
      path.join(process.cwd(), "backend", "scan-results"),
      path.join(process.cwd(), "scan-results"),
    ];
    const scansDir = possibleDirs.find((dir) => fs.existsSync(dir));
    if (!scansDir) {
      return res.status(404).json({ error: "Scan results directory missing" });
    }

    const files = fs.readdirSync(scansDir);
    const decodedId = decodeURIComponent(scanId);
    console.log("📁 Using scansDir:", scansDir);
    console.log("📂 Files:", files);

    const normalize = (s) =>
      s.toLowerCase().replace(/[%:/\\._\-]/g, "").replace(/https/g, "");
    const matchFile = files.find(
      (f) =>
        normalize(f).includes(normalize(scanId)) ||
        normalize(f).includes(normalize(decodedId))
    );

    if (!matchFile) {
      return res.status(404).json({ error: "Scan file not found", debug: { scanId, decodedId, files } });
    }

    const scanPath = path.join(scansDir, matchFile);
    const remediationFile = files.find(
      (f) =>
        f.includes(path.basename(matchFile).replace(".json", "")) &&
        f.includes("remediation.json")
    );

    const scanData = JSON.parse(fs.readFileSync(scanPath, "utf8"));
    const remediation = remediationFile
      ? JSON.parse(fs.readFileSync(path.join(scansDir, remediationFile), "utf8"))
      : [];

    const logoPath = "C:/Users/Chirag/Documents/secora/assets/banner.png";
    const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
      : "";

    const html = `
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      background: #0d1117;
      color: #e6edf3;
      font-family: 'Inter', Arial, sans-serif;
      padding: 40px;
    }
    header { text-align: center; }
    img { max-height: 70px; }
    h1 { color: #58a6ff; margin-top: 10px; }
    .summary {
      background: rgba(88,166,255,0.1);
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
    }
    pre {
      background: rgba(13,17,23,0.8);
      color: #c9d1d9;
      padding: 10px;
      border-radius: 6px;
      font-size: 12px;
      overflow-x: auto;
    }
    .vuln { border: 1px solid rgba(88,166,255,0.3); padding: 15px; margin: 10px 0; border-radius: 8px; }
    footer { text-align: center; font-size: 12px; color: gray; margin-top: 40px; }
  </style>
</head>
<body>
  <header>
    ${logoBase64 ? `<img src="${logoBase64}" />` : ""}
    <h1>Secora Final Report</h1>
  </header>

  <div class="summary">
    <p><strong>Target:</strong> ${scanData.target || "Unknown"}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Findings:</strong> ${scanData.vulnerabilities?.length || 0}</p>
  </div>

  <h2>Vulnerability Details</h2>
  ${remediation.length
    ? remediation
        .map(
          (r) => `
      <div class="vuln">
        <strong>${r.vulnerability || "Unnamed Issue"}</strong><br>
        ${r.description || ""}<br>
        <em>Remediation:</em> ${r.remediation || ""}
      </div>`
        )
        .join("")
    : "<p>No AI remediation data.</p>"}

  <footer>Secora AI Report © 2025</footer>
</body>
</html>`;

    console.log("📄 Generating PDF...");

    // ✅ Robust Puppeteer launch (with fallback for missing binaries)
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath:
        puppeteer.executablePath() ||
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Secora-Final-Report.pdf"'
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ PDF Report Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
*/

/*
import express from "express";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const router = express.Router();

router.get("/api/report/:scanId/pdf", async (req, res) => {
  const { scanId } = req.params;

  try {
    // 1️⃣ Locate scan-results folder dynamically
    const possibleDirs = [
      path.join(process.cwd(), "backend", "scan-results"),
      path.join(process.cwd(), "scan-results"),
    ];
    const scansDir = possibleDirs.find((dir) => fs.existsSync(dir));

    if (!scansDir) {
      return res.status(404).json({
        error: "Scan results directory missing",
        checked: possibleDirs,
      });
    }

    // 2️⃣ Match encoded filenames properly
    const files = fs.readdirSync(scansDir);
    const encodedName = encodeURIComponent(scanId) + ".json";
    let matchFile = files.find((f) => f === encodedName);
    if (!matchFile) {
      const fallback = files.find((f) => f.includes(scanId.split("-").pop()));
      if (!fallback) {
        return res.status(404).json({
          error: "Scan file not found",
          debug: { scanId, encodedName, files },
        });
      }
      matchFile = fallback;
    }

    console.log("✅ Matched file:", matchFile);

    // 3️⃣ Load scan data + remediation file
    const scanFile = path.join(scansDir, matchFile);
    const remediationFile = files.find(
      (f) =>
        f.includes(matchFile.replace(".json", "")) &&
        f.includes("remediation.json")
    );

    const scanData = JSON.parse(fs.readFileSync(scanFile, "utf8"));
    const remediation = remediationFile
      ? JSON.parse(fs.readFileSync(path.join(scansDir, remediationFile), "utf8"))
      : [];

    // 4️⃣ Banner/logo
    const logoPath = "C:/Users/Chirag/Documents/secora/assets/banner.png";
    const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
      : "";

    // 5️⃣ Generate combined cover + report HTML
    const html = `
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 0; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      color: #e6edf3;
      background: #0d1117;
      margin: 0;
    }

    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: radial-gradient(circle at 50% 20%, #001d3d 0%, #000814 100%);
      page-break-after: always;
    }
    .cover img {
      max-height: 120px;
      margin-bottom: 25px;
      filter: drop-shadow(0 0 15px #00b4ff);
    }
    .cover h1 {
      font-size: 36px;
      color: #58a6ff;
      text-shadow: 0 0 15px #007bff;
      margin: 0;
    }
    .cover .meta {
      margin-top: 25px;
      font-size: 16px;
      color: #9dbbd8;
      text-align: center;
      line-height: 1.6;
    }
    .cover .meta strong {
      color: #e6edf3;
    }
    .cover-footer {
      position: absolute;
      bottom: 30px;
      text-align: center;
      width: 100%;
      font-size: 13px;
      color: #7a8596;
    }

    
    .report {
      padding: 60px;
      background: linear-gradient(180deg, #0d1117 0%, #001d3d 100%);
      box-sizing: border-box;
    }
    header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 1px solid rgba(88,166,255,0.3);
      padding-bottom: 20px;
    }
    header h2 {
      color: #58a6ff;
      font-size: 24px;
      text-shadow: 0 0 8px #007bff;
      margin: 0;
    }
    header p {
      font-size: 13px;
      opacity: 0.9;
      margin: 5px 0 0;
    }
    .summary {
      background: rgba(88,166,255,0.08);
      border: 1px solid rgba(88,166,255,0.25);
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
      box-shadow: 0 0 10px rgba(88,166,255,0.15);
    }
    .summary h3 {
      color: #79c0ff;
      margin-top: 0;
    }
    h3.section-title {
      color: #58a6ff;
      border-bottom: 1px solid rgba(88,166,255,0.3);
      padding-bottom: 6px;
      margin-top: 40px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 15px;
    }
    .vuln-card {
      border: 1px solid rgba(88,166,255,0.3);
      background: rgba(0,0,0,0.35);
      border-radius: 10px;
      padding: 16px;
      margin-top: 18px;
      box-shadow: 0 0 8px rgba(88,166,255,0.12);
    }
    .vuln-card h4 {
      color: #79c0ff;
      margin-top: 0;
    }
    .vuln-card p {
      margin: 5px 0;
      font-size: 13px;
    }
    pre {
      background: rgba(13,17,23,0.9);
      color: #c9d1d9;
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
    }
    footer {
      text-align: center;
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      margin-top: 60px;
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <section class="cover">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Secora Logo" />` : ""}
    <h1>Secora Final Report</h1>
    <div class="meta">
      <p><strong>Target:</strong> ${scanData.target || "Unknown"}</p>
      <p><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Report ID:</strong> ${scanId}</p>
      <p><strong>Prepared for:</strong> Chirag</p>
    </div>
    <div class="cover-footer">Secora AI Security Report © ${new Date().getFullYear()} — Confidential</div>
  </section>

  <!-- REPORT PAGE -->
  <section class="report">
    <header>
      <h2>Detailed Vulnerability Report</h2>
      <p>Analysis & AI-Powered Remediation Insights</p>
    </header>

    <div class="summary">
      <h3>Executive Summary</h3>
      <p>${remediation.summary || "AI-driven assessment highlighting key weaknesses and suggested remediations."}</p>
      <p><strong>Total Findings:</strong> ${scanData.vulnerabilities?.length || 0}</p>
    </div>

    <h3 class="section-title">Vulnerability Details</h3>
    ${
      remediation.length
        ? remediation
            .map(
              (r) => `
          <div class="vuln-card">
            <h4>${r.vulnerability || "Unnamed Issue"}</h4>
            <p><b>Description:</b> ${r.description || "N/A"}</p>
            <p><b>Impact:</b> ${r.impact || "N/A"}</p>
            <p><b>Remediation:</b> ${r.remediation || "N/A"}</p>
            ${r.example_fix ? `<pre>${r.example_fix}</pre>` : ""}
          </div>`
            )
            .join("")
        : "<p>No AI remediation data available.</p>"
    }

    <footer>
      Page 2 | Secora AI Security Report © ${new Date().getFullYear()}
    </footer>
  </section>
</body>
</html>
`;

    // 6️⃣ Generate PDF with Puppeteer
    console.log("📄 Generating Secora Pro PDF...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });

    await browser.close();

    const filename = `Secora-Pro-Report-${path.basename(matchFile, ".json")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    console.error("❌ PDF Report Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
*/

import express from "express";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

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
        normalize(f).includes(normalize(scanId)) ||
        normalize(f).includes(normalize(decodedId))
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
    const summaryFile = files.find(
      (f) => f.includes(matchFile.replace(".json", "")) && f.includes("summary.json")
    );

    const remediation = remediationFile
      ? JSON.parse(fs.readFileSync(path.join(scansDir, remediationFile), "utf8"))
      : [];
    const summary = summaryFile
      ? JSON.parse(fs.readFileSync(path.join(scansDir, summaryFile), "utf8"))
      : { text: "AI summary unavailable for this scan." };

    // 4️⃣ Compute severity counts for chart
    const severities = { High: 0, Medium: 0, Low: 0 };
    for (const r of remediation) {
      const impact = (r.impact || "").toLowerCase();
      if (impact.includes("high")) severities.High++;
      else if (impact.includes("medium")) severities.Medium++;
      else severities.Low++;
    }

    // 5️⃣ Load logo
    const logoPath = "C:/Users/Chirag/Documents/secora/assets/banner.png";
    const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
      : "";

    // 6️⃣ Generate HTML (Edge-to-Edge Print)
    const html = `
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      margin: 0;
      size: A4;
    }

    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      background: #000; /* removes white borders */
      font-family: 'Inter', Arial, sans-serif;
      color: #e6edf3;
    }

    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: radial-gradient(circle at center, #001b3d 0%, #000a1a 100%);
      page-break-after: always;
    }

    .cover img {
      height: 110px;
      filter: drop-shadow(0 0 20px #007bff);
      margin-bottom: 25px;
    }

    .cover h1 {
      font-size: 36px;
      color: #60aaff;
      letter-spacing: 2px;
      margin-bottom: 20px;
      text-shadow: 0 0 15px rgba(0,160,255,0.6);
    }

    .cover .meta {
      font-size: 14px;
      line-height: 1.8;
      color: rgba(220,230,240,0.9);
    }

    section {
      padding: 40px 55px;
      box-sizing: border-box;
      page-break-before: auto;
      page-break-inside: avoid;
    }

    h2 {
      font-size: 20px;
      color: #6db9ff;
      border-left: 3px solid #007bff;
      padding-left: 12px;
      margin-top: 40px;
      text-transform: uppercase;
    }

    .summary,
    .vuln-card {
      background: rgba(13,17,23,0.9);
      border-radius: 14px;
      border: 1px solid rgba(88,166,255,0.3);
      box-shadow: 0 0 20px rgba(88,166,255,0.1);
      padding: 25px 30px;
      margin: 25px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .vuln-card h3 {
      color: #82c4ff;
      margin-top: 0;
      font-size: 15px;
    }

    .vuln-card p {
      font-size: 13px;
      line-height: 1.5;
    }

    footer {
      text-align: center;
      padding: 15px;
      color: rgba(255,255,255,0.5);
      font-size: 11px;
      border-top: 1px solid rgba(255,255,255,0.1);
      background: rgba(0,10,25,0.95);
      page-break-after: always;
    }

    .severity-pie {
      width: 130px;
      height: 130px;
      margin: 20px auto;
      border-radius: 50%;
      background: conic-gradient(
        #ff4d4d 0deg calc(${(severities.High / (severities.High + severities.Medium + severities.Low || 1)) * 360}deg),
        #ffae42 calc(${(severities.High / (severities.High + severities.Medium + severities.Low || 1)) * 360}deg)
                 calc(${((severities.High + severities.Medium) / (severities.High + severities.Medium + severities.Low || 1)) * 360}deg),
        #4dff88 calc(${((severities.High + severities.Medium) / (severities.High + severities.Medium + severities.Low || 1)) * 360}deg) 360deg
      );
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .severity-center {
      background: #0d1117;
      border-radius: 50%;
      width: 65px;
      height: 65px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 12px;
    }

    .severity-legend {
      display: flex;
      justify-content: center;
      margin-top: 10px;
      gap: 10px;
      font-size: 12px;
    }

    .severity-legend span::before {
      content: '';
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 4px;
    }

    .high::before { background: #ff4d4d; }
    .medium::before { background: #ffae42; }
    .low::before { background: #4dff88; }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Secora Logo" />` : ""}
    <h1>Secora Pro Security Report</h1>
    <div class="meta">
      <div>Target: ${scanData.target || "Unknown Target"}</div>
      <div>Generated on: ${new Date().toLocaleString()}</div>
      <div>Report ID: ${scanId}</div>
      <div>Prepared by: Chirag</div>
    </div>
  </div>

  <!-- REPORT BODY -->
  <section>
    <h2>Executive Summary</h2>
    <div class="summary">
      <p>${summary.text || summary}</p>
      <p><strong>Total Findings:</strong> ${scanData.vulnerabilities?.length || 0}</p>

      <!-- RADIAL PIE CHART -->
      <div class="severity-pie">
        <div class="severity-center">
          <div>${severities.High}H</div>
          <div>${severities.Medium}M</div>
          <div>${severities.Low}L</div>
        </div>
      </div>
      <div class="severity-legend">
        <span class="high">High</span>
        <span class="medium">Medium</span>
        <span class="low">Low</span>
      </div>
    </div>

    <h2>Vulnerability Details</h2>
    ${
      remediation.length
        ? remediation
            .map((r) => {
              const sev = (r.impact || "").toLowerCase();
              let color =
                sev.includes("high")
                  ? "#ff4d4d"
                  : sev.includes("medium")
                  ? "#ffae42"
                  : sev.includes("low")
                  ? "#4dff88"
                  : "#5daeff";

              return `
              <div class="vuln-card">
                <div class="vuln-bar" style="background:${color}"></div>
                <h3>${r.vulnerability || "Unnamed Issue"}</h3>
                <p><b>Description:</b> ${r.description || "N/A"}</p>
                <p><b>Impact:</b> ${r.impact || "N/A"}</p>
                <p><b>Remediation:</b> ${r.remediation || "N/A"}</p>
                ${r.example_fix ? `<pre>${r.example_fix}</pre>` : ""}
              </div>`;
            })
            .join("")
        : "<p>No AI remediation data available.</p>"
    }
  </section>

  <footer>Secora AI Report © ${new Date().getFullYear()} — Confidential</footer>
</body>
</html>
`;

    // 7️⃣ Generate PDF (No white borders)
    console.log("📄 Generating Secora Pro PDF...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      width: "210mm",
      height: "297mm",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });

    await browser.close();

    const filename = `Secora-Pro-Report-${path.basename(matchFile, ".json")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    console.error("❌ PDF Report Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
