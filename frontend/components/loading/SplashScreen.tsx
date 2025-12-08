'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check if splash was already shown in this session
    const splashShown = sessionStorage.getItem('splashShown');
    
    if (splashShown) {
      setIsVisible(false);
      return;
    }

    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsVisible(false);
            sessionStorage.setItem('splashShown', 'true');
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[10000] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center"
        >
          {/* Animated Background Grid */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'gridMove 20s linear infinite'
            }} />
          </div>

          {/* Logo and Animation */}
          <div className="relative z-10 text-center">
            {/* 3D Shield Logo */}
            <motion.div
              initial={{ scale: 0, rotateY: 0 }}
              animate={{ scale: 1, rotateY: 360 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="relative w-32 h-32 mx-auto mb-8"
            >
              {/* Shield */}
              <svg viewBox="0 0 100 120" className="w-full h-full">
                <defs>
                  <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Shield Shape */}
                <path
                  d="M50 10 L90 30 L90 60 Q90 90 50 110 Q10 90 10 60 L10 30 Z"
                  fill="url(#shieldGradient)"
                  filter="url(#glow)"
                  opacity="0.9"
                />
                
                {/* Lock Icon */}
                <rect x="40" y="50" width="20" height="25" rx="2" fill="white" opacity="0.9"/>
                <path
                  d="M35 50 L35 45 Q35 35 50 35 Q65 35 65 45 L65 50"
                  stroke="white"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.9"
                />
                <circle cx="50" cy="62" r="3" fill="#06B6D4"/>
              </svg>

              {/* Orbiting Particles */}
              {[0, 120, 240].map((angle, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-cyan-400 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    x: [
                      Math.cos((angle * Math.PI) / 180) * 60,
                      Math.cos(((angle + 360) * Math.PI) / 180) * 60,
                    ],
                    y: [
                      Math.sin((angle * Math.PI) / 180) * 60,
                      Math.sin(((angle + 360) * Math.PI) / 180) * 60,
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              ))}
            </motion.div>

            {/* SECORA Text */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
            >
              SECORA
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-cyan-300/70 text-lg mb-8"
            >
              Security Orchestration & Response Automation
            </motion.p>

            {/* Progress Bar */}
            <div className="w-64 mx-auto">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="text-cyan-400 text-sm mt-3"
              >
                Initializing Security Systems...
              </motion.p>
            </div>
          </div>

          <style jsx>{`
            @keyframes gridMove {
              0% { transform: translateY(0); }
              100% { transform: translateY(50px); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
