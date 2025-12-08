'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="container mx-auto px-4 pt-24">
                <Card className="bg-surface/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-6 w-6 text-primary" />
                            Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Settings configuration is coming soon. You will be able to configure scan preferences, API keys, and account details here.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
