'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, Zap, Lock, ChevronRight, Check, Sparkles, Brain, Target } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard';

// Import 3D components normally (they're already optimized)
import { CyberGrid } from '@/components/3d/CyberGrid';
import { HolographicShield } from '@/components/3d/HolographicShield';

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);

  useEffect(() => {
    setIsMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen text-foreground overflow-hidden selection:bg-primary/30 relative">
      {/* Cyber Grid Background */}
      <CyberGrid />

      {/* Cursor Trail Effect - Only on desktop */}
      {isMounted && (
        <motion.div
          className="fixed w-6 h-6 rounded-full bg-primary/30 blur-xl pointer-events-none z-50 hidden md:block"
          animate={{
            x: mousePosition.x - 12,
            y: mousePosition.y - 12,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        />
      )}

      {/* Glassmorphic Navbar */}
      <Navbar />

      {/* Hero Section - Hyper Futuristic */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-screen flex items-center">
        {/* 3D Holographic Shield Background */}
        <motion.div 
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 lg:opacity-30"
          style={{ opacity, scale }}
        >
          <HolographicShield />
        </motion.div>

        {/* Volumetric Light Beams */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-secondary/30 to-transparent"
            animate={{ opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Status Badge with Pulse */}
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2 text-sm text-primary mb-8 backdrop-blur-xl shadow-[0_0_30px_rgba(75,163,255,0.2)]"
              animate={{ boxShadow: ['0_0_30px_rgba(75,163,255,0.2)', '0_0_50px_rgba(75,163,255,0.4)', '0_0_30px_rgba(75,163,255,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary shadow-[0_0_10px_rgba(75,163,255,0.8)]"></span>
              </span>
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">AI-Powered v2.0 • Live</span>
            </motion.div>

            {/* 3D Floating Title with Holographic Effect */}
            <h1 className="mb-8 text-6xl font-bold tracking-tight md:text-8xl lg:text-9xl perspective-1000">
              <motion.span 
                className="block text-white mb-4"
                style={{
                  textShadow: '0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(75,163,255,0.2)',
                  filter: 'drop-shadow(0 4px 20px rgba(75,163,255,0.3))',
                }}
                animate={{
                  textShadow: [
                    '0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(75,163,255,0.2)',
                    '0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(75,163,255,0.4)',
                    '0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(75,163,255,0.2)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Secure Your Web
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-primary via-blue-400 to-secondary bg-clip-text text-transparent relative"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(75,163,255,0.5))',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              >
                With AI Precision
                {/* Shimmer overlay */}
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  style={{ mixBlendMode: 'overlay' }}
                />
              </motion.span>
            </h1>

            {/* Holographic Subtitle */}
            <motion.p 
              className="mx-auto mb-12 max-w-3xl text-lg md:text-xl leading-relaxed relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              <span className="text-[#E8F0FF] drop-shadow-[0_0_10px_rgba(232,240,255,0.3)]">
                SECORA is the <span className="text-primary font-bold">next-generation</span> vulnerability scanner powered by advanced AI.
                Detect, analyze, and remediate security threats in real-time with{' '}
                <span className="text-white font-bold bg-gradient-to-r from-primary/20 to-secondary/20 px-2 py-1 rounded">
                  99.9% accuracy
                </span>
              </span>
            </motion.p>

            {/* Futuristic CTA Buttons */}
            <motion.div 
              className="flex flex-col items-center justify-center gap-6 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <Link href="/scan">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <NeonButton 
                    size="lg" 
                    className="min-w-[220px] text-lg h-16 relative overflow-hidden group"
                  >
                    {/* Animated background */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary via-blue-500 to-primary"
                      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      style={{ backgroundSize: '200% 100%' }}
                    />
                    <span className="relative z-10 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Start Free Scan
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    {/* Pulse effect */}
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(75,163,255,0.3)',
                          '0 0 40px rgba(75,163,255,0.6)',
                          '0 0 20px rgba(75,163,255,0.3)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </NeonButton>
                </motion.div>
              </Link>
              
              <Link href="#features">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <NeonButton 
                    variant="outline" 
                    size="lg" 
                    className="min-w-[220px] text-lg h-16 backdrop-blur-xl bg-white/5 border-white/20 hover:bg-white/10 hover:border-primary/50 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      View Demo
                    </span>
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-primary/10 to-secondary/10" />
                  </NeonButton>
                </motion.div>
              </Link>
            </motion.div>

            {/* Floating Stats */}
            <motion.div
              className="mt-20 flex flex-wrap justify-center gap-8 md:gap-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
            >
              {[
                { value: '10K+', label: 'Scans Completed' },
                { value: '99.9%', label: 'Accuracy Rate' },
                { value: '<2s', label: 'Avg Scan Time' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  whileHover={{ scale: 1.1 }}
                >
                  <div className="text-3xl md:text-4xl font-bold text-primary drop-shadow-[0_0_15px_rgba(75,163,255,0.5)]">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#E8F0FF]/70 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - 3D Glassmorphic Cards */}
      <section id="features" className="py-32 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[100px]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary/5 blur-[100px]"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="mb-20 text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.h2 
              className="text-5xl md:text-6xl font-bold text-white mb-6 relative inline-block"
              style={{
                textShadow: '0 0 30px rgba(75,163,255,0.3)',
              }}
            >
              Why Choose SECORA?
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.h2>
            <p className="text-lg text-[#E8F0FF]/80 leading-relaxed">
              Traditional scanners are slow and dumb. SECORA uses <span className="text-primary font-semibold">neural networks</span> to understand context,
              eliminating false positives and finding logic bugs others miss.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            <Feature3DCard
              icon={Zap}
              title="Lightning Fast"
              description="AI-optimized scanning engine delivers results in seconds, not hours. Parallel processing architecture scales infinitely."
              delay={0}
              color="primary"
            />
            <Feature3DCard
              icon={Brain}
              title="Deep Analysis"
              description="Uncover hidden vulnerabilities with our proprietary deep learning models that understand business logic."
              delay={0.15}
              color="secondary"
            />
            <Feature3DCard
              icon={Lock}
              title="Auto Remediation"
              description="Don't just find bugs, fix them. Get instant, copy-pasteable code fixes generated by our fine-tuned LLMs."
              delay={0.3}
              color="primary"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative overflow-hidden">
        {/* Animated background orbs */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="mb-20 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.h2 
              className="text-5xl md:text-6xl font-bold text-white mb-6 relative inline-block"
              style={{
                textShadow: '0 0 30px rgba(75,163,255,0.3)',
              }}
            >
              Simple, Transparent Pricing
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.h2>
            <p className="text-lg text-[#E8F0FF]/80">Start for free, upgrade for power.</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {/* Free Tier */}
            <PricingCard
              title="Hacker"
              price="$0"
              description="For hobbyists and students"
              features={["5 Scans / month", "Basic Report", "Community Support", "Standard Speed"]}
            />

            {/* Pro Tier */}
            <PricingCard
              title="Pro"
              price="$49"
              description="For professional developers"
              features={["Unlimited Scans", "PDF Reports", "AI Remediation", "Priority Support", "API Access"]}
              highlight
              popular
            />

            {/* Enterprise Tier */}
            <PricingCard
              title="Enterprise"
              price="Custom"
              description="For large organizations"
              features={["SSO & Audit Logs", "Custom Contracts", "Dedicated Manager", "On-premise Option"]}
            />
          </div>
        </div>
      </section>

      {/* Footer - Glassmorphic */}
      <footer className="relative border-t border-white/10 py-16 overflow-hidden">
        {/* Background blur */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 backdrop-blur-xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Logo and tagline */}
          <div className="text-center mb-12">
            <motion.div
              className="inline-flex items-center gap-3 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Shield className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(75,163,255,0.5)]" />
              <span className="text-2xl font-bold text-white">SECORA</span>
            </motion.div>
            <p className="text-[#E8F0FF]/60 text-sm">Elite Cyber Defense • AI-Powered Security</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            {[
              { name: 'About', href: '/about' },
              { name: 'Terms', href: '/terms' },
              { name: 'Privacy', href: '/privacy' },
              { name: 'Docs', href: '/docs' },
              { name: 'Status', href: '/status' },
              { name: 'API', href: '/api' },
              { name: 'Blog', href: '/blog' }
            ].map((link) => (
              <Link 
                key={link.name}
                href={link.href} 
                className="text-[#E8F0FF]/70 hover:text-primary transition-colors duration-300 text-sm font-medium relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-center">
            <p className="text-[#E8F0FF]/50 text-sm">
              &copy; 2025 SECORA Security. All rights reserved.
            </p>
            <motion.div
              className="mt-4 inline-flex items-center gap-2 text-xs text-[#E8F0FF]/40"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              All systems operational
            </motion.div>
          </div>
        </div>

        {/* Bottom glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </footer>
    </div>
  );
}

function Feature3DCard({ 
  icon: Icon, 
  title, 
  description, 
  delay, 
  color 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  delay: number;
  color: 'primary' | 'secondary';
}) {
  return (
    <GlassmorphicCard delay={delay} className="p-8 h-full group">
      {/* Floating Icon with 3D effect */}
      <motion.div
        className="mb-6 relative"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className={`
          inline-flex h-20 w-20 items-center justify-center rounded-2xl 
          bg-gradient-to-br ${color === 'primary' ? 'from-primary/20 to-blue-500/20' : 'from-secondary/20 to-purple-500/20'}
          backdrop-blur-xl border border-white/10
          shadow-[0_8px_32px_rgba(0,0,0,0.3)]
          group-hover:shadow-[0_8px_32px_rgba(75,163,255,0.4)]
          transition-all duration-500
          relative
        `}>
          <Icon className={`h-10 w-10 ${color === 'primary' ? 'text-primary' : 'text-secondary'} drop-shadow-[0_0_10px_rgba(75,163,255,0.5)]`} />
          
          {/* Rotating ring */}
          <motion.div
            className={`absolute inset-0 rounded-2xl border-2 ${color === 'primary' ? 'border-primary/30' : 'border-secondary/30'}`}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </motion.div>

      {/* Title with glow */}
      <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-primary transition-colors duration-300">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[#E8F0FF]/70 leading-relaxed">
        {description}
      </p>

      {/* Hover indicator */}
      <motion.div
        className="mt-6 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        animate={{ x: [0, 5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <span className="text-sm font-semibold">Learn more</span>
        <ChevronRight className="w-4 h-4" />
      </motion.div>
    </GlassmorphicCard>
  );
}

function PricingCard({ 
  title, 
  price, 
  description, 
  features, 
  highlight, 
  popular 
}: { 
  title: string; 
  price: string; 
  description: string; 
  features: string[]; 
  highlight?: boolean; 
  popular?: boolean;
}) {
  return (
    <GlassmorphicCard 
      delay={0} 
      className={`p-8 h-full flex flex-col relative ${highlight ? 'border-primary/50' : ''}`}
      hover3d={true}
    >
      {popular && (
        <motion.div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider z-20"
          animate={{
            boxShadow: [
              '0 0 20px rgba(75,163,255,0.5)',
              '0 0 40px rgba(75,163,255,0.8)',
              '0 0 20px rgba(75,163,255,0.5)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="inline w-3 h-3 mr-1" />
          Most Popular
        </motion.div>
      )}

      {/* Title */}
      <div className="text-center mb-6">
        <h3 className="text-3xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-[#E8F0FF]/60">{description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-8">
        <motion.div
          className="inline-block"
          whileHover={{ scale: 1.05 }}
        >
          <span className={`text-6xl font-bold ${highlight ? 'text-primary' : 'text-white'} drop-shadow-[0_0_20px_rgba(75,163,255,0.3)]`}>
            {price}
          </span>
          {price !== 'Custom' && <span className="text-[#E8F0FF]/50 text-xl">/mo</span>}
        </motion.div>
      </div>

      {/* Features */}
      <ul className="space-y-4 mb-8 flex-1">
        {features.map((feature, i) => (
          <motion.li 
            key={i} 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <div className={`
              flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center
              ${highlight ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/10 text-[#E8F0FF]/60 border border-white/10'}
              backdrop-blur-sm
            `}>
              <Check className="h-3 w-3" />
            </div>
            <span className="text-sm text-[#E8F0FF]/80">{feature}</span>
          </motion.li>
        ))}
      </ul>

      {/* CTA Button */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <NeonButton
          variant={highlight ? 'primary' : 'outline'}
          className="w-full h-12 text-base font-semibold"
          glow={highlight}
        >
          {price === 'Custom' ? 'Contact Sales' : 'Get Started'}
          <ChevronRight className="ml-2 w-4 h-4" />
        </NeonButton>
      </motion.div>

      {/* Highlight glow effect */}
      {highlight && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 30px rgba(75,163,255,0.2)',
              '0 0 50px rgba(75,163,255,0.4)',
              '0 0 30px rgba(75,163,255,0.2)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </GlassmorphicCard>
  );
}
