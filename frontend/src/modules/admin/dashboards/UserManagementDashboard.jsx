import React, { useEffect } from 'react';
import { useAdminStats } from '../../../hooks/useAdminStats';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import {
  Users,
  Building2,
  LockKeyhole,
  Layers,
  ChevronRight,
  Activity,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell
} from 'recharts';

const UserManagementDashboard = () => {
  const { hasPermission } = useAuth();
  const { data: statsData, isLoading: loading } = useAdminStats({
    enabled: hasPermission('users', 'view') || hasPermission('teams', 'view')
  });
  const stats = statsData?.data || null;

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Background Prefetch
    import('../../../api/admin').then(({ getUsers, getTeams }) => {
      if (hasPermission('users', 'view')) {
        queryClient.prefetchQuery({
          queryKey: ['users', { page: 1, limit: 20, role: undefined }],
          queryFn: async () => {
            const response = await getUsers({ page: 1, limit: 20 });
            return response.data;
          }
        });
      }
      if (hasPermission('teams', 'view')) {
        queryClient.prefetchQuery({
          queryKey: ['teams'],
          queryFn: async () => {
            const response = await getTeams();
            return response.data;
          }
        });
      }
    });
  }, [queryClient, hasPermission]);

  const StatCard = ({ title, value, icon: Icon, path, accentBg, accentText }) => (
    <div
      onClick={() => navigate(path)}
      className="workspace-card px-4 py-3 border border-[var(--border-color)] group cursor-pointer hover:shadow-md transition-all duration-300 outline-none"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-bold tracking-wider text-[var(--text-muted)] mb-0.5">{title}</p>
          <h3 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">
            {loading ? '...' : value}
          </h3>
        </div>
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 shadow-sm"
          style={{ background: accentBg, color: accentText }}
        >
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 group/link">
        <span className="text-[11px] font-bold tracking-wide text-[var(--accent)]">Manage</span>
        <ChevronRight size={14} className="text-[var(--accent)] transition-transform duration-300 group-hover/link:translate-x-1" />
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
      <span className="text-[13px] font-bold tracking-wide text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">{title}</span>
    </button>
  );

  const rawDist = stats?.designationsDistribution || [];
  
  // Group by department
  const depsMap = {};
  const uniqueDesignationsSet = new Set();

  rawDist.forEach(d => {
    if (!depsMap[d.department]) {
      depsMap[d.department] = { name: d.department, total: 0 };
    }
    // Clean up empty/null designations visually
    const desigName = d.designation ? d.designation : 'Unassigned';
    depsMap[d.department][desigName] = (depsMap[d.department][desigName] || 0) + d.count;
    depsMap[d.department].total += d.count;
    uniqueDesignationsSet.add(desigName);
  });

  let personnelData = Object.values(depsMap);
  const uniqueDesignations = Array.from(uniqueDesignationsSet);

  // Fallback for visual layout if no data yet
  if (personnelData.length === 0) {
    personnelData = [
      { name: 'Admin', Unassigned: 1, total: 1 },
      { name: 'Designers', Unassigned: stats?.designers || 0, total: stats?.designers || 0 },
      { name: 'Sales', Unassigned: stats?.sales || 0, total: stats?.sales || 0 },
      { name: 'Maintenance', Unassigned: stats?.maintenance || 0, total: stats?.maintenance || 0 }
    ];
    uniqueDesignations.push('Unassigned');
  }

  const colors = [
    '#0ea5e9', '#f43f5e', '#eab308', '#10b981', '#8b5cf6', 
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#64748b'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-92px)] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <Users size={24} className="md:w-[28px] md:h-[28px] transition-transform duration-300 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] tracking-tight leading-none">
               User Management
            </h1>
            <p className="text-[12px] text-[var(--text-muted)] font-semibold mt-2 tracking-wide opacity-80">
              Manage Users, Roles, and Teams
            </p>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0 animate-entrance-up">
        <StatCard 
          title="All Users" 
          value={(stats?.designers || 0) + (stats?.sales || 0) + (stats?.maintenance || 0) + 1} 
          icon={Users} 
          path="/admin/users" 
          accentBg="var(--badge-admin-bg)"
          accentText="var(--badge-admin-text)"
        />
        <StatCard 
          title="Roles Setup" 
          value="Manage" 
          icon={Building2} 
          path="/admin/roles" 
          accentBg="rgba(16, 185, 129, 0.1)"
          accentText="#10b981"
        />
        <StatCard 
          title="User Access" 
          value="Manage" 
          icon={LockKeyhole} 
          path="/admin/user-access" 
          accentBg="rgba(245, 158, 11, 0.1)"
          accentText="#f59e0b"
        />
        <StatCard 
          title="Project Teams" 
          value={stats?.teams || 0} 
          icon={Layers} 
          path="/admin/teams" 
          accentBg="var(--badge-teams-bg)"
          accentText="var(--badge-teams-text)"
        />
      </div>

      {/* Analytics Row */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[400px] items-stretch animate-entrance-up pb-2" style={{ animationDelay: '0.1s' }}>
        {/* Personnel Chart */}
        <div className="workspace-card p-6 h-full flex flex-col">
          <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-5 flex items-center gap-2">
            <Users size={14} className="text-[var(--accent)]" /> Department Staffing Breakdown
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
                  {uniqueDesignations.map((desig, idx) => (
                    <Bar 
                      key={desig} 
                      dataKey={desig} 
                      stackId="a" 
                      fill={colors[idx % colors.length]} 
                      maxBarSize={60} 
                      style={{ outline: 'none' }} 
                    />
                  ))}
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="workspace-card p-6 h-full flex flex-col">
          <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-5 flex items-center gap-2">
            <Activity size={14} className="text-[var(--accent)]" /> Quick actions
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <QuickAction title="Add New User" icon={Plus} path="/admin/users" />
            <QuickAction title="Configure Roles" icon={Building2} path="/admin/roles" />
            <QuickAction title="Manage User Access" icon={LockKeyhole} path="/admin/user-access" />
            <QuickAction title="Create Project Team" icon={Layers} path="/admin/teams" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementDashboard;
