'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface CinematicLoaderProps {
  onComplete?: () => void;
}

export function CinematicLoader({ onComplete }: CinematicLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 60) {
          return 0; // Loop back to 0 for continuous animation
        }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Generate 8 cubes for perfect circular orbit
  const cubes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 360) / 8,
  }));

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #0a1628 0%, #000000 100%)',
        backgroundColor: '#000000',
        minHeight: '100vh',
        minWidth: '100vw',
      }}
    >
      {/* Radial glow behind logo */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,150,255,0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Particle sparks in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-cyan-400"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Main 3D Scene Container with parallax */}
      <motion.div
        className="relative z-10"
        animate={{
          x: [0, 5, 0, -5, 0],
          y: [0, -3, 0, 3, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Central Glass Sphere with Shield */}
        <div className="relative w-[500px] h-[500px] flex items-center justify-center">

          {/* Holographic orbital rings */}
          <svg className="absolute inset-0 w-full h-full" style={{ transform: 'rotateX(60deg)' }}>
            <motion.circle
              cx="250"
              cy="250"
              r="200"
              fill="none"
              stroke="rgba(0, 200, 255, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 4"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <motion.circle
              cx="250"
              cy="250"
              r="210"
              fill="none"
              stroke="rgba(100, 150, 255, 0.2)"
              strokeWidth="0.5"
              animate={{ rotate: -360 }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            />
          </svg>

          {/* 8 Orbiting Glass Cubes - Perfect circular orbit */}
          <div className="absolute inset-0">
            {cubes.map((cube) => (
              <motion.div
                key={cube.id}
                className="absolute top-1/2 left-1/2"
                style={{
                  transformOrigin: '0 0',
                }}
                animate={{
                  rotate: [cube.angle, cube.angle + 360],
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >

                <motion.div
                  style={{
                    transform: 'translateX(200px) translateY(-25px)',
                  }}
                  animate={{
                    rotateX: [0, 360],
                    rotateY: [0, 360],
                    rotateZ: [0, 360],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  {/* 3D Glass Cube */}
                  <div className="relative w-12 h-12 preserve-3d">
                    {/* Front face */}
                    <div
                      className="absolute inset-0 rounded-lg border border-cyan-400/40"
                      style={{
                        transform: 'translateZ(24px)',
                        background: 'linear-gradient(135deg, rgba(0,200,255,0.15), rgba(100,150,255,0.1))',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 0 30px rgba(0,200,255,0.4), inset 0 0 20px rgba(0,200,255,0.1)',
                      }}
                    />
                    {/* Back face */}
                    <div
                      className="absolute inset-0 rounded-lg border border-cyan-400/30"
                      style={{
                        transform: 'translateZ(-24px) rotateY(180deg)',
                        background: 'linear-gradient(135deg, rgba(0,200,255,0.1), rgba(100,150,255,0.05))',
                        backdropFilter: 'blur(10px)',
                      }}
                    />

                    {/* Right face */}
                    <div
                      className="absolute inset-0 rounded-lg border border-cyan-400/30"
                      style={{
                        transform: 'rotateY(90deg) translateZ(24px)',
                        background: 'linear-gradient(135deg, rgba(0,200,255,0.12), rgba(100,150,255,0.08))',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                    {/* Left face */}
                    <div
                      className="absolute inset-0 rounded-lg border border-cyan-400/30"
                      style={{
                        transform: 'rotateY(-90deg) translateZ(24px)',
                        background: 'linear-gradient(135deg, rgba(0,200,255,0.12), rgba(100,150,255,0.08))',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                    {/* Top face */}
                    <div
                      className="absolute inset-0 rounded-lg border border-cyan-400/30"
                      style={{
                        transform: 'rotateX(90deg) translateZ(24px)',
                        background: 'linear-gradient(135deg, rgba(0,200,255,0.12), rgba(100,150,255,0.08))',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                    {/* Bottom face */}
                    <div
                      className="absolute inset-0 rounded-lg border border-cyan-400/30"
                      style={{
                        transform: 'rotateX(-90deg) translateZ(24px)',
                        background: 'linear-gradient(135deg, rgba(0,200,255,0.12), rgba(100,150,255,0.08))',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Perfect Transparent Glass Sphere */}
          <motion.div
            className="relative w-80 h-80 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.08), rgba(0,200,255,0.03))',
              backdropFilter: 'blur(30px)',
              border: '2px solid rgba(0,200,255,0.25)',
              boxShadow: `
                0 0 80px rgba(0,200,255,0.3),
                0 0 120px rgba(0,150,255,0.2),
                inset 0 0 80px rgba(0,200,255,0.05),
                inset -30px -30px 80px rgba(100,150,255,0.08)
              `,
            }}
            animate={{
              boxShadow: [
                '0 0 80px rgba(0,200,255,0.3), 0 0 120px rgba(0,150,255,0.2), inset 0 0 80px rgba(0,200,255,0.05)',
                '0 0 100px rgba(0,200,255,0.5), 0 0 150px rgba(0,150,255,0.3), inset 0 0 100px rgba(0,200,255,0.08)',
                '0 0 80px rgba(0,200,255,0.3), 0 0 120px rgba(0,150,255,0.2), inset 0 0 80px rgba(0,200,255,0.05)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Light refraction highlights */}
            <div
              className="absolute top-10 left-10 w-24 h-24 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                filter: 'blur(15px)',
              }}
            />
            <div
              className="absolute bottom-16 right-16 w-20 h-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0,200,255,0.3) 0%, transparent 70%)',
                filter: 'blur(12px)',
              }}
            />

            {/* 3D Shield with S - Glassmorphism with neon edges */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="relative"
                animate={{
                  rotateY: [0, 360],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Breathing neon pulse */}
                <motion.div
                  className="absolute inset-0 -m-12"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{
                    background: 'radial-gradient(circle, rgba(0,200,255,0.4) 0%, transparent 70%)',
                    filter: 'blur(25px)',
                  }}
                />

                {/* Shield Container */}
                <div className="relative w-40 h-40">
                  {/* Glassmorphic Shield */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,200,255,0.15), rgba(100,150,255,0.1))',
                      backdropFilter: 'blur(20px)',
                      border: '2px solid rgba(0,200,255,0.4)',
                      boxShadow: `
                        0 0 40px rgba(0,200,255,0.6),
                        inset 0 0 30px rgba(0,200,255,0.2),
                        inset 0 0 10px rgba(255,255,255,0.1)
                      `,
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    }}
                  />

                  {/* Internal neon edges */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160">
                    <motion.path
                      d="M 80 10 L 150 45 L 150 115 L 80 150 L 10 115 L 10 45 Z"
                      fill="none"
                      stroke="url(#neonGradient)"
                      strokeWidth="2"
                      animate={{
                        strokeOpacity: [0.6, 1, 0.6],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <defs>
                      <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00C8FF" />
                        <stop offset="50%" stopColor="#00FFFF" />
                        <stop offset="100%" stopColor="#0096FF" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Letter S - 3D with neon glow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="text-7xl font-black"
                      style={{
                        background: 'linear-gradient(135deg, #00C8FF, #00FFFF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 20px rgba(0,200,255,0.8)) drop-shadow(0 0 40px rgba(0,200,255,0.4))',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        textShadow: '0 0 30px rgba(0,200,255,0.6)',
                      }}
                      animate={{
                        filter: [
                          'drop-shadow(0 0 20px rgba(0,200,255,0.8)) drop-shadow(0 0 40px rgba(0,200,255,0.4))',
                          'drop-shadow(0 0 30px rgba(0,255,255,1)) drop-shadow(0 0 60px rgba(0,200,255,0.6))',
                          'drop-shadow(0 0 20px rgba(0,200,255,0.8)) drop-shadow(0 0 40px rgba(0,200,255,0.4))',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      S
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Text and Progress Bar */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center w-full max-w-2xl px-8">
        {/* SECORA Text */}
        <motion.h1
          className="text-7xl font-black tracking-[0.3em] mb-6"
          style={{
            color: '#FFFFFF',
            textShadow: '0 0 30px rgba(0,200,255,0.6), 0 0 60px rgba(0,200,255,0.3)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          SECORA
        </motion.h1>

        {/* LOADING Text */}
        <motion.p
          className="text-xl tracking-[0.3em] mb-8"
          style={{
            color: 'rgba(0,200,255,0.8)',
            textShadow: '0 0 20px rgba(0,200,255,0.4)',
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          LOADING...
        </motion.p>

        {/* Progress Bar */}
        <div className="relative w-full max-w-md mx-auto">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{
              background: 'rgba(0,200,255,0.1)',
              border: '1px solid rgba(0,200,255,0.2)',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
            }}
          >
            {/* Progress fill */}
            <motion.div
              className="h-full rounded-full relative"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #00C8FF 0%, #00FFFF 50%, #0096FF 100%)',
                boxShadow: '0 0 20px rgba(0,200,255,0.8), 0 0 40px rgba(0,200,255,0.4)',
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          </div>

          {/* Glow effect under progress bar */}
          <motion.div
            className="absolute -bottom-2 left-0 right-0 h-8"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,200,255,0.3), transparent)',
              filter: 'blur(10px)',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
}
