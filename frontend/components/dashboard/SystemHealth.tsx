'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, Activity, Database, Wifi, Zap } from 'lucide-react';
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard';

interface HealthMetric {
  label: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  status: 'healthy' | 'warning' | 'critical';
}

export function SystemHealth() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    { label: 'CPU Usage', value: 45, unit: '%', icon: Cpu, status: 'healthy' },
    { label: 'Memory', value: 62, unit: '%', icon: HardDrive, status: 'healthy' },
    { label: 'Network', value: 78, unit: 'Mbps', icon: Wifi, status: 'warning' },
    { label: 'Database', value: 34, unit: 'ms', icon: Database, status: 'healthy' },
    { label: 'API Response', value: 125, unit: 'ms', icon: Zap, status: 'healthy' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(0, Math.min(100, metric.value + (Math.random() - 0.5) * 10)),
        status: metric.value > 80 ? 'critical' : metric.value > 60 ? 'warning' : 'healthy',
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return { bg: 'from-green-500', text: 'text-green-400', glow: 'rgba(0,255,157,0.5)' };
      case 'warning': return { bg: 'from-yellow-500', text: 'text-yellow-400', glow: 'rgba(255,184,0,0.5)' };
      case 'critical': return { bg: 'from-red-500', text: 'text-red-400', glow: 'rgba(255,0,85,0.5)' };
      default: return { bg: 'from-cyan-500', text: 'text-cyan-400', glow: 'rgba(0,255,255,0.5)' };
    }
  };

  return (
    <GlassmorphicCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <Activity className="w-6 h-6" />
          System Health
        </h2>
        <motion.div
          className="w-3 h-3 rounded-full bg-green-400"
          animate={{
            boxShadow: [
              '0 0 10px rgba(0,255,157,0.5)',
              '0 0 20px rgba(0,255,157,1)',
              '0 0 10px rgba(0,255,157,0.5)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const colors = getStatusColor(metric.status);
          const Icon = metric.icon;

          return (
            <motion.div
              key={metric.label}
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <span className={`text-sm font-bold ${colors.text}`}>
                  {Math.round(metric.value)}{metric.unit}
                </span>
              </div>

              {/* Animated health bar */}
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${colors.bg} to-transparent`}
                  style={{
                    width: `${metric.value}%`,
                    boxShadow: `0 0 10px ${colors.glow}`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.value}%` }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Pulse effect */}
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>

                {/* Warning threshold line */}
                {metric.value > 60 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/50"
                    style={{ left: '60%' }}
                  />
                )}
                {metric.value > 80 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400/50"
                    style={{ left: '80%' }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Overall status */}
      <motion.div
        className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-400/30"
        animate={{
          borderColor: ['rgba(0,255,157,0.3)', 'rgba(0,255,255,0.3)', 'rgba(0,255,157,0.3)'],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Status</span>
          <span className="text-sm font-bold text-green-400">Operational</span>
        </div>
      </motion.div>
    </GlassmorphicCard>
  );
}
