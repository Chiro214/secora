// backend/src/reporting/businessImpact.js
// Generates plain-English business impact statements per finding

const IMPACT_TEMPLATES = {
    INJECTION: [
        'An attacker exploiting this SQL injection could extract all records from the database, including user credentials, personal data, and financial information.',
        'This vulnerability allows an unauthenticated attacker to bypass authentication, modify or delete database records, and potentially gain full control of the database server.',
        'Successful exploitation could result in a full data breach, leading to regulatory fines (GDPR: up to 4% of annual revenue), legal liability, and reputational damage.'
    ],
    XSS: [
        'An attacker can steal authenticated user sessions by injecting malicious JavaScript that captures cookies or credentials when the page is viewed.',
        'This vulnerability enables phishing attacks that appear to originate from your trusted domain, significantly increasing the likelihood of credential theft from your users.',
        'Exploitation could lead to account takeover, unauthorized transactions, and data theft from any user who views the affected page.'
    ],
    SSRF: [
        'An attacker can use the application as a proxy to scan and access internal network services, potentially reaching databases, admin panels, and cloud metadata endpoints.',
        'If the application runs in a cloud environment (AWS/GCP/Azure), SSRF can be used to steal IAM credentials from the metadata service, granting the attacker access to your entire cloud infrastructure.',
        'This vulnerability enables attackers to bypass network firewalls by routing requests through your trusted application server.'
    ],
    XXE: [
        'An attacker can read arbitrary files from the server, including configuration files containing database credentials, API keys, and other secrets.',
        'This vulnerability can be chained with SSRF to access internal services or used for denial-of-service via recursive entity expansion (Billion Laughs attack).'
    ],
    BROKEN_ACCESS: [
        'Any authenticated user can access or modify other users\' private data by simply changing resource identifiers in the URL.',
        'This vulnerability exposes all user records to enumeration and unauthorized access, violating data privacy requirements and regulatory obligations.'
    ],
    BROKEN_AUTH: [
        'Weak authentication controls allow attackers to gain unauthorized access to user accounts through credential stuffing, brute force, or session fixation.',
        'Account takeover can result in financial fraud, data theft, and unauthorized access to sensitive business functions.'
    ],
    SECURITY_MISCONFIG: [
        'Misconfigured security settings expose unnecessary attack surface, potentially revealing sensitive information or enabling exploitation of known vulnerabilities.',
        'Default or weak configurations can be easily discovered by automated scanners, making the application a target for opportunistic attacks.'
    ],
    SENSITIVE_DATA: [
        'Sensitive data transmitted or stored without adequate protection can be intercepted by attackers, leading to identity theft, financial fraud, or regulatory violations.',
        'Failure to encrypt data in transit or at rest exposes the organization to compliance penalties under PCI-DSS, HIPAA, and GDPR.'
    ],
    OPEN_REDIRECT: [
        'Attackers can craft URLs on your domain that redirect users to malicious phishing sites, exploiting user trust in your brand.',
        'Open redirects are frequently used in social engineering campaigns and can bypass email security filters that trust your domain.'
    ]
};

/**
 * Generate business impact statement for a finding
 * @param {object} finding - { category, severity, title, description }
 * @returns {string} 2-3 sentence business impact statement
 */
export function generateBusinessImpact(finding) {
    const templates = IMPACT_TEMPLATES[finding.category] || IMPACT_TEMPLATES.SECURITY_MISCONFIG;
    // Select based on severity
    const idx = finding.severity === 'CRITICAL' ? 0 :
                finding.severity === 'HIGH' ? Math.min(1, templates.length - 1) :
                Math.min(2, templates.length - 1);

    let impact = templates[idx];

    // Add severity-specific prefix
    if (finding.severity === 'CRITICAL') {
        impact = `CRITICAL BUSINESS RISK: ${impact}`;
    }

    return impact;
}

/**
 * Generate business impact for all findings
 */
export function generateAllBusinessImpacts(findings) {
    return findings.map(f => ({
        ...f,
        businessImpact: generateBusinessImpact(f)
    }));
}

export default { generateBusinessImpact, generateAllBusinessImpacts };
