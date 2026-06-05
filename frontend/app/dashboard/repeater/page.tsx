'use client';
import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Save, History, Code, Layout, Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const DEFAULT_REQUEST = `GET / HTTP/1.1\nHost: example.com\nUser-Agent: SECORA/1.0\nAccept: */*\n\n`;

export default function RepeaterPage() {
    const [rawRequest, setRawRequest] = useState(DEFAULT_REQUEST);
    const [response, setResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'raw' | 'headers' | 'render'>('raw');
    const [history, setHistory] = useState<any[]>([]);

    const parseRawRequest = (raw: string) => {
        const lines = raw.split('\n');
        if (lines.length === 0) throw new Error("Empty request");

        const firstLine = lines[0].trim().split(' ');
        if (firstLine.length < 2) throw new Error("Invalid request line (e.g. GET / HTTP/1.1)");

        const method = firstLine[0];
        const path = firstLine[1];
        
        let host = '';
        const headers: Record<string, string> = {};
        let bodyStartIndex = -1;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trimEnd(); // Keep leading spaces, trim trailing
            if (line === '' || line === '\r') {
                bodyStartIndex = i + 1;
                break;
            }
            const sep = line.indexOf(':');
            if (sep !== -1) {
                const key = line.substring(0, sep).trim();
                const val = line.substring(sep + 1).trim();
                headers[key] = val;
                if (key.toLowerCase() === 'host') {
                    host = val;
                }
            }
        }

        const body = bodyStartIndex !== -1 && bodyStartIndex < lines.length 
            ? lines.slice(bodyStartIndex).join('\n') 
            : '';

        let url = path;
        if (path.startsWith('/')) {
            if (!host) throw new Error("Host header is required for relative paths");
            const protocol = host.endsWith(':443') ? 'https' : 'http';
            url = `${protocol}://${host}${path}`;
        }

        return { method, url, headers, body };
    };

    const handleSend = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);
        setActiveTab('raw');

        try {
            const parsed = parseRawRequest(rawRequest);
            
            // Add to history
            setHistory(prev => [{ timestamp: new Date(), req: parsed, rawReq: rawRequest }, ...prev].slice(0, 10));

            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'https://secora.onrender.com'}/api/repeater/send`, parsed);
            
            setResponse(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Failed to send request");
        } finally {
            setLoading(false);
        }
    };

    const formatResponseRaw = () => {
        if (!response) return '';
        let out = `HTTP/1.1 ${response.status} ${response.statusText || ''}\n`;
        if (response.headers) {
            for (const [key, val] of Object.entries(response.headers)) {
                out += `${key}: ${val}\n`;
            }
        }
        out += '\n';
        if (response.body) {
            out += typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body;
        }
        return out;
    };

    const formatResponseHeaders = () => {
        if (!response || !response.headers) return '';
        return Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join('\n');
    };

    return (
        <div className="p-6 h-[calc(100vh-64px)] flex flex-col bg-gray-950 text-white">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">SECORA Repeater</h1>
                    <p className="text-gray-400 text-sm mt-1">Manual HTTP request manipulation and replay engine</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setRawRequest(DEFAULT_REQUEST)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors border border-gray-700">
                        <RotateCcw size={16} /> Reset
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(8,145,178,0.5)]"
                    >
                        {loading ? <Clock className="animate-spin" size={16} /> : <Play size={16} />}
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-200 text-sm">
                    <AlertTriangle size={16} className="text-red-400" />
                    {error}
                </div>
            )}

            {/* Split Pane */}
            <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                {/* Request Pane */}
                <div className="flex flex-col border border-gray-800 rounded-xl overflow-hidden bg-gray-900 shadow-xl">
                    <div className="bg-gray-950 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
                        <span className="font-semibold text-gray-300 flex items-center gap-2"><Code size={16} className="text-cyan-400"/> Request</span>
                    </div>
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            defaultLanguage="http"
                            theme="vs-dark"
                            value={rawRequest}
                            onChange={(val) => setRawRequest(val || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                wordWrap: "on",
                                scrollBeyondLastLine: false,
                                padding: { top: 16 }
                            }}
                        />
                    </div>
                </div>

                {/* Response Pane */}
                <div className="flex flex-col border border-gray-800 rounded-xl overflow-hidden bg-gray-900 shadow-xl">
                    <div className="bg-gray-950 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
                        <span className="font-semibold text-gray-300 flex items-center gap-2"><Layout size={16} className="text-blue-400"/> Response</span>
                        {response && (
                            <div className="flex items-center gap-4 text-xs">
                                <span className={`px-2 py-1 rounded ${response.status < 300 ? 'bg-green-900/50 text-green-400' : response.status < 400 ? 'bg-blue-900/50 text-blue-400' : 'bg-red-900/50 text-red-400'}`}>
                                    {response.status} {response.statusText}
                                </span>
                                <span className="text-gray-400 flex items-center gap-1"><Clock size={12}/> {response.latencyMs} ms</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex bg-gray-900 border-b border-gray-800">
                        {['raw', 'headers', 'render'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 relative">
                        {!response ? (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 flex-col gap-2">
                                <Play size={32} className="opacity-20" />
                                <span>Hit Send to view response</span>
                            </div>
                        ) : activeTab === 'render' ? (
                            <iframe 
                                srcDoc={typeof response.body === 'string' ? response.body : JSON.stringify(response.body)} 
                                className="w-full h-full bg-white"
                                sandbox="allow-same-origin"
                            />
                        ) : (
                            <Editor
                                height="100%"
                                defaultLanguage={activeTab === 'raw' ? 'http' : 'json'}
                                theme="vs-dark"
                                value={activeTab === 'raw' ? formatResponseRaw() : formatResponseHeaders()}
                                options={{
                                    minimap: { enabled: false },
                                    readOnly: true,
                                    fontSize: 14,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    wordWrap: "on",
                                    scrollBeyondLastLine: false,
                                    padding: { top: 16 }
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
            
            {/* Quick History Strip */}
            {history.length > 0 && (
                <div className="mt-4 border border-gray-800 rounded-lg bg-gray-900 p-2 flex gap-2 overflow-x-auto">
                    <div className="flex items-center gap-2 px-3 text-gray-400 text-sm border-r border-gray-800"><History size={16}/> History</div>
                    {history.map((h, i) => (
                        <button 
                            key={i} 
                            onClick={() => setRawRequest(h.rawReq)}
                            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 flex items-center gap-2 whitespace-nowrap"
                        >
                            <span className="text-cyan-400">{h.req.method}</span>
                            <span className="truncate max-w-[150px]">{h.req.url}</span>
                            <span className="text-gray-500">{h.timestamp.toLocaleTimeString()}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
