import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateAISummary(scanData, remediation) {
  const total = scanData.vulnerabilities?.length || 0;
  const severities = { High: 0, Medium: 0, Low: 0 };

  remediation.forEach(r => {
    if (r.severity) severities[r.severity] = (severities[r.severity] || 0) + 1;
  });

  const prompt = `
You are Secora AI, a cybersecurity assistant.
Create a concise 3-sentence executive summary for this scan.
Focus on severity, risk level, and general recommendations.

Findings:
${JSON.stringify(remediation.slice(0, 5), null, 2)}
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 180,
    });

    const summary = response.choices[0].message.content.trim();
    const top3 = remediation.slice(0, 3).map(r => r.vulnerability);

    return {
      total,
      severities,
      top3,
      summary,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("❌ AI summary generation failed:", err);
    return {
      total,
      severities,
      top3: [],
      summary: "Automated summary generation failed.",
    };
  }
}

export function saveSummary(targetPath, data) {
  const filePath = targetPath.replace(".json", "-summary.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log(`✅ Summary saved: ${filePath}`);
}
