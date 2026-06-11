import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axiosInstance';
import {
  Box,
  FileX,
  FileSearch,
  Plus,
  Cpu,
  PackagePlus,
  ChevronRight,
  LayoutDashboard,
  Clock,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, path, accentBg, accentText, navigate }) => (
  <div
    onClick={() => path && navigate(path)}
    className={`workspace-card p-5 border border-[var(--border-color)] group ${path ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-95' : ''} transition-all duration-300 relative overflow-hidden h-full flex flex-col`}
    style={{ background: 'var(--bg-card)' }}
  >
    <div 
      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
      style={{ background: `linear-gradient(135deg, ${accentText} 0%, transparent 100%)` }}
    />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-[11px] font-extrabold tracking-widest text-[var(--text-muted)] mb-1 uppercase">{title}</p>
        <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight">
          {value !== null ? value : <span className="animate-pulse">...</span>}
        </h3>
      </div>
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 shadow-sm group-hover:-rotate-6 group-hover:scale-110"
        style={{ background: accentBg, color: accentText }}
      >
        <Icon size={22} strokeWidth={2.5} />
      </div>
    </div>
    {path && (
      <div className="mt-5 flex items-center gap-1.5 group/link relative z-10 border-t border-[var(--border-color)]/50 pt-3">
        <span className="text-[10px] font-black tracking-widest text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors uppercase">View Details</span>
        <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all duration-300 group-hover/link:translate-x-1" />
      </div>
    )}
  </div>
);

const QuickAction = ({ title, icon: Icon, path, navigate }) => (
  <button
    onClick={() => navigate(path)}
    className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-workspace)] hover:border-[var(--accent)] hover:bg-[var(--bg-card)] transition-all duration-300 group w-full relative overflow-hidden hover:shadow-md"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" />
    <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] group-hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)] transition-all duration-300 relative z-10">
      <Icon size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
    </div>
    <span className="text-[13px] font-extrabold tracking-wide text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors relative z-10">{title}</span>
    <ChevronRight size={16} className="ml-auto text-transparent group-hover:text-[var(--accent)] transition-all duration-300 -translate-x-2 group-hover:translate-x-0 relative z-10" />
  </button>
);

const DesignerDashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/designer');
        setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching designer dashboard stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-92px)] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6 px-4 md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-8">
      {/* Dynamic Header Hero Section */}
      <div className="relative w-full rounded-3xl overflow-hidden mt-10 border border-[var(--border-color)] shadow-sm animate-entrance-down flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[var(--bg-card)] opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--accent)] rounded-full blur-3xl opacity-10 pointer-events-none animate-pulse" />
        
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex items-center md:items-start gap-6 flex-col md:flex-row text-center md:text-left">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[var(--bg-elevated)] border-2 border-[var(--accent)] shadow-lg flex items-center justify-center relative z-10">
                {user?.image_url ? (
                  <img
                    src={user.image_url.startsWith('http') ? user.image_url : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/${user.image_url.startsWith('/') ? user.image_url.substring(1) : user.image_url}`}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-3xl font-black text-[var(--accent)] tracking-tighter">
                    {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border-2 border-[var(--bg-card)] shadow-sm z-20 flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Active
              </div>
            </div>
            
            <div className="mt-2">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-1 text-[var(--text-muted)] font-semibold text-sm">
                <Clock size={14} className="text-[var(--accent)]" /> {greeting}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
                 {user?.full_name || 'Designer'}
              </h1>
              <div className="mt-3 flex items-center gap-2 justify-center md:justify-start">
                <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-[var(--accent)]/20 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  {user?.role_name || 'System Role'} Workspace
                </span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex flex-col items-end justify-center text-right pr-4 border-r-2 border-[var(--accent)] h-full opacity-80">
             <h2 className="font-bold text-[var(--text-main)] text-lg mb-1 tracking-wide">CRUD<span className="text-[var(--accent)]">EX</span> System</h2>
             <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Enterprise Platform</p>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 flex-shrink-0 animate-entrance-up">
        <StatCard 
          title="Products Managed" 
          value={stats?.productsManaged ?? null} 
          icon={Box} 
          path={hasPermission('products', 'general.view') ? "/admin/products" : null} 
          accentBg="var(--badge-admin-bg)"
          accentText="var(--badge-admin-text)"
          navigate={navigate}
        />
        <StatCard 
          title="Inventory Items" 
          value={stats?.inventoryItemsManaged ?? null} 
          icon={Cpu} 
          path={hasPermission('inventory', 'general.view') ? "/admin/inventory" : null} 
          accentBg="rgba(16, 185, 129, 0.1)"
          accentText="#10b981"
          navigate={navigate}
        />
        <StatCard 
          title="Missing Files" 
          value={stats?.missingFiles ?? null} 
          icon={FileX} 
          path={hasPermission('products', 'files.view') ? "/admin/products" : null} 
          accentBg="rgba(239, 68, 68, 0.1)"
          accentText="#ef4444"
          navigate={navigate}
        />
        <StatCard 
          title="Missing Tech Specs" 
          value={stats?.missingTechSpecs ?? null} 
          icon={FileSearch} 
          path={hasPermission('products', 'tech_spec.view') ? "/admin/products" : null} 
          accentBg="rgba(245, 158, 11, 0.1)"
          accentText="#f59e0b"
          navigate={navigate}
        />
      </div>

      {/* Analytics Row */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-entrance-up pb-2" style={{ animationDelay: '0.1s' }}>
        
        {/* Recently modified products */}
        <div className="workspace-card p-6 h-full flex flex-col lg:col-span-1 border-t-4 border-t-[var(--accent)] shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] text-[var(--accent)] border border-[var(--border-color)]">
              <Box size={18} strokeWidth={2.5} />
            </div>
            <h3 className="font-extrabold text-[var(--text-main)] text-sm uppercase tracking-wider">
              Recent Products
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {stats?.recentlyModifiedProducts && stats.recentlyModifiedProducts.length > 0 ? (
              <div className="space-y-4">
                {stats.recentlyModifiedProducts.map(p => (
                  <div key={p.product_id} className="p-4 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-workspace)] hover:border-[var(--accent)] hover:shadow-md transition-all duration-300 cursor-default group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--accent)] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <div className="font-bold text-[14px] text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">{p.product_name}</div>
                        <div className="text-[12px] font-semibold text-[var(--text-muted)] mt-1 flex items-center gap-1.5"><Box size={12}/> {p.product_code}</div>
                      </div>
                      <div className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-1 rounded-md border border-[var(--border-color)] flex items-center gap-1">
                        <Calendar size={10} />
                        {p.updated_at ? format(new Date(p.updated_at), 'MMM d') : '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-workspace)]/50">
                <Box size={32} className="mb-2 opacity-50" />
                <span className="text-[13px] font-bold">No recent products.</span>
              </div>
            )}
          </div>
        </div>

        {/* Recently modified inventory */}
        <div className="workspace-card p-6 h-full flex flex-col lg:col-span-1 border-t-4 border-t-[#10b981] shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-[#10b981] border border-emerald-500/20">
              <Cpu size={18} strokeWidth={2.5} />
            </div>
            <h3 className="font-extrabold text-[var(--text-main)] text-sm uppercase tracking-wider">
              Recent Inventory
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {stats?.recentlyModifiedInventory && stats.recentlyModifiedInventory.length > 0 ? (
              <div className="space-y-4">
                {stats.recentlyModifiedInventory.map(i => (
                  <div key={i.id} className="p-4 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-workspace)] hover:border-[#10b981] hover:shadow-md transition-all duration-300 cursor-default group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#10b981] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <div className="font-bold text-[14px] text-[var(--text-main)] group-hover:text-[#10b981] transition-colors">{i.name}</div>
                        <div className="text-[12px] font-semibold text-[var(--text-muted)] mt-1 flex items-center gap-1.5"><Cpu size={12}/> {i.type}</div>
                      </div>
                      <div className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-1 rounded-md border border-[var(--border-color)] flex items-center gap-1">
                        <Calendar size={10} />
                        {i.updated_at ? format(new Date(i.updated_at), 'MMM d') : '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-workspace)]/50">
                <Cpu size={32} className="mb-2 opacity-50" />
                <span className="text-[13px] font-bold">No recent inventory.</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="workspace-card p-6 h-full flex flex-col lg:col-span-1 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <h3 className="font-extrabold text-[var(--text-main)] text-sm uppercase tracking-wider">
              Quick Actions
            </h3>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {hasPermission('products', 'general.create') && (
              <QuickAction title="Add New Product" icon={PackagePlus} path="/admin/products" navigate={navigate} />
            )}
            {hasPermission('inventory', 'general.create') && (
              <QuickAction title="Log Inventory Item" icon={Cpu} path="/admin/inventory" navigate={navigate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignerDashboard;
