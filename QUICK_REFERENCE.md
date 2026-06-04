# 🚀 SECORA VAPT PLATFORM - QUICK REFERENCE

## ⚡ 30-Second Start

```bash
# 1. Setup (one time)
chmod +x setup.sh && ./setup.sh

# 2. Start services
docker-compose up -d

# 3. Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

---

## 📋 Essential Commands

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Redis
redis-server

# Database migrations
cd backend && npx prisma migrate dev
```

### Docker
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend

# Rebuild
docker-compose up -d --build
```

### Database
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

---

## 🎯 API Quick Reference

### Authentication
```bash
# Signup
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
# Returns: { token, user }
```

### Targets
```bash
# Create target
POST /api/targets
Authorization: Bearer <token>
{
  "name": "My Target",
  "type": "DOMAIN",
  "value": "example.com"
}

# List targets
GET /api/targets
Authorization: Bearer <token>

# Delete target
DELETE /api/targets/:id
Authorization: Bearer <token>
```

### Scans
```bash
# Start scan
POST /api/scans/start
Authorization: Bearer <token>
{
  "targetId": "uuid",
  "profile": "FULL_VAPT"
}

# Get status
GET /api/scans/:id/status
Authorization: Bearer <token>

# Get findings
GET /api/scans/:id/findings
Authorization: Bearer <token>

# List scans
GET /api/scans
Authorization: Bearer <token>
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/secora"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="<32-char-random-string>"

# Optional
OPENAI_API_KEY="sk-..."
CORS_ORIGIN="http://localhost:3000"
SCAN_CONCURRENCY="2"
```

### Scan Profiles
```javascript
// Quick reconnaissance
{
  "profile": "QUICK_RECON",
  "config": {
    "ports": "common",
    "maxDepth": 1,
    "maxUrls": 50
  }
}

// Full VAPT
{
  "profile": "FULL_VAPT",
  "config": {
    "ports": "top1000",
    "maxDepth": 3,
    "maxUrls": 500,
    "testTypes": ["all"]
  }
}

// Web app only
{
  "profile": "WEB_APP_SCAN",
  "config": {
    "maxDepth": 5,
    "maxUrls": 1000,
    "testTypes": ["headers", "xss", "sqli"]
  }
}
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check dependencies
cd backend && npm install

# Check database
psql -U secora -d secora -c "SELECT 1"

# Check Redis
redis-cli ping

# Check environment
cat .env | grep -v "^#"
```

### Go scanner not working
```bash
# Rebuild
cd backend/scan-engine
go build -o scan-engine main.go
chmod +x scan-engine

# Test
./scan-engine example.com
```

### Database issues
```bash
# Reset and migrate
cd backend
npx prisma migrate reset --force
npx prisma migrate dev --name init
```

### Worker not processing
```bash
# Check Redis connection
redis-cli ping

# Check worker logs
cd backend && npm run dev
# Look for "Worker status: running"

# Check queue
redis-cli KEYS "bull:scans:*"
```

---

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Database Stats
```bash
# Open Prisma Studio
cd backend && npx prisma studio
# Visit: http://localhost:5555
```

### Redis Stats
```bash
redis-cli INFO stats
redis-cli KEYS "*"
```

### Docker Stats
```bash
docker-compose ps
docker stats
```

---

## 🔒 Security Checklist

### Before Production
- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET
- [ ] Set REQUIRE_VERIFICATION=true
- [ ] Configure CORS_ORIGIN properly
- [ ] Enable HTTPS
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Set up monitoring
- [ ] Backup database regularly

### Environment Security
```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Check for exposed secrets
grep -r "sk-" . --exclude-dir=node_modules

# Verify .env is gitignored
git check-ignore .env
```

---

## 📚 File Locations

### Backend
```
backend/
├── src/
│   ├── routes/          # API endpoints
│   ├── engines/         # Scan engines
│   ├── tests/           # Vulnerability tests
│   ├── queue/           # BullMQ workers
│   └── utils/           # Utilities
├── prisma/
│   └── schema.prisma    # Database schema
└── scan-engine/
    └── main.go          # Go port scanner
```

### Frontend
```
frontend/
├── app/
│   ├── targets/         # Target management
│   ├── scans/           # Scan dashboard
│   └── dashboard/       # Main dashboard
└── components/          # React components
```

### Documentation
```
├── SECORA_VAPT_PLATFORM_README.md    # Main guide
├── FINAL_VAPT_PLATFORM_SUMMARY.md    # Summary
├── IMPLEMENTATION_STATUS.md          # Progress
└── QUICK_REFERENCE.md                # This file
```

---

## 🎯 Common Tasks

### Add New Vulnerability Test
```javascript
// 1. Create test file
// backend/src/tests/myTest.js
export async function testMyVuln(endpoint, options) {
    const findings = [];
    // Test logic here
    return findings;
}

// 2. Add to vulnTest.js
import { testMyVuln } from '../tests/myTest.js';

if (shouldRunTest('myvuln', testTypes)) {
    const findings = await testMyVuln(endpoint);
    findings.push(...findings);
}
```

### Add New Scan Profile
```javascript
// Update schema.prisma
enum ScanProfile {
    QUICK_RECON
    FULL_VAPT
    WEB_APP_SCAN
    COMPLIANCE_SNAPSHOT
    MY_CUSTOM_PROFILE  // Add here
}

// Update scanPipeline.js
if (['MY_CUSTOM_PROFILE'].includes(profile)) {
    // Custom scan logic
}
```

### Export Scan Results
```bash
# Get findings as JSON
curl http://localhost:5000/api/scans/$SCAN_ID/findings \
  -H "Authorization: Bearer $TOKEN" \
  > findings.json

# Pretty print
cat findings.json | jq '.'
```

---

## 💡 Pro Tips

1. **Use Docker for development** - Consistent environment
2. **Enable Prisma Studio** - Visual database management
3. **Monitor Redis** - Check queue health regularly
4. **Use scan profiles** - Optimize for your needs
5. **Rate limit wisely** - Balance speed vs safety
6. **Verify targets** - Avoid legal issues
7. **Backup regularly** - Database + scan results
8. **Update CVE database** - Keep vulnerability data fresh
9. **Review findings** - Manual verification recommended
10. **Document custom tests** - For team collaboration

---

## 🆘 Getting Help

### Documentation
- Main README: `SECORA_VAPT_PLATFORM_README.md`
- Architecture: `SECORA_PLATFORM_BUILD.md`
- Status: `IMPLEMENTATION_STATUS.md`

### Logs
```bash
# Backend logs
cd backend && npm run dev

# Docker logs
docker-compose logs -f

# Redis logs
redis-cli MONITOR
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
cd backend && npm run dev
```

---

**Last Updated**: January 16, 2026  
**Version**: 2.0.0  
**Status**: Production-Ready (75%)
