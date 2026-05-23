import React, { useState, useEffect } from 'react';
import { getAdminStats } from '../../api/admin';
import {
  Users,
  Zap,
  ShoppingBag,
  Wrench,
  ArrowRight,
  Activity,
  Layers,
  LayoutDashboard,
  Clock,
  ExternalLink,
  Plus,
  Box,
  Cpu,
  Building2,
  CircuitBoard,
  Plug,
  ChevronRight,
  LifeBuoy,
  Package,
  ShoppingCart,
  Ticket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getAdminStats();
        setStats(response.data.data);
      } catch (error) {
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, path, accentBg, accentText }) => (
    <div
      onClick={() => navigate(path)}
      className="workspace-card p-4 border border-[var(--border-color)] group cursor-pointer hover:shadow-md transition-all duration-300 outline-none"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] mb-0.5">{title}</p>
          <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
            {loading ? '...' : value}
          </h3>
        </div>
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
          style={{ background: accentBg, color: accentText }}
        >
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 group/link">
        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--accent)]">View details</span>
        <ChevronRight size={12} className="text-[var(--accent)] transition-transform duration-300 group-hover/link:translate-x-1" />
      </div>
    </div>
  );

  const QuickAction = ({ title, icon: Icon, path }) => (
    <button
      onClick={() => navigate(path)}
      className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-workspace)] hover:border-[var(--accent)] hover:bg-[var(--nav-hover)] transition-all duration-300 group w-full"
    >
      <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-dim)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-all shadow-sm">
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <span className="text-[12px] font-black uppercase tracking-[0.1em] text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">{title}</span>
    </button>
  );

  const inventoryData = [
    { name: 'PCB Units', value: stats?.inventory?.pcb || 0, color: '#00d2ff' },
    { name: 'Electronics', value: stats?.inventory?.electronics || 0, color: '#34d399' },
    { name: 'Electrical', value: stats?.inventory?.electrical || 0, color: '#fbbf24' },
    { name: 'Structural', value: stats?.inventory?.structural || 0, color: '#a78bfa' }
  ];

  const personnelData = [
    { name: 'Designers', value: stats?.designers || 0, color: '#8b5cf6' },
    { name: 'Sales', value: stats?.sales || 0, color: '#ec4899' },
    { name: 'Maintenance', value: stats?.maintenance || 0, color: '#f97316' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-92px)] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <LayoutDashboard size={24} className="md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform duration-300 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">
               Dashboard
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              System Overview & Analytics Hub
            </p>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0 animate-entrance-up">
        <StatCard 
          title="Total products" 
          value={stats?.products || 0} 
          icon={Zap} 
          path="/admin/products" 
          accentBg="var(--badge-admin-bg)"
          accentText="var(--badge-admin-text)"
        />
        <StatCard 
          title="Finished Goods" 
          value={stats?.finishedGoodsQty || 0} 
          icon={Package} 
          path="/admin/finished-goods" 
          accentBg="rgba(16, 185, 129, 0.1)"
          accentText="#10b981"
        />
        <StatCard 
          title="Active customers" 
          value={stats?.customers || 0} 
          icon={Users} 
          path="/admin/customers" 
          accentBg="var(--badge-sales-bg)"
          accentText="var(--badge-sales-text)"
        />
        <StatCard 
          title="Sales Booked (Qty)" 
          value={stats?.bookASaleQty || 0} 
          icon={ShoppingCart} 
          path="/admin/book-a-sale" 
          accentBg="rgba(245, 158, 11, 0.1)"
          accentText="#f59e0b"
        />
        
        <StatCard 
          title="Project teams" 
          value={stats?.teams || 0} 
          icon={Layers} 
          path="/admin/teams" 
          accentBg="var(--badge-teams-bg)"
          accentText="var(--badge-teams-text)"
        />
        <StatCard 
          title="Maintenance logs" 
          value={stats?.maintenance || 0} 
          icon={Wrench} 
          path="/admin/maintenance" 
          accentBg="var(--badge-maint-bg)"
          accentText="var(--badge-maint-text)"
        />
        <StatCard 
          title="Active Tickets" 
          value={stats?.supportTicketsActive || 0} 
          icon={Ticket} 
          path="/admin/support-tickets" 
          accentBg="rgba(239, 68, 68, 0.1)"
          accentText="#ef4444"
        />
        <StatCard 
          title="Total Personnel" 
          value={(stats?.designers || 0) + (stats?.sales || 0) + (stats?.maintenance || 0)} 
          icon={Building2} 
          path="/admin/users" 
          accentBg="rgba(99, 102, 241, 0.1)"
          accentText="#6366f1"
        />
      </div>

      {/* Analytics Row */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[1000px] lg:min-h-0 items-stretch animate-entrance-up pb-2" style={{ animationDelay: '0.1s' }}>
        {/* Inventory Chart */}
        <div className="workspace-card p-6 h-full flex flex-col">
          <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-5 flex items-center gap-2">
            <Box size={14} className="text-[var(--accent)]" /> Inventory Distribution
          </h3>
          <div className="flex-1 min-h-0 relative">
            {inventoryData.every(d => d.value === 0) && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                 <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase">No Data</span>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart style={{ outline: 'none' }}>
                <Pie
                  data={inventoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  style={{ outline: 'none' }}
                >
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
             {inventoryData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                   <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{item.name}</span>
                </div>
             ))}
          </div>
        </div>

        {/* Personnel Chart */}
        <div className="workspace-card p-6 h-full flex flex-col">
          <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-5 flex items-center gap-2">
            <Users size={14} className="text-[var(--accent)]" /> Department Staffing
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={personnelData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40} style={{ outline: 'none' }}>
                  {personnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="workspace-card p-6 h-full flex flex-col">
          <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-5 flex items-center gap-2">
            <Activity size={14} className="text-[var(--accent)]" /> Quick actions
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <QuickAction title="New product" icon={Plus} path="/admin/products" />
            <QuickAction title="New customer" icon={Users} path="/admin/customers" />
            <QuickAction title="Finished Goods" icon={Package} path="/admin/finished-goods" />
            <QuickAction title="Book a Sale" icon={ShoppingCart} path="/admin/book-a-sale" />
            <QuickAction title="Support Tickets" icon={LifeBuoy} path="/admin/support-tickets" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
