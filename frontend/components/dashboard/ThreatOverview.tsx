'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard';

export function ThreatOverview() {
  const stats = [
    { label: 'Total Threats', value: '1,247', change: '+12%', icon: AlertTriangle, color: 'red' },
    { label: 'Active Scans', value: '23', change: '+5', icon: Activity, color: 'cyan' },
    { label: 'Protected Assets', value: '156', change: '+8', icon: Shield, color: 'green' },
    { label: 'Risk Score', value: '7.2', change: '-0.3', icon: TrendingUp, color: 'yellow' },
  ];

  return (
    <GlassmorphicCard className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-cyan-400">Global Threat Overview</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="relative p-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: `radial-gradient(circle at center, rgba(0,255,255,0.1), transparent)`,
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                <span className={`text-xs px-2 py-1 rounded-full bg-${stat.color}-400/20 text-${stat.color}-400`}>
                  {stat.change}
                </span>
              </div>
              
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>

            {/* Animated border */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        ))}
      </div>
    </GlassmorphicCard>
  );
}
