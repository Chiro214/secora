import express from 'express';
import { authenticateToken, requireOrg } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get comments for a finding
router.get('/:findingId', authenticateToken, requireOrg, async (req, res) => {
    try {
        const { findingId } = req.params;

        // Verify the finding belongs to a scan that belongs to the user's organization
        const finding = await prisma.finding.findUnique({
            where: { id: findingId },
            include: { scan: true }
        });

        if (!finding || finding.scan.orgId !== req.user.orgId) {
            return res.status(404).json({ error: 'Finding not found or access denied' });
        }

        const comments = await prisma.comment.findMany({
            where: { findingId },
            include: {
                user: { select: { email: true, role: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Add a comment to a finding
router.post('/:findingId', authenticateToken, requireOrg, async (req, res) => {
    try {
        const { findingId } = req.params;
        const { text } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        // Verify the finding belongs to the user's org
        const finding = await prisma.finding.findUnique({
            where: { id: findingId },
            include: { scan: true }
        });

        if (!finding || finding.scan.orgId !== req.user.orgId) {
            return res.status(404).json({ error: 'Finding not found or access denied' });
        }

        const comment = await prisma.comment.create({
            data: {
                text,
                findingId,
                userId: req.user.id
            },
            include: {
                user: { select: { email: true, role: true } }
            }
        });

        res.status(201).json(comment);
    } catch (err) {
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

export default router;
