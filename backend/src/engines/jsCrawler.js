// backend/src/engines/jsCrawler.js
// Puppeteer-based JavaScript-rendering crawler for SPA endpoint discovery
// Replaces HTTP-only crawler for modern React/Vue/Angular applications

import { getSharedBrowser } from '../utils/screenshotCapture.js';
import { URL } from 'url';

/**
 * Puppeteer Crawler Engine
 * Launches a real browser, optionally authenticates, then systematically
 * discovers endpoints by clicking elements and intercepting network requests.
 */
export async function jsCrawlerEngine({ target, type, config }) {
    console.log(`🕷️  Starting JS-rendering crawler for ${target}`);

    const crawler = new PuppeteerCrawler({
        startUrl: normalizeTarget(target, type),
        maxDepth: config.maxDepth || 3,
        maxUrls: config.maxUrls || 500,
        timeout: config.timeout || 15000,
        auth: config.auth || null, // { type: 'cookie'|'jwt', credentials: {...} }
        respectRobots: config.respectRobots !== false
    });

    const results = await crawler.crawl();

    console.log(`✅ JS crawler completed: ${results.urls.length} URLs, ${results.apiEndpoints.length} API endpoints discovered`);

    return results;
}

class PuppeteerCrawler {
    constructor(options) {
        this.startUrl = options.startUrl;
        this.maxDepth = options.maxDepth;
        this.maxUrls = options.maxUrls;
        this.timeout = options.timeout;
        this.auth = options.auth;
        this.respectRobots = options.respectRobots;

        this.visited = new Set();
        this.queue = [{ url: this.startUrl, depth: 0 }];
        this.results = {
            urls: [],
            forms: [],
            apiEndpoints: [],
            technologies: new Set(),
            xhrRequests: [],
            websockets: []
        };

        this.baseUrl = new URL(this.startUrl);
        this.interceptedRequests = new Set();
    }

    async crawl() {
        const browser = await getSharedBrowser();
        const page = await browser.newPage();

        try {
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Set up network request interception
            await this._setupRequestInterception(page);

            // Authenticate if credentials provided
            if (this.auth) {
                await this._authenticate(page);
            }

            // Crawl pages
            while (this.queue.length > 0 && this.visited.size < this.maxUrls) {
                const { url, depth } = this.queue.shift();

                if (this.visited.has(url) || depth > this.maxDepth) continue;
                if (!this.isSameOrigin(url)) continue;

                this.visited.add(url);

                try {
                    await this._crawlPage(page, url, depth);
                } catch (err) {
                    console.warn(`  ⚠️ Crawl error for ${url}: ${err.message}`);
                }

                // Rate limiting
                await this._sleep(200);
            }
        } catch (err) {
            console.error('JS Crawler fatal error:', err.message);
        } finally {
            await page.close().catch(() => {});
        }

        return {
            urls: this.results.urls,
            forms: this.results.forms,
            endpoints: [...this.results.apiEndpoints],
            apiEndpoints: this.results.apiEndpoints,
            technologies: Array.from(this.results.technologies),
            xhrRequests: this.results.xhrRequests,
            websockets: this.results.websockets
        };
    }

    /**
     * Set up network interception to capture XHR/fetch calls
     */
    async _setupRequestInterception(page) {
        // Listen for all network requests
        page.on('request', (request) => {
            const url = request.url();
            const resourceType = request.resourceType();

            // Capture XHR and fetch requests
            if (resourceType === 'xhr' || resourceType === 'fetch') {
                const key = `${request.method()}:${url}`;
                if (!this.interceptedRequests.has(key)) {
                    this.interceptedRequests.add(key);

                    const postData = request.postData();
                    let parameters = null;

                    // Parse POST data for parameters
                    if (postData) {
                        try {
                            parameters = JSON.parse(postData);
                        } catch {
                            // Try URL-encoded form data
                            try {
                                parameters = Object.fromEntries(new URLSearchParams(postData));
                            } catch {
                                parameters = { _raw: postData };
                            }
                        }
                    }

                    // Parse query parameters
                    try {
                        const urlObj = new URL(url);
                        const queryParams = Object.fromEntries(urlObj.searchParams);
                        if (Object.keys(queryParams).length > 0) {
                            parameters = { ...parameters, ...queryParams };
                        }
                    } catch { /* ignore */ }

                    this.results.apiEndpoints.push({
                        url: url.split('?')[0], // Clean URL without query
                        method: request.method(),
                        parameters,
                        headers: request.headers(),
                        discoveredBy: 'js-crawler-xhr',
                        type: 'api'
                    });
                }
            }
        });

        // Capture WebSocket connections
        page.on('request', (request) => {
            if (request.url().startsWith('ws://') || request.url().startsWith('wss://')) {
                this.results.websockets.push({
                    url: request.url(),
                    discoveredBy: 'js-crawler'
                });
            }
        });
    }

    /**
     * Authenticate using configured method
     */
    async _authenticate(page) {
        const { type, credentials } = this.auth;

        console.log(`  🔑 Authenticating with method: ${type}`);

        switch (type) {
            case 'cookie':
                // Set cookies directly
                if (credentials.cookies) {
                    const cookies = credentials.cookies.map(c => ({
                        name: c.name,
                        value: c.value,
                        domain: c.domain || this.baseUrl.hostname,
                        path: c.path || '/',
                        httpOnly: c.httpOnly || false,
                        secure: c.secure || this.baseUrl.protocol === 'https:'
                    }));
                    await page.setCookie(...cookies);
                }

                // Or login via form
                if (credentials.loginUrl && credentials.username && credentials.password) {
                    await page.goto(credentials.loginUrl, {
                        waitUntil: 'networkidle2',
                        timeout: this.timeout
                    });

                    const userField = await page.$(
                        'input[name*="user"], input[name*="email"], input[name*="login"], input[type="email"], input[type="text"]'
                    );
                    const passField = await page.$('input[type="password"]');

                    if (userField && passField) {
                        await userField.type(credentials.username, { delay: 50 });
                        await passField.type(credentials.password, { delay: 50 });

                        const submitBtn = await page.$(
                            'button[type="submit"], input[type="submit"], button:not([type])'
                        );
                        if (submitBtn) {
                            await Promise.all([
                                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
                                submitBtn.click()
                            ]);
                        }
                    }
                }
                break;

            case 'jwt':
                // Set JWT as Authorization header and/or localStorage
                if (credentials.token) {
                    await page.setExtraHTTPHeaders({
                        'Authorization': `Bearer ${credentials.token}`
                    });

                    // Also set in localStorage for SPAs that read from there
                    await page.goto(this.startUrl, { waitUntil: 'domcontentloaded', timeout: this.timeout });
                    await page.evaluate((token) => {
                        localStorage.setItem('token', token);
                        localStorage.setItem('jwt', token);
                        localStorage.setItem('access_token', token);
                        localStorage.setItem('auth_token', token);
                    }, credentials.token);
                }
                break;

            default:
                console.warn(`  ⚠️ Unknown auth type: ${type}`);
        }
    }

    /**
     * Crawl a single page
     */
    async _crawlPage(page, url, depth) {
        try {
            const response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: this.timeout
            });

            if (!response) return;

            const statusCode = response.status();
            const headers = response.headers();
            const contentType = headers['content-type'] || '';

            // Record this URL
            this.results.urls.push({
                url,
                method: 'GET',
                statusCode,
                contentType,
                depth,
                discoveredBy: 'js-crawler'
            });

            // Detect technologies
            this._detectTechnologies(headers, await page.content());

            // Only process HTML pages
            if (!contentType.includes('text/html')) return;

            // Wait for SPA rendering
            await this._sleep(1000);

            // Extract links from rendered DOM
            const links = await page.evaluate((baseOrigin) => {
                const anchors = document.querySelectorAll('a[href]');
                const hrefs = [];
                for (const a of anchors) {
                    try {
                        const href = new URL(a.href, document.baseURI).href;
                        if (href.startsWith('http') && new URL(href).origin === baseOrigin) {
                            hrefs.push(href.split('#')[0]);
                        }
                    } catch { /* ignore */ }
                }
                return [...new Set(hrefs)];
            }, this.baseUrl.origin);

            // Queue discovered links
            for (const link of links) {
                if (!this.visited.has(link)) {
                    this.queue.push({ url: link, depth: depth + 1 });
                }
            }

            // Extract forms
            const forms = await page.evaluate((pageUrl) => {
                const formElements = document.querySelectorAll('form');
                return Array.from(formElements).map(form => {
                    const inputs = Array.from(
                        form.querySelectorAll('input, textarea, select')
                    ).map(input => ({
                        name: input.name || input.id,
                        type: input.type || 'text',
                        required: input.required
                    }));

                    return {
                        action: form.action || pageUrl,
                        method: (form.method || 'GET').toUpperCase(),
                        inputs,
                        pageUrl,
                        enctype: form.enctype || 'application/x-www-form-urlencoded'
                    };
                });
            }, url);

            this.results.forms.push(...forms);

            // Extract API endpoints from inline scripts
            const html = await page.content();
            this._extractApiEndpointsFromSource(html, url);

            // Click interactive elements to trigger more API calls
            if (depth < this.maxDepth) {
                await this._clickInteractiveElements(page, url);
            }

        } catch (err) {
            if (!err.message.includes('Navigation timeout')) {
                console.warn(`  Crawl page error ${url}: ${err.message}`);
            }
        }
    }

    /**
     * Click buttons and interactive elements to discover more endpoints
     */
    async _clickInteractiveElements(page, pageUrl) {
        try {
            const clickables = await page.$$eval(
                'button:not([type="submit"]), [role="button"], [data-toggle], .nav-link, .tab-link, [onclick]',
                els => els.slice(0, 10).map((el, i) => ({
                    index: i,
                    tag: el.tagName,
                    text: el.textContent?.trim()?.substring(0, 30)
                }))
            );

            for (const clickable of clickables) {
                try {
                    const elements = await page.$$(
                        'button:not([type="submit"]), [role="button"], [data-toggle], .nav-link, .tab-link, [onclick]'
                    );
                    if (elements[clickable.index]) {
                        await elements[clickable.index].click().catch(() => {});
                        await this._sleep(500);
                    }
                } catch { /* ignore click errors */ }
            }
        } catch { /* ignore */ }
    }

    /**
     * Extract API endpoints from JavaScript source code
     */
    _extractApiEndpointsFromSource(html, pageUrl) {
        const patterns = [
            /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /axios\.[a-z]+\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /\$\.ajax\s*\(\s*\{[^}]*url\s*:\s*['"`]([^'"`]+)['"`]/g,
            /['"`](\/api\/[^'"`\s]+)['"`]/g,
            /['"`](\/v[0-9]+\/[^'"`\s]+)['"`]/g,
            /XMLHttpRequest[^;]*\.open\s*\(\s*['"`][A-Z]+['"`]\s*,\s*['"`]([^'"`]+)['"`]/g
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                try {
                    const endpoint = new URL(match[1], pageUrl).href;
                    if (this.isSameOrigin(endpoint)) {
                        const key = `GET:${endpoint}`;
                        if (!this.interceptedRequests.has(key)) {
                            this.interceptedRequests.add(key);
                            this.results.apiEndpoints.push({
                                url: endpoint,
                                method: 'GET',
                                discoveredBy: 'js-crawler-source',
                                type: 'api'
                            });
                        }
                    }
                } catch { /* invalid URL */ }
            }
        }
    }

    /**
     * Detect technologies from response headers and HTML content
     */
    _detectTechnologies(headers, html) {
        if (headers['server']) this.results.technologies.add(headers['server']);
        if (headers['x-powered-by']) this.results.technologies.add(headers['x-powered-by']);

        const techPatterns = [
            { pattern: /react/i, name: 'React' },
            { pattern: /_next/i, name: 'Next.js' },
            { pattern: /__nuxt/i, name: 'Nuxt.js' },
            { pattern: /ng-version/i, name: 'Angular' },
            { pattern: /vue/i, name: 'Vue.js' },
            { pattern: /wp-content/i, name: 'WordPress' },
            { pattern: /jquery/i, name: 'jQuery' },
            { pattern: /laravel/i, name: 'Laravel' },
            { pattern: /django/i, name: 'Django' },
            { pattern: /express/i, name: 'Express.js' },
            { pattern: /rails/i, name: 'Ruby on Rails' },
            { pattern: /spring/i, name: 'Spring' }
        ];

        for (const { pattern, name } of techPatterns) {
            if (pattern.test(html) || pattern.test(JSON.stringify(headers))) {
                this.results.technologies.add(name);
            }
        }
    }

    isSameOrigin(url) {
        try {
            return new URL(url).origin === this.baseUrl.origin;
        } catch {
            return false;
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

function normalizeTarget(target, type) {
    if (type === 'URL') return target;
    if (type === 'DOMAIN') return `https://${target}`;
    if (type === 'IP') return `http://${target}`;
    return target;
}

export default jsCrawlerEngine;
