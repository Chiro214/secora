'use client';

import { motion } from 'framer-motion';

interface Vulnerability {
  type: string;
  severity: string;
  name: string;
}

interface TagCloudProps {
  vulnerability: Vulnerability;
}

export default function TagCloud({ vulnerability }: TagCloudProps) {
  // Generate tags based on vulnerability
  const generateTags = () => {
    const baseTags = [vulnerability.type, vulnerability.severity];
    
    const additionalTags: Record<string, string[]> = {
      'SQL Injection': ['Database', 'Authentication', 'Data Breach', 'OWASP Top 10', 'CWE-89'],
      'XSS': ['Client-Side', 'Session Hijacking', 'OWASP Top 10', 'CWE-79', 'DOM'],
      'IDOR': ['Authorization', 'Access Control', 'CWE-639', 'Enumeration'],
      'Configuration': ['Headers', 'Security Policy', 'Best Practices', 'Hardening']
    };

    const extra = additionalTags[vulnerability.type] || ['Security', 'Vulnerability', 'Risk'];
    return [...baseTags, ...extra];
  };

  const tags = generateTags();

  const getTagColor = (tag: string) => {
    if (tag === 'Critical') return 'bg-red-500/20 text-red-300 border-red-500/50';
    if (tag === 'High') return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
    if (tag === 'Medium') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
    if (tag === 'Low') return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
    if (tag.includes('OWASP')) return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
    if (tag.includes('CWE')) return 'bg-pink-500/20 text-pink-300 border-pink-500/50';
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <motion.div
          key={tag}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.1 }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getTagColor(tag)} cursor-default`}
        >
          {tag}
        </motion.div>
      ))}
    </div>
  );
}
