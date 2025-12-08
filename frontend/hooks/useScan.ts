import { useState } from 'react';
import { scanService } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useScan() {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const startScan = async (url: string) => {
        setIsScanning(true);
        setError(null);
        try {
            const result = await scanService.startScan(url);
            if (result && result.scanId) {
                scanService.getSummary(result.scanId).catch(console.error);
                scanService.getRemediation(result.scanId).catch(console.error);
                router.push(`/scan/${result.scanId}`);
            } else {
                throw new Error("Scan ID not returned");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Scan failed');
        } finally {
            setIsScanning(false);
        }
    };

    return { startScan, isScanning, error };
}
