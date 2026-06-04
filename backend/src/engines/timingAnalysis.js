import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Blind Timing Analysis Engine
 * Detects vulnerabilities by injecting time-delay payloads and measuring the response delta.
 * Works even if the WAF strips error messages or returns generic 200 responses.
 */

export async function detectBlindTiming(endpoint, point, payloads, timeout = 10000, accounts = null) {
    const TOLERANCE_MS = 200; // Expected delay +/- tolerance

    // 1. Establish Baseline Latency (Avg over 3 requests to be fast but accurate)
    const baselineTimes = [];
    for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await sendBaselineRequest(endpoint, accounts);
        baselineTimes.push(Date.now() - start);
    }
    const avgBaseline = baselineTimes.reduce((a, b) => a + b) / baselineTimes.length;
    logger.debug(`[TimingAnalysis] Baseline latency for ${endpoint.url}: ${avgBaseline}ms`);

    // 2. Inject Time-Delay Payloads
    for (const { payload, delay, db } of payloads) {
        const expectedTime = avgBaseline + (delay * 1000);
        
        try {
            const start = Date.now();
            await sendInjectedRequest(endpoint, point, payload, timeout + (delay * 1000), accounts);
            const actualTime = Date.now() - start;

            // Check if actual time is close to expected time (within tolerance)
            // e.g. delay = 5s (5000ms), avgBaseline = 50ms. Expected = 5050ms. 
            // If actualTime is >= (Expected - Tolerance) AND <= (Expected + Tolerance)
            // Actually, network variance usually means it takes *longer*, not shorter.
            // So we check if actualTime >= (delay * 1000) - TOLERANCE_MS
            if (actualTime >= (delay * 1000) - TOLERANCE_MS && actualTime < (delay * 1000) + avgBaseline + 1000) {
                
                // Double check to avoid false positives (run it again)
                logger.debug(`[TimingAnalysis] Potential hit! Re-verifying ${payload}...`);
                
                const start2 = Date.now();
                await sendInjectedRequest(endpoint, point, payload, timeout + (delay * 1000), accounts);
                const actualTime2 = Date.now() - start2;

                if (actualTime2 >= (delay * 1000) - TOLERANCE_MS) {
                    logger.info(`[TimingAnalysis] Confirmed blind injection using ${payload}. Latency: ${actualTime2}ms`);
                    return {
                        payload,
                        db,
                        delay,
                        avgBaseline,
                        actualTime: actualTime2
                    };
                }
            }
        } catch (err) {
            // If it times out, and our timeout was set specifically to handle the delay, it might be a valid hit,
            // but Axios throws on timeout.
            if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                logger.debug(`[TimingAnalysis] Request timed out. Possible blind injection: ${payload}`);
            }
        }
    }

    return null; // No timing vulnerabilities detected
}

async function sendBaselineRequest(endpoint, accounts) {
    return axios({
        method: endpoint.method,
        url: endpoint.url,
        headers: accounts?.headers || { 'User-Agent': 'SECORA-Timing-Scanner' },
        validateStatus: () => true,
        timeout: 5000
    }).catch(() => null);
}

async function sendInjectedRequest(endpoint, point, payload, timeout, accounts) {
    let url = endpoint.url;
    let data = null;
    const headers = { ...(accounts?.headers || {}), 'User-Agent': 'SECORA-Timing-Scanner' };

    if (point.type === 'query') {
        const urlObj = new URL(url);
        urlObj.searchParams.set(point.name, payload);
        url = urlObj.toString();
    } else if (point.type === 'body') {
        data = typeof endpoint.body === 'object' ? { ...endpoint.body } : endpoint.body;
        if (typeof data === 'object') {
            data[point.name] = payload;
        } else {
            data = payload;
        }
    } else if (point.type === 'path') {
        const urlObj = new URL(url);
        const segments = urlObj.pathname.split('/');
        segments[point.index] = payload;
        urlObj.pathname = segments.join('/');
        url = urlObj.toString();
    } else if (point.type === 'header') {
        headers[point.name] = payload;
    }

    return axios({
        method: endpoint.method,
        url,
        data,
        headers,
        validateStatus: () => true,
        timeout
    });
}
