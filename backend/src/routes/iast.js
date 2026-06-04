import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// In-memory store for IAST findings keyed by scanId
global.iastFindings = global.iastFindings || new Map();

/**
 * @route POST /api/iast/ingest
 * @desc Receives telemetry from deployed IAST agents
 */
router.post('/ingest', express.json(), (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // In a real app, validate the token
    const { traceId, sink, payload, stack } = req.body;

    if (!traceId) return res.status(400).json({ error: 'Missing traceId' });

    // traceId format: scanId:assetId:endpointId:testType
    const parts = traceId.split(':');
    if (parts.length < 4) {
        logger.warn(`[IAST] Received malformed traceId: ${traceId}`);
        return res.status(400).json({ error: 'Malformed traceId' });
    }

    const [scanId, assetId, endpointId, testType] = parts;

    logger.info(`🚨 [IAST] Vulnerability Confirmed via Agent! Sink: ${sink}, Trace: ${traceId}`);

    // Build the finding
    const finding = {
        assetId,
        endpointId,
        title: `IAST Confirmed: ${testType} via ${sink}`,
        description: `An Interactive Application Security Testing (IAST) agent deployed on the target application confirmed that the attack payload reached a dangerous execution sink (${sink}).`,
        category: getCategoryForSink(sink),
        severity: 'CRITICAL',
        cvss: 9.8,
        detectedBy: 'iast-agent',
        confidence: 100, // 100% confidence because we saw it execute inside the app
        evidence: [
            { type: 'INFO', title: 'Execution Sink', content: `The payload was passed to: ${sink}()` },
            { type: 'INFO', title: 'Captured Payload', content: payload },
            { type: 'CODE', title: 'Stack Trace', content: stack }
        ]
    };

    // Store it
    if (!global.iastFindings.has(scanId)) {
        global.iastFindings.set(scanId, []);
    }
    global.iastFindings.get(scanId).push(finding);

    res.json({ success: true, message: 'Telemetry processed' });
});

function getCategoryForSink(sink) {
    if (sink.includes('exec') || sink.includes('spawn')) return 'OS_COMMAND_INJECTION';
    if (sink.includes('readFile')) return 'PATH_TRAVERSAL';
    if (sink.includes('query')) return 'SQL_INJECTION';
    return 'INJECTION';
}

export default router;
