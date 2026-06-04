// backend/src/utils/screenshotCapture.js
// Centralized Puppeteer-based screenshot capture engine for visual evidence
import puppeteer from 'puppeteer';

const VIEWPORT = { width: 1280, height: 800 };

let _sharedBrowser = null;

/**
 * Get or create a shared Puppeteer browser instance.
 * Reuses one browser across multiple captures within a scan.
 */
export async function getSharedBrowser() {
  if (_sharedBrowser && _sharedBrowser.isConnected()) {
    return _sharedBrowser;
  }
  _sharedBrowser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  return _sharedBrowser;
}

/**
 * Close the shared browser instance. Call at end of scan.
 */
export async function closeSharedBrowser() {
  if (_sharedBrowser) {
    try { await _sharedBrowser.close(); } catch (e) { /* ignore */ }
    _sharedBrowser = null;
  }
}

/**
 * Generate a timestamp watermark overlay HTML string.
 */
function watermarkOverlay(findingId, label) {
  const ts = new Date().toISOString();
  return `
    <div style="position:fixed;bottom:0;left:0;right:0;z-index:99999;
      background:rgba(0,0,0,0.85);color:#0f0;font-family:monospace;
      font-size:12px;padding:6px 12px;display:flex;justify-content:space-between;">
      <span>SECORA Evidence | ${findingId}</span>
      <span>${label}</span>
      <span>${ts}</span>
    </div>`;
}

/**
 * Capture a screenshot of a URL (for exposed files/paths).
 */
export async function captureUrl(url, findingId, label = 'Exposed Resource') {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport(VIEWPORT);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate((html) => {
      const div = document.createElement('div');
      div.innerHTML = html;
      document.body.appendChild(div);
    }, watermarkOverlay(findingId, label));
    await new Promise(r => setTimeout(r, 500));
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    return {
      base64: screenshot,
      timestamp: new Date().toISOString(),
      findingId,
      label,
    };
  } catch (err) {
    console.warn(`⚠️ Screenshot capture failed for ${findingId}:`, err.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Capture a side-by-side comparison of baseline vs bypass responses (for auth bypass).
 */
export async function captureResponseComparison(baselineData, bypassData, findingId) {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    const ts = new Date().toISOString();
    const html = `<!DOCTYPE html><html><head><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#0d1117; color:#e6edf3; font-family:'Courier New',monospace; font-size:13px; padding:20px; }
      .header { text-align:center; margin-bottom:16px; }
      .header h2 { color:#58a6ff; font-size:18px; }
      .header .meta { color:#8b949e; font-size:11px; margin-top:4px; }
      .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      .panel { background:#161b22; border:1px solid #30363d; border-radius:8px; padding:16px; overflow:hidden; }
      .panel.baseline { border-color:#f85149; }
      .panel.bypass { border-color:#3fb950; }
      .panel-title { font-size:14px; font-weight:bold; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #30363d; }
      .panel.baseline .panel-title { color:#f85149; }
      .panel.bypass .panel-title { color:#3fb950; }
      .row { margin:4px 0; }
      .label { color:#8b949e; }
      .val { color:#e6edf3; }
      .status-401, .status-403 { color:#f85149; font-weight:bold; }
      .status-200 { color:#3fb950; font-weight:bold; }
      pre { background:#0d1117; padding:8px; border-radius:4px; margin-top:8px; font-size:11px; overflow:auto; max-height:300px; white-space:pre-wrap; word-break:break-all; }
      .watermark { position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.9);color:#0f0;font-size:11px;padding:6px 12px;display:flex;justify-content:space-between; }
    </style></head><body>
      <div class="header">
        <h2>🛡️ Authentication Bypass Evidence</h2>
        <div class="meta">Finding: ${findingId} | Captured: ${ts}</div>
      </div>
      <div class="grid">
        <div class="panel baseline">
          <div class="panel-title">❌ Baseline Request (Blocked)</div>
          <div class="row"><span class="label">URL:</span> <span class="val">${esc(baselineData.url || 'N/A')}</span></div>
          <div class="row"><span class="label">Method:</span> <span class="val">${esc(baselineData.method || 'GET')}</span></div>
          <div class="row"><span class="label">Status:</span> <span class="status-401">${baselineData.status || 401}</span></div>
          ${baselineData.headers ? `<div class="row"><span class="label">Headers Sent:</span></div><pre>${esc(JSON.stringify(baselineData.headers, null, 2))}</pre>` : ''}
          ${baselineData.body ? `<div class="row"><span class="label">Response:</span></div><pre>${esc(truncate(baselineData.body, 500))}</pre>` : ''}
        </div>
        <div class="panel bypass">
          <div class="panel-title">✅ Bypass Request (Succeeded)</div>
          <div class="row"><span class="label">URL:</span> <span class="val">${esc(bypassData.url || 'N/A')}</span></div>
          <div class="row"><span class="label">Method:</span> <span class="val">${esc(bypassData.method || 'GET')}</span></div>
          <div class="row"><span class="label">Status:</span> <span class="status-200">${bypassData.status || 200}</span></div>
          ${bypassData.headers ? `<div class="row"><span class="label">Bypass Headers:</span></div><pre>${esc(JSON.stringify(bypassData.headers, null, 2))}</pre>` : ''}
          ${bypassData.body ? `<div class="row"><span class="label">Response:</span></div><pre>${esc(truncate(bypassData.body, 500))}</pre>` : ''}
        </div>
      </div>
      <div class="watermark">
        <span>SECORA Evidence | ${findingId}</span>
        <span>Auth Bypass Comparison</span>
        <span>${ts}</span>
      </div>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    return { base64: screenshot, timestamp: ts, findingId, label: 'Auth Bypass Comparison' };
  } catch (err) {
    console.warn(`⚠️ Comparison screenshot failed for ${findingId}:`, err.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Capture a styled table of response headers highlighting missing security headers.
 */
export async function captureHeaders(url, responseHeaders, missingHeaders, findingId) {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport(VIEWPORT);
    const ts = new Date().toISOString();
    const presentRows = Object.entries(responseHeaders || {})
      .map(([k, v]) => `<tr><td class="present">✓</td><td>${esc(k)}</td><td>${esc(String(v).substring(0, 120))}</td></tr>`)
      .join('');
    const missingRows = (missingHeaders || [])
      .map(h => `<tr class="missing-row"><td class="missing">✗</td><td>${esc(h)}</td><td class="missing-val">NOT SET</td></tr>`)
      .join('');

    const html = `<!DOCTYPE html><html><head><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#0d1117; color:#e6edf3; font-family:'Segoe UI',sans-serif; font-size:13px; padding:24px; }
      h2 { color:#58a6ff; font-size:18px; margin-bottom:6px; }
      .meta { color:#8b949e; font-size:11px; margin-bottom:16px; }
      .url-bar { background:#161b22; border:1px solid #30363d; border-radius:6px; padding:10px 14px; margin-bottom:16px; font-family:monospace; font-size:12px; color:#79c0ff; }
      table { width:100%; border-collapse:collapse; background:#161b22; border-radius:8px; overflow:hidden; }
      th { background:#21262d; color:#8b949e; text-align:left; padding:10px 12px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
      td { padding:8px 12px; border-bottom:1px solid #30363d; font-size:12px; }
      .present { color:#3fb950; font-weight:bold; width:30px; text-align:center; }
      .missing { color:#f85149; font-weight:bold; width:30px; text-align:center; }
      .missing-row { background:rgba(248,81,73,0.08); }
      .missing-val { color:#f85149; font-style:italic; }
      .watermark { position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.9);color:#0f0;font-family:monospace;font-size:11px;padding:6px 12px;display:flex;justify-content:space-between; }
    </style></head><body>
      <h2>🔒 Security Headers Analysis</h2>
      <div class="meta">Finding: ${findingId} | Captured: ${ts}</div>
      <div class="url-bar">🌐 ${esc(url)}</div>
      <table>
        <thead><tr><th></th><th>Header</th><th>Value</th></tr></thead>
        <tbody>${missingRows}${presentRows}</tbody>
      </table>
      <div class="watermark">
        <span>SECORA Evidence | ${findingId}</span>
        <span>Missing Security Headers</span>
        <span>${ts}</span>
      </div>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    return { base64: screenshot, timestamp: ts, findingId, label: 'Missing Security Headers' };
  } catch (err) {
    console.warn(`⚠️ Headers screenshot failed for ${findingId}:`, err.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Capture redirect evidence showing the Location header pointing to injected domain.
 */
export async function captureRedirect(originalUrl, redirectLocation, statusCode, param, findingId) {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport(VIEWPORT);
    const ts = new Date().toISOString();
    const html = `<!DOCTYPE html><html><head><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#0d1117; color:#e6edf3; font-family:'Courier New',monospace; font-size:13px; padding:24px; }
      h2 { color:#58a6ff; font-size:18px; margin-bottom:6px; }
      .meta { color:#8b949e; font-size:11px; margin-bottom:20px; }
      .flow { display:flex; flex-direction:column; gap:12px; }
      .step { background:#161b22; border:1px solid #30363d; border-radius:8px; padding:16px; }
      .step-title { font-size:12px; color:#8b949e; text-transform:uppercase; margin-bottom:8px; letter-spacing:0.5px; }
      .url { color:#79c0ff; word-break:break-all; }
      .param-highlight { color:#f0883e; font-weight:bold; }
      .arrow { text-align:center; color:#f85149; font-size:24px; }
      .danger { border-color:#f85149; background:rgba(248,81,73,0.08); }
      .danger .step-title { color:#f85149; }
      .location-val { color:#f85149; font-weight:bold; font-size:15px; word-break:break-all; }
      .status { display:inline-block; background:#f85149; color:#fff; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold; margin-left:8px; }
      .watermark { position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.9);color:#0f0;font-family:monospace;font-size:11px;padding:6px 12px;display:flex;justify-content:space-between; }
    </style></head><body>
      <h2>🔀 Open Redirect Evidence</h2>
      <div class="meta">Finding: ${findingId} | Captured: ${ts}</div>
      <div class="flow">
        <div class="step">
          <div class="step-title">1. Crafted Request URL</div>
          <div class="url">${esc(originalUrl)}</div>
          <div style="margin-top:6px;font-size:11px;color:#8b949e;">Parameter: <span class="param-highlight">${esc(param)}</span></div>
        </div>
        <div class="arrow">⬇ HTTP ${statusCode || 302}</div>
        <div class="step danger">
          <div class="step-title">2. Server Response — Location Header <span class="status">${statusCode || 302}</span></div>
          <div>Location: <span class="location-val">${esc(redirectLocation)}</span></div>
          <div style="margin-top:10px;font-size:11px;color:#f85149;">⚠ Server redirects to attacker-controlled domain without validation</div>
        </div>
      </div>
      <div class="watermark">
        <span>SECORA Evidence | ${findingId}</span>
        <span>Open Redirect</span>
        <span>${ts}</span>
      </div>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    return { base64: screenshot, timestamp: ts, findingId, label: 'Open Redirect' };
  } catch (err) {
    console.warn(`⚠️ Redirect screenshot failed for ${findingId}:`, err.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Capture TLS/SSL certificate and configuration details.
 */
export async function captureTlsInfo(tlsData, findingId, targetHost) {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport(VIEWPORT);
    const ts = new Date().toISOString();
    const cert = tlsData || {};
    const subject = cert.subject || {};
    const issuer = cert.issuer || {};

    const html = `<!DOCTYPE html><html><head><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#0d1117; color:#e6edf3; font-family:'Segoe UI',sans-serif; font-size:13px; padding:24px; }
      h2 { color:#58a6ff; font-size:18px; margin-bottom:6px; }
      .meta { color:#8b949e; font-size:11px; margin-bottom:20px; }
      .card { background:#161b22; border:1px solid #30363d; border-radius:8px; padding:18px; margin-bottom:14px; }
      .card-title { color:#79c0ff; font-size:14px; font-weight:bold; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #30363d; }
      .row { display:flex; padding:5px 0; border-bottom:1px solid #21262d; }
      .row:last-child { border-bottom:none; }
      .row-label { color:#8b949e; width:180px; flex-shrink:0; font-size:12px; }
      .row-value { color:#e6edf3; font-size:12px; }
      .status-ok { color:#3fb950; }
      .status-warn { color:#f0883e; }
      .status-bad { color:#f85149; }
      .watermark { position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.9);color:#0f0;font-family:monospace;font-size:11px;padding:6px 12px;display:flex;justify-content:space-between; }
    </style></head><body>
      <h2>🔐 TLS/SSL Configuration</h2>
      <div class="meta">Finding: ${findingId} | Host: ${esc(targetHost || 'unknown')} | Captured: ${ts}</div>
      <div class="card">
        <div class="card-title">Certificate Details</div>
        <div class="row"><div class="row-label">Subject CN</div><div class="row-value">${esc(subject.CN || 'N/A')}</div></div>
        <div class="row"><div class="row-label">Issuer</div><div class="row-value">${esc(issuer.O || '')} (${esc(issuer.CN || 'N/A')})</div></div>
        <div class="row"><div class="row-label">Valid From</div><div class="row-value">${esc(cert.validFrom || cert.valid_from || 'N/A')}</div></div>
        <div class="row"><div class="row-label">Valid To</div><div class="row-value">${esc(cert.validTo || cert.valid_to || 'N/A')}</div></div>
        <div class="row"><div class="row-label">Days Remaining</div><div class="row-value ${(cert.expiresInDays || cert.daysRemaining || 999) <= 14 ? 'status-bad' : (cert.expiresInDays || cert.daysRemaining || 999) <= 30 ? 'status-warn' : 'status-ok'}">${cert.expiresInDays || cert.daysRemaining || 'N/A'} days</div></div>
        <div class="row"><div class="row-label">Certificate Valid</div><div class="row-value ${cert.ok === false || cert.valid === false ? 'status-bad' : 'status-ok'}">${cert.ok === false || cert.valid === false ? '✗ INVALID' : '✓ Valid'}</div></div>
      </div>
      ${cert.error ? `
      <div class="card" style="border-color:#f85149;">
        <div class="card-title" style="color:#f85149;">⚠ TLS Error</div>
        <div class="row"><div class="row-value status-bad">${esc(String(cert.error))}</div></div>
      </div>` : ''}
      <div class="watermark">
        <span>SECORA Evidence | ${findingId}</span>
        <span>TLS Configuration</span>
        <span>${ts}</span>
      </div>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    return { base64: screenshot, timestamp: ts, findingId, label: 'TLS Configuration' };
  } catch (err) {
    console.warn(`⚠️ TLS screenshot failed for ${findingId}:`, err.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Helpers ──

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max = 500) {
  str = String(str || '');
  return str.length > max ? str.substring(0, max) + '...' : str;
}
