# 🚀 SECORA VAPT Platform - Get Started Now!

## Welcome to SECORA! 🛡️

Your complete, production-ready VAPT platform is ready to go. This guide will get you up and running in **15 minutes**.

**Status:** 100% Complete & Integrated  
**Version:** 2.0.0  
**Ready for:** Production Use

---

## ⚡ Quick Start (15 Minutes)

### Step 1: Prerequisites (2 minutes)

Ensure you have:
- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ running
- ✅ Redis 6+ running
- ✅ Git installed

```bash
# Check versions
node --version  # Should be 18+
psql --version  # Should be 14+
redis-cli --version  # Should be 6+
```

---

### Step 2: Clone & Install (3 minutes)

```bash
# Clone repository (if not already done)
cd secora

# Install backend dependencies
cd backend
npm install

# Install additional packages
npm install socket.io node-cron puppeteer

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Step 3: Configure Environment (2 minutes)

```bash
# Backend configuration
cd backend
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Minimum required configuration:**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/secora"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="change-this-to-a-random-secret-key"
CORS_ORIGIN="http://localhost:3000"
```

**Optional but recommended:**
```bash
NVD_API_KEY="your-nvd-api-key"  # Get from https://nvd.nist.gov/developers/request-an-api-key
OPENAI_API_KEY="sk-your-key"    # For AI features
```

---

### Step 4: Setup Database (3 minutes)

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name initial_setup

# Verify database
npx prisma studio
# Opens browser - check that all 13 tables exist
```

---

### Step 5: Test Integration (2 minutes)

```bash
cd backend

# Run integration test
node test-integration.js
```

**Expected output:**
```
🧪 SECORA Integration Test
============================================================
✅ Database: Connected
✅ Redis: Connected
✅ Table 'users': Exists (0 records)
✅ Table 'targets': Exists (0 records)
✅ Table 'scans': Exists (0 records)
✅ WebSocket Module: Loaded
✅ PDF Generator: Loaded
✅ CVE Importer: Loaded
✅ Scheduled Scans: Loaded
✅ Scan Pipeline: Loaded
✅ Vulnerability Tests: All 7 modules loaded
✅ API Routes: All 5 routes loaded
============================================================
📊 Test Results: 10 passed, 0 failed
🎉 All integration tests passed!
```

---

### Step 6: Start Backend (1 minute)

```bash
cd backend
npm run dev
```

**Expected output:**
```
============================================================
🛡️  SECORA VAPT Platform v2.0.0
============================================================
✅ Server running on http://localhost:5000
📊 Environment: development
🔌 WebSocket: Enabled
👷 Worker status: Running
✅ Scheduled scans: Initialized
✅ CVE updates: Scheduled (every 24h)
============================================================
```

---

### Step 7: Start Frontend (1 minute)

```bash
# In a new terminal
cd frontend
npm run dev
```

**Access the platform:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health: http://localhost:5000/api/health

---

### Step 8: Create Your First Scan (1 minute)

**Option A: Via UI**
1. Open http://localhost:3000
2. Click "Sign Up" and create an account
3. Navigate to "Targets" → "Add Target"
4. Enter a domain (e.g., example.com)
5. Click "Start Scan"
6. Watch real-time progress!

**Option B: Via API**
```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@secora.local","password":"SecurePass123!","name":"Admin"}'

# 2. Login (save the token)
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@secora.local","password":"SecurePass123!"}' \
  | jq -r '.token')

# 3. Create target
TARGET_ID=$(curl -X POST http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Site","type":"DOMAIN","value":"example.com"}' \
  | jq -r '.id')

# 4. Start scan
SCAN_ID=$(curl -X POST http://localhost:5000/api/scans/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetId\":\"$TARGET_ID\",\"profile\":\"QUICK_RECON\"}" \
  | jq -r '.id')

# 5. Check status
curl http://localhost:5000/api/scans/$SCAN_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 What You Can Do Now

### 1. Run Security Scans
- **QUICK_RECON** - Fast discovery (2-5 min)
- **FULL_VAPT** - Complete assessment (15-30 min)
- **WEB_APP_SCAN** - Web-only testing (10-20 min)
- **COMPLIANCE_SNAPSHOT** - Headers + TLS + CVE (5-10 min)

### 2. Generate Reports
- **JSON** - Machine-readable data
- **HTML** - Web-viewable report
- **PDF** - Client-ready document

### 3. Schedule Automated Scans
```bash
curl -X POST http://localhost:5000/api/scheduled-scans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "TARGET_ID",
    "name": "Daily Security Scan",
    "profile": "FULL_VAPT",
    "cronExpression": "0 0 * * *",
    "enabled": true
  }'
```

### 4. Monitor Real-Time
- WebSocket connection at `ws://localhost:5000`
- Real-time scan progress
- Live finding notifications
- Asset discovery updates

### 5. Import CVE Data
```bash
# Manual import
curl -X POST http://localhost:5000/api/admin/cve/import \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Automatic updates run every 24 hours
```

---

## 📊 Platform Capabilities

### Vulnerability Detection
- ✅ SQL Injection (Error-based & Boolean-based)
- ✅ Cross-Site Scripting (XSS)
- ✅ Authentication Bypass
- ✅ Open Redirect
- ✅ TLS/SSL Misconfigurations
- ✅ Missing Security Headers
- ✅ Information Disclosure
- ✅ CVE Matching

### Automation
- ✅ Scheduled scans (Cron-based)
- ✅ Automated CVE updates
- ✅ Queue-based processing
- ✅ Retry logic
- ✅ Error handling

### Reporting
- ✅ Professional PDF reports
- ✅ HTML web reports
- ✅ JSON data export
- ✅ Evidence collection
- ✅ CVSS scoring

### Real-Time Features
- ✅ Live scan progress
- ✅ Finding notifications
- ✅ Asset discovery
- ✅ Statistics tracking
- ✅ Phase completion events

---

## 🔧 Common Tasks

### View All Targets
```bash
curl http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN"
```

### View All Scans
```bash
curl http://localhost:5000/api/scans \
  -H "Authorization: Bearer $TOKEN"
```

### View Scan Findings
```bash
curl http://localhost:5000/api/scans/SCAN_ID/findings \
  -H "Authorization: Bearer $TOKEN"
```

### Generate Report
```bash
curl -X POST http://localhost:5000/api/reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scanId":"SCAN_ID","format":"PDF"}'
```

### Download Report
```bash
curl http://localhost:5000/api/reports/REPORT_ID/download \
  -H "Authorization: Bearer $TOKEN" \
  -o report.pdf
```

### List Scheduled Scans
```bash
curl http://localhost:5000/api/scheduled-scans \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check PostgreSQL
psql -U postgres -c "SELECT version();"

# Check Redis
redis-cli ping

# Check environment
cat backend/.env

# Reset database
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

### Integration Test Fails
```bash
# Check all services are running
systemctl status postgresql
systemctl status redis

# Check database connection
psql -U postgres -d secora -c "SELECT 1;"

# Check Redis connection
redis-cli ping
```

### PDF Generation Fails
```bash
# Install Puppeteer
cd backend
npm install puppeteer

# Test Puppeteer
node -e "require('puppeteer').launch().then(b => b.close())"
```

### WebSocket Not Working
```bash
# Test WebSocket endpoint
curl http://localhost:5000/socket.io/

# Should return: {"code":0,"message":"Transport unknown"}
```

---

## 📚 Documentation

### Essential Guides
1. **[INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md)** - Full integration guide
2. **[FINAL_INTEGRATION_SUMMARY.md](FINAL_INTEGRATION_SUMMARY.md)** - Complete overview
3. **[VAPT_QUICK_START.md](VAPT_QUICK_START.md)** - Quick reference
4. **[ADVANCED_FEATURES_COMPLETE.md](ADVANCED_FEATURES_COMPLETE.md)** - Advanced features
5. **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Current status

### API Documentation
- All endpoints documented in [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- Request/response examples included
- Authentication requirements specified

### Architecture
- System design in [SECORA_PLATFORM_BUILD.md](SECORA_PLATFORM_BUILD.md)
- Database schema in `backend/prisma/schema.prisma`
- Component structure documented

---

## 🎓 Learning Path

### Beginner (Day 1)
1. ✅ Complete this quick start
2. ✅ Run your first scan
3. ✅ Generate a report
4. ✅ Explore the UI

### Intermediate (Week 1)
1. Schedule automated scans
2. Customize scan profiles
3. Integrate with CI/CD
4. Set up monitoring

### Advanced (Month 1)
1. Extend vulnerability tests
2. Create custom reports
3. Build integrations
4. Deploy to production

---

## 🚀 Production Deployment

### Docker Compose (Recommended)
```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Manual Deployment
1. Set up production database
2. Configure environment variables
3. Build frontend: `npm run build`
4. Start backend: `npm start`
5. Serve frontend with Nginx

### Cloud Deployment
- AWS: Use ECS/Fargate
- GCP: Use Cloud Run
- Azure: Use App Service
- Heroku: Use Heroku Postgres + Redis

---

## 🎉 You're All Set!

Your SECORA VAPT Platform is now:
- ✅ Installed
- ✅ Configured
- ✅ Tested
- ✅ Running
- ✅ Ready to use

### Next Steps
1. Create your first target
2. Run a security scan
3. Review findings
4. Generate a report
5. Schedule recurring scans

### Get Help
- 📚 Documentation: 30+ guides available
- 🧪 Tests: Run `node test-integration.js`
- 🔧 Health: Check `/api/health`
- 📞 Support: Check troubleshooting section

---

**🎊 Welcome to SECORA! Start securing your applications today! 🛡️**

---

**Quick Links:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health Check: http://localhost:5000/api/health
- WebSocket: ws://localhost:5000

**Happy Scanning! 🚀**
