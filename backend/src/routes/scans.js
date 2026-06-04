// backend/src/routes/scans.js
import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import prisma from "../config/prisma.js";
import { enqueueScan } from "../queue/scanQueue.js";

const router = express.Router();

// Start new scan
router.post("/api/scans/start", authenticateToken, async (req, res) => {
    try {
        const { targetId, profile, config } = req.body;
        
        // Validate target ownership
        const target = await prisma.target.findFirst({
            where: {
                id: targetId,
                userId: req.user.id
            }
        });
        
        if (!target) {
            return res.status(404).json({ error: "Target not found" });
        }
        
        // Check if target is verified (optional based on settings)
        if (!target.verified && process.env.REQUIRE_VERIFICATION === 'true') {
            return res.status(403).json({ 
                error: "Target must be verified before scanning",
                code: "TARGET_NOT_VERIFIED"
            });
        }
        
        // Create scan record
        const scan = await prisma.scan.create({
            data: {
                targetId,
                userId: req.user.id,
                profile: profile || 'FULL_VAPT',
                status: 'QUEUED',
                config: config || {}
            },
            include: {
                target: true
            }
        });
        
        // Enqueue scan job
        await enqueueScan(scan);
        
        // Log audit
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'SCAN_STARTED',
                resource: 'scan',
                resourceId: scan.id,
                ipAddress: req.ip || 'unknown',
                metadata: {
                    targetId,
                    profile,
                    targetValue: target.value
                }
            }
        });
        
        res.status(201).json(scan);
    } catch (error) {
        console.error("Start scan error:", error);
        res.status(500).json({ error: "Failed to start scan" });
    }
});

// Get scan status
router.get("/api/scans/:id/status", authenticateToken, async (req, res) => {
    try {
        const scan = await prisma.scan.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            select: {
                id: true,
                status: true,
                progress: true,
                currentPhase: true,
                startedAt: true,
                completedAt: true,
                duration: true,
                stats: true,
                error: true
            }
        });
        
        if (!scan) {
            return res.status(404).json({ error: "Scan not found" });
        }
        
        res.json(scan);
    } catch (error) {
        console.error("Get scan status error:", error);
        res.status(500).json({ error: "Failed to fetch scan status" });
    }
});

// Get scan findings
router.get("/api/scans/:id/findings", authenticateToken, async (req, res) => {
    try {
        const { severity, category, status } = req.query;
        
        // Build filter
        const where = {
            scanId: req.params.id,
            scan: {
                userId: req.user.id
            }
        };
        
        if (severity) where.severity = severity;
        if (category) where.category = category;
        if (status) where.status = status;
        
        const findings = await prisma.finding.findMany({
            where,
            include: {
                evidence: true,
                asset: {
                    select: {
                        value: true,
                        type: true
                    }
                },
                endpoint: {
                    select: {
                        url: true,
                        method: true
                    }
                }
            },
            orderBy: [
                { severity: 'asc' }, // CRITICAL first
                { createdAt: 'desc' }
            ]
        });
        
        // Get summary stats
        const stats = await prisma.finding.groupBy({
            by: ['severity'],
            where: {
                scanId: req.params.id,
                scan: {
                    userId: req.user.id
                }
            },
            _count: true
        });
        
        res.json({
            findings,
            stats: stats.reduce((acc, s) => {
                acc[s.severity.toLowerCase()] = s._count;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error("Get findings error:", error);
        res.status(500).json({ error: "Failed to fetch findings" });
    }
});

// List scans
router.get("/api/scans", authenticateToken, async (req, res) => {
    try {
        const { targetId, status, limit = 20, offset = 0 } = req.query;
        
        const where = {
            userId: req.user.id
        };
        
        if (targetId) where.targetId = targetId;
        if (status) where.status = status;
        
        const scans = await prisma.scan.findMany({
            where,
            include: {
                target: {
                    select: {
                        name: true,
                        value: true,
                        type: true
                    }
                },
                _count: {
                    select: { findings: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        
        const total = await prisma.scan.count({ where });
        
        res.json({
            scans,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error("List scans error:", error);
        res.status(500).json({ error: "Failed to fetch scans" });
    }
});

// Cancel scan
router.post("/api/scans/:id/cancel", authenticateToken, async (req, res) => {
    try {
        const scan = await prisma.scan.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });
        
        if (!scan) {
            return res.status(404).json({ error: "Scan not found" });
        }
        
        if (!['QUEUED', 'RUNNING'].includes(scan.status)) {
            return res.status(400).json({ error: "Scan cannot be cancelled" });
        }
        
        await prisma.scan.update({
            where: { id: scan.id },
            data: {
                status: 'CANCELLED',
                completedAt: new Date()
            }
        });
        
        res.json({ message: "Scan cancelled" });
    } catch (error) {
        console.error("Cancel scan error:", error);
        res.status(500).json({ error: "Failed to cancel scan" });
    }
});

// Get scan details
router.get("/api/scans/:id", authenticateToken, async (req, res) => {
    try {
        const scan = await prisma.scan.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: {
                target: true,
                _count: {
                    select: { findings: true }
                }
            }
        });
        
        if (!scan) {
            return res.status(404).json({ error: "Scan not found" });
        }
        
        res.json(scan);
    } catch (error) {
        console.error("Get scan error:", error);
        res.status(500).json({ error: "Failed to fetch scan" });
    }
});

export default router;
