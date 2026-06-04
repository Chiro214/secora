import { logger } from '../utils/logger.js';
function buildFinding(endpoint, point, payload, title, category, severity, cvss, confidence, evidence) {
    return {
        assetId: endpoint.assetId,
        endpointId: endpoint.id,
        title,
        description: `Detected ${title} affecting ${point.name}.`,
        category,
        severity,
        cvss,
        detectedBy: 'session-analyzer',
        confidence,
        evidence
    };
}

// Shannon Entropy calculation for token randomness
function calculateEntropy(str) {
    const len = str.length;
    const frequencies = Array.from(str).reduce((freq, c) => (freq[c] = (freq[c] || 0) + 1, freq), {});
    return Object.values(frequencies)
        .reduce((sum, f) => sum - (f / len) * Math.log2(f / len), 0);
}

export async function testSessionSecurity(endpoint, options = {}) {
    const findings = [];
    
    // Check Cookies
    if (!endpoint.headers || !endpoint.headers['Set-Cookie']) return findings;

    const setCookies = Array.isArray(endpoint.headers['Set-Cookie']) 
        ? endpoint.headers['Set-Cookie'] 
        : [endpoint.headers['Set-Cookie']];

    for (const cookieStr of setCookies) {
        const parts = cookieStr.split(';').map(p => p.trim());
        const [cookieNameValue, ...attributes] = parts;
        const [name, value] = cookieNameValue.split('=');

        // Ignore generic tracking cookies, focus on likely session IDs
        if (!name.toLowerCase().includes('session') && !name.toLowerCase().includes('id') && !name.toLowerCase().includes('token')) {
            continue;
        }

        logger.info(`[Session Test] Analyzing session cookie: ${name}`);

        const attrsLower = attributes.map(a => a.toLowerCase());
        const missingFlags = [];

        if (!attrsLower.includes('secure')) missingFlags.push('Secure');
        if (!attrsLower.includes('httponly')) missingFlags.push('HttpOnly');
        if (!attrsLower.some(a => a.startsWith('samesite'))) missingFlags.push('SameSite');

        // 1. Cookie Security Flags
        if (missingFlags.length > 0) {
            findings.push(buildFinding(endpoint, { type: 'header', name: 'Set-Cookie' }, cookieStr, 'Insecure Session Cookie', 'Configuration', 'MEDIUM', 5.3, 100, [
                { type: 'LOG', title: 'Missing Security Flags', content: `Cookie: ${name}\nMissing Flags: ${missingFlags.join(', ')}` },
                { type: 'LOG', title: 'Impact', content: `Missing 'Secure' allows interception over HTTP. Missing 'HttpOnly' allows XSS theft. Missing 'SameSite' enables CSRF attacks.` }
            ]));
        }

        // 2. Entropy / Randomness Analysis
        if (value && value.length > 0) {
            const entropy = calculateEntropy(value);
            // Typically, a good session ID (e.g. 32 char hex or UUID) has an entropy > 3.5
            // If it's very short or low entropy, it's vulnerable to brute force or prediction
            if (entropy < 2.5 || value.length < 16) {
                findings.push(buildFinding(endpoint, { type: 'cookie', name }, value, 'Weak Session ID Entropy', 'Cryptography', 'HIGH', 7.5, 95, [
                    { type: 'LOG', title: 'Low Entropy Detected', content: `Session ID: ${value}\nLength: ${value.length}\nCalculated Entropy: ${entropy.toFixed(2)} bits/char` },
                    { type: 'LOG', title: 'Impact', content: `The session ID appears to be predictable or too short, making it vulnerable to brute-force or sequencing attacks.` }
                ]));
            }
        }
    }

    return findings;
}
