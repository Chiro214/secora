// backend/src/utils/pdfGenerator.js
/**
 * PDF Report Generator
 * 
 * This module provides PDF generation for scan reports.
 * For production use, install Puppeteer: npm install puppeteer
 * 
 * Current implementation provides a placeholder that can be
 * easily upgraded to full PDF generation.
 */

import { computeAllCVSS } from '../reporting/cvssCalculator.js';
import { mapToCompliance, generateComplianceSummary } from '../reporting/complianceMapper.js';
import { generateExecutiveSummary } from '../reporting/executiveSummary.js';
import { generateAllBusinessImpacts } from '../reporting/businessImpact.js';
import { generateRemediation } from '../reporting/remediationEngine.js';

/**
 * Generate PDF from HTML content
 * @param {string} htmlContent - HTML content to convert
 * @param {Object} options - PDF generation options
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generatePDF(htmlContent, options = {}) {
    // Check if Puppeteer is available
    let puppeteer;
    try {
        puppeteer = await import('puppeteer');
    } catch (error) {
        console.warn('⚠️  Puppeteer not installed. PDF generation unavailable.');
        console.warn('   Install with: npm install puppeteer');
        throw new Error('PDF generation requires Puppeteer. Please install: npm install puppeteer');
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Set content
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: options.format || 'A4',
            printBackground: true,
            margin: {
                top: options.marginTop || '20mm',
                right: options.marginRight || '15mm',
                bottom: options.marginBottom || '20mm',
                left: options.marginLeft || '15mm'
            },
            displayHeaderFooter: options.displayHeaderFooter || true,
            headerTemplate: options.headerTemplate || `
                <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
                    <span>SECORA Security Report - Confidential</span>
                </div>
            `,
            footerTemplate: options.footerTemplate || `
                <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
                    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                </div>
            `
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

/**
 * Generate PDF report from scan data
 * @param {Object} report - Report object with scan data
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateScanReportPDF(report) {
    const htmlContent = generateReportHTML(report);
    
    return await generatePDF(htmlContent, {
        format: 'A4',
        displayHeaderFooter: true,
        marginTop: '25mm',
        marginBottom: '25mm'
    });
}

/**
 * Generate enhanced HTML for PDF conversion
 * @param {Object} report - Report data
 * @returns {string} HTML content
 */
function generateReportHTML(report) {
    const scan = report.scan;
    const findings = scan.findings || [];

    // Phase 6: Enrich findings with CVSS vectors, business impact, compliance
    const enrichedFindings = computeAllCVSS(findings);
    const impactedFindings = generateAllBusinessImpacts(enrichedFindings);
    const execSummary = generateExecutiveSummary({
        target: scan.target,
        findings: impactedFindings,
        stats: { total: impactedFindings.length },
        technologies: scan.technologies || []
    });
    const complianceSummary = generateComplianceSummary(impactedFindings);
    
    const summary = {
        totalFindings: impactedFindings.length,
        bySeverity: {
            critical: impactedFindings.filter(f => f.severity === 'CRITICAL').length,
            high: impactedFindings.filter(f => f.severity === 'HIGH').length,
            medium: impactedFindings.filter(f => f.severity === 'MEDIUM').length,
            low: impactedFindings.filter(f => f.severity === 'LOW').length,
            info: impactedFindings.filter(f => f.severity === 'INFO').length
        }
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SECORA Security Report - ${scan.target.name}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        .page {
            page-break-after: always;
            padding: 40px;
        }
        .cover-page {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }
        .cover-page h1 {
            font-size: 48px;
            margin-bottom: 20px;
            font-weight: 700;
        }
        .cover-page .subtitle {
            font-size: 24px;
            margin-bottom: 40px;
            opacity: 0.9;
        }
        .cover-page .target-info {
            font-size: 18px;
            margin-top: 60px;
            padding: 30px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .cover-page .date {
            margin-top: 40px;
            font-size: 14px;
            opacity: 0.8;
        }
        h1 {
            color: #667eea;
            font-size: 32px;
            margin-bottom: 20px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        h2 {
            color: #764ba2;
            font-size: 24px;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h3 {
            color: #555;
            font-size: 18px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
        }
        .summary-card {
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .summary-card.critical {
            background: #fee2e2;
            border-left: 4px solid #dc2626;
        }
        .summary-card.high {
            background: #ffedd5;
            border-left: 4px solid #ea580c;
        }
        .summary-card.medium {
            background: #fef3c7;
            border-left: 4px solid #ca8a04;
        }
        .summary-card.low {
            background: #dbeafe;
            border-left: 4px solid #2563eb;
        }
        .summary-card.total {
            background: #f3f4f6;
            border-left: 4px solid #6b7280;
        }
        .summary-card .label {
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 8px;
        }
        .summary-card .value {
            font-size: 36px;
            font-weight: bold;
        }
        .finding {
            margin: 30px 0;
            padding: 25px;
            border-radius: 8px;
            background: #f9fafb;
            border-left: 4px solid #ddd;
            page-break-inside: avoid;
        }
        .finding.critical {
            border-left-color: #dc2626;
            background: #fef2f2;
        }
        .finding.high {
            border-left-color: #ea580c;
            background: #fff7ed;
        }
        .finding.medium {
            border-left-color: #ca8a04;
            background: #fffbeb;
        }
        .finding.low {
            border-left-color: #2563eb;
            background: #eff6ff;
        }
        .finding-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }
        .finding-title {
            font-size: 20px;
            font-weight: bold;
            color: #111;
        }
        .severity-badge {
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .severity-badge.critical {
            background: #dc2626;
            color: white;
        }
        .severity-badge.high {
            background: #ea580c;
            color: white;
        }
        .severity-badge.medium {
            background: #ca8a04;
            color: white;
        }
        .severity-badge.low {
            background: #2563eb;
            color: white;
        }
        .finding-meta {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 13px;
            color: #666;
        }
        .finding-description {
            margin-bottom: 15px;
            line-height: 1.8;
        }
        .evidence {
            background: white;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
            border: 1px solid #e5e7eb;
        }
        .evidence-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #374151;
        }
        .evidence-content {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            white-space: pre-wrap;
            word-break: break-all;
            background: #f9fafb;
            padding: 10px;
            border-radius: 4px;
        }
        .remediation {
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
            padding: 15px;
            margin-top: 15px;
            border-radius: 4px;
        }
        .remediation-title {
            font-weight: bold;
            color: #166534;
            margin-bottom: 8px;
        }
        .footer-section {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .confidential {
            background: #fef2f2;
            border: 2px solid #dc2626;
            padding: 15px;
            margin: 30px 0;
            border-radius: 8px;
            text-align: center;
            color: #991b1b;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f3f4f6;
            font-weight: bold;
            color: #374151;
        }
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="page cover-page">
        <h1>🛡️ SECORA</h1>
        <div class="subtitle">Security Assessment Report</div>
        <div class="target-info">
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 10px;">TARGET</div>
            <div style="font-size: 28px; font-weight: bold;">${scan.target.name}</div>
            <div style="font-size: 16px; margin-top: 10px;">${scan.target.value}</div>
        </div>
        <div class="date">
            Generated: ${new Date(report.createdAt).toLocaleString()}<br>
            Scan Profile: ${scan.profile}
        </div>
    </div>

    <!-- Executive Summary -->
    <div class="page">
        <div class="confidential">
            ⚠️ CONFIDENTIAL - This report contains sensitive security information
        </div>

        <h1>Executive Summary</h1>
        
        <div style="background: ${execSummary.overallRisk.color}15; border: 2px solid ${execSummary.overallRisk.color}; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center;">
            <div style="font-size: 14px; color: #666; margin-bottom: 8px;">OVERALL RISK RATING</div>
            <div style="font-size: 36px; font-weight: bold; color: ${execSummary.overallRisk.color};">${execSummary.overallRisk.rating}</div>
            <div style="font-size: 14px; color: #555; margin-top: 10px;">${execSummary.overallRisk.justification}</div>
        </div>

        <h2>Findings Overview</h2>
        <div class="summary-grid">
            <div class="summary-card total">
                <div class="label">Total Findings</div>
                <div class="value">${summary.totalFindings}</div>
            </div>
            <div class="summary-card critical">
                <div class="label">Critical</div>
                <div class="value">${summary.bySeverity.critical}</div>
            </div>
            <div class="summary-card high">
                <div class="label">High</div>
                <div class="value">${summary.bySeverity.high}</div>
            </div>
            <div class="summary-card medium">
                <div class="label">Medium</div>
                <div class="value">${summary.bySeverity.medium}</div>
            </div>
            <div class="summary-card low">
                <div class="label">Low</div>
                <div class="value">${summary.bySeverity.low}</div>
            </div>
        </div>

        ${execSummary.actionPriority.length > 0 ? `
        <h2>Action Priority</h2>
        <table>
            <tr><th>Priority</th><th>Timeline</th><th>Action</th></tr>
            ${execSummary.actionPriority.map(a => `
                <tr><td style="font-weight:bold; color: ${a.priority === 1 ? '#dc2626' : a.priority === 2 ? '#ea580c' : '#ca8a04'};">#${a.priority}</td><td>${a.timeline}</td><td>${a.action}</td></tr>
            `).join('')}
        </table>
        ` : ''}

        <h2>Scan Details</h2>
        <table>
            <tr><th>Parameter</th><th>Value</th></tr>
            <tr><td>Target</td><td>${scan.target.name} (${scan.target.value})</td></tr>
            <tr><td>Scan Profile</td><td>${scan.profile}</td></tr>
            <tr><td>Started</td><td>${new Date(scan.startedAt).toLocaleString()}</td></tr>
            <tr><td>Completed</td><td>${scan.completedAt ? new Date(scan.completedAt).toLocaleString() : 'N/A'}</td></tr>
            <tr><td>Report Generated</td><td>${new Date(report.createdAt).toLocaleString()}</td></tr>
        </table>
    </div>

    <!-- Compliance Summary -->
    <div class="page">
        <h1>Compliance Mapping</h1>
        <p style="margin: 15px 0; color: #555;">Findings mapped to industry compliance frameworks:</p>
        ${Object.entries(complianceSummary).map(([framework, data]) => {
            if (!data.controls || Object.keys(data.controls).length === 0) return '';
            return `
            <h2>${framework.replace(/-/g, ' ').toUpperCase()}</h2>
            <table>
                <tr><th>Control</th><th>Description</th><th>Findings</th><th>Max Severity</th></tr>
                ${Object.entries(data.controls).map(([id, ctrl]) => {
                    const maxSev = ctrl.severities.includes('CRITICAL') ? 'CRITICAL' : ctrl.severities.includes('HIGH') ? 'HIGH' : ctrl.severities.includes('MEDIUM') ? 'MEDIUM' : 'LOW';
                    return `<tr><td><strong>${id}</strong></td><td>${ctrl.desc}</td><td>${ctrl.findings}</td><td><span class="severity-badge ${maxSev.toLowerCase()}">${maxSev}</span></td></tr>`;
                }).join('')}
            </table>`;
        }).join('')}
    </div>

    <!-- Findings Details -->
    ${impactedFindings.length > 0 ? `
    <div class="page">
        <h1>Detailed Findings</h1>
        ${impactedFindings.map((finding, index) => `
            <div class="finding ${finding.severity.toLowerCase()}">
                <div class="finding-header">
                    <div class="finding-title">${index + 1}. ${finding.title}</div>
                    <span class="severity-badge ${finding.severity.toLowerCase()}">${finding.severity}</span>
                </div>
                <div class="finding-meta">
                    <span><strong>Category:</strong> ${finding.category}</span>
                    <span><strong>CVSS:</strong> ${finding.cvss}</span>
                    ${finding.owasp ? `<span><strong>OWASP:</strong> ${finding.owasp}</span>` : ''}
                    ${finding.cwe ? `<span><strong>CWE:</strong> ${finding.cwe}</span>` : ''}
                    ${finding.confidence ? `<span><strong>Confidence:</strong> ${finding.confidence}%</span>` : ''}
                </div>
                ${finding.cvssVector ? `<div style="margin: 8px 0; font-size: 12px; font-family: monospace; color: #666; background: #f3f4f6; padding: 6px 10px; border-radius: 4px;">📊 ${finding.cvssVector}</div>` : ''}
                <div class="finding-description">
                    <strong>Description:</strong><br>
                    ${finding.description}
                </div>
                ${finding.businessImpact ? `<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px;"><strong style="color: #92400e;">💼 Business Impact:</strong><br>${finding.businessImpact}</div>` : ''}
                ${finding.endpoint ? `
                    <div style="margin: 15px 0;">
                        <strong>Affected Endpoint:</strong><br>
                        <code style="background: white; padding: 8px; display: inline-block; border-radius: 4px; margin-top: 5px;">
                            ${finding.endpoint.method} ${finding.endpoint.url}
                        </code>
                    </div>
                ` : ''}
                ${finding.evidence && finding.evidence.length > 0 ? `
                    <div class="evidence">
                        <div class="evidence-title">Evidence</div>
                        ${finding.evidence.slice(0, 5).map(ev => `
                            <div style="margin-top: 10px; page-break-inside: avoid;">
                                <strong style="font-size: 12px;">${ev.title}</strong>
                                ${ev.type === 'SCREENSHOT' || ev.title.includes('Visual Proof') || ev.title.includes('Screenshot')
                                    ? `<div style="margin-top: 8px; border: 2px solid rgba(88,166,255,0.4); border-radius: 8px; overflow: hidden; background: #0d1117;"><img src="data:image/png;base64,${ev.content}" style="width: 100%; display: block;" /></div>`
                                    : `<pre class="evidence-content">${ev.content.substring(0, 500)}${ev.content.length > 500 ? '...' : ''}</pre>`
                                }
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${finding.remediation ? `
                    <div class="remediation">
                        <div class="remediation-title">✓ Recommended Fix</div>
                        ${finding.remediation}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
    ` : `
    <div class="page">
        <h1>Detailed Findings</h1>
        <div style="text-align: center; padding: 60px 0; color: #22c55e;">
            <div style="font-size: 48px; margin-bottom: 20px;">✓</div>
            <h2 style="color: #22c55e;">No Vulnerabilities Found</h2>
            <p style="color: #666; margin-top: 15px;">
                The security assessment did not identify any vulnerabilities in the scanned target.
            </p>
        </div>
    </div>
    `}

    <!-- Footer Page -->
    <div class="page">
        <h1>Disclaimer & Recommendations</h1>
        
        <h2>Scope & Limitations</h2>
        <p style="margin: 15px 0;">
            This security assessment was conducted using automated scanning techniques and may not 
            identify all potential security vulnerabilities. Manual testing and code review are 
            recommended for comprehensive security assurance.
        </p>

        <h2>Immediate Actions Required</h2>
        <ul style="margin: 15px 0; padding-left: 25px;">
            ${summary.bySeverity.critical > 0 ? `
                <li style="margin: 10px 0; color: #dc2626;">
                    <strong>CRITICAL:</strong> Address ${summary.bySeverity.critical} critical vulnerabilities within 24-48 hours
                </li>
            ` : ''}
            ${summary.bySeverity.high > 0 ? `
                <li style="margin: 10px 0; color: #ea580c;">
                    <strong>HIGH:</strong> Remediate ${summary.bySeverity.high} high-severity issues within 1-2 weeks
                </li>
            ` : ''}
            ${summary.bySeverity.medium > 0 ? `
                <li style="margin: 10px 0; color: #ca8a04;">
                    <strong>MEDIUM:</strong> Plan fixes for ${summary.bySeverity.medium} medium-severity findings within 1 month
                </li>
            ` : ''}
        </ul>

        <h2>Best Practices</h2>
        <ul style="margin: 15px 0; padding-left: 25px;">
            <li style="margin: 10px 0;">Implement regular security scanning as part of your CI/CD pipeline</li>
            <li style="margin: 10px 0;">Conduct periodic manual penetration testing</li>
            <li style="margin: 10px 0;">Maintain an up-to-date vulnerability management program</li>
            <li style="margin: 10px 0;">Provide security training for development teams</li>
            <li style="margin: 10px 0;">Establish a responsible disclosure program</li>
        </ul>

        <div class="footer-section">
            <p><strong>Generated by SECORA VAPT Platform</strong></p>
            <p style="margin-top: 10px;">
                This report is confidential and intended for authorized personnel only.<br>
                Unauthorized distribution or disclosure is prohibited.
            </p>
            <p style="margin-top: 20px; font-size: 10px; opacity: 0.7;">
                Report ID: ${report.id}<br>
                Scan ID: ${scan.id}
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

export default {
    generatePDF,
    generateScanReportPDF
};
