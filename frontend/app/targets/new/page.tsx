'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function NewTargetPage() {
    const router = useRouter();
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        type: 'DOMAIN',
        value: '',
        description: '',
        allowSubdomains: false
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/api/targets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create target');
            }

            const target = await response.json();
            router.push(`/targets`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Create New Target</h1>
                    <p className="text-blue-200">Add a new target for vulnerability scanning</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8">
                    {/* Name */}
                    <div className="mb-6">
                        <label className="block text-white font-semibold mb-2">
                            Target Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-500"
                            placeholder="My Production Server"
                        />
                    </div>

                    {/* Type */}
                    <div className="mb-6">
                        <label className="block text-white font-semibold mb-2">
                            Target Type *
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="DOMAIN">Domain</option>
                            <option value="IP">IP Address</option>
                            <option value="URL">URL</option>
                            <option value="CIDR">CIDR Range</option>
                        </select>
                    </div>

                    {/* Value */}
                    <div className="mb-6">
                        <label className="block text-white font-semibold mb-2">
                            Target Value *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-500 font-mono"
                            placeholder={
                                formData.type === 'DOMAIN' ? 'example.com' :
                                formData.type === 'IP' ? '192.0.2.1' :
                                formData.type === 'URL' ? 'https://example.com' :
                                '192.0.2.0/24'
                            }
                        />
                        <p className="text-blue-300/70 text-sm mt-2">
                            {formData.type === 'DOMAIN' && 'Enter domain without protocol (e.g., example.com)'}
                            {formData.type === 'IP' && 'Enter IPv4 address'}
                            {formData.type === 'URL' && 'Enter full URL with protocol'}
                            {formData.type === 'CIDR' && 'Enter CIDR notation (e.g., 192.0.2.0/24)'}
                        </p>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <label className="block text-white font-semibold mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-500"
                            rows={3}
                            placeholder="Optional description..."
                        />
                    </div>

                    {/* Allow Subdomains */}
                    {formData.type === 'DOMAIN' && (
                        <div className="mb-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.allowSubdomains}
                                    onChange={(e) => setFormData({ ...formData, allowSubdomains: e.target.checked })}
                                    className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-white">
                                    Include subdomains in scan
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-semibold transition-all"
                        >
                            {loading ? 'Creating...' : 'Create Target'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                {/* Info Box */}
                <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-blue-300 font-semibold mb-2">ℹ️ Important Notes</h3>
                    <ul className="text-blue-200 text-sm space-y-1">
                        <li>• Only scan targets you own or have permission to test</li>
                        <li>• Private IP addresses are blocked for security</li>
                        <li>• Target verification may be required before scanning</li>
                        <li>• All scans are logged for audit purposes</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
