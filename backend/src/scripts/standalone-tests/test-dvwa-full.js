import { executeScanPipeline } from './src/engines/scanPipeline.js';
import prisma from './src/config/prisma.js';

async function main() {
    console.log("🚀 Starting Full Pipeline Integration Test on DVWA...");
    try {
        const user = await prisma.user.upsert({
            where: { email: "test@secora.io" },
            update: {},
            create: { email: "test@secora.io", passwordHash: "dummy" }
        });

        const target = await prisma.target.upsert({
            where: { id: "test-target-dvwa" },
            update: {},
            create: {
                id: "test-target-dvwa",
                name: "DVWA Test",
                type: "URL",
                value: "http://localhost:8080",
                userId: user.id
            }
        });

        const scanId = "dvwa-integration-test-" + Date.now();
        const scan = await prisma.scan.create({
            data: {
                id: scanId,
                targetId: target.id,
                userId: user.id,
                profile: "FULL_VAPT",
                status: "RUNNING"
            }
        });

        const results = await executeScanPipeline({
            scanId: scan.id,
            target: { id: target.id, type: target.type, value: target.value },
            profile: "FULL_VAPT",
            config: {
                auth: null,
                maxDepth: 2,
                maxUrls: 20,
                aggressive: false // For safety during test
            },
            onProgress: async (progress, message) => {
                console.log(`[${progress}%] ${message}`);
            }
        });
        
        console.log("\n✅ Pipeline completed successfully!");
        console.log(`📊 Stats: Found ${results.stats.findingsCount} findings (${results.stats.criticalCount} Critical, ${results.stats.highCount} High)`);
        console.log(`🌐 Assets: ${results.stats.assetsFound}, Endpoints: ${results.stats.endpointsFound}`);
        if(results.executiveSummary) {
            console.log(`📑 Executive Summary Risk: ${results.executiveSummary.overallRisk.rating}`);
        }
        
    } catch (e) {
        console.error("❌ Pipeline failed:", e);
    }
    process.exit(0);
}
main();
