// backend/src/utils/validators.js
import { isIP } from 'net';
import dns from 'dns/promises';

/**
 * Validate and normalize target
 */
export function validateTarget({ type, value }) {
    switch (type) {
        case 'DOMAIN':
            return validateDomain(value);
        case 'IP':
            return validateIP(value);
        case 'URL':
            return validateURL(value);
        case 'CIDR':
            return validateCIDR(value);
        default:
            return { valid: false, error: 'Invalid target type' };
    }
}

function validateDomain(domain) {
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '');
    
    // Remove path if present
    domain = domain.split('/')[0];
    
    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    
    if (!domainRegex.test(domain)) {
        return { valid: false, error: 'Invalid domain format' };
    }
    
    // Check against blocklist
    if (isBlockedDomain(domain)) {
        return { valid: false, error: 'Domain is blocked' };
    }
    
    return { valid: true, normalized: domain };
}

function validateIP(ip) {
    if (!isIP(ip)) {
        return { valid: false, error: 'Invalid IP address' };
    }
    
    // Check if private IP
    if (isPrivateIP(ip)) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
    }
    
    return { valid: true, normalized: ip };
}

function validateURL(url) {
    try {
        const urlObj = new URL(url);
        
        // Only allow HTTP/HTTPS
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return { valid: false, error: 'Only HTTP/HTTPS protocols are allowed' };
        }
        
        // Check hostname
        const hostname = urlObj.hostname;
        
        if (isIP(hostname)) {
            if (isPrivateIP(hostname)) {
                return { valid: false, error: 'Private IP addresses are not allowed' };
            }
        } else {
            if (isBlockedDomain(hostname)) {
                return { valid: false, error: 'Domain is blocked' };
            }
        }
        
        return { valid: true, normalized: url };
        
    } catch (error) {
        return { valid: false, error: 'Invalid URL format' };
    }
}

function validateCIDR(cidr) {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    
    if (!cidrRegex.test(cidr)) {
        return { valid: false, error: 'Invalid CIDR format' };
    }
    
    const [ip, mask] = cidr.split('/');
    
    if (!isIP(ip)) {
        return { valid: false, error: 'Invalid IP in CIDR' };
    }
    
    const maskNum = parseInt(mask);
    if (maskNum < 0 || maskNum > 32) {
        return { valid: false, error: 'Invalid CIDR mask' };
    }
    
    if (isPrivateIP(ip)) {
        return { valid: false, error: 'Private IP ranges are not allowed' };
    }
    
    return { valid: true, normalized: cidr };
}

function isPrivateIP(ip) {
    const privateRanges = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^127\./,
        /^169\.254\./,
        /^0\.0\.0\.0$/,
        /^255\.255\.255\.255$/
    ];
    
    return privateRanges.some(pattern => pattern.test(ip));
}

function isBlockedDomain(domain) {
    const blockedDomains = [
        'localhost',
        'metadata.google.internal',
        '169.254.169.254'
    ];
    
    return blockedDomains.some(blocked => 
        domain === blocked || domain.endsWith('.' + blocked)
    );
}

/**
 * Validate scan configuration
 */
export function validateScanConfig(config) {
    const errors = [];
    
    if (config.maxDepth && (config.maxDepth < 1 || config.maxDepth > 10)) {
        errors.push('maxDepth must be between 1 and 10');
    }
    
    if (config.maxUrls && (config.maxUrls < 1 || config.maxUrls > 10000)) {
        errors.push('maxUrls must be between 1 and 10000');
    }
    
    if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
        errors.push('timeout must be between 1000 and 60000 ms');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}
