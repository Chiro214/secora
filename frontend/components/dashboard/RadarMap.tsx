'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard';

export function RadarMap() {
  const [attacks, setAttacks] = useState<Array<{ id: number; x: number; y: number; severity: string }>>([]);

  useEffect(() => {
    // Simulate incoming attacks
    const interval = setInterval(() => {
      const newAttack = {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      };
      setAttacks(prev => [...prev.slice(-20), newAttack]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const severityColors = {
    low: '#00FF9D',
    medium: '#FFB800',
    high: '#FF6B00',
    critical: '#FF0055',
  };

  return (
    <GlassmorphicCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">Attack Source Radar</h2>
        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-green-400/20 text-green-400">Live</span>
          <span className="text-xs px-2 py-1 rounded-full bg-cyan-400/20 text-cyan-400">3D View</span>
        </div>
      </div>

      <div className="relative w-full aspect-square max-w-2xl mx-auto">
        {/* Radar circles */}
        {[1, 2, 3, 4].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 rounded-full border border-cyan-400/20"
            style={{
              width: `${ring * 25}%`,
              height: `${ring * 25}%`,
              top: `${50 - ring * 12.5}%`,
              left: `${50 - ring * 12.5}%`,
            }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: ring * 0.2 }}
          />
        ))}

        {/* Scanning ray */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
          style={{
            background: 'linear-gradient(90deg, rgba(0,255,255,0.8), transparent)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Attack points */}
        {attacks.map((attack) => (
          <motion.div
            key={attack.id}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${attack.x}%`,
              top: `${attack.y}%`,
              backgroundColor: severityColors[attack.severity as keyof typeof severityColors],
              boxShadow: `0 0 20px ${severityColors[attack.severity as keyof typeof severityColors]}`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0.7] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        ))}

        {/* Center point */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            className="w-4 h-4 rounded-full bg-cyan-400"
            animate={{
              boxShadow: [
                '0 0 10px rgba(0,255,255,0.5)',
                '0 0 30px rgba(0,255,255,1)',
                '0 0 10px rgba(0,255,255,0.5)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-6">
        {Object.entries(severityColors).map(([severity, color]) => (
          <div key={severity} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs capitalize text-gray-400">{severity}</span>
          </div>
        ))}
      </div>
    </GlassmorphicCard>
  );
}
