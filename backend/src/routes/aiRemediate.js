// backend/src/routes/aiRemediate.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

let OpenAI;
try {
  // Import dynamically — this prevents crashes if OpenAI package misbehaves
  OpenAI = (await import("openai")).default;
} catch (err) {
  console.warn("⚠️ Could not import OpenAI library:", err.message);
}

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let openai = null;

// ✅ Safe initialization — won't crash even without a key
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "") {
  try {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("🔑 OpenAI client initialized successfully.");
  } catch (err) {
    console.warn("⚠️ Failed to create OpenAI client:", err.message);
  }
} else {
  console.warn("⚠️ No OPENAI_API_KEY detected — running in mock AI mode.");
}

/**
 * POST /api/remediate/:scanId
 * Reads a saved scan JSON and generates AI-based remediation steps.
 */
router.post("/api/remediate/:scanId", async (req, res) => {
  const { scanId } = req.params;

  try {
    const scansDir = path.resolve(__dirname, "../../scan-results");

    if (!fs.existsSync(scansDir)) {
      return res.status(404).json({ error: "Scan results directory missing" });
    }

    const files = fs.readdirSync(scansDir);
    const encodedId = encodeURIComponent(scanId);
    const decodedId = decodeURIComponent(scanId);

    const scanFile = files.find(
      (f) =>
        (f.includes(scanId) ||
          f.includes(encodedId) ||
          f.includes(decodedId)) &&
        f.endsWith(".json") &&
        !f.includes("remediation")
    );

    if (!scanFile) {
      return res.status(404).json({
        error: "Scan result not found",
        debug: { scanId, encodedId, decodedId, files },
      });
    }

    const scanPath = path.join(scansDir, scanFile);
    const scanData = JSON.parse(fs.readFileSync(scanPath, "utf8"));

    const prompt = `
You are Secora AI — a professional web security assistant.
Analyze the following vulnerability scan result and produce JSON output like:

[
  {
    "vulnerability": "SQL Injection",
    "description": "Why it occurs and its impact",
    "remediation": "Steps to fix it",
    "example_fix": "Example secure code/config"
  }
]

Scan data (truncated):
${JSON.stringify(scanData).slice(0, 3000)}
`;

    // ✅ Try real OpenAI if available
    let parsed = null;

    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.3,
          messages: [{ role: "user", content: prompt }],
        });

        const text = response.choices?.[0]?.message?.content?.trim();
        try {
          parsed = JSON.parse(text);
          console.log("✅ AI remediation generated via OpenAI.");
        } catch {
          parsed = [{ message: text }];
        }
      } catch (err) {
        console.warn("⚠️ OpenAI API failed, using mock data instead:", err.message);
        parsed = generateMockRemediation();
      }
    } else {
      // 🧠 No OpenAI key — fallback directly
      parsed = generateMockRemediation();
    }

    const outFile = path.join(
      scansDir,
      `${scanFile.replace(".json", "")}-remediation.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2));

    console.log(`🧩 Remediation file saved: ${outFile}`);
    return res.json({ ok: true, remediation: parsed });
  } catch (error) {
    console.error("💥 Remediation route failed:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🧩 Mock AI Fallback — Generates safe fake data
 */
function generateMockRemediation() {
  return [
    {
      vulnerability: "Missing Content-Security-Policy",
      description:
        "No CSP header found, exposing the site to XSS and data injection attacks.",
      remediation:
        "Add 'Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted-cdn.example.com;'.",
      example_fix:
        "<meta http-equiv='Content-Security-Policy' content=\"default-src 'self';\">",
    },
    {
      vulnerability: "Missing HSTS header",
      description:
        "Strict-Transport-Security not set, allowing potential insecure connections.",
      remediation:
        "Add 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload'.",
      example_fix: "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
    },
    {
      vulnerability: "Missing X-Frame-Options",
      description:
        "Page may be embedded in frames, making it vulnerable to clickjacking.",
      remediation: "Add 'X-Frame-Options: DENY' to response headers.",
      example_fix: "X-Frame-Options: DENY",
    },
  ];
}

export default router;
