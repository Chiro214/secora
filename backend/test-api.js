import express from 'express';
import { testGraphQL } from './src/tests/graphqlTest.js';

const app = express();
app.use(express.json());

// Mock GraphQL Endpoint with Introspection enabled
app.post('/graphql', (req, res) => {
    const query = req.body.query || '';
    
    // Simulate query batching (array of queries)
    if (Array.isArray(req.body)) {
        const responses = req.body.map(() => ({ data: { __typename: 'Query' } }));
        return res.json(responses);
    }
    
    // Check for depth limit vulnerability (mocking deep query)
    if (query.includes('fields { type { fields { type { fields { type { name } } } } } }')) {
        return res.json({ data: { __schema: { queryType: { fields: [] } } } }); // Server parses deep without error
    }

    // Check for introspection
    if (query.includes('__schema')) {
        return res.json({
            data: {
                __schema: {
                    queryType: { name: 'Query' },
                    mutationType: { name: 'Mutation' },
                    types: [
                        { kind: 'OBJECT', name: 'User', description: 'A user of the system' },
                        { kind: 'OBJECT', name: 'SecretData', description: 'Highly confidential internal data' }
                    ]
                }
            }
        });
    }

    res.json({ data: null });
});

const server = app.listen(5558, async () => {
    console.log('✅ Mock Vulnerable GraphQL Server running on port 5558');

    const endpoint = {
        url: 'http://localhost:5558/graphql',
        headers: {}
    };

    console.log('\n--- Initiating SECORA GraphQL Attack ---');
    console.log(`Analyzing endpoint: ${endpoint.url}`);
    
    const findings = await testGraphQL(endpoint, { timeout: 5000 });
    
    console.log(`\n✅ Found ${findings.length} GraphQL Vulnerabilities:`);
    for (const f of findings) {
        console.log(`- [${f.severity}] ${f.title}`);
        console.log(`  ${f.description}`);
        if (f.evidence && f.evidence.length > 1) {
            console.log(`  Evidence: ${f.evidence[1].content.split('\n')[0]}`);
        }
    }

    server.close();
    process.exit(0);
});
