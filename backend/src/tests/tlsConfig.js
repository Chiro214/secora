// backend/src/tests/tlsConfig.js
import tls from 'tls';
import https from 'https';
import { captureTlsInfo } from '../utils/screenshotCapture.js';

export async function testTLSConfig(asset) {
    const findings = [];
    const hostname = asset.value.replace(/^https?:\/\//, '');
    
    try {
        // Test 1: Certificate validity
        const certInfo = await getCertificateInfo(hostname);

        // Capture TLS screenshot evidence for all TLS-related findings
        let tlsScreenshot = null;
        try {
            const findingId = `tls-${hostname.replace(/[^a-z0-9]/gi, '-')}`;
            tlsScreenshot = await captureTlsInfo(certInfo, findingId, hostname);
        } catch (e) {
            console.warn(`TLS screenshot capture failed:`, e.message);
        }
        
        if (!certInfo.valid) {
            const evidence = [{
                type: 'LOG',
                title: 'Certificate Error',
                content: certInfo.error
            }];
            if (tlsScreenshot) {
                evidence.push({
                    type: 'SCREENSHOT',
                    title: `TLS Configuration — ${hostname}`,
                    content: tlsScreenshot.base64
                });
            }
            findings.push({
                assetId: asset.id,
                title: 'Invalid SSL/TLS Certificate',
                description: `Certificate validation failed: ${certInfo.error}`,
                category: 'SECURITY_MISCONFIG',
                severity: 'HIGH',
                cvss: 7.4,
                owasp: 'A02:2021',
                cwe: 'CWE-295',
                remediation: 'Install a valid SSL/TLS certificate from a trusted Certificate Authority',
                references: ['https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure'],
                detectedBy: 'tls-config-test',
                confidence: 100,
                exploit: { screenshots: tlsScreenshot ? [tlsScreenshot] : [] },
                evidence
            });
        }
        
        // Test 2: Certificate expiration
        if (certInfo.valid && certInfo.daysUntilExpiry < 30) {
            const evidence = [{
                type: 'LOG',
                title: 'Certificate Expiration',
                content: `Valid until: ${certInfo.validTo}\nDays remaining: ${certInfo.daysUntilExpiry}`
            }];
            if (tlsScreenshot) {
                evidence.push({
                    type: 'SCREENSHOT',
                    title: `TLS Certificate Expiry — ${hostname}`,
                    content: tlsScreenshot.base64
                });
            }
            findings.push({
                assetId: asset.id,
                title: 'SSL/TLS Certificate Expiring Soon',
                description: `Certificate expires in ${certInfo.daysUntilExpiry} days`,
                category: 'SECURITY_MISCONFIG',
                severity: certInfo.daysUntilExpiry < 7 ? 'HIGH' : 'MEDIUM',
                cvss: certInfo.daysUntilExpiry < 7 ? 6.5 : 4.3,
                owasp: 'A02:2021',
                cwe: 'CWE-295',
                remediation: 'Renew the SSL/TLS certificate before expiration',
                references: [],
                detectedBy: 'tls-config-test',
                confidence: 100,
                exploit: { screenshots: tlsScreenshot ? [tlsScreenshot] : [] },
                evidence
            });
        }
        
        // Test 3: Weak protocols
        const protocols = await testProtocols(hostname);
        
        if (protocols.weakProtocols.length > 0) {
            const evidence = [{
                type: 'LOG',
                title: 'Weak Protocols',
                content: `Supported protocols: ${protocols.allProtocols.join(', ')}\nWeak protocols: ${protocols.weakProtocols.join(', ')}`
            }];
            if (tlsScreenshot) {
                evidence.push({
                    type: 'SCREENSHOT',
                    title: `Weak TLS Protocols — ${hostname}`,
                    content: tlsScreenshot.base64
                });
            }
            findings.push({
                assetId: asset.id,
                title: 'Weak SSL/TLS Protocols Enabled',
                description: `Server supports weak protocols: ${protocols.weakProtocols.join(', ')}`,
                category: 'SECURITY_MISCONFIG',
                severity: 'HIGH',
                cvss: 7.5,
                owasp: 'A02:2021',
                cwe: 'CWE-327',
                remediation: 'Disable SSLv3, TLS 1.0, and TLS 1.1. Use TLS 1.2 or TLS 1.3 only.',
                references: ['https://www.rfc-editor.org/rfc/rfc8996.html'],
                detectedBy: 'tls-config-test',
                confidence: 100,
                exploit: { screenshots: tlsScreenshot ? [tlsScreenshot] : [] },
                evidence
            });
        }
        
    } catch (error) {
        console.error(`Error testing TLS for ${hostname}:`, error.message);
    }
    
    return findings;
}

async function getCertificateInfo(hostname) {
    return new Promise((resolve) => {
        const options = {
            host: hostname,
            port: 443,
            method: 'GET',
            rejectUnauthorized: false
        };
        
        const req = https.request(options, (res) => {
            const cert = res.socket.getPeerCertificate();
            
            if (!cert || Object.keys(cert).length === 0) {
                resolve({ valid: false, error: 'No certificate found' });
                return;
            }
            
            const now = new Date();
            const validFrom = new Date(cert.valid_from);
            const validTo = new Date(cert.valid_to);
            const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
            
            resolve({
                valid: now >= validFrom && now <= validTo,
                validFrom: validFrom.toISOString(),
                validTo: validTo.toISOString(),
                daysUntilExpiry,
                issuer: cert.issuer,
                subject: cert.subject
            });
        });
        
        req.on('error', (err) => {
            resolve({ valid: false, error: err.message });
        });
        
        req.end();
    });
}

async function testProtocols(hostname) {
    const protocols = ['SSLv3', 'TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
    const supported = [];
    const weakProtocols = [];
    
    for (const protocol of protocols) {
        try {
            const isSupported = await testProtocol(hostname, protocol);
            if (isSupported) {
                supported.push(protocol);
                if (['SSLv3', 'TLSv1', 'TLSv1.1'].includes(protocol)) {
                    weakProtocols.push(protocol);
                }
            }
        } catch (err) {
            // Protocol not supported
        }
    }
    
    return {
        allProtocols: supported,
        weakProtocols
    };
}

function testProtocol(hostname, protocol) {
    return new Promise((resolve) => {
        const socket = tls.connect({
            host: hostname,
            port: 443,
            secureProtocol: protocol.replace('.', '_') + '_method',
            rejectUnauthorized: false
        }, () => {
            socket.end();
            resolve(true);
        });
        
        socket.on('error', () => {
            resolve(false);
        });
        
        socket.setTimeout(3000, () => {
            socket.destroy();
            resolve(false);
        });
    });
}
