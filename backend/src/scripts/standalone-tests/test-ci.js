import express from 'express';
import { exec } from 'child_process';
import path from 'path';

async function main() {
    console.log('🧪 Testing SECORA CI/CD Integration...');

    const app = express();
    app.use(express.json());

    // Mock SECORA Backend API
    app.post('/api/scans/start', (req, res) => {
        console.log('[Mock Backend] Received scan request for:', req.body.url);
        res.json({ scanId: 'mock-scan-1234' });
    });

    let pollCount = 0;
    app.get('/api/scans/mock-scan-1234', (req, res) => {
        pollCount++;
        if (pollCount < 2) {
            // Simulate running state for the first poll
            res.json({ status: 'RUNNING', progress: 50 });
        } else {
            // Simulate completion with a HIGH finding
            console.log('[Mock Backend] Returning COMPLETED report with 1 HIGH finding.');
            res.json({
                status: 'COMPLETED',
                progress: 100,
                findings: [
                    { name: 'Mock SQL Injection', severity: 'HIGH' },
                    { name: 'Mock Verbose Error', severity: 'LOW' }
                ]
            });
        }
    });

    const server = app.listen(5000, () => {
        console.log('[Mock Backend] Listening on port 5000');
        
        console.log('--- Triggering secora-cli.js ---');
        // Execute the CLI script as it would run in a CI pipeline
        const cliProcess = exec('node secora-cli.js -u http://example.com -a "dummy-key" -e "http://localhost:5000/api" --fail-on HIGH');
        
        cliProcess.stdout.on('data', (data) => process.stdout.write(data));
        cliProcess.stderr.on('data', (data) => process.stderr.write(data));
        
        cliProcess.on('close', (code) => {
            console.log(`\n--- CLI Exited with code ${code} ---`);
            server.close();
            
            // If we set --fail-on HIGH and a HIGH finding exists, it MUST exit with code 1.
            if (code === 1) {
                console.log('SUCCESS: CLI successfully failed the build (Exit Code 1) due to HIGH severity finding!');
                process.exit(0);
            } else {
                console.error('FAILED: CLI did not return Exit Code 1. It returned ' + code);
                process.exit(1);
            }
        });
    });
}

main().catch(console.error);
