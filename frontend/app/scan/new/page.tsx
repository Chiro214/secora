'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DomainInput from '@/components/scan/DomainInput';
import ScanTypeSelector from '@/components/scan/ScanTypeSelector';
import ModuleSelector from '@/components/scan/ModuleSelector';
import ScanConfirmation from '@/components/scan/ScanConfirmation';

const steps = [
  { id: 1, name: 'Target', icon: '🎯' },
  { id: 2, name: 'Scan Type', icon: '⚡' },
  { id: 3, name: 'Modules', icon: '🔧' },
  { id: 4, name: 'Confirm', icon: '✓' }
];

export default function NewScanPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [scanData, setScanData] = useState({
    domain: '',
    scanType: '',
    modules: [] as string[],
  });

  const updateScanData = (key: string, value: any) => {
    setScanData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const startScan = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanData),
      });
      const data = await response.json();
      router.push(`/scan/${data.scanId}`);
    } catch (error) {
      console.error('Failed to start scan:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8">
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Initialize Security Scan
          </h1>
          <p className="text-cyan-300/70 text-lg">Configure your vulnerability assessment parameters</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-16 relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 -translate-y-1/2" />
          
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              className="relative z-10 flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3 transition-all duration-300 ${
                  currentStep === step.id
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/50 scale-110'
                    : currentStep > step.id
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                    : 'bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30'
                }`}
                animate={{
                  boxShadow: currentStep === step.id
                    ? ['0 0 20px rgba(6, 182, 212, 0.5)', '0 0 40px rgba(6, 182, 212, 0.8)', '0 0 20px rgba(6, 182, 212, 0.5)']
                    : 'none'
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {step.icon}
              </motion.div>
              <span className={`text-sm font-medium ${
                currentStep >= step.id ? 'text-cyan-300' : 'text-slate-500'
              }`}>
                {step.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Step Content */}
        <motion.div
          className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <DomainInput
                key="step1"
                domain={scanData.domain}
                onUpdate={(domain) => updateScanData('domain', domain)}
                onNext={nextStep}
              />
            )}
            {currentStep === 2 && (
              <ScanTypeSelector
                key="step2"
                selectedType={scanData.scanType}
                onUpdate={(type) => updateScanData('scanType', type)}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 3 && (
              <ModuleSelector
                key="step3"
                selectedModules={scanData.modules}
                onUpdate={(modules) => updateScanData('modules', modules)}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 4 && (
              <ScanConfirmation
                key="step4"
                scanData={scanData}
                onStart={startScan}
                onBack={prevStep}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
