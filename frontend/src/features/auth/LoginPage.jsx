import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (isAuthenticated && user) {
    const roleRoutes = {
      Admin: '/admin/users',
      Designer: '/designer/dashboard',
      Sales: '/sales/dashboard',
      Maintenance: '/maintenance/dashboard'
    };
    return <Navigate to={roleRoutes[user.role_name]} />;
  }

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const loggedUser = await login(data.email, data.password);
      toast.success(`Access Granted. Welcome back, ${loggedUser.full_name}.`);
      
      const roleRoutes = {
        Admin: '/admin/users',
        Designer: '/designer/dashboard',
        Sales: '/sales/dashboard',
        Maintenance: '/maintenance/dashboard'
      };
      navigate(roleRoutes[loggedUser.role_name]);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex flex-col items-center mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-white font-serif text-6xl font-bold tracking-tight">LE</span>
              <div className="w-12 h-12 bg-white rounded-full" />
              <span className="text-white font-serif text-6xl font-bold tracking-tight">NS'</span>
            </div>
            <span className="text-sm text-gray-400 font-bold tracking-[0.4em] uppercase mt-2">Integrations</span>
          </div>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px]">Secure Access Portal</p>
        </div>


        <div className="glass-card p-8 animate-in fade-in zoom-in-95 duration-500">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <div className="relative group">
                <input
                  {...register('email', { 
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' }
                  })}
                  type="email"
                  className={`w-full bg-white/[0.02] border ${errors.email ? 'border-red-500' : 'border-white/5'} rounded-xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700`}
                  placeholder="name@procore.sys"
                />
              </div>
              {errors.email && <p className="text-red-400 text-[10px] mt-2 font-bold tracking-wide uppercase">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative group">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full bg-white/[0.02] border ${errors.password ? 'border-red-500' : 'border-white/5'} rounded-xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-[10px] mt-2 font-bold tracking-wide uppercase">{errors.password.message}</p>}
            </div>

            <button
              disabled={isLoading}
              type="submit"
              className="w-full btn-primary h-14"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  <span className="tracking-widest uppercase text-xs">Authorize Access</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <p className="text-[10px] text-gray-700 font-bold tracking-widest uppercase">
            Restricted System — Unauthorized Access Logged
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
