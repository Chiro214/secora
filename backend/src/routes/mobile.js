import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { analyzeAPK } from '../engines/mobileAnalyzer.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for APK uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `mobile-${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.apk') {
            return cb(new Error('Only APK files are allowed'));
        }
        cb(null, true);
    }
});

// POST /api/scans/mobile
router.post('/', upload.single('apk'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No APK file provided' });
        }

        const targetId = req.body.targetId;
        const userId = req.body.userId; // In a real app, this comes from req.user

        if (!targetId || !userId) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'targetId and userId are required' });
        }

        logger.info(`[MobileRoute] Received APK for target ${targetId}`);

        // Create a Scan record
        const scan = await prisma.scan.create({
            data: {
                targetId,
                userId,
                profile: 'FULL_VAPT', // Mobile scan
                status: 'RUNNING',
                startedAt: new Date(),
                progress: 10
            }
        });

        // Send immediate response so client isn't blocked during decompilation
        res.status(202).json({ message: 'Mobile scan started', scanId: scan.id });

        // Run analysis asynchronously
        (async () => {
            try {
                const findings = await analyzeAPK(req.file.path);
                
                // Save findings to database
                for (const f of findings) {
                    await prisma.finding.create({
                        data: {
                            scanId: scan.id,
                            title: f.title,
                            category: f.category,
                            severity: f.severity,
                            cvss: f.cvss || 0.0,
                            description: f.description,
                            remediation: f.remediation,
                            detectedBy: f.detectedBy,
                            status: 'OPEN',
                            evidence: f.evidence
                        }
                    });
                }

                // Complete scan
                await prisma.scan.update({
                    where: { id: scan.id },
                    data: {
                        status: 'COMPLETED',
                        progress: 100,
                        completedAt: new Date()
                    }
                });

            } catch (err) {
                logger.error(`[MobileRoute] Background analysis failed: ${err.message}`);
                await prisma.scan.update({
                    where: { id: scan.id },
                    data: {
                        status: 'FAILED',
                        error: err.message
                    }
                });
            }
        })();

    } catch (err) {
        logger.error(`[MobileRoute] Upload failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to process mobile scan' });
    }
});

export default router;
