import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { generateScanReportPDF } from '../utils/pdfGenerator.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all reports for a user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const reports = await prisma.report.findMany({
            where: {
                scan: {
                    target: {
                        userId
                    }
                }
            },
            include: {
                scan: {
                    include: {
                        target: true,
                        findings: {
                            select: {
                                severity: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Transform data for frontend
        const transformedReports = reports.map(report => {
            const findings = report.scan.findings;
            return {
                id: report.id,
                scanId: report.scanId,
                targetName: report.scan.target.name,
                targetUrl: report.scan.target.value,
                createdAt: report.createdAt,
                format: report.format,
                status: report.status,
                findingsCount: findings.length,
                criticalCount: findings.filter(f => f.severity === 'CRITICAL').length,
                highCount: findings.filter(f => f.severity === 'HIGH').length,
                mediumCount: findings.filter(f => f.severity === 'MEDIUM').length,
                lowCount: findings.filter(f => f.severity === 'LOW').length
            };
        });

        res.json(transformedReports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Generate a new report
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { scanId, format = 'PDF' } = req.body;
        const userId = req.user.id;

        // Verify scan belongs to user
        const scan = await prisma.scan.findFirst({
            where: {
                id: scanId,
                target: {
                    userId
                }
            }
        });

        if (!scan) {
            return res.status(404).json({ error: 'Scan not found' });
        }

        // Check if report already exists
        let report = await prisma.report.findFirst({
            where: {
                scanId,
                format
            }
        });

        if (!report) {
            // Create new report
            report = await prisma.report.create({
                data: {
                    scanId,
                    format,
                    status: 'GENERATING',
                    content: {}
                }
            });

            // TODO: Queue report generation job
            // await reportQueue.add('generate-report', { reportId: report.id });
        }

        res.json(report);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Download report
router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const report = await prisma.report.findFirst({
            where: {
                id,
                scan: {
                    target: {
                        userId
                    }
                }
            },
            include: {
                scan: {
                    include: {
                        target: true,
                        findings: {
                            include: {
                                evidence: true,
                                endpoint: true
                            }
                        }
                    }
                }
            }
        });

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (report.status !== 'READY') {
            return res.status(400).json({ error: 'Report is not ready yet' });
        }

        // Generate report content based on format
        if (report.format === 'JSON') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="secora-report-${id}.json"`);
            res.json(generateJSONReport(report));
        } else if (report.format === 'HTML') {
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="secora-report-${id}.html"`);
            res.send(generateHTMLReport(report));
        } else if (report.format === 'PDF') {
            try {
                const pdfBuffer = await generateScanReportPDF(report);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="secora-report-${id}.pdf"`);
                res.send(pdfBuffer);
            } catch (error) {
                console.error('PDF generation error:', error);
                res.status(500).json({ 
                    error: 'PDF generation failed', 
                    message: error.message,
                    hint: 'Install Puppeteer with: npm install puppeteer'
                });
            }
        } else {
            res.status(400).json({ error: 'Invalid report format' });
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        res.status(500).json({ error: 'Failed to download report' });
    }
});

// Helper function to generate JSON report
function generateJSONReport(report) {
    const scan = report.scan;
    const findings = scan.findings;

    return {
        metadata: {
            reportId: report.id,
            scanId: scan.id,
            generatedAt: report.createdAt,
            target: {
                name: scan.target.name,
                type: scan.target.type,
                value: scan.target.value
            },
            scanProfile: scan.profile,
            scanDuration: scan.completedAt ? 
                new Date(scan.completedAt) - new Date(scan.startedAt) : null
        },
        summary: {
            totalFindings: findings.length,
            bySeverity: {
                critical: findings.filter(f => f.severity === 'CRITICAL').length,
                high: findings.filter(f => f.severity === 'HIGH').length,
                medium: findings.filter(f => f.severity === 'MEDIUM').length,
                low: findings.filter(f => f.severity === 'LOW').length,
                info: findings.filter(f => f.severity === 'INFO').length
            },
            byCategory: findings.reduce((acc, f) => {
                acc[f.category] = (acc[f.category] || 0) + 1;
                return acc;
            }, {})
        },
        findings: findings.map(f => ({
            id: f.id,
            title: f.title,
            description: f.description,
            category: f.category,
            severity: f.severity,
            cvss: f.cvss,
            owasp: f.owasp,
            cwe: f.cwe,
            confidence: f.confidence,
            status: f.status,
            endpoint: f.endpoint ? {
                url: f.endpoint.url,
                method: f.endpoint.method
            } : null,
            evidence: f.evidence.map(e => ({
                type: e.type,
                title: e.title,
                content: e.content
            })),
            remediation: f.remediation,
            references: f.references
        }))
    };
}

// Helper function to generate HTML report
function generateHTMLReport(report) {
    const jsonReport = generateJSONReport(report);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SECORA Security Report - ${jsonReport.metadata.target.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 40px; border-radius: 12px; margin-bottom: 40px; }
        .header h1 { font-size: 36px; margin-bottom: 10px; }
        .header p { font-size: 18px; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .summary-card h3 { font-size: 14px; color: #666; margin-bottom: 8px; text-transform: uppercase; }
        .summary-card .value { font-size: 32px; font-weight: bold; }
        .critical { color: #dc2626; }
        .high { color: #ea580c; }
        .medium { color: #ca8a04; }
        .low { color: #2563eb; }
        .finding { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #ddd; }
        .finding.critical { border-left-color: #dc2626; }
        .finding.high { border-left-color: #ea580c; }
        .finding.medium { border-left-color: #ca8a04; }
        .finding.low { border-left-color: #2563eb; }
        .finding-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; }
        .finding-title { font-size: 20px; font-weight: bold; }
        .severity-badge { padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .severity-badge.critical { background: #fee2e2; color: #dc2626; }
        .severity-badge.high { background: #ffedd5; color: #ea580c; }
        .severity-badge.medium { background: #fef3c7; color: #ca8a04; }
        .severity-badge.low { background: #dbeafe; color: #2563eb; }
        .finding-meta { display: flex; gap: 16px; margin-bottom: 16px; font-size: 14px; color: #666; }
        .finding-description { margin-bottom: 16px; }
        .evidence { background: #f9fafb; padding: 16px; border-radius: 4px; margin-top: 16px; }
        .evidence-title { font-weight: bold; margin-bottom: 8px; }
        .evidence-content { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
        .remediation { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-top: 16px; }
        .footer { text-align: center; padding: 40px 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ SECORA Security Report</h1>
            <p>${jsonReport.metadata.target.name} - ${jsonReport.metadata.target.value}</p>
            <p style="margin-top: 20px; font-size: 14px;">Generated: ${new Date(jsonReport.metadata.generatedAt).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Findings</h3>
                <div class="value">${jsonReport.summary.totalFindings}</div>
            </div>
            <div class="summary-card">
                <h3>Critical</h3>
                <div class="value critical">${jsonReport.summary.bySeverity.critical}</div>
            </div>
            <div class="summary-card">
                <h3>High</h3>
                <div class="value high">${jsonReport.summary.bySeverity.high}</div>
            </div>
            <div class="summary-card">
                <h3>Medium</h3>
                <div class="value medium">${jsonReport.summary.bySeverity.medium}</div>
            </div>
            <div class="summary-card">
                <h3>Low</h3>
                <div class="value low">${jsonReport.summary.bySeverity.low}</div>
            </div>
        </div>

        <h2 style="margin-bottom: 24px; font-size: 28px;">Findings</h2>
        ${jsonReport.findings.map(finding => `
            <div class="finding ${finding.severity.toLowerCase()}">
                <div class="finding-header">
                    <div class="finding-title">${finding.title}</div>
                    <span class="severity-badge ${finding.severity.toLowerCase()}">${finding.severity}</span>
                </div>
                <div class="finding-meta">
                    <span><strong>Category:</strong> ${finding.category}</span>
                    <span><strong>CVSS:</strong> ${finding.cvss}</span>
                    ${finding.owasp ? `<span><strong>OWASP:</strong> ${finding.owasp}</span>` : ''}
                    ${finding.cwe ? `<span><strong>CWE:</strong> ${finding.cwe}</span>` : ''}
                </div>
                <div class="finding-description">${finding.description}</div>
                ${finding.endpoint ? `
                    <div style="margin-bottom: 16px;">
                        <strong>Endpoint:</strong> <code>${finding.endpoint.method} ${finding.endpoint.url}</code>
                    </div>
                ` : ''}
                ${finding.evidence.length > 0 ? `
                    <div class="evidence">
                        <div class="evidence-title">Evidence</div>
                        ${finding.evidence.map(ev => `
                            <div style="margin-top: 12px;">
                                <strong>${ev.title}</strong>
                                <pre class="evidence-content">${ev.content}</pre>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${finding.remediation ? `
                    <div class="remediation">
                        <strong>Remediation:</strong><br>
                        ${finding.remediation}
                    </div>
                ` : ''}
            </div>
        `).join('')}

        <div class="footer">
            <p>Generated by SECORA VAPT Platform</p>
            <p style="margin-top: 8px; font-size: 14px;">This report is confidential and intended for authorized personnel only.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

export default router;
