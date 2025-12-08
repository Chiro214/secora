'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="container mx-auto px-4 pt-24">
                <Card className="bg-surface/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-6 w-6 text-primary" />
                            Reports
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            This feature is coming soon. You will be able to view and download detailed PDF reports of your scans here.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
