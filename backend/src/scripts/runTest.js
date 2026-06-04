import { vulnTestEngine } from '../engines/vulnTest.js';

async function run() {
    console.log('Testing vulnTestEngine execution...');
    try {
        const result = await vulnTestEngine({
            scanId: 'test-scan-123',
            assets: [
                { id: '1', type: 'HOST', value: 'http://localhost:8080' }
            ],
            endpoints: [
                {
                    id: 'e1',
                    url: 'http://localhost:8080/vulnerabilities/sqli/',
                    method: 'GET',
                    parameters: { id: '1', Submit: 'Submit' },
                    headers: { 'Cookie': 'security=low; PHPSESSID=1234567890abcdef' }
                }
            ],
            config: {
                testTypes: ['all'],
                aggressive: true,
                wafEvasion: true
            }
        });
        
        console.log(`Scan completed with ${result.findings.length} findings.`);
        if (result.findings.length > 0) {
            console.log('Sample finding:', result.findings[0].title);
        }
    } catch (e) {
        console.error('Engine error:', e);
    }
}

run();
