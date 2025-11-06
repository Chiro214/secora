// backend/src/utils/ai.js
import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // fallback-friendly small fast model
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
    return {
      summary:
        "AI suggestions unavailable right now. You can still review manual findings.",
      items: [],
      raw: { error: e?.message || String(e) },
    };
  }
}
