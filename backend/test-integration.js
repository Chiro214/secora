// backend/test-integration.js
// Integration test to verify all systems are connected

import { PrismaClient } from '@prisma/client';
import redis from './src/config/redis.js';

const prisma = new PrismaClient();

async function testIntegration() {
    console.log('\n🧪 SECORA Integration Test\n');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    // Test 1: Database Connection
    try {
        await prisma.$connect();
        await prisma.user.count();
        console.log('✅ Database: Connected');
        passed++;
    } catch (error) {
        console.error('❌ Database: Failed -', error.message);
        failed++;
    }

    // Test 2: Redis Connection
    try {
        await redis.ping();
        console.log('✅ Redis: Connected');
        passed++;
    } catch (error) {
        console.error('❌ Redis: Failed -', error.message);
        failed++;
    }

    // Test 3: Database Schema
    try {
        const tables = ['users', 'targets', 'scans', 'findings', 'scheduled_scans', 'cves'];
        for (const table of tables) {
            const count = await prisma[table.slice(0, -1)].count();
            console.log(`✅ Table '${table}': Exists (${count} records)`);
        }
        passed++;
    } catch (error) {
        console.error('❌ Database Schema: Failed -', error.message);
        failed++;
    }

    // Test 4: WebSocket Module
    try {
        const { initializeWebSocket } = await import('./src/websocket/scanEvents.js');
        console.log('✅ WebSocket Module: Loaded');
        passed++;
    } catch (error) {
        console.error('❌ WebSocket Module: Failed -', error.message);
        failed++;
    }

    // Test 5: PDF Generator
    try {
        const { generatePDF } = await import('./src/utils/pdfGenerator.js');
        console.log('✅ PDF Generator: Loaded');
        passed++;
    } catch (error) {
        console.error('❌ PDF Generator: Failed -', error.message);
        failed++;
    }

    // Test 6: CVE Importer
    try {
        const { importCVEFeed } = await import('./src/jobs/cveFeedImporter.js');
        console.log('✅ CVE Importer: Loaded');
        passed++;
    } catch (error) {
        console.error('❌ CVE Importer: Failed -', error.message);
        failed++;
    }

    // Test 7: Scheduled Scans
    try {
        const { createScheduledScan } = await import('./src/jobs/scheduledScans.js');
        console.log('✅ Scheduled Scans: Loaded');
        passed++;
    } catch (error) {
        console.error('❌ Scheduled Scans: Failed -', error.message);
        failed++;
    }

    // Test 8: Scan Pipeline
    try {
        const { executeScanPipeline } = await import('./src/engines/scanPipeline.js');
        console.log('✅ Scan Pipeline: Loaded');
        passed++;
    } catch (error) {
        console.error('❌ Scan Pipeline: Failed -', error.message);
        failed++;
    }

    // Test 9: Vulnerability Tests
    try {
        const tests = [
            'sqlTest',
            'xssTest',
            'authBypass',
            'openRedirect',
            'tlsConfig',
            'securityHeaders',
            'infoDisclosure'
        ];
        for (const test of tests) {
            await import(`./src/tests/${test}.js`);
        }
        console.log(`✅ Vulnerability Tests: All ${tests.length} modules loaded`);
        passed++;
    } catch (error) {
        console.error('❌ Vulnerability Tests: Failed -', error.message);
        failed++;
    }

    // Test 10: Routes
    try {
        const routes = [
            'auth',
            'targets',
            'scans',
            'reports',
            'scheduledScans'
        ];
        for (const route of routes) {
            await import(`./src/routes/${route}.js`);
        }
        console.log(`✅ API Routes: All ${routes.length} routes loaded`);
        passed++;
    } catch (error) {
        console.error('❌ API Routes: Failed -', error.message);
        failed++;
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

    if (failed === 0) {
        console.log('🎉 All integration tests passed!\n');
        console.log('✅ SECORA is ready to run');
        console.log('   Start with: npm run dev\n');
    } else {
        console.log('⚠️  Some tests failed. Please fix the issues above.\n');
    }

    await prisma.$disconnect();
    await redis.quit();
    process.exit(failed > 0 ? 1 : 0);
}

testIntegration().catch(console.error);
