// backend/src/routes/targets.js
import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import prisma from "../config/prisma.js";
import { validateTarget } from "../utils/validators.js";

const router = express.Router();

// Create target
router.post("/api/targets", authenticateToken, async (req, res) => {
    try {
        const { name, type, value, description, allowSubdomains, excludePatterns } = req.body;
        
        // Validate input
        const validation = validateTarget({ type, value });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        // Create target
        const target = await prisma.target.create({
            data: {
                name,
                type,
                value: validation.normalized,
                description,
                allowSubdomains: allowSubdomains || false,
                excludePatterns: excludePatterns || [],
                userId: req.user.id,
                verified: false
            }
        });
        
        res.status(201).json(target);
    } catch (error) {
        console.error("Create target error:", error);
        res.status(500).json({ error: `Failed to create target: ${error.message}` });
    }
});

// List targets
router.get("/api/targets", authenticateToken, async (req, res) => {
    try {
        const targets = await prisma.target.findMany({
            where: { userId: req.user.id },
            include: {
                _count: {
                    select: { scans: true, assets: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(targets);
    } catch (error) {
        console.error("List targets error:", error);
        res.status(500).json({ error: "Failed to fetch targets" });
    }
});

// Get target by ID
router.get("/api/targets/:id", authenticateToken, async (req, res) => {
    try {
        const target = await prisma.target.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: {
                assets: {
                    take: 10,
                    orderBy: { lastSeen: 'desc' }
                },
                scans: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        if (!target) {
            return res.status(404).json({ error: "Target not found" });
        }
        
        res.json(target);
    } catch (error) {
        console.error("Get target error:", error);
        res.status(500).json({ error: "Failed to fetch target" });
    }
});

// Update target
router.put("/api/targets/:id", authenticateToken, async (req, res) => {
    try {
        const { name, description, allowSubdomains, excludePatterns } = req.body;
        
        const target = await prisma.target.updateMany({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            data: {
                name,
                description,
                allowSubdomains,
                excludePatterns
            }
        });
        
        if (target.count === 0) {
            return res.status(404).json({ error: "Target not found" });
        }
        
        res.json({ message: "Target updated" });
    } catch (error) {
        console.error("Update target error:", error);
        res.status(500).json({ error: "Failed to update target" });
    }
});

// Delete target
router.delete("/api/targets/:id", authenticateToken, async (req, res) => {
    try {
        const target = await prisma.target.deleteMany({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });
        
        if (target.count === 0) {
            return res.status(404).json({ error: "Target not found" });
        }
        
        res.json({ message: "Target deleted" });
    } catch (error) {
        console.error("Delete target error:", error);
        res.status(500).json({ error: "Failed to delete target" });
    }
});

// Verify target ownership
router.post("/api/targets/:id/verify", authenticateToken, async (req, res) => {
    try {
        const { method } = req.body; // dns-txt, file-upload
        
        const target = await prisma.target.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });
        
        if (!target) {
            return res.status(404).json({ error: "Target not found" });
        }
        
        // Generate verification token
        const token = require('crypto').randomBytes(16).toString('hex');
        
        await prisma.target.update({
            where: { id: target.id },
            data: {
                verificationMethod: method,
                verificationToken: token
            }
        });
        
        res.json({
            method,
            token,
            instructions: method === 'dns-txt' 
                ? `Add TXT record: secora-verify=${token}`
                : `Upload file: /.well-known/secora-verify.txt with content: ${token}`
        });
    } catch (error) {
        console.error("Verify target error:", error);
        res.status(500).json({ error: "Failed to initiate verification" });
    }
});

export default router;
