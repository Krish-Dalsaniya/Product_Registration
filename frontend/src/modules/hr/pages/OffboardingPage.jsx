import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Search, MoreVertical, FileText, CheckCircle, UserMinus, ArrowRight, ArrowLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchOffboardingRecordsApi, updateOffboardingStatusApi, fetchHREmployeesApi, createOffboardingRecordApi } from '../../../api/hr';
import { useAuth } from '../../../context/AuthContext';

const OffboardingPage = () => {
    const { hasPermission } = useAuth();
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [resignationDate, setResignationDate] = useState('');
    const [lastWorkingDay, setLastWorkingDay] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadRecords = async () => {
        try {
            setIsLoading(true);
            const res = await fetchOffboardingRecordsApi();
            if (res.data?.success) {
                setRecords(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to load offboarding records');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const res = await fetchHREmployeesApi();
            if (res.data?.success) {
                setEmployees(res.data.data);
            }
        } catch (error) {
            console.error('Failed to load employees for dropdown', error);
        }
    };

    useEffect(() => {
        loadRecords();
        loadEmployees();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await updateOffboardingStatusApi(id, newStatus);
            if (res.data?.success) {
                toast.success(`Moved to ${newStatus}`);
                loadRecords();
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDragStart = (e, record) => {
        e.dataTransfer.setData('recordId', record.id);
        e.dataTransfer.setData('sourceStatus', record.status);
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        const recordId = e.dataTransfer.getData('recordId');
        const sourceStatus = e.dataTransfer.getData('sourceStatus');

        if (sourceStatus === targetStatus) return;

        try {
            // Optimistic update
            setRecords(prev => prev.map(r => r.id.toString() === recordId.toString() ? { ...r, status: targetStatus } : r));
            
            const res = await updateOffboardingStatusApi(recordId, targetStatus);
            if (res.data?.success) {
                toast.success(`Moved to ${targetStatus}`);
                loadRecords();
            } else {
                loadRecords();
            }
        } catch (error) {
            toast.error('Failed to move record');
            loadRecords();
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId) {
            toast.error('Please select an employee');
            return;
        }
        try {
            setIsSubmitting(true);
            const res = await createOffboardingRecordApi({
                employee_id: selectedEmployeeId,
                resignation_date: resignationDate || null,
                last_working_day: lastWorkingDay || null
            });
            if (res.data?.success) {
                toast.success('Offboarding record created successfully');
                setIsModalOpen(false);
                setSelectedEmployeeId('');
                setResignationDate('');
                setLastWorkingDay('');
                loadRecords();
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Failed to create offboarding record');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredRecords = records.filter(r => 
        r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.emp_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        { id: 'Resignation Submitted', title: 'Resigned', icon: UserMinus, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        { id: 'In Progress', title: 'In Progress', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { id: 'Completed', title: 'Completed', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-10 relative z-30">
                <div className="flex items-center gap-5">
                    <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
                        <UserMinus size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Offboarding</h1>
                        <p className="text-[14px] text-[var(--text-muted)] font-semibold mt-1">Manage employee exit pipelines</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            className="pl-9 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-[14px] font-semibold text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all w-full md:w-64 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {hasPermission('hr', 'create', 'offboarding') && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-[14px] font-bold hover:bg-opacity-90 transition-all shadow-sm shadow-[var(--accent)]/20 active:scale-95">
                        <Plus size={18} />
                        New Offboarding
                    </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)] min-h-[500px]">
                {columns.map(column => {
                    const columnRecords = filteredRecords.filter(r => r.status === column.id);
                    return (
                        <div 
                            key={column.id} 
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col overflow-hidden shadow-sm"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className={`p-4 border-b border-[var(--border-color)] flex items-center justify-between ${column.bg}`}>
                                <div className="flex items-center gap-2">
                                    <column.icon className={`w-5 h-5 ${column.color}`} />
                                    <h3 className="text-[15px] font-bold text-[var(--text-main)]">{column.title}</h3>
                                </div>
                                <span className="bg-white/50 dark:bg-black/20 text-[var(--text-main)] text-xs font-bold px-2 py-1 rounded-lg">
                                    {columnRecords.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-body)]">
                                {columnRecords.map(record => (
                                    <div 
                                        key={record.id} 
                                        draggable={hasPermission('hr', 'edit', 'offboarding')}
                                        onDragStart={(e) => hasPermission('hr', 'edit', 'offboarding') ? handleDragStart(e, record) : e.preventDefault()}
                                        className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:border-[var(--accent)]/50 ${hasPermission('hr', 'edit', 'offboarding') ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold">
                                                    {record.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <h4 className="text-[14px] font-bold text-[var(--text-main)]">{record.full_name}</h4>
                                                    <p className="text-[12px] text-[var(--text-muted)] font-medium">{record.emp_code}</p>
                                                </div>
                                            </div>
                                            <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center justify-between text-[12px]">
                                                <span className="text-[var(--text-muted)] font-medium">Clearance</span>
                                                <span className="text-[var(--text-main)] font-bold">
                                                    {record.clearance_checklist?.filter(c => c.checked).length || 0} / {record.clearance_checklist?.length || 0}
                                                </span>
                                            </div>
                                            <div className="w-full bg-[var(--border-color)] rounded-full h-1.5">
                                                <div 
                                                    className="bg-[var(--accent)] h-1.5 rounded-full" 
                                                    style={{ width: `${((record.clearance_checklist?.filter(c => c.checked).length || 0) / (record.clearance_checklist?.length || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {columnRecords.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-[13px] text-[var(--text-muted)] font-medium">No records here</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
                            <h2 className="text-lg font-black text-[var(--text-main)]">Start New Offboarding</h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-[var(--bg-body)] rounded-xl text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-5">
                            <div>
                                <label className="block text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                    Select Employee
                                </label>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] font-semibold text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                                    required
                                >
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(emp => (
                                        <option key={emp.employee_id} value={emp.employee_id}>
                                            {emp.full_name} ({emp.emp_code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                        Resignation Date
                                    </label>
                                    <input
                                        type="date"
                                        value={resignationDate}
                                        onChange={(e) => setResignationDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] font-semibold text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                        Last Working Day
                                    </label>
                                    <input
                                        type="date"
                                        value={lastWorkingDay}
                                        onChange={(e) => setLastWorkingDay(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] font-semibold text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-[14px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 bg-[var(--accent)] text-white px-6 py-2.5 rounded-xl text-[14px] font-bold hover:bg-opacity-90 transition-all shadow-sm shadow-[var(--accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                    Create Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OffboardingPage;
