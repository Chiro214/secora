'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, AlertTriangle, Zap, Globe, Cpu, Target, TrendingUp } from 'lucide-react';
import { ThreatOverview } from '@/components/dashboard/ThreatOverview';
import { RadarMap } from '@/components/dashboard/RadarMap';
import { LiveScanStatus } from '@/components/dashboard/LiveScanStatus';
import { VulnerabilityFeed } from '@/components/dashboard/VulnerabilityFeed';
import { SystemHealth } from '@/components/dashboard/SystemHealth';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { CyberGrid } from '@/components/3d/CyberGrid';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());
  const { checkAuth, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checkAuth()) {
      return;
    }
  }, [checkAuth, router]);

  if (!isAuthenticated && typeof window !== 'undefined' && !localStorage.getItem('token')) {
    return null; // Or a loading spinner
  }

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Cyber Grid Background */}
      <CyberGrid />

      {/* Main Content */}
      <div className="relative z-10 p-6 max-w-[1920px] mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{
                textShadow: '0 0 20px rgba(0,255,255,0.5)',
              }}>
                SECORA Command Center
              </h1>
              <p className="text-cyan-400/70">Real-time threat intelligence & security monitoring</p>
            </div>

            {/* System Time */}
            <div className="text-right">
              <div className="text-2xl font-mono text-cyan-400">
                {time.toLocaleTimeString()}
              </div>
              <div className="text-sm text-cyan-400/70">
                {time.toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex gap-4">
            <StatusIndicator icon={Shield} label="System" status="Operational" color="cyan" />
            <StatusIndicator icon={Activity} label="Scans" status="Active" color="green" />
            <StatusIndicator icon={AlertTriangle} label="Threats" status="3 Critical" color="red" />
            <StatusIndicator icon={Zap} label="AI Bot" status="Online" color="purple" />
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Threat Overview & Radar */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <ThreatOverview />
            <RadarMap />
            <LiveScanStatus />
          </div>

          {/* Right Column - Vulnerabilities & Health */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <SystemHealth />
            <VulnerabilityFeed />
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}

function StatusIndicator({
  icon: Icon,
  label,
  status,
  color
}: {
  icon: React.ElementType;
  label: string;
  status: string;
  color: 'cyan' | 'green' | 'red' | 'purple';
}) {
  const colors = {
    cyan: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
    green: 'text-green-400 border-green-400/30 bg-green-400/10',
    red: 'text-red-400 border-red-400/30 bg-red-400/10',
    purple: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  };

  return (
    <motion.div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border backdrop-blur-xl ${colors[color]}`}
      whileHover={{ scale: 1.05 }}
    >
      <Icon className="w-5 h-5" />
      <div>
        <div className="text-xs opacity-70">{label}</div>
        <div className="text-sm font-semibold">{status}</div>
      </div>
    </motion.div>
  );
}
