import axios from 'axios';
import { logger } from '../utils/logger.js';
import xml2js from 'xml2js';

export async function testSOAP(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    const isWsdl = endpoint.url.match(/(\?wsdl|\.asmx|\.svc|\/soap)/i);
    
    // We also test if the content type is XML
    const isXml = endpoint.headers && 
        (endpoint.headers['Content-Type']?.includes('xml') || endpoint.headers['content-type']?.includes('xml'));

    if (!isWsdl && !isXml && typeof endpoint.data !== 'string') {
        return findings;
    }
    
    // If it's a WSDL, parse it (simplified for POC)
    if (endpoint.method === 'GET' && isWsdl) {
        try {
            const resp = await axios.get(endpoint.url, { timeout, validateStatus: () => true });
            const bodyStr = (typeof resp.data === 'string') ? resp.data : JSON.stringify(resp.data);
            
            if (bodyStr.includes('<wsdl:definitions') || bodyStr.includes('<definitions')) {
                // Enumerate operations
                const operations = [];
                xml2js.parseString(bodyStr, (err, result) => {
                    if (!err && result) {
                        try {
                            const defs = result['wsdl:definitions'] || result['definitions'];
                            if (defs && defs['wsdl:portType']) {
                                const portTypes = defs['wsdl:portType'];
                                portTypes.forEach(pt => {
                                    if (pt['wsdl:operation']) {
                                        pt['wsdl:operation'].forEach(op => {
                                            operations.push(op.$.name);
                                        });
                                    }
                                });
                            }
                        } catch (e) {}
                    }
                });

                if (operations.length > 0) {
                     findings.push({
                        title: 'WSDL / SOAP Service Enumeration',
                        description: `A WSDL file was found at ${endpoint.url}. It exposes the following operations: ${operations.join(', ')}. WSDL files should typically be restricted in production environments to prevent exposing internal API surface area to attackers.`,
                        category: 'INFORMATION_DISCLOSURE',
                        severity: 'INFO',
                        cvss: 0.0,
                        detectedBy: 'soap-engine',
                        confidence: 100,
                        evidence: [{ type: 'LOG', title: 'Operations Discovered', content: operations.join('\n') }],
                        remediation: 'Disable WSDL generation/exposure in production environments.'
                    });
                }
            }
        } catch (e) {}
        
        return findings; // Done with GET WSDL
    }

    // If it's an XML/SOAP POST request, fuzz it
    if (endpoint.method === 'POST' && typeof endpoint.data === 'string' && endpoint.data.trim().startsWith('<')) {
        logger.info(`[SOAP] Testing XML endpoint: ${endpoint.url}`);
        
        try {
            // 1. XXE (XML External Entity)
            if (options.oastClient) {
                const oastDomain = options.oastClient.getDomain();
                const xxePayload = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://${oastDomain}/xxe">]>\n`;
                
                // Inject doctype before the root element
                const xmlContent = endpoint.data.replace(/^<\?xml.*?\?>/i, '').trim();
                const xxeReqData = xxePayload + xmlContent.replace(/>([^<]+)</g, '>&xxe;<'); // Inject entity reference

                try {
                    await axios.post(endpoint.url, xxeReqData, {
                        headers: endpoint.headers,
                        timeout,
                        validateStatus: () => true
                    });
                    
                    await new Promise(r => setTimeout(r, 3000));
                    const interactions = await options.oastClient.getInteractions();
                    
                    if (interactions && interactions.length > 0) {
                        findings.push({
                            title: 'XML External Entity (XXE) Injection',
                            description: `The XML parser securely resolves external entities. We successfully forced the server to make an HTTP request to our OAST server by injecting an external entity definition. This can lead to Server-Side Request Forgery (SSRF), local file disclosure, or Denial of Service (Billion Laughs attack).`,
                            category: 'INJECTION',
                            severity: 'CRITICAL',
                            cvss: 9.1,
                            detectedBy: 'soap-engine',
                            confidence: 100,
                            evidence: [
                                { type: 'REQUEST', title: 'Payload', content: xxeReqData },
                                { type: 'NETWORK', title: 'OAST Interaction', content: JSON.stringify(interactions[0], null, 2) }
                            ],
                            remediation: 'Disable DTD processing (External Entities) completely in the XML parser configuration.'
                        });
                    }
                } catch (e) {}
            }

            // 2. XPath Injection
            const xpathPayload = `' or '1'='1`;
            const xpathReqData = endpoint.data.replace(/>([^<]+)</g, `>${xpathPayload}<`);
            
            try {
                const resp = await axios.post(endpoint.url, xpathReqData, {
                    headers: endpoint.headers,
                    timeout,
                    validateStatus: () => true
                });
                
                const bodyStr = (typeof resp.data === 'string') ? resp.data : JSON.stringify(resp.data);
                
                // Simple heuristic: if it returns a completely different (and much larger) valid response, it might have bypassed logic
                // Or if it throws a specific XPath error
                if (bodyStr.includes('XPathException') || bodyStr.includes('System.Xml.XPath')) {
                     findings.push({
                        title: 'XPath Injection',
                        description: `The application appears vulnerable to XPath injection based on database/parser error messages returned in the response.`,
                        category: 'INJECTION',
                        severity: 'CRITICAL',
                        cvss: 9.8,
                        detectedBy: 'soap-engine',
                        confidence: 85,
                        evidence: [{ type: 'RESPONSE', title: 'Error Reflection', content: bodyStr.substring(0, 500) }],
                        remediation: 'Use parameterized XPath queries or pre-compile XPath expressions without user input.'
                    });
                }
            } catch (e) {}
            
            // 3. SOAPAction Header Manipulation
            if (endpoint.headers && (endpoint.headers['SOAPAction'] || endpoint.headers['soapaction'])) {
                const actionKey = endpoint.headers['SOAPAction'] ? 'SOAPAction' : 'soapaction';
                const originalAction = endpoint.headers[actionKey];
                
                const bypassHeaders = { ...endpoint.headers };
                bypassHeaders[actionKey] = '""'; // Empty action
                
                try {
                     const resp = await axios.post(endpoint.url, endpoint.data, {
                         headers: bypassHeaders,
                         timeout,
                         validateStatus: () => true
                     });
                     
                     // If the request succeeds with an empty action, it indicates action validation bypass
                     if (resp.status === 200 && !JSON.stringify(resp.data).includes('Fault')) {
                          findings.push({
                              title: 'SOAPAction Spoofing / Bypass',
                              description: `The SOAP endpoint processes requests even when the SOAPAction header is empty or manipulated. This could allow an attacker to bypass security filters that rely solely on the SOAPAction header to authorize operations.`,
                              category: 'SECURITY_MISCONFIG',
                              severity: 'MEDIUM',
                              cvss: 5.3,
                              detectedBy: 'soap-engine',
                              confidence: 80,
                              evidence: [{ type: 'REQUEST', title: 'Manipulated Header', content: `SOAPAction: ""` }],
                              remediation: 'Ensure the SOAPAction header strictly matches the operation defined in the SOAP Body and enforce authorization on the body content, not just the header.'
                          });
                     }
                } catch (e) {}
            }

        } catch (e) {
            logger.error(`[SOAP] Test failed: ${e.message}`);
        }
    }

    return findings;
}
