// backend/src/engines/apiSchemaParser.js
import axios from 'axios';

const SWAGGER_PATHS = [
    '/swagger.json', '/swagger/v1/swagger.json', '/api-docs', '/api-docs.json',
    '/openapi.json', '/v2/api-docs', '/v3/api-docs'
];
const GRAPHQL_PATHS = ['/graphql', '/api/graphql', '/gql'];

export async function parseApiSchemas(baseUrl, config = {}) {
    console.log(`📋 Checking for API schemas at ${baseUrl}`);
    const results = { endpoints: [], schemas: [], graphql: null };
    const headers = { 'User-Agent': 'Secora-Scanner/2.0', ...(config.headers || {}) };

    // Check OpenAPI/Swagger
    for (const path of SWAGGER_PATHS) {
        try {
            const url = new URL(path, baseUrl).href;
            const resp = await axios.get(url, { timeout: 8000, headers, validateStatus: () => true });
            if (resp.status === 200 && resp.data) {
                let spec = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
                if (spec.swagger || spec.openapi || spec.paths) {
                    console.log(`  ✅ Found OpenAPI spec at ${path}`);
                    const eps = parseOpenAPISpec(spec, baseUrl);
                    results.endpoints.push(...eps);
                    results.schemas.push({ type: spec.openapi ? 'openapi' : 'swagger', version: spec.openapi || spec.swagger, path, endpointCount: eps.length });
                    break;
                }
            }
        } catch { /* skip */ }
    }

    // Check GraphQL introspection
    for (const path of GRAPHQL_PATHS) {
        try {
            const url = new URL(path, baseUrl).href;
            const resp = await axios.post(url, {
                query: `{ __schema { queryType { name } mutationType { name } types { name kind fields { name args { name type { name kind } } type { name kind } } } } }`
            }, { timeout: 8000, headers: { ...headers, 'Content-Type': 'application/json' }, validateStatus: () => true });
            if (resp.status === 200 && resp.data?.data?.__schema) {
                console.log(`  ✅ Found GraphQL at ${path}`);
                const eps = parseGraphQLSchema(resp.data.data.__schema, url);
                results.endpoints.push(...eps);
                results.graphql = { endpoint: url, types: resp.data.data.__schema.types?.length || 0 };
                break;
            }
        } catch { /* skip */ }
    }

    console.log(`  📋 Schema parsing: ${results.endpoints.length} endpoints found`);
    return results;
}

function parseOpenAPISpec(spec, baseUrl) {
    const endpoints = [];
    const basePath = spec.basePath || '';
    const serverUrl = spec.servers?.[0]?.url || baseUrl;
    if (!spec.paths) return endpoints;

    for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, op] of Object.entries(methods)) {
            if (!['get','post','put','delete','patch'].includes(method.toLowerCase())) continue;
            const parameters = {};
            for (const p of [...(op.parameters || []), ...(methods.parameters || [])]) {
                parameters[p.name] = { in: p.in, type: p.schema?.type || p.type || 'string', required: p.required || false };
            }
            if (op.requestBody?.content?.['application/json']?.schema?.properties) {
                for (const [k, v] of Object.entries(op.requestBody.content['application/json'].schema.properties)) {
                    parameters[k] = { in: 'body', type: v.type || 'string', required: (op.requestBody.content['application/json'].schema.required || []).includes(k) };
                }
            }
            let fullUrl;
            try { fullUrl = new URL(`${basePath}${path}`, serverUrl).href; } catch { fullUrl = `${serverUrl}${basePath}${path}`; }
            endpoints.push({ url: fullUrl, method: method.toUpperCase(), parameters: Object.keys(parameters).length > 0 ? parameters : null, description: op.summary || '', discoveredBy: 'api-schema-parser', type: 'api', source: 'openapi' });
        }
    }
    return endpoints;
}

function parseGraphQLSchema(schema, gqlEndpoint) {
    const endpoints = [];
    if (!schema.types) return endpoints;
    const qName = schema.queryType?.name || 'Query';
    const mName = schema.mutationType?.name || 'Mutation';

    for (const type of schema.types) {
        if (type.name.startsWith('__') || !type.fields) continue;
        if (type.name !== qName && type.name !== mName) continue;
        const isQuery = type.name === qName;
        for (const field of type.fields) {
            const params = {};
            for (const arg of (field.args || [])) {
                params[arg.name] = { in: 'graphql', type: arg.type?.name || 'String', required: arg.type?.kind === 'NON_NULL' };
            }
            endpoints.push({ url: gqlEndpoint, method: 'POST', parameters: Object.keys(params).length > 0 ? params : null, description: `GraphQL ${isQuery ? 'Query' : 'Mutation'}: ${field.name}`, discoveredBy: 'api-schema-parser', type: 'graphql', source: 'graphql-introspection', graphql: { operationType: isQuery ? 'query' : 'mutation', fieldName: field.name } });
        }
    }
    return endpoints;
}

export default parseApiSchemas;
