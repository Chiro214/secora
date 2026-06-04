// backend/src/engines/contextAnalyzer.js
// Analyzes where user input is reflected in responses to select context-appropriate payloads
import axios from 'axios';

export const CONTEXTS = {
    HTML_BODY: 'HTML_BODY',
    HTML_ATTRIBUTE: 'HTML_ATTRIBUTE',
    JS_STRING: 'JS_STRING',
    JS_TEMPLATE: 'JS_TEMPLATE',
    JSON_VALUE: 'JSON_VALUE',
    URL_PARAM: 'URL_PARAM',
    CSS_VALUE: 'CSS_VALUE',
    NOT_REFLECTED: 'NOT_REFLECTED'
};

/**
 * Analyze injection context for each parameter in an endpoint
 * @returns {object} Map of param -> context
 */
export async function analyzeContext(endpoint, options = {}) {
    const results = {};
    const timeout = options.timeout || 10000;

    if (!endpoint.parameters) return results;
    const params = typeof endpoint.parameters === 'object' ? Object.keys(endpoint.parameters) : [];

    for (const param of params) {
        const canary = `SECORA_PROBE_${Math.random().toString(36).substring(2, 10)}`;
        try {
            const testUrl = new URL(endpoint.url);
            testUrl.searchParams.set(param, canary);
            const resp = await axios.get(testUrl.toString(), {
                timeout, validateStatus: () => true,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
            results[param] = detectContext(body, canary);
        } catch {
            results[param] = CONTEXTS.NOT_REFLECTED;
        }
    }
    return results;
}

/**
 * Detect the reflection context of a canary string in a response body
 */
export function detectContext(body, canary) {
    const idx = body.indexOf(canary);
    if (idx < 0) return CONTEXTS.NOT_REFLECTED;

    const before = body.substring(Math.max(0, idx - 100), idx);
    const after = body.substring(idx + canary.length, Math.min(body.length, idx + canary.length + 100));

    // Check JSON context: "key": "...canary..."
    if (/["']\s*:\s*["'][^"']*$/s.test(before) && /^[^"']*["']/s.test(after)) {
        return CONTEXTS.JSON_VALUE;
    }

    // Check JS string context: '...canary...' or "...canary..." inside <script>
    const scriptBefore = body.lastIndexOf('<script', idx);
    const scriptAfter = body.indexOf('</script>', idx);
    if (scriptBefore >= 0 && (scriptAfter > idx || scriptAfter < 0)) {
        if (/['"][^'"]*$/s.test(before) && /^[^'"]*['"]/s.test(after)) {
            return CONTEXTS.JS_STRING;
        }
        if (/`[^`]*$/s.test(before)) return CONTEXTS.JS_TEMPLATE;
    }

    // Check HTML attribute context: attr="...canary..."
    if (/\w+\s*=\s*["'][^"']*$/s.test(before) && /^[^"']*["']/s.test(after)) {
        return CONTEXTS.HTML_ATTRIBUTE;
    }

    // Check URL/href context: href="...canary..." or src="...canary..."
    if (/(?:href|src|action|data|codebase)\s*=\s*["'][^"']*$/si.test(before)) {
        return CONTEXTS.URL_PARAM;
    }

    // Check CSS context: style="...canary..."
    if (/style\s*=\s*["'][^"']*$/si.test(before) || /<style[^>]*>[^<]*$/si.test(before)) {
        return CONTEXTS.CSS_VALUE;
    }

    // Default: HTML body context
    return CONTEXTS.HTML_BODY;
}

export default { analyzeContext, detectContext, CONTEXTS };
