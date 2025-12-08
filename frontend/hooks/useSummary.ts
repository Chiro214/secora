import { useState, useEffect } from 'react';
import { scanService, ScanSummary, Vulnerability } from '@/lib/api';

export function useSummary(scanId: string) {
    const [summary, setSummary] = useState<ScanSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!scanId) return;
        const fetchSummary = async () => {
            try {
                const data = await scanService.getSummary(scanId);
                setSummary(data);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to fetch summary');
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [scanId]);

    return { summary, loading, error };
}

export function useRemediation(scanId: string) {
    const [remediation, setRemediation] = useState<VulnerabilityInterface[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!scanId) return;
        const fetchRemediation = async () => {
            try {
                const data = await scanService.getRemediation(scanId) as RemediationResponse | Vulnerability[];
                const vulnerabilities = Array.isArray(data) ? data : data?.vulnerabilities || [];
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
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to fetch remediation');
            } finally {
                setLoading(false);
            }
        };
        fetchRemediation();
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
    exploit?: any;
    fix?: string;
    cvss?: number;
    domain?: string;
    // Add any other fields your UI expects
}


interface RemediationResponse {
    vulnerabilities?: Array<Vulnerability>;
}
