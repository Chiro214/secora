/**
 * SECORA IAST Agent (Node.js)
 * Instruments Node.js applications to detect vulnerabilities in real-time.
 */

import { AsyncLocalStorage } from 'async_hooks';
import child_process from 'child_process';
import fs from 'fs';
import http from 'http';
import https from 'https';

const asyncLocalStorage = new AsyncLocalStorage();
let secoraIngestionUrl = process.env.SECORA_IAST_URL || 'http://localhost:5000/api/iast/ingest';
let agentToken = process.env.SECORA_AGENT_TOKEN || 'dev-token';

// Send telemetry to SECORA
function reportFinding(sink, payload, stack) {
    const traceId = asyncLocalStorage.getStore();
    if (!traceId) return; // Not part of a SECORA test

    const data = JSON.stringify({
        traceId,
        sink,
        payload,
        stack
    });

    const url = new URL(secoraIngestionUrl);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'Authorization': `Bearer ${agentToken}`
        }
    });

    req.on('error', (e) => console.error('[SECORA IAST] Failed to send telemetry:', e.message));
    req.write(data);
    req.end();
}

// 1. Monkey-patch child_process.exec (OS Command Injection)
const originalExec = child_process.exec;
child_process.exec = function(command, options, callback) {
    const traceId = asyncLocalStorage.getStore();
    if (traceId) {
        // Capture stack trace, remove the first Error line
        const stack = new Error().stack.split('\n').slice(2).join('\n');
        reportFinding('child_process.exec', command, stack);
    }
    return originalExec.apply(this, arguments);
};

// 2. Monkey-patch fs.readFile (Path Traversal)
const originalReadFile = fs.readFile;
fs.readFile = function(path, options, callback) {
    const traceId = asyncLocalStorage.getStore();
    if (traceId) {
        const stack = new Error().stack.split('\n').slice(2).join('\n');
        reportFinding('fs.readFile', path, stack);
    }
    return originalReadFile.apply(this, arguments);
};

/**
 * Express Middleware to track SECORA scan contexts.
 * Usage: app.use(secoraIast());
 */
export function secoraIast(options = {}) {
    if (options.ingestionUrl) secoraIngestionUrl = options.ingestionUrl;
    if (options.token) agentToken = options.token;

    console.log('[SECORA IAST] Agent Initialized. Monitoring sinks for active traces.');

    return (req, res, next) => {
        const traceId = req.headers['x-secora-trace'];
        if (traceId) {
            // Run the entire request pipeline within this async context
            asyncLocalStorage.run(traceId, () => {
                next();
            });
        } else {
            next();
        }
    };
}
