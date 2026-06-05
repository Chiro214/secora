import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://secora.onrender.com';

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
        console.log(`🔍 Starting Aggressive Pipeline scan for ${url}`);

        try {
            let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            
            // 1. Get Guest Token if unauthenticated
            if (!token) {
                console.log("No auth token found, creating guest session...");
                const guestRes = await axios.post(`${API_BASE_URL}/api/auth/guest`);
                token = guestRes.data.token;
                if (typeof window !== 'undefined' && token) {
                    localStorage.setItem('token', token);
                }
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // 2. Create Target
            console.log("Creating target...");
            const targetRes = await axios.post(`${API_BASE_URL}/api/targets`, {
                name: url.replace(/^https?:\/\//, ''),
                value: url,
                type: 'URL'
            }, { headers });

            // 3. Start Pipeline Scan
            console.log("Starting aggressive pipeline scan...");
            const response = await axios.post(`${API_BASE_URL}/api/scans/start`, {
                targetId: targetRes.data.id,
                profile: 'FULL_VAPT'
            }, { headers });

            const data = response.data;

            // Transform backend response to frontend format
            const result: ScanResult = {
                scanId: data.id,
                status: 'pending',
                url: url,
                timestamp: data.createdAt || new Date().toISOString(),
                vulnerabilities: [],
            };

            // Cache the result
            scanCache[result.scanId] = result;

            console.log(`✅ Scan enqueued with ID: ${result.scanId}`);
            return result;
        } catch (error: any) {
            console.error('❌ Scan failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error || error.message || 'Scan failed');
        }
    },

    /**
     * Get vulnerability remediation details
     */
    getRemediation: async (scanId: string): Promise<Vulnerability[]> => {
        console.log(`📋 Getting remediation for scan ${scanId}`);

        // Check cache first
        if (scanCache[scanId]?.vulnerabilities && scanCache[scanId]?.status === 'completed') {
            return scanCache[scanId].vulnerabilities!;
        }

        try {
            let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            // Try to fetch from backend
            const response = await axios.get(`${API_BASE_URL}/api/scans/${scanId}/findings`, { headers });
            if (response.data?.findings) {
                return response.data.findings.map((v: any) => ({
                    id: v.id,
                    name: v.title || v.name || v.type,
                    severity: normalizeSeverity(v.severity),
                    description: v.description,
                    impact: v.impact || getDefaultImpact(v.severity),
                    remediation: v.remediation,
                    fix: v.remediation,
                    exploit: v.evidence ? { examplePayload: v.evidence.payload } : undefined
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

        // Try fetching from backend
        try {
            let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            // Get status
            const statusRes = await axios.get(`${API_BASE_URL}/api/scans/${scanId}/status`, { headers });
            const statusData = statusRes.data;
            
            if (statusData.status === 'COMPLETED') {
                // Get full findings
                const findingsRes = await axios.get(`${API_BASE_URL}/api/scans/${scanId}/findings`, { headers });
                const vulns = findingsRes.data.findings || [];
                const stats = {
                    critical: vulns.filter((v: any) => v.severity === 'CRITICAL').length,
                    high: vulns.filter((v: any) => v.severity === 'HIGH').length,
                    medium: vulns.filter((v: any) => v.severity === 'MEDIUM').length,
                    low: vulns.filter((v: any) => v.severity === 'LOW').length
                };

                return {
                    scanId,
                    url: cached?.url || 'Unknown',
                    riskScore: calculateRiskScore(stats),
                    vulnerabilities: vulns,
                    summary: `Scan completed successfully. Found ${vulns.length} vulnerabilities.`,
                    executiveSummary: generateExecutiveSummary(cached?.url || 'Unknown', vulns, stats),
                    scanDuration: statusData.duration || 'N/A',
                    stats
                };
            } else if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
                 return {
                    scanId,
                    url: cached?.url || 'Unknown',
                    riskScore: 0,
                    vulnerabilities: [],
                    summary: `Scan ${statusData.status.toLowerCase()}. ${statusData.error || ''}`,
                    executiveSummary: 'Scan did not complete successfully.',
                    scanDuration: 'N/A',
                    stats: { critical: 0, high: 0, medium: 0, low: 0 }
                 };
            } else {
                // Still running
                return {
                    scanId,
                    url: cached?.url || 'Unknown',
                    riskScore: 0,
                    vulnerabilities: [],
                    summary: `Scan in progress... Phase: ${statusData.currentPhase || 'Initializing'} (${statusData.progress || 0}%)`,
                    executiveSummary: 'Scan is currently running. Please wait.',
                    scanDuration: 'In progress',
                    stats: { critical: 0, high: 0, medium: 0, low: 0 },
                    // Injecting status flag so UI knows it's pending
                    ai: { summary: 'pending' } as any
                };
            }
        } catch (error) {
            // Fallback
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
            let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await axios.get(`${API_BASE_URL}/api/report/${encodeURIComponent(scanId)}/pdf`, {
                headers,
                responseType: 'blob'
            });
            return response.data;
        } catch (error: any) {
            console.error("❌ PDF generation failed in browser:", error.message || error);
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
