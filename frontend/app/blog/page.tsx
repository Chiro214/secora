'use client';

import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { BookOpen, Calendar, Clock, ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  featured?: boolean;
}

export default function BlogPage() {
  const posts: BlogPost[] = [
    {
      id: '1',
      title: 'The Future of AI-Powered Security Testing',
      excerpt: 'Discover how artificial intelligence is revolutionizing vulnerability detection and making security testing more accessible than ever.',
      author: 'Sarah Chen',
      date: 'Dec 8, 2025',
      readTime: '5 min read',
      category: 'AI & Security',
      image: '🤖',
      featured: true
    },
    {
      id: '2',
      title: 'Zero-Day Vulnerabilities: Detection and Prevention',
      excerpt: 'Learn about the latest techniques for identifying and mitigating zero-day vulnerabilities before they can be exploited.',
      author: 'Marcus Rodriguez',
      date: 'Dec 5, 2025',
      readTime: '8 min read',
      category: 'Security',
      image: '🎯',
      featured: true
    },
    {
      id: '3',
      title: 'Building a Security-First Development Culture',
      excerpt: 'Best practices for integrating security testing into your CI/CD pipeline and fostering a security-minded team.',
      author: 'Emily Watson',
      date: 'Dec 1, 2025',
      readTime: '6 min read',
      category: 'DevSecOps',
      image: '🛡️'
    },
    {
      id: '4',
      title: 'SQL Injection in 2025: Still a Threat?',
      excerpt: 'Despite being well-known for decades, SQL injection remains one of the most common vulnerabilities. Here\'s why.',
      author: 'David Kim',
      date: 'Nov 28, 2025',
      readTime: '7 min read',
      category: 'Vulnerabilities',
      image: '💉'
    },
    {
      id: '5',
      title: 'API Security Best Practices',
      excerpt: 'Essential security measures every API developer should implement to protect against common attack vectors.',
      author: 'Lisa Anderson',
      date: 'Nov 25, 2025',
      readTime: '10 min read',
      category: 'API Security',
      image: '🔌'
    },
    {
      id: '6',
      title: 'The Rise of Automated Security Testing',
      excerpt: 'How automation is changing the landscape of security testing and what it means for development teams.',
      author: 'James Wilson',
      date: 'Nov 20, 2025',
      readTime: '5 min read',
      category: 'Automation',
      image: '⚡'
    },
  ];

  const categories = ['All', 'AI & Security', 'Security', 'DevSecOps', 'Vulnerabilities', 'API Security', 'Automation'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-16">
            <BookOpen className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              SECORA Blog
            </h1>
            <p className="text-cyan-300/70 text-lg">Insights, tutorials, and updates from the security frontlines</p>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category) => (
              <button
                key={category}
                className="px-4 py-2 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-300 text-sm font-medium transition-all"
              >
                {category}
              </button>
            ))}
          </div>

          {/* Featured Posts */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-cyan-300 mb-8 flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              Featured Articles
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {posts.filter(post => post.featured).map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500/50 transition-all cursor-pointer"
                >
                  {/* Icon */}
                  <div className="text-6xl mb-4">{post.image}</div>

                  {/* Category */}
                  <span className="inline-block px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full text-cyan-300 text-xs font-semibold mb-4">
                    {post.category}
                  </span>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-slate-300 mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-2 transition-transform" />
                  </div>

                  {/* Author */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400">
                      By <span className="text-cyan-300 font-semibold">{post.author}</span>
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          {/* All Posts */}
          <div>
            <h2 className="text-3xl font-bold text-cyan-300 mb-8">Latest Articles</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.filter(post => !post.featured).map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/50 transition-all cursor-pointer"
                >
                  {/* Icon */}
                  <div className="text-5xl mb-4">{post.image}</div>

                  {/* Category */}
                  <span className="inline-block px-3 py-1 bg-slate-800/50 border border-cyan-500/30 rounded-full text-cyan-300 text-xs font-semibold mb-3">
                    {post.category}
                  </span>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="mt-16 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-8 text-center">
            <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-3">Stay Updated</h3>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Get the latest security insights, tutorials, and product updates delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>

          {/* Load More */}
          <div className="mt-12 text-center">
            <button className="px-8 py-3 bg-slate-800/50 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 rounded-lg font-semibold transition-all">
              Load More Articles
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
