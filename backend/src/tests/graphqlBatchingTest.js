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

export async function testGraphQLAlias(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 15000;

    // Fast fail if not a likely GraphQL endpoint
    if (!endpoint.url.toLowerCase().includes('graphql') && !endpoint.url.toLowerCase().includes('/gql')) {
        return findings;
    }

    logger.info(`[GraphQL Alias] Analyzing endpoint: ${endpoint.url}`);

    try {
        // Construct a query with 1000 aliases of a basic field (e.g. __typename) to test the parsing limit
        // In a real attack, this would be an expensive mutation like login or a deep query
        let aliasedQuery = 'query { ';
        for (let i = 0; i < 1000; i++) {
            aliasedQuery += `alias${i}: __typename `;
        }
        aliasedQuery += '}';

        const startTime = Date.now();
        const resp = await axios.post(endpoint.url, { query: aliasedQuery }, {
            headers: { 'Content-Type': 'application/json', ...endpoint.headers },
            timeout,
            validateStatus: () => true
        });
        const duration = Date.now() - startTime;

        // If the server returns a 200 OK and successfully parsed all 1000 aliases, it indicates no limit is in place
        if (resp.status === 200 && resp.data && resp.data.data && resp.data.data.alias999) {
            findings.push(buildFinding(endpoint, 'GraphQL Query Aliasing (Rate Limit Bypass)', 'SECURITY_MISCONFIG', 'HIGH', 7.5, 95, [
                { type: 'LOG', title: 'Impact', content: `The GraphQL server accepted a single query containing 1000 field aliases. This allows attackers to bypass HTTP-level rate limiting by executing hundreds or thousands of operations (like login attempts or expensive database lookups) within a single HTTP request.` },
                { type: 'LOG', title: 'Execution Detail', content: `Request with 1000 aliases processed successfully in ${duration}ms.` }
            ]));
        }
    } catch (e) {
        logger.debug(`[GraphQL Alias] Test failed or timed out: ${e.message}`);
    }

    return findings;
}
