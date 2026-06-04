import { startOASTServer } from './oastServer.js';

console.log('Starting SECORA OAST Server in Standalone Mode...');

const port = parseInt(process.env.OAST_HTTP_PORT || '80', 10);
const dnsPort = parseInt(process.env.OAST_DNS_PORT || '53', 10);
const domain = process.env.OAST_DOMAIN || 'callback.secora.io';
const mode = process.env.OAST_MODE || 'production';

startOASTServer({ mode, httpPort: port, dnsPort, domain })
    .then(() => {
        console.log(`✅ OAST Standalone Server running in ${mode} mode`);
        console.log(`✅ Domain: ${domain}`);
        console.log(`✅ HTTP Port: ${port}`);
        console.log(`✅ DNS Port: ${dnsPort}`);
    })
    .catch(err => {
        console.error('❌ Failed to start OAST Server:', err);
        process.exit(1);
    });

// Keep process alive
process.on('SIGINT', () => {
    console.log('Shutting down OAST Server...');
    process.exit(0);
});
