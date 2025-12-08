'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Target, Zap, Pause, Play } from 'lucide-react';
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard';

interface Scan {
  id: string;
  target: string;
  type: 'Quick' | 'Deep' | 'Zero-Day' | 'Continuous';
  progress: number;
  status: 'running' | 'paused' | 'completed';
  elapsed: number;
  findings: number;
}

export function LiveScanStatus() {
  const [scans, setScans] = useState<Scan[]>([
    { id: '1', target: 'example.com', type: 'Deep', progress: 67, status: 'running', elapsed: 145, findings: 12 },
    { id: '2', target: 'api.test.io', type: 'Quick', progress: 34, status: 'running', elapsed: 45, findings: 3 },
    { id: '3', target: 'app.secure.net', type: 'Zero-Day', progress: 89, status: 'running', elapsed: 320, findings: 8 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setScans(prev => prev.map(scan => {
        if (scan.status === 'running' && scan.progress < 100) {
          return {
            ...scan,
            progress: Math.min(scan.progress + Math.random() * 2, 100),
            elapsed: scan.elapsed + 1,
            findings: scan.findings + (Math.random() > 0.9 ? 1 : 0),
          };
        }
        return scan;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const typeColors = {
    Quick: 'cyan',
    Deep: 'purple',
    'Zero-Day': 'red',
    Continuous: 'green',
  };

  return (
    <GlassmorphicCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Live Scan Status
        </h2>
        <motion.div
          className="px-3 py-1 rounded-full bg-green-400/20 text-green-400 text-sm flex items-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-2 h-2 rounded-full bg-green-400" />
          {scans.filter(s => s.status === 'running').length} Active
        </motion.div>
      </div>

      <div className="space-y-4">
        {scans.map((scan, index) => (
          <motion.div
            key={scan.id}
            className="relative p-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Scan Info */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="font-semibold">{scan.target}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full bg-${typeColors[scan.type]}-400/20 text-${typeColors[scan.type]}-400`}>
                      {scan.type}
                    </span>
                    <Clock className="w-3 h-3" />
                    {Math.floor(scan.elapsed / 60)}m {scan.elapsed % 60}s
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{Math.round(scan.progress)}%</div>
                <div className="text-xs text-gray-400">{scan.findings} findings</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${scan.progress}%`,
                  background: 'linear-gradient(90deg, #00FFFF, #0096FF)',
                  boxShadow: '0 0 20px rgba(0,255,255,0.5)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${scan.progress}%` }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>

            {/* Scanning animation */}
            {scan.status === 'running' && (
              <motion.div
                className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </GlassmorphicCard>
  );
}
