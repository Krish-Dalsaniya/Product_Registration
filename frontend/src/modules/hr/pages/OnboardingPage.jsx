import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Search, UserPlus, FileText, CheckCircle, Clock, Edit, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchOnboardingRecordsApi, updateOnboardingStatusApi, updateOnboardingChecklistApi, fetchCandidatesApi } from '../../../api/hr';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/shared/DataTable';
import Modal from '../../../components/shared/Modal';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [records, setRecords] = useState([]);
    const [pendingCandidates, setPendingCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('ongoing');
    
    // Modal state
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Editable checklists
    const [editDocs, setEditDocs] = useState([]);
    const [editAssets, setEditAssets] = useState([]);
    const [editTraining, setEditTraining] = useState([]);
    const [editRcd, setEditRcd] = useState([]);
    const [editStatus, setEditStatus] = useState('');

    // New item inputs
    const [newItemInputs, setNewItemInputs] = useState({ docs: '', assets: '', training: '', rcd: '' });

    const loadRecords = async () => {
        try {
            setIsLoading(true);
            const [onboardingRes, candidatesRes] = await Promise.all([
                fetchOnboardingRecordsApi(),
                fetchCandidatesApi()
            ]);
            
            if (onboardingRes.data?.success) {
                setRecords(onboardingRes.data.data);
            }
            if (candidatesRes.data?.success) {
                const accepted = candidatesRes.data.data.filter(c => c.status === 'Accepted');
                setPendingCandidates(accepted);
            }
        } catch (error) {
            toast.error('Failed to load records');
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
        setEditDocs(record.document_checklist || []);
        setEditAssets(record.asset_checklist || []);
        setEditTraining(record.training_checklist || []);
        setEditRcd(record.rcd_checklist || []);
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
            await updateOnboardingChecklistApi(selectedRecord.id, {
                document_checklist: editDocs,
                asset_checklist: editAssets,
                training_checklist: editTraining,
                rcd_checklist: editRcd
            });

            // Update status if changed
            if (editStatus !== selectedRecord.status) {
                await updateOnboardingStatusApi(selectedRecord.id, editStatus);
            }
            
            toast.success('Onboarding checklist updated!');
            closeEditModal();
            loadRecords();
        } catch (error) {
            toast.error('Failed to update onboarding');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleChecklist = (listName, idx) => {
        if (listName === 'docs') {
            const newList = [...editDocs];
            newList[idx].checked = !newList[idx].checked;
            setEditDocs(newList);
        } else if (listName === 'assets') {
            const newList = [...editAssets];
            newList[idx].checked = !newList[idx].checked;
            setEditAssets(newList);
        } else if (listName === 'training') {
            const newList = [...editTraining];
            newList[idx].checked = !newList[idx].checked;
            setEditTraining(newList);
        } else if (listName === 'rcd') {
            const newList = [...editRcd];
            newList[idx].checked = !newList[idx].checked;
            setEditRcd(newList);
        }
    };

    const handleRemarksChange = (listName, idx, val) => {
        if (listName === 'docs') {
            const newList = [...editDocs];
            newList[idx].remarks = val;
            setEditDocs(newList);
        } else if (listName === 'assets') {
            const newList = [...editAssets];
            newList[idx].remarks = val;
            setEditAssets(newList);
        } else if (listName === 'training') {
            const newList = [...editTraining];
            newList[idx].remarks = val;
            setEditTraining(newList);
        } else if (listName === 'rcd') {
            const newList = [...editRcd];
            newList[idx].remarks = val;
            setEditRcd(newList);
        }
    };

    const handleAddItem = (listName) => {
        if (listName === 'docs' && newItemInputs.docs.trim()) {
            setEditDocs([...editDocs, { name: newItemInputs.docs.trim(), checked: false, remarks: '' }]);
            setNewItemInputs(prev => ({ ...prev, docs: '' }));
        } else if (listName === 'assets' && newItemInputs.assets.trim()) {
            setEditAssets([...editAssets, { name: newItemInputs.assets.trim(), checked: false, remarks: '' }]);
            setNewItemInputs(prev => ({ ...prev, assets: '' }));
        } else if (listName === 'training' && newItemInputs.training.trim()) {
            setEditTraining([...editTraining, { name: newItemInputs.training.trim(), checked: false, remarks: '' }]);
            setNewItemInputs(prev => ({ ...prev, training: '' }));
        } else if (listName === 'rcd' && newItemInputs.rcd.trim()) {
            setEditRcd([...editRcd, { name: newItemInputs.rcd.trim(), checked: false, remarks: '' }]);
            setNewItemInputs(prev => ({ ...prev, rcd: '' }));
        }
    };

    const handleDeleteItem = (listName, idx) => {
        if (listName === 'docs') {
            setEditDocs(editDocs.filter((_, i) => i !== idx));
        } else if (listName === 'assets') {
            setEditAssets(editAssets.filter((_, i) => i !== idx));
        } else if (listName === 'training') {
            setEditTraining(editTraining.filter((_, i) => i !== idx));
        } else if (listName === 'rcd') {
            setEditRcd(editRcd.filter((_, i) => i !== idx));
        }
    };

    const calculateProgress = (record) => {
        if (record.status === 'Completed') return 100;
        
        const docs = record.document_checklist || [];
        const assets = record.asset_checklist || [];
        const training = record.training_checklist || [];
        const rcd = record.rcd_checklist || [];
        
        const total = docs.length + assets.length + training.length + rcd.length;
        if (total === 0) return 0;

        const checked = 
            docs.filter(i => i.checked).length + 
            assets.filter(i => i.checked).length + 
            training.filter(i => i.checked).length +
            rcd.filter(i => i.checked).length;
            
        return Math.round((checked / total) * 100);
    };

    const getTaskCategoryStatus = (checklist) => {
        if (!checklist || checklist.length === 0) return 'NA';
        const checkedCount = checklist.filter(i => i.checked).length;
        if (checkedCount === 0) return 'PENDING';
        if (checkedCount === checklist.length) return 'COMPLETED';
        return 'PARTIAL';
    };

    const TaskIndicator = ({ label, status }) => {
        let colorClass = 'text-[var(--text-muted)]';
        let bgClass = 'bg-transparent border-transparent';
        
        if (status === 'COMPLETED') {
            colorClass = 'text-emerald-600';
            bgClass = 'bg-emerald-50 border-emerald-200';
        } else if (status === 'PARTIAL') {
            colorClass = 'text-amber-600';
            bgClass = 'bg-amber-50 border-amber-200';
        } else if (status === 'PENDING') {
            colorClass = 'text-rose-600';
            bgClass = 'bg-rose-50 border-rose-200';
        }

        return (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${bgClass} ${status === 'NA' ? 'opacity-50' : ''}`} title={`${label}: ${status}`}>
                {status === 'COMPLETED' && <CheckCircle size={14} className={colorClass} />}
                {status === 'PARTIAL' && <Clock size={14} className={colorClass} />}
                {status === 'PENDING' && <div className={`w-3 h-3 rounded-full border-2 border-rose-400`} />}
                {status === 'NA' && <div className="w-3 h-[2px] bg-[var(--text-muted)] rounded-full" />}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>{label}</span>
            </div>
        );
    };

    const isRecentHire = (dateStr) => {
        if (!dateStr) return true;
        const diffDays = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
        return diffDays <= 60; // Hired within the last 60 days or in the future
    };

    const filteredRecords = activeTab === 'ongoing'
        ? records.filter(r => 
            (r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.emp_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
            r.status !== 'Completed' &&
            (r.type !== 'Employee' || isRecentHire(r.offer_acceptance_date))
          )
        : pendingCandidates.filter(c => 
            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.email?.toLowerCase().includes(searchTerm.toLowerCase())
          );

    const columns = [
        {
            key: 'employee',
            label: 'Employee',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-xs shadow-sm">
                        {row.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-[12px] font-bold text-[var(--text-main)]">{row.full_name}</h4>
                            {row.type === 'Trainee' && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest">Trainee</span>}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5">{row.emp_code || 'No Code'}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'date',
            label: 'Start Date',
            render: (row) => (
                <span className="text-[12px] font-semibold text-[var(--text-main)]">
                    {row.offer_acceptance_date ? new Date(row.offer_acceptance_date).toLocaleDateString() : '-'}
                </span>
            )
        },
        {
            key: 'tasks',
            label: 'Task Breakdown',
            render: (row) => {
                const docsStatus = getTaskCategoryStatus(row.document_checklist);
                const assetsStatus = getTaskCategoryStatus(row.asset_checklist);
                const trainingStatus = getTaskCategoryStatus(row.training_checklist);
                const rcdStatus = getTaskCategoryStatus(row.rcd_checklist);
                
                return (
                    <div className="flex items-center gap-2">
                        <TaskIndicator label="Docs" status={docsStatus} />
                        <TaskIndicator label="Assets" status={assetsStatus} />
                        <TaskIndicator label="Training" status={trainingStatus} />
                        <TaskIndicator label="RCD" status={rcdStatus} />
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => {
                let badgeClass = 'bg-amber-50 text-amber-600 border-amber-200';
                if (row.status === 'In Progress') badgeClass = 'bg-blue-50 text-blue-600 border-blue-200';
                if (row.status === 'Completed') badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                return (
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${badgeClass}`}>
                        {row.status}
                    </span>
                );
            }
        }
    ];

    const pendingColumns = [
        {
            key: 'candidate',
            label: 'Candidate',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-xs shadow-sm">
                        {row.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h4 className="text-[12px] font-bold text-[var(--text-main)]">{row.name}</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5">{row.email}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            label: 'Applied Role',
            render: (row) => (
                <span className="text-[12px] font-semibold text-[var(--text-main)]">
                    {row.applied_for || 'N/A'}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Convert To',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/hr/employees/new?candidateId=${row.id}`);
                        }}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors shadow-sm border border-blue-200"
                    >
                        Employee
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/hr/trainee/new?candidateId=${row.id}`);
                        }}
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors shadow-sm border border-emerald-200"
                    >
                        Trainee
                    </button>
                </div>
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-4 relative z-30">
                <div className="flex items-center gap-5">
                    <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
                        <UserPlus size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mr-2">Onboarding</h1>
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

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-[var(--border-color)] mb-6 px-2">
                <button
                    onClick={() => setActiveTab('ongoing')}
                    className={`pb-3 text-[13px] font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'ongoing' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    Ongoing Onboarding
                    {activeTab === 'ongoing' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-3 text-[13px] font-bold uppercase tracking-widest transition-colors relative flex items-center gap-2 ${activeTab === 'pending' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    Pending Conversions
                    {pendingCandidates.length > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                            {pendingCandidates.length}
                        </span>
                    )}
                    {activeTab === 'pending' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                        <UserPlus size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{records.length}</h3>
                        <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Total Pipelines</p>
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
                    columns={activeTab === 'ongoing' ? columns : pendingColumns}
                    data={filteredRecords}
                    onEdit={activeTab === 'ongoing' && hasPermission('hr', 'edit', 'onboarding') ? openEditModal : null}
                    rowKey="id"
                    striped={true}
                />
            </div>

            {/* Checklist Editor Modal */}
            <Modal
                isOpen={!!selectedRecord}
                onClose={closeEditModal}
                title="Onboarding Checklist"
                maxWidth="max-w-xl"
            >
                {selectedRecord && (
                    <div className="flex flex-col h-[70vh]">
                        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-workspace)]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-lg">
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
                            
                            {/* Documents */}
                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText size={18} className="text-blue-500" />
                                        <h4 className="text-[14px] font-bold text-[var(--text-main)]">Documents Collection</h4>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-3">
                                    {editDocs.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 group mb-3">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.checked} 
                                                        onChange={() => toggleChecklist('docs', idx)}
                                                        className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                                    />
                                                    <span className={`text-[13px] font-medium transition-colors ${item.checked ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)] hover:text-[var(--accent)]'}`}>
                                                        {item.name}
                                                    </span>
                                                </label>
                                                <button 
                                                    onClick={() => handleDeleteItem('docs', idx)}
                                                    className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                                    title="Remove item"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Add remarks..."
                                                className="w-[calc(100%-1.75rem)] ml-7 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)]"
                                                value={item.remarks || ''}
                                                onChange={(e) => handleRemarksChange('docs', idx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    {editDocs.length === 0 && (
                                        <p className="text-[12px] text-[var(--text-muted)] italic">No documents in checklist.</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add a document..." 
                                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-[var(--accent)]"
                                        value={newItemInputs.docs}
                                        onChange={(e) => setNewItemInputs(prev => ({ ...prev, docs: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem('docs')}
                                    />
                                    <button 
                                        onClick={() => handleAddItem('docs')}
                                        className="p-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:text-white transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Assets */}
                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-2">
                                    <div className="flex items-center gap-2">
                                        <Clock size={18} className="text-amber-500" />
                                        <h4 className="text-[14px] font-bold text-[var(--text-main)]">Asset Provisioning</h4>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-3">
                                    {editAssets.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 group mb-3">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.checked} 
                                                        onChange={() => toggleChecklist('assets', idx)}
                                                        className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                                    />
                                                    <span className={`text-[13px] font-medium transition-colors ${item.checked ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)] hover:text-[var(--accent)]'}`}>
                                                        {item.name}
                                                    </span>
                                                </label>
                                                <button 
                                                    onClick={() => handleDeleteItem('assets', idx)}
                                                    className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                                    title="Remove item"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Add remarks..."
                                                className="w-[calc(100%-1.75rem)] ml-7 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)]"
                                                value={item.remarks || ''}
                                                onChange={(e) => handleRemarksChange('assets', idx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    {editAssets.length === 0 && (
                                        <p className="text-[12px] text-[var(--text-muted)] italic">No assets in checklist.</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add an asset..." 
                                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-[var(--accent)]"
                                        value={newItemInputs.assets}
                                        onChange={(e) => setNewItemInputs(prev => ({ ...prev, assets: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem('assets')}
                                    />
                                    <button 
                                        onClick={() => handleAddItem('assets')}
                                        className="p-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:text-white transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Training */}
                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-2">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={18} className="text-emerald-500" />
                                        <h4 className="text-[14px] font-bold text-[var(--text-main)]">Required Training</h4>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-3">
                                    {editTraining.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 group mb-3">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.checked} 
                                                        onChange={() => toggleChecklist('training', idx)}
                                                        className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                                    />
                                                    <span className={`text-[13px] font-medium transition-colors ${item.checked ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)] hover:text-[var(--accent)]'}`}>
                                                        {item.name}
                                                    </span>
                                                </label>
                                                <button 
                                                    onClick={() => handleDeleteItem('training', idx)}
                                                    className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                                    title="Remove item"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Add remarks..."
                                                className="w-[calc(100%-1.75rem)] ml-7 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)]"
                                                value={item.remarks || ''}
                                                onChange={(e) => handleRemarksChange('training', idx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    {editTraining.length === 0 && (
                                        <p className="text-[12px] text-[var(--text-muted)] italic">No training in checklist.</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add training..." 
                                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-[var(--accent)]"
                                        value={newItemInputs.training}
                                        onChange={(e) => setNewItemInputs(prev => ({ ...prev, training: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem('training')}
                                    />
                                    <button 
                                        onClick={() => handleAddItem('training')}
                                        className="p-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:text-white transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Role Clarity Document (RCD) */}
                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText size={18} className="text-purple-500" />
                                        <h4 className="text-[14px] font-bold text-[var(--text-main)]">Role Clarity Document (RCD)</h4>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-3">
                                    {editRcd.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 group mb-3">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.checked} 
                                                        onChange={() => toggleChecklist('rcd', idx)}
                                                        className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                                    />
                                                    <span className={`text-[13px] font-medium transition-colors ${item.checked ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)] hover:text-[var(--accent)]'}`}>
                                                        {item.name}
                                                    </span>
                                                </label>
                                                <button 
                                                    onClick={() => handleDeleteItem('rcd', idx)}
                                                    className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                                    title="Remove item"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Add remarks..."
                                                className="w-[calc(100%-1.75rem)] ml-7 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)]"
                                                value={item.remarks || ''}
                                                onChange={(e) => handleRemarksChange('rcd', idx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    {editRcd.length === 0 && (
                                        <p className="text-[12px] text-[var(--text-muted)] italic">No RCD checklist items.</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add an RCD item..." 
                                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-[var(--accent)]"
                                        value={newItemInputs.rcd}
                                        onChange={(e) => setNewItemInputs(prev => ({ ...prev, rcd: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem('rcd')}
                                    />
                                    <button 
                                        onClick={() => handleAddItem('rcd')}
                                        className="p-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:text-white transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
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
        </div>
    );
};

export default OnboardingPage;
