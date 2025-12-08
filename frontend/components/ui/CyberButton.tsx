'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface CyberButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

export function CyberButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  className = '',
}: CyberButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400',
    secondary: 'bg-white/5 text-cyan-400 border-cyan-400/50',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-400',
    ghost: 'bg-transparent text-cyan-400 border-cyan-400/30',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden rounded-lg border-2
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        font-semibold tracking-wide
        transition-all duration-300
        ${className}
      `}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.3), transparent)',
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />

      {/* Neon pulse on hover */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        animate={{
          boxShadow: [
            '0 0 10px rgba(0,255,255,0.3)',
            '0 0 20px rgba(0,255,255,0.6)',
            '0 0 10px rgba(0,255,255,0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 justify-center">
        {Icon && <Icon className="w-5 h-5" />}
        {children}
      </span>
    </motion.button>
  );
}
