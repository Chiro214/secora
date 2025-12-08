'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Sparkles } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.header 
            className={`
                fixed top-0 left-0 right-0 z-50 
                transition-all duration-500
                ${scrolled 
                    ? 'border-b border-white/20 bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]' 
                    : 'border-b border-white/5 bg-transparent backdrop-blur-sm'
                }
            `}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
        >
            {/* Top glow line */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                animate={{ opacity: scrolled ? [0.3, 0.6, 0.3] : 0 }}
                transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="container mx-auto flex h-20 items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <motion.div
                        className="relative"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Shield className="h-9 w-9 text-primary drop-shadow-[0_0_15px_rgba(75,163,255,0.6)]" />
                        <motion.div
                            className="absolute inset-0"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        >
                            <div className="absolute top-0 left-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(75,163,255,0.8)]" />
                        </motion.div>
                    </motion.div>
                    <span className="text-2xl font-bold tracking-wider text-white relative">
                        SECORA
                        <motion.span
                            className="absolute -top-1 -right-6 text-xs text-primary"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Sparkles className="w-3 h-3" />
                        </motion.span>
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    {[
                        { href: '#features', label: 'Features' },
                        { href: '#pricing', label: 'Pricing' },
                        { href: '/dashboard', label: 'Dashboard' },
                    ].map((item) => (
                        <Link 
                            key={item.href}
                            href={item.href} 
                            className="text-sm font-medium text-[#E8F0FF]/70 hover:text-primary transition-colors duration-300 relative group"
                        >
                            {item.label}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300" />
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <Link href="/login">
                        <motion.span 
                            className="text-sm font-medium text-[#E8F0FF]/70 hover:text-white transition-colors duration-300 hidden sm:inline-block"
                            whileHover={{ scale: 1.05 }}
                        >
                            Login
                        </motion.span>
                    </Link>
                    <Link href="/scan">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <NeonButton size="sm" className="relative overflow-hidden group">
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-primary via-blue-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    style={{ backgroundSize: '200% 100%' }}
                                />
                                <span className="relative z-10 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Start Scan
                                </span>
                            </NeonButton>
                        </motion.div>
                    </Link>
                </div>
            </div>

            {/* Bottom glow line */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </motion.header>
    );
}
