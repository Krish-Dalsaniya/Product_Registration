import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Calendar, Clock, Loader2 } from 'lucide-react';
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
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm min-h-[400px] flex items-center justify-center">
          <p className="text-[var(--text-muted)] font-bold text-sm tracking-widest uppercase">Chart: Employee Growth</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm min-h-[400px] flex items-center justify-center">
          <p className="text-[var(--text-muted)] font-bold text-sm tracking-widest uppercase">Recent Activity</p>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
