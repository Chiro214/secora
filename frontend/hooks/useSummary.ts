import { useState, useEffect } from 'react';
import { scanService, ScanSummary, Vulnerability } from '@/lib/api';

export function useSummary(scanId: string) {
    const [summary, setSummary] = useState<ScanSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!scanId) return;
        let isMounted = true;
        
        const fetchSummary = async () => {
            try {
                const data = await scanService.getSummary(scanId);
                if (isMounted) {
                    setSummary(data);
                    
                    // Polling logic: if it's still running, poll every 5 seconds
                    if (data.ai?.summary === 'pending') {
                        setTimeout(fetchSummary, 5000);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch summary');
                    setLoading(false);
                }
            }
        };
        fetchSummary();
        
        return () => { isMounted = false; };
    }, [scanId]);

    return { summary, loading, error };
}

export function useRemediation(scanId: string) {
    const [remediation, setRemediation] = useState<VulnerabilityInterface[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!scanId) return;
        let isMounted = true;
        
        const fetchRemediation = async () => {
            try {
                // We can check summary status from the API or just check if it returns empty during pending
                const data = await scanService.getRemediation(scanId) as RemediationResponse | Vulnerability[];
                const vulnerabilities = Array.isArray(data) ? data : data?.vulnerabilities || [];
                
                // If it's still running, vulnerabilities will be empty and we should keep polling
                // Or better, check the status from getSummary
                const summaryData = await scanService.getSummary(scanId);
                
                if (isMounted) {
                    if (summaryData.ai?.summary === 'pending') {
                        setTimeout(fetchRemediation, 5000);
                    } else {
                        const transformed = vulnerabilities.map((v: Vulnerability) => ({
                            id: v.id,
                            name: v.name,
                            title: v.name,
                            description: v.description,
                            severity: v.severity,
                            impact: v.impact,
                            exploit: v.exploit,
                            fix: v.fix,
                            cvss: (v as Vulnerability & { cvss?: number }).cvss,
                            domain: (v as Vulnerability & { domain?: string }).domain,
                        } as VulnerabilityInterface));
                        setRemediation(transformed);
                        setLoading(false);
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch remediation');
                    setLoading(false);
                }
            }
        };
        fetchRemediation();
        
        return () => { isMounted = false; };
    }, [scanId]);

    return { remediation, loading, error };
}

interface VulnerabilityInterface {
    id: string;
    name: string;
    title?: string;
    description: string;
    severity: string;
    impact?: string;
    exploit?: unknown;
    fix?: string;
    cvss?: number;
    domain?: string;
    // Add any other fields your UI expects
}


interface RemediationResponse {
    vulnerabilities?: Array<Vulnerability>;
}
