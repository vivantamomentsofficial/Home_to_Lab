import React, { useEffect, useRef } from 'react';

/**
 * AnimatedBackground
 * Minimal, peaceful, and lightweight ambient background.
 * - Extremely slow, subtle floating nodes (dust-mote pace)
 * - Faint, delicate connecting lines (no crowded webs)
 * - Calming pastel aurora gradients with soft 30s float
 * - Low particle count to keep screen completely airy and spacious
 */
const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Subtle mouse tracking
    const mouse = {
      x: null,
      y: null,
      radius: 120,
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Minimal palette: subtle sky blue & slate-indigo
    const colors = [
      '14, 165, 233',  // Sky blue
      '99, 102, 241',  // Indigo
    ];

    // Node particle class: very slow, small, minimal
    class Node {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Ultra-slow, barely perceptible drift
        this.vx = (Math.random() - 0.5) * 0.05;
        this.vy = (Math.random() - 0.5) * 0.05;
        this.radius = Math.random() * 0.6 + 1.2; // Tiny 1.2px - 1.8px
        this.rgb = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = Math.random() * 0.12 + 0.18; // Soft opacity
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges smoothly
        if (this.x < -10) this.x = width + 10;
        if (this.x > width + 10) this.x = -10;
        if (this.y < -10) this.y = height + 10;
        if (this.y > height + 10) this.y = -10;

        // Very gentle mouse nudge
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            this.x -= Math.cos(angle) * force * 0.4;
            this.y -= Math.sin(angle) * force * 0.4;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.rgb}, ${this.alpha})`;
        ctx.fill();
      }
    }

    let nodes = [];
    const initNodes = () => {
      nodes = [];
      // Minimal count: 10 on desktop, 6 on mobile - zero clutter
      const count = width < 768 ? 6 : 10;
      for (let i = 0; i < count; i++) {
        nodes.push(new Node());
      }
    };

    initNodes();

    const maxDistance = 75; // Small threshold to avoid webs of triangles

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const nLen = nodes.length;

      // Draw very faint, subtle lines only between nearby nodes
      for (let i = 0; i < nLen; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nLen; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.07; // Ultra-subtle
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(${n1.rgb}, ${lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Update & draw nodes
      for (let i = 0; i < nLen; i++) {
        nodes[i].update();
        nodes[i].draw();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* 1. Soft, Calm Aurora Gradients (Very slow 28s-35s drift) */}
      <div 
        className="absolute -top-32 left-[12%] w-[480px] sm:w-[600px] h-[480px] sm:h-[600px] rounded-full bg-gradient-to-br from-sky-200/25 via-blue-100/15 to-transparent blur-[100px]"
        style={{
          animation: 'orbFloat1 32s ease-in-out infinite alternate',
        }}
      />
      <div 
        className="absolute top-48 right-[8%] w-[440px] sm:w-[540px] h-[440px] sm:h-[540px] rounded-full bg-gradient-to-bl from-indigo-200/20 via-sky-100/15 to-transparent blur-[100px]"
        style={{
          animation: 'orbFloat2 38s ease-in-out infinite alternate',
        }}
      />

      {/* 2. Soft Dot Matrix Pattern */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 80%)',
        }}
      />

      {/* 3. Minimal Canvas Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
};

export default React.memo(AnimatedBackground);
