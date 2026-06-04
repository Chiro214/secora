'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Target {
    id: string;
    name: string;
    type: string;
    value: string;
    verified: boolean;
    createdAt: string;
    _count: {
        scans: number;
        assets: number;
    };
}

export default function TargetsPage() {
    const router = useRouter();
    const { token, checkAuth } = useAuth();
    const [targets, setTargets] = useState<Target[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!checkAuth()) return;
        fetchTargets();
    }, []);

    const fetchTargets = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/api/targets`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch targets');

            const data = await response.json();
            setTargets(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteTarget = async (id: string) => {
        if (!confirm('Are you sure you want to delete this target?')) return;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/api/targets/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete target');

            setTargets(targets.filter(t => t.id !== id));
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading targets...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Scan Targets</h1>
                        <p className="text-blue-200">Manage your scanning targets</p>
                    </div>
                    <Link
                        href="/targets/new"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                    >
                        + New Target
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Targets Grid */}
                {targets.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-12 text-center">
                        <div className="text-6xl mb-4">🎯</div>
                        <h3 className="text-2xl font-bold text-white mb-2">No targets yet</h3>
                        <p className="text-blue-200 mb-6">Create your first target to start scanning</p>
                        <Link
                            href="/targets/new"
                            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                        >
                            Create Target
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {targets.map((target) => (
                            <div
                                key={target.id}
                                className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">{target.name}</h3>
                                        <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                            {target.type}
                                        </span>
                                    </div>
                                    {target.verified && (
                                        <span className="text-green-400 text-2xl" title="Verified">✓</span>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <p className="text-blue-100 font-mono text-sm break-all">{target.value}</p>
                                </div>

                                <div className="flex gap-4 text-sm text-blue-200 mb-4">
                                    <div>
                                        <span className="font-semibold">{target._count.scans}</span> scans
                                    </div>
                                    <div>
                                        <span className="font-semibold">{target._count.assets}</span> assets
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Link
                                        href={`/scans/new?targetId=${target.id}`}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg font-semibold transition-all"
                                    >
                                        Scan
                                    </Link>
                                    <button
                                        onClick={() => router.push(`/targets/${target.id}`)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => deleteTarget(target.id)}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
