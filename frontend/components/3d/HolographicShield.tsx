'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export function HolographicShield() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer rotating ring */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full border-2 border-primary/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-[0_0_20px_rgba(75,163,255,0.8)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-secondary shadow-[0_0_20px_rgba(147,51,234,0.8)]" />
      </motion.div>

      {/* Middle rotating ring */}
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-full border-2 border-secondary/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_15px_rgba(75,163,255,0.8)]" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 rounded-full bg-secondary shadow-[0_0_15px_rgba(147,51,234,0.8)]" />
      </motion.div>

      {/* Inner pulsing circle */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Shield icon */}
      <motion.div
        className="relative z-10"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative">
          <Shield className="w-32 h-32 text-primary drop-shadow-[0_0_30px_rgba(75,163,255,0.6)]" strokeWidth={1.5} />
          
          {/* Scanning ray effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-transparent"
            animate={{
              y: ['-100%', '200%'],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ mixBlendMode: 'screen' }}
          />
        </div>
      </motion.div>

      {/* Floating data points */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary"
          style={{
            left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 8)}%`,
            top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 8)}%`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}
