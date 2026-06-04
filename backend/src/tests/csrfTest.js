// backend/src/tests/csrfTest.js
// Cross-Site Request Forgery detection
import axios from 'axios';

const CSRF_TOKEN_NAMES = ['csrf', 'xsrf', '_token', 'csrf_token', 'csrfmiddlewaretoken',
    'authenticity_token', '__RequestVerificationToken', 'antiforgery', '_csrf',
    'X-CSRF-Token', 'X-XSRF-Token'];

export async function testCSRF(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;

    // Only test state-changing methods
    const method = (endpoint.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return findings;

    try {
        // Step 1: Make a normal request to check for CSRF tokens
        const pageResp = await axios.get(endpoint.url.replace(/\/api\/.*/, '/'), {
            timeout, validateStatus: () => true
        });

        const cookies = pageResp.headers['set-cookie'] || [];
        const hasSameSite = cookies.some(c => /samesite=(strict|lax)/i.test(c));
        const html = typeof pageResp.data === 'string' ? pageResp.data : '';
        const hasTokenInForm = CSRF_TOKEN_NAMES.some(name =>
            html.toLowerCase().includes(name.toLowerCase())
        );

        // Step 2: Try the state-changing request without any CSRF token
        let requestConfig = {
            timeout, validateStatus: () => true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0'
            }
        };

        let resp;
        const testData = 'test=csrfcheck&action=test';

        if (method === 'POST') {
            resp = await axios.post(endpoint.url, testData, requestConfig);
        } else if (method === 'PUT') {
            resp = await axios.put(endpoint.url, testData, requestConfig);
        } else if (method === 'DELETE') {
            resp = await axios.delete(endpoint.url, requestConfig);
        } else {
            resp = await axios.patch(endpoint.url, testData, requestConfig);
        }

        // Step 3: Check if request succeeded without CSRF token
        const accepted = resp.status >= 200 && resp.status < 400;

        if (accepted && !hasSameSite) {
            const severity = hasTokenInForm ? 'MEDIUM' : 'HIGH';
            findings.push({
                assetId: endpoint.assetId, endpointId: endpoint.id,
                title: 'Cross-Site Request Forgery (CSRF)',
                description: `${method} ${endpoint.url} accepts state-changing requests without CSRF token validation.${!hasSameSite ? ' SameSite cookie attribute is not set.' : ''}`,
                category: 'BROKEN_AUTH', severity, cvss: severity === 'HIGH' ? 6.5 : 4.3,
                owasp: 'A01:2021', cwe: 'CWE-352',
                remediation: 'Implement anti-CSRF tokens (synchronizer token pattern). Set SameSite=Strict on session cookies. Verify Origin/Referer headers.',
                references: ['https://owasp.org/www-community/attacks/csrf'],
                detectedBy: 'csrf-engine', confidence: accepted ? 80 : 50,
                evidence: [
                    { type: 'REQUEST', title: 'CSRF Test', content: `Method: ${method}\nURL: ${endpoint.url}\nCSRF Token Sent: NO\nSameSite Cookie: ${hasSameSite ? 'YES' : 'NO'}` },
                    { type: 'RESPONSE', title: 'Request Accepted', content: `Status: ${resp.status}\nRequest accepted without CSRF token.${hasTokenInForm ? '\nNote: Token found in HTML form but not enforced server-side.' : ''}` }
                ]
            });
        }

        // Step 4: If token exists, test if it's actually validated
        if (hasTokenInForm && !accepted) {
            // Try with an invalid/modified token
            const modifiedData = 'test=csrfcheck&csrf_token=INVALID_TOKEN&_token=INVALID';
            try {
                let modResp;
                if (method === 'POST') {
                    modResp = await axios.post(endpoint.url, modifiedData, requestConfig);
                } else {
                    modResp = await axios({ method: method.toLowerCase(), url: endpoint.url, data: modifiedData, ...requestConfig });
                }

                if (modResp.status >= 200 && modResp.status < 400) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: 'CSRF Token Not Validated',
                        description: `${method} ${endpoint.url} has a CSRF token field but accepts requests with an invalid token value.`,
                        category: 'BROKEN_AUTH', severity: 'HIGH', cvss: 6.5,
                        owasp: 'A01:2021', cwe: 'CWE-352',
                        remediation: 'Validate CSRF tokens server-side on every state-changing request.',
                        detectedBy: 'csrf-engine', confidence: 85,
                        evidence: [
                            { type: 'REQUEST', title: 'Invalid Token Test', content: `Sent invalid CSRF token: INVALID_TOKEN\nStatus: ${modResp.status} — accepted` },
                            { type: 'RESPONSE', title: 'Token Bypass', content: 'Server accepted request with invalid CSRF token, indicating token is not properly validated.' }
                        ]
                    });
                }
            } catch { /* server rejected — good */ }
        }
    } catch (err) {
        console.warn(`CSRF test error for ${endpoint.url}: ${err.message}`);
    }
    return findings;
}

export default testCSRF;
