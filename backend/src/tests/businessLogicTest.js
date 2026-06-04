// backend/src/tests/businessLogicTest.js
// Business logic vulnerability detection: mass assignment, privilege escalation, workflow bypass
import axios from 'axios';

export async function testBusinessLogic(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    const accounts = options.accounts || null;

    // Test 1: Mass assignment (adding undocumented fields)
    await testMassAssignment(endpoint, findings, timeout);

    // Test 2: Privilege escalation via parameter tampering
    await testPrivilegeEscalation(endpoint, findings, timeout, accounts);

    // Test 3: Negative value injection (price/quantity manipulation)
    await testNegativeValues(endpoint, findings, timeout);

    return findings;
}

async function testMassAssignment(endpoint, findings, timeout) {
    const method = (endpoint.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'PATCH'].includes(method)) return;

    const massAssignPayloads = [
        { isAdmin: true, role: 'admin' },
        { admin: true, is_staff: true },
        { role: 'administrator', permissions: ['*'] },
        { verified: true, email_verified: true },
        { active: true, approved: true, status: 'active' },
        { price: 0, amount: 0, balance: 99999 }
    ];

    for (const payload of massAssignPayloads) {
        try {
            // Merge with original parameters
            const data = { ...(endpoint.parameters || {}), ...payload };
            const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' };

            let resp;
            if (method === 'POST') resp = await axios.post(endpoint.url, data, { timeout, headers, validateStatus: () => true });
            else if (method === 'PUT') resp = await axios.put(endpoint.url, data, { timeout, headers, validateStatus: () => true });
            else resp = await axios.patch(endpoint.url, data, { timeout, headers, validateStatus: () => true });

            if (resp.status >= 200 && resp.status < 300) {
                const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
                // Check if elevated fields were accepted
                const elevated = Object.keys(payload).some(key =>
                    body.toLowerCase().includes(key.toLowerCase()) &&
                    (body.includes('true') || body.includes('admin') || body.includes('active'))
                );

                if (elevated) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: 'Mass Assignment Vulnerability',
                        description: `${method} ${endpoint.url} accepts and processes undocumented fields (${Object.keys(payload).join(', ')}). Attackers can set admin privileges or manipulate account status.`,
                        category: 'BROKEN_ACCESS', severity: 'HIGH', cvss: 8.1,
                        owasp: 'A01:2021', cwe: 'CWE-915',
                        remediation: 'Whitelist allowed fields in API endpoints. Use DTOs or serializer allow-lists. Never bind request data directly to model objects.',
                        detectedBy: 'business-logic-engine', confidence: 70,
                        evidence: [
                            { type: 'PAYLOAD', title: 'Mass Assignment', content: `Injected fields: ${JSON.stringify(payload)}\nEndpoint: ${method} ${endpoint.url}` },
                            { type: 'RESPONSE', title: 'Fields Accepted', content: `Status: ${resp.status}\nBody: ${body.substring(0, 300)}` }
                        ]
                    });
                    return;
                }
            }
        } catch { /* continue */ }
    }
}

async function testPrivilegeEscalation(endpoint, findings, timeout, accounts) {
    if (!accounts) return;
    const method = (endpoint.method || 'GET').toUpperCase();

    // Test accessing admin endpoints with regular user session
    const adminPaths = ['/admin', '/api/admin', '/api/users', '/api/settings',
        '/api/config', '/dashboard/admin', '/management', '/api/roles'];

    try {
        const baseUrl = new URL(endpoint.url);
        for (const path of adminPaths) {
            const adminUrl = `${baseUrl.origin}${path}`;
            try {
                const resp = await axios.get(adminUrl, {
                    timeout, validateStatus: () => true,
                    headers: accounts.secondary?.headers || {}
                });

                if (resp.status === 200) {
                    const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
                    if (body.length > 100) {
                        findings.push({
                            assetId: endpoint.assetId, endpointId: endpoint.id,
                            title: 'Privilege Escalation — Admin Endpoint Accessible',
                            description: `Admin endpoint ${path} is accessible with a regular user session. Missing role-based access control.`,
                            category: 'BROKEN_ACCESS', severity: 'CRITICAL', cvss: 8.8,
                            owasp: 'A01:2021', cwe: 'CWE-269',
                            remediation: 'Implement role-based access control (RBAC). Verify user roles on every admin endpoint.',
                            detectedBy: 'business-logic-engine', confidence: 75,
                            evidence: [
                                { type: 'REQUEST', title: 'Admin Access Test', content: `URL: ${adminUrl}\nUser Role: Regular User` },
                                { type: 'RESPONSE', title: 'Admin Data Returned', content: `Status: ${resp.status}\nBody: ${body.substring(0, 300)}` }
                            ]
                        });
                    }
                }
            } catch { /* continue */ }
        }
    } catch { /* ignore */ }
}

async function testNegativeValues(endpoint, findings, timeout) {
    const method = (endpoint.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'PATCH'].includes(method)) return;

    const params = endpoint.parameters ? Object.keys(endpoint.parameters) : [];
    const numericParams = params.filter(p =>
        /price|amount|quantity|qty|total|count|balance|credits|points|discount/i.test(p)
    );

    for (const param of numericParams) {
        const negativeValues = [-1, -100, -99999, 0, 0.001];
        for (const val of negativeValues) {
            try {
                const data = { ...(endpoint.parameters || {}), [param]: val };
                const resp = await axios.post(endpoint.url, data, {
                    timeout, validateStatus: () => true,
                    headers: { 'Content-Type': 'application/json' }
                });

                if (resp.status >= 200 && resp.status < 300) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: 'Business Logic — Negative Value Accepted',
                        description: `Parameter '${param}' accepts negative value (${val}). This may allow price manipulation, credit fraud, or balance exploitation.`,
                        category: 'BROKEN_ACCESS', severity: 'MEDIUM', cvss: 5.3,
                        owasp: 'A04:2021', cwe: 'CWE-20',
                        remediation: 'Validate numeric inputs server-side. Enforce minimum values. Add business rule validation for financial parameters.',
                        detectedBy: 'business-logic-engine', confidence: 60,
                        evidence: [
                            { type: 'PAYLOAD', title: 'Negative Value', content: `Parameter: ${param}\nValue: ${val}\nEndpoint: ${method} ${endpoint.url}` },
                            { type: 'RESPONSE', title: 'Accepted', content: `Status: ${resp.status}` }
                        ]
                    });
                    break;
                }
            } catch { /* continue */ }
        }
    }
}

export default testBusinessLogic;
