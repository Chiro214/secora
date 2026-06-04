import axios from 'axios';
import { logger } from '../utils/logger.js';

export async function testParameterPollution(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    logger.info(`[HPP] Testing HTTP Parameter Pollution on endpoint: ${endpoint.url}`);

    try {
        const urlObj = new URL(endpoint.url);
        const params = Array.from(urlObj.searchParams.keys());

        if (params.length === 0) return findings;

        for (const param of params) {
            const originalValue = urlObj.searchParams.get(param);
            const injectedValue = `secora_hpp_${Math.random().toString(36).substring(7)}`;
            
            // Construct HPP variations
            const payloads = [
                // 1. Standard duplicate (PHP/Apache takes last, ASP takes comma-separated, Node takes first or array)
                `${urlObj.toString()}&${param}=${injectedValue}`,
                
                // 2. Array syntax duplicate
                `${urlObj.toString()}&${param}[]=${injectedValue}`,
                
                // 3. Semicolon separation (some WAFs split on &, backends on ;)
                `${urlObj.toString()};${param}=${injectedValue}`
            ];

            for (const testUrl of payloads) {
                try {
                    const resp = await axios.get(testUrl, {
                        headers: endpoint.headers,
                        timeout,
                        validateStatus: () => true
                    });

                    const bodyStr = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
                    
                    // Detect if the injected value was processed instead of the original, 
                    // or if both were processed, or if it bypassed a filter
                    if (bodyStr.includes(injectedValue) && !bodyStr.includes(originalValue)) {
                        findings.push({
                            assetId: endpoint.assetId,
                            endpointId: endpoint.id,
                            title: 'HTTP Parameter Pollution (HPP)',
                            description: `The application is vulnerable to HTTP Parameter Pollution. When sending duplicate parameters (e.g., '${param}'), the backend processes the secondary/injected value ('${injectedValue}') while potentially overriding the initial intended value. This discrepancy can be used to bypass WAFs or alter business logic.`,
                            category: 'SECURITY_MISCONFIG',
                            severity: 'MEDIUM',
                            cvss: 5.3,
                            detectedBy: 'hpp-engine',
                            confidence: 90,
                            evidence: [
                                { type: 'REQUEST', title: 'HPP Payload', content: testUrl },
                                { type: 'RESPONSE', title: 'Reflection/Execution', content: `The backend processed the injected value: ${injectedValue}` }
                            ],
                            remediation: 'Ensure consistent parameter parsing between the WAF, reverse proxy, and application backend. Frameworks should explicitly handle multiple parameters with the same name (e.g., throw an error or strictly use the first/last).'
                        });
                        break; // Stop testing other payloads for this parameter if one succeeds
                    }
                } catch (e) {}
            }

            // Test HPP in JSON Body (if applicable)
            if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
                try {
                    const reqDataStr = typeof endpoint.data === 'string' ? endpoint.data : JSON.stringify(endpoint.data || {});
                    
                    if (reqDataStr.includes(`"${param}"`)) {
                        // Inject a duplicate JSON key
                        // Example: {"id":1} -> {"id":1,"id":"secora_hpp"}
                        const pollutedDataStr = reqDataStr.replace('}', `,"${param}":"${injectedValue}"}`);
                        
                        const resp = await axios.post(endpoint.url, pollutedDataStr, {
                            headers: { ...endpoint.headers, 'Content-Type': 'application/json' },
                            timeout,
                            validateStatus: () => true
                        });
                        
                        const bodyStr = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
                        
                        if (bodyStr.includes(injectedValue) && !bodyStr.includes(originalValue)) {
                             findings.push({
                                assetId: endpoint.assetId,
                                endpointId: endpoint.id,
                                title: 'JSON Parameter Pollution',
                                description: `The application processes JSON payloads with duplicate keys. The backend parser accepted the second value ('${injectedValue}') for key '${param}'. This JSON parsing discrepancy can be used to bypass security controls that only inspect the first key.`,
                                category: 'SECURITY_MISCONFIG',
                                severity: 'MEDIUM',
                                cvss: 5.3,
                                detectedBy: 'hpp-engine',
                                confidence: 90,
                                evidence: [
                                    { type: 'REQUEST', title: 'Polluted JSON', content: pollutedDataStr },
                                    { type: 'RESPONSE', title: 'Reflection/Execution', content: `The backend processed the injected value: ${injectedValue}` }
                                ],
                                remediation: 'Use strict JSON parsing libraries that throw an error when duplicate keys are encountered.'
                            });
                        }
                    }
                } catch (e) {}
            }
        }
    } catch (e) {
        logger.error(`[HPP] Test failed: ${e.message}`);
    }

    return findings;
}
