import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../../assets/crudex_background_1780402204249.png';
import AddEmployeeWizard from '../hr/pages/AddEmployeeWizard';
import { ArrowLeft } from 'lucide-react';

const RegisterPage = () => {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

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
    <div 
      className="relative min-h-screen w-full flex flex-col items-center justify-center font-sans select-none overflow-x-hidden bg-[#ecdcd0] py-12"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dynamic Background Light Canvas Animation */}
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      />

      <div className="w-full max-w-[1200px] mx-auto px-4 flex flex-col items-center justify-center relative z-10">
        
        {/* BRAND LOGO BAR BADGE */}
        <div className="mb-8 bg-white/95 backdrop-blur-md rounded-[1.25rem] px-8 py-4 flex flex-col items-center justify-center shadow-[0_12px_32px_rgba(237,220,208,0.4),_0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_16px_40px_rgba(237,220,208,0.6)] border border-white/40 cursor-pointer" onClick={() => navigate('/login')}>
          <h1 className="text-xl sm:text-2xl font-bold tracking-[0.25em] text-[#1c1917] flex items-center justify-center">
            C R U D 
            <span className="text-[#ff7944] font-extrabold ml-[0.25em] relative">
              E X
              <span className="absolute -top-[1.5px] -right-[1.5px] w-1 h-1 bg-[#ff7944] rounded-full animate-ping"></span>
            </span>
          </h1>
          <p className="text-[0.62rem] tracking-[0.25em] font-medium text-[#8c8279] mt-2 uppercase">
            Synergies With Energies
          </p>
        </div>

        {/* STATIC CARD containing the Wizard */}
        <div
          className="w-full bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-4 sm:p-8 md:p-11 border border-white/50 relative overflow-hidden shadow-[0_25px_55px_rgba(238,138,102,0.11),_0_4px_16px_rgba(0,0,0,0.02)]"
        >
          <div className="relative z-20">
            <button 
              onClick={() => navigate('/login')}
              className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8c8279] hover:text-[#ff7944] transition-colors"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tight text-[#1c1917]">
                Join Leon's Group
              </h2>
              <p className="text-[#8c8279] mt-2 uppercase tracking-widest text-xs font-bold">
                Public Employee Registration
              </p>
            </div>
            
            <AddEmployeeWizard isPublicRegistration={true} />
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default RegisterPage;
