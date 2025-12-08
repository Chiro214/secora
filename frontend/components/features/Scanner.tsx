import React from 'react';
import { motion } from 'framer-motion';

export function Scanner() {
    return (
        <div className="relative mx-auto h-64 w-64 md:h-96 md:w-96">
            {/* Base Circle */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />

            {/* Rotating Rings */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 rounded-full border-2 border-dashed border-primary/40"
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-8 rounded-full border-2 border-dotted border-secondary/40"
            />

            {/* Scanning Line */}
            <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-75 blur-sm"
            />

            {/* Center Glow */}
            <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-32 w-32 rounded-full bg-primary/10 blur-xl"
                />
                <div className="text-4xl font-bold text-primary neon-text">SCANNING</div>
            </div>
        </div>
    );
}
