// backend/src/tests/securityHeaders.js
import axios from 'axios';
import { captureHeaders } from '../utils/screenshotCapture.js';

const SECURITY_HEADERS = [
    'strict-transport-security',
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy'
];

export async function testSecurityHeaders(endpoint) {
    const findings = [];
    
    try {
        const response = await axios.get(endpoint.url, {
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: () => true
        });
        
        const headers = response.headers;
        
        // Determine which security headers are missing for the consolidated screenshot
        const missingHeaders = SECURITY_HEADERS.filter(h => !headers[h]);

        // Capture a single consolidated screenshot for all header findings
        let headerScreenshot = null;
        if (missingHeaders.length > 0) {
            try {
                const findingId = `hdr-${endpoint.id || 'check'}`;
                headerScreenshot = await captureHeaders(endpoint.url, headers, missingHeaders, findingId);
            } catch (e) {
                console.warn(`Header screenshot capture failed:`, e.message);
            }
        }

        // Helper to build evidence array with optional screenshot
        function buildEvidence(textEvidence) {
            const ev = [textEvidence];
            if (headerScreenshot) {
                ev.push({
                    type: 'SCREENSHOT',
                    title: `Security Headers Analysis — ${endpoint.url}`,
                    content: headerScreenshot.base64
                });
            }
            return ev;
        }

        // Check for missing security headers
        if (!headers['strict-transport-security']) {
            findings.push({
                assetId: endpoint.assetId,
                endpointId: endpoint.id,
                title: 'Missing Strict-Transport-Security Header',
                description: 'The Strict-Transport-Security (HSTS) header is not set, which may allow man-in-the-middle attacks.',
                category: 'SECURITY_MISCONFIG',
                severity: 'MEDIUM',
                cvss: 5.3,
                owasp: 'A05:2021',
                cwe: 'CWE-319',
                remediation: 'Add the Strict-Transport-Security header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
                references: ['https://owasp.org/www-project-secure-headers/'],
                detectedBy: 'security-headers-test',
                confidence: 100,
                exploit: { screenshots: headerScreenshot ? [headerScreenshot] : [] },
                evidence: buildEvidence({
                    type: 'RESPONSE',
                    title: 'Missing HSTS Header',
                    content: `URL: ${endpoint.url}\nStatus: ${response.status}\nHeaders: ${JSON.stringify(headers, null, 2)}`
                })
            });
        }
        
        if (!headers['content-security-policy']) {
            findings.push({
                assetId: endpoint.assetId,
                endpointId: endpoint.id,
                title: 'Missing Content-Security-Policy Header',
                description: 'No Content-Security-Policy header found, increasing risk of XSS and data injection attacks.',
                category: 'SECURITY_MISCONFIG',
                severity: 'HIGH',
                cvss: 6.5,
                owasp: 'A05:2021',
                cwe: 'CWE-693',
                remediation: 'Implement a Content-Security-Policy header: Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\';',
                references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
                detectedBy: 'security-headers-test',
                confidence: 100,
                exploit: { screenshots: headerScreenshot ? [headerScreenshot] : [] },
                evidence: buildEvidence({
                    type: 'RESPONSE',
                    title: 'Missing CSP Header',
                    content: `URL: ${endpoint.url}\nNo CSP header present`
                })
            });
        }
        
        if (!headers['x-frame-options'] && !headers['content-security-policy']?.includes('frame-ancestors')) {
            findings.push({
                assetId: endpoint.assetId,
                endpointId: endpoint.id,
                title: 'Missing Clickjacking Protection',
                description: 'No X-Frame-Options or CSP frame-ancestors directive found, making the site vulnerable to clickjacking attacks.',
                category: 'SECURITY_MISCONFIG',
                severity: 'MEDIUM',
                cvss: 4.3,
                owasp: 'A05:2021',
                cwe: 'CWE-1021',
                remediation: 'Add X-Frame-Options: DENY or Content-Security-Policy: frame-ancestors \'none\'',
                references: ['https://owasp.org/www-community/attacks/Clickjacking'],
                detectedBy: 'security-headers-test',
                confidence: 100,
                exploit: { screenshots: headerScreenshot ? [headerScreenshot] : [] },
                evidence: buildEvidence({
                    type: 'RESPONSE',
                    title: 'Missing Clickjacking Protection',
                    content: `URL: ${endpoint.url}\nNo X-Frame-Options or frame-ancestors directive`
                })
            });
        }
        
        if (!headers['x-content-type-options']) {
            findings.push({
                assetId: endpoint.assetId,
                endpointId: endpoint.id,
                title: 'Missing X-Content-Type-Options Header',
                description: 'The X-Content-Type-Options header is not set, allowing MIME-sniffing attacks.',
                category: 'SECURITY_MISCONFIG',
                severity: 'LOW',
                cvss: 3.7,
                owasp: 'A05:2021',
                cwe: 'CWE-16',
                remediation: 'Add X-Content-Type-Options: nosniff',
                references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
                detectedBy: 'security-headers-test',
                confidence: 100,
                exploit: { screenshots: headerScreenshot ? [headerScreenshot] : [] },
                evidence: buildEvidence({
                    type: 'RESPONSE',
                    title: 'Missing X-Content-Type-Options',
                    content: `URL: ${endpoint.url}\nNo X-Content-Type-Options header`
                })
            });
        }
        
        // Check for information disclosure headers
        if (headers['server']) {
            findings.push({
                assetId: endpoint.assetId,
                endpointId: endpoint.id,
                title: 'Server Header Information Disclosure',
                description: `Server header reveals server information: ${headers['server']}`,
                category: 'INFORMATION_DISCLOSURE',
                severity: 'LOW',
                cvss: 2.7,
                owasp: 'A01:2021',
                cwe: 'CWE-200',
                remediation: 'Remove or obfuscate the Server header to prevent information disclosure',
                references: [],
                detectedBy: 'security-headers-test',
                confidence: 100,
                exploit: { screenshots: headerScreenshot ? [headerScreenshot] : [] },
                evidence: buildEvidence({
                    type: 'RESPONSE',
                    title: 'Server Header Disclosure',
                    content: `URL: ${endpoint.url}\nServer: ${headers['server']}`
                })
            });
        }
        
        if (headers['x-powered-by']) {
            findings.push({
                assetId: endpoint.assetId,
                endpointId: endpoint.id,
                title: 'X-Powered-By Header Information Disclosure',
                description: `X-Powered-By header reveals technology stack: ${headers['x-powered-by']}`,
                category: 'INFORMATION_DISCLOSURE',
                severity: 'LOW',
                cvss: 2.7,
                owasp: 'A01:2021',
                cwe: 'CWE-200',
                remediation: 'Remove the X-Powered-By header',
                references: [],
                detectedBy: 'security-headers-test',
                confidence: 100,
                exploit: { screenshots: headerScreenshot ? [headerScreenshot] : [] },
                evidence: buildEvidence({
                    type: 'RESPONSE',
                    title: 'X-Powered-By Disclosure',
                    content: `URL: ${endpoint.url}\nX-Powered-By: ${headers['x-powered-by']}`
                })
            });
        }
        
    } catch (error) {
        console.error(`Error testing headers for ${endpoint.url}:`, error.message);
    }
    
    return findings;
}
