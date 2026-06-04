// backend/test-secora-engines.js — FAST integration test (no OAST wait on remote target)
import { startOASTServer, stopOASTServer } from './src/oast/oastServer.js';
import { createOASTClient } from './src/oast/oastClient.js';
import { parseApiSchemas } from './src/engines/apiSchemaParser.js';
import { detectWAF } from './src/engines/wafDetector.js';
import { analyzeContext } from './src/engines/contextAnalyzer.js';
import { testSQLInjection } from './src/tests/sqlTest.js';
import { testXSS } from './src/tests/xssTest.js';
import { testSSRF } from './src/tests/ssrfTest.js';
import { testXXE } from './src/tests/xxeTest.js';
import { testCSRF } from './src/tests/csrfTest.js';
import { testSecurityHeaders } from './src/tests/securityHeaders.js';
import { computeAllCVSS } from './src/reporting/cvssCalculator.js';
import { mapToCompliance } from './src/reporting/complianceMapper.js';
import { generateExecutiveSummary } from './src/reporting/executiveSummary.js';
import { generateBusinessImpact } from './src/reporting/businessImpact.js';
import { generateRemediation } from './src/reporting/remediationEngine.js';
import axios from 'axios';

const TARGET = 'https://phr.bhspl.in';
const SCAN_ID = 'test-' + Date.now();
const D = '═'.repeat(70);
let allFindings = [], pass = 0, fail = 0;
const t0 = Date.now();

const ok = (n) => { pass++; console.log(`  ✅ ${n}`); };
const no = (n, e) => { fail++; console.log(`  ❌ ${n}: ${e}`); };

async function main() {
    console.log(D);
    console.log('  SECORA ENGINE — INTEGRATION TEST on ' + TARGET);
    console.log(D);

    // ── PHASE 1: OAST Self-Test ──
    console.log('\n📡 PHASE 1: OAST Server');
    try {
        await startOASTServer({ mode: 'local', httpPort: 9999 });
        ok('OAST started on 127.0.0.1:9999');
        const c = createOASTClient(SCAN_ID);
        const p = c.generatePayload('sqli', 'self-test');
        await axios.get(`http://127.0.0.1:9999/cb/${p.payloadId}`, { timeout: 2000 });
        await new Promise(r => setTimeout(r, 200));
        const cb = c.checkCallback(p.payloadId);
        cb ? ok('Callback self-test PASSED') : no('Callback', 'not recorded');
        c.cleanup();
    } catch (e) { no('OAST', e.message); }

    // ── PHASE 2: Target Recon ──
    console.log('\n🕷️  PHASE 2: Target Recon');
    let resp;
    try {
        resp = await axios.get(TARGET, { timeout: 15000, validateStatus: () => true });
        ok(`HTTP ${resp.status} — ${resp.headers['content-type']?.split(';')[0]}`);
        const secH = ['x-frame-options','content-security-policy','strict-transport-security','x-content-type-options'];
        const missing = secH.filter(h => !resp.headers[h]);
        console.log(`  Security headers missing: ${missing.length}/${secH.length} — ${missing.join(', ')}`);
    } catch (e) { no('HTTP probe', e.message); }

    try {
        const s = await parseApiSchemas(TARGET);
        ok(`API schema scan: ${s.endpoints.length} endpoints`);
    } catch (e) { no('API Schema', e.message); }

    try {
        const w = await detectWAF(TARGET);
        w.detected ? ok(`WAF: ${w.vendor} (${w.confidence}%)`) : ok('No WAF detected');
    } catch (e) { no('WAF', e.message); }

    // Build endpoints
    const eps = [
        { url: TARGET, method: 'GET', parameters: null, id: 'root', assetId: 'a1' },
        { url: `${TARGET}/login`, method: 'GET', parameters: { username: 'test', password: 'test' }, id: 'login', assetId: 'a1' },
        { url: `${TARGET}/api`, method: 'GET', parameters: { q: 'test' }, id: 'api', assetId: 'a1' },
        { url: `${TARGET}/search`, method: 'GET', parameters: { query: 'test' }, id: 'search', assetId: 'a1' },
        { url: TARGET, method: 'POST', parameters: { data: 'test' }, id: 'post', assetId: 'a1' },
    ];

    // Context analysis
    try {
        const ep = eps.find(e => e.parameters);
        const ctx = await analyzeContext(ep);
        ok(`Context analysis: ${Object.entries(ctx).map(([k,v])=>`${k}→${v}`).join(', ')}`);
    } catch (e) { no('Context', e.message); }

    // ── PHASE 3: Security Headers ──
    console.log('\n📋 PHASE 3a: Security Headers');
    try {
        const f = await testSecurityHeaders({ url: TARGET, id: 'root', assetId: 'a1' });
        allFindings.push(...f);
        ok(`${f.length} findings`);
        f.forEach(x => console.log(`    ⚠️  [${x.severity}] ${x.title}`));
    } catch (e) { no('Headers', e.message); }

    // ── PHASE 3b: SQLi ──
    console.log('\n💉 PHASE 3b: SQL Injection');
    // No OAST for remote — only error-based (fast)
    const fastOpts = { aggressive: false, oastClient: null, timeout: 8000 };
    try {
        let f = [];
        for (const ep of eps.filter(e => e.parameters)) {
            f.push(...await testSQLInjection(ep, fastOpts));
        }
        allFindings.push(...f);
        ok(`${f.length} findings`);
        f.forEach(x => console.log(`    ⚠️  [${x.severity}] ${x.title}`));
    } catch (e) { no('SQLi', e.message); }

    // ── PHASE 3c: XSS ──
    console.log('\n💉 PHASE 3c: XSS');
    try {
        let f = [];
        for (const ep of eps.filter(e => e.parameters)) {
            f.push(...await testXSS(ep, fastOpts));
        }
        allFindings.push(...f);
        ok(`${f.length} findings`);
        f.forEach(x => console.log(`    ⚠️  [${x.severity}] ${x.title}`));
    } catch (e) { no('XSS', e.message); }

    // ── PHASE 3d: SSRF (no OAST, internal-IP probing only) ──
    console.log('\n💉 PHASE 3d: SSRF (internal IP probing)');
    try {
        let f = [];
        for (const ep of eps.filter(e => e.parameters).slice(0, 2)) {
            f.push(...await testSSRF(ep, { ...fastOpts, timeout: 5000 }));
        }
        allFindings.push(...f);
        ok(`${f.length} findings`);
        f.forEach(x => console.log(`    ⚠️  [${x.severity}] ${x.title}`));
    } catch (e) { no('SSRF', e.message); }

    // ── PHASE 3e: XXE (error-based only) ──
    console.log('\n💉 PHASE 3e: XXE');
    try {
        let f = [];
        for (const ep of eps.slice(0, 2)) {
            f.push(...await testXXE(ep, { ...fastOpts, timeout: 5000 }));
        }
        allFindings.push(...f);
        ok(`${f.length} findings`);
    } catch (e) { no('XXE', e.message); }

    // ── PHASE 4: CSRF ──
    console.log('\n🔄 PHASE 4: CSRF');
    try {
        let f = [];
        for (const ep of eps.filter(e => e.method === 'POST')) {
            f.push(...await testCSRF(ep, fastOpts));
        }
        allFindings.push(...f);
        ok(`${f.length} findings`);
        f.forEach(x => console.log(`    ⚠️  [${x.severity}] ${x.title}`));
    } catch (e) { no('CSRF', e.message); }

    // ── PHASE 6: Reporting Engine ──
    console.log('\n📊 PHASE 6: Enterprise Reporting');
    try {
        const enriched = computeAllCVSS(allFindings);
        ok(`CVSS computed for ${enriched.length} findings`);
        enriched.slice(0, 5).forEach(f => console.log(`    ${f.title}: CVSS ${f.cvss} — ${f.cvssRating}`));
    } catch (e) { no('CVSS', e.message); }

    try {
        const m = mapToCompliance(allFindings[0] || { category: 'INJECTION' });
        ok('Compliance mapping: ' + Object.keys(m).join(', '));
    } catch (e) { no('Compliance', e.message); }

    try {
        const s = generateExecutiveSummary({ target: { value: TARGET }, findings: allFindings, stats: {} });
        ok(`Executive Summary — Risk: ${s.overallRisk.rating}`);
        console.log(`    Findings: C=${s.findingSummary.critical} H=${s.findingSummary.high} M=${s.findingSummary.medium} L=${s.findingSummary.low}`);
    } catch (e) { no('Exec Summary', e.message); }

    try {
        const i = generateBusinessImpact({ category: 'INJECTION', severity: 'CRITICAL' });
        ok(`Business impact: "${i.substring(0, 70)}..."`);
    } catch (e) { no('Impact', e.message); }

    try {
        const r = generateRemediation({ category: 'INJECTION' }, ['Node.js']);
        ok(`Remediation (${r.techMatch}): ${r.title}`);
    } catch (e) { no('Remediation', e.message); }

    // ── SUMMARY ──
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log('\n' + D);
    console.log('  FINAL RESULTS');
    console.log(D);
    console.log(`  ✅ Passed: ${pass}`);
    console.log(`  ❌ Failed: ${fail}`);
    console.log(`  🔍 Findings: ${allFindings.length}`);
    console.log(`  ⏱️  Duration: ${elapsed}s`);
    if (allFindings.length) {
        const s = {}; allFindings.forEach(f => s[f.severity] = (s[f.severity]||0)+1);
        console.log('\n  By Severity:');
        Object.entries(s).forEach(([k,v]) => console.log(`    ${k}: ${v}`));
        console.log('\n  All Findings:');
        allFindings.forEach(f => console.log(`    [${f.severity}] ${f.title}`));
    }
    console.log(D);

    try { await stopOASTServer(); } catch {}
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
