import React, { useState, useEffect } from 'react';
import { Plus, Clock, Users, Calendar as CalendarIcon, FileText, Loader2, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { fetchLeaveSummaryApi, fetchUpcomingLeavesApi, fetchCalendarDataApi } from '../../../api/leaves';
import ApplyLeaveModal from '../components/ApplyLeaveModal';
import toast from 'react-hot-toast';

const StatCard = ({ title, remaining, total, used, icon: Icon, iconColor, bgClass }) => {
  const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;
  
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col hover:-translate-y-1 transition-transform duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgClass}`}>
          <Icon size={16} className={iconColor} />
        </div>
        <h3 className="text-[14px] font-black text-[var(--text-main)]">{title}</h3>
      </div>
      
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-black text-[var(--text-main)] tracking-tighter">{remaining}</span>
        <span className="text-[12px] font-bold text-[var(--text-muted)] tracking-wider">/ {total} days remaining</span>
      </div>

      <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-main)] mb-2 mt-auto">
        <span>{used} days used</span>
        <span>{percentUsed}%</span>
      </div>
      <div className="w-full h-1 bg-[var(--bg-workspace)] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentUsed}%`, backgroundColor: '#10b981' }}
        />
      </div>
    </div>
  );
};

const MiniStatCard = ({ title, count, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
      <Icon size={24} className={iconColor} />
    </div>
    <div>
      <h3 className="text-2xl font-black text-[var(--text-main)] leading-tight">{count}</h3>
      <p className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider mt-0.5">{title}</p>
    </div>
  </div>
);

const LeaveManagement = () => {
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026 default as per screenshot
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sumRes, upRes, calRes] = await Promise.all([
        fetchLeaveSummaryApi(),
        fetchUpcomingLeavesApi(),
        fetchCalendarDataApi(currentDate.getMonth() + 1, currentDate.getFullYear())
      ]);

      if (sumRes.data?.success) setSummary(sumRes.data.data);
      if (upRes.data?.success) setUpcoming(upRes.data.data);
      if (calRes.data?.success) setCalendarData(calRes.data.data);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  // Calendar Logic
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Padding days
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Simplified logic to determine dot color for calendar
  // In a real app, this would cross-reference team data
  const getDayStatus = (day) => {
    if (!day) return null;
    const dayStr = day.toISOString().split('T')[0];
    const isUserOnLeave = calendarData.some(l => {
      const start = new Date(l.start_date).toISOString().split('T')[0];
      const end = new Date(l.end_date).toISOString().split('T')[0];
      return dayStr >= start && dayStr <= end;
    });

    if (isUserOnLeave) return 'many'; // Red dot for user's own leaves
    
    // Randomize some dots for UI mockup purposes
    if (day.getDate() % 7 === 0) return 'some';
    if (day.getDate() === 15) return 'available';
    return null;
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
      </div>
    );
  }

  const balances = summary?.balances || { PTO: {total:0,used:0}, 'Sick Leave': {total:0,used:0}, Personal: {total:0,used:0} };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
            Leave Management
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
            Manage your time off and team availability
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary shadow-lg px-6 py-2.5 group flex items-center gap-2 rounded-xl"
        >
          <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] font-black uppercase tracking-widest">Apply for Leave</span>
        </button>
      </div>

      {/* Main Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard 
          title="PTO" 
          total={balances['PTO'].total} 
          used={balances['PTO'].used}
          remaining={balances['PTO'].total - balances['PTO'].used}
          icon={FileText} // Placeholder for tree/leaf
          bgClass="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard 
          title="Sick Leave" 
          total={balances['Sick Leave'].total} 
          used={balances['Sick Leave'].used}
          remaining={balances['Sick Leave'].total - balances['Sick Leave'].used}
          icon={FileText} // Placeholder for thermometer
          bgClass="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard 
          title="Personal" 
          total={balances['Personal'].total} 
          used={balances['Personal'].used}
          remaining={balances['Personal'].total - balances['Personal'].used}
          icon={User} 
          bgClass="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <MiniStatCard 
          title="Pending Requests" 
          count={summary?.pendingRequests || 0} 
          icon={Clock} 
          iconBg="bg-orange-50" 
          iconColor="text-orange-500" 
        />
        <MiniStatCard 
          title="Team Out Today" 
          count={summary?.teamOutToday || 0} 
          icon={Users} 
          iconBg="bg-blue-50" 
          iconColor="text-blue-500" 
        />
      </div>

      {/* Calendar & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Calendar Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-[var(--text-muted)]" />
              <h3 className="text-[14px] font-black text-[var(--text-main)]">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                className="p-1 rounded hover:bg-[var(--bg-workspace)]"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                className="p-1 rounded hover:bg-[var(--bg-workspace)]"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-4 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {day}
              </div>
            ))}
            
            {days.map((day, i) => {
              const status = getDayStatus(day);
              return (
                <div key={i} className="flex flex-col items-center justify-start h-10">
                  {day ? (
                    <>
                      <span className="text-[13px] font-medium text-[var(--text-main)] mb-1">{day.getDate()}</span>
                      {status && (
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          status === 'available' ? 'bg-emerald-500' :
                          status === 'some' ? 'bg-orange-400' : 'bg-rose-500'
                        }`} />
                      )}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-[var(--text-muted)]">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-[11px] font-bold text-[var(--text-muted)]">Some out</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[11px] font-bold text-[var(--text-muted)]">Many out</span>
            </div>
          </div>
        </div>

        {/* Upcoming Leaves */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={16} className="text-[var(--text-muted)]" />
            <h3 className="text-[14px] font-black text-[var(--text-main)]">My Upcoming Leaves</h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-10">
            {upcoming.length > 0 ? (
              <div className="w-full space-y-4">
                {upcoming.map(leave => (
                  <div key={leave.id} className="flex justify-between items-center p-4 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-workspace)] transition-colors">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--text-main)]">{leave.leave_type}</h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200">
                      Approved
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <FileText size={32} className="text-[var(--text-dim)] mb-4 opacity-50" />
                <p className="text-[13px] font-medium text-[var(--text-muted)] mb-4">No upcoming leaves scheduled</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 border border-[var(--border-color)] rounded-xl text-[12px] font-bold hover:bg-[var(--bg-workspace)] transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> Apply for Leave
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Policy Summary */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--text-muted)]" />
            <h3 className="text-[14px] font-black text-[var(--text-main)]">Leave Policy Summary</h3>
          </div>
          <button className="text-[11px] font-bold text-[var(--text-main)] hover:underline flex items-center gap-1">
            View Policies <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
            <h4 className="text-[12px] font-black text-[var(--text-main)] mb-1">PTO</h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              15-20 days/year, 1.25 days/month accrual, up to 5 days carryover
            </p>
          </div>
          <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
            <h4 className="text-[12px] font-black text-[var(--text-main)] mb-1">Sick Leave</h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              10 days/year, granted annually, no carryover
            </p>
          </div>
          <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
            <h4 className="text-[12px] font-black text-[var(--text-main)] mb-1">Personal Days</h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              3 days/year, granted annually, no carryover
            </p>
          </div>
        </div>
      </div>

      <ApplyLeaveModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadData}
      />
    </div>
  );
};

export default LeaveManagement;
