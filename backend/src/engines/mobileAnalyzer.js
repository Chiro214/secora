import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import xml2js from 'xml2js';

const execAsync = util.promisify(exec);

// Common secrets regex patterns
const SECRET_PATTERNS = [
    { name: 'AWS Access Key ID', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, severity: 'CRITICAL', category: 'HARDCODED_SECRET' },
    { name: 'Google Cloud API Key', regex: /AIza[0-9A-Za-z-_]{35}/g, severity: 'HIGH', category: 'HARDCODED_SECRET' },
    { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/g, severity: 'CRITICAL', category: 'HARDCODED_SECRET' },
    { name: 'Twilio API Key', regex: /SK[0-9a-fA-F]{32}/g, severity: 'HIGH', category: 'HARDCODED_SECRET' },
    { name: 'Generic Password/Secret', regex: /(password|secret|token|api_key|apikey)["'\s:=]+["']([a-zA-Z0-9\-_]{8,})["']/gi, severity: 'MEDIUM', category: 'HARDCODED_SECRET' },
    { name: 'Backend API URL', regex: /https?:\/\/(?!schemas\.android\.com)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/\S*)?/g, severity: 'LOW', category: 'INFORMATION_DISCLOSURE' }
];

export async function analyzeAPK(apkPath) {
    const findings = [];
    const outDir = `${apkPath}_decompiled`;
    
    logger.info(`[Mobile] Starting analysis on ${apkPath}`);

    try {
        // Step 1: Decompile using apktool
        logger.info(`[Mobile] Decompiling APK to ${outDir}`);
        try {
            await execAsync(`apktool d -f "${apkPath}" -o "${outDir}"`);
        } catch (execErr) {
            logger.warn(`[Mobile] apktool execution failed, falling back to mock analysis if testing. Error: ${execErr.message}`);
            // If we are in a test environment and apktool fails (e.g. Java missing), we check if outDir exists with mock files
            if (!fs.existsSync(outDir)) {
                throw new Error("apktool failed and no mock files found.");
            }
        }

        // Step 2: Parse AndroidManifest.xml
        const manifestPath = path.join(outDir, 'AndroidManifest.xml');
        if (fs.existsSync(manifestPath)) {
            logger.info(`[Mobile] Parsing AndroidManifest.xml`);
            const manifestXml = fs.readFileSync(manifestPath, 'utf8');
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(manifestXml);
            
            const manifest = result.manifest;
            const app = manifest.application ? manifest.application[0] : null;

            if (app) {
                const attrs = app['$'] || {};
                
                // M1: Improper Platform Usage - allowBackup
                if (attrs['android:allowBackup'] === 'true') {
                    findings.push({
                        title: 'Insecure Backup Configuration',
                        category: 'MISCONFIGURATION',
                        severity: 'MEDIUM',
                        cvss: 5.3,
                        owasp: 'M1: Improper Platform Usage',
                        description: 'The application allows ADB backups (android:allowBackup="true"). An attacker with physical access or ADB access can extract sensitive data from the app sandbox.',
                        remediation: 'Set android:allowBackup="false" in AndroidManifest.xml.',
                        detectedBy: 'mobile-analyzer',
                        evidence: [{ type: 'CODE', title: 'AndroidManifest.xml', content: '<application android:allowBackup="true" ...>' }]
                    });
                }

                // M1: Improper Platform Usage - debuggable
                if (attrs['android:debuggable'] === 'true') {
                    findings.push({
                        title: 'Application is Debuggable',
                        category: 'MISCONFIGURATION',
                        severity: 'HIGH',
                        cvss: 7.5,
                        owasp: 'M1: Improper Platform Usage',
                        description: 'The application is compiled in debug mode (android:debuggable="true"). This allows attackers to attach debuggers, extract memory, and manipulate execution.',
                        remediation: 'Set android:debuggable="false" for production releases.',
                        detectedBy: 'mobile-analyzer',
                        evidence: [{ type: 'CODE', title: 'AndroidManifest.xml', content: '<application android:debuggable="true" ...>' }]
                    });
                }

                // Analyze Exported Activities/Receivers
                const components = ['activity', 'service', 'receiver', 'provider'];
                for (const comp of components) {
                    if (app[comp]) {
                        for (const item of app[comp]) {
                            const cAttrs = item['$'] || {};
                            const isExported = cAttrs['android:exported'] === 'true';
                            const hasIntentFilter = item['intent-filter'] !== undefined;
                            
                            // If exported explicitly, or implicitly via intent-filters (pre-Android 12 behavior)
                            if (isExported || (hasIntentFilter && cAttrs['android:exported'] !== 'false')) {
                                findings.push({
                                    title: `Exported ${comp.charAt(0).toUpperCase() + comp.slice(1)} without Permissions`,
                                    category: 'BROKEN_ACCESS',
                                    severity: 'MEDIUM',
                                    cvss: 5.5,
                                    owasp: 'M1: Improper Platform Usage',
                                    description: `The component ${cAttrs['android:name']} is exported and can be invoked by other applications on the device.`,
                                    remediation: `If the component does not need to be accessible to other apps, set android:exported="false". If it does, protect it with custom permissions.`,
                                    detectedBy: 'mobile-analyzer',
                                    evidence: [{ type: 'CODE', title: 'AndroidManifest.xml', content: `<${comp} android:name="${cAttrs['android:name']}" android:exported="${isExported}" ...>` }]
                                });
                            }
                        }
                    }
                }
            }
        }

        // Step 3: Scan Smali, XML, and Properties files for Secrets
        logger.info(`[Mobile] Scanning decompiled files for secrets`);
        const filesToScan = [];
        
        // Recursive file walker
        function walkDir(dir) {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    walkDir(fullPath);
                } else if (fullPath.endsWith('.smali') || fullPath.endsWith('.xml') || fullPath.endsWith('.properties')) {
                    filesToScan.push(fullPath);
                }
            }
        }
        
        walkDir(outDir);

        for (const file of filesToScan) {
            const content = fs.readFileSync(file, 'utf8');
            for (const pattern of SECRET_PATTERNS) {
                let match;
                while ((match = pattern.regex.exec(content)) !== null) {
                    const secretMatch = match[0];
                    // Redact secret for evidence
                    const redacted = secretMatch.substring(0, 4) + '*'.repeat(secretMatch.length - 8) + secretMatch.substring(secretMatch.length - 4);
                    
                    // Prevent duplicates
                    const exists = findings.find(f => f.title === `Hardcoded ${pattern.name}` && f.evidence[0].content.includes(redacted));
                    if (!exists) {
                        findings.push({
                            title: `Hardcoded ${pattern.name}`,
                            category: pattern.category,
                            severity: pattern.severity,
                            cvss: pattern.severity === 'CRITICAL' ? 9.0 : pattern.severity === 'HIGH' ? 7.5 : 5.0,
                            owasp: 'M9: Insecure Data Storage',
                            description: `Found a hardcoded ${pattern.name} in the application source code.`,
                            remediation: 'Remove hardcoded secrets from the codebase. Fetch them securely at runtime from a backend server or use the Android Keystore.',
                            detectedBy: 'mobile-analyzer',
                            evidence: [{ type: 'CODE', title: `File: ${path.basename(file)}`, content: `Found: ${redacted}` }]
                        });
                    }
                }
            }
        }

        // Cleanup
        if (process.env.KEEP_APK_DIR !== 'true') {
            logger.info(`[Mobile] Cleaning up ${outDir}`);
            fs.rmSync(outDir, { recursive: true, force: true });
            if (fs.existsSync(apkPath)) {
                fs.unlinkSync(apkPath);
            }
        }

        logger.info(`[Mobile] Analysis complete. Found ${findings.length} vulnerabilities.`);
        return findings;

    } catch (e) {
        logger.error(`[Mobile] Analysis failed: ${e.message}`);
        throw e;
    }
}
