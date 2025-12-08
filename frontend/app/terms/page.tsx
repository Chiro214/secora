'use client';

import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Shield } from 'lucide-react';

export default function TermsPage() {
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
            <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Terms of Service
            </h1>
            <p className="text-cyan-300/70">Last updated: December 8, 2025</p>
          </div>

          {/* Content */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 space-y-8">
            <Section title="1. Acceptance of Terms">
              <p>
                By accessing and using SECORA ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
                If you do not agree to these terms, please do not use the Service.
              </p>
            </Section>

            <Section title="2. Use License">
              <p>
                Permission is granted to temporarily use the Service for personal or commercial security testing purposes.
                This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-slate-300">
                <li>Use the Service for illegal activities</li>
                <li>Scan domains you do not own or have permission to test</li>
                <li>Attempt to reverse engineer the Service</li>
                <li>Resell or redistribute the Service</li>
              </ul>
            </Section>

            <Section title="3. Disclaimer">
              <p>
                The Service is provided "as is". SECORA makes no warranties, expressed or implied, and hereby disclaims
                and negates all other warranties including, without limitation, implied warranties or conditions of merchantability,
                fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </Section>

            <Section title="4. Limitations">
              <p>
                In no event shall SECORA or its suppliers be liable for any damages (including, without limitation, damages for loss of data
                or profit, or due to business interruption) arising out of the use or inability to use the Service.
              </p>
            </Section>

            <Section title="5. Accuracy of Materials">
              <p>
                The materials appearing in the Service could include technical, typographical, or photographic errors.
                SECORA does not warrant that any of the materials on its Service are accurate, complete, or current.
              </p>
            </Section>

            <Section title="6. Modifications">
              <p>
                SECORA may revise these terms of service at any time without notice. By using this Service you are agreeing
                to be bound by the then current version of these terms of service.
              </p>
            </Section>

            <Section title="7. Governing Law">
              <p>
                These terms and conditions are governed by and construed in accordance with the laws and you irrevocably
                submit to the exclusive jurisdiction of the courts in that location.
              </p>
            </Section>

            <Section title="8. Contact Information">
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-cyan-300">Email: legal@secora.security</p>
                <p className="text-cyan-300">Support: support@secora.security</p>
              </div>
            </Section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">{title}</h2>
      <div className="text-slate-300 leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
}
