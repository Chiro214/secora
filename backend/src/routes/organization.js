import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get current user's organization details
router.get('/me', authenticateToken, async (req, res) => {
    try {
        if (!req.user.orgId) {
            return res.status(404).json({ error: 'User does not belong to an organization' });
        }

        const org = await prisma.organization.findUnique({
            where: { id: req.user.orgId },
            include: {
                users: { select: { id: true, email: true, role: true } }
            }
        });

        res.json(org);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

// Admin ONLY: Invite/Add user to organization
router.post('/users', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
    try {
        const { email, role } = req.body;
        
        if (!email || !role) {
            return res.status(400).json({ error: 'Email and role are required' });
        }

        if (!req.user.orgId) {
            return res.status(400).json({ error: 'Admin must belong to an organization' });
        }

        // In a real system, this would send an invite email. Here we just create the user directly
        // with a default password for MVP.
        const defaultPasswordHash = 'mock-hash-for-invite'; // Needs proper hashing

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash: defaultPasswordHash,
                role,
                orgId: req.user.orgId
            }
        });

        res.status(201).json({ message: 'User added to organization', user: { id: newUser.id, email: newUser.email, role: newUser.role } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add user' });
    }
});

export default router;
