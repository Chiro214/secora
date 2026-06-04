// backend/src/engines/networkScan.js
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Network scan engine - wraps Go scanner
 */
export async function networkScanEngine({ target, type, config }) {
    console.log(`🔍 Starting network scan for ${target}`);
    
    try {
        // Path to Go scanner binary
        const scannerPath = path.join(__dirname, '../../scan-engine/scan-engine');
        
        // Build command arguments
        const args = [target];
        
        if (config.ports) {
            args.push(config.ports);
        }
        
        // Execute Go scanner
        const result = await executeScanner(scannerPath, args, config.timeout || 60000);
        
        console.log(`✅ Network scan completed: ${result.stats.openPorts} open ports found`);
        
        return result;
        
    } catch (error) {
        console.error('Network scan error:', error);
        
        // Fallback to JavaScript implementation if Go scanner fails
        return await fallbackNetworkScan({ target, type, config });
    }
}

/**
 * Execute Go scanner binary
 */
function executeScanner(scannerPath, args, timeout) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        const process = spawn(scannerPath, args, {
            timeout,
            maxBuffer: 10 * 1024 * 1024 // 10MB
        });
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Scanner exited with code ${code}: ${stderr}`));
            }
            
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (err) {
                reject(new Error(`Failed to parse scanner output: ${err.message}`));
            }
        });
        
        process.on('error', (err) => {
            reject(new Error(`Failed to execute scanner: ${err.message}`));
        });
    });
}

/**
 * Fallback JavaScript implementation
 */
async function fallbackNetworkScan({ target, type, config }) {
    console.log('⚠️  Using fallback JavaScript network scanner');
    
    const net = await import('net');
    const dns = await import('dns/promises');
    
    const result = {
        hosts: [],
        stats: {
            totalHosts: 0,
            aliveHosts: 0,
            openPorts: 0,
            scanDuration: 0
        }
    };
    
    const startTime = Date.now();
    
    try {
        // Resolve target
        const addresses = await dns.resolve4(target);
        
        for (const ip of addresses) {
            const hostResult = {
                hostname: target,
                ip,
                alive: false,
                ports: [],
                services: {}
            };
            
            // Check if host is alive
            const isAlive = await checkHostAlive(ip);
            
            if (isAlive) {
                hostResult.alive = true;
                result.stats.aliveHosts++;
                
                // Scan common ports
                const ports = getPortsToScan(config.ports);
                hostResult.ports = await scanPortsJS(ip, ports);
                result.stats.openPorts += hostResult.ports.length;
            }
            
            result.hosts.push(hostResult);
            result.stats.totalHosts++;
        }
        
    } catch (error) {
        console.error('Fallback scan error:', error);
    }
    
    result.stats.scanDuration = Math.floor((Date.now() - startTime) / 1000);
    
    return result;
}

/**
 * Check if host is alive
 */
async function checkHostAlive(ip) {
    const net = await import('net');
    const testPorts = [80, 443, 22];
    
    for (const port of testPorts) {
        try {
            await new Promise((resolve, reject) => {
                const socket = new net.Socket();
                socket.setTimeout(2000);
                
                socket.connect(port, ip, () => {
                    socket.destroy();
                    resolve(true);
                });
                
                socket.on('error', reject);
                socket.on('timeout', reject);
            });
            
            return true;
        } catch (err) {
            // Continue to next port
        }
    }
    
    return false;
}

/**
 * Scan ports using JavaScript
 */
async function scanPortsJS(ip, ports) {
    const net = await import('net');
    const openPorts = [];
    
    // Limit concurrency
    const concurrency = 50;
    const chunks = [];
    
    for (let i = 0; i < ports.length; i += concurrency) {
        chunks.push(ports.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
        const results = await Promise.allSettled(
            chunk.map(port => scanSinglePort(ip, port))
        );
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                openPorts.push(result.value);
            }
        });
    }
    
    return openPorts;
}

/**
 * Scan single port
 */
function scanSinglePort(ip, port) {
    return new Promise((resolve, reject) => {
        const net = require('net');
        const socket = new net.Socket();
        
        socket.setTimeout(3000);
        
        socket.connect(port, ip, () => {
            const result = {
                port,
                state: 'open',
                service: getServiceName(port)
            };
            
            socket.destroy();
            resolve(result);
        });
        
        socket.on('error', () => {
            socket.destroy();
            resolve(null);
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve(null);
        });
    });
}

/**
 * Get ports to scan based on config
 */
function getPortsToScan(portsConfig) {
    if (portsConfig === 'top1000') {
        return getTop1000Ports();
    }
    
    if (portsConfig === 'common') {
        return [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 5900, 6379, 8080, 8443];
    }
    
    if (Array.isArray(portsConfig)) {
        return portsConfig;
    }
    
    // Default: common ports
    return [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 5900, 6379, 8080, 8443];
}

/**
 * Get service name for port
 */
function getServiceName(port) {
    const services = {
        21: 'ftp',
        22: 'ssh',
        23: 'telnet',
        25: 'smtp',
        53: 'dns',
        80: 'http',
        110: 'pop3',
        143: 'imap',
        443: 'https',
        445: 'smb',
        3306: 'mysql',
        3389: 'rdp',
        5432: 'postgresql',
        5900: 'vnc',
        6379: 'redis',
        8080: 'http-alt',
        8443: 'https-alt',
        27017: 'mongodb'
    };
    
    return services[port] || 'unknown';
}

/**
 * Top 1000 ports (simplified list)
 */
function getTop1000Ports() {
    // Return top 100 for performance
    return [
        21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995,
        1723, 3306, 3389, 5900, 8080, 8443, 8888, 5432, 6379, 27017, 9200, 9300,
        1433, 1521, 5000, 5001, 5002, 7000, 7001, 8000, 8001, 8008, 8081, 8082,
        8888, 9000, 9001, 9090, 9091, 9999, 10000, 11211, 15672, 27018, 50000
    ];
}
