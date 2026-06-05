// backend/src/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import morgan from "morgan";
import { logger } from "./utils/logger.js";

// Legacy routes
import { scanTarget } from "./utils/scan.js";
import aiRemediateRoute from "./routes/aiRemediate.js";
import reportRoutes from './routes/reports.js';
import templateRoutes from './routes/templates.js';
import reportRoute from "./routes/report.js";
import summarizeRoute from "./routes/summarize.js";
import authRoute from "./routes/auth.js";
import repeaterRoute from "./routes/repeater.js";

// New VAPT platform routes
import targetsRoute from "./routes/targets.js";
import scansRoute from "./routes/scans.js";
import scheduledScansRoute from "./routes/scheduledScans.js";
import mobileRoute from "./routes/mobile.js";
import commentsRoute from "./routes/comments.js";
import organizationRoute from "./routes/organization.js";
import { startScheduledJobs } from './jobs/scheduledScans.js';

// Workers
import { scanWorker } from "./queue/scanQueue.js";

// WebSocket
import { initializeWebSocket } from "./websocket/scanEvents.js";


import { scheduleCVEUpdates } from "./jobs/cveFeedImporter.js";

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow localhost, any vercel.app preview URL, or the explicitly defined CORS_ORIGIN
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost') || origin === process.env.CORS_ORIGIN) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Request logging with Morgan and Winston
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 🧠 Health check endpoint
app.get("/api/health", async (_req, res) => {
  // Check puppeteer
  let puppeteerStatus = "offline";
  try {
    const puppeteer = await import('puppeteer');
    puppeteerStatus = "available";
  } catch (e) {
    puppeteerStatus = "unavailable (installing puppeteer recommended)";
  }

  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV || "development",
    version: "2.0.0",
    services: {
      database: "connected",
      redis: "connected",
      worker: scanWorker.isRunning() ? "running" : "stopped",
      puppeteer: puppeteerStatus,
      oast: process.env.OAST_MODE === 'production' ? process.env.OAST_DOMAIN : 'localhost (active)'
    }
  });
});

// 🔍 Legacy scan endpoint (backward compatibility)
app.post("/scan", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const result = await scanTarget(url);

    const dir = path.resolve("scan-results");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info("📁 Created scan-results directory");
    }

    const safeName = encodeURIComponent(url);
    const timestamp = Date.now();
    const file = path.join(dir, `${safeName}-${timestamp}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));

    logger.info(`✅ Scan saved: ${file}`);
    res.json({ ...result, scanId: `${safeName}-${timestamp}` });
  } catch (e) {
    logger.error(`❌ Scan error: ${e.message}`, e);
    res.status(500).json({ error: e?.message || "Scan failed" });
  }
});

// 📊 Legacy get scan results
app.get("/api/scan/:scanId", async (req, res) => {
  const { scanId } = req.params;
  
  try {
    const dir = path.resolve("scan-results");
    const file = path.join(dir, `${scanId}.json`);
    
    if (!fs.existsSync(file)) {
      return res.status(404).json({ error: "Scan not found" });
    }
    
    const data = fs.readFileSync(file, "utf-8");
    const result = JSON.parse(data);
    res.json(result);
  } catch (e) {
    logger.error(`❌ Error fetching scan: ${e.message}`, e);
    res.status(500).json({ error: e?.message || "Failed to fetch scan" });
  }
});

// 🧩 Attach routes
app.use(authRoute);
app.use(targetsRoute);
app.use(scansRoute);
app.use("/api/scans/mobile", mobileRoute);
app.use(reportRoutes);
app.use("/api/comments", commentsRoute);
app.use("/api/organization", organizationRoute);
app.use(scheduledScansRoute);
app.use(aiRemediateRoute);
app.use(reportRoute);
app.use(summarizeRoute);
app.use('/api/repeater', repeaterRoute);
app.use('/api/templates', templateRoutes);
app.use('/api/iast', (await import('./routes/iast.js')).default);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled Server Error: ${err.message}`, err);
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// 🚀 Start backend with all features
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

// Initialize WebSocket
const io = initializeWebSocket(httpServer);
logger.info('✅ WebSocket initialized');

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error('Port already in use');
    process.exit(1);
  }
});

// Start server
httpServer.listen(PORT, async () => {
  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`🛡️  SECORA VAPT Platform v2.0.0`);
  logger.info(`${'='.repeat(60)}`);
  logger.info(`✅ Server running on http://localhost:${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔌 WebSocket: Enabled`);
  logger.info(`👷 Worker status: ${scanWorker.isRunning() ? 'Running' : 'Stopped'}`);
  
  
  // Schedule CVE updates (every 24 hours)
  try {
    const cveUpdateInterval = parseInt(process.env.CVE_UPDATE_INTERVAL_HOURS) || 24;
    scheduleCVEUpdates(cveUpdateInterval);
    logger.info(`✅ CVE updates: Scheduled (every ${cveUpdateInterval}h)`);
  } catch (error) {
    logger.error(`❌ Failed to schedule CVE updates: ${error.message}`);
  }

  // Start Attack Surface Management Jobs
  try {
    startScheduledJobs();
  } catch (err) {
    logger.error(`❌ Failed to start scheduled jobs: ${err.message}`);
  }
  
  logger.info(`${'='.repeat(60)}\n`);
  logger.info('📡 Available endpoints:');
  logger.info('   - GET  /api/health          - Health check');
  logger.info('   - POST /api/auth/register   - User registration');
  logger.info('   - POST /api/auth/login      - User login');
  logger.info('   - GET  /api/targets         - List targets');
  logger.info('   - POST /api/targets         - Create target');
  logger.info('   - POST /api/scans/start     - Start scan');
  logger.info('   - GET  /api/scans/:id       - Get scan details');
  logger.info('   - POST /api/reports/generate - Generate report');
  logger.info('   - GET  /socket.io/          - WebSocket endpoint');
  logger.info(`\n${'='.repeat(60)}\n`);
});
