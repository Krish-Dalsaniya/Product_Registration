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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bg.jpg.jpeg')" }}
    >
      {/* Overlay to ensure readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-center mb-8">
            <img 
              src="/logo.png" 
              alt="Leons CRM" 
              className="h-20 w-auto object-contain animate-in fade-in zoom-in duration-1000" 
            />
          </div>
        </div>


        <div className="glass-card p-8 animate-in fade-in zoom-in-95 duration-500">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-100 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <div className="relative group">
                <input
                  {...register('email', { 
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' }
                  })}
                  type="email"
                  className={`w-full bg-white/[0.02] border ${errors.email ? 'border-red-500' : 'border-white/5'} rounded-xl px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-500`}
                  placeholder="name@procore.sys"
                />
              </div>
              {errors.email && <p className="text-red-400 text-[10px] mt-2 font-bold tracking-wide uppercase">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-100 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative group">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full bg-white/[0.02] border ${errors.password ? 'border-red-500' : 'border-white/5'} rounded-xl px-5 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-500`}
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                <span className="tracking-widest uppercase text-xs">Login</span>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
