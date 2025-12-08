'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface SecoraLoaderProps {
  progress?: number;
  onComplete?: () => void;
}

export function SecoraLoader({ progress = 0, onComplete }: SecoraLoaderProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (progress > 0) {
      setLoadingProgress(progress);
      if (progress >= 100 && onComplete) {
        setTimeout(onComplete, 500);
      }
    } else {
      // Auto-increment if no progress provided
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            if (onComplete) setTimeout(onComplete, 500);
            return 100;
          }
          return prev + 1;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [progress, onComplete]);

  // Generate 8 orbiting cubes
  const cubes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 360) / 8,
  }));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-b from-[#010313] via-[#020618] to-[#030720] overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Radial gradient glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(75,163,255,0.15) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Secondary violet glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.1) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating particles */}
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Main Loading Animation Container */}
      <div className="relative z-10">
        {/* 3D Glass Sphere with Shield */}
        <motion.div
          className="relative w-[400px] h-[400px] flex items-center justify-center"
          animate={{
            y: [0, -20, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Orbiting Cubes */}
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
                  duration: 12,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <motion.div
                  className="relative"
                  style={{
                    transform: 'translateX(180px) translateY(-20px)',
                  }}
                  animate={{
                    rotateX: [0, 360],
                    rotateY: [0, 360],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  {/* 3D Cube */}
                  <div className="relative w-12 h-12 preserve-3d">
                    {/* Cube faces */}
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/40 backdrop-blur-sm border border-primary/30 rounded-lg"
                      style={{
                        transform: 'translateZ(24px)',
                        boxShadow: '0 0 20px rgba(75,163,255,0.4), inset 0 0 20px rgba(75,163,255,0.2)',
                      }}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 backdrop-blur-sm border border-primary/20 rounded-lg"
                      style={{
                        transform: 'translateZ(-24px)',
                        boxShadow: '0 0 15px rgba(75,163,255,0.3)',
                      }}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/35 to-secondary/35 backdrop-blur-sm border border-primary/25 rounded-lg"
                      style={{
                        transform: 'rotateY(90deg) translateZ(24px)',
                        boxShadow: '0 0 15px rgba(75,163,255,0.3)',
                      }}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/35 to-secondary/35 backdrop-blur-sm border border-primary/25 rounded-lg"
                      style={{
                        transform: 'rotateY(-90deg) translateZ(24px)',
                        boxShadow: '0 0 15px rgba(75,163,255,0.3)',
                      }}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/35 to-secondary/35 backdrop-blur-sm border border-primary/25 rounded-lg"
                      style={{
                        transform: 'rotateX(90deg) translateZ(24px)',
                        boxShadow: '0 0 15px rgba(75,163,255,0.3)',
                      }}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/35 to-secondary/35 backdrop-blur-sm border border-primary/25 rounded-lg"
                      style={{
                        transform: 'rotateX(-90deg) translateZ(24px)',
                        boxShadow: '0 0 15px rgba(75,163,255,0.3)',
                      }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Glass Sphere */}
          <motion.div
            className="relative w-64 h-64 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(75,163,255,0.15), rgba(147,51,234,0.1))',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(75,163,255,0.3)',
              boxShadow: `
                0 0 60px rgba(75,163,255,0.4),
                0 0 100px rgba(147,51,234,0.2),
                inset 0 0 60px rgba(75,163,255,0.1),
                inset -20px -20px 60px rgba(147,51,234,0.1)
              `,
            }}
            animate={{
              boxShadow: [
                '0 0 60px rgba(75,163,255,0.4), 0 0 100px rgba(147,51,234,0.2), inset 0 0 60px rgba(75,163,255,0.1)',
                '0 0 80px rgba(75,163,255,0.6), 0 0 120px rgba(147,51,234,0.3), inset 0 0 80px rgba(75,163,255,0.15)',
                '0 0 60px rgba(75,163,255,0.4), 0 0 100px rgba(147,51,234,0.2), inset 0 0 60px rgba(75,163,255,0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Refraction highlights */}
            <div
              className="absolute top-8 left-8 w-20 h-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                filter: 'blur(10px)',
              }}
            />
            <div
              className="absolute bottom-12 right-12 w-16 h-16 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(147,51,234,0.3) 0%, transparent 70%)',
                filter: 'blur(8px)',
              }}
            />

            {/* Shield Logo with S */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="relative"
                animate={{
                  rotateY: [0, 360],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Shield background glow */}
                <motion.div
                  className="absolute inset-0 -m-8"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    background: 'radial-gradient(circle, rgba(75,163,255,0.4) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                  }}
                />

                {/* 3D Shield */}
                <div className="relative w-32 h-32">
                  <Shield
                    className="w-full h-full text-primary drop-shadow-[0_0_30px_rgba(75,163,255,0.8)]"
                    strokeWidth={1.5}
                  />

                  {/* Letter S */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="text-6xl font-bold text-white"
                      style={{
                        textShadow: `
                          0 0 20px rgba(75,163,255,0.8),
                          0 0 40px rgba(75,163,255,0.5),
                          0 0 60px rgba(75,163,255,0.3)
                        `,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontWeight: 900,
                      }}
                      animate={{
                        textShadow: [
                          '0 0 20px rgba(75,163,255,0.8), 0 0 40px rgba(75,163,255,0.5)',
                          '0 0 30px rgba(75,163,255,1), 0 0 60px rgba(75,163,255,0.7)',
                          '0 0 20px rgba(75,163,255,0.8), 0 0 40px rgba(75,163,255,0.5)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      S
                    </motion.div>
                  </div>

                  {/* Scanning ray */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/40 to-transparent"
                    animate={{
                      y: ['-100%', '200%'],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    style={{ mixBlendMode: 'screen' }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Orbital ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            style={{
              width: '420px',
              height: '420px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              rotate: 360,
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            {/* Orbital particles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(75,163,255,0.8)]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_rgba(147,51,234,0.8)]" />
          </motion.div>
        </motion.div>

        {/* Text and Progress Bar */}
        <div className="mt-16 text-center">
          {/* SECORA Text */}
          <motion.h1
            className="text-5xl font-bold tracking-[0.3em] mb-4"
            style={{
              color: '#E8F0FF',
              textShadow: '0 0 20px rgba(75,163,255,0.5), 0 0 40px rgba(75,163,255,0.3)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            SECORA
          </motion.h1>

          {/* Loading Text */}
          <motion.p
            className="text-lg text-[#E8F0FF]/60 tracking-[0.2em] mb-6"
            animate={{
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            LOADING...
          </motion.p>

          {/* Progress Bar */}
          <div className="w-80 mx-auto">
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
              {/* Progress fill */}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #4BA3FF 0%, #5AA7FF 50%, #9333EA 100%)',
                  boxShadow: '0 0 20px rgba(75,163,255,0.6), 0 0 40px rgba(75,163,255,0.3)',
                  width: `${loadingProgress}%`,
                }}
                initial={{ width: '0%' }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>

              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(75,163,255,0.3), transparent)',
                  filter: 'blur(8px)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* Progress percentage */}
            <motion.p
              className="text-sm text-primary/80 mt-3 font-mono"
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {Math.round(loadingProgress)}%
            </motion.p>
          </div>
        </div>
      </div>

      {/* Bottom ambient glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to top, rgba(75,163,255,0.1), transparent)',
        }}
      />
    </div>
  );
}
