'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import Globe3D from '@/components/vulnerabilities/Globe3D';
import CVSSMeter from '@/components/vulnerabilities/CVSSMeter';
import AIFixPanel from '@/components/vulnerabilities/AIFixPanel';
import VulnerabilityList from '@/components/vulnerabilities/VulnerabilityList';
import TagCloud from '@/components/vulnerabilities/TagCloud';

interface Vulnerability {
  id: string;
  name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  cvss: number;
  type: string;
  domain: string;
  location: { lat: number; lng: number };
  description: string;
  impact: string;
  fix: string;
}

export default function VulnerabilitiesPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // Mock data - replace with API call
    const mockVulns: Vulnerability[] = [
      {
        id: '1',
        name: 'SQL Injection in Login Form',
        severity: 'Critical',
        cvss: 9.8,
        type: 'SQL Injection',
        domain: 'example.com',
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Authentication bypass via SQL injection in login endpoint',
        impact: 'Complete database compromise, unauthorized access to all user data',
        fix: 'Use parameterized queries and input validation'
      },
      {
        id: '2',
        name: 'Cross-Site Scripting (XSS)',
        severity: 'High',
        cvss: 7.5,
        type: 'XSS',
        domain: 'api.example.com',
        location: { lat: 51.5074, lng: -0.1278 },
        description: 'Reflected XSS in search parameter',
        impact: 'Session hijacking, credential theft',
        fix: 'Implement output encoding and Content Security Policy'
      },
      {
        id: '3',
        name: 'Insecure Direct Object Reference',
        severity: 'Medium',
        cvss: 6.5,
        type: 'IDOR',
        domain: 'app.example.com',
        location: { lat: 35.6762, lng: 139.6503 },
        description: 'User can access other users\' data by changing ID parameter',
        impact: 'Unauthorized data access',
        fix: 'Implement proper authorization checks'
      },
      {
        id: '4',
        name: 'Missing Security Headers',
        severity: 'Low',
        cvss: 3.7,
        type: 'Configuration',
        domain: 'cdn.example.com',
        location: { lat: 37.7749, lng: -122.4194 },
        description: 'Missing X-Frame-Options and CSP headers',
        impact: 'Clickjacking vulnerability',
        fix: 'Add security headers to server configuration'
      }
    ];
    setVulnerabilities(mockVulns);
    setSelectedVuln(mockVulns[0]);
  }, []);

  const filteredVulns = filter === 'all' 
    ? vulnerabilities 
    : vulnerabilities.filter(v => v.severity === filter);

  const severityCounts = {
    Critical: vulnerabilities.filter(v => v.severity === 'Critical').length,
    High: vulnerabilities.filter(v => v.severity === 'High').length,
    Medium: vulnerabilities.filter(v => v.severity === 'Medium').length,
    Low: vulnerabilities.filter(v => v.severity === 'Low').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <Navbar />
      
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Vulnerability Explorer
          </h1>
          <p className="text-cyan-300/70 text-lg">Global threat visualization and analysis</p>
        </motion.div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(severityCounts).map(([severity, count], index) => (
            <motion.button
              key={severity}
              onClick={() => setFilter(filter === severity ? 'all' : severity)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border-2 transition-all ${
                filter === severity
                  ? 'border-cyan-400 bg-cyan-500/20'
                  : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={`text-3xl font-bold mb-1 ${
                severity === 'Critical' ? 'text-red-400' :
                severity === 'High' ? 'text-orange-400' :
                severity === 'Medium' ? 'text-yellow-400' :
                'text-blue-400'
              }`}>
                {count}
              </div>
              <div className="text-slate-400 text-sm">{severity}</div>
            </motion.button>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Globe & List */}
          <div className="lg:col-span-2 space-y-6">
            {/* 3D Globe */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10"
            >
              <h2 className="text-2xl font-bold text-cyan-300 mb-4">Global Threat Map</h2>
              <Globe3D 
                vulnerabilities={filteredVulns}
                onSelect={setSelectedVuln}
                selectedId={selectedVuln?.id}
              />
            </motion.div>

            {/* Vulnerability List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10"
            >
              <h2 className="text-2xl font-bold text-cyan-300 mb-4">Detected Vulnerabilities</h2>
              <VulnerabilityList
                vulnerabilities={filteredVulns}
                onSelect={setSelectedVuln}
                selectedId={selectedVuln?.id}
              />
            </motion.div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {selectedVuln && (
              <>
                {/* CVSS Meter */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10"
                >
                  <h2 className="text-xl font-bold text-cyan-300 mb-4">CVSS Score</h2>
                  <CVSSMeter score={selectedVuln.cvss} severity={selectedVuln.severity} />
                </motion.div>

                {/* Tag Cloud */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10"
                >
                  <h2 className="text-xl font-bold text-cyan-300 mb-4">Vulnerability Tags</h2>
                  <TagCloud vulnerability={selectedVuln} />
                </motion.div>

                {/* AI Fix Panel */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10"
                >
                  <h2 className="text-xl font-bold text-cyan-300 mb-4">AI Recommendations</h2>
                  <AIFixPanel vulnerability={selectedVuln} />
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
