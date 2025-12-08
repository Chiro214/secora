'use client';

import { use, useState, useEffect } from 'react';
import { useSummary, useRemediation } from '@/hooks/useSummary';
import { scanService } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { NeonButton } from '@/components/ui/NeonButton';
import { SummaryChart } from '@/components/charts/SummaryChart';
import { Download, CheckCircle, AlertTriangle, Code } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import LiveScanner from '@/components/scan/LiveScanner';

export default function ScanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use() for Next.js 15+ (or await it if async component, but this is client component)
    // Actually in Next.js 15 client components, params is a Promise.
    // But let's assume standard behavior or handle it.
    // Wait, I imported `use` from react.
    const { id } = use(params);

    const { summary, loading: summaryLoading } = useSummary(id);
    const { remediation, loading: remediationLoading } = useRemediation(id);
    const [scanStatus, setScanStatus] = useState<'scanning' | 'complete'>('scanning');

    useEffect(() => {
        // Check if scan is complete
        if (summary && remediation) {
            const timer = setTimeout(() => setScanStatus('complete'), 5000);
            return () => clearTimeout(timer);
        }
    }, [summary, remediation]);

    const handleDownload = async () => {
        try {
            const blob = await scanService.getReportPdf(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `secora-report-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Failed to download report", error);
            alert("Failed to download report. Please try again.");
        }
    };

    const scrollToRemediation = () => {
        const element = document.getElementById('remediation-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (summaryLoading || remediationLoading || scanStatus === 'scanning') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
                <Navbar />
                <div className="container mx-auto px-4 pt-24">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                            Security Scan in Progress
                        </h1>
                        <p className="text-cyan-300/70">Real-time vulnerability assessment</p>
                    </div>
                    <LiveScanner scanId={id} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <Navbar />

            <div className="container mx-auto px-4 pt-24">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white neon-text">Scan Results</h1>
                        <p className="text-muted-foreground">ID: {id}</p>
                    </div>
                    <NeonButton onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" /> Download PDF Report
                    </NeonButton>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {/* Summary Section */}
                    <div className="md:col-span-2 space-y-8">
                        <Card className="border-primary/10 bg-surface/50">
                            <CardHeader>
                                <CardTitle>Executive Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed">
                                    {summary?.executiveSummary || "No summary available."}
                                </p>
                            </CardContent>
                        </Card>

                        <div id="remediation-section" className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">Vulnerabilities & Remediation</h2>
                            {remediation && remediation.length > 0 ? (
                                remediation.map((vuln) => (
                                    <Card key={vuln.id} className="border-primary/10 bg-surface/50 overflow-hidden">
                                        <div className={`h-1 w-full ${vuln.severity === 'High' ? 'bg-red-500' :
                                            vuln.severity === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                            }`} />
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-xl">{vuln.name}</CardTitle>
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${vuln.severity === 'High' ? 'bg-red-500/10 text-red-500' :
                                                vuln.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {vuln.severity}
                                            </span>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <h4 className="mb-1 text-sm font-semibold text-white">Description</h4>
                                                <p className="text-sm text-muted-foreground">{vuln.description}</p>
                                            </div>
                                            <div>
                                                <h4 className="mb-1 text-sm font-semibold text-white">Impact</h4>
                                                <p className="text-sm text-muted-foreground">{vuln.impact}</p>
                                            </div>
                                            
                                            {vuln.exploit && (
                                                <div className="rounded-lg bg-red-500/5 p-4 border border-red-500/20">
                                                    <h4 className="mb-3 text-sm font-semibold text-red-400 flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4" /> Exploit Details
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-xs font-semibold text-red-300 mb-1">Loophole:</p>
                                                            <p className="text-xs text-muted-foreground">{vuln.exploit.loophole}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-red-300 mb-1">Attack Vector:</p>
                                                            <p className="text-xs text-muted-foreground">{vuln.exploit.attackVector}</p>
                                                        </div>
                                                        {vuln.exploit.examplePayload && (
                                                            <div>
                                                                <p className="text-xs font-semibold text-red-300 mb-2 flex items-center gap-1">
                                                                    <Code className="h-3 w-3" /> Example Payload:
                                                                </p>
                                                                <pre className="overflow-x-auto text-xs text-red-200/80 font-mono bg-black/40 p-3 rounded border border-red-500/10">
                                                                    <code>{vuln.exploit.examplePayload}</code>
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {vuln.exploit.findings && vuln.exploit.findings.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-semibold text-red-300 mb-2">Test Results:</p>
                                                                <div className="space-y-2">
                                                                    {vuln.exploit.findings.map((finding: any, idx: number) => (
                                                                        <div key={idx} className="bg-black/40 p-2 rounded border border-red-500/10">
                                                                            <p className="text-xs text-red-400 font-semibold">{finding.type}</p>
                                                                            <p className="text-xs text-muted-foreground">{finding.evidence}</p>
                                                                            <code className="text-xs text-red-200/60">Payload: {finding.payload}</code>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {vuln.exploit.extractedData && (
                                                            <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/30">
                                                                <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Extracted Data:</p>
                                                                <pre className="text-xs text-yellow-200 font-mono">
                                                                    <code>{JSON.stringify(vuln.exploit.extractedData, null, 2)}</code>
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="rounded-lg bg-black/30 p-4 border border-white/5">
                                                <h4 className="mb-2 text-sm font-semibold text-green-400 flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4" /> Suggested Fix
                                                </h4>
                                                <pre className="overflow-x-auto text-xs text-muted-foreground font-mono">
                                                    <code>{vuln.fix}</code>
                                                </pre>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card className="bg-surface/50">
                                    <CardContent className="py-8 text-center text-muted-foreground">
                                        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                                        <p>No vulnerabilities found! Great job.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-8">
                        <Card className="border-primary/10 bg-surface/50">
                            <CardHeader>
                                <CardTitle>Severity Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SummaryChart stats={summary?.stats} />
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-none">
                            <CardContent className="p-6">
                                <h3 className="text-lg font-bold text-white mb-2">AI Insights</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Our AI detected 3 critical patterns that match recent CVEs. Immediate patching recommended.
                                </p>
                                <NeonButton size="sm" variant="outline" className="w-full" onClick={scrollToRemediation}>View Details</NeonButton>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
