import React, { useRef, useEffect } from 'react';

interface FireEffectProps {
  intensity: number; // 0 to 1 (Volume slider)
  // Removed unused props for simplicity
}

const FireEffect: React.FC<FireEffectProps> = ({ intensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);

  // Update ref when prop changes so animation loop sees it
  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    // --- Simple Particle System ---
    const PARTICLES_COUNT = 350;
    const particles: {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      life: number; // 0 to 1
      decay: number;
      hue: number;
    }[] = [];

    const createParticle = () => {
      return {
        x: Math.random() * width,
        y: height + Math.random() * 50, 
        size: Math.random() * 3 + 2,
        speedY: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 1.5,
        life: 1.0,
        decay: Math.random() * 0.01 + 0.005,
        hue: Math.random() * 35 + 5, // Deep Red/Orange/Yellow
      };
    };

    // Initialize
    for (let i = 0; i < PARTICLES_COUNT; i++) {
      const p = createParticle();
      // Scatter vertically initially
      p.y = Math.random() * height + height * 0.5;
      p.life = Math.random();
      particles.push(p);
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      const currentIntensity = intensityRef.current;

      // Only animate if volume/intensity is up
      if (currentIntensity > 0.01) {
        
        // 1. Warm Background Glow (Breath)
        const time = Date.now() * 0.002;
        const breath = Math.sin(time) * 0.1 + 0.9;
        
        const glowHeight = height * (0.3 * currentIntensity);
        const glow = ctx.createLinearGradient(0, height, 0, height - glowHeight);
        glow.addColorStop(0, `rgba(255, 60, 0, ${0.15 * currentIntensity * breath})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // 2. Particles
        ctx.globalCompositeOperation = 'lighter'; // Additive blending makes it look like fire

        // Scale number of visible particles by intensity
        const activeCount = Math.floor(PARTICLES_COUNT * (0.2 + currentIntensity * 0.8));

        for (let i = 0; i < activeCount; i++) {
          const p = particles[i];

          // Move
          p.y -= p.speedY * (1 + currentIntensity); // Move faster with higher intensity
          p.x += p.speedX + Math.sin(p.y * 0.05 + time) * 0.5;
          p.life -= p.decay;

          // Respawn
          if (p.life <= 0 || p.y < -50) {
            Object.assign(p, createParticle());
            p.y = height + Math.random() * 20;
            p.x = Math.random() * width;
          }

          // Draw
          const opacity = p.life * (0.3 + currentIntensity * 0.7);
          ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, ${opacity})`;
          
          ctx.beginPath();
          // Size scales with life and intensity
          const currentSize = p.size * p.life * (0.8 + currentIntensity * 0.5);
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Empty dependency array, relying on ref for intensity updates

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[1] transition-opacity duration-500"
      style={{ opacity: intensity > 0 ? 1 : 0 }}
    />
  );
};

export default FireEffect;