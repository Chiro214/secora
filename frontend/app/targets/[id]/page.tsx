'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Globe, ShieldAlert, Activity, LayoutList } from 'lucide-react';
import { CyberGrid } from '@/components/3d/CyberGrid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function TargetDetailsPage() {
    const params = useParams();
    const [target, setTarget] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTargetData();
    }, [params.id]);

    const fetchTargetData = async () => {
        try {
            // For MVP, we use mock data if the API endpoint isn't fully returning trends yet
            setTarget({
                id: params.id,
                name: 'Production Environment',
                value: 'example.com',
                subdomains: ['api.example.com', 'dev.example.com', 'staging.example.com'],
                trends: [
                    { date: 'May 01', findings: 12 },
                    { date: 'May 08', findings: 15 },
                    { date: 'May 15', findings: 8 },
                    { date: 'May 22', findings: 4 },
                    { date: 'May 29', findings: 6 },
                    { date: 'Jun 04', findings: 2 },
                ]
            });
            setLoading(false);
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="text-white p-8">Loading Target Intelligence...</div>;

    return (
        <div className="min-h-screen text-white relative overflow-hidden bg-black">
            <CyberGrid />
            <div className="relative z-10 p-8 max-w-[1600px] mx-auto">
                <div className="mb-8 border-b border-blue-500/30 pb-6">
                    <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                        <Globe className="text-cyan-400 w-8 h-8" /> 
                        {target.name}
                    </h1>
                    <p className="text-xl text-blue-300 font-mono">{target.value}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Risk Trends Line Chart */}
                    <div className="bg-black/40 border border-blue-500/30 p-6 rounded-xl backdrop-blur-md">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Activity className="text-green-400" />
                            Attack Surface Risk Trend
                        </h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={target.trends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                                    <XAxis dataKey="date" stroke="#60a5fa" />
                                    <YAxis stroke="#60a5fa" />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #3b82f6' }}
                                        itemStyle={{ color: '#60a5fa' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="findings" 
                                        stroke="#ef4444" 
                                        strokeWidth={3}
                                        dot={{ fill: '#ef4444', r: 4 }}
                                        activeDot={{ r: 8 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Discovered Subdomains */}
                    <div className="bg-black/40 border border-blue-500/30 p-6 rounded-xl backdrop-blur-md">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <LayoutList className="text-cyan-400" />
                            Discovered Subdomains (crt.sh)
                        </h2>
                        <div className="space-y-3">
                            {target.subdomains.map((sub: string, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 border border-blue-500/20 rounded-lg bg-blue-900/10 hover:bg-blue-900/30 transition-colors">
                                    <span className="font-mono text-cyan-300">{sub}</span>
                                    <ShieldAlert className="w-4 h-4 text-orange-400" />
                                </div>
                            ))}
                            {target.subdomains.length === 0 && (
                                <div className="text-blue-300/50 italic">No subdomains discovered yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
