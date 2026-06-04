import { discoverSubdomains } from './src/engines/attackSurface.js';
import { runScanDiff } from './src/engines/scanDiffer.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Testing Priority 2: Attack Surface Management');
    
    // 1. Test crt.sh Subdomain Discovery
    console.log('\n--- Testing crt.sh Subdomain Discovery ---');
    const domain = 'tesla.com'; // Using a known domain for testing
    console.log(`Querying subdomains for ${domain}...`);
    const subdomains = await discoverSubdomains(domain);
    console.log(`✅ Discovered ${subdomains.length} subdomains. Showing first 5:`);
    console.log(subdomains.slice(0, 5));

    // 2. Test Scan Diffing
    console.log('\n--- Testing Scan Diffing Engine ---');
    
    // Setup Mock Data
    const mockUser = await prisma.user.create({
        data: { email: `test-asm-${Date.now()}@test.com`, passwordHash: 'hash' }
    });
    
    const mockTarget = await prisma.target.create({
        data: { name: 'ASM Test Target', type: 'DOMAIN', value: 'asm-test.com', userId: mockUser.id }
    });

    // Create Previous Scan (Baseline)
    const prevScan = await prisma.scan.create({
        data: {
            targetId: mockTarget.id,
            userId: mockUser.id,
            profile: 'FULL_VAPT',
            status: 'COMPLETED',
            createdAt: new Date(Date.now() - 86400000) // 1 day ago
        }
    });

    // Add a finding to the baseline
    await prisma.finding.create({
        data: {
            scanId: prevScan.id,
            title: 'SQL Injection',
            category: 'INJECTION',
            severity: 'CRITICAL',
            detectedBy: 'mock',
            description: 'Mock finding',
            remediation: 'Fix it',
            status: 'FIXED' // Was fixed previously
        }
    });

    // Create Current Scan
    const currScan = await prisma.scan.create({
        data: {
            targetId: mockTarget.id,
            userId: mockUser.id,
            profile: 'FULL_VAPT',
            status: 'COMPLETED'
        }
    });

    // Add findings to current scan
    // 1. Reopened vulnerability
    await prisma.finding.create({
        data: {
            scanId: currScan.id,
            title: 'SQL Injection',
            category: 'INJECTION',
            severity: 'CRITICAL',
            detectedBy: 'mock',
            description: 'Mock finding',
            remediation: 'Fix it',
            status: 'OPEN' // Reintroduced
        }
    });

    // 2. Completely new vulnerability
    await prisma.finding.create({
        data: {
            scanId: currScan.id,
            title: 'Open Redirect',
            category: 'OPEN_REDIRECT',
            severity: 'HIGH',
            detectedBy: 'mock',
            description: 'Mock finding',
            remediation: 'Fix it',
            status: 'OPEN'
        }
    });

    console.log(`Running scan diff for current scan ${currScan.id} against baseline ${prevScan.id}...`);
    
    // Run the differ
    await runScanDiff(currScan.id);

    // Verify Results
    const updatedFindings = await prisma.finding.findMany({ where: { scanId: currScan.id } });
    
    console.log('\n✅ Diff Results:');
    for (const f of updatedFindings) {
        console.log(`- [${f.severity}] ${f.title} -> Status marked as: ${f.status}`);
    }

    // Cleanup
    await prisma.target.delete({ where: { id: mockTarget.id } });
    await prisma.user.delete({ where: { id: mockUser.id } });

    console.log('\n✅ ASM Tests completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
