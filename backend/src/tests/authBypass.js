// backend/src/tests/authBypass.js
import axios from 'axios';
import { captureResponseComparison } from '../utils/screenshotCapture.js';

const AUTH_PATHS = ['/admin', '/api/admin', '/dashboard', '/api/users', '/api/config', '/management', '/console'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const BYPASS_HEADERS = [
    { 'X-Original-URL': '/admin' },
    { 'X-Rewrite-URL': '/admin' },
    { 'X-Forwarded-For': '127.0.0.1' },
    { 'X-Forwarded-Host': 'localhost' },
    { 'X-Custom-IP-Authorization': '127.0.0.1' },
    { 'X-Originating-IP': '127.0.0.1' }
];

export async function testAuthBypass(endpoint) {
    const findings = [];
    const baseUrl = new URL(endpoint.url).origin;

    // Pre-check: filter out paths that return 404 (don't exist on this target)
    const validPaths = [];
    for (const path of AUTH_PATHS) {
        try {
            const checkResp = await axios.get(`${baseUrl}${path}`, {
                validateStatus: () => true,
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (checkResp.status !== 404) {
                validPaths.push(path);
            }
        } catch {
            // Network error — skip this path
        }
    }

    if (validPaths.length === 0) return findings;

    // Test 1: Check for inconsistent auth on different HTTP methods
    for (const path of validPaths) {
        const testUrl = `${baseUrl}${path}`;
        const responses = {};

        for (const method of HTTP_METHODS) {
            try {
                const response = await axios({
                    method,
                    url: testUrl,
                    validateStatus: () => true,
                    timeout: 5000
                });
                responses[method] = response.status;
            } catch (error) {
                responses[method] = 'ERROR';
            }
        }

        // Check for inconsistencies (e.g., GET returns 401 but POST returns 200)
        const statuses = Object.values(responses).filter(s => s !== 'ERROR');
        const hasAuth = statuses.some(s => s === 401 || s === 403);
        const hasSuccess = statuses.some(s => s >= 200 && s < 300);

        if (hasAuth && hasSuccess) {
            const blockedMethod = Object.entries(responses).find(([, s]) => s === 401 || s === 403);
            const bypassMethod = Object.entries(responses).find(([, s]) => s >= 200 && s < 300);
            const findingId = `auth-bypass-method-${path.replace(/[^a-z0-9]/gi, '')}`;

            // Capture visual evidence
            let screenshot = null;
            try {
                screenshot = await captureResponseComparison(
                    { url: testUrl, method: blockedMethod?.[0] || 'GET', status: blockedMethod?.[1] || 401, headers: {} },
                    { url: testUrl, method: bypassMethod?.[0] || 'POST', status: bypassMethod?.[1] || 200, headers: {} },
                    findingId
                );
            } catch (e) {
                console.warn(`Screenshot capture failed for ${findingId}:`, e.message);
            }

            const evidence = [{
                type: 'REQUEST',
                title: 'HTTP Method Responses',
                content: JSON.stringify(responses, null, 2)
            }];
            if (screenshot) {
                evidence.push({
                    type: 'SCREENSHOT',
                    title: `Auth Bypass Visual Proof — ${findingId}`,
                    content: screenshot.base64
                });
            }

            findings.push({
                type: 'AUTH_BYPASS',
                severity: 'HIGH',
                title: `Inconsistent Authentication on ${path}`,
                description: `Different HTTP methods return different authentication responses, indicating potential bypass`,
                evidence,
                exploit: {
                    screenshots: screenshot ? [screenshot] : []
                },
                cvss: 7.5,
                remediation: `Ensure consistent authentication checks across all HTTP methods. Implement proper authorization middleware.`
            });
        }
    }

    // Test 2: Header-based bypass attempts
    for (const path of validPaths) {
        const testUrl = `${baseUrl}${path}`;

        for (const headers of BYPASS_HEADERS) {
            try {
                const response = await axios.get(testUrl, {
                    headers,
                    validateStatus: () => true,
                    timeout: 5000
                });

                // If we get 200 with bypass headers but normally get 401/403
                if (response.status >= 200 && response.status < 300) {
                    const normalResponse = await axios.get(testUrl, {
                        validateStatus: () => true,
                        timeout: 5000
                    });

                    if (normalResponse.status === 401 || normalResponse.status === 403) {
                        const findingId = `auth-bypass-header-${path.replace(/[^a-z0-9]/gi, '')}-${Object.keys(headers)[0]}`;

                        // Capture visual evidence
                        let screenshot = null;
                        try {
                            screenshot = await captureResponseComparison(
                                { url: testUrl, method: 'GET', status: normalResponse.status, headers: {}, body: String(normalResponse.data).substring(0, 500) },
                                { url: testUrl, method: 'GET', status: response.status, headers, body: String(response.data).substring(0, 500) },
                                findingId
                            );
                        } catch (e) {
                            console.warn(`Screenshot capture failed for ${findingId}:`, e.message);
                        }

                        const evidence = [{
                            type: 'REQUEST',
                            title: 'Bypass Headers Used',
                            content: JSON.stringify(headers, null, 2)
                        }];
                        if (screenshot) {
                            evidence.push({
                                type: 'SCREENSHOT',
                                title: `Header Bypass Visual Proof — ${findingId}`,
                                content: screenshot.base64
                            });
                        }

                        findings.push({
                            type: 'AUTH_BYPASS',
                            severity: 'CRITICAL',
                            title: `Authentication Bypass via HTTP Headers on ${path}`,
                            description: `Protected endpoint can be accessed by manipulating HTTP headers`,
                            evidence,
                            exploit: {
                                screenshots: screenshot ? [screenshot] : [],
                                url: testUrl,
                                bypassHeaders: headers,
                                normalStatus: normalResponse.status,
                                bypassStatus: response.status
                            },
                            cvss: 9.1,
                            remediation: `Do not trust client-provided headers for authentication. Implement proper session-based or token-based authentication.`
                        });
                    }
                }
            } catch (error) {
                // Ignore errors
            }
        }
    }

    // Test 3: Path traversal in auth checks
    for (const path of validPaths) {
        const traversalPaths = [
            `${path}/..`,
            `${path}/../`,
            `${path}/.`,
            `${path}//`,
            `${path}%2f`,
            `${path}%252f`
        ];

        for (const testPath of traversalPaths) {
            try {
                const testUrl = `${baseUrl}${testPath}`;
                const response = await axios.get(testUrl, {
                    validateStatus: () => true,
                    timeout: 5000
                });

                if (response.status >= 200 && response.status < 300) {
                    findings.push({
                        type: 'AUTH_BYPASS',
                        severity: 'HIGH',
                        title: `Path Traversal Authentication Bypass`,
                        description: `Protected endpoint accessible via path manipulation`,
                        evidence: [{
                            type: 'REQUEST',
                            title: 'Path Traversal Details',
                            content: `Original: ${path}\nBypass: ${testPath}\nStatus: ${response.status}`
                        }],
                        exploit: {
                            url: testUrl,
                            originalPath: path,
                            bypassPath: testPath,
                            statusCode: response.status
                        },
                        cvss: 8.1,
                        remediation: `Normalize and validate all URL paths before authentication checks. Use canonical path resolution.`
                    });
                }
            } catch (error) {
                // Ignore errors
            }
        }
    }

    return findings;
}
