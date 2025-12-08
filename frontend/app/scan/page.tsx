'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Input } from '@/components/ui/Input';
import { NeonButton } from '@/components/ui/NeonButton';
import { Scanner } from '@/components/features/Scanner';
import { useScan } from '@/hooks/useScan';
import { AlertCircle } from 'lucide-react';

export default function ScanPage() {
    const [url, setUrl] = useState('');
    const { startScan, isScanning, error } = useScan();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        await startScan(url);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 pt-20">
                <AnimatePresence mode="wait">
                    {isScanning ? (
                        <motion.div
                            key="scanning"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="text-center"
                        >
                            <Scanner />
                            <h2 className="mt-8 text-2xl font-bold text-white animate-pulse">Scanning Target...</h2>
                            <p className="text-muted-foreground">Analyzing vulnerabilities and security headers</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-xl"
                        >
                            <div className="mb-8 text-center">
                                <h1 className="mb-4 text-4xl font-bold text-white neon-text">Start Security Scan</h1>
                                <p className="text-muted-foreground">Enter the URL of the website you want to analyze.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="relative">
                                    <Input
                                        type="url"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="h-14 pl-6 text-lg"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}

                                <NeonButton type="submit" size="lg" className="w-full text-lg h-14" glow>
                                    Analyze Website
                                </NeonButton>
                            </form>

                            <div className="mt-8 text-center text-xs text-muted-foreground">
                                By scanning, you agree to our Terms of Service and confirm you have permission to scan this target.
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
