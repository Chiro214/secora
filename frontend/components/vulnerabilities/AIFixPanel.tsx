'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Code, CheckCircle, Copy, Check } from 'lucide-react';

interface Vulnerability {
  name: string;
  type: string;
  description: string;
  fix: string;
}

interface AIFixPanelProps {
  vulnerability: Vulnerability;
}

export default function AIFixPanel({ vulnerability }: AIFixPanelProps) {
  const [activeTab, setActiveTab] = useState<'fix' | 'code' | 'steps'>('fix');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeExample = `// Before (Vulnerable)
app.post('/login', (req, res) => {
  const query = \`SELECT * FROM users WHERE username='\${req.body.username}' AND password='\${req.body.password}'\`;
  db.query(query, (err, results) => {
    // Process results
  });
});

// After (Secure)
app.post('/login', (req, res) => {
  const query = 'SELECT * FROM users WHERE username=? AND password=?';
  db.query(query, [req.body.username, req.body.password], (err, results) => {
    // Process results
  });
});`;

  const steps = [
    {
      title: 'Use Parameterized Queries',
      description: 'Replace string concatenation with parameterized queries to prevent SQL injection',
      priority: 'Critical'
    },
    {
      title: 'Input Validation',
      description: 'Implement strict input validation and sanitization for all user inputs',
      priority: 'High'
    },
    {
      title: 'Least Privilege Principle',
      description: 'Ensure database user has minimal required permissions',
      priority: 'Medium'
    },
    {
      title: 'Error Handling',
      description: 'Implement proper error handling without exposing sensitive information',
      priority: 'Medium'
    },
    {
      title: 'Security Testing',
      description: 'Add automated security tests to CI/CD pipeline',
      priority: 'High'
    }
  ];

  return (
    <div className="space-y-4">
      {/* AI Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 text-purple-400"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-5 h-5" />
        </motion.div>
        <span className="text-sm font-semibold">AI-Powered Analysis</span>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-cyan-500/30">
        {[
          { id: 'fix', label: 'Quick Fix', icon: CheckCircle },
          { id: 'code', label: 'Code Example', icon: Code },
          { id: 'steps', label: 'Action Steps', icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'fix' && (
          <motion.div
            key="fix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-green-400 font-semibold mb-2">Recommended Fix</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {vulnerability.fix}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-400 font-semibold mb-2 text-sm">Why This Works</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Parameterized queries separate SQL code from data, preventing attackers from 
                injecting malicious SQL commands. The database treats user input as data only, 
                not as executable code.
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-400 font-semibold mb-2 text-sm">⚡ Quick Win</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                This fix can be implemented in under 30 minutes and will immediately eliminate 
                the SQL injection vulnerability.
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === 'code' && (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="relative">
              <button
                onClick={() => handleCopy(codeExample)}
                className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors z-10"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
              
              <pre className="bg-slate-950 border border-cyan-500/20 rounded-lg p-4 overflow-x-auto text-xs">
                <code className="text-cyan-300 font-mono">
                  {codeExample}
                </code>
              </pre>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <p>
                This code example shows the vulnerable pattern and the secure implementation. 
                Notice how parameterized queries use placeholders (?) instead of string concatenation.
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === 'steps' && (
          <motion.div
            key="steps"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center text-cyan-300 text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-white font-semibold text-sm">{step.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        step.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                        step.priority === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      }`}>
                        {step.priority}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Fix Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        Generate Auto-Fix PR
      </motion.button>
    </div>
  );
}
