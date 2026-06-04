# 🔧 SECORA Security Fixes - Implementation Guide

## Priority: IMMEDIATE (Next 24 Hours)

### ✅ FIX 1: Revoke Exposed OpenAI API Key

**Step 1: Revoke the key**
1. Go to https://platform.openai.com/api-keys
2. Find key starting with `sk-proj-xch23GRB...`
3. Click "Revoke" or delete the key
4. Confirm revocation

**Step 2: Generate new key**
```bash
# Generate new key in OpenAI dashboard
# Copy the new key (you'll only see it once)
```

**Step 3: Update environment**
```bash
# backend/.env (DO NOT COMMIT THIS FILE)
OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY_HERE
```

**Step 4: Remove from Git history**
```bash
# Install BFG Repo-Cleaner
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Remove .env from history
java -jar bfg-1.14.0.jar --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: Coordinate with team)
git push origin --force --all
```

**Step 5: Verify**
```bash
# Check if .env is in history
git log --all --full-history -- "*/.env"
# Should return nothing

# Verify .gitignore
cat .gitignore | grep ".env"
# Should show .env is ignored
```

---

### ✅ FIX 2: Set Strong JWT Secret

**Step 1: Generate strong secret**
```bash
# Generate 256-bit random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Example output: a1b2c3d4e5f6...
```

**Step 2: Update .env**
```bash
# backend/.env
JWT_SECRET=<paste-generated-secret-here>
```

**Step 3: Update code to require secret**
```javascript
// backend/src/middleware/auth.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast if secret is not set
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be set and at least 32 characters');
    process.exit(1);
}

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        req.user = user;
        next();
    });
};
```

**Step 4: Update controller**
```javascript
// backend/src/controllers/authController.js
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

// Rest of code remains the same
```

**Step 5: Test**
```bash
# Start backend without JWT_SECRET
unset JWT_SECRET
npm start
# Should exit with error

# Start with JWT_SECRET
export JWT_SECRET="your-secret-here"
npm start
# Should start successfully
```

---

### ✅ FIX 3: Implement SSRF Protection

**Create validation utility**
```javascript
// backend/src/utils/urlValidator.js
import { isIP } from 'net';
import dns from 'dns/promises';

const BLOCKED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254',  // AWS metadata
    'metadata.google.internal',  // GCP
    '169.254.169.254',  // Azure
];

const BLOCKED_IP_RANGES = [
    /^10\./,                              // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,    // 172.16.0.0/12
    /^192\.168\./,                        // 192.168.0.0/16
    /^127\./,                             // 127.0.0.0/8
    /^169\.254\./,                        // 169.254.0.0/16
    /^::1$/,                              // IPv6 loopback
    /^fe80:/i,                            // IPv6 link-local
    /^fc00:/i,                            // IPv6 unique local
];

export async function validateScanUrl(rawUrl) {
    // Parse URL
    let url;
    try {
        url = new URL(rawUrl);
    } catch (err) {
        throw new Error("Invalid URL format");
    }

    // Check protocol
    if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Only HTTP/HTTPS protocols allowed");
    }

    // Check port (optional: restrict to 80, 443)
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    if (![80, 443, 8080, 8443].includes(parseInt(port))) {
        throw new Error("Port not allowed");
    }

    // Normalize hostname
    const hostname = url.hostname.toLowerCase();

    // Check hostname blocklist
    if (BLOCKED_HOSTS.includes(hostname)) {
        throw new Error(`Access to ${hostname} is not allowed`);
    }

    // Check if hostname is an IP address
    if (isIP(hostname)) {
        if (BLOCKED_IP_RANGES.some(pattern => pattern.test(hostname))) {
            throw new Error("Access to private IP ranges is not allowed");
        }
    }

    // Resolve DNS and check IP ranges
    try {
        const addresses = await dns.resolve4(hostname);
        
        for (const ip of addresses) {
            // Check against blocked ranges
            if (BLOCKED_IP_RANGES.some(pattern => pattern.test(ip))) {
                throw new Error(`Resolved IP ${ip} is in a blocked range`);
            }
        }
    } catch (dnsErr) {
        if (dnsErr.code === 'ENOTFOUND') {
            throw new Error("Unable to resolve hostname");
        }
        // Re-throw validation errors
        if (dnsErr.message.includes('blocked')) {
            throw dnsErr;
        }
        // Allow other DNS errors to pass (might be temporary)
        console.warn('DNS resolution warning:', dnsErr.message);
    }

    return url;
}
```

**Update scan.js**
```javascript
// backend/src/utils/scan.js
import { validateScanUrl } from './urlValidator.js';

export async function scanTarget(rawUrl) {
    // Validate URL first (throws on invalid)
    const url = await validateScanUrl(rawUrl);
    
    // Rest of existing scan logic...
    const vulnerabilities = [];
    let headers = {};
    // ... continue with existing code
}
```

**Test SSRF protection**
```bash
# Test blocked URLs
curl -X POST http://localhost:5000/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:5000"}'
# Expected: "Access to localhost is not allowed"

curl -X POST http://localhost:5000/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}'
# Expected: "Access to 169.254.169.254 is not allowed"

curl -X POST http://localhost:5000/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"http://192.168.1.1"}'
# Expected: "Access to private IP ranges is not allowed"

# Test allowed URL
curl -X POST http://localhost:5000/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# Expected: Scan proceeds normally
```

---

### ✅ FIX 4: Add Rate Limiting to Scan Endpoint

**Create rate limiter**
```javascript
// backend/src/middleware/scanRateLimit.js
import redis from "../config/redis.js";

const SCAN_WINDOW_SECONDS = 60;
const MAX_SCANS_PER_WINDOW = 3;
const MAX_SCANS_PER_DAY = 50;

export const scanRateLimiter = async (req, res, next) => {
    try {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        
        // Per-minute rate limit
        const minuteKey = `rate:scan:minute:${ip}`;
        const minuteCount = await redis.incr(minuteKey);
        
        if (minuteCount === 1) {
            await redis.expire(minuteKey, SCAN_WINDOW_SECONDS);
        }
        
        if (minuteCount > MAX_SCANS_PER_WINDOW) {
            const ttl = await redis.ttl(minuteKey);
            return res.status(429).json({
                error: "Too many scan requests",
                message: `Maximum ${MAX_SCANS_PER_WINDOW} scans per minute`,
                retryAfter: ttl
            });
        }
        
        // Per-day rate limit
        const dayKey = `rate:scan:day:${ip}`;
        const dayCount = await redis.incr(dayKey);
        
        if (dayCount === 1) {
            await redis.expire(dayKey, 86400);  // 24 hours
        }
        
        if (dayCount > MAX_SCANS_PER_DAY) {
            return res.status(429).json({
                error: "Daily scan limit exceeded",
                message: `Maximum ${MAX_SCANS_PER_DAY} scans per day`,
                retryAfter: await redis.ttl(dayKey)
            });
        }
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', MAX_SCANS_PER_WINDOW);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_SCANS_PER_WINDOW - minuteCount));
        res.setHeader('X-RateLimit-Reset', Date.now() + (await redis.ttl(minuteKey) * 1000));
        
        next();
    } catch (error) {
        console.error("Rate limiter error:", error);
        // Fail closed for security
        return res.status(503).json({ 
            error: "Service temporarily unavailable",
            message: "Rate limiting service error"
        });
    }
};
```

**Apply to routes**
```javascript
// backend/src/server.js
import { scanRateLimiter } from "./middleware/scanRateLimit.js";

// Apply rate limiting to scan endpoint
app.post("/scan", scanRateLimiter, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    try {
        const result = await scanTarget(url);
        // ... rest of existing code
    } catch (e) {
        console.error("❌ Scan error:", e);
        res.status(500).json({ error: e?.message || "Scan failed" });
    }
});
```

---

### ✅ FIX 5: Move JWT to HttpOnly Cookies

**Install cookie-parser**
```bash
cd backend
npm install cookie-parser
```

**Update server.js**
```javascript
// backend/src/server.js
import cookieParser from 'cookie-parser';

app.use(cookieParser());

// Update CORS to allow credentials
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
```

**Update auth controller**
```javascript
// backend/src/controllers/authController.js
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase();

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check lock and password (existing logic)
        // ...

        // Generate tokens
        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set httpOnly cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000  // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        });

        res.json({
            message: "Login successful",
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const logout = async (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: "Logged out successfully" });
};
```

**Update auth middleware**
```javascript
// backend/src/middleware/auth.js
export const authenticateToken = (req, res, next) => {
    const token = req.cookies.accessToken;  // Read from cookie instead of header

    if (!token) {
        return res.status(401).json({ message: "Access token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        req.user = user;
        next();
    });
};
```

**Update frontend AuthContext**
```typescript
// frontend/contexts/AuthContext.tsx
const login = async (email: string, password: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Important: Send cookies
        body: JSON.stringify({ email, password })
    });

    if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        router.push('/dashboard');
    } else {
        throw new Error('Login failed');
    }
};

const logout = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
    });
    
    setIsAuthenticated(false);
    router.push('/login');
};

// Remove all localStorage.setItem/getItem('token') calls
```

---

## Priority: HIGH (Next 48-72 Hours)

### ✅ FIX 6: Add Security Headers

**Create security headers middleware**
```javascript
// backend/src/middleware/securityHeaders.js
import helmet from 'helmet';

export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],  // Adjust based on needs
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
});

// Remove server header
export const removeServerHeader = (req, res, next) => {
    res.removeHeader('X-Powered-By');
    next();
};
```

**Apply to server**
```javascript
// backend/src/server.js
import { securityHeaders, removeServerHeader } from './middleware/securityHeaders.js';

app.use(securityHeaders);
app.use(removeServerHeader);
```

**For Next.js frontend**
```typescript
// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

### ✅ FIX 7: Fix Path Traversal

**Update aiRemediate route**
```javascript
// backend/src/routes/aiRemediate.js
import path from "path";

router.post("/api/remediate/:scanId", async (req, res) => {
  const { scanId } = req.params;
  
  // Strict validation: alphanumeric, hyphens, underscores only
  if (!/^[a-zA-Z0-9_\-]+$/.test(scanId)) {
    return res.status(400).json({ 
      error: "Invalid scan ID format",
      message: "Scan ID must contain only letters, numbers, hyphens, and underscores"
    });
  }
  
  try {
    const scansDir = path.resolve(__dirname, "../../scan-results");

    if (!fs.existsSync(scansDir)) {
      return res.status(404).json({ error: "Scan results directory missing" });
    }

    const files = fs.readdirSync(scansDir);
    
    // Strict filename matching
    const scanFile = files.find(f => 
      f.startsWith(scanId) && 
      f.endsWith('.json') && 
      !f.includes('remediation') &&
      !f.includes('..')  // Extra safety
    );

    if (!scanFile) {
      return res.status(404).json({ error: "Scan result not found" });
    }

    const scanPath = path.join(scansDir, scanFile);
    const resolvedPath = path.resolve(scanPath);
    
    // Verify resolved path is within scansDir
    if (!resolvedPath.startsWith(scansDir)) {
      console.error(`Path traversal attempt: ${scanId}`);
      return res.status(403).json({ error: "Access denied" });
    }

    // Continue with existing logic...
    const scanData = JSON.parse(fs.readFileSync(scanPath, "utf8"));
    // ...
  } catch (error) {
    console.error("💥 Remediation route failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

---

## Testing Checklist

After implementing fixes, run these tests:

```bash
# 1. Test JWT secret enforcement
unset JWT_SECRET
npm start  # Should fail

# 2. Test SSRF protection
curl -X POST http://localhost:5000/scan -d '{"url":"http://localhost"}' -H "Content-Type: application/json"
# Should return error

# 3. Test rate limiting
for i in {1..5}; do curl -X POST http://localhost:5000/scan -d '{"url":"https://example.com"}' -H "Content-Type: application/json"; done
# 4th request should be rate limited

# 4. Test security headers
curl -I http://localhost:5000
# Should include X-Frame-Options, X-Content-Type-Options, etc.

# 5. Test path traversal protection
curl -X POST http://localhost:5000/api/remediate/..%2F..%2F.env
# Should return 400 Bad Request
```
