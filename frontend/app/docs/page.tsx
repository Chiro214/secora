'use client';

import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Book, Code, Zap, Shield, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function DocsPage() {
  const sections = [
    {
      icon: Zap,
      title: 'Quick Start',
      description: 'Get started with SECORA in minutes',
      link: '#quickstart'
    },
    {
      icon: Code,
      title: 'API Reference',
      description: 'Complete API documentation',
      link: '#api'
    },
    {
      icon: Shield,
      title: 'Security Best Practices',
      description: 'Learn how to secure your applications',
      link: '#security'
    },
    {
      icon: Terminal,
      title: 'CLI Tools',
      description: 'Command-line interface guide',
      link: '#cli'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-16">
            <Book className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Documentation
            </h1>
            <p className="text-cyan-300/70 text-lg">Everything you need to know about SECORA</p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.a
                  key={section.title}
                  href={section.link}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/50 transition-all group"
                >
                  <Icon className="w-10 h-10 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold text-white mb-2">{section.title}</h3>
                  <p className="text-slate-400">{section.description}</p>
                </motion.a>
              );
            })}
          </div>

          {/* Content */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-cyan-300 mb-6">Getting Started</h2>
            
            <div className="space-y-8 text-slate-300">
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Installation</h3>
                <div className="bg-slate-950 border border-cyan-500/20 rounded-lg p-4 font-mono text-sm">
                  <code className="text-cyan-300">npm install @secora/cli -g</code>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Basic Usage</h3>
                <div className="bg-slate-950 border border-cyan-500/20 rounded-lg p-4 font-mono text-sm space-y-2">
                  <div><code className="text-cyan-300">secora scan example.com</code></div>
                  <div><code className="text-slate-500"># Scan a domain</code></div>
                  <div className="mt-4"><code className="text-cyan-300">secora report --format pdf</code></div>
                  <div><code className="text-slate-500"># Generate PDF report</code></div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3">API Authentication</h3>
                <p className="mb-3">All API requests require an API key in the header:</p>
                <div className="bg-slate-950 border border-cyan-500/20 rounded-lg p-4 font-mono text-sm">
                  <code className="text-cyan-300">Authorization: Bearer YOUR_API_KEY</code>
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-6">
                <h4 className="text-cyan-300 font-semibold mb-2">📚 Full Documentation</h4>
                <p className="text-sm">
                  For complete documentation, visit our{' '}
                  <Link href="https://docs.secora.security" className="text-cyan-400 hover:underline">
                    documentation portal
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
