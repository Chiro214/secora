// backend/src/engines/vulnTest.js
// Vulnerability Testing Engine — Full OWASP Coverage
// Integrates all test modules: SQLi, XSS, SSRF, XXE, Log4Shell, IDOR, CSRF, File Upload, Business Logic
import axios from 'axios';
import { testSecurityHeaders } from '../tests/securityHeaders.js';
import { testTLSConfig } from '../tests/tlsConfig.js';
import { testXSS } from '../tests/xssTest.js';
import { testSQLInjection } from '../tests/sqlTest.js';
import { testOpenRedirect } from '../tests/openRedirect.js';
import { testAuthBypass } from '../tests/authBypass.js';
import { testInformationDisclosure } from '../tests/infoDisclosure.js';
import { testSSRF } from '../tests/ssrfTest.js';
import { testXXE } from '../tests/xxeTest.js';
import { testLog4Shell } from '../tests/log4shellTest.js';
import { testIDOR } from '../tests/idorTest.js';
import { testCSRF } from '../tests/csrfTest.js';
import { testFileUpload } from '../tests/fileUploadTest.js';
import { testBusinessLogic } from '../tests/businessLogicTest.js';
import { createOASTClient } from '../oast/oastClient.js';
import { analyzeContext } from './contextAnalyzer.js';
import { detectWAF } from './wafDetector.js';
import { evaluateCustomTemplates } from './customRulesEngine.js';
import { setupAuthInterceptor } from './macroEngine.js';
import { testRequestSmuggling } from './requestSmuggling.js';
import { testJWT } from '../tests/jwtTest.js';
import { testSessionSecurity } from '../tests/sessionTest.js';
import { testGraphQL } from '../tests/graphqlTest.js';
import { testGraphQLAlias } from '../tests/graphqlBatchingTest.js';
import { testWebSocket } from '../tests/websocketTest.js';
import { testRateLimitEvasion } from './headerEvasion.js';
import { testSubdomainTakeover } from '../tests/subdomainTakeover.js';
import { testCredentials } from '../tests/credentialTest.js';
import { testPrototypePollution } from '../tests/prototypePollution.js';
import { testDeserialization } from '../tests/deserializationTest.js';
import { testSSTI } from '../tests/sstiTest.js';
import { testOAuth } from '../tests/oauthTest.js';
import { testRaceCondition } from '../tests/raceCondition.js';
import { testDnsRebinding } from '../tests/dnsRebinding.js';
import { testCachePoisoning } from '../tests/cachePoisoning.js';
import { testClickjacking } from '../tests/clickjacking.js';
import { testHttp2Attacks } from '../tests/http2Test.js';
import { testSOAP } from '../tests/soapTest.js';
import { testFileInclusion } from '../tests/fileInclusionTest.js';
import { analyzeExploitChains } from './exploitChain.js';
import { testWebCacheDeception } from '../tests/webCacheDeception.js';
import { testParameterPollution } from './parameterPollution.js';
import { testDependencyConfusion } from '../tests/dependencyConfusion.js';
import { testTimingSideChannel } from '../tests/timingSideChannel.js';
import { testJWTDowngrade } from '../tests/jwtDowngradeTest.js';
import { testDanglingMarkup } from '../tests/danglingMarkup.js';
import { testCORSExploit } from '../tests/corsExploitTest.js';
import { testPostMessage } from '../tests/postMessageTest.js';
import { testSecondOrderInjection } from '../tests/secondOrderInjection.js';

/**
 * Vulnerability testing engine
 * Implements complete OWASP Top 10+ testing with OAST integration
 */
export async function vulnTestEngine({ scanId, assets, endpoints, config }) {
    console.log(`🔬 Starting vulnerability tests for scan ${scanId}`);
    
    const findings = [];
    const testTypes = config.testTypes || ['all'];
    const aggressive = config.aggressive || false;
    const wafEvasion = config.wafEvasion || false;
    
    // Initialize OAST client for blind vulnerability detection
    const oastClient = createOASTClient(scanId);
    
    // Detect WAF before testing (Phase 5)
    let wafInfo = null;
    if (endpoints.length > 0) {
        try {
            const targetUrl = endpoints[0]?.url || assets[0]?.value;
            if (targetUrl) {
                wafInfo = await detectWAF(targetUrl);
            }
        } catch (err) {
            console.warn('WAF detection failed:', err.message);
        }
    }

    // Build common options for all test modules
    const testOptions = {
        scanId, // Needed for IAST Tracing
        aggressive,
        oastClient,
        wafEvasion: wafEvasion && wafInfo?.detected,
        wafInfo,
        accounts: config.accounts || {}, // Default to empty object so interceptor can mutate it
        timeout: config.timeout || 10000
    };

    // Setup Macro Auto-Refresh Interceptor if macroId is provided
    let cleanupInterceptor = null;
    if (config.macroId) {
        cleanupInterceptor = setupAuthInterceptor(config.macroId, testOptions.accounts);
    }

    // Test 1: Security Headers (all endpoints)
    if (shouldRunTest('headers', testTypes)) {
        console.log('  📋 Testing security headers...');
        for (const endpoint of endpoints.slice(0, 10)) {
            const headerFindings = await testSecurityHeaders(endpoint);
            findings.push(...headerFindings);
        }
    }
    
    // Test 2: TLS/SSL Configuration
    if (shouldRunTest('tls', testTypes)) {
        console.log('  🔒 Testing TLS configuration...');
        for (const asset of assets.filter(a => a.type === 'HOST')) {
            const tlsFindings = await testTLSConfig(asset);
            findings.push(...tlsFindings);
        }
    }
    
    // Test 3: XSS (reflected + stored + DOM)
    if (shouldRunTest('xss', testTypes)) {
        console.log('  💉 Testing for XSS vulnerabilities...');
        for (const endpoint of endpoints.filter(e => e.parameters)) {
            const xssFindings = await testXSS(endpoint, testOptions);
            findings.push(...xssFindings);
        }
    }
    
    // Test 4: SQL Injection (error + time + OAST + union)
    if (shouldRunTest('sqli', testTypes)) {
        console.log('  💉 Testing for SQL injection...');
        for (const endpoint of endpoints.filter(e => e.parameters)) {
            const sqlFindings = await testSQLInjection(endpoint, testOptions);
            findings.push(...sqlFindings);
        }
    }
    
    // Test 5: Open Redirect
    if (shouldRunTest('redirect', testTypes)) {
        console.log('  ↗️  Testing for open redirects...');
        for (const endpoint of endpoints) {
            const redirectFindings = await testOpenRedirect(endpoint);
            findings.push(...redirectFindings);
        }
    }
    
    // Test 6: Authentication Bypass
    if (shouldRunTest('auth', testTypes)) {
        console.log('  🔑 Testing authentication...');
        const authEndpoints = endpoints.filter(e => 
            e.url.includes('login') || e.url.includes('auth') || e.url.includes('admin')
        );
        for (const endpoint of authEndpoints) {
            const authFindings = await testAuthBypass(endpoint);
            findings.push(...authFindings);
        }
    }
    
    // Test 7: Information Disclosure
    if (shouldRunTest('info', testTypes)) {
        console.log('  📄 Testing for information disclosure...');
        for (const asset of assets) {
            const infoFindings = await testInformationDisclosure(asset);
            findings.push(...infoFindings);
        }
    }

    // Test 8: SSRF (via OAST)
    if (shouldRunTest('ssrf', testTypes)) {
        console.log('  🌐 Testing for SSRF...');
        for (const endpoint of endpoints.filter(e => e.parameters)) {
            const ssrfFindings = await testSSRF(endpoint, testOptions);
            findings.push(...ssrfFindings);
        }
    }

    // Test 9: XXE (via OAST)
    if (shouldRunTest('xxe', testTypes)) {
        console.log('  📑 Testing for XXE...');
        for (const endpoint of endpoints.slice(0, 20)) {
            const xxeFindings = await testXXE(endpoint, testOptions);
            findings.push(...xxeFindings);
        }
    }

    // Test 10: Log4Shell (via OAST)
    if (shouldRunTest('log4shell', testTypes)) {
        console.log('  ☢️  Testing for Log4Shell...');
        for (const endpoint of endpoints.slice(0, 15)) {
            const log4Findings = await testLog4Shell(endpoint, testOptions);
            findings.push(...log4Findings);
        }
    }

    // Test 11: IDOR (requires multi-account config)
    if (shouldRunTest('idor', testTypes) && testOptions.accounts) {
        console.log('  🔐 Testing for IDOR...');
        for (const endpoint of endpoints) {
            const idorFindings = await testIDOR(endpoint, testOptions);
            findings.push(...idorFindings);
        }
    }

    // Test 12: CSRF
    if (shouldRunTest('csrf', testTypes)) {
        console.log('  🔄 Testing for CSRF...');
        const stateEndpoints = endpoints.filter(e => 
            ['POST', 'PUT', 'DELETE', 'PATCH'].includes((e.method || '').toUpperCase())
        );
        for (const endpoint of stateEndpoints) {
            const csrfFindings = await testCSRF(endpoint, testOptions);
            findings.push(...csrfFindings);
        }
    }

    // Test 13: File Upload
    if (shouldRunTest('upload', testTypes)) {
        console.log('  📁 Testing file upload security...');
        for (const endpoint of endpoints.slice(0, 10)) {
            const uploadFindings = await testFileUpload(endpoint, testOptions);
            findings.push(...uploadFindings);
        }
    }

    // Test 14: Business Logic
    if (shouldRunTest('logic', testTypes)) {
        console.log('  🧩 Testing business logic...');
        for (const endpoint of endpoints.filter(e => e.parameters)) {
            const logicFindings = await testBusinessLogic(endpoint, testOptions);
            findings.push(...logicFindings);
        }
    }

    // Test 15: Request Smuggling (TCP level)
    if (shouldRunTest('smuggling', testTypes)) {
        console.log('  📦 Testing for Request Smuggling...');
        for (const endpoint of endpoints) {
            const smugglingFindings = await testRequestSmuggling(endpoint, testOptions);
            findings.push(...smugglingFindings);
        }
    }

    // Test 16: JWT Attacks
    if (shouldRunTest('jwt', testTypes)) {
        console.log('  🔑 Testing for JWT Attacks...');
        for (const endpoint of endpoints) {
            const jwtFindings = await testJWT(endpoint, testOptions);
            findings.push(...jwtFindings);
        }
    }

    // Test 17: Session Security
    if (shouldRunTest('session', testTypes)) {
        console.log('  🍪 Testing for Session Security...');
        for (const endpoint of endpoints) {
            const sessionFindings = await testSessionSecurity(endpoint, testOptions);
            findings.push(...sessionFindings);
        }
    }

    // Test 18: Custom Rules Engine (YAML Templates)
    if (shouldRunTest('custom', testTypes)) {
        console.log('  📜 Testing custom YAML templates...');
        for (const endpoint of endpoints) {
            const customFindings = await evaluateCustomTemplates(endpoint, testOptions);
            findings.push(...customFindings);
        }
    }

    // Test 19: GraphQL Fuzzing
    if (shouldRunTest('graphql', testTypes)) {
        console.log('  🕸️ Testing for GraphQL Vulnerabilities...');
        for (const endpoint of endpoints) {
            const graphqlFindings = await testGraphQL(endpoint, testOptions);
            findings.push(...graphqlFindings);
        }
    }

    // Test 20: WebSocket Fuzzing
    if (shouldRunTest('websocket', testTypes)) {
        console.log('  🔌 Testing for WebSocket Vulnerabilities...');
        for (const endpoint of endpoints) {
            const wsFindings = await testWebSocket(endpoint, testOptions);
            findings.push(...wsFindings);
        }
    }

    // Test 21: Rate Limit Evasion
    if (shouldRunTest('ratelimit', testTypes)) {
        console.log('  🚀 Testing Rate Limit Evasion...');
        for (const endpoint of endpoints) {
            const evasionFindings = await testRateLimitEvasion(endpoint, { ...testOptions, aggressive: true });
            findings.push(...evasionFindings);
        }
    }

    // Module 1: Subdomain Takeover
    if (shouldRunTest('takeover', testTypes)) {
        console.log('  🌐 Testing Subdomain Takeover...');
        for (const asset of assets) {
            if (asset.type === 'HOST') {
                 const findingsList = await testSubdomainTakeover(asset.value, testOptions);
                 findings.push(...findingsList);
            }
        }
    }

    // Module 2: Password Spraying & Credential Stuffing
    if (shouldRunTest('credentials', testTypes)) {
        console.log('  🔑 Testing Credentials...');
        for (const endpoint of endpoints) {
             const findingsList = await testCredentials(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 3: Prototype Pollution
    if (shouldRunTest('pollution', testTypes)) {
        console.log('  ☢️ Testing Prototype Pollution...');
        for (const endpoint of endpoints) {
             const findingsList = await testPrototypePollution(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 4: Deserialization
    if (shouldRunTest('deserialization', testTypes)) {
        console.log('  📦 Testing Deserialization...');
        for (const endpoint of endpoints) {
             const findingsList = await testDeserialization(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 5: SSTI
    if (shouldRunTest('ssti', testTypes)) {
        console.log('  📄 Testing SSTI...');
        for (const endpoint of endpoints) {
             const findingsList = await testSSTI(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 6: OAuth
    if (shouldRunTest('oauth', testTypes)) {
        console.log('  🔐 Testing OAuth...');
        for (const endpoint of endpoints) {
             const findingsList = await testOAuth(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 7: Race Condition
    if (shouldRunTest('race', testTypes)) {
        console.log('  🏎️ Testing Race Conditions...');
        for (const endpoint of endpoints) {
             const findingsList = await testRaceCondition(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 8: DNS Rebinding
    if (shouldRunTest('rebinding', testTypes)) {
        console.log('  🔁 Testing DNS Rebinding...');
        for (const endpoint of endpoints) {
             const findingsList = await testDnsRebinding(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 9: Cache Poisoning
    if (shouldRunTest('cache', testTypes)) {
        console.log('  🗄️ Testing Cache Poisoning...');
        for (const endpoint of endpoints) {
             const findingsList = await testCachePoisoning(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 10: Clickjacking
    if (shouldRunTest('clickjacking', testTypes)) {
        console.log('  🖱️ Testing Clickjacking...');
        for (const endpoint of endpoints) {
             const findingsList = await testClickjacking(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 11: HTTP/2 Attacks
    if (shouldRunTest('http2', testTypes)) {
        console.log('  🔌 Testing HTTP/2 Attacks...');
        for (const endpoint of endpoints) {
             const findingsList = await testHttp2Attacks(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 13: SOAP/XML
    if (shouldRunTest('soap', testTypes)) {
        console.log('  🧼 Testing SOAP/XML...');
        for (const endpoint of endpoints) {
             const findingsList = await testSOAP(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // Module 14: File Inclusion
    if (shouldRunTest('lfi', testTypes)) {
        console.log('  📁 Testing File Inclusion...');
        for (const endpoint of endpoints) {
             const findingsList = await testFileInclusion(endpoint, testOptions);
             findings.push(...findingsList);
        }
    }

    // --- Wave 2: Next Gen Techniques ---

    if (shouldRunTest('graphql-alias', testTypes)) {
        console.log('  🕸️ Testing GraphQL Aliasing...');
        for (const endpoint of endpoints) {
            const findingsList = await testGraphQLAlias(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('cache-deception', testTypes)) {
        console.log('  🗄️ Testing Web Cache Deception...');
        for (const endpoint of endpoints) {
            const findingsList = await testWebCacheDeception(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('hpp', testTypes)) {
        console.log('  🧪 Testing HTTP Parameter Pollution...');
        for (const endpoint of endpoints) {
            const findingsList = await testParameterPollution(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('dependency', testTypes)) {
        console.log('  📦 Testing Dependency Confusion...');
        for (const endpoint of endpoints) {
            const findingsList = await testDependencyConfusion(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('timing', testTypes)) {
        console.log('  ⏱️ Testing Browser Timing Side Channels...');
        for (const endpoint of endpoints) {
            const findingsList = await testTimingSideChannel(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('jwt-downgrade', testTypes)) {
        console.log('  🔑 Testing JWT Key Confusion...');
        for (const endpoint of endpoints) {
            const findingsList = await testJWTDowngrade(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('dangling', testTypes)) {
        console.log('  🎣 Testing Dangling Markup Injection...');
        for (const endpoint of endpoints) {
            const findingsList = await testDanglingMarkup(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('cors', testTypes)) {
        console.log('  🛡️ Testing CORS Exploitation...');
        for (const endpoint of endpoints) {
            const findingsList = await testCORSExploit(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('postmessage', testTypes)) {
        console.log('  ✉️ Testing PostMessage Vulnerabilities...');
        for (const endpoint of endpoints) {
            const findingsList = await testPostMessage(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    if (shouldRunTest('second-order', testTypes)) {
        console.log('  ⏳ Testing Second Order Injection...');
        for (const endpoint of endpoints) {
            const findingsList = await testSecondOrderInjection(endpoint, testOptions);
            findings.push(...findingsList);
        }
    }

    // Module 15: Exploit Chaining Engine (Runs at the very end on the accumulated findings)
    console.log('  🔗 Analyzing Exploit Chains...');
    const chainFindings = analyzeExploitChains(findings);
    findings.push(...chainFindings);

    console.log(`✅ Completed all tests for scan ${scanId}. Found ${findings.length} issues.`);
    
    // Cleanup OAST
    oastClient.cleanup();

    // Cleanup Macro Interceptor
    if (cleanupInterceptor) {
        cleanupInterceptor();
    }

    console.log(`✅ Vulnerability testing completed: ${findings.length} findings`);
    
    return { findings, wafInfo };
}

function shouldRunTest(testName, testTypes) {
    return testTypes.includes('all') || testTypes.includes(testName);
}
