import axios from 'axios';
import { logger } from '../utils/logger.js';

// Random IP generator for evasion
function getRandomIP() {
    return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/**
 * Returns a set of headers designed to bypass IP-based rate limiting
 * by spoofing the originating IP address.
 */
export function getEvasionHeaders() {
    const fakeIp = getRandomIP();
    return {
        'X-Forwarded-For': fakeIp,
        'X-Originating-IP': fakeIp,
        'X-Remote-IP': fakeIp,
        'X-Remote-Addr': fakeIp,
        'X-Client-IP': fakeIp,
        'X-Host': fakeIp,
        'X-Forwarded-Host': fakeIp,
        'True-Client-IP': fakeIp,
        'CF-Connecting-IP': fakeIp,
        'Fastly-Client-IP': fakeIp
    };
}

/**
 * Tests if the endpoint is vulnerable to rate limit bypass via IP spoofing headers.
 */
export async function testRateLimitEvasion(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;

    // This test involves sending many requests, we only do it if explicitly requested
    if (!options.aggressive) return findings;

    logger.info(`[HeaderEvasion] Testing rate limit bypass on: ${endpoint.url}`);

    try {
        // Step 1: Baseline - trigger rate limit without evasion headers
        let baselineHit = false;
        let rateLimitCode = 429;
        
        for (let i = 0; i < 50; i++) {
            const resp = await axios.get(endpoint.url, {
                headers: endpoint.headers,
                timeout,
                validateStatus: () => true
            });
            if (resp.status === 429 || resp.status === 403 || resp.status === 503) {
                baselineHit = true;
                rateLimitCode = resp.status;
                break;
            }
        }

        if (!baselineHit) {
            // Target does not appear to have a strict rate limit, or we didn't hit it
            return findings;
        }

        // Step 2: Test Bypass - send requests WITH evasion headers
        let bypassSuccessCount = 0;
        for (let i = 0; i < 20; i++) {
            const evasionHeaders = { ...endpoint.headers, ...getEvasionHeaders() };
            const resp = await axios.get(endpoint.url, {
                headers: evasionHeaders,
                timeout,
                validateStatus: () => true
            });
            
            if (resp.status === 200 || resp.status === 201) {
                bypassSuccessCount++;
            }
        }

        // If we successfully bypassed the rate limit that previously blocked us
        if (bypassSuccessCount > 10) {
            findings.push({
                assetId: endpoint.assetId,
                endpointId: endpoint.id,
                title: 'Rate Limit Evasion via Header Spoofing',
                description: `The endpoint's rate limiting mechanism can be completely bypassed by spoofing HTTP headers (e.g., X-Forwarded-For).`,
                category: 'SECURITY_MISCONFIG',
                severity: 'MEDIUM',
                cvss: 5.3,
                detectedBy: 'evasion-engine',
                confidence: 90,
                evidence: [
                    { type: 'INFO', title: 'Impact', content: `Attackers can bypass API rate limits, enabling brute-force attacks, credential stuffing, and application-layer DoS.` },
                    { type: 'REQUEST', title: 'Bypass Headers', content: `Injected headers:\nX-Forwarded-For: <random_ip>\nTrue-Client-IP: <random_ip>` },
                    { type: 'RESPONSE', title: 'Bypass Success', content: `Sent 20 requests after hitting rate limit (${rateLimitCode}). ${bypassSuccessCount} succeeded.` }
                ]
            });
        }
    } catch (e) {
        logger.error(`[HeaderEvasion] Test failed: ${e.message}`);
    }

    return findings;
}
