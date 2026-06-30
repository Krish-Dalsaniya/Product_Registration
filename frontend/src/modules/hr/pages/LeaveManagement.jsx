import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Clock, Users, Calendar as CalendarIcon, FileText, Loader2, ChevronLeft, ChevronRight, User, Check, X, CheckCircle, Palmtree, LayoutDashboard, ListChecks } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { fetchLeaveSummaryApi, fetchUpcomingLeavesApi, fetchCalendarDataApi, fetchAllLeaveRequestsApi, updateLeaveStatusApi, fetchUserLeaveBalancesApi, fetchMyLeaveHistoryApi } from '../../../api/leaves';
import ApplyLeaveModal from '../components/ApplyLeaveModal';
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
  const { hasPermission, user } = useAuth();
  const isManagerView = user?.role_name?.toLowerCase() === 'admin' || hasPermission('hr', 'edit', 'payrolls_leaves');

  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [myHistory, setMyHistory] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayAbsences, setSelectedDayAbsences] = useState(null);

  const [userBalances, setUserBalances] = useState(null);

  // Calendar & UI State
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const pieData = useMemo(() => {
    if (!calendarData || calendarData.length === 0) return [];
    const typeCounts = {};
    calendarData.forEach(leave => {
      typeCounts[leave.leave_type] = (typeCounts[leave.leave_type] || 0) + 1;
    });
    return Object.keys(typeCounts).map(key => ({
      name: key,
      value: typeCounts[key]
    }));
  }, [calendarData]);

  
  const loadData = async () => {
    try {
      setIsLoading(true);
      if (isManagerView) {
        const [sumRes, upRes, calRes, pendRes, balRes] = await Promise.all([
          fetchLeaveSummaryApi(),
          fetchUpcomingLeavesApi(),
          fetchCalendarDataApi(currentDate.getMonth() + 1, currentDate.getFullYear()),
          fetchAllLeaveRequestsApi(),
          fetchUserLeaveBalancesApi()
        ]);

        if (sumRes.data?.success) setSummary(sumRes.data.data);
        if (upRes.data?.success) setUpcoming(upRes.data.data);
        if (calRes.data?.success) setCalendarData(calRes.data.data);
        if (pendRes.data?.success) setAllRequests(pendRes.data.data);
        if (balRes.data?.success) setUserBalances(balRes.data.data);
      } else {
        const [calRes, balRes, histRes] = await Promise.all([
          fetchCalendarDataApi(currentDate.getMonth() + 1, currentDate.getFullYear()),
          fetchUserLeaveBalancesApi(),
          fetchMyLeaveHistoryApi()
        ]);
        if (calRes.data?.success) setCalendarData(calRes.data.data);
        if (balRes.data?.success) setUserBalances(balRes.data.data);
        if (histRes.data?.success) setMyHistory(histRes.data.data);
      }

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

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

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

  if (isLoading && (!summary && !userBalances)) {
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

  const filteredRequests = allRequests.filter(r => statusFilter === 'All' || r.status === statusFilter);
  const totalPages = Math.ceil(filteredRequests.length / 7) || 1;
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * 7, currentPage * 7);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
              <Palmtree size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
                Leave Management
              </h1>
              <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
                Manage your time off and team availability
              </p>
            </div>
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
      {/* Top Stats Cards & Tabs */}
      {isManagerView ? (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-[var(--border-color)]">
            <button onClick={() => setActiveTab('overview')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
              <div className="flex items-center gap-2"><LayoutDashboard size={16} /> Overview</div>
            </button>
            <button onClick={() => setActiveTab('approvals')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'approvals' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
              <div className="flex items-center gap-2"><ListChecks size={16} /> Leaves 
              {allRequests.filter(r => r.status === 'Pending').length > 0 && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] ml-1">{allRequests.filter(r => r.status === 'Pending').length}</span>}</div>
            </button>
            <button onClick={() => setActiveTab('calendar')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
              <div className="flex items-center gap-2"><CalendarIcon size={16} /> Team Calendar</div>
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <MiniStatCard title="Company Pending Requests" count={summary?.pendingRequests || 0} icon={Clock} iconBg="bg-orange-50" iconColor="text-orange-500" />
                <MiniStatCard title="Team Out Today" count={summary?.teamOutToday || 0} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-500" />
                <MiniStatCard title="Approved This Month" count={summary?.approvedThisMonth || 0} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm col-span-1 flex flex-col">
                  <h3 className="text-[14px] font-black text-[var(--text-main)] mb-6">Leave Distribution</h3>
                  <div className="flex-1 w-full min-h-[250px]">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-[12px] font-medium">No leave data this month</div>
                    )}
                  </div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm col-span-1 lg:col-span-2">
                  <h3 className="text-[14px] font-black text-[var(--text-main)] mb-6">Upcoming Absences (Company-Wide)</h3>
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
              </div>
            </>
          )}

          {activeTab === 'approvals' && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-0 shadow-sm overflow-x-auto mb-6">
              <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2">
                {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${statusFilter === status ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-workspace)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[var(--bg-workspace)] border-b border-[var(--border-color)]">
                    <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Employee</th>
                    <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Leave Type</th>
                    <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Duration</th>
                    <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.length > 0 ? (
                    paginatedRequests.map(req => (
                      <tr key={req.id} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-workspace)] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shadow-inner">{req.employee_name.charAt(0)}</div>
                            <div>
                              <p className="text-[13px] font-bold text-[var(--text-main)]">{req.employee_name}</p>
                              <p className="text-[11px] font-medium text-[var(--text-muted)] mt-0.5">{req.reason || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-200">
                            {req.leave_type}
                          </span>
                        </td>
                        <td className="p-4 text-[12px] text-[var(--text-main)]">
                          <span className="font-semibold">{new Date(req.start_date).toLocaleDateString()}</span>
                          <span className="text-[var(--text-muted)] mx-1">to</span>
                          <span className="font-semibold">{new Date(req.end_date).toLocaleDateString()}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                            req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                            'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-4 flex items-center justify-end gap-2 h-full">
                          {hasPermission('hr', 'edit', 'payrolls_leaves') && req.status === 'Pending' && (
                            <>
                              <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors" title="Approve">
                                <Check size={16} strokeWidth={3} />
                              </button>
                              <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors" title="Reject">
                                <X size={16} strokeWidth={3} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-12 text-center">
                        <CheckCircle size={32} className="text-[var(--text-muted)] mb-4 opacity-50 mx-auto" />
                        <p className="text-[14px] font-black text-[var(--text-main)] mb-1">No requests found</p>
                        <p className="text-[12px] font-medium text-[var(--text-muted)]">There are no {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} leave requests to show.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {totalPages > 1 && (
                <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-workspace)]">
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">
                    Showing {(currentPage - 1) * 7 + 1} to {Math.min(currentPage * 7, filteredRequests.length)} of {filteredRequests.length} entries
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-[12px] font-bold transition-colors ${
                            currentPage === page 
                              ? 'bg-[var(--accent)] text-white border border-[var(--accent)]' 
                              : 'border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm mb-6">
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
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {Object.entries(balances).map(([type, bal], idx) => (
              <div key={idx} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex flex-col justify-center items-center">
                <h3 className="text-xl font-black text-[var(--text-main)]">{bal.total - bal.used}</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase text-center">{type}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
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
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <FileText size={16} className="text-[var(--text-muted)]" />
                <h3 className="text-[14px] font-black text-[var(--text-main)]">My Leave History</h3>
              </div>

              <div className="flex-1 flex flex-col items-center justify-start py-4 overflow-y-auto max-h-[400px]">
                {myHistory.length > 0 ? (
                  <div className="w-full space-y-4">
                    {myHistory.map(req => (
                      <div key={req.id} className="flex flex-col p-4 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-workspace)] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-[13px] font-bold text-[var(--text-main)]">{req.leave_type}</h4>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-orange-50 text-orange-600 border-orange-200'} border`}>
                            {req.status}
                          </span>
                        </div>
                        
                        <div className="text-[12px] text-[var(--text-main)] mb-1">
                          <span className="font-semibold">{new Date(req.start_date).toLocaleDateString()}</span> to <span className="font-semibold">{new Date(req.end_date).toLocaleDateString()}</span>
                        </div>
                        {req.reason && <p className="text-[11px] text-[var(--text-muted)] italic">"{req.reason}"</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <FileText size={32} className="text-[var(--text-muted)] mb-4 opacity-50" />
                    <p className="text-[13px] font-medium text-[var(--text-muted)] mb-2">No leave history</p>
                  </div>
                )}
              </div>
            </div>
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
