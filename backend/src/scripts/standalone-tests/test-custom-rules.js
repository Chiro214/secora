import { evaluateCustomTemplates } from './src/engines/customRulesEngine.js';

async function main() {
    console.log('🧪 Testing Custom Rules Engine...');
    
    // Test endpoint that should trigger one of the starter templates
    // Specifically, let's trigger the "Spring Boot Actuator Env Exposure" rule
    // Or we could mock an endpoint using httpbin or a local test server
    // For this test, we'll hit an endpoint that we know what it will return
    
    // Actually, we can test against DVWA for something basic, 
    // or just a mock response. Since evaluateCustomTemplates actually makes HTTP requests,
    // let's run it against http://example.com and maybe one of the rules hits? No.
    
    // Let's create a local test server using express right here.
    import('express').then(async ({ default: express }) => {
        const app = express();
        
        app.get('/actuator/env', (req, res) => {
            res.json({ activeProfiles: ['dev'], propertySources: [] });
        });
        
        const server = app.listen(9998, async () => {
            console.log('Test server running on port 9998');
            
            const endpoint = {
                url: 'http://localhost:9998',
                method: 'GET'
            };
            
            console.log(`Running evaluateCustomTemplates against ${endpoint.url}...`);
            const findings = await evaluateCustomTemplates(endpoint);
            
            console.log('✅ Found ' + findings.length + ' findings:');
            findings.forEach(f => {
                console.log('- [' + f.severity + '] ' + f.name + ' via ' + f.payload);
            });
            
            if (findings.length > 0) {
                console.log('SUCCESS: Custom rules engine produced a finding!');
                process.exit(0);
            } else {
                console.log('FAILED: No findings produced.');
                process.exit(1);
            }
        });
    });
}

main().catch(console.error);
