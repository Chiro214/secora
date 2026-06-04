// backend/src/tests/idorTest.js
// Insecure Direct Object Reference (IDOR) detection
import axios from 'axios';

const ID_PATTERNS = [
    /\/(\d+)(?:\/|$|\?)/,                    // numeric: /users/123
    /\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$|\?)/i, // UUID
    /[?&]id=(\d+)/i,                          // ?id=123
    /[?&]user_?id=(\d+)/i,                    // ?userId=123
    /[?&]account_?id=(\d+)/i                  // ?accountId=123
];

export async function testIDOR(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    const accounts = options.accounts || null; // { primary: { headers }, secondary: { headers } }

    if (!accounts) return findings; // IDOR requires multi-account testing

    const url = endpoint.url;

    // Test API Versioning IDOR
    const versionMatch = url.match(/\/v(\d+)\//i);
    if (versionMatch) {
        const originalVersion = versionMatch[0]; // e.g., /v2/
        const versionsToTest = ['/v1/', '/v2/', '/v3/', '/beta/', '/v1.0/', '/v2.0/'];
        
        for (const v of versionsToTest) {
            if (v.toLowerCase() === originalVersion.toLowerCase()) continue;
            
            const testUrl = url.replace(originalVersion, v);
            try {
                const resp = await axios.get(testUrl, {
                    timeout, validateStatus: () => true,
                    headers: { ...accounts.secondary.headers } // Assuming secondary doesn't have access to original
                });

                if (resp.status >= 200 && resp.status < 300) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: 'API Versioning Authorization Bypass',
                        description: `The endpoint ${url} enforcing authorization can be bypassed by accessing an older/different API version: ${testUrl}.`,
                        category: 'BROKEN_ACCESS', severity: 'HIGH', cvss: 7.5,
                        owasp: 'A01:2021', cwe: 'CWE-639',
                        remediation: 'Ensure consistent authorization policies are enforced across all active API versions. Deprecate and remove unsupported versions.',
                        detectedBy: 'idor-engine', confidence: 90,
                        evidence: [
                            { type: 'REQUEST', title: 'Version Substitution', content: `Original: ${url}\nTested: ${testUrl}\nBypassed via version: ${v}` },
                            { type: 'RESPONSE', title: 'Valid Response', content: `Status: ${resp.status}\nBody: ${JSON.stringify(resp.data).substring(0, 300)}` }
                        ]
                    });
                }
            } catch { /* continue */ }
        }
    }

    // Find ID parameters in URL
    for (const pattern of ID_PATTERNS) {
        const match = url.match(pattern);
        if (!match) continue;

        const originalId = match[1];
        const isNumeric = /^\d+$/.test(originalId);

        // Test horizontal IDOR: access with different user's session
        try {
            // Request with primary account's auth (should succeed)
            const primaryResp = await axios.get(url, {
                timeout, validateStatus: () => true,
                headers: { ...accounts.primary.headers }
            });

            if (primaryResp.status !== 200) continue;

            // Same request with secondary account's auth (should fail for private resources)
            const secondaryResp = await axios.get(url, {
                timeout, validateStatus: () => true,
                headers: { ...accounts.secondary.headers }
            });

            // IDOR confirmed if secondary can access primary's resource
            if (secondaryResp.status === 200) {
                const primaryBody = JSON.stringify(primaryResp.data);
                const secondaryBody = JSON.stringify(secondaryResp.data);

                // Check if responses contain similar data (not just generic pages)
                if (secondaryBody.length > 50 && similarity(primaryBody, secondaryBody) > 0.5) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: 'Insecure Direct Object Reference (IDOR)',
                        description: `Endpoint ${url} allows user B to access user A's data by using the same object ID. No authorization check on resource ownership.`,
                        category: 'BROKEN_ACCESS', severity: 'HIGH', cvss: 7.5,
                        owasp: 'A01:2021', cwe: 'CWE-639',
                        remediation: 'Implement object-level authorization. Verify the authenticated user owns the requested resource before returning data.',
                        references: ['https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/'],
                        detectedBy: 'idor-engine', confidence: 85,
                        evidence: [
                            { type: 'REQUEST', title: 'Cross-Account Access', content: `URL: ${url}\nOriginal ID: ${originalId}\nUser A got HTTP ${primaryResp.status}\nUser B got HTTP ${secondaryResp.status}` },
                            { type: 'RESPONSE', title: 'Data Leakage', content: `User B accessed User A's resource.\nResponse similarity: ${(similarity(primaryBody, secondaryBody) * 100).toFixed(0)}%\nData preview: ${secondaryBody.substring(0, 300)}` }
                        ]
                    });
                }
            }
        } catch { /* continue */ }

        // Test vertical IDOR: increment/decrement ID
        if (isNumeric) {
            const testIds = [parseInt(originalId) - 1, parseInt(originalId) + 1, 1, 0];
            for (const testId of testIds) {
                if (testId < 0 || testId === parseInt(originalId)) continue;
                try {
                    const testUrl = url.replace(originalId, String(testId));
                    const resp = await axios.get(testUrl, {
                        timeout, validateStatus: () => true,
                        headers: { ...accounts.primary.headers }
                    });

                    if (resp.status === 200 && resp.data && JSON.stringify(resp.data).length > 50) {
                        findings.push({
                            assetId: endpoint.assetId, endpointId: endpoint.id,
                            title: 'IDOR — Sequential ID Enumeration',
                            description: `Changing ID from ${originalId} to ${testId} returns valid data. Predictable IDs enable enumeration of all records.`,
                            category: 'BROKEN_ACCESS', severity: 'HIGH', cvss: 7.5,
                            owasp: 'A01:2021', cwe: 'CWE-639',
                            remediation: 'Use UUIDs instead of sequential IDs. Implement authorization checks.',
                            detectedBy: 'idor-engine', confidence: 75,
                            evidence: [
                                { type: 'REQUEST', title: 'ID Enumeration', content: `Original: ${url}\nModified: ${testUrl}\nID changed: ${originalId} → ${testId}` },
                                { type: 'RESPONSE', title: 'Valid Response', content: `Status: ${resp.status}\nBody: ${JSON.stringify(resp.data).substring(0, 300)}` }
                            ]
                        });
                        break;
                    }
                } catch { /* continue */ }
            }
        }
    }
    return findings;
}

function similarity(a, b) {
    if (!a || !b) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    const costs = [];
    for (let i = 0; i <= shorter.length; i++) costs[i] = i;
    for (let i = 1; i <= longer.length; i++) {
        let lastVal = i;
        for (let j = 1; j <= shorter.length; j++) {
            const newVal = shorter[j - 1] === longer[i - 1] ? costs[j - 1] : Math.min(costs[j - 1] + 1, Math.min(lastVal + 1, costs[j] + 1));
            costs[j - 1] = lastVal;
            lastVal = newVal;
        }
        costs[shorter.length] = lastVal;
    }
    return (longer.length - costs[shorter.length]) / longer.length;
}

export default testIDOR;
