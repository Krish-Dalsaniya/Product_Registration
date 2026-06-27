import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Search, MoreVertical, FileText, CheckCircle, UserPlus, ArrowRight, ArrowLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchOnboardingRecordsApi, updateOnboardingStatusApi, fetchHREmployeesApi, createOnboardingRecordApi } from '../../../api/hr';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadRecords = async () => {
        try {
            setIsLoading(true);
            const res = await fetchOnboardingRecordsApi();
            if (res.data?.success) {
                setRecords(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to load onboarding records');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await updateOnboardingStatusApi(id, newStatus);
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
            
            const res = await updateOnboardingStatusApi(recordId, targetStatus);
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

    const filteredRecords = records.filter(r => 
        r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.emp_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        { id: 'Pending', title: 'Pending', icon: UserPlus, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
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
                        <UserPlus size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Onboarding</h1>
                        <p className="text-[14px] text-[var(--text-muted)] font-semibold mt-1">Manage new employee onboarding pipelines</p>
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
                    {hasPermission('hr', 'create', 'onboarding') && (
                    <button 
                        onClick={() => navigate('/hr/employees/new?onboarding=true')}
                        className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-[14px] font-bold hover:bg-opacity-90 transition-all shadow-sm shadow-[var(--accent)]/20 active:scale-95">
                        <Plus size={18} />
                        New Onboarding
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
                                        draggable={hasPermission('hr', 'edit', 'onboarding')}
                                        onDragStart={(e) => hasPermission('hr', 'edit', 'onboarding') ? handleDragStart(e, record) : e.preventDefault()}
                                        className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:border-[var(--accent)]/50 ${hasPermission('hr', 'edit', 'onboarding') ? 'cursor-grab active:cursor-grabbing' : ''}`}
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
                                                <span className="text-[var(--text-muted)] font-medium">Docs</span>
                                                <span className="text-[var(--text-main)] font-bold">
                                                    {record.document_checklist?.filter(c => c.checked).length || 0} / {record.document_checklist?.length || 0}
                                                </span>
                                            </div>
                                            <div className="w-full bg-[var(--border-color)] rounded-full h-1.5">
                                                <div 
                                                    className="bg-[var(--accent)] h-1.5 rounded-full" 
                                                    style={{ width: `${((record.document_checklist?.filter(c => c.checked).length || 0) / (record.document_checklist?.length || 1)) * 100}%` }}
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

        </div>
    );
};

export default OnboardingPage;
