import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Calendar, Clock, Loader2, TrendingUp, UserCheck, Briefcase, ChevronRight } from 'lucide-react';
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSS-Based Bar Chart: Employee Growth */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[16px] font-black text-[var(--text-main)]">Employee Growth</h3>
              <p className="text-[13px] text-[var(--text-muted)] font-medium mt-1">Net headcount over the last 6 months</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-[12px] font-bold">
              <TrendingUp size={14} />
              <span>+12.5%</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-end justify-between gap-2 mt-auto pt-4 border-t border-[var(--border-color)]">
            {[
              { month: 'Jan', val: 65, height: '60%' },
              { month: 'Feb', val: 72, height: '65%' },
              { month: 'Mar', val: 80, height: '70%' },
              { month: 'Apr', val: 78, height: '68%' },
              { month: 'May', val: 95, height: '85%' },
              { month: 'Jun', val: 112, height: '100%' },
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1 group">
                <div className="w-full relative h-[250px] flex items-end justify-center rounded-t-md">
                  {/* Tooltip */}
                  <div className="absolute -top-10 bg-black text-white text-[11px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    {d.val} Emp
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-3/4 max-w-[40px] bg-[var(--accent)] rounded-t-lg transition-all duration-500 group-hover:opacity-80"
                    style={{ height: d.height }}
                  ></div>
                </div>
                <span className="text-[12px] font-bold text-[var(--text-muted)] mt-3 uppercase tracking-wider">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

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
