// backend/src/oast/oastClient.js
// OAST Client — used by vulnerability test engines to generate and verify OAST payloads

import { getOASTServer } from './oastServer.js';

/**
 * OAST Client
 * 
 * Provides a clean API for vulnerability test modules to:
 * 1. Generate unique OAST payloads containing callback URLs
 * 2. Inject them into requests
 * 3. Poll/wait for callbacks after injection
 * 4. Build confirmed findings with callback evidence
 */
class OASTClient {
    constructor(scanId) {
        this.scanId = scanId;
        this.server = getOASTServer();
        this.generatedPayloads = [];
    }

    /**
     * Get the OAST callback domain
     * @returns {string} The callback domain (e.g. 'oast.secora.io' or 'localhost')
     */
    getDomain() {
        return this.server.domain || 'localhost';
    }

    /**
     * Generate an OAST payload for a specific test
     * @param {string} testType - sqli, xss, ssrf, xxe, log4shell
     * @param {string} context - e.g. "param:username", "header:User-Agent"
     * @returns {object} Payload config with callback URLs and pre-built payloads
     */
    generatePayload(testType, context = '') {
        const payload = this.server.generatePayload(this.scanId, testType, context);
        this.generatedPayloads.push(payload);
        return payload;
    }

    /**
     * Wait for a callback from a specific payload
     * @param {string} payloadId - The payload identifier
     * @param {number} timeoutMs - How long to wait (default 15s for speed, 30s for thorough)
     * @returns {Promise<object|null>} Callback data or null
     */
    async waitForCallback(payloadId, timeoutMs = 15000) {
        return this.server.waitForCallback(payloadId, timeoutMs);
    }

    /**
     * Quick check if a callback was received (non-blocking)
     * @param {string} payloadId
     * @returns {object|null}
     */
    checkCallback(payloadId) {
        return this.server.getCallback(payloadId);
    }

    /**
     * Inject a payload, wait for callback, and build finding evidence if confirmed
     * This is the primary workflow method for test modules.
     * 
     * @param {object} options
     * @param {string} options.testType - sqli, xss, ssrf, xxe, log4shell
     * @param {string} options.context - Injection context description
     * @param {Function} options.injector - Async function that injects the payload. Receives payload config.
     * @param {number} options.timeout - Callback wait timeout in ms
     * @returns {Promise<object|null>} Confirmed finding evidence or null
     */
    async injectAndVerify({ testType, context, injector, timeout = 15000 }) {
        const payload = this.generatePayload(testType, context);

        try {
            // Execute the injection function
            await injector(payload);

            // Wait for callback
            const callback = await this.waitForCallback(payload.payloadId, timeout);

            if (callback) {
                return {
                    confirmed: true,
                    payloadId: payload.payloadId,
                    testType,
                    context,
                    callback: {
                        protocol: callback.protocol,
                        sourceIp: callback.sourceIp,
                        receivedAt: callback.receivedAt,
                        method: callback.method,
                        path: callback.path,
                        userAgent: callback.userAgent
                    },
                    payload: payload,
                    evidence: this._buildEvidence(payload, callback)
                };
            }

            return null;
        } catch (err) {
            console.warn(`OAST inject-and-verify failed for ${testType}/${context}: ${err.message}`);
            return null;
        }
    }

    /**
     * Batch inject multiple payloads and wait for any callbacks
     * Useful for testing multiple injection points simultaneously
     * 
     * @param {Array<object>} injections - Array of {testType, context, injector} objects
     * @param {number} timeout - Global timeout for all callbacks
     * @returns {Promise<Array<object>>} Array of confirmed findings
     */
    async batchInjectAndVerify(injections, timeout = 20000) {
        const payloads = [];

        // Generate and inject all payloads
        for (const injection of injections) {
            const payload = this.generatePayload(injection.testType, injection.context);
            payloads.push({ payload, injection });

            try {
                await injection.injector(payload);
            } catch (err) {
                console.warn(`Batch injection failed for ${injection.context}: ${err.message}`);
            }
        }

        // Wait for the timeout period, then check all callbacks
        await new Promise(resolve => setTimeout(resolve, timeout));

        // Collect confirmed findings
        const confirmed = [];
        for (const { payload, injection } of payloads) {
            const callback = this.checkCallback(payload.payloadId);
            if (callback) {
                confirmed.push({
                    confirmed: true,
                    payloadId: payload.payloadId,
                    testType: injection.testType,
                    context: injection.context,
                    callback: {
                        protocol: callback.protocol,
                        sourceIp: callback.sourceIp,
                        receivedAt: callback.receivedAt
                    },
                    payload,
                    evidence: this._buildEvidence(payload, callback)
                });
            }
        }

        return confirmed;
    }

    /**
     * Build structured evidence from a confirmed OAST callback
     */
    _buildEvidence(payload, callback) {
        return [
            {
                type: 'PAYLOAD',
                title: `OAST ${payload.testType.toUpperCase()} Payload Injected`,
                content: [
                    `Test Type: ${payload.testType}`,
                    `Context: ${payload.context}`,
                    `Payload ID: ${payload.payloadId}`,
                    `Callback URL: ${payload.httpCallback}`,
                    `Injected At: ${new Date().toISOString()}`
                ].join('\n')
            },
            {
                type: 'LOG',
                title: `OAST Callback Received — Vulnerability Confirmed`,
                content: [
                    `Protocol: ${callback.protocol.toUpperCase()}`,
                    `Source IP: ${callback.sourceIp}`,
                    `Received At: ${callback.receivedAt}`,
                    `Method: ${callback.method || 'N/A'}`,
                    `Path: ${callback.path || 'N/A'}`,
                    `User-Agent: ${callback.userAgent || 'N/A'}`,
                    '',
                    '⚠ The target application made an outbound request to the OAST callback server,',
                    '  confirming that the injected payload was executed server-side.',
                    '  This is definitive proof of the vulnerability.'
                ].join('\n')
            }
        ];
    }

    /**
     * Get all callbacks received for this scan
     */
    getAllCallbacks() {
        return this.server.getCallbacksForScan(this.scanId);
    }

    /**
     * Get all OAST interactions for this scan (alias for getAllCallbacks)
     * Used by deserialization, DNS rebinding, and other modules.
     * @returns {Array} Array of callback/interaction objects
     */
    async getInteractions() {
        const callbacks = this.getAllCallbacks();
        return callbacks ? Array.from(callbacks.values()) : [];
    }

    /**
     * Cleanup all OAST data for this scan
     */
    cleanup() {
        this.server.cleanupScan(this.scanId);
        this.generatedPayloads = [];
    }
}

/**
 * Create an OAST client for a scan
 * @param {string} scanId
 * @returns {OASTClient}
 */
export function createOASTClient(scanId) {
    return new OASTClient(scanId);
}

export { OASTClient };
export default OASTClient;
