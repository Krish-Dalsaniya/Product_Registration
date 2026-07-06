import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Calendar, Clock, Loader2, TrendingUp, UserCheck, Briefcase, ChevronRight, Banknote, LayoutDashboard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchHRDashboardMetricsApi } from '../../../api/hr';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex items-center gap-6 hover:-translate-y-1 transition-all duration-300">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass}`}>
      <Icon size={28} />
    </div>
    <div>
      <p className="text-[12px] font-bold text-[var(--text-muted)] tracking-wider uppercase mb-1">{title}</p>
      <h3 className="text-3xl font-black text-[var(--text-main)]">{value}</h3>
    </div>
  </div>
);

const HRDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const res = await fetchHRDashboardMetricsApi();
        if (res.data?.success) {
          setMetrics(res.data.data);
        }
      } catch (error) {
        toast.error('Failed to load HR metrics');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4 relative z-30">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <LayoutDashboard size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mr-2">HR Dashboard</h1>
            <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">Overview of Human Resources metrics and activity</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard 
          title="Total Employees" 
          value={metrics?.totalEmployees || 0} 
          icon={Users} 
          colorClass="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Total Trainees" 
          value={metrics?.totalTrainees || 0} 
          icon={UserPlus} 
          colorClass="bg-emerald-100 text-emerald-600" 
        />
        <StatCard 
          title="Upcoming Holidays" 
          value={metrics?.upcomingHolidays || 0} 
          icon={Calendar} 
          colorClass="bg-purple-100 text-purple-600" 
        />
        <StatCard 
          title="Processed Payrolls" 
          value={metrics?.processedPayrolls || 0} 
          icon={Banknote} 
          colorClass="bg-amber-100 text-amber-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
        {/* Headcount Trend Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-[16px] font-black text-[var(--text-main)] mb-6">Headcount Trend</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics?.headcountTrend || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                  domain={[12, 22]} 
                  ticks={[12, 14, 16, 18, 20]}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="headcount" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorHeadcount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution Donut Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-[16px] font-black text-[var(--text-main)] mb-2">Department Distribution</h3>
          <div className="flex-1 w-full min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics?.departmentDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics?.departmentDistribution?.map((entry, index) => {
                    const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#0ea5e9', '#f97316', '#a855f7', '#14b8a6', '#eab308'];
                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                  })}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="square"
                  iconSize={8}
                  formatter={(value) => <span className="text-[11px] font-medium text-[var(--text-muted)] ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Recent Activity Feed */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm h-[380px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-black text-[var(--text-main)]">Recent Activity</h3>
            <button className="text-[13px] font-bold text-[var(--accent)] hover:underline flex items-center">
              View All <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {(!metrics?.recentActivity || metrics.recentActivity.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
                <Briefcase size={32} className="mb-2 opacity-50" />
                <p className="text-[13px] font-medium">No recent activity</p>
              </div>
            ) : (
              metrics.recentActivity.map((activity, i) => {
                let ActivityIcon = UserCheck;
                let color = 'text-amber-500 bg-amber-50';

                if (activity.type === 'onboarding') {
                  ActivityIcon = UserPlus;
                  color = 'text-blue-500 bg-blue-50';
                } else if (activity.type === 'trainee') {
                  ActivityIcon = UserCheck;
                  color = 'text-emerald-500 bg-emerald-50';
                } else if (activity.type === 'payroll') {
                  ActivityIcon = Banknote;
                  color = 'text-amber-500 bg-amber-50';
                }

                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                      <ActivityIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[var(--text-main)]">{activity.title}</p>
                      <p className="text-[13px] text-[var(--text-secondary)] truncate mt-0.5">{activity.desc}</p>
                    </div>
                    <span className="text-[11px] font-bold text-[var(--text-muted)] flex-shrink-0 whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      

    </div>
  );
};

export default HRDashboard;
