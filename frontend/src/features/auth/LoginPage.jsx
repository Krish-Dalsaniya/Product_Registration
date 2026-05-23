import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import ErrorBanner from '../../components/shared/ErrorBanner';
import loginBg from '../../assets/login-bg2.png';

const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  if (isAuthenticated && user) {
    const roleRoutes = {
      Admin: '/admin/dashboard',
      Designer: '/designer/dashboard',
      Sales: '/sales/dashboard',
      Maintenance: '/maintenance/dashboard'
    };
    return <Navigate to={roleRoutes[user.role_name]} />;
  }

  const onSubmit = async (data) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const loggedUser = await login(data.email, data.password);
      
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
      navigate(roleRoutes[loggedUser.role_name]);
    } catch (error) {
      setApiError(error.message || 'Authentication failed.');
      toast.error(error.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >

      {/* Floating Logo Container */}
      <div className="bg-white px-8 py-4 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 relative z-10 flex flex-col items-center">
        <h1 className="text-3xl font-black uppercase tracking-[0.25em] text-[#4a2e24] leading-none mb-1.5 flex items-center">
          CRUD<span className="text-[#f06532]">EX</span>
        </h1>
        <p className="text-[8px] font-black text-[#967f76] uppercase tracking-[0.3em]">
          Synergies with Energies
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white w-full max-w-[460px] p-8 md:p-10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] relative z-10 border border-[#f5ede7]">
        <ErrorBanner error={apiError} onRetry={handleSubmit(onSubmit)} />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Username/Email */}
          <div>
            <label className="block text-[10px] font-black text-[#6d554c] uppercase tracking-widest mb-2 ml-1">
              Username/Email
            </label>
            <div className="relative">
              <input
                {...register('email', { 
                  required: 'Email address is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' }
                })}
                type="email"
                className={`w-full bg-[#f4f2f0] border-2 ${errors.email ? 'border-red-400' : 'border-[#f08552] shadow-[0_0_10px_rgba(240,133,82,0.2)]'} rounded-xl px-4 py-3 text-[#4a2e24] outline-none transition-all placeholder:text-[#a89b96] text-sm font-bold`}
                placeholder="Enter Username or Email"
              />
            </div>
            {errors.email && <p className="text-red-400 text-[9px] mt-1.5 font-bold tracking-wide uppercase ml-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2 ml-1">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-[#6d554c] uppercase tracking-widest">
                Password <ShieldCheck size={12} className="text-[#a89b96]" />
              </label>
            </div>
            <div className="relative">
              <input
                {...register('password', { required: 'Password is required' })}
                type={showPassword ? 'text' : 'password'}
                className={`w-full bg-[#f4f2f0] border-2 ${errors.password ? 'border-red-400' : 'border-transparent focus:border-[#f08552]'} rounded-xl px-4 py-3 text-[#4a2e24] outline-none transition-all placeholder:text-[#a89b96] text-sm font-bold tracking-widest`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a89b96] hover:text-[#f06532] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-[9px] mt-1.5 font-bold tracking-wide uppercase ml-1">{errors.password.message}</p>}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="peer appearance-none w-4 h-4 border-2 border-[#e2d8d2] rounded-[4px] bg-[#f4f2f0] checked:bg-[#f06532] checked:border-[#f06532] transition-all cursor-pointer"
                />
                <ShieldCheck size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <span className="text-[9px] font-black text-[#6d554c] uppercase tracking-widest group-hover:text-[#4a2e24] transition-colors">Remember Me</span>
            </label>
            
            <button type="button" className="text-[9px] font-black text-[#f06532] uppercase tracking-widest hover:underline">Forgot Password?</button>
          </div>

          {/* Submit Button */}
          <button
            disabled={isLoading}
            type="submit"
            className="w-full h-[52px] mt-2 rounded-[16px] bg-gradient-to-r from-[#f06532] to-[#fc9c71] shadow-[0_8px_20px_rgba(240,101,50,0.3)] hover:shadow-[0_12px_25px_rgba(240,101,50,0.4)] flex items-center justify-center text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group"
          >
            {/* Inner Glow Rings mimicking the screenshot */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
               <div className="w-[120px] h-[120px] rounded-full border border-white/50 absolute" />
               <div className="w-[80px] h-[80px] rounded-full border border-white/60 absolute" />
            </div>

            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
              <span className="tracking-[0.2em] uppercase text-[11px] font-black relative z-10">Login</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
