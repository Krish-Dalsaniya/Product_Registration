import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Check, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import backgroundImage from '../../assets/crudex_background_1780402204249.png';
import { resetPasswordApi } from '../../api/auth';

const LoginPage = () => {
  const { login, loginWith2FA, isAuthenticated, user } = useAuth();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password Reset and 2FA State
  const [viewState, setViewState] = useState('login'); // 'login', 'reset', '2fa', '2fa-setup'
  const [tempToken, setTempToken] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const navigate = useNavigate();

  const rememberMeVal = watch('rememberMe');

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('rememberMe', true);
    }
  }, [setValue]);

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

  const handleCardMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tiltX = ((y - centerY) / centerY) * -12; 
    const tiltY = ((x - centerX) / centerX) * 12;  

    setRotateX(tiltX);
    setRotateY(tiltY);
    setIsHovering(true);

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    setGlarePosition({ x: percentX, y: percentY });
  };

  const handleCardMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovering(false);
  };

  const onSubmit = async (data) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const loginResponse = await login(data.email, data.password, data.rememberMe);
      
      if (loginResponse.require2FA) {
        setTempToken(loginResponse.tempToken);
        setViewState('2fa');
        return;
      }
      
      if (loginResponse.require2FASetup) {
        setTempToken(loginResponse.tempToken);
        setQrCodeUrl(loginResponse.qrCodeUrl);
        setSecret(loginResponse.secret);
        setViewState('2fa-setup');
        return;
      }

      const loggedUser = loginResponse.user;
      
      if (data.rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      await Swal.fire({
        title: 'Login Successful',
        text: `Welcome back, ${loggedUser.full_name}.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        iconColor: '#10b981'
      });

      const roleRoutes = {
        Admin: '/admin/dashboard',
        Designer: '/designer/dashboard',
        Sales: '/sales/dashboard',
        Maintenance: '/maintenance/dashboard'
      };
      
      navigate(roleRoutes[loggedUser.role_name] || '/dashboard');

    } catch (error) {
      setErrorMessage(error.message || 'Authentication failed.');
      toast.error(error.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (data) => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      await resetPasswordApi(data.email, data.newPassword);
      toast.success('Password successfully reset! Please login.', { icon: '🎉' });
      setViewState('login');
      setValue('password', '');
    } catch (error) {
      toast.error(error.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (data) => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const loggedUser = await loginWith2FA(tempToken, data.otp, data.rememberMe);
      
      await Swal.fire({
        title: 'Login Successful',
        text: `Welcome back, ${loggedUser.full_name}.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        iconColor: '#10b981'
      });

      const roleRoutes = {
        Admin: '/admin/dashboard',
        Designer: '/designer/dashboard',
        Sales: '/sales/dashboard',
        Maintenance: '/maintenance/dashboard',
        Accountant: '/accountant/dashboard',
        HR: '/hr/dashboard'
      };
      
      navigate(roleRoutes[loggedUser.role_name] || '/dashboard');
    } catch (error) {
      setErrorMessage(error.message || 'Invalid 2FA code.');
      toast.error(error.message || 'Invalid 2FA code.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated && user) {
    const roleRoutes = {
      Admin: '/admin/dashboard',
      Designer: '/designer/dashboard',
      Sales: '/sales/dashboard',
      Maintenance: '/maintenance/dashboard'
    };
    return <Navigate to={roleRoutes[user.role_name] || '/dashboard'} />;
  }

  return (
    <div 
      className="relative min-h-screen w-full flex flex-col items-center justify-center font-sans select-none overflow-x-hidden bg-[#ecdcd0]"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dynamic Background Light Canvas Animation */}
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      />

      <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center relative z-10">
        
        <div className="flex flex-col items-center justify-center w-full max-w-md">
          
          {/* BRAND LOGO BAR BADGE */}
          <div className="mb-8 bg-white/95 backdrop-blur-md rounded-[1.25rem] px-8 py-4 flex flex-col items-center justify-center shadow-[0_12px_32px_rgba(237,220,208,0.4),_0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_16px_40px_rgba(237,220,208,0.6)] border border-white/40">
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

          {/* ERROR POPUP WINDOW */}
          {errorMessage && (
            <div className="w-full mb-4 translate-y-0 animate-fade-in bg-rose-50 border border-rose-200 text-rose-800 text-sm p-4 rounded-2xl flex items-start gap-3 shadow-[0_8px_20px_rgba(244,63,94,0.06)]">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900">Access Restricted</p>
                <p className="text-[13px] text-rose-700/90 leading-relaxed mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* 3D TILT CARD */}
          <div
            ref={cardRef}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="w-full bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-11 border border-white/50 transition-all duration-300 relative overflow-hidden"
            style={{
              transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovering ? 1.015 : 1}, ${isHovering ? 1.015 : 1}, 1)`,
              boxShadow: isHovering 
                ? '0 30px_70px_rgba(238,138,102,0.18), 0 10px_30px_rgba(0,0,0,0.03)' 
                : '0 25px_55px_rgba(238,138,102,0.11), 0 4px_16px_rgba(0,0,0,0.02)',
              transition: isHovering ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease',
            }}
          >
            {isHovering && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 duration-200"
                style={{
                  background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 121, 68, 0.05) 0%, rgba(255,255,255,0) 70%)`
                }}
              />
            )}

            {viewState === 'login' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                {/* USERNAME */}
                <div className="group flex flex-col space-y-2">
                  <label htmlFor="email" className="text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[#8c8279] transition-colors duration-200 group-focus-within:text-[#ff7944]">
                    Username / Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="text"
                      disabled={isLoading}
                      {...register('email', { 
                        required: 'Email address is required',
                        pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' }
                      })}
                      placeholder="Enter Username or Email"
                      className={`w-full h-14 pl-5 pr-5 bg-[#faf5f0]/70 border ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : 'border-[#eddcd0] focus:ring-[#ff7944]/10 focus:border-[#ff7944]'} rounded-2xl text-stone-800 placeholder-[#b0a59a] text-sm font-medium focus:ring-4 focus:bg-white outline-none transition-all duration-300 disabled:opacity-70`}
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-[10px] mt-1 font-bold tracking-wide uppercase">{errors.email.message}</p>}
                </div>

                {/* PASSWORD */}
                <div className="group flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[#8c8279] transition-colors duration-200 group-focus-within:text-[#ff7944]">
                      Password
                    </label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setViewState('reset');
                        setValue('email', '');
                        setValue('newPassword', '');
                        setValue('confirmPassword', '');
                      }}
                      className="text-[10px] font-bold text-[#ff7944] uppercase tracking-wider hover:underline"
                    >
                      Reset Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      disabled={isLoading}
                      {...register('password', { required: 'Password is required' })}
                      placeholder="••••••••"
                      className={`w-full h-14 pl-5 pr-12 bg-[#faf5f0]/70 border ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : 'border-[#eddcd0] focus:ring-[#ff7944]/10 focus:border-[#ff7944]'} rounded-2xl text-stone-800 placeholder-[#b0a59a]/70 text-sm tracking-widest focus:ring-4 focus:bg-white outline-none transition-all duration-300 disabled:opacity-70`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#b0a59a] hover:text-[#ff7944] hover:bg-[#ff7944]/5 transition-all outline-none"
                    >
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-[10px] mt-1 font-bold tracking-wide uppercase">{errors.password.message}</p>}
                </div>

                {/* REMEMBER */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        {...register('rememberMe')}
                        className="sr-only"
                        disabled={isLoading}
                      />
                      <div className={`w-[22px] h-[22px] border rounded-lg flex items-center justify-center transition-all duration-300 ${rememberMeVal ? 'bg-[#ff7944] border-[#ff7944] shadow-[0_4px_10px_rgba(255,121,68,0.25)]' : 'bg-neutral-50 border-[#eddcd0] group-hover:border-[#ff7944]/60'}`}>
                        {rememberMeVal && <Check className="w-4.5 h-4.5 text-white stroke-[3px]" />}
                      </div>
                    </div>
                    <span className="text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[#8c8279] group-hover:text-stone-700 transition-colors">
                      Remember Me
                    </span>
                  </label>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 bg-gradient-to-r from-[#ff8753] to-[#fc6736] text-white rounded-2xl text-sm tracking-[0.16em] font-extrabold uppercase shadow-[0_12px_28px_rgba(252,103,54,0.3)] hover:shadow-[0_16px_36px_rgba(252,103,54,0.45)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 group border border-white/10 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_12px_28px_rgba(252,103,54,0.3)]"
                  >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 text-white" /> : (
                      <>
                        Login
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {viewState === 'reset' && (
              <form onSubmit={handleSubmit(handleResetSubmit)} className="space-y-6 relative z-10">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-black text-stone-800 tracking-wide uppercase">Reset Password</h3>
                  <p className="text-xs text-[#8c8279] mt-2 font-medium">Enter your email and new password.</p>
                </div>

                <div className="group flex flex-col space-y-2">
                  <label htmlFor="reset-email" className="text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[#8c8279] transition-colors duration-200 group-focus-within:text-[#ff7944]">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="reset-email"
                      type="text"
                      disabled={isLoading}
                      {...register('email', { 
                        required: 'Email address is required',
                        pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' }
                      })}
                      placeholder="Enter your email"
                      className={`w-full h-14 pl-5 pr-5 bg-[#faf5f0]/70 border ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : 'border-[#eddcd0] focus:ring-[#ff7944]/10 focus:border-[#ff7944]'} rounded-2xl text-stone-800 placeholder-[#b0a59a] text-sm font-medium focus:ring-4 focus:bg-white outline-none transition-all duration-300 disabled:opacity-70`}
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-[10px] mt-1 font-bold tracking-wide uppercase">{errors.email.message}</p>}
                </div>

                <div className="group flex flex-col space-y-2">
                  <label className="text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[#8c8279]">New Password</label>
                  <input
                    type="password"
                    disabled={isLoading}
                    {...register('newPassword', { required: 'New password is required' })}
                    placeholder="••••••••"
                    className="w-full h-14 pl-5 pr-5 bg-[#faf5f0]/70 border border-[#eddcd0] focus:ring-[#ff7944]/10 focus:border-[#ff7944] rounded-2xl text-stone-800 text-sm font-medium focus:ring-4 focus:bg-white outline-none transition-all duration-300"
                  />
                  {errors.newPassword && <p className="text-red-400 text-[10px] mt-1 font-bold tracking-wide uppercase">{errors.newPassword.message}</p>}
                </div>

                <div className="group flex flex-col space-y-2">
                  <label className="text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[#8c8279]">Confirm Password</label>
                  <input
                    type="password"
                    disabled={isLoading}
                    {...register('confirmPassword', { required: 'Confirm password is required' })}
                    placeholder="••••••••"
                    className="w-full h-14 pl-5 pr-5 bg-[#faf5f0]/70 border border-[#eddcd0] focus:ring-[#ff7944]/10 focus:border-[#ff7944] rounded-2xl text-stone-800 text-sm font-medium focus:ring-4 focus:bg-white outline-none transition-all duration-300"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 bg-gradient-to-r from-[#ff8753] to-[#fc6736] text-white rounded-2xl text-sm tracking-[0.16em] font-extrabold uppercase shadow-[0_12px_28px_rgba(252,103,54,0.3)] hover:shadow-[0_16px_36px_rgba(252,103,54,0.45)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-300"
                  >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 text-white" /> : 'Reset Password'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setViewState('login')}
                    className="text-xs font-bold text-[#8c8279] hover:text-[#ff7944] uppercase tracking-wider transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}

            {viewState === '2fa' && (
              <form onSubmit={handleSubmit(handle2FASubmit)} className="space-y-6 relative z-10">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-black text-stone-800 tracking-wide uppercase">Two-Factor Authentication</h3>
                  <p className="text-xs text-[#8c8279] mt-2 font-medium">Enter the 6-digit code from your authenticator app.</p>
                </div>

                <div className="group flex flex-col space-y-2">
                  <label htmlFor="otp" className="text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[#8c8279] transition-colors duration-200 group-focus-within:text-[#ff7944]">
                    Authenticator Code
                  </label>
                  <div className="relative">
                    <input
                      id="otp"
                      type="text"
                      disabled={isLoading}
                      {...register('otp', { 
                        required: 'Code is required',
                        pattern: { value: /^[0-9]{6}$/, message: 'Must be exactly 6 digits' }
                      })}
                      placeholder="000000"
                      maxLength={6}
                      className={`w-full h-14 text-center text-xl tracking-[0.5em] bg-[#faf5f0]/70 border ${errors.otp ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : 'border-[#eddcd0] focus:ring-[#ff7944]/10 focus:border-[#ff7944]'} rounded-2xl text-stone-800 placeholder-[#b0a59a] font-medium focus:ring-4 focus:bg-white outline-none transition-all duration-300 disabled:opacity-70`}
                    />
                  </div>
                  {errors.otp && <p className="text-red-400 text-[10px] mt-1 font-bold tracking-wide uppercase text-center">{errors.otp.message}</p>}
                </div>

                <div className="pt-2 flex gap-4">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setViewState('login');
                      setTempToken('');
                    }}
                    className="flex-1 h-14 bg-stone-100 text-stone-600 rounded-2xl text-sm tracking-[0.16em] font-extrabold uppercase hover:bg-stone-200 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-14 bg-gradient-to-r from-[#ff8753] to-[#fc6736] text-white rounded-2xl text-sm tracking-[0.16em] font-extrabold uppercase shadow-[0_12px_28px_rgba(252,103,54,0.3)] hover:shadow-[0_16px_36px_rgba(252,103,54,0.45)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 text-white" /> : 'Verify'}
                  </button>
                </div>
              </form>
            )}

            {viewState === '2fa-setup' && (
              <form onSubmit={handleSubmit(handle2FASubmit)} className="space-y-6 relative z-10">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-black text-stone-800 tracking-wide uppercase">Setup 2FA to Continue</h3>
                  <p className="text-xs text-[#8c8279] mt-2 font-medium">Scan the QR code with your Authenticator App.</p>
                </div>

                <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 shadow-sm border border-[#eddcd0]">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="w-32 h-32 rounded-lg" />}
                  <p className="text-[10px] text-[#8c8279] mt-3 font-mono font-bold tracking-widest">{secret}</p>
                </div>

                <div className="group flex flex-col space-y-2">
                  <label htmlFor="otp" className="text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[#8c8279] transition-colors duration-200 group-focus-within:text-[#ff7944]">
                    Verify Code
                  </label>
                  <div className="relative">
                    <input
                      id="otp"
                      type="text"
                      disabled={isLoading}
                      {...register('otp', { 
                        required: 'Code is required',
                        pattern: { value: /^[0-9]{6}$/, message: 'Must be exactly 6 digits' }
                      })}
                      placeholder="000000"
                      maxLength={6}
                      className={`w-full h-14 text-center text-xl tracking-[0.5em] bg-[#faf5f0]/70 border ${errors.otp ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : 'border-[#eddcd0] focus:ring-[#ff7944]/10 focus:border-[#ff7944]'} rounded-2xl text-stone-800 placeholder-[#b0a59a] font-medium focus:ring-4 focus:bg-white outline-none transition-all duration-300 disabled:opacity-70`}
                    />
                  </div>
                  {errors.otp && <p className="text-red-400 text-[10px] mt-1 font-bold tracking-wide uppercase text-center">{errors.otp.message}</p>}
                </div>

                <div className="pt-2 flex gap-4">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setViewState('login');
                      setTempToken('');
                      setQrCodeUrl('');
                      setSecret('');
                    }}
                    className="flex-1 h-14 bg-stone-100 text-stone-600 rounded-2xl text-sm tracking-[0.16em] font-extrabold uppercase hover:bg-stone-200 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-14 bg-gradient-to-r from-[#ff8753] to-[#fc6736] text-white rounded-2xl text-sm tracking-[0.16em] font-extrabold uppercase shadow-[0_12px_28px_rgba(252,103,54,0.3)] hover:shadow-[0_16px_36px_rgba(252,103,54,0.45)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 text-white" /> : 'Complete Setup'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
