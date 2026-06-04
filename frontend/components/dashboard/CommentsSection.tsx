'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Send, User, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    email: string;
    role: string;
  };
}

export function CommentsSection({ findingId }: { findingId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchComments();
  }, [findingId]);

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/comments/${findingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/comments/${findingId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ text: newText })
      });
      
      if (res.ok) {
        const newComment = await res.json();
        setComments([...comments, newComment]);
        setNewText('');
      }
    } catch (e) {
      console.error('Failed to post comment', e);
    }
  };

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <h3 className="text-lg font-semibold flex items-center mb-4">
        <MessageSquare className="w-5 h-5 mr-2 text-cyan-400" />
        Discussion ({comments.length})
      </h3>

      {loading ? (
        <div className="animate-pulse flex space-x-4 mb-6">
          <div className="rounded-full bg-white/10 h-10 w-10"></div>
          <div className="flex-1 space-y-3 py-1">
            <div className="h-2 bg-white/10 rounded w-1/4"></div>
            <div className="h-2 bg-white/10 rounded w-3/4"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No comments yet. Start the discussion!</p>
          ) : (
            comments.map((c, i) => (
              <motion.div 
                key={c.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex space-x-3 bg-white/5 p-4 rounded-xl"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-200">
                      {c.user.email} <span className="text-xs text-cyan-400 ml-1 px-1.5 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">{c.user.role}</span>
                    </h4>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{c.text}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {user && (
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a comment or ask a question..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
            rows={3}
          />
          <button 
            type="submit"
            disabled={!newText.trim()}
            className="absolute bottom-4 right-4 p-2 bg-cyan-500 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
