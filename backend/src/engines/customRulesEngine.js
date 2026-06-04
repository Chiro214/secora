import axios from 'axios';
import yaml from 'js-yaml';
import prisma from '../config/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Execute all enabled custom YAML rules against a given endpoint
 * @param {Object} endpoint The endpoint object
 * @returns {Array} List of findings discovered by custom templates
 */
export async function evaluateCustomTemplates(endpoint) {
    const findings = [];
    const baseUrl = new URL(endpoint.url).origin;
    
    try {
        // Fetch enabled templates
        const templates = await prisma.customTemplate.findMany({
            where: { enabled: true }
        });

        if (!templates || templates.length === 0) {
            return findings;
        }

        // Evaluate each template
        for (const templateRecord of templates) {
            try {
                const rule = yaml.load(templateRecord.yamlContent);
                
                // Validate rule format
                if (!rule.payloads || !rule.matchers) {
                    logger.warn(`Invalid rule format for template ${templateRecord.id}`);
                    continue;
                }

                // Test each payload
                for (const payload of rule.payloads) {
                    let testUrl = endpoint.url;
                    let headers = { 'User-Agent': 'SECORA-Custom-Rules-Engine' };
                    let data = null;

                    // Apply payload based on target area
                    if (templateRecord.target === 'URL') {
                        const parsedUrl = new URL(testUrl);
                        // Simple parameter pollution / path appending
                        if (parsedUrl.search) {
                            parsedUrl.searchParams.append('test', payload);
                        } else {
                            parsedUrl.pathname = parsedUrl.pathname.endsWith('/') 
                                ? parsedUrl.pathname + payload 
                                : parsedUrl.pathname + '/' + payload;
                        }
                        testUrl = parsedUrl.toString();
                    } else if (templateRecord.target === 'HEADER') {
                        headers['X-Custom-Test'] = payload;
                    } else if (templateRecord.target === 'COOKIE') {
                        headers['Cookie'] = `session=${payload}; test_cookie=${payload}`;
                    } else if (templateRecord.target === 'BODY') {
                        data = { test_input: payload };
                    }

                    // Execute request
                    const method = endpoint.method || 'GET';
                    let response;
                    try {
                        response = await axios({
                            method: method === 'GET' && data ? 'POST' : method,
                            url: testUrl,
                            headers: headers,
                            data: data,
                            validateStatus: () => true,
                            timeout: 5000
                        });
                    } catch (err) {
                        continue; // Skip payload on network error
                    }

                    // Evaluate matchers (All matchers must be true)
                    let isMatch = true;
                    
                    for (const matcher of rule.matchers) {
                        let matcherPassed = false;
                        if (matcher.type === 'status') {
                            if (matcher.status.includes(response.status)) {
                                matcherPassed = true;
                            }
                        } else if (matcher.type === 'word') {
                            const bodyText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                            // Default to OR for words within a single word matcher
                            if (matcher.words.some(word => bodyText.includes(word))) {
                                matcherPassed = true;
                            }
                        } else if (matcher.type === 'regex') {
                            const bodyText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                            let regexStr = matcher.regex;
                            let flags = 'i';
                            if (regexStr.startsWith('(?i)')) {
                                regexStr = regexStr.substring(4);
                            }
                            const regex = new RegExp(regexStr, flags);
                            if (regex.test(bodyText)) {
                                matcherPassed = true;
                            }
                        }
                        
                        if (!matcherPassed) {
                            isMatch = false;
                            break;
                        }
                    }

                    if (isMatch) {
                        findings.push({
                            type: templateRecord.name,
                            name: `Custom Rule Match: ${templateRecord.name}`,
                            description: `The application is vulnerable to a custom rule authored by ${templateRecord.author}.\n\nRule Description: ${rule.description || 'Custom security policy violation.'}`,
                            severity: templateRecord.severity,
                            endpoint: endpoint.url,
                            method: method,
                            parameter: templateRecord.target,
                            payload: payload,
                            evidence: `Matched payload ${payload} against rule matchers. Response status: ${response.status}`,
                            remediation: rule.remediation || "Review the custom rule definition and remediate the affected component."
                        });
                        
                        // We found a match for this rule on this endpoint, move to next rule
                        break; 
                    }
                }

            } catch (ruleErr) {
                logger.error(`Error parsing or evaluating custom template ${templateRecord.id}: ${ruleErr.message}`);
            }
        }

    } catch (err) {
        logger.error(`Custom Rules Engine failed: ${err.message}`);
    }

    return findings;
}
