import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Search, UserMinus, FileText, CheckCircle, Clock, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchOffboardingRecordsApi, updateOffboardingStatusApi, updateOffboardingChecklistApi } from '../../../api/hr';
import { useAuth } from '../../../context/AuthContext';
import DataTable from '../../../components/shared/DataTable';
import Modal from '../../../components/shared/Modal';
import AddOffboardingWizard from '../components/AddOffboardingWizard';

const OffboardingPage = () => {
    const { hasPermission } = useAuth();
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    
    // Modal state
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Editable checklists
    const [editClearance, setEditClearance] = useState([]);
    const [editAssets, setEditAssets] = useState([]);
    const [editNotes, setEditNotes] = useState('');
    const [editStatus, setEditStatus] = useState('');

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

    useEffect(() => {
        loadRecords();
    }, []);

    const openEditModal = (record) => {
        setSelectedRecord(record);
        setEditClearance(record.clearance_checklist || []);
        setEditAssets(record.asset_recovery_checklist || []);
        setEditNotes(record.exit_interview_notes || '');
        setEditStatus(record.status || 'Pending');
    };

    const closeEditModal = () => {
        setSelectedRecord(null);
    };

    const handleSave = async () => {
        if (!selectedRecord) return;
        setIsSaving(true);
        try {
            // Update checklists
            await updateOffboardingChecklistApi(selectedRecord.id, {
                clearance_checklist: editClearance,
                asset_recovery_checklist: editAssets,
                exit_interview_notes: editNotes
            });

            // Update status if changed
            if (editStatus !== selectedRecord.status) {
                await updateOffboardingStatusApi(selectedRecord.id, editStatus);
            }
            
            toast.success('Offboarding checklist updated!');
            closeEditModal();
            loadRecords();
        } catch (error) {
            toast.error('Failed to update offboarding');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleChecklist = (listName, idx) => {
        if (listName === 'clearance') {
            const newList = [...editClearance];
            newList[idx].checked = !newList[idx].checked;
            setEditClearance(newList);
        } else if (listName === 'assets') {
            const newList = [...editAssets];
            newList[idx].checked = !newList[idx].checked;
            setEditAssets(newList);
        }
    };

    const calculateProgress = (record) => {
        if (record.status === 'Completed') return 100;

        const clearances = record.clearance_checklist || [];
        const assets = record.asset_recovery_checklist || [];
        
        const total = clearances.length + assets.length;
        if (total === 0) return 0;

        const checked = 
            clearances.filter(i => i.checked).length + 
            assets.filter(i => i.checked).length;
            
        return Math.round((checked / total) * 100);
    };

    const filteredRecords = records.filter(r => 
        r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.emp_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            key: 'employee',
            label: 'Employee',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm shadow-inner">
                        {row.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h4 className="text-[14px] md:text-[15px] font-bold text-[var(--text-main)]">{row.full_name}</h4>
                        <p className="text-[12px] md:text-[13px] text-[var(--text-muted)] font-medium mt-0.5">{row.emp_code || 'No Code'}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => {
                let badgeClass = 'bg-amber-50 text-amber-600 border-amber-200';
                if (row.status === 'In Progress') badgeClass = 'bg-blue-50 text-blue-600 border-blue-200';
                if (row.status === 'Completed') badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                return (
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border ${badgeClass}`}>
                        {row.status}
                    </span>
                );
            }
        },
        {
            key: 'progress',
            label: 'Offboarding Progress',
            render: (row) => {
                const pct = calculateProgress(row);
                return (
                    <div className="w-full max-w-[200px]">
                        <div className="flex items-center justify-between text-[12px] font-bold mb-1.5">
                            <span className="text-[var(--text-muted)]">Completion</span>
                            <span className="text-[var(--text-main)]">{pct}%</span>
                        </div>
                        <div className="w-full bg-[var(--border-color)] rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-[var(--accent)] h-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                            ></div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'date',
            label: 'Resignation Date',
            render: (row) => (
                <span className="text-[13px] md:text-[14px] font-semibold text-[var(--text-main)]">
                    {row.resignation_date ? new Date(row.resignation_date).toLocaleDateString() : '-'}
                </span>
            )
        },
        {
            key: 'last_day',
            label: 'Last Day',
            render: (row) => (
                <span className="text-[13px] md:text-[14px] font-semibold text-rose-600">
                    {row.last_working_day ? new Date(row.last_working_day).toLocaleDateString() : '-'}
                </span>
            )
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-4 relative z-30">
                <div className="flex items-center gap-5">
                    <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
                        <UserMinus size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mr-2">Offboarding</h1>
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
                            onClick={() => setIsWizardOpen(true)}
                            className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl text-[14px] font-bold hover:bg-opacity-90 transition-all shadow-sm shadow-[var(--accent)]/20 active:scale-95">
                            <Plus size={18} />
                            New Offboarding
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                        <UserMinus size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{records.length}</h3>
                        <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Total Exits</p>
                    </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
                        <Clock size={20} className="text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">
                            {records.filter(r => r.status === 'Pending').length}
                        </h3>
                        <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Pending Action</p>
                    </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50">
                        <Monitor size={20} className="text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">
                            {records.filter(r => r.status === 'In Progress').length}
                        </h3>
                        <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">In Progress</p>
                    </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50">
                        <CheckCircle size={20} className="text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">
                            {records.filter(r => r.status === 'Completed').length}
                        </h3>
                        <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Completed</p>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
                <DataTable 
                    columns={columns}
                    data={filteredRecords}
                    onEdit={hasPermission('hr', 'edit', 'offboarding') ? openEditModal : null}
                    rowKey="id"
                />
            </div>

            {/* Checklist Editor Modal */}
            <Modal
                isOpen={!!selectedRecord}
                onClose={closeEditModal}
                title="Offboarding Checklist"
                maxWidth="max-w-xl"
            >
                {selectedRecord && (
                    <div className="flex flex-col h-[70vh]">
                        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-workspace)]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-lg">
                                    {selectedRecord.full_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-black text-[var(--text-main)]">{selectedRecord.full_name}</h3>
                                    <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">{selectedRecord.emp_code || 'No Code'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Overall Status</label>
                                <select 
                                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[13px] font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* Clearance */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 border-b border-[var(--border-color)] pb-2">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <h4 className="text-[14px] font-bold text-[var(--text-main)]">Clearances</h4>
                                </div>
                                {editClearance.length > 0 ? (
                                    <div className="space-y-3">
                                        {editClearance.map((item, idx) => (
                                            <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={item.checked} 
                                                    onChange={() => toggleChecklist('clearance', idx)}
                                                    className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                                />
                                                <span className={`text-[13px] font-medium transition-colors ${item.checked ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)] group-hover:text-[var(--accent)]'}`}>
                                                    {item.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[12px] text-[var(--text-muted)] italic">No clearance items in checklist.</p>
                                )}
                            </div>

                            {/* Assets */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 border-b border-[var(--border-color)] pb-2">
                                    <Clock size={18} className="text-amber-500" />
                                    <h4 className="text-[14px] font-bold text-[var(--text-main)]">Asset Recovery</h4>
                                </div>
                                {editAssets.length > 0 ? (
                                    <div className="space-y-3">
                                        {editAssets.map((item, idx) => (
                                            <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={item.checked} 
                                                    onChange={() => toggleChecklist('assets', idx)}
                                                    className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                                />
                                                <span className={`text-[13px] font-medium transition-colors ${item.checked ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)] group-hover:text-[var(--accent)]'}`}>
                                                    {item.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[12px] text-[var(--text-muted)] italic">No assets to recover.</p>
                                )}
                            </div>

                            {/* Exit Notes */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 border-b border-[var(--border-color)] pb-2">
                                    <FileText size={18} className="text-blue-500" />
                                    <h4 className="text-[14px] font-bold text-[var(--text-main)]">Exit Interview Notes</h4>
                                </div>
                                <textarea
                                    className="w-full h-32 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-4 text-[13px] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                                    placeholder="Add any notes from the exit interview..."
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3 shrink-0 bg-[var(--bg-workspace)]">
                            <button 
                                onClick={closeEditModal}
                                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {isWizardOpen && (
                <AddOffboardingWizard 
                    onClose={() => setIsWizardOpen(false)}
                    onSuccess={() => {
                        setIsWizardOpen(false);
                        loadRecords();
                    }}
                />
            )}
        </div>
    );
};

export default OffboardingPage;
