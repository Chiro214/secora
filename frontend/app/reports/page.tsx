'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { NeonButton } from '@/components/ui/NeonButton';
import { FileText, Download, Eye, Calendar, Shield, AlertTriangle } from 'lucide-react';

interface Report {
    id: string;
    scanId: string;
    targetName: string;
    targetUrl: string;
    createdAt: string;
    format: 'PDF' | 'JSON' | 'HTML';
    status: 'GENERATING' | 'READY' | 'FAILED';
    findingsCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/reports', {
            //     headers: { Authorization: `Bearer ${token}` }
            // });
            // const data = await response.json();
            // setReports(data);
            
            // Mock data for now
            setReports([
                {
                    id: '1',
                    scanId: 'scan-123',
                    targetName: 'Production Website',
                    targetUrl: 'https://example.com',
                    createdAt: new Date().toISOString(),
                    format: 'PDF',
                    status: 'READY',
                    findingsCount: 12,
                    criticalCount: 2,
                    highCount: 4,
                    mediumCount: 5,
                    lowCount: 1
                }
            ]);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateReport = async (scanId: string, format: 'PDF' | 'JSON' | 'HTML') => {
        setGenerating(scanId);
        try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/reports/generate', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         Authorization: `Bearer ${token}`
            //     },
            //     body: JSON.stringify({ scanId, format })
            // });
            // const data = await response.json();
            
            // Simulate generation
            await new Promise(resolve => setTimeout(resolve, 2000));
            alert(`${format} report generation started for scan ${scanId}`);
            fetchReports();
        } catch (error) {
            console.error('Failed to generate report:', error);
            alert('Failed to generate report');
        } finally {
            setGenerating(null);
        }
    };

    const downloadReport = async (reportId: string, format: string) => {
        try {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/reports/${reportId}/download`, {
            //     headers: { Authorization: `Bearer ${token}` }
            // });
            // const blob = await response.blob();
            // const url = URL.createObjectURL(blob);
            // const a = document.createElement('a');
            // a.href = url;
            // a.download = `secora-report-${reportId}.${format.toLowerCase()}`;
            // a.click();
            // URL.revokeObjectURL(url);
            
            alert(`Downloading report ${reportId} as ${format}`);
        } catch (error) {
            console.error('Failed to download report:', error);
            alert('Failed to download report');
        }
    };

    const viewReport = (scanId: string) => {
        window.location.href = `/scan/${scanId}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-12">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        Security Reports
                    </h1>
                    <p className="text-cyan-300/70">
                        Generate and download comprehensive security assessment reports
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-4 mb-8">
                    <Card className="bg-surface/50 border-primary/10">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Reports</p>
                                    <p className="text-3xl font-bold text-white">{reports.length}</p>
                                </div>
                                <FileText className="h-8 w-8 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-surface/50 border-red-500/10">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Critical Issues</p>
                                    <p className="text-3xl font-bold text-red-500">
                                        {reports.reduce((sum, r) => sum + r.criticalCount, 0)}
                                    </p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-surface/50 border-orange-500/10">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">High Issues</p>
                                    <p className="text-3xl font-bold text-orange-500">
                                        {reports.reduce((sum, r) => sum + r.highCount, 0)}
                                    </p>
                                </div>
                                <Shield className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-surface/50 border-green-500/10">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Ready to Download</p>
                                    <p className="text-3xl font-bold text-green-500">
                                        {reports.filter(r => r.status === 'READY').length}
                                    </p>
                                </div>
                                <Download className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Reports List */}
                <div className="space-y-4">
                    {loading ? (
                        <Card className="bg-surface/50 border-primary/10">
                            <CardContent className="py-12 text-center">
                                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-muted-foreground">Loading reports...</p>
                            </CardContent>
                        </Card>
                    ) : reports.length === 0 ? (
                        <Card className="bg-surface/50 border-primary/10">
                            <CardContent className="py-12 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">No reports available yet</p>
                                <NeonButton onClick={() => window.location.href = '/scan/new'}>
                                    Start Your First Scan
                                </NeonButton>
                            </CardContent>
                        </Card>
                    ) : (
                        reports.map(report => (
                            <Card key={report.id} className="bg-surface/50 border-primary/10 hover:border-primary/30 transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-white">{report.targetName}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                    report.status === 'READY' ? 'bg-green-500/10 text-green-500' :
                                                    report.status === 'GENERATING' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                    {report.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4">{report.targetUrl}</p>

                                            {/* Stats */}
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {new Date(report.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {report.format}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Findings Summary */}
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                                    <span className="text-sm text-white">{report.criticalCount} Critical</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                                    <span className="text-sm text-white">{report.highCount} High</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                                    <span className="text-sm text-white">{report.mediumCount} Medium</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                    <span className="text-sm text-white">{report.lowCount} Low</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => viewReport(report.scanId)}
                                                className="p-3 bg-black/30 hover:bg-black/50 rounded-lg transition-colors"
                                                title="View Report"
                                            >
                                                <Eye className="h-5 w-5 text-primary" />
                                            </button>
                                            {report.status === 'READY' && (
                                                <button
                                                    onClick={() => downloadReport(report.id, report.format)}
                                                    className="p-3 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                                                    title="Download Report"
                                                >
                                                    <Download className="h-5 w-5 text-primary" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
