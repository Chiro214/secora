import axios from 'axios';
import { logger } from '../utils/logger.js';
import dns2 from 'dns2';

const dns = new dns2();

// List of signatures for unclaimed cloud services
const TAKEOVER_SIGNATURES = [
    { service: 'AWS S3', regex: /NoSuchBucket|The specified bucket does not exist/i },
    { service: 'GitHub Pages', regex: /There isn't a GitHub Pages site here/i },
    { service: 'Heroku', regex: /No such app|Heroku \| No such app/i },
    { service: 'Netlify', regex: /Not Found - Request ID/i },
    { service: 'Fastly', regex: /Fastly error: unknown domain/i },
    { service: 'Azure', regex: /404 Web Site not found/i },
    { service: 'Shopify', regex: /Sorry, this shop is currently unavailable/i },
    { service: 'Tumblr', regex: /Whatever you were looking for doesn't currently exist at this address/i },
    { service: 'Ghost', regex: /The thing you were looking for is no longer here/i },
    { service: 'Pantheon', regex: /404 error unknown site!/i },
    { service: 'Cargo', regex: /If you're moving your domain away from Cargo/i },
    { service: 'Bitbucket', regex: /Repository not found/i },
    { service: 'Fly.io', regex: /404 Not Found/i }, // Can be generic, requires careful context
    { service: 'Zendesk', regex: /Help Center Closed|Oops, this help center no longer exists/i },
    { service: 'Squarespace', regex: /Squarespace - Website Expired/i }
];

export async function testSubdomainTakeover(subdomain, options = {}) {
    const findings = [];
    const timeout = options.timeout || 5000;
    
    // We only test plain domains/subdomains, not full URLs here. 
    // Assuming subdomain is a string like "test.example.com"
    const domain = subdomain.replace(/^(https?:\/\/)/, '').split('/')[0];
    
    logger.info(`[Takeover] Testing subdomain takeover for: ${domain}`);

    try {
        // Step 1: Resolve CNAME chain
        const cnameChain = [];
        let currentTarget = domain;
        let cnameResolved = true;
        let finalDestination = null;

        // Try to follow CNAMEs up to 5 levels deep to prevent infinite loops
        for (let i = 0; i < 5; i++) {
            try {
                const response = await dns.resolveCname(currentTarget);
                if (response && response.answers && response.answers.length > 0) {
                    const nextCname = response.answers[0].domain;
                    cnameChain.push(`${currentTarget} -> ${nextCname}`);
                    currentTarget = nextCname;
                    finalDestination = nextCname;
                } else {
                    cnameResolved = false;
                    break;
                }
            } catch (dnsErr) {
                // If it fails to resolve, that's actually a GOOD sign for a dangling CNAME
                // We'll proceed to the HTTP request to verify
                break;
            }
        }

        if (cnameChain.length === 0) {
            // No CNAME found, likely an A record, skip takeover check
            return findings;
        }

        // Step 2: Send HTTP request to the domain to check for unclaimed service signature
        const protocol = options.protocol || 'http';
        const url = `${protocol}://${domain}`;
        
        try {
            const resp = await axios.get(url, {
                timeout,
                validateStatus: () => true // Resolve all statuses (404s are expected for takeovers)
            });

            const body = (typeof resp.data === 'string') ? resp.data : JSON.stringify(resp.data);
            
            // Step 3: Match against signatures
            for (const sig of TAKEOVER_SIGNATURES) {
                if (sig.regex.test(body)) {
                    findings.push({
                        title: 'Subdomain Takeover Vulnerability',
                        description: `The subdomain ${domain} has a dangling CNAME pointing to an unclaimed ${sig.service} service. An attacker could register this service and take full control of the subdomain.`,
                        category: 'SECURITY_MISCONFIG',
                        severity: 'CRITICAL',
                        cvss: 9.1,
                        detectedBy: 'subdomain-takeover-engine',
                        confidence: 95,
                        evidence: [
                            { type: 'LOG', title: 'CNAME Chain', content: cnameChain.join('\n') },
                            { type: 'LOG', title: 'Target Service', content: sig.service },
                            { type: 'RESPONSE', title: 'Service Response', content: body.substring(0, 500) + '...' }
                        ],
                        remediation: `Remove the DNS CNAME record for ${domain} pointing to ${finalDestination || 'the external service'}, or claim the resource at the third-party provider.`
                    });
                    break; // Only report one takeover per subdomain
                }
            }
        } catch (httpErr) {
            // Network error (e.g., DNS resolution failed for the HTTP request). 
            // A dangling CNAME that doesn't even resolve might still be vulnerable, but it requires manual investigation.
            // We'll log it as a potential, lower confidence issue if we want to be noisy, but for now we require a definitive signature match.
            logger.debug(`[Takeover] HTTP request failed for ${domain}: ${httpErr.message}`);
        }

    } catch (e) {
        logger.error(`[Takeover] Test failed for ${domain}: ${e.message}`);
    }

    return findings;
}
