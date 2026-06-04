import axios from 'axios';
import { logger } from '../utils/logger.js';

export async function testWebCacheDeception(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;

    // Only test GET requests with authentication
    if (endpoint.method !== 'GET' || !endpoint.headers || !endpoint.headers['Authorization'] && !endpoint.headers['Cookie']) {
        return findings;
    }

    logger.info(`[WebCacheDeception] Testing endpoint: ${endpoint.url}`);

    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.gif', '.ico', '.woff', '.svg'];
    const urlObj = new URL(endpoint.url);

    try {
        // Base response for comparison (authenticated)
        const baseResp = await axios.get(endpoint.url, {
            headers: endpoint.headers,
            timeout,
            validateStatus: () => true
        });

        // We need a response that looks like user-specific data (e.g., JSON response or HTML with profile info)
        if (baseResp.status !== 200) return findings;
        const baseBody = typeof baseResp.data === 'string' ? baseResp.data : JSON.stringify(baseResp.data);

        for (const ext of staticExtensions) {
            // Append static extension to the path
            const testPath = urlObj.pathname.endsWith('/') 
                ? `${urlObj.pathname}nonexistent${ext}`
                : `${urlObj.pathname}/nonexistent${ext}`;
            
            const testUrl = `${urlObj.protocol}//${urlObj.host}${testPath}${urlObj.search}`;

            // Step 1: Request with Authentication (Populate Cache)
            const authResp = await axios.get(testUrl, {
                headers: endpoint.headers,
                timeout,
                validateStatus: () => true
            });

            // If the framework normalizes the path and returns the same content (e.g., ignoring /nonexistent.css)
            const authBody = typeof authResp.data === 'string' ? authResp.data : JSON.stringify(authResp.data);
            
            // Similarity check (naive)
            if (authResp.status === 200 && Math.abs(authBody.length - baseBody.length) < 100) {
                
                // Step 2: Request WITHOUT Authentication (Check Cache)
                // We strip the Authorization and Cookie headers
                const unauthHeaders = { ...endpoint.headers };
                delete unauthHeaders['Authorization'];
                delete unauthHeaders['Cookie'];

                const unauthResp = await axios.get(testUrl, {
                    headers: unauthHeaders,
                    timeout,
                    validateStatus: () => true
                });

                const unauthBody = typeof unauthResp.data === 'string' ? unauthResp.data : JSON.stringify(unauthResp.data);

                // If the unauthenticated request returns the sensitive authenticated content, the CDN cached it!
                if (unauthResp.status === 200 && Math.abs(unauthBody.length - authBody.length) < 100 && unauthBody === authBody) {
                    
                    // Verify it wasn't just a public endpoint to begin with
                    const publicCheck = await axios.get(endpoint.url, { headers: unauthHeaders, timeout, validateStatus: () => true });
                    if (publicCheck.status !== 200 || publicCheck.data !== baseResp.data) {
                        findings.push({
                            assetId: endpoint.assetId,
                            endpointId: endpoint.id,
                            title: 'Web Cache Deception via Path Confusion',
                            description: `The application normalizes URLs differently than the frontend CDN/Cache. By appending a static extension ('${ext}') to the authenticated API endpoint, the CDN was tricked into caching the sensitive authenticated response, allowing unauthenticated users to retrieve it.`,
                            category: 'SECURITY_MISCONFIG',
                            severity: 'HIGH',
                            cvss: 8.2,
                            detectedBy: 'cache-deception-engine',
                            confidence: 95,
                            evidence: [
                                { type: 'REQUEST', title: 'Deceptive URL', content: testUrl },
                                { type: 'LOG', title: 'Impact', content: 'Sensitive authenticated data was successfully retrieved without credentials due to cache misconfiguration.' }
                            ],
                            remediation: 'Configure the CDN/Cache to only cache files based on the Content-Type header, not just the URL extension. Ensure backend frameworks respond with a 404 for invalid paths rather than normalizing and ignoring appended strings.'
                        });
                        break; // Found it for this endpoint
                    }
                }
            }
        }
    } catch (e) {
        logger.debug(`[WebCacheDeception] Test failed: ${e.message}`);
    }

    return findings;
}
