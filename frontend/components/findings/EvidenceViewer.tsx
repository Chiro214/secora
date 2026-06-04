'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileText, Image, Code, Terminal, Globe, AlertCircle } from 'lucide-react';

interface Evidence {
    id: string;
    type: 'REQUEST' | 'RESPONSE' | 'SCREENSHOT' | 'LOG' | 'CODE' | 'NETWORK';
    title: string;
    content: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

interface EvidenceViewerProps {
    evidence: Evidence[];
    findingTitle?: string;
}

export default function EvidenceViewer({ evidence, findingTitle }: EvidenceViewerProps) {
    const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(
        evidence.length > 0 ? evidence[0] : null
    );

    const getEvidenceIcon = (type: string) => {
        switch (type) {
            case 'REQUEST':
            case 'RESPONSE':
                return <Globe className="h-4 w-4" />;
            case 'SCREENSHOT':
                return <Image className="h-4 w-4" />;
            case 'CODE':
                return <Code className="h-4 w-4" />;
            case 'LOG':
                return <Terminal className="h-4 w-4" />;
            case 'NETWORK':
                return <Globe className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const getEvidenceColor = (type: string) => {
        switch (type) {
            case 'REQUEST':
                return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'RESPONSE':
                return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'SCREENSHOT':
                return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'CODE':
                return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'LOG':
                return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
            case 'NETWORK':
                return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
            default:
                return 'text-white bg-white/10 border-white/20';
        }
    };

    if (evidence.length === 0) {
        return (
            <Card className="border-primary/10 bg-surface/50">
                <CardContent className="py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No evidence available for this finding</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {findingTitle && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Evidence</h2>
                    <p className="text-muted-foreground">{findingTitle}</p>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Evidence List */}
                <div className="lg:col-span-1 space-y-2">
                    <h3 className="text-sm font-semibold text-white mb-3">Evidence Items ({evidence.length})</h3>
                    {evidence.map((ev) => (
                        <button
                            key={ev.id}
                            onClick={() => setSelectedEvidence(ev)}
                            className={`w-full text-left p-4 rounded-lg border transition-all ${
                                selectedEvidence?.id === ev.id
                                    ? 'bg-primary/20 border-primary'
                                    : 'bg-black/30 border-white/10 hover:bg-black/50 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg border ${getEvidenceColor(ev.type)}`}>
                                    {getEvidenceIcon(ev.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{ev.type}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Evidence Details */}
                <div className="lg:col-span-2">
                    {selectedEvidence && (
                        <Card className="border-primary/10 bg-surface/50">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-lg border ${getEvidenceColor(selectedEvidence.type)}`}>
                                        {getEvidenceIcon(selectedEvidence.type)}
                                    </div>
                                    <div>
                                        <CardTitle>{selectedEvidence.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {selectedEvidence.type} • {new Date(selectedEvidence.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Content */}
                                <div>
                                    <h4 className="text-sm font-semibold text-white mb-3">Content</h4>
                                    <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                                        {selectedEvidence.type === 'SCREENSHOT' ? (
                                            <img
                                                src={selectedEvidence.content}
                                                alt={selectedEvidence.title}
                                                className="w-full rounded-lg"
                                            />
                                        ) : (
                                            <pre className="text-sm text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap break-words">
                                                {selectedEvidence.content}
                                            </pre>
                                        )}
                                    </div>
                                </div>

                                {/* Metadata */}
                                {selectedEvidence.metadata && Object.keys(selectedEvidence.metadata).length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-white mb-3">Metadata</h4>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {Object.entries(selectedEvidence.metadata).map(([key, value]) => (
                                                <div key={key} className="bg-black/30 rounded-lg p-3 border border-white/5">
                                                    <p className="text-xs text-muted-foreground mb-1">{key}</p>
                                                    <p className="text-sm text-white font-mono break-all">
                                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-4 border-t border-white/10">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedEvidence.content);
                                        }}
                                        className="px-4 py-2 bg-black/30 hover:bg-black/50 text-white rounded-lg text-sm transition-colors"
                                    >
                                        Copy Content
                                    </button>
                                    <button
                                        onClick={() => {
                                            const blob = new Blob([selectedEvidence.content], { type: 'text/plain' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `evidence-${selectedEvidence.id}.txt`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="px-4 py-2 bg-black/30 hover:bg-black/50 text-white rounded-lg text-sm transition-colors"
                                    >
                                        Download
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
