// backend/test-roundcube-harsh.js
// Harsh VAPT test against Roundcube installation

import { testSQLInjection } from './src/tests/sqlTest.js';
import { testXSS } from './src/tests/xssTest.js';
import { testAuthBypass } from './src/tests/authBypass.js';
import { testOpenRedirect } from './src/tests/openRedirect.js';
import { testSecurityHeaders } from './src/tests/securityHeaders.js';
import { testInformationDisclosure } from './src/tests/infoDisclosure.js';
import { testTLSConfig } from './src/tests/tlsConfig.js';
import axios from 'axios';

const TARGET_URL = 'http://192.168.31.113/roundcube/';
const TARGET_HOST = '192.168.31.113';

console.log('\n🎯 SECORA HARSH VAPT TEST - ROUNDCUBE');
console.log('='.repeat(70));
console.log(`🔍 Target: ${TARGET_URL}`);
console.log(`⚠️  AGGRESSIVE MODE: Enabled`);
console.log(`🕒 Started: ${new Date().toISOString()}`);
console.log('='.repeat(70));

async function discoverEndpoints() {
    console.log('\n📡 Phase 1: Endpoint Discovery');
    console.log('-'.repeat(40));
    
    const endpoints = [];
    const commonPaths = [
        '',
        'index.php',
        'installer/',
        'installer/index.php',
        'config/',
        'logs/',
        'temp/',
        'bin/',
        'SQL/',
        'program/',
        'skins/',
        'plugins/',
        '?_task=login',
        '?_task=mail',
        '?_task=addressbook',
        '?_task=settings',
        'index.php?_task=login',
        'index.php?_task=mail',
        'index.php?_task=logout',
        'installer/test.php',
        'installer/config.php',
        'config/config.inc.php',
        'config/main.inc.php',
        'logs/errors.log',
        'logs/userlogins',
        'temp/rcube_cache',
        'SQL/mysql.initial.sql',
        'SQL/postgres.initial.sql'
    ];

    for (const path of commonPaths) {
        try {
            const url = TARGET_URL + path;
            const response = await axios.get(url, {
                timeout: 10000,
                validateStatus: () => true,
                maxRedirects: 5
            });
            
            const endpoint = {
                id: `endpoint-${endpoints.length + 1}`,
                assetId: 'roundcube-asset',
                url: url,
                method: 'GET',
                statusCode: response.status,
                parameters: extractParameters(url),
                headers: response.headers
            };
            
            endpoints.push(endpoint);
            
            const status = response.status;
            const size = response.data?.length || 0;
            console.log(`   ${getStatusIcon(status)} ${path.padEnd(25)} [${status}] ${size} bytes`);
            
        } catch (error) {
            console.log(`   ❌ ${path.padEnd(25)} [ERROR] ${error.message.substring(0, 30)}`);
        }
    }
    
    console.log(`\n✅ Discovered ${endpoints.length} endpoints`);
    return endpoints;
}

function extractParameters(url) {
    try {
        const urlObj = new URL(url);
        const params = {};
        urlObj.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return Object.keys(params).length > 0 ? params : null;
    } catch {
        return null;
    }
}

function getStatusIcon(status) {
    if (status >= 200 && status < 300) return '✅';
    if (status >= 300 && status < 400) return '🔄';
    if (status >= 400 && status < 500) return '⚠️';
    if (status >= 500) return '❌';
    return '❓';
}

async function runHarshVAPTTest() {
    const startTime = Date.now();
    let totalFindings = 0;
    const allFindings = [];

    // Discover endpoints first
    const endpoints = await discoverEndpoints();
    
    // Create asset object
    const asset = {
        id: 'roundcube-asset',
        type: 'URL',
        value: TARGET_HOST,
        ipAddress: TARGET_HOST
    };

    console.log('\n🔬 Phase 2: Vulnerability Testing');
    console.log('-'.repeat(40));

    // Test 1: Information Disclosure (Critical for Roundcube)
    console.log('\n1. 🕵️  Information Disclosure Testing...');
    try {
        const infoFindings = await testInformationDisclosure(asset);
        allFindings.push(...infoFindings);
        console.log(`   ✅ Found ${infoFindings.length} information disclosure issues`);
        
        // Additional Roundcube-specific paths
        const roundcubeSpecificPaths = [
            'CHANGELOG',
            'INSTALL',
            'LICENSE',
            'README.md',
            'composer.json',
            'composer.lock',
            '.htaccess',
            'config/config.inc.php.dist',
            'installer/rcube_install.php',
            'program/include/rcmail.php'
        ];
        
        for (const path of roundcubeSpecificPaths) {
            try {
                const response = await axios.get(TARGET_URL + path, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status === 200 && response.data.length > 0) {
                    allFindings.push({
                        title: `Sensitive File Exposed: ${path}`,
                        description: `The file ${path} is accessible and may contain sensitive information.`,
                        category: 'INFORMATION_DISCLOSURE',
                        severity: 'MEDIUM',
                        cvss: 5.3,
                        url: TARGET_URL + path,
                        evidence: `HTTP ${response.status} - ${response.data.length} bytes`
                    });
                    console.log(`   🔍 Found exposed file: ${path}`);
                }
            } catch (error) {
                // File not accessible, which is good
            }
        }
        
    } catch (error) {
        console.log(`   ❌ Info disclosure test failed: ${error.message}`);
    }

    // Test 2: Security Headers
    console.log('\n2. 🛡️  Security Headers Analysis...');
    try {
        for (const endpoint of endpoints.slice(0, 5)) {
            const headerFindings = await testSecurityHeaders(endpoint);
            allFindings.push(...headerFindings);
        }
        const headerCount = allFindings.filter(f => f.category === 'SECURITY_MISCONFIG').length;
        console.log(`   ✅ Found ${headerCount} security header issues`);
    } catch (error) {
        console.log(`   ❌ Security headers test failed: ${error.message}`);
    }

    // Test 3: SQL Injection (AGGRESSIVE)
    console.log('\n3. 💉 SQL Injection Testing (AGGRESSIVE)...');
    try {
        const sqlEndpoints = endpoints.filter(e => e.parameters || e.url.includes('?'));
        let sqlFindings = [];
        
        for (const endpoint of sqlEndpoints) {
            const findings = await testSQLInjection(endpoint, { aggressive: true });
            sqlFindings.push(...findings);
        }
        
        // Additional Roundcube-specific SQL injection tests
        const roundcubeParams = [
            '?_task=login&_action=login&_user=admin&_pass=test',
            '?_task=mail&_action=list&_mbox=INBOX',
            '?_task=addressbook&_action=search&_q=test',
            '?_task=settings&_action=save&_section=general'
        ];
        
        for (const paramUrl of roundcubeParams) {
            try {
                const testEndpoint = {
                    id: `sql-test-${sqlFindings.length}`,
                    assetId: 'roundcube-asset',
                    url: TARGET_URL + paramUrl,
                    parameters: { test: 'value' }
                };
                
                const findings = await testSQLInjection(testEndpoint, { aggressive: true });
                sqlFindings.push(...findings);
            } catch (error) {
                // Continue with other tests
            }
        }
        
        allFindings.push(...sqlFindings);
        console.log(`   ✅ Found ${sqlFindings.length} SQL injection vulnerabilities`);
    } catch (error) {
        console.log(`   ❌ SQL injection test failed: ${error.message}`);
    }

    // Test 4: XSS Testing (AGGRESSIVE)
    console.log('\n4. 🚨 XSS Testing (AGGRESSIVE)...');
    try {
        const xssEndpoints = endpoints.filter(e => e.parameters || e.url.includes('?'));
        let xssFindings = [];
        
        for (const endpoint of xssEndpoints) {
            const findings = await testXSS(endpoint, { aggressive: true });
            xssFindings.push(...findings);
        }
        
        allFindings.push(...xssFindings);
        console.log(`   ✅ Found ${xssFindings.length} XSS vulnerabilities`);
    } catch (error) {
        console.log(`   ❌ XSS test failed: ${error.message}`);
    }

    // Test 5: Authentication Bypass
    console.log('\n5. 🔐 Authentication Bypass Testing...');
    try {
        const loginEndpoint = {
            id: 'login-endpoint',
            assetId: 'roundcube-asset',
            url: TARGET_URL + '?_task=login'
        };
        
        const authFindings = await testAuthBypass(loginEndpoint);
        allFindings.push(...authFindings);
        console.log(`   ✅ Found ${authFindings.length} authentication bypass issues`);
    } catch (error) {
        console.log(`   ❌ Auth bypass test failed: ${error.message}`);
    }

    // Test 6: Open Redirect
    console.log('\n6. 🔄 Open Redirect Testing...');
    try {
        let redirectFindings = [];
        for (const endpoint of endpoints.slice(0, 10)) {
            const findings = await testOpenRedirect(endpoint);
            redirectFindings.push(...findings);
        }
        
        allFindings.push(...redirectFindings);
        console.log(`   ✅ Found ${redirectFindings.length} open redirect vulnerabilities`);
    } catch (error) {
        console.log(`   ❌ Open redirect test failed: ${error.message}`);
    }

    // Test 7: TLS Configuration (if HTTPS available)
    console.log('\n7. 🔒 TLS Configuration Testing...');
    try {
        if (TARGET_URL.startsWith('https://')) {
            const tlsFindings = await testTLSConfig(asset);
            allFindings.push(...tlsFindings);
            console.log(`   ✅ Found ${tlsFindings.length} TLS configuration issues`);
        } else {
            console.log(`   ⚠️  Target uses HTTP - TLS test skipped`);
            allFindings.push({
                title: 'Unencrypted HTTP Connection',
                description: 'The application is served over unencrypted HTTP, making it vulnerable to man-in-the-middle attacks.',
                category: 'SECURITY_MISCONFIG',
                severity: 'HIGH',
                cvss: 7.4,
                remediation: 'Implement HTTPS with proper TLS configuration'
            });
        }
    } catch (error) {
        console.log(`   ❌ TLS test failed: ${error.message}`);
    }

    // Calculate results
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    totalFindings = allFindings.length;

    // Results Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 HARSH VAPT TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`🎯 Target: ${TARGET_URL}`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📡 Endpoints Tested: ${endpoints.length}`);
    console.log(`🔍 Total Findings: ${totalFindings}`);

    // Severity breakdown
    const critical = allFindings.filter(f => f.severity === 'CRITICAL').length;
    const high = allFindings.filter(f => f.severity === 'HIGH').length;
    const medium = allFindings.filter(f => f.severity === 'MEDIUM').length;
    const low = allFindings.filter(f => f.severity === 'LOW').length;

    console.log('\n🚨 Severity Breakdown:');
    console.log(`   🔴 Critical: ${critical}`);
    console.log(`   🟠 High: ${high}`);
    console.log(`   🟡 Medium: ${medium}`);
    console.log(`   🔵 Low: ${low}`);

    // Top findings
    if (allFindings.length > 0) {
        console.log('\n🎯 Top Findings:');
        const topFindings = allFindings
            .sort((a, b) => (b.cvss || 0) - (a.cvss || 0))
            .slice(0, 10);

        topFindings.forEach((finding, index) => {
            const severity = finding.severity || 'UNKNOWN';
            const cvss = finding.cvss || 0;
            console.log(`   ${index + 1}. [${severity}] ${finding.title} (CVSS: ${cvss})`);
        });
    }

    console.log('\n' + '='.repeat(70));
    
    if (critical > 0 || high > 0) {
        console.log('⚠️  CRITICAL/HIGH RISK VULNERABILITIES FOUND!');
        console.log('🚨 Immediate remediation recommended!');
    } else if (medium > 0) {
        console.log('⚠️  Medium risk vulnerabilities found.');
        console.log('📋 Review and remediate when possible.');
    } else {
        console.log('✅ No critical vulnerabilities detected.');
        console.log('🛡️  Target appears to have good security posture.');
    }

    console.log('\n🔍 Detailed findings available in the results above.');
    console.log('📄 Consider generating a full VAPT report for documentation.\n');

    return {
        target: TARGET_URL,
        duration,
        endpointsTested: endpoints.length,
        totalFindings,
        findings: allFindings,
        severity: { critical, high, medium, low }
    };
}

// Run the harsh test
runHarshVAPTTest().catch(console.error);