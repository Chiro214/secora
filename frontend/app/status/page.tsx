'use client';

import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: string;
  responseTime: string;
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway', status: 'operational', uptime: '99.99%', responseTime: '45ms' },
    { name: 'Scan Engine', status: 'operational', uptime: '99.98%', responseTime: '120ms' },
    { name: 'AI Analysis', status: 'operational', uptime: '99.95%', responseTime: '850ms' },
    { name: 'Database', status: 'operational', uptime: '100%', responseTime: '12ms' },
    { name: 'CDN', status: 'operational', uptime: '99.99%', responseTime: '8ms' },
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'down':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'border-green-500/50 bg-green-500/10';
      case 'degraded':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'down':
        return 'border-red-500/50 bg-red-500/10';
      default:
        return 'border-slate-500/50 bg-slate-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <Activity className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              System Status
            </h1>
            <motion.div
              className="inline-flex items-center gap-2 text-green-400 text-lg"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              All Systems Operational
            </motion.div>
          </div>

          {/* Overall Status */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">99.98%</div>
                <div className="text-slate-400 text-sm">Uptime (30 days)</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">156ms</div>
                <div className="text-slate-400 text-sm">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">0</div>
                <div className="text-slate-400 text-sm">Incidents (7 days)</div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            {services.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-slate-900/40 backdrop-blur-xl border-2 rounded-xl p-6 ${getStatusColor(service.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(service.status)}
                    <div>
                      <h3 className="text-white font-semibold text-lg">{service.name}</h3>
                      <p className="text-slate-400 text-sm capitalize">{service.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-300 font-semibold">{service.uptime}</div>
                    <div className="text-slate-400 text-sm">{service.responseTime}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Incident History */}
          <div className="mt-12 bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-cyan-300 mb-6">Recent Incidents</h2>
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-slate-400">No incidents in the past 30 days</p>
            </div>
          </div>

          {/* Subscribe */}
          <div className="mt-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6 text-center">
            <h3 className="text-white font-semibold mb-2">Get Status Updates</h3>
            <p className="text-slate-400 text-sm mb-4">Subscribe to receive notifications about system status</p>
            <button className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors">
              Subscribe
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
