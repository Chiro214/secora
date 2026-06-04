'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { NeonButton } from '@/components/ui/NeonButton';
import { AlertTriangle, Shield, Info, ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';

interface Finding {
    id: string;
    title: string;
    description: string;
    category: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    cvss: number;
    owasp?: string;
    cwe?: string;
    confidence: number;
    status: string;
    endpoint?: {
        url: string;
        method: string;
    };
    evidence: Array<{
        type: string;
        title: string;
        content: string;
    }>;
    remediation?: string;
    references?: string[];
}

interface FindingsTableProps {
    findings: Finding[];
    onSelectFinding?: (finding: Finding) => void;
}

export default function FindingsTable({ findings, onSelectFinding }: FindingsTableProps) {
    const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

    const severityColors = {
        CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
        HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        INFO: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };

    const severityIcons = {
        CRITICAL: <AlertTriangle className="h-4 w-4" />,
        HIGH: <AlertTriangle className="h-4 w-4" />,
        MEDIUM: <Shield className="h-4 w-4" />,
        LOW: <Shield className="h-4 w-4" />,
        INFO: <Info className="h-4 w-4" />
    };

    // Get unique categories
    const categories = ['ALL', ...Array.from(new Set(findings.map(f => f.category)))];
    const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

    // Filter findings
    const filteredFindings = findings.filter(finding => {
        const matchesSeverity = selectedSeverity === 'ALL' || finding.severity === selectedSeverity;
        const matchesCategory = selectedCategory === 'ALL' || finding.category === selectedCategory;
        const matchesSearch = searchQuery === '' || 
            finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            finding.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesSeverity && matchesCategory && matchesSearch;
    });

    // Sort by severity
    const sortedFindings = [...filteredFindings].sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const toggleExpand = (id: string) => {
        setExpandedFinding(expandedFinding === id ? null : id);
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card className="border-primary/10 bg-surface/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search findings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    {/* Severity Filter */}
                    <div>
                        <label className="text-sm font-medium text-white mb-2 block">Severity</label>
                        <div className="flex flex-wrap gap-2">
                            {severities.map(severity => (
                                <button
                                    key={severity}
                                    onClick={() => setSelectedSeverity(severity)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${
                                        selectedSeverity === severity
                                            ? 'bg-primary text-white'
                                            : 'bg-black/30 text-muted-foreground hover:bg-black/50'
                                    }`}
                                >
                                    {severity}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="text-sm font-medium text-white mb-2 block">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                        selectedCategory === category
                                            ? 'bg-primary text-white'
                                            : 'bg-black/30 text-muted-foreground hover:bg-black/50'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results Count */}
                    <div className="pt-2 border-t border-white/10">
                        <p className="text-sm text-muted-foreground">
                            Showing <span className="text-white font-bold">{sortedFindings.length}</span> of{' '}
                            <span className="text-white font-bold">{findings.length}</span> findings
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Findings List */}
            <div className="space-y-4">
                {sortedFindings.length === 0 ? (
                    <Card className="border-primary/10 bg-surface/50">
                        <CardContent className="py-12 text-center">
                            <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <p className="text-muted-foreground">No findings match your filters</p>
                        </CardContent>
                    </Card>
                ) : (
                    sortedFindings.map(finding => (
                        <Card key={finding.id} className="border-primary/10 bg-surface/50 overflow-hidden hover:border-primary/30 transition-all">
                            {/* Severity Bar */}
                            <div className={`h-1 w-full ${
                                finding.severity === 'CRITICAL' ? 'bg-red-500' :
                                finding.severity === 'HIGH' ? 'bg-orange-500' :
                                finding.severity === 'MEDIUM' ? 'bg-yellow-500' :
                                finding.severity === 'LOW' ? 'bg-blue-500' : 'bg-gray-500'
                            }`} />

                            <CardContent className="p-6">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase border ${severityColors[finding.severity]}`}>
                                                {severityIcons[finding.severity]}
                                                {finding.severity}
                                            </span>
                                            <span className="px-2 py-1 rounded bg-black/30 text-xs text-muted-foreground">
                                                {finding.category}
                                            </span>
                                            <span className="px-2 py-1 rounded bg-black/30 text-xs text-muted-foreground">
                                                CVSS: {finding.cvss}
                                            </span>
                                            {finding.confidence && (
                                                <span className="px-2 py-1 rounded bg-black/30 text-xs text-muted-foreground">
                                                    {finding.confidence}% confidence
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{finding.title}</h3>
                                        <p className="text-sm text-muted-foreground">{finding.description}</p>
                                        
                                        {finding.endpoint && (
                                            <div className="mt-3 flex items-center gap-2 text-xs">
                                                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">
                                                    {finding.endpoint.method}
                                                </span>
                                                <span className="text-muted-foreground font-mono">
                                                    {finding.endpoint.url}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => toggleExpand(finding.id)}
                                        className="ml-4 p-2 hover:bg-black/30 rounded-lg transition-colors"
                                    >
                                        {expandedFinding === finding.id ? (
                                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>

                                {/* Expanded Details */}
                                {expandedFinding === finding.id && (
                                    <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                                        {/* Evidence */}
                                        {finding.evidence && finding.evidence.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-3">Evidence</h4>
                                                <div className="space-y-2">
                                                    {finding.evidence.map((ev, idx) => (
                                                        <div key={idx} className="bg-black/30 rounded-lg p-4 border border-white/5">
                                                            <p className="text-xs font-semibold text-primary mb-2">{ev.title}</p>
                                                            <pre className="text-xs text-muted-foreground font-mono overflow-x-auto">
                                                                {ev.content}
                                                            </pre>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Remediation */}
                                        {finding.remediation && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-3">Remediation</h4>
                                                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                                                    <p className="text-sm text-muted-foreground">{finding.remediation}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* References */}
                                        {finding.references && finding.references.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-3">References</h4>
                                                <div className="space-y-1">
                                                    {finding.references.map((ref, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={ref}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block text-xs text-primary hover:underline"
                                                        >
                                                            {ref}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* OWASP & CWE */}
                                        <div className="flex gap-4">
                                            {finding.owasp && (
                                                <div className="flex-1 bg-black/30 rounded-lg p-3 border border-white/5">
                                                    <p className="text-xs text-muted-foreground mb-1">OWASP</p>
                                                    <p className="text-sm font-mono text-white">{finding.owasp}</p>
                                                </div>
                                            )}
                                            {finding.cwe && (
                                                <div className="flex-1 bg-black/30 rounded-lg p-3 border border-white/5">
                                                    <p className="text-xs text-muted-foreground mb-1">CWE</p>
                                                    <p className="text-sm font-mono text-white">{finding.cwe}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {onSelectFinding && (
                                            <div className="pt-4">
                                                <NeonButton
                                                    size="sm"
                                                    onClick={() => onSelectFinding(finding)}
                                                    className="w-full"
                                                >
                                                    View Full Details
                                                </NeonButton>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
