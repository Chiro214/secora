'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CVSSMeterProps {
  score: number;
  severity: string;
}

export default function CVSSMeter({ score, severity }: CVSSMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = () => {
    if (score >= 9.0) return { primary: '#EF4444', secondary: '#DC2626' };
    if (score >= 7.0) return { primary: '#F97316', secondary: '#EA580C' };
    if (score >= 4.0) return { primary: '#EAB308', secondary: '#CA8A04' };
    return { primary: '#3B82F6', secondary: '#2563EB' };
  };

  const colors = getColor();
  const percentage = (score / 10) * 100;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      {/* Radial Meter */}
      <div className="relative w-48 h-48 mb-6">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r="90"
            fill="none"
            stroke="rgba(15, 23, 42, 0.5)"
            strokeWidth="12"
          />
          
          {/* Animated progress circle */}
          <motion.circle
            cx="96"
            cy="96"
            r="90"
            fill="none"
            stroke={`url(#gradient-${severity})`}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
              filter: `drop-shadow(0 0 10px ${colors.primary})`
            }}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gradient-${severity}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="text-5xl font-bold"
            style={{ color: colors.primary }}
          >
            {animatedScore.toFixed(1)}
          </motion.div>
          <div className="text-slate-400 text-sm mt-1">/ 10.0</div>
        </div>

        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              `0 0 20px ${colors.primary}40`,
              `0 0 40px ${colors.primary}60`,
              `0 0 20px ${colors.primary}40`
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Severity Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className={`px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider`}
        style={{
          backgroundColor: `${colors.primary}20`,
          color: colors.primary,
          border: `2px solid ${colors.primary}50`
        }}
      >
        {severity}
      </motion.div>

      {/* Score Breakdown */}
      <div className="w-full mt-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Attack Vector</span>
          <span className="text-cyan-300">Network</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Attack Complexity</span>
          <span className="text-cyan-300">Low</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Privileges Required</span>
          <span className="text-cyan-300">None</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">User Interaction</span>
          <span className="text-cyan-300">None</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Scope</span>
          <span className="text-cyan-300">Changed</span>
        </div>
      </div>

      {/* Impact Metrics */}
      <div className="w-full mt-6 space-y-2">
        <div className="text-xs text-slate-400 mb-3">Impact Metrics</div>
        
        {['Confidentiality', 'Integrity', 'Availability'].map((metric, index) => (
          <div key={metric}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{metric}</span>
              <span className="text-red-400">High</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                transition={{ delay: 1 + index * 0.1, duration: 0.8 }}
                className="h-full bg-gradient-to-r from-red-500 to-orange-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
