import WebSocket from 'ws';
import { logger } from '../utils/logger.js';

function buildFinding(endpoint, title, category, severity, cvss, confidence, evidence) {
    return {
        assetId: endpoint.assetId,
        endpointId: endpoint.id,
        title,
        description: `Detected ${title} affecting WebSocket endpoint ${endpoint.url}.`,
        category,
        severity,
        cvss,
        detectedBy: 'websocket-analyzer',
        confidence,
        evidence
    };
}

export async function testWebSocket(endpoint, options = {}) {
    const findings = [];
    
    // Check if the endpoint looks like a WebSocket endpoint (or if it upgrade headers were seen during discovery)
    const urlLower = endpoint.url.toLowerCase();
    const isWs = urlLower.startsWith('ws://') || urlLower.startsWith('wss://') || 
                 urlLower.includes('/socket.io') || urlLower.includes('/ws');
                 
    if (!isWs) return findings;

    logger.info(`[WebSocket] Analyzing endpoint: ${endpoint.url}`);

    // Transform HTTP to WS protocol if needed
    let wsUrl = endpoint.url;
    if (wsUrl.startsWith('http://')) wsUrl = wsUrl.replace('http://', 'ws://');
    if (wsUrl.startsWith('https://')) wsUrl = wsUrl.replace('https://', 'wss://');

    // Test 1: Cross-Site WebSocket Hijacking (CSWSH)
    const cswshFinding = await testCSWSH(endpoint, wsUrl);
    if (cswshFinding) findings.push(cswshFinding);

    // Test 2: Basic Fuzzing (XSS / SQLi Payloads over WS)
    // Connecting to WS and sending a few payloads
    const fuzzerFindings = await fuzzWebSocketMessages(endpoint, wsUrl);
    findings.push(...fuzzerFindings);

    return findings;
}

async function testCSWSH(endpoint, wsUrl) {
    return new Promise((resolve) => {
        // Attempt connection with a malicious Origin
        const maliciousOrigin = 'https://evil-attacker.com';
        
        try {
            const ws = new WebSocket(wsUrl, {
                headers: {
                    'Origin': maliciousOrigin,
                    // Pass along auth headers if needed, CSWSH relies on ambient credentials (cookies)
                    ...endpoint.headers
                },
                rejectUnauthorized: false
            });

            ws.on('open', () => {
                ws.close();
                resolve(buildFinding(endpoint, 'Cross-Site WebSocket Hijacking (CSWSH)', 'BROKEN_ACCESS', 'HIGH', 8.1, 100, [
                    { type: 'LOG', title: 'Impact', content: `The WebSocket server accepts connections from arbitrary Origin headers (e.g., ${maliciousOrigin}). If the endpoint relies on cookies for authentication, an attacker can hijack the user's session via a malicious website.` }
                ]));
            });

            ws.on('error', (err) => {
                // Connection rejected, CSWSH is mitigated
                resolve(null);
            });

            // Timeout
            setTimeout(() => {
                if (ws.readyState !== WebSocket.CLOSED) ws.close();
                resolve(null);
            }, 3000);
        } catch (e) {
            resolve(null);
        }
    });
}

async function fuzzWebSocketMessages(endpoint, wsUrl) {
    const findings = [];
    
    return new Promise((resolve) => {
        try {
            const ws = new WebSocket(wsUrl, {
                headers: endpoint.headers || {},
                rejectUnauthorized: false
            });

            ws.on('open', () => {
                // Send basic fuzzing payloads
                const payloads = [
                    '{"action": "test", "data": "\' OR 1=1--"}',
                    '<script>alert("XSS")</script>',
                    '{"type": "chat", "message": "<img src=x onerror=alert(1)>"}'
                ];
                
                for (const p of payloads) {
                    ws.send(p);
                }

                // Close after a short delay to receive potential errors
                setTimeout(() => {
                    ws.close();
                    // Just a mock detection for MVP - we assume if the connection didn't instantly drop, it parsed it
                    // Real implementation would analyze the WS incoming messages for SQL errors or XSS echoes
                    resolve(findings);
                }, 2000);
            });

            ws.on('message', (data) => {
                const msg = data.toString();
                if (msg.includes('syntax error') || msg.includes('SQL')) {
                    findings.push(buildFinding(endpoint, 'WebSocket SQL Injection', 'INJECTION', 'CRITICAL', 9.8, 80, [
                        { type: 'LOG', title: 'Impact', content: `The server returned an SQL error over the WebSocket channel, indicating a lack of input sanitization.` },
                        { type: 'RESPONSE', title: 'Socket Reply', content: msg }
                    ]));
                }
            });

            ws.on('error', () => resolve(findings));
            
        } catch (e) {
            resolve(findings);
        }
    });
}
