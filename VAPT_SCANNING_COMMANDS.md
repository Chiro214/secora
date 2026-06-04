# 🔍 SECORA VAPT - Scanning Commands & Tools

## Run these commands in Kali Linux or security testing environment

---

## 📦 PHASE 1: Tool Installation (Kali Linux)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nmap (if not present)
sudo apt install nmap -y

# Install Nikto
sudo apt install nikto -y

# Install OWASP ZAP
sudo apt install zaproxy -y

# Install OpenVAS/Greenbone (Optional - takes time)
sudo apt install openvas -y
sudo gvm-setup
sudo gvm-start

# Install Nuclei (Modern vulnerability scanner)
go install -v github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest

# Install Subfinder (Subdomain enumeration)
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Install httpx (HTTP probe)
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Install SQLMap (SQL injection testing)
sudo apt install sqlmap -y

# Install Burp Suite Community (Manual testing)
# Download from: https://portswigger.net/burp/communitydownload
```

---

## 🎯 PHASE 2: Reconnaissance & Asset Discovery

### Step 1: Subdomain Enumeration
```bash
# Replace YOUR_DOMAIN with actual domain
export TARGET="yourdomain.com"

# Using Subfinder
subfinder -d $TARGET -o subdomains.txt

# Using crt.sh (Certificate Transparency)
curl -s "https://crt.sh/?q=%25.$TARGET&output=json" | \
  jq -r '.[].name_value' | sort -u > crt_subdomains.txt

# Combine results
cat subdomains.txt crt_subdomains.txt | sort -u > all_subdomains.txt
```

### Step 2: Live Host Detection
```bash
# Probe for live hosts
cat all_subdomains.txt | httpx -silent -o live_hosts.txt

# Check HTTP status codes
cat live_hosts.txt | httpx -status-code -title -tech-detect -o host_info.txt
```

### Step 3: Technology Fingerprinting
```bash
# Detect technologies
whatweb -v -a 3 $TARGET | tee whatweb_results.txt

# Check for common frameworks
curl -s -I https://$TARGET | grep -i "x-powered-by\|server"
```

---

## 🔍 PHASE 3: Network Scanning (Nmap)

### Scan 1: Quick Discovery
```bash
# Fast SYN scan of top 1000 ports
nmap -sS -T4 -Pn $TARGET -oN nmap_quick.txt

# Output explanation:
# -sS: SYN stealth scan
# -T4: Aggressive timing
# -Pn: Skip ping (assume host is up)
# -oN: Normal output format
```

### Scan 2: Full Port Scan
```bash
# Scan ALL 65535 ports (takes 10-30 minutes)
nmap -p- -T4 -Pn $TARGET -oN nmap_full_ports.txt

# Faster version (less accurate)
nmap -p- -T5 --min-rate=1000 $TARGET -oN nmap_fast_full.txt
```

### Scan 3: Service Version Detection
```bash
# Detect service versions on open ports
nmap -sV -sC -p 22,80,443,3000,5000,8080 $TARGET -oN nmap_services.txt

# Output explanation:
# -sV: Version detection
# -sC: Default NSE scripts
# -p: Specific ports
```

### Scan 4: Vulnerability Scanning (NSE Scripts)
```bash
# Run vulnerability detection scripts
nmap --script vuln -p 80,443,5000 $TARGET -oN nmap_vulns.txt

# Specific vulnerability checks
nmap --script http-sql-injection -p 80,443 $TARGET
nmap --script http-csrf -p 80,443 $TARGET
nmap --script ssl-heartbleed -p 443 $TARGET
nmap --script ssl-poodle -p 443 $TARGET
```

### Scan 5: SSL/TLS Analysis
```bash
# Comprehensive SSL/TLS testing
nmap --script ssl-enum-ciphers -p 443 $TARGET -oN ssl_ciphers.txt
nmap --script ssl-cert -p 443 $TARGET -oN ssl_cert.txt

# Using testssl.sh (more detailed)
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh
./testssl.sh --full https://$TARGET | tee testssl_results.txt
```

---

## 🌐 PHASE 4: Web Application Scanning

### Nikto (Web Server Scanner)
```bash
# Basic scan
nikto -h https://$TARGET -o nikto_results.txt

# Comprehensive scan with all plugins
nikto -h https://$TARGET -Plugins '@@ALL' -o nikto_full.txt

# Scan specific port
nikto -h https://$TARGET:5000 -o nikto_backend.txt

# Expected findings:
# - Missing security headers
# - Server version disclosure
# - Dangerous HTTP methods
# - Directory listings
# - Default files
```

### OWASP ZAP (Automated Scan)
```bash
# Baseline scan (passive only)
zap-baseline.py -t https://$TARGET -r zap_baseline.html

# Full scan (active + passive)
zap-full-scan.py -t https://$TARGET -r zap_full.html

# API scan (if you have OpenAPI spec)
zap-api-scan.py -t https://$TARGET/api -f openapi -r zap_api.html

# Authenticated scan (requires context file)
zap-full-scan.py -t https://$TARGET -c zap_context.context -r zap_auth.html
```

### Nuclei (Modern Vulnerability Scanner)
```bash
# Update templates
nuclei -update-templates

# Run all templates
nuclei -u https://$TARGET -o nuclei_results.txt

# Specific severity
nuclei -u https://$TARGET -severity critical,high -o nuclei_critical.txt

# Specific tags
nuclei -u https://$TARGET -tags cve,owasp,misconfig -o nuclei_tagged.txt

# Scan multiple targets
nuclei -l live_hosts.txt -o nuclei_all_hosts.txt
```

---

## 💉 PHASE 5: Injection Testing

### SQL Injection (SQLMap)
```bash
# Test login form
sqlmap -u "https://$TARGET/api/auth/login" \
  --data="email=test@test.com&password=test" \
  --method=POST \
  --level=5 \
  --risk=3 \
  --batch \
  --output-dir=sqlmap_results

# Test GET parameter
sqlmap -u "https://$TARGET/search?q=test" \
  --level=3 \
  --risk=2 \
  --batch

# Test with authentication
sqlmap -u "https://$TARGET/api/scan" \
  --data='{"url":"https://example.com"}' \
  --headers="Authorization: Bearer YOUR_TOKEN" \
  --method=POST \
  --level=3 \
  --risk=2

# Common SQLMap options:
# --level: 1-5 (thoroughness)
# --risk: 1-3 (dangerous tests)
# --batch: Non-interactive
# --dbs: Enumerate databases
# --tables: Enumerate tables
# --dump: Extract data
```

### XSS Testing
```bash
# Using dalfox
go install github.com/hahwul/dalfox/v2@latest

dalfox url https://$TARGET/search?q=FUZZ \
  -o xss_results.txt

# Manual XSS payloads
curl "https://$TARGET/search?q=<script>alert(1)</script>"
curl "https://$TARGET/search?q=<img src=x onerror=alert(1)>"
```

### SSRF Testing
```bash
# Test scan endpoint for SSRF
curl -X POST https://$TARGET/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}'

curl -X POST https://$TARGET/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:6379"}'

curl -X POST https://$TARGET/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"http://192.168.1.1"}'
```

---

## 🔐 PHASE 6: Authentication & Authorization Testing

### JWT Testing
```bash
# Decode JWT
echo "YOUR_JWT_TOKEN" | cut -d'.' -f2 | base64 -d | jq

# Test with weak secret
python3 << EOF
import jwt
token = jwt.encode({'id': 'admin', 'email': 'admin@secora.com'}, 'change-me-in-prod', algorithm='HS256')
print(token)
EOF

# Test token manipulation
# Use jwt_tool: https://github.com/ticarpi/jwt_tool
python3 jwt_tool.py YOUR_TOKEN -T
```

### Rate Limiting Tests
```bash
# Test login rate limiting
for i in {1..20}; do
  curl -X POST https://$TARGET/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done

# Test scan rate limiting
for i in {1..10}; do
  curl -X POST https://$TARGET/scan \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com"}' \
    -w "\nRequest $i - Status: %{http_code}\n"
done
```

---

## 📊 PHASE 7: Results Analysis

### Consolidate Findings
```bash
# Create results directory
mkdir -p vapt_results
mv *.txt *.html vapt_results/

# Generate summary
cat > vapt_results/SUMMARY.md << 'EOF'
# VAPT Scan Summary

## Nmap Results
- Open Ports: [List from nmap_quick.txt]
- Services: [List from nmap_services.txt]
- Vulnerabilities: [List from nmap_vulns.txt]

## Web Vulnerabilities
- Nikto: [Count from nikto_results.txt]
- ZAP: [Count from zap_full.html]
- Nuclei: [Count from nuclei_results.txt]

## Injection Tests
- SQL Injection: [Results from sqlmap]
- XSS: [Results from dalfox]
- SSRF: [Manual test results]

## Priority Fixes
1. [Critical finding 1]
2. [Critical finding 2]
3. [High finding 1]
EOF
```

---

## ⚠️ IMPORTANT NOTES

### False Positives
- **Nmap**: May report filtered ports as open
- **Nikto**: Often flags outdated software versions (verify manually)
- **ZAP**: Can generate false XSS alerts on dynamic content
- **SQLMap**: May report time-based blind SQLi incorrectly

### Validation Steps
1. Manually verify each critical/high finding
2. Check if vulnerability is actually exploitable
3. Document proof-of-concept for confirmed issues
4. Retest after remediation

### Legal & Ethical
- ✅ Only scan systems you own or have written permission to test
- ✅ Avoid DoS attacks (use --max-rate limits)
- ✅ Don't exfiltrate real data
- ✅ Report findings responsibly

---

## 🚀 Quick Start Script

```bash
#!/bin/bash
# save as: secora_scan.sh

TARGET="$1"

if [ -z "$TARGET" ]; then
    echo "Usage: ./secora_scan.sh yourdomain.com"
    exit 1
fi

echo "[+] Starting VAPT scan for $TARGET"
mkdir -p results

echo "[1/5] Nmap scan..."
nmap -sV -sC -p- $TARGET -oN results/nmap.txt

echo "[2/5] Nikto scan..."
nikto -h https://$TARGET -o results/nikto.txt

echo "[3/5] Nuclei scan..."
nuclei -u https://$TARGET -o results/nuclei.txt

echo "[4/5] SSL/TLS test..."
testssl.sh https://$TARGET > results/ssl.txt

echo "[5/5] ZAP baseline..."
zap-baseline.py -t https://$TARGET -r results/zap.html

echo "[+] Scan complete! Results in ./results/"
```

Make executable and run:
```bash
chmod +x secora_scan.sh
./secora_scan.sh yourdomain.com
```
