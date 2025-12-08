'use client';

import React, { useState } from 'react';
import { CinematicLoader } from '@/components/loading/CinematicLoader';
import { NeonButton } from '@/components/ui/NeonButton';
import { motion } from 'framer-motion';

export default function LoadingDemoPage() {
  const [showLoader, setShowLoader] = useState(true);

  if (showLoader) {
    return (
      <CinematicLoader
        onComplete={() => setShowLoader(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010313] to-[#030720] flex items-center justify-center p-8">
      <motion.div
        className="text-center max-w-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl font-bold text-white mb-6">Loading Complete!</h1>
        <p className="text-[#E8F0FF]/70 mb-8 text-lg">The SECORA loader animation has finished.</p>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <NeonButton onClick={() => setShowLoader(true)} size="lg">
            Show Loader Again
          </NeonButton>
          <NeonButton variant="outline" onClick={() => window.location.href = '/'} size="lg">
            Go to Homepage
          </NeonButton>
        </div>

        <div className="mt-16 p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">Features Included</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-[#E8F0FF]/70">
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl">✨</span>
              <span>3D floating shield logo with letter S</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl">🔮</span>
              <span>Transparent glass sphere with refraction</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl">📦</span>
              <span>8 orbiting 3D cubes with rotations</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl">💎</span>
              <span>Glassmorphism with neon glows</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl">🎨</span>
              <span>Electric blue and violet colors</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl">📊</span>
              <span>Animated progress bar</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl">🌊</span>
              <span>Smooth parallax effects</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl">♾️</span>
              <span>Seamless looping animation</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
