// backend/src/routes/scheduledScans.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { startScheduledJobs } from '../jobs/scheduledScans.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all scheduled scans for user
router.get('/api/scheduled-scans', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const schedules = await prisma.scheduledScan.findMany({
            where: { userId },
            include: {
                target: {
                    select: {
                        id: true,
                        name: true,
                        value: true,
                        type: true
                    }
                },
                scans: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 5
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(schedules);
    } catch (error) {
        console.error('Error fetching scheduled scans:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled scans' });
    }
});

// Get single scheduled scan
router.get('/api/scheduled-scans/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const schedule = await prisma.scheduledScan.findFirst({
            where: { id, userId },
            include: {
                target: true,
                scans: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10
                }
            }
        });

        if (!schedule) {
            return res.status(404).json({ error: 'Scheduled scan not found' });
        }

        res.json(schedule);
    } catch (error) {
        console.error('Error fetching scheduled scan:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled scan' });
    }
});

// Create scheduled scan
router.post('/api/scheduled-scans', authenticateToken, async (req, res) => {
    try {
        const { targetId, name, profile, cronExpression, enabled, config } = req.body;
        const userId = req.user.id;

        // Verify target belongs to user
        const target = await prisma.target.findFirst({
            where: { id: targetId, userId }
        });

        if (!target) {
            return res.status(404).json({ error: 'Target not found' });
        }

        // Create scheduled scan
        const schedule = await prisma.scheduledScan.create({
            data: {
                targetId,
                userId,
                name,
                profile,
                cronExpression,
                enabled: enabled !== false,
                config: config || {}
            }
        });

        res.status(201).json(schedule);
    } catch (error) {
        console.error('Error creating scheduled scan:', error);
        res.status(500).json({ 
            error: 'Failed to create scheduled scan',
            message: error.message
        });
    }
});

// Update scheduled scan
router.put('/api/scheduled-scans/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        // Verify ownership
        const existing = await prisma.scheduledScan.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Scheduled scan not found' });
        }

        // Update schedule
        const schedule = await prisma.scheduledScan.update({
            where: { id },
            data: updates
        });

        res.json(schedule);
    } catch (error) {
        console.error('Error updating scheduled scan:', error);
        res.status(500).json({ 
            error: 'Failed to update scheduled scan',
            message: error.message
        });
    }
});

// Delete scheduled scan
router.delete('/api/scheduled-scans/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const existing = await prisma.scheduledScan.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Scheduled scan not found' });
        }

        // Delete schedule
        await prisma.scheduledScan.delete({ where: { id } });

        res.json({ message: 'Scheduled scan deleted successfully' });
    } catch (error) {
        console.error('Error deleting scheduled scan:', error);
        res.status(500).json({ error: 'Failed to delete scheduled scan' });
    }
});

const CRON_PRESETS = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Every Sunday at midnight', value: '0 0 * * 0' },
    { label: 'First day of month', value: '0 0 1 * *' }
];

// Get cron presets
router.get('/api/scheduled-scans/presets/cron', (req, res) => {
    res.json({
        presets: CRON_PRESETS,
        examples: {
            'Every hour': '0 * * * *',
            'Every day at midnight': '0 0 * * *',
            'Every Monday at 9 AM': '0 9 * * 1',
            'Every 6 hours': '0 */6 * * *',
            'Every weekday at 8 AM': '0 8 * * 1-5'
        }
    });
});

export default router;
