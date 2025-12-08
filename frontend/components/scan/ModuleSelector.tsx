'use client';

import { motion } from 'framer-motion';

interface AttackModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  severity: 'critical' | 'high' | 'medium';
  recommended: boolean;
}

const modules: AttackModule[] = [
  {
    id: 'sqli',
    name: 'SQL Injection',
    description: 'Test for database injection vulnerabilities',
    icon: '💉',
    severity: 'critical',
    recommended: true
  },
  {
    id: 'xss',
    name: 'Cross-Site Scripting',
    description: 'Detect XSS vulnerabilities in web applications',
    icon: '🎭',
    severity: 'high',
    recommended: true
  },
  {
    id: 'csrf',
    name: 'CSRF Protection',
    description: 'Check for Cross-Site Request Forgery flaws',
    icon: '🔐',
    severity: 'high',
    recommended: true
  },
  {
    id: 'auth',
    name: 'Authentication Bypass',
    description: 'Test authentication and authorization mechanisms',
    icon: '🚪',
    severity: 'critical',
    recommended: true
  },
  {
    id: 'rce',
    name: 'Remote Code Execution',
    description: 'Identify command injection and RCE vulnerabilities',
    icon: '💻',
    severity: 'critical',
    recommended: true
  },
  {
    id: 'lfi',
    name: 'Local File Inclusion',
    description: 'Test for file inclusion vulnerabilities',
    icon: '📁',
    severity: 'high',
    recommended: false
  },
  {
    id: 'xxe',
    name: 'XML External Entity',
    description: 'Check for XXE injection vulnerabilities',
    icon: '📄',
    severity: 'high',
    recommended: false
  },
  {
    id: 'ssrf',
    name: 'Server-Side Request Forgery',
    description: 'Detect SSRF vulnerabilities',
    icon: '🌐',
    severity: 'high',
    recommended: false
  },
  {
    id: 'idor',
    name: 'Insecure Direct Object Reference',
    description: 'Test for IDOR vulnerabilities',
    icon: '🔑',
    severity: 'medium',
    recommended: false
  },
  {
    id: 'headers',
    name: 'Security Headers',
    description: 'Analyze HTTP security headers',
    icon: '📋',
    severity: 'medium',
    recommended: true
  },
  {
    id: 'ssl',
    name: 'SSL/TLS Configuration',
    description: 'Check SSL/TLS security configuration',
    icon: '🔒',
    severity: 'high',
    recommended: true
  },
  {
    id: 'api',
    name: 'API Security',
    description: 'Test REST/GraphQL API endpoints',
    icon: '🔌',
    severity: 'high',
    recommended: false
  }
];

interface ModuleSelectorProps {
  selectedModules: string[];
  onUpdate: (modules: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ModuleSelector({ selectedModules, onUpdate, onNext, onBack }: ModuleSelectorProps) {
  const toggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      onUpdate(selectedModules.filter(id => id !== moduleId));
    } else {
      onUpdate([...selectedModules, moduleId]);
    }
  };

  const selectRecommended = () => {
    const recommended = modules.filter(m => m.recommended).map(m => m.id);
    onUpdate(recommended);
  };

  const selectAll = () => {
    onUpdate(modules.map(m => m.id));
  };

  const clearAll = () => {
    onUpdate([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 border-red-500/50';
      case 'high': return 'text-orange-400 border-orange-500/50';
      case 'medium': return 'text-yellow-400 border-yellow-500/50';
      default: return 'text-slate-400 border-slate-500/50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-3xl font-bold text-cyan-300 mb-2">Attack Modules</h2>
        <p className="text-slate-400">Select vulnerability types to test</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={selectRecommended}
          className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-300 text-sm transition-all"
        >
          ⭐ Recommended
        </button>
        <button
          onClick={selectAll}
          className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm transition-all"
        >
          Select All
        </button>
        <button
          onClick={clearAll}
          className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm transition-all"
        >
          Clear All
        </button>
        <div className="ml-auto text-cyan-300 text-sm flex items-center gap-2">
          <span className="font-semibold">{selectedModules.length}</span>
          <span className="text-slate-400">modules selected</span>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {modules.map((module, index) => {
          const isSelected = selectedModules.includes(module.id);
          return (
            <motion.button
              key={module.id}
              onClick={() => toggleModule(module.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                  : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Recommended Badge */}
              {module.recommended && !isSelected && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-300 text-xs">
                  ⭐
                </div>
              )}

              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-cyan-500/50"
                >
                  ✓
                </motion.div>
              )}

              <div className="flex items-start gap-3">
                <div className="text-2xl">{module.icon}</div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">{module.name}</h3>
                  <p className="text-slate-400 text-xs mb-2">{module.description}</p>
                  <span className={`text-xs px-2 py-0.5 border rounded ${getSeverityColor(module.severity)}`}>
                    {module.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Navigation */}
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
          onClick={onNext}
          disabled={selectedModules.length === 0}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            selectedModules.length > 0
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
          whileHover={selectedModules.length > 0 ? { scale: 1.05 } : {}}
          whileTap={selectedModules.length > 0 ? { scale: 0.95 } : {}}
        >
          Next Step →
        </motion.button>
      </div>
    </motion.div>
  );
}
