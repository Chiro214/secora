'use client';

import { motion } from 'framer-motion';

interface ScanType {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  color: string;
}

const scanTypes: ScanType[] = [
  {
    id: 'quick',
    name: 'Quick Scan',
    description: 'Fast vulnerability check covering common attack vectors',
    duration: '5-10 minutes',
    icon: '⚡',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    id: 'deep',
    name: 'Deep Scan',
    description: 'Comprehensive analysis with extensive payload testing',
    duration: '30-60 minutes',
    icon: '🔍',
    color: 'from-blue-500 to-purple-500'
  },
  {
    id: 'zero-day',
    name: 'Zero-Day Hunter',
    description: 'Advanced AI-powered detection for unknown vulnerabilities',
    duration: '1-2 hours',
    icon: '🎯',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'continuous',
    name: 'Continuous Monitor',
    description: 'Ongoing surveillance with automated rescanning',
    duration: 'Continuous',
    icon: '🔄',
    color: 'from-green-500 to-emerald-500'
  }
];

interface ScanTypeSelectorProps {
  selectedType: string;
  onUpdate: (type: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ScanTypeSelector({ selectedType, onUpdate, onNext, onBack }: ScanTypeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-3xl font-bold text-cyan-300 mb-2">Select Scan Type</h2>
        <p className="text-slate-400">Choose the depth and intensity of your security assessment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scanTypes.map((type, index) => (
          <motion.button
            key={type.id}
            onClick={() => onUpdate(type.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative p-6 rounded-xl border-2 transition-all text-left ${
              selectedType === type.id
                ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/30'
                : 'border-slate-700 bg-slate-800/30 hover:border-cyan-500/50 hover:bg-slate-800/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Glow Effect */}
            {selectedType === type.id && (
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${type.color} opacity-20 rounded-xl blur-xl`}
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            <div className="relative">
              {/* Icon */}
              <div className={`text-4xl mb-3 ${selectedType === type.id ? 'animate-bounce' : ''}`}>
                {type.icon}
              </div>

              {/* Name */}
              <h3 className="text-xl font-bold text-white mb-2">{type.name}</h3>

              {/* Description */}
              <p className="text-slate-400 text-sm mb-3">{type.description}</p>

              {/* Duration */}
              <div className="flex items-center gap-2 text-cyan-300 text-sm">
                <span>⏱️</span>
                <span>{type.duration}</span>
              </div>

              {/* Selected Indicator */}
              {selectedType === type.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/50"
                >
                  ✓
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
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
          disabled={!selectedType}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            selectedType
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
          whileHover={selectedType ? { scale: 1.05 } : {}}
          whileTap={selectedType ? { scale: 0.95 } : {}}
        >
          Next Step →
        </motion.button>
      </div>
    </motion.div>
  );
}
