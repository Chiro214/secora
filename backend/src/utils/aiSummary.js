import OpenAI from "openai";
import fs from "fs";

let client = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "") {
  try {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (err) {
    console.warn("⚠️ Failed to initialize OpenAI client in aiSummary:", err.message);
  }
}
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
    if (!client) {
      console.log("🧩 Using mock AI summary (no OpenAI key).");
      return {
        total,
        severities,
        top3: remediation.slice(0, 3).map(r => r.vulnerability),
        summary: `Scan complete. Found ${severities.Critical || 0} Critical, ${severities.High || 0} High, and ${severities.Medium || 0} Medium issues. Please review high priority findings.`,
        generatedAt: new Date().toISOString(),
      };
    }

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
