'use client';

import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Lock } from 'lucide-react';

export default function PrivacyPage() {
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
            <Lock className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Privacy Policy
            </h1>
            <p className="text-cyan-300/70">Last updated: December 8, 2025</p>
          </div>

          {/* Content */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 space-y-8">
            <Section title="1. Information We Collect">
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-slate-300">
                <li>Account information (email, name, password)</li>
                <li>Scan targets and results</li>
                <li>Usage data and analytics</li>
                <li>Payment information (processed securely via Stripe)</li>
              </ul>
            </Section>

            <Section title="2. How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-slate-300">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends and usage</li>
              </ul>
            </Section>

            <Section title="3. Data Security">
              <p>
                We implement appropriate technical and organizational measures to protect your personal data against
                unauthorized or unlawful processing, accidental loss, destruction, or damage. All data is encrypted
                in transit using TLS 1.3 and at rest using AES-256 encryption.
              </p>
            </Section>

            <Section title="4. Data Retention">
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this
                privacy policy, unless a longer retention period is required by law. Scan results are retained for
                90 days unless you choose to delete them earlier.
              </p>
            </Section>

            <Section title="5. Third-Party Services">
              <p>We use the following third-party services:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-slate-300">
                <li>OpenAI, Anthropic, Google - AI analysis</li>
                <li>Stripe - Payment processing</li>
                <li>Vercel - Hosting and CDN</li>
                <li>PostHog - Analytics (anonymized)</li>
              </ul>
            </Section>

            <Section title="6. Your Rights">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-slate-300">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Export your data</li>
              </ul>
            </Section>

            <Section title="7. Cookies">
              <p>
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information.
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </Section>

            <Section title="8. Changes to This Policy">
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </Section>

            <Section title="9. Contact Us">
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-cyan-300">Email: privacy@secora.security</p>
                <p className="text-cyan-300">DPO: dpo@secora.security</p>
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
