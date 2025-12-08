'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scan, Sparkles, Globe, FileText, Bell, Settings, Bot, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    { 
      icon: Scan, 
      label: 'Start New Scan', 
      description: 'Launch security scan',
      color: 'cyan',
      gradient: 'from-cyan-500 to-blue-500',
      onClick: () => router.push('/scan/new'),
    },
    { 
      icon: Sparkles, 
      label: 'AI Fix Suggestions', 
      description: 'Get automated fixes',
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500',
      onClick: () => router.push('/automation'),
    },
    { 
      icon: Globe, 
      label: 'Vulnerability Explorer', 
      description: 'View 3D threat map',
      color: 'green',
      gradient: 'from-green-500 to-emerald-500',
      onClick: () => router.push('/vulnerabilities'),
    },
    { 
      icon: FileText, 
      label: 'View Reports', 
      description: 'Access scan reports',
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-500',
      onClick: () => router.push('/reports'),
    },
    { 
      icon: Bot, 
      label: 'Automation Bot', 
      description: 'Configure AI bot',
      color: 'magenta',
      gradient: 'from-pink-500 to-rose-500',
      onClick: () => router.push('/automation'),
    },
    { 
      icon: Bell, 
      label: 'Configure Alerts', 
      description: 'Manage notifications',
      color: 'yellow',
      gradient: 'from-yellow-500 to-orange-500',
      onClick: () => router.push('/settings'),
    },
  ];

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">Quick Actions</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <motion.button
              key={action.label}
              className="relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
            >
              {/* Gradient background on hover */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-20 transition-opacity`}
              />

              {/* Animated border */}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                  boxShadow: [
                    '0 0 0px rgba(0,255,255,0)',
                    '0 0 20px rgba(0,255,255,0.3)',
                    '0 0 0px rgba(0,255,255,0)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
                
                <h3 className="font-semibold text-sm mb-1">{action.label}</h3>
                <p className="text-xs text-gray-400">{action.description}</p>
              </div>

              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />

              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
