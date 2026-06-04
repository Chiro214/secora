#!/usr/bin/env node

/**
 * SECORA DevSecOps CLI
 * Designed to be run within CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins).
 * Triggers a scan via the SECORA REST API, polls for completion, and fails the build
 * if vulnerabilities matching the specified severity threshold are found.
 */

import axios from 'axios';
import { program } from 'commander';

program
    .version('1.0.0')
    .requiredOption('-u, --url <url>', 'Target URL to scan')
    .requiredOption('-a, --api-key <key>', 'SECORA API Key')
    .option('-e, --endpoint <endpoint>', 'SECORA Backend API Endpoint', 'http://localhost:5000/api')
    .option('-f, --fail-on <severity>', 'Fail build on finding of severity (CRITICAL, HIGH, MEDIUM, LOW)', 'HIGH')
    .option('-t, --timeout <minutes>', 'Max wait time for scan completion', 30)
    .parse(process.argv);

const options = program.opts();

const SEVERITY_LEVELS = {
    'CRITICAL': 4,
    'HIGH': 3,
    'MEDIUM': 2,
    'LOW': 1,
    'INFO': 0
};

async function main() {
    console.log(`🚀 Starting SECORA DevSecOps Scan against ${options.url}`);
    
    const client = axios.create({
        baseURL: options.endpoint,
        headers: {
            'Authorization': `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    try {
        // 1. Trigger the scan
        console.log('Initiating scan...');
        const startRes = await client.post('/scans/start', {
            targetId: 'CI_CD_DYNAMIC', // We'll handle on-the-fly targets in backend or expect a valid targetId
            url: options.url,
            profile: 'full',
            aggressive: true, // CI scans should be aggressive
            testTypes: ['all']
        }).catch(err => {
            if (err.response) throw new Error(`API Error: ${err.response.data.error || err.response.statusText}`);
            throw err;
        });

        const scanId = startRes.data.scanId;
        console.log(`✅ Scan initiated successfully. Scan ID: ${scanId}`);

        // 2. Poll for completion
        const startTime = Date.now();
        const timeoutMs = options.timeout * 60 * 1000;
        let isComplete = false;
        let scanResult = null;

        process.stdout.write('Polling status: ');
        
        while (!isComplete) {
            if (Date.now() - startTime > timeoutMs) {
                console.log('\n❌ Scan timed out.');
                process.exit(1);
            }

            await new Promise(r => setTimeout(r, 10000)); // Poll every 10 seconds
            
            try {
                const statusRes = await client.get(`/scans/${scanId}`);
                const status = statusRes.data.status;
                
                if (status === 'COMPLETED') {
                    isComplete = true;
                    scanResult = statusRes.data;
                    console.log(' COMPLETED!');
                } else if (status === 'FAILED') {
                    console.log('\n❌ Scan failed on the server.');
                    process.exit(1);
                } else {
                    process.stdout.write('.');
                }
            } catch (err) {
                console.log('\n❌ Error polling status: ' + err.message);
                process.exit(1);
            }
        }

        // 3. Evaluate results
        console.log('\n📊 Scan Results:');
        const findings = scanResult.findings || [];
        
        let highestSeverity = -1;
        const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
        
        findings.forEach(f => {
            const sev = f.severity.toUpperCase();
            if (counts[sev] !== undefined) counts[sev]++;
            const level = SEVERITY_LEVELS[sev] || 0;
            if (level > highestSeverity) highestSeverity = level;
        });

        console.log(`   CRITICAL: ${counts.CRITICAL}`);
        console.log(`   HIGH:     ${counts.HIGH}`);
        console.log(`   MEDIUM:   ${counts.MEDIUM}`);
        console.log(`   LOW:      ${counts.LOW}`);

        const thresholdLevel = SEVERITY_LEVELS[options.failOn.toUpperCase()];
        if (thresholdLevel === undefined) {
            console.warn(`Invalid fail-on threshold '${options.failOn}'. Defaulting to HIGH.`);
        }

        // 4. Fail the build if necessary
        if (highestSeverity >= (thresholdLevel || 3)) {
            console.log(`\n❌ BUILD FAILED: Vulnerabilities found meeting or exceeding threshold (${options.failOn}).`);
            process.exit(1);
        } else {
            console.log(`\n✅ BUILD PASSED: No vulnerabilities found exceeding threshold.`);
            process.exit(0);
        }

    } catch (err) {
        console.error(`\n❌ Fatal Error: ${err.message}`);
        process.exit(1);
    }
}

main();
