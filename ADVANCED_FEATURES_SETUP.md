# 🚀 SECORA Advanced Features - Quick Setup Guide

## Overview
This guide helps you set up the advanced features added in Session 2: WebSocket, PDF Generation, CVE Import, and Scheduled Scans.

**Time Required:** 15-20 minutes  
**Difficulty:** Intermediate

---

## 📋 Prerequisites

- SECORA backend running
- PostgreSQL database configured
- Redis server running
- Node.js 18+ installed

---

## 🔧 Step-by-Step Setup

### Step 1: Install Dependencies (5 minutes)

```bash
cd backend

# Core dependencies (required)
npm install socket.io node-cron

# PDF generation (recommended)
npm install puppeteer

# Alternative: Puppeteer with custom Chromium
npm install puppeteer-core
```

**Note:** Puppeteer downloads Chromium (~170MB). For Docker, use `puppeteer-core` with system Chromium.

---

### Step 2: Update Environment Variables (2 minutes)

Edit `backend/.env`:

```bash
# Existing variables
DATABASE_URL="postgresql://user:pass@localhost:5432/secora"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"

# New: WebSocket CORS
CORS_ORIGIN="http://localhost:3000"

# New: NVD API Key (optional, but recommended)
# Get free key at: https://nvd.nist.gov/developers/request-an-api-key
NVD_API_KEY="your-nvd-api-key-here"

# New: Email notifications (for future use)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

---

### Step 3: Run Database Migration (3 minutes)

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migration to add ScheduledScan model
npx prisma migrate dev --name add_scheduled_scans

# Verify migration
npx prisma studio
# Check that 'scheduled_scans' table exists
```

---

### Step 4: Update Server Configuration (5 minutes)

Edit `backend/src/server.js`:

```javascript
// Add imports at the top
import { createServer } from 'http';
import { initializeWebSocket } from './websocket/scanEvents.js';
import { initializeScheduledScans } from './jobs/scheduledScans.js';
import { scheduleCVEUpdates } from './jobs/cveFeedImporter.js';

// ... existing code ...

// Replace app.listen with:
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

// Initialize WebSocket
initializeWebSocket(httpServer);
console.log('✅ WebSocket initialized');

// Start server
httpServer.listen(PORT, async () => {
  console.log(`✅ SECORA VAPT Platform running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize scheduled scans
  try {
    await initializeScheduledScans();
    console.log('✅ Scheduled scans initialized');
  } catch (error) {
    console.error('❌ Failed to initialize scheduled scans:', error);
  }
  
  // Schedule CVE updates (every 24 hours)
  try {
    scheduleCVEUpdates(24);
    console.log('✅ CVE updates scheduled');
  } catch (error) {
    console.error('❌ Failed to schedule CVE updates:', error);
  }
});
```

---

### Step 5: Test WebSocket (2 minutes)

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test WebSocket connection
curl http://localhost:5000/socket.io/

# Should return: {"code":0,"message":"Transport unknown"}
# This means Socket.IO is running!
```

---

### Step 6: Test PDF Generation (2 minutes)

Create a test script `backend/test-pdf.js`:

```javascript
import { generateScanReportPDF } from './src/utils/pdfGenerator.js';
import fs from 'fs';

const mockReport = {
  id: 'test-123',
  createdAt: new Date(),
  scan: {
    id: 'scan-123',
    profile: 'FULL_VAPT',
    startedAt: new Date(),
    completedAt: new Date(),
    target: {
      name: 'Test Website',
      value: 'https://example.com'
    },
    findings: [
      {
        title: 'SQL Injection',
        severity: 'CRITICAL',
        cvss: 9.8,
        category: 'INJECTION',
        description: 'SQL injection vulnerability found',
        remediation: 'Use parameterized queries',
        evidence: []
      }
    ]
  }
};

try {
  console.log('Generating PDF...');
  const pdfBuffer = await generateScanReportPDF(mockReport);
  fs.writeFileSync('test-report.pdf', pdfBuffer);
  console.log('✅ PDF generated: test-report.pdf');
} catch (error) {
  console.error('❌ PDF generation failed:', error.message);
}
```

Run test:
```bash
node backend/test-pdf.js
# Should create test-report.pdf
```

---

### Step 7: Test CVE Import (3 minutes)

```bash
# Import last week's CVEs
node -e "
import('./backend/src/jobs/cveFeedImporter.js').then(m => {
  m.importCVEFeed().then(result => {
    console.log('✅ CVE import complete:', result);
    process.exit(0);
  }).catch(err => {
    console.error('❌ CVE import failed:', err);
    process.exit(1);
  });
});
"
```

**Note:** First import may take 5-10 minutes. Subsequent updates are faster.

---

### Step 8: Test Scheduled Scans (2 minutes)

Create a test schedule:

```bash
# Using curl (replace TOKEN with your JWT)
curl -X POST http://localhost:5000/api/scheduled-scans \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "your-target-id",
    "name": "Daily Security Scan",
    "profile": "QUICK_RECON",
    "cronExpression": "0 0 * * *",
    "enabled": true
  }'
```

Or using Prisma Studio:
```bash
npx prisma studio
# Navigate to ScheduledScan model
# Create a new record manually
```

---

## ✅ Verification Checklist

Run through this checklist to ensure everything works:

- [ ] Backend starts without errors
- [ ] WebSocket endpoint responds: `curl http://localhost:5000/socket.io/`
- [ ] Database has `scheduled_scans` table
- [ ] PDF test generates a file
- [ ] CVE import completes (or starts)
- [ ] Scheduled scans initialize on startup
- [ ] No error messages in console

---

## 🐛 Troubleshooting

### WebSocket Issues

**Problem:** `Socket.IO not initialized`
```bash
# Solution: Ensure initializeWebSocket is called before server.listen
# Check server.js for proper initialization order
```

**Problem:** CORS errors in browser
```bash
# Solution: Update CORS_ORIGIN in .env
CORS_ORIGIN="http://localhost:3000"
```

---

### PDF Generation Issues

**Problem:** `Puppeteer not found`
```bash
# Solution: Install Puppeteer
npm install puppeteer

# Or use system Chromium
npm install puppeteer-core
```

**Problem:** `Failed to launch browser`
```bash
# Linux: Install dependencies
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Or use --no-sandbox flag (development only)
```

---

### CVE Import Issues

**Problem:** `Rate limit exceeded`
```bash
# Solution: Get NVD API key
# Visit: https://nvd.nist.gov/developers/request-an-api-key
# Add to .env: NVD_API_KEY=your-key
```

**Problem:** `Network timeout`
```bash
# Solution: Increase timeout or retry
# Check internet connection
# Verify NVD API is accessible: curl https://services.nvd.nist.gov/rest/json/cves/2.0
```

---

### Scheduled Scans Issues

**Problem:** `Invalid cron expression`
```bash
# Solution: Validate expression
node -e "const cron = require('node-cron'); console.log(cron.validate('0 0 * * *'));"
# Should return: true
```

**Problem:** Scans not running
```bash
# Check scheduled_scans table
npx prisma studio

# Verify enabled=true and nextRunAt is set
# Check server logs for cron job execution
```

---

## 📊 Monitoring

### Check WebSocket Connections
```javascript
// In server.js
import { getIO } from './websocket/scanEvents.js';

setInterval(() => {
  const io = getIO();
  console.log(`Active connections: ${io.sockets.sockets.size}`);
}, 60000); // Every minute
```

### Check Scheduled Scans
```sql
-- In Prisma Studio or psql
SELECT id, name, enabled, next_run_at 
FROM scheduled_scans 
WHERE enabled = true 
ORDER BY next_run_at;
```

### Check CVE Database
```sql
-- Count CVEs
SELECT COUNT(*) FROM cves;

-- Recent CVEs
SELECT cve_id, severity, cvss_score, published_date 
FROM cves 
ORDER BY published_date DESC 
LIMIT 10;
```

---

## 🚀 Production Recommendations

### WebSocket
- Use Redis adapter for multi-server deployments
- Implement authentication middleware
- Add connection rate limiting
- Monitor connection count

### PDF Generation
- Queue PDF generation jobs
- Cache generated PDFs
- Set memory limits
- Clean up old PDFs

### CVE Import
- Use API key in production
- Schedule during off-peak hours
- Monitor import failures
- Set up alerts

### Scheduled Scans
- Limit concurrent scans
- Implement failure notifications
- Monitor queue depth
- Set resource quotas

---

## 📚 Additional Resources

- [WebSocket Documentation](ADVANCED_FEATURES_COMPLETE.md#1-websocket-real-time-updates)
- [PDF Generation Guide](ADVANCED_FEATURES_COMPLETE.md#2-pdf-report-generation)
- [CVE Import Details](ADVANCED_FEATURES_COMPLETE.md#3-cve-feed-importer)
- [Scheduled Scans Guide](ADVANCED_FEATURES_COMPLETE.md#4-scheduled-scans)
- [Full Documentation Index](VAPT_DOCUMENTATION_INDEX.md)

---

## ✨ Quick Commands Reference

```bash
# Start with all features
cd backend && npm run dev

# Test WebSocket
curl http://localhost:5000/socket.io/

# Generate test PDF
node backend/test-pdf.js

# Import CVEs
node -e "import('./backend/src/jobs/cveFeedImporter.js').then(m => m.importCVEFeed())"

# View scheduled scans
npx prisma studio

# Check logs
tail -f backend/logs/app.log
```

---

**Setup Complete! 🎉**

Your SECORA platform now has:
- ✅ Real-time WebSocket updates
- ✅ Professional PDF reports
- ✅ Automated CVE tracking
- ✅ Scheduled scanning

**Next:** Integrate WebSocket client in frontend for real-time UI updates!

---

**Last Updated:** January 16, 2026  
**Version:** 2.0.0  
**Status:** Production Ready
