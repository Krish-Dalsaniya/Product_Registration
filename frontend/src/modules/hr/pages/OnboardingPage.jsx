import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Search, UserPlus, FileText, CheckCircle, Clock, Edit, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchOnboardingRecordsApi, updateOnboardingStatusApi, updateOnboardingChecklistApi } from '../../../api/hr';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/shared/DataTable';
import Modal from '../../../components/shared/Modal';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal state
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Editable checklists
    const [editDocs, setEditDocs] = useState([]);
    const [editAssets, setEditAssets] = useState([]);
    const [editTraining, setEditTraining] = useState([]);
    const [editStatus, setEditStatus] = useState('');

    // New item inputs
    const [newItemInputs, setNewItemInputs] = useState({ docs: '', assets: '', training: '' });

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

    const openEditModal = (record) => {
        setSelectedRecord(record);
        setEditDocs(record.document_checklist || []);
        setEditAssets(record.asset_checklist || []);
        setEditTraining(record.training_checklist || []);
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
                training_checklist: editTraining
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
        }
    };

    const handleAddItem = (type) => {
        const val = newItemInputs[type]?.trim();
        if (!val) return;

        if (type === 'docs') {
            setEditDocs([...editDocs, { name: val, checked: false }]);
        } else if (type === 'assets') {
            setEditAssets([...editAssets, { name: val, checked: false }]);
        } else if (type === 'training') {
            setEditTraining([...editTraining, { name: val, checked: false }]);
        }
        setNewItemInputs(prev => ({ ...prev, [type]: '' }));
    };

    const handleDeleteItem = (type, idx) => {
        if (type === 'docs') {
            setEditDocs(editDocs.filter((_, i) => i !== idx));
        } else if (type === 'assets') {
            setEditAssets(editAssets.filter((_, i) => i !== idx));
        } else if (type === 'training') {
            setEditTraining(editTraining.filter((_, i) => i !== idx));
        }
    };

    const calculateProgress = (record) => {
        if (record.status === 'Completed') return 100;
        
        const docs = record.document_checklist || [];
        const assets = record.asset_checklist || [];
        const training = record.training_checklist || [];
        
        const total = docs.length + assets.length + training.length;
        if (total === 0) return 0;

        const checked = 
            docs.filter(i => i.checked).length + 
            assets.filter(i => i.checked).length + 
            training.filter(i => i.checked).length;
            
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
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-sm shadow-inner">
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
            key: 'date',
            label: 'Start Date',
            render: (row) => (
                <span className="text-[13px] md:text-[14px] font-semibold text-[var(--text-main)]">
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
                
                return (
                    <div className="flex items-center gap-2">
                        <TaskIndicator label="Docs" status={docsStatus} />
                        <TaskIndicator label="Assets" status={assetsStatus} />
                        <TaskIndicator label="Training" status={trainingStatus} />
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
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border ${badgeClass}`}>
                        {row.status}
                    </span>
                );
            }
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
                    columns={columns}
                    data={filteredRecords}
                    onEdit={hasPermission('hr', 'edit', 'onboarding') ? openEditModal : null}
                    rowKey="id"
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
                                        <div key={idx} className="flex items-center justify-between group">
                                            <label className="flex items-center gap-3 cursor-pointer">
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
                                                className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove item"
                                            >
                                                &times;
                                            </button>
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
                                        <div key={idx} className="flex items-center justify-between group">
                                            <label className="flex items-center gap-3 cursor-pointer">
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
                                                className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove item"
                                            >
                                                &times;
                                            </button>
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
                                        <div key={idx} className="flex items-center justify-between group">
                                            <label className="flex items-center gap-3 cursor-pointer">
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
                                                className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove item"
                                            >
                                                &times;
                                            </button>
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
