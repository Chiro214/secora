// backend/src/reporting/cvssCalculator.js
// CVSS 3.1 Base Score Calculator — computes per-finding scores from actual observed impact

const CVSS_METRICS = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.20 },  // Attack Vector
    AC: { L: 0.77, H: 0.44 },                       // Attack Complexity
    PR: { N: 0.85, L: 0.62, H: 0.27 },              // Privileges Required (Unchanged scope)
    PR_C: { N: 0.85, L: 0.68, H: 0.50 },            // Privileges Required (Changed scope)
    UI: { N: 0.85, R: 0.62 },                       // User Interaction
    C: { H: 0.56, L: 0.22, N: 0 },                  // Confidentiality
    I: { H: 0.56, L: 0.22, N: 0 },                  // Integrity
    A: { H: 0.56, L: 0.22, N: 0 }                   // Availability
};

// Finding type -> CVSS vector mapping based on typical impact
const FINDING_VECTORS = {
    'SQL Injection': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' },
    'SQL Injection (Error-Based)': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' },
    'SQL Injection (Time-Based Blind)': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'N', A: 'N' },
    'SQL Injection (OAST Blind)': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' },
    'SQL Injection (Union-Based)': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'N' },
    'Reflected Cross-Site Scripting': { AV: 'N', AC: 'L', PR: 'N', UI: 'R', S: 'C', C: 'L', I: 'L', A: 'N' },
    'Stored Cross-Site Scripting': { AV: 'N', AC: 'L', PR: 'L', UI: 'R', S: 'C', C: 'L', I: 'L', A: 'N' },
    'DOM-Based Cross-Site Scripting': { AV: 'N', AC: 'L', PR: 'N', UI: 'R', S: 'C', C: 'L', I: 'L', A: 'N' },
    'Server-Side Request Forgery': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'L', A: 'N' },
    'SSRF — Cloud Metadata Access': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' },
    'XML External Entity': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'N', A: 'L' },
    'Log4Shell': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'C', C: 'H', I: 'H', A: 'H' },
    'IDOR': { AV: 'N', AC: 'L', PR: 'L', UI: 'N', S: 'U', C: 'H', I: 'N', A: 'N' },
    'CSRF': { AV: 'N', AC: 'L', PR: 'N', UI: 'R', S: 'U', C: 'N', I: 'L', A: 'N' },
    'File Upload': { AV: 'N', AC: 'L', PR: 'L', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' },
    'Mass Assignment': { AV: 'N', AC: 'L', PR: 'L', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'N' },
    'Missing CSP': { AV: 'N', AC: 'H', PR: 'N', UI: 'R', S: 'U', C: 'L', I: 'L', A: 'N' },
    'Missing HSTS': { AV: 'N', AC: 'H', PR: 'N', UI: 'R', S: 'U', C: 'L', I: 'L', A: 'N' },
    'Open Redirect': { AV: 'N', AC: 'L', PR: 'N', UI: 'R', S: 'C', C: 'L', I: 'L', A: 'N' },
    'Auth Bypass': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'N' },
    'default': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'L', I: 'L', A: 'N' }
};

/**
 * Calculate CVSS 3.1 base score for a finding
 * @param {object} finding - Finding object with title, severity, category
 * @returns {object} { score, vector, rating }
 */
export function calculateCVSS(finding) {
    // Find best matching vector
    let vector = FINDING_VECTORS['default'];
    for (const [key, vec] of Object.entries(FINDING_VECTORS)) {
        if (key === 'default') continue;
        if (finding.title?.toLowerCase().includes(key.toLowerCase()) ||
            finding.category?.toLowerCase().includes(key.toLowerCase().replace(/\s+/g, '_'))) {
            vector = vec;
            break;
        }
    }

    const S = vector.S; // Scope: U (unchanged) or C (changed)
    const prMetrics = S === 'C' ? CVSS_METRICS.PR_C : CVSS_METRICS.PR;

    const iss = 1 - (1 - CVSS_METRICS.C[vector.C]) * (1 - CVSS_METRICS.I[vector.I]) * (1 - CVSS_METRICS.A[vector.A]);

    let impact;
    if (S === 'U') {
        impact = 6.42 * iss;
    } else {
        impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    }

    const exploitability = 8.22 * CVSS_METRICS.AV[vector.AV] * CVSS_METRICS.AC[vector.AC] * prMetrics[vector.PR] * CVSS_METRICS.UI[vector.UI];

    let score;
    if (impact <= 0) {
        score = 0;
    } else if (S === 'U') {
        score = Math.min(impact + exploitability, 10);
    } else {
        score = Math.min(1.08 * (impact + exploitability), 10);
    }

    // Round up to 1 decimal
    score = Math.ceil(score * 10) / 10;

    const vectorString = `CVSS:3.1/AV:${vector.AV}/AC:${vector.AC}/PR:${vector.PR}/UI:${vector.UI}/S:${S}/C:${vector.C}/I:${vector.I}/A:${vector.A}`;

    const rating = score >= 9.0 ? 'Critical' : score >= 7.0 ? 'High' : score >= 4.0 ? 'Medium' : score > 0 ? 'Low' : 'None';

    return { score, vector: vectorString, rating, components: vector };
}

/**
 * Compute CVSS for all findings in a report
 */
export function computeAllCVSS(findings) {
    return findings.map(f => {
        const cvss = calculateCVSS(f);
        return { ...f, cvss: cvss.score, cvssVector: cvss.vector, cvssRating: cvss.rating };
    });
}

export default { calculateCVSS, computeAllCVSS };
