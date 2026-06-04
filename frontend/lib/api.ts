import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Interfaces
export interface ScanResult {
    scanId: string;
    status: 'pending' | 'scanning' | 'completed' | 'failed';
    url: string;
    timestamp: string;
    vulnerabilities?: Vulnerability[];
    headers?: Record<string, string>;
    tls?: {
        ok: boolean;
        issuer?: { CN: string };
        expiresInDays?: number;
        error?: string;
    };
    ai?: {
        summary: string;
        items: Array<{
            title: string;
            explanation: string;
            remediation: string;
            severity: string;
            eta: string;
        }>;
    };
}

export interface Vulnerability {
    id: string;
    name: string;
    title?: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    owasp?: string;
    description: string;
    impact?: string;
    remediation: string;
    fix?: string;
    codeSnippet?: string;
    exploit?: {
        loophole: string;
        attackVector: string;
        examplePayload?: string;
        findings?: Array<{
            payload: string;
            type: string;
            evidence: string;
        }>;
        extractedData?: {
            payload: string;
            data: string;
            note: string;
        };
        testedPayloads?: string[];
    };
}

export interface ScanSummary {
    scanId: string;
    url: string;
    riskScore: number;
    vulnerabilities: Vulnerability[];
    summary: string;
    executiveSummary: string;
    scanDuration: string;
    stats: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    headers?: Record<string, string>;
    ai?: ScanResult['ai'];
}

// In-memory cache for scan results
const scanCache: Record<string, ScanResult> = {};

// Real Scan Service
export const scanService = {
    /**
     * Start a real vulnerability scan against the backend
     */
    startScan: async (url: string): Promise<ScanResult> => {
        console.log(`🔍 Starting REAL scan for ${url}`);

        try {
            // Call the real backend scanning endpoint
            const response = await axios.post(`${API_BASE_URL}/scan`, { url }, {
                timeout: 120000, // 2 minute timeout for comprehensive scans
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = response.data;

            // Transform backend response to frontend format
            const result: ScanResult = {
                scanId: data.scanId || `scan-${Date.now()}`,
                status: 'completed',
                url: data.target || url,
                timestamp: data.generatedAt || new Date().toISOString(),
                vulnerabilities: (data.vulnerabilities || []).map((v: any) => ({
                    id: v.id,
                    name: v.title || v.name || 'Unknown Vulnerability',
                    title: v.title,
                    severity: normalizeSeverity(v.severity),
                    owasp: v.owasp,
                    description: v.description,
                    impact: v.impact || getDefaultImpact(v.severity),
                    remediation: v.remediation,
                    fix: v.remediation,
                    exploit: v.exploit
                })),
                headers: data.headers,
                tls: data.tls,
                ai: data.ai
            };

            // Cache the result
            scanCache[result.scanId] = result;

            console.log(`✅ Scan completed: ${result.vulnerabilities?.length || 0} vulnerabilities found`);
            return result;
        } catch (error: any) {
            console.error('❌ Scan failed:', error.message);
            throw new Error(error.response?.data?.error || error.message || 'Scan failed');
        }
    },

    /**
     * Get vulnerability remediation details
     */
    getRemediation: async (scanId: string): Promise<Vulnerability[]> => {
        console.log(`📋 Getting remediation for scan ${scanId}`);

        // Check cache first
        if (scanCache[scanId]?.vulnerabilities) {
            return scanCache[scanId].vulnerabilities!;
        }

        try {
            // Try to fetch from backend
            const response = await axios.get(`${API_BASE_URL}/api/scan/${scanId}`);
            if (response.data?.vulnerabilities) {
                return response.data.vulnerabilities.map((v: any) => ({
                    id: v.id,
                    name: v.title || v.name,
                    severity: normalizeSeverity(v.severity),
                    description: v.description,
                    impact: v.impact || getDefaultImpact(v.severity),
                    remediation: v.remediation,
                    fix: v.remediation,
                    exploit: v.exploit
                }));
            }
        } catch (error) {
            console.log('Could not fetch from backend, using cache');
        }

        return scanCache[scanId]?.vulnerabilities || [];
    },

    /**
     * Get scan summary with statistics
     */
    getSummary: async (scanId: string): Promise<ScanSummary> => {
        console.log(`📊 Getting summary for scan ${scanId}`);

        const cached = scanCache[scanId];

        if (cached) {
            const vulns = cached.vulnerabilities || [];
            const stats = {
                critical: vulns.filter(v => v.severity === 'Critical').length,
                high: vulns.filter(v => v.severity === 'High').length,
                medium: vulns.filter(v => v.severity === 'Medium').length,
                low: vulns.filter(v => v.severity === 'Low').length
            };

            const riskScore = calculateRiskScore(stats);
            const executiveSummary = generateExecutiveSummary(cached.url, vulns, stats, cached.ai);

            return {
                scanId,
                url: cached.url,
                riskScore,
                vulnerabilities: vulns,
                summary: cached.ai?.summary || `Scan completed with ${vulns.length} vulnerabilities found.`,
                executiveSummary,
                scanDuration: '~30s',
                stats,
                headers: cached.headers,
                ai: cached.ai
            };
        }

        // Try fetching from backend
        try {
            const response = await axios.get(`${API_BASE_URL}/api/scan/${scanId}`);
            const data = response.data;
            const vulns = data.vulnerabilities || [];
            const stats = {
                critical: vulns.filter((v: any) => v.severity === 'Critical').length,
                high: vulns.filter((v: any) => v.severity === 'High').length,
                medium: vulns.filter((v: any) => v.severity === 'Medium').length,
                low: vulns.filter((v: any) => v.severity === 'Low').length
            };

            return {
                scanId,
                url: data.target || 'Unknown',
                riskScore: calculateRiskScore(stats),
                vulnerabilities: vulns,
                summary: data.ai?.summary || 'Scan completed.',
                executiveSummary: generateExecutiveSummary(data.target, vulns, stats, data.ai),
                scanDuration: '~30s',
                stats
            };
        } catch (error) {
            // Return empty summary
            return {
                scanId,
                url: 'Unknown',
                riskScore: 0,
                vulnerabilities: [],
                summary: 'No scan data available.',
                executiveSummary: 'Unable to load scan results.',
                scanDuration: 'N/A',
                stats: { critical: 0, high: 0, medium: 0, low: 0 }
            };
        }
    },

    /**
     * Get scan report PDF
     */
    getReportPdf: async (scanId: string): Promise<Blob> => {
        console.log(`📥 Downloading PDF for ${scanId}`);

        try {
            const response = await axios.get(`${API_BASE_URL}/api/report/${encodeURIComponent(scanId)}/pdf`, {
                responseType: 'blob'
            });
            return response.data;
        } catch (error: any) {
            console.error("❌ PDF generation failed in browser:", error.message || error);
            // Don't fallback to text because the browser will save it as a corrupt .pdf file!
            throw error;
        }
    },

    /**
     * Health check
     */
    checkHealth: async (): Promise<{ status: string; services?: any }> => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/health`);
            return response.data;
        } catch (error) {
            return { status: 'offline' };
        }
    },

    getReportUrl: (scanId: string) => `${API_BASE_URL}/api/report/${scanId}/pdf`,

    /**
     * Get scan history (mock for now since no DB)
     */
    getScans: async (): Promise<ScanResult[]> => {
        // Return cached scans
        return Object.values(scanCache).sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }
};

// Helper functions
function normalizeSeverity(severity: string): 'Critical' | 'High' | 'Medium' | 'Low' {
    const s = (severity || 'Low').toLowerCase();
    if (s === 'critical') return 'Critical';
    if (s === 'high') return 'High';
    if (s === 'medium') return 'Medium';
    return 'Low';
}

function getDefaultImpact(severity: string): string {
    switch (normalizeSeverity(severity)) {
        case 'Critical':
            return 'Critical security vulnerability that could lead to complete system compromise, data breach, or unauthorized access.';
        case 'High':
            return 'Significant security risk that could allow attackers to access sensitive data or bypass security controls.';
        case 'Medium':
            return 'Moderate security issue that could be exploited under certain conditions.';
        default:
            return 'Minor security concern that should be addressed as part of regular maintenance.';
    }
}

function calculateRiskScore(stats: { critical: number; high: number; medium: number; low: number }): number {
    const score = (stats.critical * 40) + (stats.high * 25) + (stats.medium * 10) + (stats.low * 5);
    return Math.min(100, score);
}

function generateExecutiveSummary(
    url: string,
    vulns: Vulnerability[],
    stats: { critical: number; high: number; medium: number; low: number },
    ai?: ScanResult['ai']
): string {
    if (ai?.summary) {
        return ai.summary;
    }

    const total = vulns.length;
    if (total === 0) {
        return `Security scan of ${url} completed successfully with no vulnerabilities detected. The target demonstrates good security posture.`;
    }

    let summary = `Security assessment of ${url} identified ${total} vulnerability${total > 1 ? 'ies' : 'y'}. `;

    if (stats.critical > 0) {
        summary += `⚠️ CRITICAL: ${stats.critical} critical issue${stats.critical > 1 ? 's' : ''} requiring immediate attention. `;
    }
    if (stats.high > 0) {
        summary += `${stats.high} high severity issue${stats.high > 1 ? 's' : ''} found. `;
    }
    if (stats.medium > 0) {
        summary += `${stats.medium} medium severity issue${stats.medium > 1 ? 's' : ''}. `;
    }
    if (stats.low > 0) {
        summary += `${stats.low} low severity issue${stats.low > 1 ? 's' : ''}. `;
    }

    summary += 'Immediate remediation recommended for critical and high severity findings.';

    return summary;
}

function generateTextReport(scanId: string, data?: ScanResult): string {
    const lines = [
        '='.repeat(60),
        'SECORA SECURITY ASSESSMENT REPORT',
        '='.repeat(60),
        '',
        `Scan ID: ${scanId}`,
        `Target: ${data?.url || 'Unknown'}`,
        `Generated: ${new Date().toISOString()}`,
        '',
        '-'.repeat(60),
        'VULNERABILITY SUMMARY',
        '-'.repeat(60),
    ];

    if (data?.vulnerabilities && data.vulnerabilities.length > 0) {
        data.vulnerabilities.forEach((v, i) => {
            lines.push('');
            lines.push(`${i + 1}. [${v.severity.toUpperCase()}] ${v.name}`);
            lines.push(`   Description: ${v.description}`);
            lines.push(`   Remediation: ${v.remediation}`);
            if (v.exploit?.examplePayload) {
                lines.push(`   Example Payload: ${v.exploit.examplePayload}`);
            }
        });
    } else {
        lines.push('', 'No vulnerabilities detected.');
    }

    lines.push('', '='.repeat(60));
    lines.push('Generated by SECORA VAPT Platform');

    return lines.join('\n');
}
