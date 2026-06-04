import { logger } from '../utils/logger.js';
import puppeteer from 'puppeteer';

export async function testPostMessage(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 15000;
    
    // Test primarily GET endpoints that return HTML (SPAs, main pages)
    if (endpoint.method !== 'GET') return findings;

    logger.info(`[PostMessage] Testing window.postMessage vulnerability on: ${endpoint.url}`);

    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        });
        
        const page = await browser.newPage();
        
        // Construct an attacker page that embeds the target in an iframe and sprays postMessage payloads
        const exploitHtml = `
            <!DOCTYPE html>
            <html>
            <body>
                <iframe id="target" src="${endpoint.url}" style="width: 100vw; height: 100vh;"></iframe>
                <script>
                    const payloads = [
                        // JSON based payloads (common for SPAs)
                        JSON.stringify({ type: 'update', data: '<img src=x onerror="window.secora_pm_xss=true">' }),
                        JSON.stringify({ action: 'login', token: 'attacker_token' }),
                        JSON.stringify({ type: 'getConfig' }), // Attempt to extract data
                        
                        // String based payloads
                        'javascript:window.secora_pm_xss=true',
                        '<svg/onload=window.secora_pm_xss=true>'
                    ];

                    const iframe = document.getElementById('target');
                    
                    iframe.onload = () => {
                        // Send messages to the iframe from our 'attacker' origin
                        payloads.forEach(payload => {
                            iframe.contentWindow.postMessage(payload, '*');
                        });
                    };

                    // Listen for any responses from the target (data theft)
                    window.addEventListener('message', (event) => {
                        if (event.source === iframe.contentWindow) {
                            window.secora_pm_leak = event.data;
                        }
                    });
                </script>
            </body>
            </html>
        `;

        await page.setContent(exploitHtml, { waitUntil: 'networkidle2', timeout });
        
        // Give the iframe time to load and process messages
        await new Promise(r => setTimeout(r, 3000));
        
        // Check if any payload executed inside the iframe (we injected window.secora_pm_xss=true)
        // Since cross-origin iframe DOM access is blocked even in puppeteer sometimes, we use evaluateHandle on the iframe
        const frame = page.frames().find(f => f.url() === endpoint.url || f.url().startsWith(new URL(endpoint.url).origin));
        
        if (frame) {
            const xssExecuted = await frame.evaluate(() => {
                return window.secora_pm_xss === true;
            }).catch(() => false);

            if (xssExecuted) {
                findings.push({
                    assetId: endpoint.assetId,
                    endpointId: endpoint.id,
                    title: 'Insecure postMessage Handling (DOM XSS)',
                    description: `The application receives \`window.postMessage\` events without validating the sender's origin (\`event.origin\`). An attacker can embed the application in an iframe and send crafted messages that are insecurely processed by the application, leading to DOM-based Cross-Site Scripting (XSS).`,
                    category: 'XSS',
                    severity: 'HIGH',
                    cvss: 7.1,
                    detectedBy: 'postmessage-engine',
                    confidence: 95,
                    evidence: [
                        { type: 'LOG', title: 'Exploit Vector', content: `Injected payloads via postMessage('*') from an untrusted origin.` },
                        { type: 'LOG', title: 'Execution Result', content: `Payload successfully executed JavaScript within the target window's context.` }
                    ],
                    remediation: 'Always validate the `event.origin` property in the message event listener against a strict allowlist of trusted domains. Ensure the message data is strictly validated and sanitized before being processed or rendered.'
                });
            }
        }
        
        // Check if the target leaked any data back to the attacker window
        const leakedData = await page.evaluate(() => window.secora_pm_leak);
        
        if (leakedData) {
            let dataStr = typeof leakedData === 'object' ? JSON.stringify(leakedData) : leakedData.toString();
            // Filter out empty messages or generic acks
            if (dataStr.length > 10 && !dataStr.includes('webpack') && !dataStr.includes('react-devtools')) {
                findings.push({
                    assetId: endpoint.assetId,
                    endpointId: endpoint.id,
                    title: 'Data Leakage via postMessage',
                    description: `The application broadcasts sensitive data via \`window.postMessage\` using a wildcard target origin (\`*\`), or responds to requests from untrusted origins. An attacker can embed the application and listen for these messages to steal data.`,
                    category: 'INFORMATION_DISCLOSURE',
                    severity: 'MEDIUM',
                    cvss: 5.3,
                    detectedBy: 'postmessage-engine',
                    confidence: 80,
                    evidence: [
                        { type: 'LOG', title: 'Captured Message Data', content: dataStr.substring(0, 500) }
                    ],
                    remediation: 'Never use the wildcard `*` as the `targetOrigin` when sending sensitive data via `postMessage`. Always specify the exact intended origin.'
                });
            }
        }

    } catch (e) {
        logger.debug(`[PostMessage] Test failed: ${e.message}`);
    } finally {
        if (browser) await browser.close();
    }

    return findings;
}
