// backend/src/tests/log4shellTest.js
// Log4Shell (CVE-2021-44228) JNDI injection detection via OAST callbacks
import axios from 'axios';

// Headers commonly processed by Log4j — most critical first
const LOG4J_HEADERS = [
    'User-Agent', 'X-Forwarded-For', 'Referer', 'X-Api-Version',
    'Authorization', 'Accept-Language'
];

// Additional injection points
const LOG4J_PARAMS = ['username', 'email', 'search', 'q', 'name', 'id'];

export async function testLog4Shell(endpoint, options = {}) {
    const findings = [];
    const oastClient = options.oastClient || null;
    const timeout = options.timeout || 8000;

    if (!oastClient) {
        console.warn('Log4Shell test requires OAST client — skipping');
        return findings;
    }

    // Batch test: inject all headers in one shot, then wait once
    // This is much faster than testing each header individually
    const batchPayloads = [];
    for (const header of LOG4J_HEADERS) {
        const payload = oastClient.generatePayload('log4shell', `header:${header}`);
        batchPayloads.push({ header, payload });
    }

    // Inject all header payloads
    for (const { header, payload } of batchPayloads) {
        const jndiPayload = payload.payloads.basic || Object.values(payload.payloads)[0];
        if (!jndiPayload) continue;
        try {
            await axios.get(endpoint.url, {
                timeout,
                validateStatus: () => true,
                headers: { 'User-Agent': 'Mozilla/5.0', [header]: jndiPayload }
            });
        } catch { /* continue */ }
    }

    // Wait once for any callback (5s)
    await new Promise(r => setTimeout(r, 5000));

    // Check all payloads
    for (const { header, payload } of batchPayloads) {
        const callback = oastClient.checkCallback(payload.payloadId);
        if (callback) {
            findings.push(buildLog4ShellFinding(endpoint, `header:${header}`, {
                evidence: oastClient._buildEvidence
                    ? [
                        { type: 'PAYLOAD', title: `Log4Shell via ${header}`, content: `Header: ${header}\nPayload: ${payload.payloads.basic}\nCallback URL: ${payload.httpCallback}` },
                        { type: 'LOG', title: 'OAST Callback Confirmed', content: `Protocol: ${callback.protocol}\nSource: ${callback.sourceIp}\nReceived: ${callback.receivedAt}` }
                    ]
                    : []
            }));
            break;
        }
    }

    if (findings.length > 0) return findings;

    // Test URL parameters (limited scope for speed)
    const params = endpoint.parameters ? Object.keys(endpoint.parameters) : [];
    const testParams = [...new Set([...params, ...LOG4J_PARAMS])].slice(0, 4);

    for (const param of testParams) {
        const result = await oastClient.injectAndVerify({
            testType: 'log4shell',
            context: `param:${param}`,
            injector: async (oast) => {
                const payload = oast.payloads.basic || Object.values(oast.payloads)[0];
                if (!payload) return;
                try {
                    const testUrl = new URL(endpoint.url);
                    testUrl.searchParams.set(param, payload);
                    await axios.get(testUrl.toString(), { timeout, validateStatus: () => true });
                } catch { /* continue */ }
            },
            timeout: 5000
        });

        if (result) {
            findings.push(buildLog4ShellFinding(endpoint, `param:${param}`, result));
            break;
        }
    }

    return findings;
}

function buildLog4ShellFinding(endpoint, context, result) {
    return {
        assetId: endpoint.assetId,
        endpointId: endpoint.id,
        title: 'Log4Shell Remote Code Execution (CVE-2021-44228)',
        description: `The application is vulnerable to Log4Shell (CVE-2021-44228). JNDI lookup payload injected via ${context} triggered a DNS/HTTP callback, confirming the server processes Log4j format strings. This allows unauthenticated Remote Code Execution.`,
        category: 'INJECTION',
        severity: 'CRITICAL',
        cvss: 10.0,
        owasp: 'A06:2021',
        cwe: 'CWE-917',
        remediation: 'Upgrade Log4j to 2.17.1+. Set log4j2.formatMsgNoLookups=true. Remove JndiLookup class from classpath. Block outbound LDAP/RMI connections.',
        references: [
            'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
            'https://logging.apache.org/log4j/2.x/security.html'
        ],
        detectedBy: 'log4shell-engine',
        confidence: 99,
        evidence: result.evidence
    };
}

export default testLog4Shell;
