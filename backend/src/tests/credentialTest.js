import axios from 'axios';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let TOP_1000_PASSWORDS = [];
try {
    const wordlistPath = path.resolve(__dirname, '../data/rockyou-top-1000.txt');
    const content = fs.readFileSync(wordlistPath, 'utf8');
    TOP_1000_PASSWORDS = content.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
} catch (err) {
    logger.warn(`[CredentialTest] Failed to load wordlist, falling back to top 10: ${err.message}`);
    TOP_1000_PASSWORDS = [
        '123456', 'password', '12345678', 'qwerty', '12345',
        '123456789', '111111', '1234567', 'dragon', '123123'
    ];
}

// Helper to delay between attempts
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function testCredentials(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    const sprayDelay = options.delay || 500; // ms between attempts
    
    // Auto-detect login endpoints
    const isLoginEndpoint = endpoint.url.match(/\/(login|signin|auth|token|authenticate)/i);
    if (!isLoginEndpoint || !options.aggressive) return findings;

    logger.info(`[CredentialTest] Testing login forms on: ${endpoint.url}`);

    try {
        const testUsernames = ['admin', 'test', 'user', 'administrator', 'root'];
        let lockoutDetected = false;
        let lockoutThreshold = -1;
        let baseResponse = null;
        let authBypassed = false;
        let successfulPassword = null;
        let previousResponseTime = 0;
        
        // 1. Password Spraying & Lockout Detection
        const targetUser = 'admin';
        const maxAttempts = TOP_1000_PASSWORDS.length;
        for (let i = 0; i < maxAttempts; i++) {
            const password = TOP_1000_PASSWORDS[i];
            const startTime = Date.now();
            
            const reqData = { username: targetUser, password: password };
            
            try {
                const resp = await axios.post(endpoint.url, reqData, {
                    timeout,
                    validateStatus: () => true
                });
                
                const responseTime = Date.now() - startTime;
                
                if (i === 0) {
                    baseResponse = { status: resp.status, length: JSON.stringify(resp.data).length };
                } else if (!lockoutDetected) {
                    // Detect lockout policy by checking if status code or response length drastically changes
                    const lenDiff = Math.abs(JSON.stringify(resp.data).length - baseResponse.length);
                    if (resp.status !== baseResponse.status || (lenDiff > 50 && resp.status !== 200)) {
                        lockoutDetected = true;
                        lockoutThreshold = i;
                        logger.info(`[CredentialTest] Lockout detected at attempt ${i}`);
                        break; // Stop spraying to avoid locking out the client
                    }
                }
                
                if (resp.status === 200 && JSON.stringify(resp.data).includes('token')) {
                    authBypassed = true;
                    successfulPassword = password;
                    findings.push({
                        title: 'Default/Weak Credentials Detected',
                        description: `Successfully authenticated as '${targetUser}' using a weak password from the top-10 list.`,
                        category: 'BROKEN_AUTH',
                        severity: 'CRITICAL',
                        cvss: 9.8,
                        detectedBy: 'credential-engine',
                        confidence: 100,
                        evidence: [
                            { type: 'REQUEST', title: 'Payload', content: JSON.stringify(reqData) },
                            { type: 'RESPONSE', title: 'Success Response', content: JSON.stringify(resp.data).substring(0, 500) }
                        ],
                        remediation: 'Enforce strong password policies and disable default accounts.'
                    });
                    break;
                }
            } catch (err) {
                // Ignore network errors during spray
            }
            
            await delay(sprayDelay);
        }
        
        if (!lockoutDetected || lockoutThreshold > 10) {
            findings.push({
                title: 'Missing or Weak Account Lockout Policy',
                description: `The authentication endpoint allows more than 10 consecutive failed login attempts without locking the account. Tested ${lockoutDetected ? lockoutThreshold : maxAttempts} attempts.`,
                category: 'BROKEN_AUTH',
                severity: 'MEDIUM',
                cvss: 5.3,
                detectedBy: 'credential-engine',
                confidence: 90,
                evidence: [{ type: 'LOG', title: 'Threshold Analysis', content: `No lockout triggered after ${lockoutDetected ? lockoutThreshold : maxAttempts} attempts.` }],
                remediation: 'Implement an account lockout policy (e.g., lock for 15 minutes after 5 failed attempts) or deploy rate limiting/CAPTCHA.'
            });
        }

        // 2. Username Enumeration (Timing Attack)
        if (!lockoutDetected) {
            const validUserTime = await measureLoginTime(endpoint.url, 'admin', 'wrongpass123', timeout);
            const invalidUserTime = await measureLoginTime(endpoint.url, 'thisuserdoesnotexist12345', 'wrongpass123', timeout);
            
            const timeDiff = Math.abs(validUserTime - invalidUserTime);
            if (timeDiff > 200) {
                findings.push({
                    title: 'Username Enumeration via Timing Differential',
                    description: `The server responds significantly slower when a valid username is provided (${validUserTime}ms) compared to an invalid username (${invalidUserTime}ms). This allows attackers to harvest valid usernames.`,
                    category: 'INFORMATION_DISCLOSURE',
                    severity: 'LOW',
                    cvss: 3.7,
                    detectedBy: 'credential-engine',
                    confidence: 85,
                    evidence: [{ type: 'LOG', title: 'Timing Data', content: `Valid user: ${validUserTime}ms\nInvalid user: ${invalidUserTime}ms\nDifference: ${timeDiff}ms` }],
                    remediation: 'Ensure authentication functions (e.g., password hashing) take a constant amount of time regardless of whether the username exists.'
                });
            }
        }

        // 3. HaveIBeenPwned Check (k-anonymity)
        // If we found any valid usernames (e.g. if we bypassed auth, or if we extract them from other tests)
        // Here we just test the default 'admin' as a proof of concept for the module
        if (authBypassed && successfulPassword) {
             const sha1 = crypto.createHash('sha1').update(successfulPassword).digest('hex').toUpperCase();
             const prefix = sha1.substring(0, 5);
             const suffix = sha1.substring(5);
             
             try {
                 const hibpResp = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, { timeout: 5000 });
                 if (hibpResp.data.includes(suffix)) {
                     findings.push({
                         title: 'Compromised Password in Use',
                         description: 'The password used for authentication was found in known public data breaches (verified via HaveIBeenPwned k-anonymity API).',
                         category: 'BROKEN_AUTH',
                         severity: 'HIGH',
                         cvss: 7.5,
                         detectedBy: 'credential-engine',
                         confidence: 100,
                         evidence: [{ type: 'LOG', title: 'HIBP Match', content: `Hash prefix ${prefix} matched.` }],
                         remediation: 'Force a password reset and enforce policies checking against breached password databases.'
                     });
                 }
             } catch (hibpErr) {
                 logger.debug(`[CredentialTest] HIBP API error: ${hibpErr.message}`);
             }
        }

    } catch (e) {
        logger.error(`[CredentialTest] Test failed: ${e.message}`);
    }

    return findings;
}

async function measureLoginTime(url, username, password, timeout) {
    const startTime = Date.now();
    try {
        await axios.post(url, { username, password }, { timeout, validateStatus: () => true });
    } catch (e) {}
    return Date.now() - startTime;
}
