'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Terminal } from 'lucide-react';
import { GlassmorphicCard } from '@/components/ui/GlassmorphicCard';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export function CommandConsole() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', type: 'bot', content: 'AI Bot initialized. Ready to assist with security automation.', timestamp: new Date() },
    { id: '2', type: 'bot', content: 'Type "help" for available commands or describe what you need.', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: getBotResponse(input),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  const getBotResponse = (command: string) => {
    const cmd = command.toLowerCase();
    if (cmd.includes('scan')) return '🔍 Initiating security scan... Analyzing target for vulnerabilities.';
    if (cmd.includes('fix')) return '🔧 Applying automated fixes... 3 vulnerabilities patched successfully.';
    if (cmd.includes('job')) return '💼 Searching for relevant job opportunities... Found 5 matches.';
    if (cmd.includes('help')) return '📋 Available commands: scan [url], fix [vulnerability], apply-jobs, create-task, rescan';
    return '✅ Command received. Processing your request...';
  };

  return (
    <GlassmorphicCard className="p-6 h-[600px] flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-5 h-5 text-cyan-400" />
        <h3 className="text-xl font-bold text-cyan-400">Command Console</h3>
        <motion.div
          className="ml-auto w-2 h-2 rounded-full bg-green-400"
          animate={{
            boxShadow: [
              '0 0 5px rgba(0,255,157,0.5)',
              '0 0 15px rgba(0,255,157,1)',
              '0 0 5px rgba(0,255,157,0.5)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className={`max-w-[80%] p-3 rounded-lg ${
              message.type === 'user'
                ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-100'
                : 'bg-purple-500/20 border border-purple-400/50 text-purple-100'
            }`}>
              {message.type === 'bot' && (
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-purple-400 font-semibold">AI Bot</span>
                </div>
              )}
              <p className="text-sm">{message.content}</p>
              <span className="text-xs opacity-50 mt-1 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a command or describe what you need..."
          className="w-full px-4 py-3 pr-12 rounded-lg bg-white/5 border border-cyan-400/30 focus:border-cyan-400 outline-none text-white placeholder-gray-500"
        />
        <motion.button
          onClick={handleSend}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Send className="w-4 h-4 text-white" />
        </motion.button>
      </div>
    </GlassmorphicCard>
  );
}
