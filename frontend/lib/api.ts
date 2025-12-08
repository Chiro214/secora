import axios from 'axios';

// Mock Data Interfaces
export interface ScanResult {
    scanId: string;
    status: 'pending' | 'completed' | 'failed';
    url: string;
    timestamp: string;
    vulnerabilities?: Vulnerability[];
}

export interface Vulnerability {
    id: string;
    name: string;
    severity: 'High' | 'Medium' | 'Low';
    description: string;
    impact: string;
    remediation: string;
    fix: string;
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
        high: number;
        medium: number;
        low: number;
    };
}

// Mock Data
const MOCK_VULNERABILITIES: Vulnerability[] = [
    {
        id: 'vuln-1',
        name: 'SQL Injection',
        severity: 'High',
        description: 'The application is vulnerable to SQL Injection in the login form.',
        impact: 'Attackers could bypass authentication and access sensitive database information.',
        remediation: 'Use parameterized queries or prepared statements to sanitize user input.',
        fix: 'Use parameterized queries (e.g., pg-promise, Sequelize) instead of string concatenation.',
        codeSnippet: 'const query = "SELECT * FROM users WHERE id = $1";\nawait db.query(query, [userId]);',
        exploit: {
            loophole: 'The login form directly concatenates user input into SQL queries without proper sanitization or parameterization.',
            attackVector: 'An attacker can inject SQL commands through the username or password field to manipulate the query logic.',
            examplePayload: 'Username: admin\' OR \'1\'=\'1\' --\nPassword: anything\n\nThis bypasses authentication by making the WHERE clause always true.'
        }
    },
    {
        id: 'vuln-2',
        name: 'Cross-Site Scripting (XSS)',
        severity: 'Medium',
        description: 'Reflected XSS vulnerability found in the search parameter.',
        impact: 'Attackers could execute malicious scripts in the victim\'s browser.',
        remediation: 'Escape all user-supplied input before rendering it in the browser.',
        fix: 'Sanitize user input using libraries like DOMPurify before rendering.',
        codeSnippet: '<div>{DOMPurify.sanitize(userInput)}</div>',
        exploit: {
            loophole: 'The search parameter is reflected in the page without proper HTML encoding or sanitization.',
            attackVector: 'An attacker can craft a malicious URL with JavaScript code in the search parameter that executes when the victim visits the link.',
            examplePayload: 'https://example.com/search?q=<script>alert(document.cookie)</script>\n\nThis steals the victim\'s session cookies and sends them to the attacker.'
        }
    },
    {
        id: 'vuln-3',
        name: 'Insecure Headers',
        severity: 'Low',
        description: 'Missing security headers like X-Frame-Options and Content-Security-Policy.',
        impact: 'Increases risk of clickjacking and other client-side attacks.',
        remediation: 'Configure the web server to send appropriate security headers.',
        fix: 'Add security headers (X-Frame-Options, CSP) in web server config (Nginx/Apache) or middleware.',
        codeSnippet: 'Header set X-Frame-Options "DENY"\nHeader set Content-Security-Policy "default-src \'self\'"',
        exploit: {
            loophole: 'The application does not set X-Frame-Options or CSP frame-ancestors headers, allowing the page to be embedded in iframes.',
            attackVector: 'An attacker can create a malicious website that embeds your application in an invisible iframe and trick users into clicking on it (clickjacking).',
            examplePayload: '<iframe src="https://example.com/transfer?amount=1000&to=attacker" style="opacity:0;position:absolute;"></iframe>\n\nUser thinks they\'re clicking a game but actually authorizing a transfer.'
        }
    }
];

// Mock Service
export const scanService = {
    startScan: async (url: string): Promise<ScanResult> => {
        console.log(`[MOCK] Initiating scan for ${url}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
        return {
            scanId: `scan-${Date.now()}`,
            status: 'pending',
            url,
            timestamp: new Date().toISOString()
        };
    },

    getRemediation: async (scanId: string): Promise<Vulnerability[]> => {
        console.log(`[MOCK] Getting remediation for ${scanId}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Try to fetch from real backend first
        try {
            const response = await axios.get(`http://localhost:5000/api/scan/${scanId}`);
            if (response.data && response.data.vulnerabilities) {
                // Transform backend format to frontend format
                return response.data.vulnerabilities.map((v: any) => ({
                    id: v.id,
                    name: v.title || v.name,
                    severity: v.severity,
                    description: v.description,
                    impact: v.impact || 'Impact information not available',
                    remediation: v.remediation,
                    fix: v.remediation,
                    codeSnippet: v.codeSnippet,
                    exploit: v.exploit
                }));
            }
        } catch (error) {
            console.log('Backend not available, using mock data');
        }
        
        return MOCK_VULNERABILITIES;
    },

    getSummary: async (scanId: string): Promise<ScanSummary> => {
        console.log(`[MOCK] Getting summary for ${scanId}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
            scanId,
            url: 'https://example.com',
            riskScore: 85,
            vulnerabilities: MOCK_VULNERABILITIES,
            summary: 'The scan identified several critical vulnerabilities.',
            executiveSummary: 'The scan identified several critical vulnerabilities. The overall security posture is weak due to the presence of SQL Injection and XSS flaws. Immediate remediation is recommended.',
            scanDuration: '45s',
            stats: {
                high: 1,
                medium: 1,
                low: 1
            }
        };
    },

    getReportPdf: async (scanId: string): Promise<Blob> => {
        console.log(`[MOCK] Downloading PDF for ${scanId}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return new Blob(['Mock PDF Content'], { type: 'application/pdf' });
    },

    checkHealth: async (): Promise<{ status: string }> => {
        return { status: 'ok' };
    },

    getReportUrl: (scanId: string) => {
        // In a real app, this returns the backend URL.
        // For mock, we can return a placeholder or handle it in the component.
        return `http://localhost:5000/api/report/${scanId}/pdf`;
    },

    // Mock method for dashboard history
    getScans: async (): Promise<ScanResult[]> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return [
            { scanId: 'scan-123', status: 'completed', url: 'https://example.com', timestamp: new Date(Date.now() - 86400000).toISOString() },
            { scanId: 'scan-124', status: 'completed', url: 'https://test-site.org', timestamp: new Date(Date.now() - 172800000).toISOString() },
            { scanId: 'scan-125', status: 'failed', url: 'https://broken-link.net', timestamp: new Date(Date.now() - 259200000).toISOString() },
        ];
    }
};
