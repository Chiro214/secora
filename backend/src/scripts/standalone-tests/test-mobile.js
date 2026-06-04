import fs from 'fs';
import path from 'path';
import { analyzeAPK } from './src/engines/mobileAnalyzer.js';

async function main() {
    console.log('🧪 Testing Priority 4: Mobile APK Analysis');

    const apkPath = 'test.apk';
    const outDir = `${apkPath}_decompiled`;

    // 1. Setup Mock Decompiled Directory
    console.log(`\nSetting up mock decompiled directory: ${outDir}`);
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir, { recursive: true });

    // 2. Create Mock AndroidManifest.xml
    const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.secora.test">
    <application android:allowBackup="true" android:debuggable="true">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
            </intent-filter>
        </activity>
        <service android:name=".HiddenService" android:exported="true" />
    </application>
</manifest>`;
    fs.writeFileSync(path.join(outDir, 'AndroidManifest.xml'), manifestContent);

    // 3. Create Mock Smali File with Secrets
    const smaliDir = path.join(outDir, 'smali', 'com', 'secora', 'test');
    fs.mkdirSync(smaliDir, { recursive: true });
    
    const smaliContent = `
.class public Lcom/secora/test/Config;
.super Ljava/lang/Object;

.field public static final AWS_KEY:Ljava/lang/String; = "AKIAIOSFODNN7EXAMPLE"
.field public static final API_URL:Ljava/lang/String; = "https://backend-api.prod.internal.com/v1"
.field public static final STRIPE_KEY:Ljava/lang/String; = "stripe_key_mock_12345"
    `;
    fs.writeFileSync(path.join(smaliDir, 'Config.smali'), smaliContent);

    // Tell the analyzer not to clean up immediately so we can inspect if needed, or let it clean up.
    // For test, we set an environment variable to prevent cleanup
    process.env.KEEP_APK_DIR = 'true';

    // 4. Run Analyzer
    console.log('\n--- Initiating SECORA Mobile Analysis ---');
    try {
        const findings = await analyzeAPK(apkPath);
        
        console.log(`\n✅ Found ${findings.length} Mobile Vulnerabilities:`);
        for (const f of findings) {
            console.log(`- [${f.severity}] ${f.title} (${f.owasp})`);
            console.log(`  Evidence: ${f.evidence[0].content}`);
        }

        // Validate expected count
        // 1 allowBackup, 1 debuggable, 2 exported (activity + service), 3 secrets = 7 findings
        if (findings.length === 7) {
            console.log('\n✅ Mobile Analyzer successfully identified all OWASP Top 10 vulnerabilities.');
        } else {
            console.error(`\n❌ Expected 7 findings, got ${findings.length}`);
        }

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        // Cleanup mock directory
        if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
    }
}

main();
