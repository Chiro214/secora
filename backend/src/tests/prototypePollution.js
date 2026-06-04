import axios from 'axios';
import { logger } from '../utils/logger.js';
import puppeteer from 'puppeteer';

export async function testPrototypePollution(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    logger.info(`[PrototypePollution] Testing endpoint: ${endpoint.url}`);

    try {
        // 1. JSON Body Injection (Shallow & Deep)
        if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
            const payloads = [
                // Shallow
                { "__proto__": { "secora_polluted": "yes" } },
                // Deep
                { "constructor": { "prototype": { "secora_polluted": "yes" } } }
            ];

            for (const payload of payloads) {
                const reqData = { ...endpoint.data, ...payload };
                try {
                    const resp = await axios({
                        method: endpoint.method,
                        url: endpoint.url,
                        headers: { ...endpoint.headers, 'Content-Type': 'application/json' },
                        data: reqData,
                        timeout,
                        validateStatus: () => true
                    });
                    
                    const bodyStr = JSON.stringify(resp.data);
                    
                    // Detect if the property was merged and reflected
                    if (bodyStr.includes('"secora_polluted":"yes"') || bodyStr.includes('secora_polluted')) {
                        findings.push({
                            title: 'Prototype Pollution (Server-Side JSON)',
                            description: `The endpoint merges JSON payloads insecurely, allowing injection into the object prototype. This can lead to logic bypass or Remote Code Execution (RCE) in Node.js applications.`,
                            category: 'INJECTION',
                            severity: 'HIGH',
                            cvss: 7.5,
                            detectedBy: 'pollution-engine',
                            confidence: 90,
                            evidence: [
                                { type: 'REQUEST', title: 'Payload', content: JSON.stringify(payload) },
                                { type: 'RESPONSE', title: 'Reflection', content: 'The injected property "secora_polluted" was reflected in the response or altered server behavior.' }
                            ],
                            remediation: 'Use a safe merging library (like lodash.merge >= 4.6.2), freeze the Object prototype (`Object.freeze(Object.prototype)`), or use `Object.create(null)` for maps.'
                        });
                        break; // Move to next test
                    }
                } catch (e) { }
            }
        }

        // 2. Query Parameter Injection
        const queryUrl = new URL(endpoint.url);
        queryUrl.searchParams.append('__proto__[secora_polluted]', 'yes');
        
        try {
            const resp = await axios.get(queryUrl.toString(), { timeout, validateStatus: () => true });
            const bodyStr = JSON.stringify(resp.data);
            if (bodyStr.includes('secora_polluted')) {
                findings.push({
                    title: 'Prototype Pollution (URL Query Parameters)',
                    description: `The endpoint parses query parameters insecurely (e.g., using an outdated version of 'qs'), allowing prototype pollution.`,
                    category: 'INJECTION',
                    severity: 'HIGH',
                    cvss: 7.5,
                    detectedBy: 'pollution-engine',
                    confidence: 85,
                    evidence: [
                        { type: 'REQUEST', title: 'URL', content: queryUrl.toString() }
                    ],
                    remediation: 'Update query string parsing libraries and disable allowable dots/brackets in keys if not needed.'
                });
            }
        } catch (e) { }

        // 3. DOM-Based Prototype Pollution (via Puppeteer)
        if (options.aggressive && endpoint.method === 'GET') {
            try {
                const browser = await puppeteer.launch({ 
                    headless: "new",
                    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
                });
                const page = await browser.newPage();
                
                // Inject via URL hash/fragment
                const domUrl = `${endpoint.url}#__proto__[secora_dom_polluted]=yes`;
                
                await page.goto(domUrl, { waitUntil: 'networkidle2', timeout: 15000 });
                
                // Check if window.secora_dom_polluted exists
                const isPolluted = await page.evaluate(() => {
                    // @ts-ignore
                    return window.secora_dom_polluted === 'yes' || {}.secora_dom_polluted === 'yes';
                });
                
                if (isPolluted) {
                    findings.push({
                        title: 'DOM-Based Prototype Pollution',
                        description: `Client-side JavaScript insecurely parses the URL hash/query string, polluting the global Object prototype. This can lead to DOM XSS.`,
                        category: 'XSS',
                        severity: 'MEDIUM',
                        cvss: 6.1,
                        detectedBy: 'pollution-engine',
                        confidence: 95,
                        evidence: [
                            { type: 'REQUEST', title: 'Payload', content: domUrl },
                            { type: 'LOG', title: 'Execution', content: `window.secora_dom_polluted evaluated to true.` }
                        ],
                        remediation: 'Avoid recursive merges on unvalidated client input and update vulnerable client-side libraries (like jQuery).'
                    });
                }
                
                await browser.close();
            } catch (puppeteerErr) {
                logger.debug(`[PrototypePollution] DOM test failed: ${puppeteerErr.message}`);
            }
        }

    } catch (e) {
        logger.error(`[PrototypePollution] Test failed: ${e.message}`);
    }

    return findings;
}
