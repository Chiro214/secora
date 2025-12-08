'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Vulnerability {
  id: string;
  name: string;
  severity: string;
  location: { lat: number; lng: number };
}

interface Globe3DProps {
  vulnerabilities: Vulnerability[];
  onSelect: (vuln: Vulnerability) => void;
  selectedId?: string;
}

export default function Globe3D({ vulnerabilities, onSelect, selectedId }: Globe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    let animationId: number;

    const drawGlobe = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw globe outline
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw globe fill
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw latitude lines
      for (let i = -60; i <= 60; i += 30) {
        ctx.beginPath();
        const y = centerY + (i / 90) * radius;
        const lineRadius = Math.sqrt(radius * radius - ((i / 90) * radius) ** 2);
        ctx.ellipse(centerX, y, lineRadius, lineRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw longitude lines
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + rotationRef.current;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius * Math.abs(Math.cos(angle)), radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw vulnerability points
      vulnerabilities.forEach((vuln) => {
        const lat = vuln.location.lat;
        const lng = vuln.location.lng + rotationRef.current * 50;

        // Convert lat/lng to 3D coordinates
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);

        const x = centerX + radius * Math.sin(phi) * Math.cos(theta);
        const y = centerY + radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        // Only draw if point is on visible side
        if (z > -radius * 0.3) {
          const size = vuln.id === selectedId ? 12 : 8;
          const opacity = z > 0 ? 1 : 0.3;

          // Draw glow
          const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
          const color = 
            vuln.severity === 'Critical' ? '239, 68, 68' :
            vuln.severity === 'High' ? '251, 146, 60' :
            vuln.severity === 'Medium' ? '234, 179, 8' :
            '59, 130, 246';
          
          glowGradient.addColorStop(0, `rgba(${color}, ${opacity * 0.8})`);
          glowGradient.addColorStop(1, `rgba(${color}, 0)`);
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(x, y, size * 2, 0, Math.PI * 2);
          ctx.fill();

          // Draw point
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color}, ${opacity})`;
          ctx.fill();

          // Draw pulse for selected
          if (vuln.id === selectedId) {
            const pulseSize = size + Math.sin(Date.now() / 200) * 4;
            ctx.beginPath();
            ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${color}, ${opacity * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      });

      rotationRef.current += 0.002;
      animationId = requestAnimationFrame(drawGlobe);
    };

    drawGlobe();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [vulnerabilities, selectedId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

    // Find clicked vulnerability
    vulnerabilities.forEach((vuln) => {
      const lat = vuln.location.lat;
      const lng = vuln.location.lng + rotationRef.current * 50;

      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);

      const vx = centerX + radius * Math.sin(phi) * Math.cos(theta);
      const vy = centerY + radius * Math.cos(phi);
      const vz = radius * Math.sin(phi) * Math.sin(theta);

      if (vz > -radius * 0.3) {
        const distance = Math.sqrt((x - vx) ** 2 + (y - vy) ** 2);
        if (distance < 15) {
          onSelect(vuln);
        }
      }
    });
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        onClick={handleClick}
        className="w-full h-auto cursor-pointer"
        style={{ maxHeight: '500px' }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3">
        <div className="text-xs text-slate-400 mb-2">Severity</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-300">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-slate-300">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-slate-300">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-300">Low</span>
          </div>
        </div>
      </div>

      {/* Interaction Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute top-4 right-4 bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-2"
      >
        <p className="text-xs text-cyan-300">Click points to view details</p>
      </motion.div>
    </div>
  );
}
