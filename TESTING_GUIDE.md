# 🧪 SECORA VAPT PLATFORM - Testing Guide

## Complete End-to-End Testing Instructions

---

## 🚀 PHASE 1: Setup & Installation Test

### 1.1 Prerequisites Check
```bash
# Check Node.js
node --version  # Should be 20+

# Check npm
npm --version   # Should be 10+

# Check Go
go version      # Should be 1.21+

# Check PostgreSQL
psql --version  # Should be 15+

# Check Redis
redis-cli --version  # Should be 7+
```

### 1.2 Run Setup Script
```bash
chmod +x setup.sh
./setup.sh

# Expected output:
# ✓ Node.js installed
# ✓ npm installed
# ✓ Go installed
# ✓ .env file created
# ✓ Backend dependencies installed
# ✓ Prisma client generated
# ✓ Go scanner built
# ✓ Frontend dependencies installed
```

### 1.3 Verify Installation
```bash
# Check backend dependencies
cd backend && npm list bullmq ioredis jsdom

# Check Go scanner
cd backend/scan-engine && ./scan-engine example.com

# Check Prisma
cd backend && npx prisma --version
```

---

## 🔧 PHASE 2: Service Startup Test

### 2.1 Start PostgreSQL
```bash
# Option 1: Local
sudo service postgresql start

# Option 2: Docker
docker run -d -p 5432:5432 \
  -e POSTGRES_DB=secora \
  -e POSTGRES_USER=secora \
  -e POSTGRES_PASSWORD=secora_password \
  postgres:15-alpine

# Verify
psql -U secora -d secora -c "SELECT 1"
```

### 2.2 Start Redis
```bash
# Option 1: Local
redis-server

# Option 2: Docker
docker run -d -p 6379:6379 redis:7-alpine

# Verify
redis-cli ping  # Should return PONG
```

### 2.3 Start Backend
```bash
cd backend
npm run dev

# Expected output:
# ✅ Secora VAPT Platform running on http://localhost:5000
# 📊 Environment: development
# 👷 Worker status: running
```

### 2.4 Test Backend Health
```bash
curl http://localhost:5000/api/health

# Expected response:
# {
#   "status": "ok",
#   "env": "development",
#   "version": "2.0.0",
#   "services": {
#     "database": "connected",
#     "redis": "connected",
#     "worker": "running"
#   }
# }
```

### 2.5 Start Frontend
```bash
cd frontend
npm run dev

# Visit: http://localhost:3000
```

---

## 🔐 PHASE 3: Authentication Test

### 3.1 User Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@secora.local",
    "password": "TestPassword123!"
  }'

# Expected response:
# {
#   "message": "User created. Please check email to verify."
# }
```

### 3.2 User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@secora.local",
    "password": "TestPassword123!"
  }'

# Expected response:
# {
#   "message": "Login successful",
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "uuid",
#     "email": "test@secora.local"
#   }
# }

# Save token for next tests
export TOKEN="<paste-token-here>"
```

### 3.3 Test Protected Route
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "id": "uuid",
#   "email": "test@secora.local"
# }
```

---

## 🎯 PHASE 4: Target Management Test

### 4.1 Create Target (Domain)
```bash
curl -X POST http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Domain",
    "type": "DOMAIN",
    "value": "example.com",
    "description": "Test target for scanning"
  }'

# Expected response:
# {
#   "id": "target-uuid",
#   "name": "Test Domain",
#   "type": "DOMAIN",
#   "value": "example.com",
#   "verified": false,
#   "createdAt": "2026-01-16T..."
# }

# Save target ID
export TARGET_ID="<paste-target-id>"
```

### 4.2 List Targets
```bash
curl http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN"

# Expected: Array of targets
```

### 4.3 Get Target Details
```bash
curl http://localhost:5000/api/targets/$TARGET_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: Target with assets and scans
```

### 4.4 Create Invalid Target (Should Fail)
```bash
# Test private IP blocking
curl -X POST http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Target",
    "type": "IP",
    "value": "192.168.1.1"
  }'

# Expected response:
# {
#   "error": "Private IP addresses are not allowed"
# }
```

---

## 🔍 PHASE 5: Scanning Test

### 5.1 Start Quick Recon Scan
```bash
curl -X POST http://localhost:5000/api/scans/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "'$TARGET_ID'",
    "profile": "QUICK_RECON",
    "config": {
      "ports": "common",
      "maxDepth": 1,
      "maxUrls": 50
    }
  }'

# Expected response:
# {
#   "id": "scan-uuid",
#   "status": "QUEUED",
#   "profile": "QUICK_RECON",
#   "progress": 0,
#   "target": { ... }
# }

# Save scan ID
export SCAN_ID="<paste-scan-id>"
```

### 5.2 Monitor Scan Progress
```bash
# Check status every 5 seconds
watch -n 5 "curl -s http://localhost:5000/api/scans/$SCAN_ID/status \
  -H 'Authorization: Bearer $TOKEN' | jq"

# Expected progression:
# status: QUEUED → RUNNING → COMPLETED
# progress: 0 → 10 → 30 → 50 → 70 → 85 → 100
# currentPhase: "Network Reconnaissance" → "Web Discovery" → ...
```

### 5.3 Get Scan Findings
```bash
curl http://localhost:5000/api/scans/$SCAN_ID/findings \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected response:
# {
#   "findings": [
#     {
#       "id": "finding-uuid",
#       "title": "Missing Content-Security-Policy Header",
#       "severity": "HIGH",
#       "category": "SECURITY_MISCONFIG",
#       "cvss": 6.5,
#       "description": "...",
#       "remediation": "...",
#       "evidence": [...]
#     }
#   ],
#   "stats": {
#     "critical": 0,
#     "high": 3,
#     "medium": 5,
#     "low": 2
#   }
# }
```

### 5.4 Filter Findings by Severity
```bash
# Get only HIGH severity findings
curl "http://localhost:5000/api/scans/$SCAN_ID/findings?severity=HIGH" \
  -H "Authorization: Bearer $TOKEN" | jq

# Get only CRITICAL findings
curl "http://localhost:5000/api/scans/$SCAN_ID/findings?severity=CRITICAL" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 5.5 Start Full VAPT Scan
```bash
curl -X POST http://localhost:5000/api/scans/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "'$TARGET_ID'",
    "profile": "FULL_VAPT",
    "config": {
      "ports": "top1000",
      "maxDepth": 3,
      "maxUrls": 500,
      "testTypes": ["all"],
      "aggressive": false
    }
  }'

# This will take 15-30 minutes
# Monitor with status endpoint
```

---

## 🧪 PHASE 6: Vulnerability Detection Test

### 6.1 Test Security Headers Detection
```bash
# Create target with known missing headers
curl -X POST http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Header Test",
    "type": "URL",
    "value": "http://example.com"
  }'

# Start scan and check for header findings
# Expected findings:
# - Missing Content-Security-Policy
# - Missing Strict-Transport-Security
# - Missing X-Frame-Options
```

### 6.2 Test Information Disclosure Detection
```bash
# Scanner should detect common sensitive files
# Expected findings:
# - /.git/config (if exposed)
# - /.env (if exposed)
# - /backup.zip (if exposed)
```

### 6.3 Test TLS Configuration
```bash
# Scanner should check:
# - Certificate validity
# - Certificate expiration
# - Weak protocols (SSLv3, TLS 1.0, TLS 1.1)
```

---

## 🎨 PHASE 7: Frontend UI Test

### 7.1 Test Targets Page
```
1. Visit http://localhost:3000/targets
2. Should see list of targets
3. Click "New Target" button
4. Fill form and submit
5. Verify target appears in list
```

### 7.2 Test Create Target Page
```
1. Visit http://localhost:3000/targets/new
2. Fill in:
   - Name: "UI Test Target"
   - Type: DOMAIN
   - Value: "example.com"
   - Description: "Testing UI"
3. Click "Create Target"
4. Should redirect to targets list
5. Verify new target appears
```

### 7.3 Test Scans Page
```
1. Visit http://localhost:3000/scans
2. Should see list of scans
3. Filter by status (RUNNING, COMPLETED, FAILED)
4. Click on a scan to view details
5. Verify progress bar updates in real-time
```

### 7.4 Test Real-time Updates
```
1. Start a scan via API or UI
2. Watch scans page
3. Progress bar should update every 5 seconds
4. Status should change: QUEUED → RUNNING → COMPLETED
5. Findings count should update
```

---

## 🐳 PHASE 8: Docker Test

### 8.1 Build Images
```bash
# Build all images
docker-compose build

# Expected output:
# Building postgres... done
# Building redis... done
# Building backend... done
# Building scan-engine... done
# Building frontend... done
```

### 8.2 Start Services
```bash
docker-compose up -d

# Check status
docker-compose ps

# Expected: All services "Up"
```

### 8.3 Test Services
```bash
# Test backend
curl http://localhost:5000/api/health

# Test frontend
curl http://localhost:3000

# Check logs
docker-compose logs backend
docker-compose logs frontend
```

### 8.4 Test Database Persistence
```bash
# Create data
curl -X POST http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Persistence Test","type":"DOMAIN","value":"test.com"}'

# Restart services
docker-compose restart backend

# Verify data persists
curl http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔒 PHASE 9: Security Test

### 9.1 Test SSRF Protection
```bash
# Should be blocked
curl -X POST http://localhost:5000/api/targets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"SSRF Test","type":"IP","value":"127.0.0.1"}'

# Expected: Error about private IP
```

### 9.2 Test Rate Limiting
```bash
# Rapid fire requests
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/scans/start \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"targetId":"'$TARGET_ID'","profile":"QUICK_RECON"}'
  echo "Request $i"
done

# Expected: 429 Too Many Requests after limit
```

### 9.3 Test Authentication
```bash
# Without token (should fail)
curl http://localhost:5000/api/targets

# Expected: 401 Unauthorized

# With invalid token (should fail)
curl http://localhost:5000/api/targets \
  -H "Authorization: Bearer invalid-token"

# Expected: 403 Forbidden
```

### 9.4 Test Input Validation
```bash
# Invalid email
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"test"}'

# Expected: 400 Bad Request

# Short password
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123"}'

# Expected: 400 Bad Request
```

---

## 📊 PHASE 10: Performance Test

### 10.1 Concurrent Scans
```bash
# Start multiple scans
for i in {1..5}; do
  curl -X POST http://localhost:5000/api/scans/start \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"targetId":"'$TARGET_ID'","profile":"QUICK_RECON"}' &
done

# Monitor worker
# Should process based on SCAN_CONCURRENCY setting
```

### 10.2 Large Target Scan
```bash
# Scan with many URLs
curl -X POST http://localhost:5000/api/scans/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "'$TARGET_ID'",
    "profile": "WEB_APP_SCAN",
    "config": {
      "maxDepth": 5,
      "maxUrls": 1000
    }
  }'

# Monitor memory usage
docker stats secora-backend
```

---

## ✅ SUCCESS CRITERIA

### All Tests Should Pass
- [x] Setup script completes without errors
- [x] All services start successfully
- [x] Health check returns OK
- [x] User can signup and login
- [x] Targets can be created and listed
- [x] Scans can be started and monitored
- [x] Findings are generated correctly
- [x] Frontend UI loads and functions
- [x] Docker containers run properly
- [x] Security controls work (SSRF, rate limiting)
- [x] Performance is acceptable

### Expected Results
- Quick scan: 2-5 minutes
- Full VAPT: 15-30 minutes
- Findings: 5-20 per scan (depends on target)
- Memory: <500MB per scan
- CPU: <50% during scan

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to database"
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: "Worker not processing jobs"
```bash
# Check Redis
redis-cli ping

# Check worker logs
cd backend && npm run dev
# Look for "Worker status: running"

# Check queue
redis-cli KEYS "bull:scans:*"
```

### Issue: "Go scanner not found"
```bash
# Rebuild
cd backend/scan-engine
go build -o scan-engine main.go
chmod +x scan-engine

# Test
./scan-engine example.com
```

---

**Testing Complete!** 🎉

If all tests pass, SECORA VAPT Platform is ready for use!
