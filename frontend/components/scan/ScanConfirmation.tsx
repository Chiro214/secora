'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface ScanConfirmationProps {
  scanData: {
    domain: string;
    scanType: string;
    modules: string[];
  };
  onStart: () => void;
  onBack: () => void;
}

const scanTypeNames: Record<string, string> = {
  quick: 'Quick Scan',
  deep: 'Deep Scan',
  'zero-day': 'Zero-Day Hunter',
  continuous: 'Continuous Monitor'
};

const moduleNames: Record<string, string> = {
  sqli: 'SQL Injection',
  xss: 'Cross-Site Scripting',
  csrf: 'CSRF Protection',
  auth: 'Authentication Bypass',
  rce: 'Remote Code Execution',
  lfi: 'Local File Inclusion',
  xxe: 'XML External Entity',
  ssrf: 'Server-Side Request Forgery',
  idor: 'Insecure Direct Object Reference',
  headers: 'Security Headers',
  ssl: 'SSL/TLS Configuration',
  api: 'API Security'
};

export default function ScanConfirmation({ scanData, onStart, onBack }: ScanConfirmationProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate startup
    onStart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-3xl font-bold text-cyan-300 mb-2">Confirm Scan Configuration</h2>
        <p className="text-slate-400">Review your settings before initiating the security scan</p>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-4">
        {/* Target Domain */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎯</span>
            <h3 className="text-white font-semibold">Target Domain</h3>
          </div>
          <p className="text-cyan-300 text-lg font-mono ml-11">{scanData.domain}</p>
        </div>

        {/* Scan Type */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚡</span>
            <h3 className="text-white font-semibold">Scan Type</h3>
          </div>
          <p className="text-cyan-300 text-lg ml-11">{scanTypeNames[scanData.scanType] || scanData.scanType}</p>
        </div>

        {/* Attack Modules */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔧</span>
            <h3 className="text-white font-semibold">Attack Modules</h3>
            <span className="ml-auto text-cyan-300 text-sm">
              {scanData.modules.length} selected
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 ml-11">
            {scanData.modules.map((moduleId) => (
              <div
                key={moduleId}
                className="flex items-center gap-2 text-slate-300 text-sm"
              >
                <span className="text-cyan-400">✓</span>
                <span>{moduleNames[moduleId] || moduleId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      <motion.div
        className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4"
        animate={{
          borderColor: ['rgba(245, 158, 11, 0.5)', 'rgba(245, 158, 11, 0.8)', 'rgba(245, 158, 11, 0.5)']
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="text-amber-300 font-semibold mb-1">Important Notice</h4>
            <p className="text-amber-200/80 text-sm">
              Only scan domains you own or have explicit permission to test. 
              Unauthorized security testing may be illegal and could result in serious consequences.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Start Animation */}
      {isStarting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-lg p-6 text-center"
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            🚀
          </motion.div>
          <h3 className="text-2xl font-bold text-cyan-300 mb-2">Initializing Scan...</h3>
          <p className="text-slate-400">Preparing attack vectors and security probes</p>
          
          <div className="mt-4 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-cyan-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      {!isStarting && (
        <div className="flex justify-between pt-4">
          <motion.button
            onClick={onBack}
            className="px-8 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Back
          </motion.button>

          <motion.button
            onClick={handleStart}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-green-500/50 hover:shadow-green-500/70 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(34, 197, 94, 0.5)',
                '0 0 40px rgba(34, 197, 94, 0.8)',
                '0 0 20px rgba(34, 197, 94, 0.5)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🚀 Start Scan
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
