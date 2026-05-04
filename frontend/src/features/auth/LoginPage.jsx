import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import ErrorBanner from '../../components/shared/ErrorBanner';

const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
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
    setApiError(null);
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
      setApiError(error.message || 'Authentication failed.');
      toast.error(error.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-workspace)' }}
    >
      {/* Dynamic background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'var(--accent)' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: 'var(--primary)' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-center mb-6">
            <div className="p-6 rounded-[32px] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl text-center">
              <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-[var(--text-main)] leading-none">
                CRUD<span className="text-[var(--accent)]">EX</span>
              </h1>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mt-3 opacity-60">
                Synergies with Energies
              </p>
            </div>
          </div>
        </div>


        <div className="workspace-card p-10 animate-in fade-in zoom-in-95 duration-500">
          <ErrorBanner error={apiError} onRetry={handleSubmit(onSubmit)} />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">USERNAME/EMAIL

              </label>
              <div className="relative group">
                <input
                  {...register('email', { 
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' }
                  })}
                  type="email"
                  className={`w-full bg-[var(--input-bg)] border ${errors.email ? 'border-red-500/50' : 'border-[var(--border-color)]'} rounded-xl px-5 py-4 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-dim)] text-sm font-medium`}
                  placeholder="identity@leons.sys"
                />
              </div>
              {errors.email && <p className="text-red-400 text-[10px] mt-2 font-bold tracking-wide uppercase">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Password</label>
              <div className="relative group">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}

                  className={`w-full bg-[var(--input-bg)] border ${errors.password ? 'border-red-500/50' : 'border-[var(--border-color)]'} rounded-xl px-5 py-4 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-dim)] text-sm font-medium`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-[10px] mt-2 font-bold tracking-wide uppercase">{errors.password.message}</p>}
            </div>

            <button
              disabled={isLoading}
              type="submit"
              className="btn-primary w-full h-14 shadow-lg flex items-center justify-center gap-2 group overflow-hidden relative"
              style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  <span className="tracking-[0.2em] uppercase text-xs font-black relative z-10">Login</span>
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
