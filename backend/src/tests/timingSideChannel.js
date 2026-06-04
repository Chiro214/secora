import { logger } from '../utils/logger.js';
import puppeteer from 'puppeteer';

// Helper to calculate standard deviation
function getStandardDeviation(array) {
    const n = array.length;
    const mean = array.reduce((a, b) => a + b) / n;
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}

// Helper to calculate median
function getMedian(array) {
    const sorted = [...array].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function testTimingSideChannel(endpoint, options = {}) {
    const findings = [];
    // Only run if aggressive is true, as this test is noisy and slow
    if (!options.aggressive) return findings;

    // Detect login endpoints
    const isLoginEndpoint = endpoint.url.match(/\/(login|signin|auth|token|authenticate)/i);
    if (!isLoginEndpoint) return findings;

    logger.info(`[TimingSideChannel] Running aggressive pixel-perfect timing analysis on: ${endpoint.url}`);

    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });

        // Test parameters
        const validUsername = 'admin'; // Assume admin might exist
        const invalidUsername = `user_${Math.random().toString(36).substring(7)}`;
        const dummyPassword = 'WrongPassword123!';
        const iterations = 100; // Need statistical significance

        const validTimes = [];
        const invalidTimes = [];

        // Interleave requests to reduce network jitter bias
        for (let i = 0; i < iterations; i++) {
            // Test Valid Username (or likely valid)
            let start = process.hrtime.bigint();
            let page = await browser.newPage();
            // We use page.goto with a POST request simulation or intercept request
            // For simplicity in this POC, we use page.evaluate to run fetch natively in the browser context
            // which gives us DOM/Browser-level timing
            let time = await page.evaluate(async (url, user, pass) => {
                const t0 = performance.now();
                try {
                    await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: user, password: pass })
                    });
                } catch(e) {}
                return performance.now() - t0;
            }, endpoint.url, validUsername, dummyPassword);
            
            validTimes.push(time);
            await page.close();

            // Small delay to prevent complete DoS
            await new Promise(r => setTimeout(r, 50));

            // Test Invalid Username
            page = await browser.newPage();
            time = await page.evaluate(async (url, user, pass) => {
                const t0 = performance.now();
                try {
                    await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: user, password: pass })
                    });
                } catch(e) {}
                return performance.now() - t0;
            }, endpoint.url, invalidUsername, dummyPassword);
            
            invalidTimes.push(time);
            await page.close();
            
            await new Promise(r => setTimeout(r, 50));
        }

        // Statistical Analysis
        const validMedian = getMedian(validTimes);
        const invalidMedian = getMedian(invalidTimes);
        const validStdDev = getStandardDeviation(validTimes);
        const invalidStdDev = getStandardDeviation(invalidTimes);

        const diff = Math.abs(validMedian - invalidMedian);

        logger.debug(`[TimingSideChannel] Valid median: ${validMedian.toFixed(2)}ms (sd: ${validStdDev.toFixed(2)}). Invalid median: ${invalidMedian.toFixed(2)}ms (sd: ${invalidStdDev.toFixed(2)}). Diff: ${diff.toFixed(2)}ms`);

        // If the difference is greater than 3ms AND the difference is statistically significant 
        // (e.g., diff is larger than the standard deviation of the measurements)
        if (diff > 3.0 && diff > (validStdDev + invalidStdDev) / 2) {
             findings.push({
                assetId: endpoint.assetId,
                endpointId: endpoint.id,
                title: 'Browser-Based Timing Side Channel (Username Enumeration)',
                description: `The authentication endpoint is vulnerable to advanced Timing Side Channels. By taking ${iterations} precise measurements using a headless browser, we detected a statistically significant median timing difference of ${diff.toFixed(2)}ms between valid and invalid usernames. This allows an attacker to enumerate valid accounts even if the server returns identical HTTP responses and status codes.`,
                category: 'INFORMATION_DISCLOSURE',
                severity: 'MEDIUM',
                cvss: 5.3,
                detectedBy: 'timing-engine',
                confidence: 90,
                evidence: [
                    { type: 'LOG', title: 'Statistical Analysis', content: `Iterations: ${iterations} per user\nValid User Median: ${validMedian.toFixed(2)}ms (SD: ${validStdDev.toFixed(2)})\nInvalid User Median: ${invalidMedian.toFixed(2)}ms (SD: ${invalidStdDev.toFixed(2)})\nDifference: ${diff.toFixed(2)}ms` }
                ],
                remediation: 'Ensure authentication functions (especially password hashing routines like bcrypt/Argon2) execute in constant time regardless of whether the user exists. If a user is not found, compute a dummy hash to normalize the response time.'
            });
        }

    } catch (e) {
        logger.error(`[TimingSideChannel] Test failed: ${e.message}`);
    } finally {
        if (browser) await browser.close().catch(()=> { });
    }

    return findings;
}
