'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NeonButton } from '@/components/ui/NeonButton';
import { CyberGrid } from '@/components/3d/CyberGrid';
import { User, Mail, Lock, Shield, CheckCircle, AlertCircle } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // API call to backend
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();

                setShowSuccess(true);
                setTimeout(() => {
                    login(data.token); // Use context login
                }, 2000);
            } else {
                const error = await response.json();
                setError(error.message || 'Registration failed');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-foreground flex flex-col relative overflow-hidden">
            <CyberGrid />
            <Navbar />

            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.div
                            className="text-center"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', duration: 0.8 }}
                        >
                            <motion.div
                                className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-cyan-400 flex items-center justify-center"
                                animate={{
                                    boxShadow: [
                                        '0 0 20px rgba(0,255,157,0.5)',
                                        '0 0 60px rgba(0,255,157,1)',
                                        '0 0 20px rgba(0,255,157,0.5)',
                                    ],
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                <CheckCircle className="w-16 h-16 text-white" />
                            </motion.div>
                            <motion.h2
                                className="text-4xl font-bold text-green-400 mb-2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                ACCOUNT CREATED
                            </motion.h2>
                            <motion.p
                                className="text-cyan-400"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                Welcome to SECORA...
                            </motion.p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 flex items-center justify-center px-4 relative z-10">
                <motion.div
                    className="w-full max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <motion.div
                        className="flex justify-center mb-8"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Shield className="w-20 h-20 text-cyan-400" style={{
                            filter: 'drop-shadow(0 0 20px rgba(0,255,255,0.6))',
                        }} />
                    </motion.div>

                    <Card className="bg-white/5 border-cyan-400/30 backdrop-blur-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-bold" style={{
                                textShadow: '0 0 20px rgba(0,255,255,0.5)',
                            }}>
                                Create Account
                            </CardTitle>
                            <p className="text-sm text-cyan-400/70">Join SECORA to secure your applications</p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSignup} className="space-y-4">
                                {error && (
                                    <motion.div
                                        className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-2"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                        <span className="text-sm text-red-400">{error}</span>
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-cyan-400">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/50" />
                                        <Input
                                            placeholder="John Doe"
                                            className="pl-10 bg-white/5 border-cyan-400/30 focus:border-cyan-400"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-cyan-400">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/50" />
                                        <Input
                                            type="email"
                                            placeholder="name@example.com"
                                            className="pl-10 bg-white/5 border-cyan-400/30 focus:border-cyan-400"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-cyan-400">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/50" />
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10 bg-white/5 border-cyan-400/30 focus:border-cyan-400"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <NeonButton type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Creating Account...' : 'Create Account'}
                                </NeonButton>
                            </form>

                            <div className="mt-6 text-center text-sm text-gray-400">
                                Already have an account?{' '}
                                <a href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                    Log in
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
