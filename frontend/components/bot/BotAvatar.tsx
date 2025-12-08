'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Cpu, Zap, Brain } from 'lucide-react';
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard';

export function BotAvatar() {
  return (
    <GlassmorphicCard className="p-8 h-full">
      {/* 3D Holographic Bot Avatar */}
      <div className="relative w-full aspect-square max-w-sm mx-auto mb-8">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400" style={{
            boxShadow: '0 0 10px rgba(0,255,255,0.8)',
          }} />
        </motion.div>

        {/* Middle ring */}
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-purple-400/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />

        {/* Central bot icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative">
            <motion.div
              className="w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-xl border-2 border-cyan-400/50 flex items-center justify-center"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(0,255,255,0.3)',
                  '0 0 40px rgba(0,255,255,0.6)',
                  '0 0 20px rgba(0,255,255,0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Bot className="w-16 h-16 text-cyan-400" />
            </motion.div>

            {/* Scanning ray */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent rounded-2xl"
              animate={{ y: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
        </motion.div>

        {/* Floating data points */}
        {[Cpu, Zap, Brain].map((Icon, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 3)}%`,
              top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 3)}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-400/50 flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-4 h-4 text-cyan-400" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bot Info */}
      <div className="text-center space-y-4">
        <h3 className="text-2xl font-bold text-cyan-400">SECORA AI Bot</h3>
        <p className="text-sm text-gray-400">
          Intelligent automation assistant for vulnerability analysis, auto-fixes, and job applications
        </p>

        {/* Capabilities */}
        <div className="space-y-2 text-left">
          {[
            'Analyze vulnerabilities',
            'Auto-apply security fixes',
            'Create remediation tasks',
            'Run automated rescans',
            'Apply for jobs on your behalf',
          ].map((capability, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2 text-sm text-gray-300"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              {capability}
            </motion.div>
          ))}
        </div>
      </div>
    </GlassmorphicCard>
  );
}
