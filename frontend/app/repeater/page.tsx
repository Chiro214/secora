'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { NeonButton } from '@/components/ui/NeonButton';
import { Input } from '@/components/ui/Input';
import { Play, ArrowRightLeft, Clock, Server, AlertCircle } from 'lucide-react';

export default function RepeaterPage() {
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('https://example.com');
    const [headers, setHeaders] = useState('User-Agent: SECORA/Repeater\nAccept: */*');
    const [body, setBody] = useState('');
    
    const [response, setResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        if (!url) {
            setError('URL is required');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://secora.onrender.com';
            const res = await fetch(`${API_BASE_URL}/api/repeater/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, method, headers, body })
            });
            
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to send request');
            }
            setResponse(data);
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />
            
            <div className="flex-1 flex flex-col pt-20 px-4 pb-4 h-screen">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white neon-text flex items-center gap-2">
                            <ArrowRightLeft className="w-8 h-8" /> 
                            Manual Proxy (Repeater)
                        </h1>
                        <p className="text-muted-foreground">Craft, edit, and replay HTTP requests manually.</p>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-hidden">
                    {/* Left Pane: Request Editor */}
                    <div className="flex flex-col bg-surface/30 border border-primary/20 rounded-xl overflow-hidden shadow-lg shadow-primary/5">
                        <div className="bg-surface/50 p-3 border-b border-primary/20 flex gap-2">
                            <select 
                                value={method} 
                                onChange={(e) => setMethod(e.target.value)}
                                className="bg-background text-white border border-primary/30 rounded-md px-3 py-2 font-mono focus:outline-none focus:border-primary"
                            >
                                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <Input 
                                value={url} 
                                onChange={(e) => setUrl(e.target.value)} 
                                placeholder="Target URL" 
                                className="flex-1 font-mono"
                            />
                            <NeonButton onClick={handleSend} disabled={isLoading} className="px-6">
                                {isLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                                {isLoading ? 'Sending' : 'Send'}
                            </NeonButton>
                        </div>
                        
                        <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
                            <label className="text-sm font-semibold text-primary mb-2">Request Headers</label>
                            <textarea 
                                value={headers}
                                onChange={(e) => setHeaders(e.target.value)}
                                className="w-full bg-black/40 border border-primary/20 rounded-md p-3 text-sm font-mono text-cyan-100/80 focus:border-primary focus:outline-none resize-y min-h-[150px]"
                                placeholder="Key: Value"
                                spellCheck={false}
                            />
                            
                            <label className="text-sm font-semibold text-primary mt-4 mb-2">Request Body</label>
                            <textarea 
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full flex-1 min-h-[200px] bg-black/40 border border-primary/20 rounded-md p-3 text-sm font-mono text-purple-100/80 focus:border-primary focus:outline-none resize-none"
                                placeholder="Body content..."
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    {/* Right Pane: Response Viewer */}
                    <div className="flex flex-col bg-surface/30 border border-primary/20 rounded-xl overflow-hidden shadow-lg shadow-primary/5">
                        <div className="bg-surface/50 p-3 border-b border-primary/20 flex items-center justify-between h-[61px]">
                            <span className="font-semibold text-white">Response</span>
                            {response && (
                                <div className="flex gap-4 text-sm font-mono">
                                    <span className={`flex items-center gap-1 ${response.status < 400 ? 'text-green-400' : 'text-red-400'}`}>
                                        <Server className="w-4 h-4" /> {response.status} {response.statusText}
                                    </span>
                                    <span className="flex items-center gap-1 text-blue-400">
                                        <Clock className="w-4 h-4" /> {response.duration}ms
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
                            {error ? (
                                <div className="flex items-center gap-2 p-4 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg font-mono">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            ) : response ? (
                                <>
                                    <label className="text-sm font-semibold text-primary mb-2">Response Headers</label>
                                    <div className="w-full bg-black/40 border border-primary/20 rounded-md p-3 text-sm font-mono text-cyan-100/80 overflow-x-auto mb-4 whitespace-pre-wrap">
                                        {Object.entries(response.headers || {}).map(([key, val]) => (
                                            <div key={key}><span className="text-primary">{key}:</span> {String(val)}</div>
                                        ))}
                                    </div>
                                    
                                    <label className="text-sm font-semibold text-primary mb-2 flex justify-between">
                                        <span>Response Body</span>
                                    </label>
                                    <textarea 
                                        readOnly
                                        value={typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body}
                                        className="w-full flex-1 min-h-[200px] bg-black/40 border border-primary/20 rounded-md p-3 text-sm font-mono text-green-100/80 focus:outline-none resize-none"
                                        spellCheck={false}
                                    />
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground italic">
                                    Send a request to see the response...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
