// backend/src/reporting/executiveSummary.js
// Auto-generates a 1-page executive summary for non-technical stakeholders

/**
 * Generate executive summary from scan findings
 * @param {object} scanData - { target, findings, stats, duration, technologies }
 * @returns {object} Executive summary sections
 */
export function generateExecutiveSummary(scanData) {
    const { findings = [], target = {}, stats = {}, duration = 0, technologies = [] } = scanData;

    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    for (const f of findings) {
        severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
    }

    const overallRisk = calculateOverallRisk(severityCounts);
    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL').slice(0, 5);
    const highFindings = findings.filter(f => f.severity === 'HIGH').slice(0, 3);
    const topFindings = [...criticalFindings, ...highFindings].slice(0, 5);

    return {
        title: `Security Assessment — Executive Summary`,
        target: target.value || target.name || 'Unknown Target',
        scanDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        scanDuration: formatDuration(duration),

        overallRisk: {
            rating: overallRisk.rating,
            color: overallRisk.color,
            justification: overallRisk.justification
        },

        findingSummary: {
            total: findings.length,
            critical: severityCounts.CRITICAL,
            high: severityCounts.HIGH,
            medium: severityCounts.MEDIUM,
            low: severityCounts.LOW,
            informational: severityCounts.INFO
        },

        topRisks: topFindings.map(f => ({
            title: f.title,
            severity: f.severity,
            plainEnglish: generatePlainEnglish(f),
            immediateAction: getImmediateAction(f)
        })),

        actionPriority: generateActionPriority(severityCounts),

        conclusion: generateConclusion(overallRisk, severityCounts, target),

        technologiesDetected: technologies.slice(0, 10)
    };
}

function calculateOverallRisk(counts) {
    if (counts.CRITICAL >= 3) return { rating: 'CRITICAL', color: '#DC2626', justification: `${counts.CRITICAL} critical vulnerabilities present an immediate, severe risk to business operations and data confidentiality.` };
    if (counts.CRITICAL >= 1) return { rating: 'HIGH', color: '#EA580C', justification: `Critical vulnerabilities detected that could lead to full system compromise. Immediate remediation required.` };
    if (counts.HIGH >= 3) return { rating: 'HIGH', color: '#EA580C', justification: `Multiple high-severity vulnerabilities collectively present significant risk to the organization.` };
    if (counts.HIGH >= 1) return { rating: 'MODERATE', color: '#D97706', justification: `High-severity vulnerabilities detected that warrant prompt attention and remediation planning.` };
    if (counts.MEDIUM >= 3) return { rating: 'MODERATE', color: '#D97706', justification: `Several medium-severity findings indicate room for improvement in security posture.` };
    return { rating: 'LOW', color: '#059669', justification: `No critical or high-severity vulnerabilities detected. Minor findings should be addressed during regular maintenance cycles.` };
}

function generatePlainEnglish(finding) {
    const templates = {
        INJECTION: `An attacker can inject malicious commands into the application, potentially accessing or modifying all data in the database.`,
        XSS: `An attacker can execute malicious scripts in users' browsers, potentially stealing login sessions and personal information.`,
        SSRF: `The application can be tricked into making requests to internal systems, potentially exposing cloud credentials and internal services.`,
        XXE: `The application's XML processing can be exploited to read sensitive files from the server or perform server-side attacks.`,
        BROKEN_ACCESS: `Unauthorized users can access data or functions that should be restricted, bypassing access controls.`,
        BROKEN_AUTH: `Authentication mechanisms have weaknesses that could allow attackers to bypass login security.`,
        SECURITY_MISCONFIG: `System configuration weaknesses could allow attackers to gain unauthorized access or information.`,
        SENSITIVE_DATA: `Sensitive data may be exposed due to insufficient protection in storage or transmission.`
    };
    return templates[finding.category] || `A security weakness was identified that could be exploited by an attacker to compromise the application.`;
}

function getImmediateAction(finding) {
    const actions = {
        INJECTION: 'Implement parameterized queries immediately across all database interactions.',
        XSS: 'Deploy input sanitization and Content Security Policy headers.',
        SSRF: 'Restrict outbound connections and block internal IP ranges in application logic.',
        XXE: 'Disable XML external entity processing in all XML parsers.',
        BROKEN_ACCESS: 'Audit and enforce authorization checks on all sensitive endpoints.',
        BROKEN_AUTH: 'Strengthen authentication mechanisms and implement MFA.',
        SECURITY_MISCONFIG: 'Review and harden server/application configuration settings.'
    };
    return actions[finding.category] || 'Review and remediate as per detailed technical findings.';
}

function generateActionPriority(counts) {
    const actions = [];
    if (counts.CRITICAL > 0) actions.push({ priority: 1, timeline: 'Immediate (24-48 hours)', action: `Remediate ${counts.CRITICAL} critical vulnerabilities — these represent active exploitation risk.` });
    if (counts.HIGH > 0) actions.push({ priority: 2, timeline: 'Within 1 week', action: `Address ${counts.HIGH} high-severity findings to significantly reduce attack surface.` });
    if (counts.MEDIUM > 0) actions.push({ priority: 3, timeline: 'Within 30 days', action: `Resolve ${counts.MEDIUM} medium-severity issues during next sprint/maintenance cycle.` });
    if (counts.LOW > 0) actions.push({ priority: 4, timeline: 'Within 90 days', action: `Review ${counts.LOW} low-severity findings and apply fixes as resources allow.` });
    return actions;
}

function generateConclusion(overallRisk, counts, target) {
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    return `This security assessment of ${target.value || target.name || 'the target'} identified ${total} findings. ` +
        `The overall risk rating is ${overallRisk.rating}. ${overallRisk.justification} ` +
        `We recommend addressing all critical and high-severity findings before the next production release.`;
}

function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default { generateExecutiveSummary };
