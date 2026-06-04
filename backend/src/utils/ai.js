// backend/src/utils/ai.js
import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

let client = null;

// ✅ Safe OpenAI initialization
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "") {
  try {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("🔑 OpenAI client initialized (live AI mode).");
  } catch (err) {
    console.warn("⚠️ Failed to initialize OpenAI client:", err.message);
  }
} else {
  console.warn("⚠️ No OPENAI_API_KEY found — running in mock AI mode.");
}

/**
 * Turn raw findings + headers into prioritized AI recommendations.
 * Returns: { summary: string, items: [{title, explanation, remediation, severity, eta}], raw?: any }
 */
export async function generateAiRecommendations({ url, headers, findings }) {
  const system = `You are a senior application security engineer. 
Return SHORT, practical, production-ready guidance. Prefer secure defaults and defense-in-depth.
If something is already secure, say so quickly.`;

  const user = `
Target: ${url}

HTTP Headers (truncated for brevity):
${JSON.stringify(headers, null, 2)}

Findings (from static checks):
${JSON.stringify(findings, null, 2)}

TASKS:
1) Write a short summary (2-4 sentences) of the overall risk posture.
2) Produce a prioritized list of concrete actions. For each action, include:
   - title
   - explanation (what's wrong / impact)
   - remediation (exact header value or code/config snippet, be concise)
   - severity (Critical | High | Medium | Low)
   - eta (time to fix, e.g., "15m", "1h", "1d")

Output STRICT JSON:
{
  "summary": "string",
  "items": [
    {"title":"...", "explanation":"...", "remediation":"...", "severity":"High", "eta":"1h"},
    ...
  ]
}
`;

  // 🧠 1️⃣ If client missing, use mock AI immediately
  if (!client) {
    console.log("🧩 Using mock AI recommendations (no OpenAI key).");
    return mockRecommendations(url, findings);
  }

  // 🧠 2️⃣ Try real OpenAI first
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: text, items: [] };
    }
    return {
      summary: parsed.summary || "No summary available.",
      items: Array.isArray(parsed.items) ? parsed.items : [],
      raw: parsed,
    };
  } catch (e) {
    // 🧠 3️⃣ On error (quota, network, etc.) → fallback mock data
    console.warn("⚠️ OpenAI API failed, switching to mock AI:", e.message);
    return mockRecommendations(url, findings, e.message);
  }
}

/**
 * 🧩 Local mock AI fallback generator — safe offline
 */
function mockRecommendations(url, findings = [], reason = "offline or quota limit") {
  const criticalCount = findings.filter(f => f.severity === 'Critical').length;
  const highCount = findings.filter(f => f.severity === 'High').length;
  const total = findings.length;

  return {
    summary: `Security analysis completed for ${url || 'target'}. Detected ${total} potential vulnerabilities, including ${criticalCount} Critical and ${highCount} High severity issues. Immediate review of high-priority findings is recommended.`,
    items: findings.slice(0, 5).map(f => ({
      title: f.title || "Vulnerability Detected",
      explanation: f.description || "A security misconfiguration or vulnerability was identified.",
      remediation: f.remediation || "Review the finding details and apply best practices.",
      severity: f.severity || "Medium",
      eta: "30m"
    })),
    raw: { source: "mock", reason },
  };
}
