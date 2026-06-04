// backend/src/tests/openRedirect.js
import axios from 'axios';
import { captureRedirect } from '../utils/screenshotCapture.js';

const REDIRECT_PARAMS = ['url', 'redirect', 'next', 'return', 'returnTo', 'redir', 'target', 'dest', 'destination', 'continue', 'view', 'to', 'out', 'go'];
const EXTERNAL_DOMAINS = ['evil.com', 'attacker.com', 'malicious.site'];

export async function testOpenRedirect(endpoint) {
    const findings = [];
    const url = new URL(endpoint.url);

    for (const param of REDIRECT_PARAMS) {
        for (const domain of EXTERNAL_DOMAINS) {
            const testUrls = [
                `${endpoint.url}${url.search ? '&' : '?'}${param}=https://${domain}`,
                `${endpoint.url}${url.search ? '&' : '?'}${param}=//${domain}`,
                `${endpoint.url}${url.search ? '&' : '?'}${param}=http://${domain}/path`
            ];

            for (const testUrl of testUrls) {
                try {
                    const response = await axios.get(testUrl, {
                        maxRedirects: 0,
                        validateStatus: (status) => status >= 200 && status < 400,
                        timeout: 5000
                    });

                    const location = response.headers.location || response.headers['Location'];
                    if (location && (location.includes(domain) || location.startsWith('//' + domain))) {
                        const findingId = `open-redirect-${param}-${domain.replace(/\./g, '')}`;

                        // Capture visual evidence of the redirect
                        let screenshot = null;
                        try {
                            screenshot = await captureRedirect(testUrl, location, response.status, param, findingId);
                        } catch (e) {
                            console.warn(`Screenshot capture failed for ${findingId}:`, e.message);
                        }

                        const evidence = [{
                            type: 'RESPONSE',
                            title: 'Redirect Response',
                            content: `URL: ${testUrl}\nStatus: ${response.status}\nLocation: ${location}`
                        }];
                        if (screenshot) {
                            evidence.push({
                                type: 'SCREENSHOT',
                                title: `Open Redirect Visual Proof — ${findingId}`,
                                content: screenshot.base64
                            });
                        }

                        findings.push({
                            type: 'OPEN_REDIRECT',
                            severity: 'MEDIUM',
                            title: `Open Redirect via ${param} parameter`,
                            description: `The endpoint redirects to external domains without validation`,
                            evidence,
                            exploit: {
                                screenshots: screenshot ? [screenshot] : [],
                                url: testUrl,
                                parameter: param,
                                redirectTo: location,
                                statusCode: response.status
                            },
                            cvss: 5.3,
                            remediation: `Validate redirect URLs against a whitelist of allowed domains. Use relative paths or validate the domain before redirecting.`
                        });
                        break; // Found vulnerability, no need to test more payloads for this param
                    }
                } catch (error) {
                    // Ignore errors (timeouts, connection refused, etc.)
                }
            }
        }
    }

    return findings;
}
