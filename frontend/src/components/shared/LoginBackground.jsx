import React, { useEffect, useRef } from 'react';
import backgroundImage from '../../assets/crudex_background_1780402204249.png';

const LoginBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.15,
        color: Math.random() > 0.4 ? '#ff7944' : '#eed6c4',
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const waveCount = 4;
    const waveOffsets = Array.from({ length: waveCount }, () => Math.random() * 100);

    const drawSimulation = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1.2;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        waveOffsets[w] += 0.003;
        
        ctx.strokeStyle = `rgba(255, 121, 68, ${0.05 - w * 0.01})`;
        for (let x = 0; x < width; x += 10) {
          const y = height / 2 + 
            Math.sin(x * 0.0025 + waveOffsets[w]) * 120 * Math.sin(waveOffsets[w] * 0.5) +
            Math.cos(x * 0.001 - waveOffsets[w]) * 40;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      particles.forEach((p) => {
        p.pulsePhase += p.pulseSpeed;
        const currentAlpha = p.alpha + Math.sin(p.pulsePhase) * 0.08;
        
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.3, p.color + '88');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
      });

      animationFrameId = requestAnimationFrame(drawSimulation);
    };

    drawSimulation();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Static Background Image */}
      <div 
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Animated Particles & Waves Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 mix-blend-screen"
      />
    </>
  );
};

export default LoginBackground;
