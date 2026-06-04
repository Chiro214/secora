import express from 'express';
import { secoraIast } from './src/iast-agent/index.js';
import iastRouter from './src/routes/iast.js';
import child_process from 'child_process';
import axios from 'axios';

async function main() {
    console.log('🧪 Testing Priority 6: Interactive Application Security Testing (IAST)');

    // 1. Start SECORA Backend (Ingestion API)
    const backendApp = express();
    backendApp.use('/api/iast', iastRouter);
    const backendServer = backendApp.listen(5000, () => {
        console.log('✅ SECORA IAST Ingestion API running on port 5000');
    });

    // 2. Start Vulnerable Target App (Instrumented with IAST Agent)
    const targetApp = express();
    
    // Attach IAST middleware
    targetApp.use(secoraIast({
        ingestionUrl: 'http://localhost:5000/api/iast/ingest',
        token: 'test-token'
    }));

    // Vulnerable endpoint (OS Command Injection)
    targetApp.get('/ping', (req, res) => {
        const ip = req.query.ip || '127.0.0.1';
        // VULNERABILITY: Unsanitized input passed directly to exec
        child_process.exec(`ping -c 1 ${ip}`, (err, stdout) => {
            res.send(stdout || 'Done');
        });
    });

    const targetServer = targetApp.listen(5556, async () => {
        console.log('✅ Instrumented Vulnerable Target running on port 5556');

        console.log('\n--- Initiating DAST Attack with Tracing ---');
        
        // 3. Simulate DAST Scanner attacking the endpoint
        const scanId = 'scan-iast-123';
        const assetId = 'asset-456';
        const endpointId = 'ep-789';
        const traceId = `${scanId}:${assetId}:${endpointId}:os-command-injection`;
        
        const payload = '127.0.0.1; cat /etc/passwd';
        console.log(`Sending Payload: ${payload}`);
        console.log(`Injected Trace ID: ${traceId}`);

        try {
            await axios.get(`http://localhost:5556/ping?ip=${encodeURIComponent(payload)}`, {
                headers: {
                    'X-Secora-Trace': traceId
                }
            });
        } catch (e) {
            // Ignore target errors, we just care if the telemetry hit
        }

        // 4. Verify Telemetry Reached SECORA
        console.log('\n--- Checking SECORA Backend for IAST Findings ---');
        setTimeout(() => {
            const findings = global.iastFindings.get(scanId);
            if (findings && findings.length > 0) {
                console.log(`✅ SUCCESS: SECORA successfully received IAST telemetry!`);
                console.log(JSON.stringify(findings[0], null, 2));
            } else {
                console.error('❌ FAILED: No IAST telemetry received.');
            }

            backendServer.close();
            targetServer.close();
            process.exit(0);
        }, 1000); // Wait 1s for the async POST to arrive
    });
}

main().catch(console.error);
