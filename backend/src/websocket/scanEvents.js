// backend/src/websocket/scanEvents.js
import { Server } from 'socket.io';

let io = null;

export function initializeWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Join scan room
        socket.on('join-scan', (scanId) => {
            socket.join(`scan-${scanId}`);
            console.log(`📡 Client ${socket.id} joined scan room: ${scanId}`);
        });

        // Leave scan room
        socket.on('leave-scan', (scanId) => {
            socket.leave(`scan-${scanId}`);
            console.log(`📡 Client ${socket.id} left scan room: ${scanId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}

// Emit scan events
export function emitScanEvent(scanId, event, data) {
    if (!io) return;
    
    io.to(`scan-${scanId}`).emit(event, {
        scanId,
        timestamp: new Date().toISOString(),
        ...data
    });
}

// Scan lifecycle events
export function emitScanStarted(scanId, data) {
    emitScanEvent(scanId, 'scan:started', {
        status: 'RUNNING',
        message: 'Scan started',
        ...data
    });
}

export function emitScanProgress(scanId, phase, progress, message) {
    emitScanEvent(scanId, 'scan:progress', {
        phase,
        progress, // 0-100
        message,
        status: 'RUNNING'
    });
}

export function emitScanPhaseComplete(scanId, phase, results) {
    emitScanEvent(scanId, 'scan:phase-complete', {
        phase,
        results,
        status: 'RUNNING'
    });
}

export function emitFindingDiscovered(scanId, finding) {
    emitScanEvent(scanId, 'scan:finding', {
        finding,
        status: 'RUNNING'
    });
}

export function emitScanComplete(scanId, summary) {
    emitScanEvent(scanId, 'scan:complete', {
        status: 'COMPLETED',
        message: 'Scan completed successfully',
        summary
    });
}

export function emitScanFailed(scanId, error) {
    emitScanEvent(scanId, 'scan:failed', {
        status: 'FAILED',
        message: error.message || 'Scan failed',
        error: error.toString()
    });
}

export function emitScanCancelled(scanId) {
    emitScanEvent(scanId, 'scan:cancelled', {
        status: 'CANCELLED',
        message: 'Scan was cancelled'
    });
}

// Asset discovery events
export function emitAssetDiscovered(scanId, asset) {
    emitScanEvent(scanId, 'scan:asset-discovered', {
        asset,
        status: 'RUNNING'
    });
}

// Endpoint discovery events
export function emitEndpointDiscovered(scanId, endpoint) {
    emitScanEvent(scanId, 'scan:endpoint-discovered', {
        endpoint,
        status: 'RUNNING'
    });
}

// CVE match events
export function emitCVEMatched(scanId, cve) {
    emitScanEvent(scanId, 'scan:cve-matched', {
        cve,
        status: 'RUNNING'
    });
}

// Statistics update
export function emitScanStats(scanId, stats) {
    emitScanEvent(scanId, 'scan:stats', {
        stats,
        status: 'RUNNING'
    });
}
