// backend/src/reporting/remediationEngine.js
// Tech-stack-aware remediation guidance generator

const REMEDIATION_DB = {
    INJECTION: {
        'Node.js': { title: 'Parameterized Queries (Node.js)', code: `// Using Prisma ORM (recommended)\nconst user = await prisma.user.findFirst({ where: { email: userInput } });\n\n// Using pg (raw PostgreSQL)\nconst result = await pool.query('SELECT * FROM users WHERE email = $1', [userInput]);\n\n// Using mysql2\nconst [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [userInput]);`, priority: 'IMMEDIATE' },
        'Python': { title: 'Parameterized Queries (Python)', code: `# Using SQLAlchemy ORM\nuser = session.query(User).filter(User.email == user_input).first()\n\n# Using psycopg2 (raw)\ncursor.execute("SELECT * FROM users WHERE email = %s", (user_input,))\n\n# Using Django ORM\nuser = User.objects.filter(email=user_input).first()`, priority: 'IMMEDIATE' },
        'PHP': { title: 'Prepared Statements (PHP)', code: `// Using PDO\n$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');\n$stmt->execute(['email' => $userInput]);\n\n// Using MySQLi\n$stmt = $mysqli->prepare('SELECT * FROM users WHERE email = ?');\n$stmt->bind_param('s', $userInput);\n$stmt->execute();`, priority: 'IMMEDIATE' },
        'Java': { title: 'Prepared Statements (Java)', code: `// Using JDBC PreparedStatement\nPreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE email = ?");\nstmt.setString(1, userInput);\nResultSet rs = stmt.executeQuery();\n\n// Using JPA/Hibernate\nUser user = em.createQuery("SELECT u FROM User u WHERE u.email = :email", User.class)\n    .setParameter("email", userInput).getSingleResult();`, priority: 'IMMEDIATE' },
        'default': { title: 'Parameterized Queries', code: '// Use your framework\'s parameterized query mechanism.\n// NEVER concatenate user input into SQL strings.\n// Use an ORM (Object-Relational Mapping) where possible.', priority: 'IMMEDIATE' }
    },
    XSS: {
        'Node.js': { title: 'Output Encoding & CSP (Node.js)', code: `// Install: npm install dompurify jsdom\nimport DOMPurify from 'dompurify';\nimport { JSDOM } from 'jsdom';\nconst window = new JSDOM('').window;\nconst purify = DOMPurify(window);\nconst clean = purify.sanitize(userInput);\n\n// Set CSP header (Express)\napp.use((req, res, next) => {\n  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'");\n  next();\n});`, priority: 'IMMEDIATE' },
        'React': { title: 'React XSS Prevention', code: `// React auto-escapes by default — AVOID dangerouslySetInnerHTML\n// ❌ WRONG: <div dangerouslySetInnerHTML={{__html: userInput}} />\n// ✅ RIGHT: <div>{userInput}</div>\n\n// If you must render HTML, sanitize first:\nimport DOMPurify from 'dompurify';\n<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userInput)}} />`, priority: 'IMMEDIATE' },
        'default': { title: 'XSS Prevention', code: '// 1. Encode output in the correct context (HTML, JS, URL, CSS)\n// 2. Implement Content-Security-Policy headers\n// 3. Use a templating engine with auto-escaping\n// 4. Sanitize HTML input with a library like DOMPurify', priority: 'IMMEDIATE' }
    },
    SSRF: {
        'default': { title: 'SSRF Prevention', code: `// 1. Validate and whitelist allowed URLs\nconst ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com'];\nconst url = new URL(userInput);\nif (!ALLOWED_HOSTS.includes(url.hostname)) throw new Error('Blocked');\n\n// 2. Block internal IP ranges\nconst blocked = /^(127\\.|10\\.|172\\.(1[6-9]|2|3[01])\\.|192\\.168\\.|169\\.254\\.)/;\nif (blocked.test(resolvedIP)) throw new Error('Internal IP blocked');\n\n// 3. Disable redirects: { maxRedirects: 0 }`, priority: 'IMMEDIATE' }
    },
    XXE: {
        'Java': { title: 'Disable XXE (Java)', code: `// SAXParserFactory\nSAXParserFactory spf = SAXParserFactory.newInstance();\nspf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);\nspf.setFeature("http://xml.org/sax/features/external-general-entities", false);\nspf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);`, priority: 'IMMEDIATE' },
        'default': { title: 'XXE Prevention', code: '// 1. Disable external entity processing in XML parsers\n// 2. Use JSON instead of XML where possible\n// 3. Update XML processing libraries to latest versions\n// 4. Implement input validation for XML data', priority: 'IMMEDIATE' }
    },
    BROKEN_ACCESS: {
        'default': { title: 'Access Control', code: `// Middleware: Check resource ownership on every request\nasync function checkOwnership(req, res, next) {\n  const resource = await db.findById(req.params.id);\n  if (!resource || resource.userId !== req.user.id) {\n    return res.status(403).json({ error: 'Forbidden' });\n  }\n  next();\n}`, priority: 'HIGH' }
    }
};

/**
 * Generate tech-stack-aware remediation for a finding
 * @param {object} finding - Finding with category, title
 * @param {string[]} technologies - Detected tech stack
 * @returns {object} Remediation with code examples
 */
export function generateRemediation(finding, technologies = []) {
    const category = finding.category || 'OTHER';
    const remediations = REMEDIATION_DB[category] || REMEDIATION_DB['BROKEN_ACCESS'];

    if (!remediations) {
        return { title: 'General Remediation', code: finding.remediation || 'Review and fix the identified vulnerability.', priority: 'MEDIUM', techMatch: 'generic' };
    }

    // Find best tech match
    for (const tech of technologies) {
        const normalizedTech = tech.toLowerCase();
        for (const [key, val] of Object.entries(remediations)) {
            if (key.toLowerCase() === normalizedTech || normalizedTech.includes(key.toLowerCase())) {
                return { ...val, techMatch: key };
            }
        }
    }

    return { ...remediations['default'], techMatch: 'default' };
}

export default { generateRemediation };
