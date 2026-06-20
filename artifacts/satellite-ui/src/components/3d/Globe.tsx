import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const GlobeScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const stars: { x: number; y: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5,
        alpha: Math.random() * 0.8 + 0.2,
      });
    }

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Stars
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * (0.6 + 0.4 * Math.sin(t * 0.8 + s.x))})`;
        ctx.fill();
      });

      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.34;

      // Outer glow ring
      const glowGrad = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.3);
      glowGrad.addColorStop(0, 'rgba(6,182,212,0.15)');
      glowGrad.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Globe base
      const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      grad.addColorStop(0, 'rgba(6,40,80,0.95)');
      grad.addColorStop(0.5, 'rgba(3,15,40,0.9)');
      grad.addColorStop(1, 'rgba(1,5,20,0.85)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Lat/lon grid lines (wireframe globe)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      const phase = t * 0.12;
      const numLon = 12;
      for (let i = 0; i < numLon; i++) {
        const angle = (i / numLon) * Math.PI + phase;
        const a = Math.cos(angle);
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(a) * R, R, 0, 0, Math.PI * 2);
        const alpha = 0.05 + 0.1 * Math.abs(a);
        ctx.strokeStyle = `rgba(6,182,212,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      const numLat = 7;
      for (let j = 1; j < numLat; j++) {
        const lat = (j / numLat) * Math.PI;
        const ry = Math.sin(lat) * R;
        const yOff = Math.cos(lat) * R;
        ctx.beginPath();
        ctx.ellipse(cx, cy + yOff, ry, ry * 0.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6,182,212,0.12)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Equator highlight
      ctx.beginPath();
      ctx.ellipse(cx, cy, R, R * 0.08, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59,130,246,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // Globe rim highlight
      const rimGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      rimGrad.addColorStop(0, 'rgba(6,182,212,0.4)');
      rimGrad.addColorStop(0.5, 'rgba(59,130,246,0.1)');
      rimGrad.addColorStop(1, 'rgba(139,92,246,0.3)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Specular highlight
      const specGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, 0, cx - R * 0.3, cy - R * 0.3, R * 0.5);
      specGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
      specGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();

      // Orbiting satellite
      const satOrbitA = R * 1.45;
      const satOrbitB = R * 0.5;
      const satAngle = t * 0.7;
      const satX = cx + Math.cos(satAngle) * satOrbitA;
      const satY = cy + Math.sin(satAngle) * satOrbitB;

      // Satellite trail
      const trailLen = 30;
      for (let i = 0; i < trailLen; i++) {
        const ta = satAngle - i * 0.06;
        const tx = cx + Math.cos(ta) * satOrbitA;
        const ty = cy + Math.sin(ta) * satOrbitB;
        ctx.beginPath();
        ctx.arc(tx, ty, 1.5 * (1 - i / trailLen), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${0.6 * (1 - i / trailLen)})`;
        ctx.fill();
      }

      // Satellite dot
      ctx.beginPath();
      ctx.arc(satX, satY, 4, 0, Math.PI * 2);
      const satGrad = ctx.createRadialGradient(satX, satY, 0, satX, satY, 8);
      satGrad.addColorStop(0, 'rgba(6,182,212,1)');
      satGrad.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.fillStyle = satGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(satX, satY, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // Orbit path (ellipse)
      ctx.beginPath();
      ctx.ellipse(cx, cy, satOrbitA, satOrbitB, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6,182,212,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Second satellite (counter-orbit)
      const sat2Angle = -t * 0.4 + Math.PI / 2;
      const sat2X = cx + Math.cos(sat2Angle) * satOrbitA * 0.9;
      const sat2Y = cy + Math.sin(sat2Angle) * satOrbitB * 1.4;
      for (let i = 0; i < 20; i++) {
        const ta = sat2Angle + i * 0.04;
        const tx = cx + Math.cos(ta) * satOrbitA * 0.9;
        const ty = cy + Math.sin(ta) * satOrbitB * 1.4;
        ctx.beginPath();
        ctx.arc(tx, ty, 1 * (1 - i / 20), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${0.5 * (1 - i / 20)})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(sat2X, sat2Y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#8b5cf6';
      ctx.fill();

      // Scanning arc
      const scanAngle = (t * 0.3) % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R * 1.1, scanAngle, scanAngle + 0.4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(6,182,212,0.04)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.1, scanAngle, scanAngle + 0.4);
      ctx.strokeStyle = 'rgba(6,182,212,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      t += 0.016;
      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={520}
        height={520}
        className="w-full h-full object-contain"
        style={{ maxWidth: '520px', maxHeight: '520px' }}
      />
      {/* Telemetry overlays */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute top-4 right-4 font-mono text-xs text-primary/60 space-y-1 text-right"
      >
        <div>SAT-1A TRACK</div>
        <div className="text-primary">INC 28.5 DEG</div>
        <div>ALT 705 KM</div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-4 left-4 font-mono text-xs text-secondary/60 space-y-1"
      >
        <div>FRAME SYNC</div>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-secondary"
        >
          ACQUIRING...
        </motion.div>
      </motion.div>
    </div>
  );
};

export default GlobeScene;
