import axios from 'axios';
import { logger } from '../utils/logger.js';

function buildFinding(endpoint, title, category, severity, cvss, confidence, evidence) {
    return {
        assetId: endpoint.assetId,
        endpointId: endpoint.id,
        title,
        description: `Detected ${title} affecting GraphQL endpoint ${endpoint.url}.`,
        category,
        severity,
        cvss,
        detectedBy: 'graphql-analyzer',
        confidence,
        evidence
    };
}

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        ...FullType
      }
    }
  }
  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
    }
  }
`;

export async function testGraphQL(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;

    // Fast fail if not a likely GraphQL endpoint
    if (!endpoint.url.toLowerCase().includes('graphql') && !endpoint.url.toLowerCase().includes('/gql')) {
        return findings;
    }

    logger.info(`[GraphQL] Analyzing endpoint: ${endpoint.url}`);

    // 1. Test Introspection
    try {
        const resp = await axios.post(endpoint.url, {
            query: INTROSPECTION_QUERY
        }, {
            headers: { 'Content-Type': 'application/json', ...endpoint.headers },
            timeout,
            validateStatus: () => true
        });

        if (resp.status === 200 && resp.data && resp.data.data && resp.data.data.__schema) {
            findings.push(buildFinding(endpoint, 'GraphQL Introspection Enabled', 'INFORMATION_DISCLOSURE', 'HIGH', 7.5, 100, [
                { type: 'LOG', title: 'Impact', content: `The GraphQL endpoint allows Introspection queries. An attacker can map the entire API schema, discovering hidden queries, mutations, and internal data structures.` },
                { type: 'CODE', title: 'Extracted Schema Snippet', content: JSON.stringify(resp.data.data.__schema.types.slice(0, 3), null, 2) + '\n...' }
            ]));

            // 2. Test Query Batching DoS
            const batchFinding = await testBatching(endpoint, timeout);
            if (batchFinding) findings.push(batchFinding);

            // 3. Test Depth Limit DoS
            const depthFinding = await testDepthLimit(endpoint, timeout);
            if (depthFinding) findings.push(depthFinding);
        }
    } catch (e) {
        logger.error(`[GraphQL] Introspection test failed: ${e.message}`);
    }

    return findings;
}

async function testBatching(endpoint, timeout) {
    // Array of 100 identical queries
    const batch = Array(100).fill({ query: 'query { __typename }' });
    
    try {
        const resp = await axios.post(endpoint.url, batch, {
            headers: { 'Content-Type': 'application/json', ...endpoint.headers },
            timeout,
            validateStatus: () => true
        });

        if (resp.status === 200 && Array.isArray(resp.data) && resp.data.length === 100) {
            return buildFinding(endpoint, 'GraphQL Query Batching Abuse', 'SECURITY_MISCONFIG', 'MEDIUM', 5.3, 100, [
                { type: 'LOG', title: 'Impact', content: `The server accepts array-based request batching without limits. An attacker can bypass API rate limits and perform Denial of Service or fast brute-forcing by packing hundreds of queries into a single HTTP request.` }
            ]);
        }
    } catch (e) {
        // Ignored
    }
    return null;
}

async function testDepthLimit(endpoint, timeout) {
    // Highly nested query (e.g. 15 levels deep)
    // Needs to match actual schema types in a real attack, but some servers crash just parsing deep ASTs
    let deepQuery = '{ __schema { queryType { fields { type { fields { type { fields { type { name } } } } } } } } }';
    
    try {
        const resp = await axios.post(endpoint.url, { query: deepQuery }, {
            headers: { 'Content-Type': 'application/json', ...endpoint.headers },
            timeout: 5000,
            validateStatus: () => true
        });

        // If it succeeds or takes too long, it might be vulnerable, but 200 is a good indicator it parsed it successfully without a max-depth rejection.
        if (resp.status === 200 && !resp.data.errors) {
            return buildFinding(endpoint, 'Missing GraphQL Query Depth Limit', 'SECURITY_MISCONFIG', 'MEDIUM', 5.3, 80, [
                { type: 'LOG', title: 'Impact', content: `The server does not restrict the maximum depth of parsed GraphQL queries. Attackers can submit deeply nested recursive queries to exhaust server CPU and memory (Denial of Service).` }
            ]);
        }
    } catch (e) {
        // Ignored
    }
    return null;
}
