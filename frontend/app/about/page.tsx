'use client';

import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Users, Target, Zap, Shield, Award, Linkedin, Twitter, Github, Mail } from 'lucide-react';
import Image from 'next/image';

export default function AboutPage() {
  const team = [
    {
      name: 'Chirag',
      role: 'Founder & CEO',
      bio: 'Passionate about cybersecurity and AI. Built SECORA to make security testing accessible to everyone.',
      image: '/team/founder.png',
      social: {
        linkedin: 'https://linkedin.com/in/yourprofile',
        twitter: 'https://twitter.com/yourhandle',
        github: 'https://github.com/yourusername',
        email: 'founder@secora.security'
      },
      featured: true
    },
    // Add more team members here
    {
      name: 'Yash Sharma',
      role: 'CTO',
      bio: 'Expert in AI and machine learning with 10+ years of experience in security.',
      image: '/team/yash.jpeg',
      social: {
        linkedin: '#',
        github: '#',
        email: 'cto@secora.security'
      }
    },
    {
      name: 'Alankrita Das',
      role: 'Head of Security',
      bio: 'Former penetration tester with expertise in vulnerability research.',
      image: '/team/alankrita.jpg',
      social: {
        linkedin: '#',
        email: 'security@secora.security'
      }
    },
  ];

  const values = [
    {
      icon: Shield,
      title: 'Security First',
      description: 'We believe security should be proactive, not reactive. Every line of code matters.'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Leveraging cutting-edge AI to solve complex security challenges.'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Building tools that empower developers and security professionals worldwide.'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'Committed to delivering the highest quality security testing platform.'
    },
  ];

  const stats = [
    { value: '10K+', label: 'Scans Completed' },
    { value: '99.9%', label: 'Accuracy Rate' },
    { value: '50+', label: 'Countries' },
    { value: '24/7', label: 'Support' },
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
            <Users className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              About SECORA
            </h1>
            <p className="text-cyan-300/70 text-lg max-w-3xl mx-auto">
              We're on a mission to make the web more secure by empowering developers with AI-powered security testing tools.
            </p>
          </div>

          {/* Mission Statement */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 mb-16">
            <div className="flex items-start gap-4 mb-6">
              <Target className="w-8 h-8 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-3xl font-bold text-cyan-300 mb-4">Our Mission</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-4">
                  SECORA was founded with a simple yet powerful vision: to democratize cybersecurity by making 
                  enterprise-grade security testing accessible to everyone, from solo developers to large organizations.
                </p>
                <p className="text-slate-300 text-lg leading-relaxed">
                  We believe that security shouldn't be an afterthought or a luxury. By combining cutting-edge AI 
                  with deep security expertise, we're building tools that help developers find and fix vulnerabilities 
                  before they become problems.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6 text-center"
              >
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Values */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-cyan-300 mb-8 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={value.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6"
                  >
                    <Icon className="w-10 h-10 text-cyan-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>
                    <p className="text-slate-300">{value.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Team Section */}
          <div>
            <h2 className="text-3xl font-bold text-cyan-300 mb-8 text-center">Meet the Team</h2>
            
            {/* Founder - Featured */}
            {team.filter(member => member.featured).map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/50 rounded-2xl p-8 mb-12"
              >
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  {/* Photo */}
                  <div className="relative">
                    <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 overflow-hidden">
                      <Image
                        src={member.image}
                        alt={member.name}
                        width={192}
                        height={192}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl -z-10" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-block px-4 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full text-cyan-300 text-sm font-semibold mb-3">
                      {member.role}
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-3">{member.name}</h3>
                    <p className="text-slate-300 text-lg leading-relaxed mb-6">
                      {member.bio}
                    </p>

                    {/* Social Links */}
                    <div className="flex gap-4 justify-center md:justify-start">
                      {member.social.linkedin && (
                        <a
                          href={member.social.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Linkedin className="w-5 h-5 text-cyan-400" />
                        </a>
                      )}
                      {member.social.twitter && (
                        <a
                          href={member.social.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Twitter className="w-5 h-5 text-cyan-400" />
                        </a>
                      )}
                      {member.social.github && (
                        <a
                          href={member.social.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Github className="w-5 h-5 text-cyan-400" />
                        </a>
                      )}
                      {member.social.email && (
                        <a
                          href={`mailto:${member.social.email}`}
                          className="w-10 h-10 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Mail className="w-5 h-5 text-cyan-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Other Team Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.filter(member => !member.featured).map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/50 transition-all"
                >
                  {/* Photo */}
                  <div className="w-32 h-32 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 overflow-hidden">
                    <Image
                      src={member.image}
                      alt={member.name}
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  {/* Info */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                    <p className="text-cyan-400 text-sm font-semibold mb-3">{member.role}</p>
                    <p className="text-slate-400 text-sm mb-4">{member.bio}</p>

                    {/* Social Links */}
                    <div className="flex gap-2 justify-center">
                      {member.social.linkedin && (
                        <a
                          href={member.social.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Linkedin className="w-4 h-4 text-cyan-400" />
                        </a>
                      )}
                      {member.social.github && (
                        <a
                          href={member.social.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Github className="w-4 h-4 text-cyan-400" />
                        </a>
                      )}
                      {member.social.email && (
                        <a
                          href={`mailto:${member.social.email}`}
                          className="w-8 h-8 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Mail className="w-4 h-4 text-cyan-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Join Us */}
          <div className="mt-16 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">Join Our Team</h3>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              We're always looking for talented individuals who are passionate about security and innovation.
            </p>
            <a
              href="mailto:careers@secora.security"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors"
            >
              View Open Positions
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
