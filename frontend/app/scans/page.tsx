'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Scan {
    id: string;
    status: string;
    profile: string;
    progress: number;
    currentPhase: string;
    createdAt: string;
    completedAt: string | null;
    duration: number | null;
    target: {
        name: string;
        value: string;
        type: string;
    };
    _count: {
        findings: number;
    };
}

export default function ScansPage() {
    const router = useRouter();
    const { token, checkAuth } = useAuth();
    const [scans, setScans] = useState<Scan[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!checkAuth()) return;
        fetchScans();
        
        // Poll for updates every 5 seconds
        const interval = setInterval(fetchScans, 5000);
        return () => clearInterval(interval);
    }, [filter]);

    const fetchScans = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const url = filter === 'all' 
                ? `${API_URL}/api/scans`
                : `${API_URL}/api/scans?status=${filter}`;
                
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch scans');

            const data = await response.json();
            setScans(data.scans || data);
        } catch (err: any) {
            console.error('Error fetching scans:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'RUNNING': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'QUEUED': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'FAILED': return 'bg-red-500/20 text-red-300 border-red-500/30';
            case 'CANCELLED': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
            default: return 'bg-white/10 text-white border-white/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '✓';
            case 'RUNNING': return '⟳';
            case 'QUEUED': return '⏱';
            case 'FAILED': return '✗';
            case 'CANCELLED': return '⊘';
            default: return '•';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading scans...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Scans</h1>
                        <p className="text-blue-200">View and manage your security scans</p>
                    </div>
                    <Link
                        href="/targets"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                    >
                        + New Scan
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6">
                    {['all', 'RUNNING', 'COMPLETED', 'FAILED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                filter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                            }`}
                        >
                            {status === 'all' ? 'All' : status}
                        </button>
                    ))}
                </div>

                {/* Scans List */}
                {scans.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-12 text-center">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-2xl font-bold text-white mb-2">No scans found</h3>
                        <p className="text-blue-200 mb-6">Start your first security scan</p>
                        <Link
                            href="/targets"
                            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                        >
                            Create Scan
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {scans.map((scan) => (
                            <div
                                key={scan.id}
                                onClick={() => router.push(`/scans/${scan.id}`)}
                                className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{scan.target.name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(scan.status)}`}>
                                                {getStatusIcon(scan.status)} {scan.status}
                                            </span>
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                                {scan.profile.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-blue-200 font-mono text-sm">{scan.target.value}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white">{scan._count.findings}</div>
                                        <div className="text-blue-300 text-sm">findings</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {scan.status === 'RUNNING' && (
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm text-blue-200 mb-2">
                                            <span>{scan.currentPhase || 'Processing...'}</span>
                                            <span>{scan.progress}%</span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${scan.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Metadata */}
                                <div className="flex gap-6 text-sm text-blue-200">
                                    <div>
                                        <span className="text-blue-300">Started:</span>{' '}
                                        {new Date(scan.createdAt).toLocaleString()}
                                    </div>
                                    {scan.completedAt && (
                                        <div>
                                            <span className="text-blue-300">Duration:</span>{' '}
                                            {scan.duration ? `${scan.duration}s` : 'N/A'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
