import net from 'net';
import { URL } from 'url';
import { logger } from '../utils/logger.js';

/**
 * HTTP Request Smuggling Detection Engine
 * Tests for CL.TE, TE.CL, and TE.TE vulnerabilities by establishing a raw TCP connection
 * and measuring timing differentials (to avoid poisoning the cache for other users).
 */

export async function testRequestSmuggling(endpoint, options = {}) {
    const findings = [];
    if (endpoint.method !== 'POST' && endpoint.method !== 'PUT') {
        return findings; // Smuggling primarily requires bodies
    }

    logger.info(`[Smuggling] Testing ${endpoint.url} for HTTP Request Smuggling`);
    
    const url = new URL(endpoint.url);
    const host = url.hostname;
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    const path = url.pathname + url.search;

    // We use a timing-based approach to detect smuggling safely.
    // If we send a smuggled request where the backend expects MORE data than the frontend sent,
    // the backend connection will hang (timeout). 
    // We compare this against a normal request baseline.

    // 1. Establish baseline latency
    const baselineStart = Date.now();
    await sendRawRequest(host, port, url.protocol === 'https:', 
        `POST ${path} HTTP/1.1\r\nHost: ${host}\r\nContent-Length: 10\r\n\r\n0123456789`
    );
    const baselineLatency = Date.now() - baselineStart;
    const timeoutThreshold = Math.max(baselineLatency * 3, 3000); // Wait at least 3 seconds for a hang

    // 2. Test CL.TE
    // Frontend uses Content-Length, Backend uses Transfer-Encoding.
    // We send CL: 4, TE: chunked. Frontend reads 4 bytes ("1\r\nZ").
    // Backend reads TE, sees "1\r\nZ", expects next chunk, so it hangs.
    const cltePayload = 
        `POST ${path} HTTP/1.1\r\n` +
        `Host: ${host}\r\n` +
        `Content-Length: 4\r\n` +
        `Transfer-Encoding: chunked\r\n\r\n` +
        `1\r\n` +
        `Z\r\n` + // Backend hangs waiting for 0\r\n\r\n
        `Q`; // Extra char so CL=4
    
    const clteStart = Date.now();
    await sendRawRequest(host, port, url.protocol === 'https:', cltePayload, timeoutThreshold);
    const clteLatency = Date.now() - clteStart;

    if (clteLatency >= timeoutThreshold - 500) { // It hung
        findings.push(buildFinding(endpoint, { type: 'header', name: 'Transfer-Encoding' }, 'CL.TE payload', 'HTTP Request Smuggling (CL.TE)', 'Target infrastructure is vulnerable to CL.TE desync.', 'CRITICAL', 9.8, 95, []));
    }

    // 3. Test TE.CL
    // Frontend uses TE, Backend uses CL.
    // We send TE: chunked, CL: 6. 
    // Frontend reads 0\r\n\r\n and forwards. Backend reads CL: 6, but only receives 5 bytes ("0\r\n\r\n").
    // Backend hangs waiting for the 6th byte.
    const teclPayload = 
        `POST ${path} HTTP/1.1\r\n` +
        `Host: ${host}\r\n` +
        `Transfer-Encoding: chunked\r\n` +
        `Content-Length: 6\r\n\r\n` +
        `0\r\n\r\n` +
        `X`; // 6th byte is missing from frontend's perspective
    
    const teclStart = Date.now();
    await sendRawRequest(host, port, url.protocol === 'https:', teclPayload, timeoutThreshold);
    const teclLatency = Date.now() - teclStart;

    if (teclLatency >= timeoutThreshold - 500) { // It hung
        findings.push(buildFinding(endpoint, { type: 'header', name: 'Content-Length' }, 'TE.CL payload', 'HTTP Request Smuggling (TE.CL)', 'Target infrastructure is vulnerable to TE.CL desync.', 'CRITICAL', 9.8, 95, []));
    }

    return findings;
}

function sendRawRequest(host, port, isHttps, payload, timeout = 5000) {
    return new Promise((resolve) => {
        let client;
        if (isHttps) {
            import('tls').then(tls => {
                client = tls.connect(port, host, { rejectUnauthorized: false }, () => {
                    client.write(payload);
                });
                handleClient(client, resolve, timeout);
            });
        } else {
            client = new net.Socket();
            client.connect(port, host, () => {
                client.write(payload);
            });
            handleClient(client, resolve, timeout);
        }
    });
}

function buildFinding(endpoint, point, payload, title, description, severity, cvss, confidence, evidence) {
    return {
        assetId: endpoint.assetId, endpointId: endpoint.id,
        title,
        description,
        category: 'SERVER_MISCONFIGURATION', severity, cvss, owasp: 'A05:2021', cwe: 'CWE-444',
        remediation: 'Ensure frontend and backend servers handle HTTP headers (Content-Length, Transfer-Encoding) consistently. Upgrade to HTTP/2 where possible.',
        references: ['https://portswigger.net/web-security/request-smuggling'],
        detectedBy: 'smuggling-engine', confidence,
        evidence: evidence || []
    };
}

function handleClient(client, resolve, timeout) {
    let resolved = false;
    const timer = setTimeout(() => {
        if (!resolved) {
            resolved = true;
            client.destroy();
            resolve('TIMEOUT');
        }
    }, timeout);

    client.on('data', () => {
        if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            client.destroy();
            resolve('DATA');
        }
    });

    client.on('error', () => {
        if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            client.destroy();
            resolve('ERROR');
        }
    });

    client.on('close', () => {
        if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve('CLOSED');
        }
    });
}
