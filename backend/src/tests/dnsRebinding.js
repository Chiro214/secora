import axios from 'axios';
import { logger } from '../utils/logger.js';

export async function testDnsRebinding(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    logger.info(`[DnsRebinding] Testing endpoint: ${endpoint.url}`);

    try {
        const urlObj = new URL(endpoint.url);
        
        // 1. Host Header Validation
        const maliciousHosts = ['localhost', '127.0.0.1', 'internal.local', '169.254.169.254'];
        
        for (const host of maliciousHosts) {
            try {
                const resp = await axios.get(endpoint.url, {
                    headers: { ...endpoint.headers, 'Host': host },
                    timeout,
                    validateStatus: () => true
                });
                
                // If it succeeds and returns something different than normal but still 200, it might be routing internally
                // We do a basic check here, though a true positive requires comparing it to a baseline request
                if (resp.status >= 200 && resp.status < 300) {
                     findings.push({
                        title: 'Weak Host Header Validation (Potential DNS Rebinding)',
                        description: `The server accepted an HTTP request with the Host header set to '${host}'. If the application relies on the Host header for internal routing or URL generation, it may be vulnerable to Host Header Injection or facilitate DNS Rebinding attacks.`,
                        category: 'SECURITY_MISCONFIG',
                        severity: 'LOW',
                        cvss: 3.1,
                        detectedBy: 'dns-rebinding-engine',
                        confidence: 70,
                        evidence: [{ type: 'REQUEST', title: 'Injected Header', content: `Host: ${host}` }],
                        remediation: 'Configure the web server to reject requests that contain unrecognized or internal Host headers. Ensure virtual hosts are strictly defined.'
                    });
                    break; // Just report once for the Host header weakness
                }
            } catch (e) {}
        }

        // 2. OAST Rebinding (Simulated detection via callback)
        if (options.oastClient && endpoint.method === 'GET') {
            const oastDomain = options.oastClient.getDomain();
            // A true rebinding test involves an infrastructure domain (e.g., rebind.network) that 
            // responds with the OAST IP on lookup 1, and 127.0.0.1 on lookup 2.
            // For the automated engine, we simulate passing the OAST domain into parameters that look like URLs
            
            const queryUrl = new URL(endpoint.url);
            let paramInjected = false;
            
            for (const [key, value] of queryUrl.searchParams.entries()) {
                if (value.startsWith('http') || key.toLowerCase().includes('url') || key.toLowerCase().includes('uri')) {
                    queryUrl.searchParams.set(key, `http://${oastDomain}`);
                    paramInjected = true;
                }
            }

            if (paramInjected) {
                try {
                    await axios.get(queryUrl.toString(), { timeout, validateStatus: () => true });
                    
                    await new Promise(r => setTimeout(r, 3000));
                    const interactions = await options.oastClient.getInteractions();
                    
                    if (interactions && interactions.length > 0) {
                        findings.push({
                            title: 'DNS Rebinding / SSRF via URL Parameter',
                            description: `The application fetches URLs provided in parameters and interacted with our OAST server. If the server does not pin DNS resolutions, an attacker could use a DNS rebinding domain (resolving to a public IP first, then an internal IP) to bypass SSRF filters and access internal services (e.g., 127.0.0.1 or AWS Metadata).`,
                            category: 'SSRF',
                            severity: 'HIGH',
                            cvss: 8.6,
                            detectedBy: 'dns-rebinding-engine',
                            confidence: 100,
                            evidence: [
                                { type: 'REQUEST', title: 'Payload', content: queryUrl.toString() },
                                { type: 'NETWORK', title: 'OAST Interaction', content: JSON.stringify(interactions[0], null, 2) }
                            ],
                            remediation: 'When fetching external resources, resolve the domain to an IP address, ensure the IP is not in a private/reserved range, and use that specific IP for the HTTP request to prevent Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding attacks.'
                        });
                    }
                } catch (e) {}
            }
        }

    } catch (e) {
        logger.error(`[DnsRebinding] Test failed: ${e.message}`);
    }

    return findings;
}
