import axios from 'axios';
import { logger } from '../utils/logger.js';

export async function testDependencyConfusion(endpoint, options = {}) {
    const findings = [];
    const timeout = options.timeout || 10000;
    
    // Check if it's a GET request to the root or a likely manifest path
    const urlObj = new URL(endpoint.url);
    if (endpoint.method !== 'GET' || urlObj.pathname.length > 15) {
        return findings;
    }

    logger.info(`[DependencyConfusion] Checking for exposed manifests on: ${urlObj.origin}`);

    const manifests = [
        { path: '/package.json', type: 'npm' },
        { path: '/requirements.txt', type: 'pypi' },
        { path: '/pom.xml', type: 'maven' }
    ];

    try {
        for (const manifest of manifests) {
            const testUrl = `${urlObj.origin}${manifest.path}`;
            
            try {
                const resp = await axios.get(testUrl, { timeout, validateStatus: () => true });
                
                if (resp.status === 200) {
                    const bodyStr = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
                    
                    let privatePackages = [];
                    
                    if (manifest.type === 'npm' && bodyStr.includes('dependencies')) {
                         try {
                             const pkgJson = JSON.parse(bodyStr);
                             const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
                             
                             // Look for packages with specific scopes or unusual names that might be internal
                             // Realistically, any package not found on the public registry could be a target
                             for (const dep of Object.keys(deps)) {
                                 // Simple heuristic: if it starts with @internal, @companyname, or has no public match
                                 // We will check npmjs registry directly
                                 privatePackages.push(dep);
                             }
                         } catch(e) {}
                    } else if (manifest.type === 'pypi') {
                         // Parse requirements.txt lines
                         const lines = bodyStr.split('\n');
                         for (const line of lines) {
                             if (line && !line.startsWith('#') && !line.includes('://')) {
                                 const pkgName = line.split('==')[0].split('>')[0].split('<')[0].trim();
                                 if (pkgName) privatePackages.push(pkgName);
                             }
                         }
                    } else if (manifest.type === 'maven') {
                         // Regex to find <groupId> and <artifactId>
                         const artifactRegex = /<artifactId>([^<]+)<\/artifactId>/g;
                         let match;
                         while ((match = artifactRegex.exec(bodyStr)) !== null) {
                             privatePackages.push(match[1]);
                         }
                    }

                    if (privatePackages.length > 0) {
                        // Check public registries for the extracted packages
                        // We limit to max 10 to avoid excessive API calls during scan
                        const checkPackages = privatePackages.slice(0, 10);
                        
                        for (const pkg of checkPackages) {
                            let isUnclaimed = false;
                            
                            try {
                                if (manifest.type === 'npm') {
                                    // Remove scope for npm check to see if the base name is claimable, 
                                    // or if the scoped package doesn't exist on public npm (though scoped is harder to hijack unless org is unclaimed)
                                    // For simplicity, we just check if it returns 404
                                    const npmResp = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, { validateStatus: () => true, timeout: 5000 });
                                    if (npmResp.status === 404) isUnclaimed = true;
                                } else if (manifest.type === 'pypi') {
                                    const pypiResp = await axios.get(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`, { validateStatus: () => true, timeout: 5000 });
                                    if (pypiResp.status === 404) isUnclaimed = true;
                                }
                            } catch (regErr) {
                                logger.debug(`Registry check failed for ${pkg}: ${regErr.message}`);
                            }

                            if (isUnclaimed) {
                                findings.push({
                                    assetId: endpoint.assetId,
                                    endpointId: endpoint.id,
                                    title: 'Dependency Confusion (Supply Chain Attack)',
                                    description: `The application exposes its '${manifest.path}' file, which lists an internal dependency named '${pkg}'. This package name is currently unclaimed on the public ${manifest.type} registry. An attacker can register this package publicly with a higher version number, forcing the application's build process to download and execute the malicious public package instead of the internal one.`,
                                    category: 'SECURITY_MISCONFIG',
                                    severity: 'CRITICAL',
                                    cvss: 9.8,
                                    detectedBy: 'dependency-engine',
                                    confidence: 100,
                                    evidence: [
                                        { type: 'LOG', title: 'Exposed Manifest', content: `Found at ${testUrl}` },
                                        { type: 'LOG', title: 'Vulnerable Package', content: `Package '${pkg}' returned HTTP 404 on the public registry, meaning it can be registered by anyone.` }
                                    ],
                                    remediation: `Block public access to manifest files (like ${manifest.path}). Register all internal package names on the public registry as empty placeholders to prevent hijacking, or use strict scope/registry configurations (e.g., .npmrc) to ensure internal packages are only fetched from internal repositories.`
                                });
                                break; // Found one, no need to alert for every single package
                            }
                        }
                    }
                }
            } catch (e) {}
        }

    } catch (e) {
        logger.error(`[DependencyConfusion] Test failed: ${e.message}`);
    }

    return findings;
}
