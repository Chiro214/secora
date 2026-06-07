// backend/src/engines/webCrawler.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

/**
 * Web crawler engine - discovers URLs, forms, and endpoints
 */
export async function webCrawlerEngine({ target, type, config }) {
    console.log(`🕷️  Starting web crawler for ${target}`);
    
    const crawler = new WebCrawler({
        startUrl: normalizeTarget(target, type),
        maxDepth: config.maxDepth || 3,
        maxUrls: config.maxUrls || 500,
        respectRobots: config.respectRobots !== false,
        timeout: config.timeout || 10000,
        userAgent: config.userAgent || 'Secora-Scanner/1.0'
    });
    
    const results = await crawler.crawl();
    
    console.log(`✅ Web crawler completed: ${results.urls.length} URLs, ${results.forms.length} forms found`);
    
    return results;
}

class WebCrawler {
    constructor(options) {
        this.startUrl = options.startUrl;
        this.maxDepth = options.maxDepth;
        this.maxUrls = options.maxUrls;
        this.respectRobots = options.respectRobots;
        this.timeout = options.timeout;
        this.userAgent = options.userAgent;
        
        this.visited = new Set();
        this.queue = [{ url: this.startUrl, depth: 0 }];
        this.results = {
            urls: [],
            forms: [],
            endpoints: [],
            technologies: new Set()
        };
        
        this.baseUrl = new URL(this.startUrl);
        this.robotsRules = null;
    }
    
    async crawl() {
        // Load robots.txt if respecting it
        if (this.respectRobots) {
            await this.loadRobotsTxt();
        }
        
        while (this.queue.length > 0 && this.visited.size < this.maxUrls) {
            const { url, depth } = this.queue.shift();
            
            if (this.visited.has(url) || depth > this.maxDepth) {
                continue;
            }
            
            if (this.respectRobots && !this.isAllowedByRobots(url)) {
                continue;
            }
            
            this.visited.add(url);
            
            try {
                await this.crawlUrl(url, depth);
            } catch (error) {
                console.error(`Error crawling ${url}:`, error.message);
            }
            
            // Rate limiting
            await this.sleep(100);
        }
        
        return {
            urls: this.results.urls,
            forms: this.results.forms,
            endpoints: this.results.endpoints,
            technologies: Array.from(this.results.technologies)
        };
    }
    
    async crawlUrl(url, depth) {
        try {
            const response = await axios.get(url, {
                timeout: this.timeout,
                maxRedirects: 5,
                headers: {
                    'User-Agent': this.userAgent
                },
                validateStatus: () => true // Accept all status codes
            });
            
            // Store URL info
            this.results.urls.push({
                url,
                method: 'GET',
                statusCode: response.status,
                contentType: response.headers['content-type'],
                depth
            });
            
            // Detect technologies
            this.detectTechnologies(response);
            
            // Only parse HTML responses
            const contentType = response.headers['content-type'] || '';
            if (!contentType.includes('text/html')) {
                return;
            }
            
            // Parse HTML
            const $ = cheerio.load(response.data);
            
            // Extract links
            const links = this.extractLinks($, url);
            for (const link of links) {
                if (!this.visited.has(link) && this.isSameOrigin(link)) {
                    this.queue.push({ url: link, depth: depth + 1 });
                }
            }
            
            // Extract forms
            const forms = this.extractForms($, url);
            this.results.forms.push(...forms);
            
            // Extract API endpoints
            const endpoints = this.extractEndpoints($, response.data, url);
            this.results.endpoints.push(...endpoints);
            
        } catch (error) {
            // Log but don't throw
            console.error(`Failed to crawl ${url}:`, error.message);
        }
    }
    
    extractLinks($, baseUrl) {
        const links = new Set();
        
        $('a[href]').each((_, anchor) => {
            try {
                const href = $(anchor).attr('href');
                const absoluteUrl = new URL(href, baseUrl).href;
                
                // Filter out non-HTTP(S) links
                if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
                    // Remove fragment
                    const cleanUrl = absoluteUrl.split('#')[0];
                    links.add(cleanUrl);
                }
            } catch (err) {
                // Invalid URL, skip
            }
        });
        
        return Array.from(links);
    }
    
    extractForms($, pageUrl) {
        const forms = [];
        
        $('form').each((_, form) => {
            const $form = $(form);
            const action = $form.attr('action') || pageUrl;
            const method = ($form.attr('method') || 'GET').toUpperCase();
            
            const inputs = [];
            
            $form.find('input, textarea, select').each((_, input) => {
                const $input = $(input);
                inputs.push({
                    name: $input.attr('name'),
                    type: $input.attr('type') || 'text',
                    required: $input.attr('required') !== undefined
                });
            });
            
            try {
                const absoluteAction = new URL(action, pageUrl).href;
                
                forms.push({
                    action: absoluteAction,
                    method,
                    inputs,
                    pageUrl
                });
            } catch (err) {
                // Invalid action URL
            }
        });
        
        return forms;
    }
    
    extractEndpoints($, html, pageUrl) {
        const endpoints = [];
        
        // Look for API endpoints in JavaScript
        $('script').each((_, script) => {
            const content = $(script).html() || '';
            
            // Find fetch/axios calls
            const apiPatterns = [
                /fetch\(['"`]([^'"`]+)['"`]/g,
                /axios\.[a-z]+\(['"`]([^'"`]+)['"`]/g,
                /\$\.ajax\(['"`]([^'"`]+)['"`]/g,
                /['"`](\/api\/[^'"`]+)['"`]/g
            ];
            
            for (const pattern of apiPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    try {
                        const endpoint = new URL(match[1], pageUrl).href;
                        endpoints.push({
                            url: endpoint,
                            discoveredIn: pageUrl,
                            type: 'api'
                        });
                    } catch (err) {
                        // Invalid URL
                    }
                }
            }
        });
        
        // Look for common endpoints
        const commonEndpoints = [
            '/api', '/api/v1', '/api/v2',
            '/admin', '/login', '/logout',
            '/graphql', '/swagger', '/api-docs',
            '/.well-known', '/robots.txt', '/sitemap.xml'
        ];
        
        for (const endpoint of commonEndpoints) {
            try {
                const url = new URL(endpoint, this.baseUrl).href;
                endpoints.push({
                    url,
                    discoveredIn: 'common-paths',
                    type: 'common'
                });
            } catch (err) {
                // Invalid URL
            }
        }
        
        return endpoints;
    }
    
    detectTechnologies(response) {
        const headers = response.headers;
        const html = response.data;
        
        // Server header
        if (headers['server']) {
            this.results.technologies.add(headers['server']);
        }
        
        // X-Powered-By
        if (headers['x-powered-by']) {
            this.results.technologies.add(headers['x-powered-by']);
        }
        
        // Framework detection
        if (html.includes('wp-content')) {
            this.results.technologies.add('WordPress');
        }
        if (html.includes('_next')) {
            this.results.technologies.add('Next.js');
        }
        if (html.includes('__nuxt')) {
            this.results.technologies.add('Nuxt.js');
        }
        if (html.includes('ng-version')) {
            this.results.technologies.add('Angular');
        }
        if (html.includes('react')) {
            this.results.technologies.add('React');
        }
    }
    
    async loadRobotsTxt() {
        try {
            const robotsUrl = new URL('/robots.txt', this.baseUrl).href;
            const response = await axios.get(robotsUrl, {
                timeout: 5000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                this.robotsRules = this.parseRobotsTxt(response.data);
            }
        } catch (error) {
            // robots.txt not found or error, allow all
            this.robotsRules = { disallow: [] };
        }
    }
    
    parseRobotsTxt(content) {
        const rules = { disallow: [] };
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim().toLowerCase();
            if (trimmed.startsWith('disallow:')) {
                const path = trimmed.substring(9).trim();
                if (path) {
                    rules.disallow.push(path);
                }
            }
        }
        
        return rules;
    }
    
    isAllowedByRobots(url) {
        if (!this.robotsRules) {
            return true;
        }
        
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        
        for (const disallowedPath of this.robotsRules.disallow) {
            if (path.startsWith(disallowedPath)) {
                return false;
            }
        }
        
        return true;
    }
    
    isSameOrigin(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.origin === this.baseUrl.origin;
        } catch (err) {
            return false;
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Normalize target to URL
 */
function normalizeTarget(target, type) {
    if (type === 'URL') {
        return target;
    }
    
    if (type === 'DOMAIN') {
        return `https://${target}`;
    }
    
    if (type === 'IP') {
        return `http://${target}`;
    }
    
    return target;
}
