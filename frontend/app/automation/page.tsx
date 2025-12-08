'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Terminal, Activity, Settings, Briefcase, Zap } from 'lucide-react';
import { CyberGrid } from '@/components/3d/CyberGrid';
import { BotAvatar } from '@/components/bot/BotAvatar';
import { CommandConsole } from '@/components/bot/CommandConsole';
import { StatusLogs } from '@/components/bot/StatusLogs';
import { RulesEditor } from '@/components/bot/RulesEditor';
import { JobPipeline } from '@/components/bot/JobPipeline';
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard';

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState<'console' | 'rules' | 'jobs' | 'logs'>('console');

  const tabs = [
    { id: 'console', label: 'Command Console', icon: Terminal },
    { id: 'rules', label: 'Automation Rules', icon: Settings },
    { id: 'jobs', label: 'Job Pipeline', icon: Briefcase },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <CyberGrid />

      <div className="relative z-10 p-6 max-w-[1920px] mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <Bot className="w-10 h-10 text-cyan-400" style={{
              filter: 'drop-shadow(0 0 20px rgba(0,255,255,0.6))',
            }} />
            <div>
              <h1 className="text-4xl font-bold" style={{
                textShadow: '0 0 20px rgba(0,255,255,0.5)',
              }}>
                AI Automation Bot
              </h1>
              <p className="text-cyan-400/70">Intelligent security automation & job application assistant</p>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex gap-4">
            <StatusIndicator label="Bot Status" value="Online" color="green" />
            <StatusIndicator label="Active Rules" value="12" color="cyan" />
            <StatusIndicator label="Jobs Applied" value="47" color="purple" />
            <StatusIndicator label="Auto-Fixes" value="23" color="yellow" />
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Bot Avatar */}
          <div className="col-span-12 lg:col-span-4">
            <BotAvatar />
          </div>

          {/* Right: Tabs Content */}
          <div className="col-span-12 lg:col-span-8">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border backdrop-blur-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-cyan-400/50'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'console' && <CommandConsole />}
              {activeTab === 'rules' && <RulesEditor />}
              {activeTab === 'jobs' && <JobPipeline />}
              {activeTab === 'logs' && <StatusLogs />}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIndicator({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = {
    green: 'text-green-400 border-green-400/30 bg-green-400/10',
    cyan: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
    purple: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    yellow: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  };

  return (
    <motion.div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border backdrop-blur-xl ${colors[color as keyof typeof colors]}`}
      whileHover={{ scale: 1.05 }}
    >
      <Zap className="w-4 h-4" />
      <div>
        <div className="text-xs opacity-70">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </motion.div>
  );
}
