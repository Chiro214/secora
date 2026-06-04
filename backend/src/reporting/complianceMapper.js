// backend/src/reporting/complianceMapper.js
// Maps findings to compliance framework controls: PCI-DSS, ISO 27001, HIPAA, OWASP

const PCI_DSS = {
    INJECTION: [{ id: '6.2.4', desc: 'Software development to prevent injection attacks' }, { id: '6.5.1', desc: 'Injection flaws prevention' }],
    XSS: [{ id: '6.2.4', desc: 'Prevent XSS attacks' }, { id: '6.5.7', desc: 'Cross-site scripting (XSS)' }],
    BROKEN_AUTH: [{ id: '8.2', desc: 'User identification and authentication' }, { id: '8.3', desc: 'Multi-factor authentication' }],
    BROKEN_ACCESS: [{ id: '7.1', desc: 'Access control systems' }, { id: '7.2', desc: 'Access restriction mechanisms' }],
    SENSITIVE_DATA: [{ id: '3.4', desc: 'Protect stored cardholder data' }, { id: '4.1', desc: 'Protect data in transit' }],
    SECURITY_MISCONFIG: [{ id: '2.2', desc: 'Configuration standards' }, { id: '6.2', desc: 'Security patches' }],
    SSRF: [{ id: '6.2.4', desc: 'Prevention of SSRF attacks' }],
    XXE: [{ id: '6.2.4', desc: 'Prevent XML injection' }],
    VULNERABLE_COMPONENTS: [{ id: '6.3.2', desc: 'Inventory of software components' }],
    INFORMATION_DISCLOSURE: [{ id: '3.4', desc: 'Data protection' }],
    NETWORK: [{ id: '1.3', desc: 'Network security controls' }],
    OPEN_REDIRECT: [{ id: '6.2.4', desc: 'Secure coding practices' }],
    INSUFFICIENT_LOGGING: [{ id: '10.1', desc: 'Audit trails' }, { id: '10.2', desc: 'Logging mechanisms' }]
};

const ISO_27001 = {
    INJECTION: [{ id: 'A.8.28', desc: 'Secure coding' }],
    XSS: [{ id: 'A.8.28', desc: 'Secure coding' }],
    BROKEN_AUTH: [{ id: 'A.8.5', desc: 'Secure authentication' }, { id: 'A.5.17', desc: 'Authentication information' }],
    BROKEN_ACCESS: [{ id: 'A.8.3', desc: 'Information access restriction' }, { id: 'A.5.15', desc: 'Access control' }],
    SENSITIVE_DATA: [{ id: 'A.8.24', desc: 'Use of cryptography' }, { id: 'A.5.33', desc: 'Protection of records' }],
    SECURITY_MISCONFIG: [{ id: 'A.8.9', desc: 'Configuration management' }],
    SSRF: [{ id: 'A.8.28', desc: 'Secure coding' }],
    XXE: [{ id: 'A.8.28', desc: 'Secure coding' }],
    VULNERABLE_COMPONENTS: [{ id: 'A.8.19', desc: 'Software installation' }],
    INFORMATION_DISCLOSURE: [{ id: 'A.5.33', desc: 'Protection of records' }],
    NETWORK: [{ id: 'A.8.20', desc: 'Network security' }, { id: 'A.8.21', desc: 'Security of network services' }],
    INSUFFICIENT_LOGGING: [{ id: 'A.8.15', desc: 'Logging' }, { id: 'A.8.16', desc: 'Monitoring activities' }]
};

const HIPAA = {
    INJECTION: [{ id: '§164.312(a)', desc: 'Access control' }],
    XSS: [{ id: '§164.312(a)', desc: 'Access control' }],
    BROKEN_AUTH: [{ id: '§164.312(d)', desc: 'Person or entity authentication' }],
    BROKEN_ACCESS: [{ id: '§164.312(a)(1)', desc: 'Access control' }],
    SENSITIVE_DATA: [{ id: '§164.312(a)(2)(iv)', desc: 'Encryption and decryption' }, { id: '§164.312(e)(1)', desc: 'Transmission security' }],
    SECURITY_MISCONFIG: [{ id: '§164.308(a)(5)', desc: 'Security awareness training' }],
    INFORMATION_DISCLOSURE: [{ id: '§164.312(a)', desc: 'Access control — PHI protection' }],
    INSUFFICIENT_LOGGING: [{ id: '§164.312(b)', desc: 'Audit controls' }]
};

const OWASP_TOP10 = {
    INJECTION: { id: 'A03:2021', desc: 'Injection' },
    XSS: { id: 'A03:2021', desc: 'Injection (XSS)' },
    BROKEN_AUTH: { id: 'A07:2021', desc: 'Identification and Authentication Failures' },
    BROKEN_ACCESS: { id: 'A01:2021', desc: 'Broken Access Control' },
    SENSITIVE_DATA: { id: 'A02:2021', desc: 'Cryptographic Failures' },
    SECURITY_MISCONFIG: { id: 'A05:2021', desc: 'Security Misconfiguration' },
    SSRF: { id: 'A10:2021', desc: 'Server-Side Request Forgery' },
    XXE: { id: 'A05:2021', desc: 'Security Misconfiguration (XXE)' },
    VULNERABLE_COMPONENTS: { id: 'A06:2021', desc: 'Vulnerable and Outdated Components' },
    INFORMATION_DISCLOSURE: { id: 'A01:2021', desc: 'Broken Access Control' },
    OPEN_REDIRECT: { id: 'A01:2021', desc: 'Broken Access Control' },
    INSUFFICIENT_LOGGING: { id: 'A09:2021', desc: 'Security Logging and Monitoring Failures' }
};

/**
 * Map a finding to compliance framework controls
 * @param {object} finding - { category, severity }
 * @param {string[]} frameworks - ['pci-dss', 'iso27001', 'hipaa']
 * @returns {object} Compliance mappings per framework
 */
export function mapToCompliance(finding, frameworks = ['pci-dss', 'iso27001', 'hipaa', 'owasp']) {
    const category = finding.category || 'OTHER';
    const mappings = {};

    if (frameworks.includes('pci-dss')) {
        mappings['PCI-DSS v4.0'] = PCI_DSS[category] || [{ id: '6.2', desc: 'General secure development' }];
    }
    if (frameworks.includes('iso27001')) {
        mappings['ISO 27001:2022'] = ISO_27001[category] || [{ id: 'A.8.28', desc: 'Secure coding' }];
    }
    if (frameworks.includes('hipaa')) {
        mappings['HIPAA'] = HIPAA[category] || [{ id: '§164.308(a)(1)', desc: 'Security management' }];
    }
    if (frameworks.includes('owasp')) {
        const owasp = OWASP_TOP10[category] || { id: 'A05:2021', desc: 'Security Misconfiguration' };
        mappings['OWASP Top 10 (2021)'] = [owasp];
    }

    return mappings;
}

/**
 * Generate compliance summary table for a full report
 */
export function generateComplianceSummary(findings, frameworks = ['pci-dss', 'iso27001', 'hipaa', 'owasp']) {
    const summary = {};
    for (const framework of frameworks) {
        summary[framework] = { controls: {}, totalFindings: 0 };
    }

    for (const finding of findings) {
        const mappings = mapToCompliance(finding, frameworks);
        for (const [framework, controls] of Object.entries(mappings)) {
            const key = framework.toLowerCase().replace(/[\s.:()]/g, '-');
            if (!summary[key]) summary[key] = { controls: {}, totalFindings: 0 };
            for (const control of controls) {
                if (!summary[key].controls[control.id]) {
                    summary[key].controls[control.id] = { desc: control.desc, findings: 0, severities: [] };
                }
                summary[key].controls[control.id].findings++;
                summary[key].controls[control.id].severities.push(finding.severity);
                summary[key].totalFindings++;
            }
        }
    }

    return summary;
}

export default { mapToCompliance, generateComplianceSummary };
