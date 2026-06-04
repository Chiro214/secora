// backend/src/tests/infoDisclosure.js
import axios from 'axios';
import { captureUrl } from '../utils/screenshotCapture.js';

export async function testInformationDisclosure(asset) {
    const findings = [];
    const baseUrl = asset.value.startsWith('http') ? asset.value : `https://${asset.value}`;
    
    // Common sensitive files
    const sensitiveFiles = [
        '/.env',
        '/.git/config',
        '/backup.zip',
        '/backup.sql',
        '/.DS_Store',
        '/web.config',
        '/phpinfo.php',
        '/.htaccess',
        '/composer.json',
        '/package.json',
        '/swagger.json',
        '/api-docs',
        '/.well-known/security.txt'
    ];
    
    for (const file of sensitiveFiles) {
        try {
            const url = `${baseUrl}${file}`;
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                const findingId = `info-${file.replace(/[^a-z0-9]/gi, '')}`;

                // Capture browser screenshot of the exposed file
                let screenshot = null;
                try {
                    screenshot = await captureUrl(url, findingId, `Exposed File: ${file}`);
                } catch (e) {
                    console.warn(`Screenshot capture failed for ${findingId}:`, e.message);
                }

                const evidence = [{
                    type: 'RESPONSE',
                    title: `Accessible File: ${file}`,
                    content: `URL: ${url}\nStatus: ${response.status}\nContent-Type: ${response.headers['content-type']}`
                }];
                if (screenshot) {
                    evidence.push({
                        type: 'SCREENSHOT',
                        title: `Exposed File Visual Proof — ${file}`,
                        content: screenshot.base64
                    });
                }

                findings.push({
                    assetId: asset.id,
                    title: `Sensitive File Exposed: ${file}`,
                    description: `The file ${file} is publicly accessible and may contain sensitive information.`,
                    category: 'INFORMATION_DISCLOSURE',
                    severity: file.includes('.env') || file.includes('.git') ? 'HIGH' : 'MEDIUM',
                    cvss: file.includes('.env') ? 7.5 : 5.3,
                    owasp: 'A01:2021',
                    cwe: 'CWE-200',
                    remediation: `Remove or restrict access to ${file}. Ensure sensitive files are not publicly accessible.`,
                    references: ['https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure'],
                    detectedBy: 'info-disclosure-test',
                    confidence: 100,
                    exploit: { screenshots: screenshot ? [screenshot] : [] },
                    evidence
                });
            }
        } catch (error) {
            // File not accessible, continue
        }
    }
    
    return findings;
}
