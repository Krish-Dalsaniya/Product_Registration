import React, { useState, useEffect } from 'react';
import { Plus, Clock, Users, Calendar as CalendarIcon, FileText, Loader2, ChevronLeft, ChevronRight, User, Check, X, CheckCircle } from 'lucide-react';
import { fetchLeaveSummaryApi, fetchUpcomingLeavesApi, fetchCalendarDataApi, fetchAllPendingRequestsApi, updateLeaveStatusApi, fetchUserLeaveBalancesApi } from '../../../api/leaves';
import ApplyLeaveModal from '../components/ApplyLeaveModal';
import HolidaysList from '../components/HolidaysList';
import Modal from '../../../components/shared/Modal';
import toast from 'react-hot-toast';



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
  const [pendingRequests, setPendingRequests] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaves');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayAbsences, setSelectedDayAbsences] = useState(null);

  const [userBalances, setUserBalances] = useState(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sumRes, upRes, calRes, pendRes, balRes] = await Promise.all([
        fetchLeaveSummaryApi(),
        fetchUpcomingLeavesApi(),
        fetchCalendarDataApi(currentDate.getMonth() + 1, currentDate.getFullYear()),
        fetchAllPendingRequestsApi(),
        fetchUserLeaveBalancesApi()
      ]);

      if (sumRes.data?.success) setSummary(sumRes.data.data);
      if (upRes.data?.success) setUpcoming(upRes.data.data);
      if (calRes.data?.success) setCalendarData(calRes.data.data);
      if (pendRes.data?.success) setPendingRequests(pendRes.data.data);
      if (balRes.data?.success) setUserBalances(balRes.data.data);

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

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await updateLeaveStatusApi(id, status);
      if (res.data?.success) {
        toast.success(`Leave request ${status.toLowerCase()} successfully`);
        loadData(); // Refresh data
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update leave status');
    }
  };

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

  // Calculate actual dot color based on real company leaves
  const getDayStatus = (day) => {
    if (!day) return null;
    const dayStr = day.toISOString().split('T')[0];
    
    // Count how many people are on leave this day
    const peopleOnLeaveCount = calendarData.filter(l => {
      const start = new Date(l.start_date).toISOString().split('T')[0];
      const end = new Date(l.end_date).toISOString().split('T')[0];
      return dayStr >= start && dayStr <= end;
    }).length;

    // Skip weekends from showing available
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0) return null; // Only skip Sunday

    if (peopleOnLeaveCount === 0) return 'available';
    if (peopleOnLeaveCount < 3) return 'some';
    return 'many';
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dayStr = day.toISOString().split('T')[0];
    
    // Find all people on leave this day
    const peopleOnLeave = calendarData.filter(l => {
      const start = new Date(l.start_date).toISOString().split('T')[0];
      const end = new Date(l.end_date).toISOString().split('T')[0];
      return dayStr >= start && dayStr <= end;
    });

    if (peopleOnLeave.length > 0) {
      setSelectedDayAbsences({
        date: day,
        leaves: peopleOnLeave
      });
    } else {
      // Only show toast if it's a working day
      if (day.getDay() !== 0) {
        toast.success("Everyone is available today!");
      }
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
      </div>
    );
  }

  const formatBalances = () => {
    const defaultBalances = { 
      'Paid Leave': {total:12,used:0}, 
      'Sick Leave': {total:6,used:0}, 
      'Complementary Leave': {total:0,used:0},
      'Emergency Leave': {total:3,used:0},
      'LOP (Loss Of Pay)': {total:0,used:0}
    };
    if (!userBalances || userBalances.length === 0) return defaultBalances;
    
    const formatted = {};
    userBalances.forEach(b => {
      formatted[b.leave_type] = { total: parseFloat(b.total_days), used: parseFloat(b.used_days) };
    });
    return { ...defaultBalances, ...formatted };
  };
  const balances = formatBalances();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              Leave & Holiday Management
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
              Manage your time off, holidays, and team availability
            </p>
          </div>
          <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-1 rounded-xl shadow-sm w-fit">
            <button
              onClick={() => setActiveTab('leaves')}
              className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${activeTab === 'leaves' ? 'bg-[var(--accent)] shadow-md text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              Leave Management
            </button>
            <button
              onClick={() => setActiveTab('holidays')}
              className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${activeTab === 'holidays' ? 'bg-[var(--accent)] shadow-md text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              Public Holidays
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary shadow-lg px-6 py-2.5 group flex items-center gap-2 rounded-xl h-fit"
        >
          <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] font-black uppercase tracking-widest">Apply for Leave</span>
        </button>
      </div>

      {activeTab === 'holidays' ? (
        <HolidaysList />
      ) : (
        <>
          {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MiniStatCard 
          title="Company Pending Requests" 
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
        <MiniStatCard 
          title="Approved This Month" 
          count={summary?.approvedThisMonth || 0} 
          icon={CheckCircle} 
          iconBg="bg-emerald-50" 
          iconColor="text-emerald-500" 
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
                <div 
                  key={i} 
                  className={`flex flex-col items-center justify-start h-10 ${day ? 'cursor-pointer hover:bg-[var(--bg-workspace)] rounded-lg transition-colors pt-1' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
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

        {/* Pending Approvals */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={16} className="text-[var(--text-muted)]" />
            <h3 className="text-[14px] font-black text-[var(--text-main)]">Pending Approvals</h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start py-4 overflow-y-auto max-h-[400px]">
            {pendingRequests.length > 0 ? (
              <div className="w-full space-y-4">
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex flex-col p-4 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-workspace)] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-[13px] font-bold text-[var(--text-main)]">{req.employee_name}</h4>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">{req.email}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-200">
                        {req.leave_type}
                      </span>
                    </div>
                    
                    <div className="text-[12px] text-[var(--text-main)] mb-3">
                      <span className="font-semibold">{new Date(req.start_date).toLocaleDateString()}</span> to <span className="font-semibold">{new Date(req.end_date).toLocaleDateString()}</span>
                      {req.reason && <p className="mt-1 text-[11px] text-[var(--text-muted)] italic">"{req.reason}"</p>}
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                      <button 
                        onClick={() => handleStatusUpdate(req.id, 'Approved')}
                        className="flex-1 flex justify-center items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(req.id, 'Rejected')}
                        className="flex-1 flex justify-center items-center gap-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CheckCircle size={32} className="text-emerald-500 mb-4 opacity-80" />
                <p className="text-[13px] font-medium text-[var(--text-muted)] mb-2">All caught up!</p>
                <p className="text-[11px] text-[var(--text-dim)]">No pending leave requests to review.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Company Absences */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--text-muted)]" />
            <h3 className="text-[14px] font-black text-[var(--text-main)]">Upcoming Absences (Company-Wide)</h3>
          </div>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(leave => (
              <div key={leave.id} className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                <div>
                  <h4 className="text-[12px] font-black text-[var(--text-main)] mb-1">{leave.employee_name}</h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {leave.leave_type} • {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Approved
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-[13px] font-medium text-[var(--text-muted)]">No upcoming absences scheduled.</p>
          </div>
        )}
      </div>
      </>
      )}

      <ApplyLeaveModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadData}
      />

      {selectedDayAbsences && (
        <Modal
          isOpen={!!selectedDayAbsences}
          onClose={() => setSelectedDayAbsences(null)}
          title={`Absences on ${selectedDayAbsences.date.toLocaleDateString()}`}
          maxWidth="max-w-md"
        >
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {selectedDayAbsences.leaves.map((leave, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] hover:-translate-y-1 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black shadow-inner">
                      {leave.employee_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--text-main)]">{leave.employee_name}</h4>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">{leave.leave_type}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">
                    Out
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LeaveManagement;
