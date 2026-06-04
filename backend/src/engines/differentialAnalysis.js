// backend/src/engines/differentialAnalysis.js
// Multi-signal response comparison to eliminate false positives
import axios from 'axios';

/**
 * Compare an injection response against a baseline using multiple signals.
 * Only confirms a finding if >= 2 signals differ from baseline.
 * 
 * Signals: status code, response length, response time, string patterns, content type
 */
export async function confirmWithDifferentialAnalysis(endpoint, param, payload, options = {}) {
    const timeout = options.timeout || 10000;
    const thresholds = {
        lengthDelta: options.lengthDelta || 100,   // bytes
        timeDelta: options.timeDelta || 2000,        // ms
        minSignals: options.minSignals || 2           // signals needed to confirm
    };

    try {
        // Get baseline response
        const baseStart = Date.now();
        const baseResp = await axios.get(endpoint.url, {
            timeout, validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const baseTime = Date.now() - baseStart;
        const baseLen = typeof baseResp.data === 'string' ? baseResp.data.length : JSON.stringify(baseResp.data).length;
        const baseStatus = baseResp.status;
        const baseContentType = baseResp.headers['content-type'] || '';

        // Get injection response
        const testUrl = new URL(endpoint.url);
        testUrl.searchParams.set(param, payload);
        const injStart = Date.now();
        const injResp = await axios.get(testUrl.toString(), {
            timeout, validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const injTime = Date.now() - injStart;
        const injLen = typeof injResp.data === 'string' ? injResp.data.length : JSON.stringify(injResp.data).length;
        const injStatus = injResp.status;
        const injContentType = injResp.headers['content-type'] || '';

        // Compare signals
        const signals = [];
        if (injStatus !== baseStatus) {
            signals.push({ signal: 'status_code', baseline: baseStatus, injection: injStatus });
        }
        if (Math.abs(injLen - baseLen) > thresholds.lengthDelta) {
            signals.push({ signal: 'response_length', baseline: baseLen, injection: injLen, delta: Math.abs(injLen - baseLen) });
        }
        if (Math.abs(injTime - baseTime) > thresholds.timeDelta) {
            signals.push({ signal: 'response_time', baseline: baseTime, injection: injTime, delta: Math.abs(injTime - baseTime) });
        }
        if (injContentType !== baseContentType) {
            signals.push({ signal: 'content_type', baseline: baseContentType, injection: injContentType });
        }

        // Check for error patterns in injection response but not baseline
        const body = typeof injResp.data === 'string' ? injResp.data : JSON.stringify(injResp.data);
        const baseBody = typeof baseResp.data === 'string' ? baseResp.data : JSON.stringify(baseResp.data);
        const errorPatterns = [/error/i, /exception/i, /warning/i, /syntax/i, /unexpected/i];
        const hasNewErrors = errorPatterns.some(p => p.test(body) && !p.test(baseBody));
        if (hasNewErrors) {
            signals.push({ signal: 'error_pattern', baseline: 'none', injection: 'error detected' });
        }

        const confirmed = signals.length >= thresholds.minSignals;

        return {
            confirmed,
            signalCount: signals.length,
            signals,
            baseline: { status: baseStatus, length: baseLen, time: baseTime },
            injection: { status: injStatus, length: injLen, time: injTime },
            payload,
            param
        };
    } catch (err) {
        return { confirmed: false, error: err.message };
    }
}

/**
 * Batch differential analysis for a set of payloads
 */
export async function batchDifferentialAnalysis(endpoint, param, payloads, options = {}) {
    const results = [];
    for (const payload of payloads) {
        const result = await confirmWithDifferentialAnalysis(endpoint, param, payload, options);
        if (result.confirmed) {
            results.push(result);
        }
    }
    return results;
}

export default { confirmWithDifferentialAnalysis, batchDifferentialAnalysis };
