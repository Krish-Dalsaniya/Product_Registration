import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, FolderGit2, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const GitLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    return (
        <div className="h-screen overflow-hidden bg-[var(--bg-workspace)] flex flex-col transition-colors duration-300">
            {/* Top Navigation Bar */}
            <header className="h-[60px] bg-[var(--bg-card)] border-b border-[var(--border-color)] shadow-sm flex items-center justify-between px-6 shrink-0 z-50 relative">
                
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-1.5 text-slate-500 hover:text-[var(--text-main)] transition-colors font-bold text-[13px]"
                    >
                        <ChevronLeft size={16} /> App Launcher
                    </button>
                    
                    <div className="w-px h-5 bg-[var(--border-color)]"></div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <FolderGit2 size={16} />
                        </div>
                        <div>
                            <h1 className="font-black text-[var(--text-main)] text-[14px] leading-tight">Git Workspace</h1>
                            <p className="text-[11px] font-bold text-slate-400">Codebase & Version Management</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* User Profile */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-xs border border-[var(--accent)]/20 overflow-hidden shadow-sm">
                            {user?.image_url ? (
                                <img
                                    src={user.image_url.startsWith('http') ? user.image_url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'}/${user.image_url.startsWith('/') ? user.image_url.substring(1) : user.image_url}`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                user?.full_name?.charAt(0)?.toUpperCase() || <User size={14} />
                            )}
                        </div>
                        <div className="hidden sm:block text-left">
                            <div className="font-bold text-[12px] text-[var(--text-main)] leading-tight">
                                {user?.full_name || 'Developer'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold capitalize">
                                {user?.role_name || 'Role'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative flex min-h-0">
                <Outlet />
            </main>
        </div>
    );
};

export default GitLayout;
