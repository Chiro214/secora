import axios from 'axios';
import http from 'http';
import https from 'https';
import { logger } from '../utils/logger.js';

/**
 * SECORA Repeater Engine
 * Executes raw HTTP requests for manual testing.
 * Captures raw headers, status codes, bodies, and exact latency.
 */

// Custom agent to ignore SSL errors and allow manual testing against self-signed certs
const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: false });

export async function executeRepeaterRequest(requestConfig) {
    const { method, url, headers, body, timeout = 15000 } = requestConfig;

    logger.info(`[Repeater] Executing ${method} ${url}`);

    const startTime = Date.now();
    
    try {
        const response = await axios({
            method: method.toUpperCase(),
            url: url,
            headers: headers || {},
            data: body,
            timeout: timeout,
            httpAgent,
            httpsAgent,
            validateStatus: () => true, // Accept any status code (200-599)
            maxRedirects: 0, // Manual repeater shouldn't auto-redirect, let the user follow it manually
            transformResponse: [(data) => data] // Keep data as string, don't parse JSON automatically
        });

        const latency = Date.now() - startTime;

        return {
            success: true,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: response.data,
            latencyMs: latency
        };

    } catch (error) {
        const latency = Date.now() - startTime;
        logger.error(`[Repeater] Request failed: ${error.message}`);
        
        return {
            success: false,
            error: error.message,
            code: error.code,
            latencyMs: latency
        };
    }
}
