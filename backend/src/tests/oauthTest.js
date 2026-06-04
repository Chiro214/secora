import axios from 'axios';
import { logger } from '../utils/logger.js';

export async function testOAuth(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    // Auto-detect OAuth authorization endpoints
    const isOAuth = endpoint.url.match(/\/(oauth\/authorize|oauth2\/v2\.0\/authorize|auth\?|login\/oauth\/authorize)/i) || 
                    endpoint.url.includes('response_type=code') || 
                    endpoint.url.includes('client_id=');
                    
    if (!isOAuth) return findings;

    logger.info(`[OAuthTest] Testing OAuth flow on: ${endpoint.url}`);

    try {
        const url = new URL(endpoint.url);
        
        // 1. Missing or Static State Parameter (CSRF)
        if (!url.searchParams.has('state')) {
            findings.push({
                title: 'OAuth 2.0 State Parameter Missing (CSRF)',
                description: `The OAuth authorization request does not include a 'state' parameter. This makes the OAuth flow vulnerable to Cross-Site Request Forgery (CSRF), allowing an attacker to link their account to the victim's session.`,
                category: 'BROKEN_AUTH',
                severity: 'HIGH',
                cvss: 7.4,
                detectedBy: 'oauth-engine',
                confidence: 95,
                evidence: [{ type: 'REQUEST', title: 'Authorization URL', content: endpoint.url }],
                remediation: 'Always include a strong, unguessable, and session-bound `state` parameter in authorization requests and verify it upon the callback.'
            });
        }

        // 2. Redirect URI Manipulation & Open Redirect Chaining
        if (url.searchParams.has('redirect_uri')) {
            const originalUri = url.searchParams.get('redirect_uri');
            
            // Generate payloads
            const payloads = [
                `${originalUri}/../attacker-path`,
                `${originalUri}.attacker.com`,
                `https://attacker.com`,
                `${originalUri}%0D%0ALocation: https://attacker.com` // CRLF test
            ];

            for (const payload of payloads) {
                const testUrl = new URL(endpoint.url);
                testUrl.searchParams.set('redirect_uri', payload);
                
                try {
                    const resp = await axios.get(testUrl.toString(), {
                        timeout,
                        maxRedirects: 0, // Stop at the first redirect to check the Location header
                        validateStatus: () => true
                    });

                    // Check if the server accepted the manipulated redirect URI and issued a 302
                    if (resp.status >= 300 && resp.status < 400 && resp.headers['location']) {
                        const location = resp.headers['location'];
                        if (location.includes('attacker.com') || location.includes('attacker-path')) {
                            findings.push({
                                title: 'OAuth Redirect URI Validation Bypass',
                                description: `The OAuth authorization server does not strictly validate the 'redirect_uri' parameter. An attacker can manipulate it to steal authorization codes or access tokens by redirecting the flow to an attacker-controlled domain.`,
                                category: 'BROKEN_AUTH',
                                severity: 'CRITICAL',
                                cvss: 9.1,
                                detectedBy: 'oauth-engine',
                                confidence: 100,
                                evidence: [
                                    { type: 'REQUEST', title: 'Manipulated URL', content: testUrl.toString() },
                                    { type: 'RESPONSE', title: 'Location Header', content: location }
                                ],
                                remediation: 'Implement strict exact-match validation for `redirect_uri` against a pre-registered list of allowed URIs.'
                            });
                            break; // Stop testing other URIs if one succeeds
                        }
                    }
                } catch (e) {}
            }
        }
        
        // Note: Authorization Code Reuse and Token Leakage via Referer require completing a full OAuth flow 
        // with valid credentials to obtain a code/token, which is difficult in a generic automated scan without 
        // provided test credentials. We log this limitation.
        logger.debug('[OAuthTest] Code reuse and Referer leakage checks require full authenticated flow context (skipped).');

    } catch (e) {
        logger.error(`[OAuthTest] Test failed: ${e.message}`);
    }

    return findings;
}
