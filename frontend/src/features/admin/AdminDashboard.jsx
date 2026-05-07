import React, { useState, useEffect } from 'react';
import { getAdminStats } from '../../api/admin';
import { 
  Users, 
  Zap, 
  ShoppingBag, 
  Wrench, 
  ArrowUpRight, 
  Activity, 
  Layers,
  LayoutDashboard,
  Clock,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getAdminStats();
        console.log('DEBUG: Dashboard Stats Response:', response.data);
        setStats(response.data.data);
      } catch (error) {
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, path }) => (
    <div 
      onClick={() => navigate(path)}
      className="workspace-card p-6 border border-[var(--border-color)] bg-[var(--bg-card)] group cursor-pointer hover:border-[var(--accent)] transition-all duration-500"
    >
      <div className="flex items-start justify-between">
        <div className={`p-4 rounded-2xl bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform duration-500`}
             style={{ backgroundColor: `${color}10`, color: color }}>
          <Icon size={28} strokeWidth={2.5} />
        </div>
        <div className="text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60 mb-1">{title}</p>
          <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight">
            {loading ? '...' : value}
          </h3>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">View Details</span>
        <ArrowUpRight size={14} className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0" />
      </div>
    </div>
  );

  const QuickLink = ({ title, description, icon: Icon, path }) => (
    <button
      onClick={() => navigate(path)}
      className="flex items-center gap-5 p-5 rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent)]/50 hover:bg-[var(--nav-hover)] transition-all duration-500 group text-left w-full"
    >
      <div className="p-3 bg-[var(--bg-workspace)] rounded-xl text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-500">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <h4 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-tight">{title}</h4>
        <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">{description}</p>
      </div>
      <ExternalLink size={14} className="text-[var(--text-dim)] opacity-0 group-hover:opacity-100 transition-all" />
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm">
            <LayoutDashboard size={28} className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">Administrative Hub</h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">System Overview & Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">System Operational</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Products" 
          value={stats?.products || 0} 
          icon={Zap} 
          color="#3b82f6" 
          path="/admin/products"
        />
        <StatCard 
          title="Customers" 
          value={stats?.customers || 0} 
          icon={Users} 
          color="#10b981" 
          path="/admin/customers"
        />
        <StatCard 
          title="Teams" 
          value={stats?.teams || 0} 
          icon={Layers} 
          color="#f59e0b" 
          path="/admin/teams"
        />
        <StatCard 
          title="Maintenance" 
          value={stats?.maintenance || 0} 
          icon={Wrench} 
          color="#ec4899" 
          path="/admin/maintenance"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="workspace-card p-8 border border-[var(--border-color)] bg-[var(--bg-card)]">
            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Activity size={14} className="text-[var(--accent)]" /> Quick Actions
            </h3>
            <div className="space-y-4">
              <QuickLink 
                title="New Product" 
                description="Register a new inventory item" 
                icon={Plus} 
                path="/admin/products" 
              />
              <QuickLink 
                title="New Customer" 
                description="Onboard a new business client" 
                icon={Users} 
                path="/admin/customers" 
              />
              <QuickLink 
                title="Manage Teams" 
                description="Assign personnel to departments" 
                icon={Layers} 
                path="/admin/teams" 
              />
            </div>
          </div>
        </div>

        {/* Right Column: System Status / Personnel Summary */}
        <div className="lg:col-span-8 space-y-6">
          <div className="workspace-card p-8 border border-[var(--border-color)] bg-[var(--bg-card)] h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock size={14} className="text-[var(--accent)]" /> Personnel Breakdown
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-3xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] text-center">
                <p className="text-[32px] font-black text-[var(--text-main)] mb-1">{stats?.designers || 0}</p>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Active Designers</p>
              </div>
              <div className="p-6 rounded-3xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] text-center">
                <p className="text-[32px] font-black text-[var(--text-main)] mb-1">{stats?.sales || 0}</p>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Sales Officers</p>
              </div>
              <div className="p-6 rounded-3xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] text-center">
                <p className="text-[32px] font-black text-[var(--text-main)] mb-1">{stats?.maintenance || 0}</p>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Service Staff</p>
              </div>
            </div>

            <div className="mt-10 p-8 rounded-[32px] bg-gradient-to-br from-[var(--nav-active)] to-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden group">
               <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
                  <LayoutDashboard size={200} strokeWidth={1} />
               </div>
               <div className="relative z-10">
                  <h4 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight mb-2">Workspace Insight</h4>
                  <p className="text-[13px] text-[var(--text-muted)] font-medium leading-relaxed max-w-md">
                    Total system volume is currently at <span className="text-[var(--accent)] font-bold">{(stats?.products || 0) + (stats?.customers || 0)}</span> active records across all departments. Use the side navigation to deep-dive into specific modules.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
