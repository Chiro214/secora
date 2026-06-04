import express from 'express';
import jwt from 'jsonwebtoken';
import { testJWT } from './src/tests/jwtTest.js';

const app = express();
const SECRET = 'changeme'; // Intentionally weak secret for testing

app.get('/api/admin', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).send('No token');
    
    const token = auth.split(' ')[1];
    
    try {
        // Mock vulnerable verification that accepts 'none' algorithm
        const decoded = jwt.decode(token, { complete: true });
        if (decoded.header.alg === 'none') {
            // VULNERABLE: accepts 'none' alg
            if (decoded.payload.role === 'admin') {
                return res.send('Welcome Admin (None Alg Bypass)');
            }
        }
        
        // Otherwise try normal verify
        const verified = jwt.verify(token, SECRET);
        if (verified.role === 'admin') return res.send('Welcome Admin (Valid)');
        
        res.status(403).send('Forbidden');
    } catch (e) {
        res.status(401).send('Invalid token');
    }
});

const server = app.listen(5557, async () => {
    console.log('✅ Mock Vulnerable JWT Server running on port 5557');
    
    // Generate a normal user token
    const normalToken = jwt.sign({ user: 'test', role: 'user' }, SECRET);
    
    const endpoint = {
        url: 'http://localhost:5557/api/admin',
        headers: {
            'Authorization': `Bearer ${normalToken}`
        }
    };
    
    console.log('\n--- Initiating SECORA JWT Attack ---');
    console.log(`Analyzing token: ${normalToken}`);
    
    const findings = await testJWT(endpoint, { timeout: 5000 });
    
    console.log(`\n✅ Found ${findings.length} JWT Vulnerabilities:`);
    for (const f of findings) {
        console.log(`- [${f.severity}] ${f.title}`);
        console.log(`  ${f.evidence[0].content.split('\n')[0]}`);
    }
    
    server.close();
    process.exit(0);
});
