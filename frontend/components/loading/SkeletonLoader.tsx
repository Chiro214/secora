'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'circle' | 'rectangle';
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonLoader({ 
  variant = 'rectangle', 
  width = '100%', 
  height = '20px',
  className = '' 
}: SkeletonLoaderProps) {
  const baseClasses = 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse';
  
  const variantClasses = {
    card: 'rounded-xl',
    text: 'rounded',
    circle: 'rounded-full',
    rectangle: 'rounded-lg'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    >
      <div className="w-full h-full bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-shimmer" />
    </motion.div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6">
      <SkeletonLoader variant="text" width="60%" height="24px" className="mb-4" />
      <SkeletonLoader variant="text" width="100%" height="16px" className="mb-2" />
      <SkeletonLoader variant="text" width="80%" height="16px" className="mb-4" />
      <SkeletonLoader variant="rectangle" width="100%" height="200px" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-4">
            <SkeletonLoader variant="text" width="40%" height="16px" className="mb-2" />
            <SkeletonLoader variant="text" width="60%" height="32px" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
