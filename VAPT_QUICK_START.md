# 🚀 SECORA VAPT Platform - Quick Start Guide

## 30-Second Overview
SECORA is a production-grade VAPT (Vulnerability Assessment and Penetration Testing) platform that scans web applications for security vulnerabilities, generates professional reports, and provides actionable remediation steps.

**Current Status:** 85% MVP Complete | 8 Vulnerability Tests | JSON/HTML Reports

---

## ⚡ Quick Setup (5 Minutes)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Go 1.19+ (optional, for network scanner)

### 1. Clone & Install
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment
```bash
# backend/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/secora"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-key-change-this"
OPENAI_API_KEY="sk-your-key-here"
```

### 3. Start Services
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### 4. Access Platform
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

---

## 🎯 First Scan in 60 Seconds

### Via API
```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@secora.local","password":"SecurePass123!","name":"Admin"}'

# 2. Login (save the token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@secora.local","password":"SecurePass123!"}'

# 3. Create Target
curl -X POST http://localhost:5000/api/targets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Site","type":"DOMAIN","value":"example.com"}'

# 4. Start Scan
curl -X POST http://localhost:5000/api/scans/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetId":"TARGET_ID","profile":"QUICK_RECON"}'

# 5. Check Results
curl http://localhost:5000/api/scans/SCAN_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Via UI
1. Open http://localhost:3000
2. Click "Sign Up" → Create account
3. Navigate to "Targets" → "Add Target"
4. Enter domain → Click "Create"
5. Click "Start Scan" → Select profile → "Launch"
6. View results in real-time

---

## 🔍 What Gets Scanned

### Vulnerability Tests (8 Modules)
1. **SQL Injection** - Error-based & Boolean-based
2. **Cross-Site Scripting (XSS)** - Reflected XSS
3. **Authentication Bypass** - Method/Header/Path manipulation
4. **Open Redirect** - Unvalidated redirects
5. **Security Headers** - 10+ critical headers
6. **TLS/SSL Configuration** - Weak protocols & certificates
7. **Information Disclosure** - Sensitive files
8. **CVE Matching** - Known vulnerabilities

### Scan Profiles
- **QUICK_RECON** (2-5 min) - Fast discovery
- **FULL_VAPT** (15-30 min) - Complete assessment
- **WEB_APP_SCAN** (10-20 min) - Web-only tests
- **COMPLIANCE_SNAPSHOT** (5-10 min) - Headers + TLS + CVE

---

## 📊 Report Generation

### Generate Report
```bash
curl -X POST http://localhost:5000/api/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scanId":"SCAN_ID","format":"HTML"}'
```

### Download Report
```bash
curl http://localhost:5000/api/reports/REPORT_ID/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o report.html
```

### Available Formats
- **JSON** - Machine-readable, complete data
- **HTML** - Professional styled report
- **PDF** - Coming soon (Puppeteer integration)

---

## 🛠️ Common Tasks

### View All Targets
```bash
curl http://localhost:5000/api/targets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View All Scans
```bash
curl http://localhost:5000/api/scans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Scan Findings
```bash
curl http://localhost:5000/api/scans/SCAN_ID/findings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete Target
```bash
curl -X DELETE http://localhost:5000/api/targets/TARGET_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Troubleshooting

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

### Worker Not Processing
```bash
# Check Redis connection
redis-cli ping

# Check worker status
curl http://localhost:5000/api/health

# Restart backend
cd backend && npm run dev
```

### Go Scanner Not Found
```bash
# Build scanner
cd backend/scan-engine
go build -o scan-engine main.go
chmod +x scan-engine

# Test scanner
./scan-engine -h
```

### Frontend Build Errors
```bash
# Clear cache
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

---

## 📁 Project Structure

```
secora/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.js      # Authentication
│   │   │   ├── targets.js   # Target management
│   │   │   ├── scans.js     # Scan management
│   │   │   └── reports.js   # Report generation
│   │   ├── engines/         # Scan orchestration
│   │   │   ├── scanPipeline.js
│   │   │   ├── networkScan.js
│   │   │   ├── webCrawler.js
│   │   │   ├── vulnTest.js
│   │   │   ├── cveMatch.js
│   │   │   └── correlation.js
│   │   ├── tests/           # Vulnerability tests
│   │   │   ├── sqlTest.js
│   │   │   ├── xssTest.js
│   │   │   ├── authBypass.js
│   │   │   ├── openRedirect.js
│   │   │   ├── tlsConfig.js
│   │   │   ├── securityHeaders.js
│   │   │   └── infoDisclosure.js
│   │   ├── queue/           # Job processing
│   │   └── utils/           # Helpers
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── scan-engine/
│       └── main.go          # Go network scanner
│
├── frontend/
│   ├── app/                 # Next.js pages
│   │   ├── targets/
│   │   ├── scans/
│   │   ├── reports/
│   │   └── scan/[id]/
│   ├── components/
│   │   ├── findings/        # Findings UI
│   │   │   ├── FindingsTable.tsx
│   │   │   └── EvidenceViewer.tsx
│   │   ├── scan/            # Scan UI
│   │   └── ui/              # Shared components
│   └── lib/
│       └── api.ts           # API client
│
└── docs/
    ├── IMPLEMENTATION_STATUS.md
    ├── VAPT_PLATFORM_COMPLETION_SUMMARY.md
    └── VAPT_QUICK_START.md (this file)
```

---

## 🎓 Key Concepts

### Targets
- Domains, IPs, or URLs to scan
- Verified ownership (DNS TXT or file upload)
- Organized by user

### Scans
- Vulnerability assessments of targets
- Multiple profiles available
- Queue-based execution
- Real-time progress tracking

### Findings
- Individual vulnerabilities discovered
- Severity: CRITICAL, HIGH, MEDIUM, LOW, INFO
- CVSS scoring
- Evidence attached
- Remediation steps included

### Reports
- Generated from completed scans
- Multiple formats (JSON, HTML, PDF)
- Professional formatting
- Downloadable

---

## 🔒 Security Best Practices

### For Scanning
- ✅ Always verify target ownership
- ✅ Use appropriate scan profiles
- ✅ Respect rate limits
- ✅ Scan during maintenance windows
- ❌ Never scan without permission
- ❌ Don't use aggressive profiles on production

### For Deployment
- ✅ Change default JWT secret
- ✅ Use strong database passwords
- ✅ Enable HTTPS in production
- ✅ Set up firewall rules
- ✅ Regular security updates
- ❌ Don't expose Redis publicly
- ❌ Don't commit .env files

---

## 📈 Performance Tips

### Optimize Scans
- Use QUICK_RECON for initial assessment
- Schedule FULL_VAPT during off-peak hours
- Limit concurrent scans per user
- Enable Redis caching

### Scale Backend
- Use Redis cluster for high load
- Deploy multiple worker instances
- Use PostgreSQL read replicas
- Implement CDN for frontend

---

## 🆘 Getting Help

### Documentation
- **Setup Guide:** `SECORA_VAPT_PLATFORM_README.md`
- **Architecture:** `SECORA_PLATFORM_BUILD.md`
- **Testing:** `TESTING_GUIDE.md`
- **Status:** `IMPLEMENTATION_STATUS.md`
- **Summary:** `VAPT_PLATFORM_COMPLETION_SUMMARY.md`

### Health Checks
```bash
# Backend health
curl http://localhost:5000/api/health

# Database connection
npx prisma studio

# Redis connection
redis-cli ping

# Worker status
curl http://localhost:5000/api/health | jq '.services.worker'
```

### Logs
```bash
# Backend logs
cd backend && npm run dev

# Frontend logs
cd frontend && npm run dev

# Redis logs
redis-cli monitor

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 🎯 Next Steps

### After Setup
1. ✅ Create your first target
2. ✅ Run a QUICK_RECON scan
3. ✅ Review findings
4. ✅ Generate HTML report
5. ✅ Implement fixes
6. ✅ Re-scan to verify

### Advanced Usage
- Configure scheduled scans
- Set up email notifications
- Integrate with CI/CD
- Create custom scan profiles
- Export to JIRA/GitHub Issues

### Production Deployment
- Set up Docker Compose
- Configure reverse proxy (Nginx)
- Enable SSL/TLS
- Set up monitoring (Prometheus)
- Configure backups
- Implement log aggregation

---

## 📞 Quick Reference

### Default Ports
- Frontend: 3000
- Backend: 5000
- PostgreSQL: 5432
- Redis: 6379

### Default Credentials
- Database: `postgres:postgres`
- Redis: No password (local only)
- Admin: Create via signup

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/secora
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-secret
OPENAI_API_KEY=sk-your-key
PORT=5000
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🎉 Success Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] PostgreSQL connected
- [ ] Redis connected
- [ ] User registered
- [ ] Target created
- [ ] Scan completed
- [ ] Report generated
- [ ] Findings reviewed

**Congratulations! You're ready to use SECORA VAPT Platform! 🛡️**

---

**Last Updated:** January 16, 2026  
**Version:** 2.0.0  
**Status:** 85% MVP Complete
