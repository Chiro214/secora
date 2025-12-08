'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface DomainInputProps {
  domain: string;
  onUpdate: (domain: string) => void;
  onNext: () => void;
}

export default function DomainInput({ domain, onUpdate, onNext }: DomainInputProps) {
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');

  const validateDomain = (value: string) => {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    const urlRegex = /^https?:\/\//i;
    
    if (!value) {
      setError('');
      setIsValid(false);
      return false;
    }
    
    if (urlRegex.test(value)) {
      setError('Enter domain only (without http:// or https://)');
      setIsValid(false);
      return false;
    }
    
    if (!domainRegex.test(value)) {
      setError('Invalid domain format');
      setIsValid(false);
      return false;
    }
    
    setError('');
    setIsValid(true);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onUpdate(value);
    validateDomain(value);
  };

  const handleNext = () => {
    if (isValid) {
      onNext();
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
        <h2 className="text-3xl font-bold text-cyan-300 mb-2">Target Domain</h2>
        <p className="text-slate-400">Enter the domain you want to scan for vulnerabilities</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg blur-xl"
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <input
            type="text"
            value={domain}
            onChange={handleChange}
            placeholder="example.com"
            className="relative w-full px-6 py-4 bg-slate-900/80 backdrop-blur-sm border-2 border-cyan-500/50 rounded-lg text-white text-lg focus:outline-none focus:border-cyan-400 transition-all placeholder:text-slate-500"
            autoFocus
          />
          
          {isValid && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 text-2xl"
            >
              ✓
            </motion.div>
          )}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm flex items-center gap-2"
          >
            <span>⚠️</span> {error}
          </motion.p>
        )}

        {isValid && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-400 text-sm flex items-center gap-2"
          >
            <span>✓</span> Valid domain detected
          </motion.div>
        )}
      </div>

      {/* Examples */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-4">
        <p className="text-slate-400 text-sm mb-2">Examples:</p>
        <div className="flex flex-wrap gap-2">
          {['example.com', 'api.example.com', 'subdomain.example.org'].map((ex) => (
            <button
              key={ex}
              onClick={() => {
                onUpdate(ex);
                validateDomain(ex);
              }}
              className="px-3 py-1 bg-slate-700/50 hover:bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-300 text-sm transition-all"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <motion.button
          onClick={handleNext}
          disabled={!isValid}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            isValid
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
          whileHover={isValid ? { scale: 1.05 } : {}}
          whileTap={isValid ? { scale: 0.95 } : {}}
        >
          Next Step →
        </motion.button>
      </div>
    </motion.div>
  );
}
