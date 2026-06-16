import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Calendar, Clock, Loader2, TrendingUp, UserCheck, Briefcase, ChevronRight } from 'lucide-react';
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">HR Dashboard</h1>
        <p className="text-[14px] text-[var(--text-muted)] font-semibold mt-1">Overview of Human Resources metrics and activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Employees" 
          value={metrics?.totalEmployees || 0} 
          icon={Users} 
          colorClass="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="On Leave Today" 
          value={metrics?.onLeaveToday || 0} 
          icon={Calendar} 
          colorClass="bg-emerald-100 text-emerald-600" 
        />
        <StatCard 
          title="Open Positions" 
          value={metrics?.openPositions || 0} 
          icon={UserPlus} 
          colorClass="bg-purple-100 text-purple-600" 
        />
        <StatCard 
          title="Avg Attendance" 
          value={`${metrics?.avgAttendance || 0}%`} 
          icon={Clock} 
          colorClass="bg-amber-100 text-amber-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Headcount Trend Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-[16px] font-black text-[var(--text-main)] mb-6">Headcount Trend</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { month: 'Feb', headcount: 14 },
                  { month: 'Mar', headcount: 14 },
                  { month: 'Apr', headcount: 15 },
                  { month: 'May', headcount: 15 },
                  { month: 'Jun', headcount: 16 },
                  { month: 'Jul', headcount: 16 },
                  { month: 'Aug', headcount: 17 },
                  { month: 'Sep', headcount: 18 },
                  { month: 'Oct', headcount: 18 },
                  { month: 'Nov', headcount: 19 },
                  { month: 'Dec', headcount: 19 },
                  { month: 'Jan', headcount: 20 },
                ]}
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
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-[16px] font-black text-[var(--text-main)] mb-2">Department Distribution</h3>
          <div className="flex-1 w-full min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Design', value: 10 },
                    { name: 'Engineering', value: 25 },
                    { name: 'Finance', value: 5 },
                    { name: 'HR', value: 10 },
                    { name: 'Marketing', value: 15 },
                    { name: 'Operations', value: 5 },
                    { name: 'Product', value: 15 },
                    { name: 'Sales', value: 15 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#f43f5e" /> {/* Design - Rose */}
                  <Cell fill="#6366f1" /> {/* Engineering - Indigo */}
                  <Cell fill="#0ea5e9" /> {/* Finance - Sky */}
                  <Cell fill="#f43f5e" /> {/* HR - Rose */}
                  <Cell fill="#f97316" /> {/* Marketing - Orange */}
                  <Cell fill="#14b8a6" /> {/* Operations - Teal */}
                  <Cell fill="#a855f7" /> {/* Product - Purple */}
                  <Cell fill="#10b981" /> {/* Sales - Emerald */}
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
      </div>

      <div className="grid grid-cols-1 gap-6">

        {/* Recent Activity Feed */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[16px] font-black text-[var(--text-main)]">Recent Activity</h3>
            <button className="text-[13px] font-bold text-[var(--accent)] hover:underline flex items-center">
              View All <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="space-y-6 flex-1">
            {[
              { title: 'New Employee Onboarded', desc: 'Sarah Jenkins joined Engineering', time: '2 hours ago', icon: UserPlus, color: 'text-blue-500 bg-blue-50' },
              { title: 'Leave Approved', desc: 'Mike Ross (3 days Annual Leave)', time: '4 hours ago', icon: Calendar, color: 'text-emerald-500 bg-emerald-50' },
              { title: 'Role Updated', desc: 'David Kim promoted to Senior Dev', time: '1 day ago', icon: Briefcase, color: 'text-purple-500 bg-purple-50' },
              { title: 'Profile Updated', desc: 'HR Admin updated 5 profiles', time: '2 days ago', icon: UserCheck, color: 'text-amber-500 bg-amber-50' },
            ].map((activity, i) => {
              const ActivityIcon = activity.icon;
              return (
                <div key={i} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${activity.color}`}>
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
