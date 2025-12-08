'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Scan, FileText, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Scan, label: 'New Scan', href: '/scan' },
    { icon: FileText, label: 'Reports', href: '/reports' }, // Placeholder
    { icon: Settings, label: 'Settings', href: '/settings' }, // Placeholder
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-64 flex-col border-r border-primary/10 bg-surface/50 glass-panel">
            <div className="flex h-16 items-center px-6 border-b border-primary/10">
                <Shield className="h-8 w-8 text-primary mr-2" />
                <span className="text-xl font-bold tracking-wider text-white neon-text">SECORA</span>
            </div>

            <nav className="flex-1 space-y-2 p-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-primary/20 text-primary neon-border'
                                        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-primary/10">
                <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
                    <h4 className="text-sm font-semibold text-primary mb-1">Pro Plan</h4>
                    <p className="text-xs text-muted-foreground mb-3">Unlock unlimited scans and PDF reports.</p>
                    <button className="w-full rounded bg-primary/20 py-1 text-xs font-medium text-primary hover:bg-primary/30 transition-colors">
                        Upgrade
                    </button>
                </div>
            </div>
        </div>
    );
}
