'use client';

import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Code, Key, Zap, Shield, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function APIPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/scan',
      description: 'Initiate a new security scan',
      request: `{
  "domain": "example.com",
  "scanType": "deep",
  "modules": ["sqli", "xss", "csrf"]
}`,
      response: `{
  "scanId": "scan_abc123",
  "status": "scanning",
  "startedAt": "2025-12-08T10:30:00Z"
}`
    },
    {
      method: 'GET',
      path: '/api/scan/:id',
      description: 'Get scan status and results',
      request: null,
      response: `{
  "scanId": "scan_abc123",
  "status": "complete",
  "progress": 100,
  "vulnerabilities": [...]
}`
    },
    {
      method: 'GET',
      path: '/api/vulnerabilities',
      description: 'List all detected vulnerabilities',
      request: null,
      response: `{
  "vulnerabilities": [...],
  "total": 42,
  "critical": 3,
  "high": 12
}`
    },
    {
      method: 'POST',
      path: '/api/vulnerabilities/:id/fix',
      description: 'Generate AI-powered fix for vulnerability',
      request: null,
      response: `{
  "fix": "Use parameterized queries...",
  "code": "const query = 'SELECT * FROM...'",
  "steps": [...]
}`
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
            <Code className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              API Reference
            </h1>
            <p className="text-cyan-300/70 text-lg">Integrate SECORA into your workflow</p>
          </div>

          {/* Quick Start */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-cyan-300 mb-6 flex items-center gap-3">
              <Zap className="w-8 h-8" />
              Quick Start
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  Authentication
                </h3>
                <p className="text-slate-300 mb-4">
                  All API requests require authentication using an API key in the Authorization header:
                </p>
                <div className="relative bg-slate-950 border border-cyan-500/20 rounded-lg p-4 font-mono text-sm">
                  <code className="text-cyan-300">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                  <button
                    onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY', 'auth')}
                    className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded transition-colors"
                  >
                    {copiedEndpoint === 'auth' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Base URL</h3>
                <div className="bg-slate-950 border border-cyan-500/20 rounded-lg p-4 font-mono text-sm">
                  <code className="text-cyan-300">https://api.secora.security/v1</code>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Rate Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-cyan-400 mb-1">100</div>
                    <div className="text-slate-400 text-sm">requests/minute</div>
                  </div>
                  <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400 mb-1">10,000</div>
                    <div className="text-slate-400 text-sm">requests/day</div>
                  </div>
                  <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-400 mb-1">Unlimited</div>
                    <div className="text-slate-400 text-sm">Enterprise plan</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Endpoints */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-cyan-300 mb-6">Endpoints</h2>
            
            {endpoints.map((endpoint, index) => (
              <motion.div
                key={endpoint.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6"
              >
                {/* Method and Path */}
                <div className="flex items-center gap-4 mb-4">
                  <span className={`px-3 py-1 rounded font-bold text-sm ${
                    endpoint.method === 'GET' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-cyan-300 font-mono text-lg">{endpoint.path}</code>
                </div>

                {/* Description */}
                <p className="text-slate-300 mb-4">{endpoint.description}</p>

                {/* Request */}
                {endpoint.request && (
                  <div className="mb-4">
                    <h4 className="text-white font-semibold mb-2 text-sm">Request Body</h4>
                    <div className="relative bg-slate-950 border border-cyan-500/20 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-cyan-300 font-mono text-sm">
                        <code>{endpoint.request}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(endpoint.request!, `req-${index}`)}
                        className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded transition-colors"
                      >
                        {copiedEndpoint === `req-${index}` ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Response */}
                <div>
                  <h4 className="text-white font-semibold mb-2 text-sm">Response</h4>
                  <div className="relative bg-slate-950 border border-cyan-500/20 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-300 font-mono text-sm">
                      <code>{endpoint.response}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(endpoint.response, `res-${index}`)}
                      className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded transition-colors"
                    >
                      {copiedEndpoint === `res-${index}` ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* SDKs */}
          <div className="mt-12 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-cyan-300 mb-6 flex items-center gap-3">
              <Shield className="w-8 h-8" />
              Official SDKs
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['JavaScript', 'Python', 'Go'].map((lang) => (
                <div key={lang} className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{lang}</h3>
                  <p className="text-slate-400 text-sm mb-4">Official {lang} SDK</p>
                  <div className="bg-slate-950 border border-cyan-500/20 rounded p-3 font-mono text-xs text-cyan-300">
                    npm install @secora/{lang.toLowerCase()}-sdk
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-slate-400 mb-4">Need help with the API?</p>
            <a
              href="mailto:api@secora.security"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors"
            >
              Contact API Support
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
