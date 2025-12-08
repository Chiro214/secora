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
    const [remediation, setRemediation] = useState<Vulnerability[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!scanId) return;
        const fetchRemediation = async () => {
            try {
                const data = await scanService.getRemediation(scanId);
                setRemediation(Array.isArray(data) ? data : data.vulnerabilities || []);
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
