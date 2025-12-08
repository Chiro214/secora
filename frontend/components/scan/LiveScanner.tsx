'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveScannerProps {
  scanId: string;
}

interface ScanProgress {
  phase: string;
  progress: number;
  currentModule: string;
  payloadsAttempted: number;
  vulnerabilitiesFound: number;
  threatsDetected: number;
}

export default function LiveScanner({ scanId }: LiveScannerProps) {
  const [progress, setProgress] = useState<ScanProgress>({
    phase: 'Initializing',
    progress: 0,
    currentModule: 'System Check',
    payloadsAttempted: 0,
    vulnerabilitiesFound: 0,
    threatsDetected: 0
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [activePayloads, setActivePayloads] = useState<Array<{ id: number; payload: string }>>([]);

  useEffect(() => {
    // Simulate real-time scan progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev.progress + Math.random() * 5, 100);
        const phases = ['Initializing', 'Reconnaissance', 'Vulnerability Scanning', 'Exploitation', 'Analysis', 'Complete'];
        const phaseIndex = Math.floor(newProgress / 20);
        
        return {
          ...prev,
          progress: newProgress,
          phase: phases[Math.min(phaseIndex, phases.length - 1)],
          payloadsAttempted: prev.payloadsAttempted + Math.floor(Math.random() * 10),
          vulnerabilitiesFound: prev.vulnerabilitiesFound + (Math.random() > 0.95 ? 1 : 0),
          threatsDetected: prev.threatsDetected + (Math.random() > 0.98 ? 1 : 0)
        };
      });

      // Add random logs
      const logMessages = [
        '🔍 Scanning endpoint: /api/users',
        '💉 Testing SQL injection vectors',
        '🎭 Probing for XSS vulnerabilities',
        '🔐 Analyzing authentication mechanisms',
        '🌐 Checking CORS configuration',
        '📋 Validating security headers',
        '🔒 Testing SSL/TLS configuration',
        '⚠️ Potential vulnerability detected',
        '✓ Endpoint secured',
        '🚨 Critical vulnerability found!'
      ];
      
      if (Math.random() > 0.7) {
        const newLog = logMessages[Math.floor(Math.random() * logMessages.length)];
        setLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${newLog}`]);
      }

      // Add active payloads
      if (Math.random() > 0.6) {
        const payloads = [
          "' OR '1'='1",
          '<script>alert(1)</script>',
          '../../../etc/passwd',
          '${7*7}',
          'admin\' --',
          'UNION SELECT * FROM users'
        ];
        const newPayload = {
          id: Date.now(),
          payload: payloads[Math.floor(Math.random() * payloads.length)]
        };
        setActivePayloads(prev => [...prev.slice(-5), newPayload]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-cyan-400 text-sm mb-1">Progress</div>
          <div className="text-3xl font-bold text-white">{progress.progress.toFixed(1)}%</div>
        </motion.div>

        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-blue-400 text-sm mb-1">Payloads</div>
          <div className="text-3xl font-bold text-white">{progress.payloadsAttempted}</div>
        </motion.div>

        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm border border-amber-500/30 rounded-lg p-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-amber-400 text-sm mb-1">Vulnerabilities</div>
          <div className="text-3xl font-bold text-white">{progress.vulnerabilitiesFound}</div>
        </motion.div>

        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm border border-red-500/30 rounded-lg p-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-red-400 text-sm mb-1">Threats</div>
          <div className="text-3xl font-bold text-white">{progress.threatsDetected}</div>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold text-cyan-300">{progress.phase}</h3>
          <span className="text-slate-400 text-sm">{progress.currentModule}</span>
        </div>
        
        <div className="relative h-4 bg-slate-900 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Active Payloads */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Active Payloads</h3>
        <div className="space-y-2 h-32 overflow-hidden">
          <AnimatePresence>
            {activePayloads.map((payload) => (
              <motion.div
                key={payload.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-slate-900/50 border border-cyan-500/20 rounded px-4 py-2 font-mono text-sm text-cyan-300"
              >
                💉 {payload.payload}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Live Logs */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Live Activity Log</h3>
        <div className="bg-slate-900/80 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm custom-scrollbar">
          <AnimatePresence>
            {logs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-cyan-300/80 mb-1"
              >
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
