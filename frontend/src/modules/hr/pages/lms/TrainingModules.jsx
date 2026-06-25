import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, ExternalLink, Download, Eye } from 'lucide-react';
import DataTable from '../../../../components/shared/DataTable';
import Modal from '../../../../components/shared/Modal';
import { getAllModulesApi, createModuleApi, updateModuleApi, deleteModuleApi } from '../../../../api/lms';
import { fetchHRMetadataApi } from '../../../../api/hr';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const TrainingModules = () => {
    const { refreshStats } = useOutletContext();
    const [modules, setModules] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [viewingModule, setViewingModule] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        department_id: '',
        training_type: 'Internal Training',
        difficulty_level: 'Beginner',
        duration_hours: '',
        training_url: '',
        attachment_url: '',
        status: 'Active'
    });

    useEffect(() => {
        fetchModules();
        fetchDepartments();
    }, []);

    const fetchModules = async () => {
        setLoading(true);
        try {
            const { data } = await getAllModulesApi();
            if (data.success) {
                setModules(data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch modules');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data } = await fetchHRMetadataApi();
            if (data.success && data.data?.departments) {
                setDepartments(data.data.departments);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const handleOpenModal = (module = null) => {
        if (module) {
            setEditingModule(module);
            setFormData({
                title: module.title || '',
                description: module.description || '',
                category: module.category || '',
                department_id: module.department_id || '',
                training_type: module.training_type || 'Internal Training',
                difficulty_level: module.difficulty_level || 'Beginner',
                duration_hours: module.duration_hours || '',
                training_url: module.training_url || '',
                attachment_url: module.attachment_url || '',
                status: module.status || 'Active'
            });
        } else {
            setEditingModule(null);
            setFormData({
                title: '',
                description: '',
                category: '',
                department_id: '',
                training_type: 'Internal Training',
                difficulty_level: 'Beginner',
                duration_hours: '',
                training_url: '',
                attachment_url: '',
                status: 'Active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingModule) {
                await updateModuleApi(editingModule.module_id, formData);
                toast.success('Module updated successfully');
            } else {
                await createModuleApi(formData);
                toast.success('Module created successfully');
            }
            setIsModalOpen(false);
            fetchModules();
            refreshStats();
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Module?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteModuleApi(id);
                toast.success('Module deleted successfully');
                fetchModules();
                refreshStats();
            } catch (error) {
                toast.error('Failed to delete module');
            }
        }
    };

    const columns = [
        { key: 'title', label: 'Title', sortable: true },
        { key: 'category', label: 'Category', sortable: true },
        { key: 'department_name', label: 'Department', sortable: true },
        { 
            key: 'training_type', 
            label: 'Type', 
            sortable: true,
            render: (row) => (
                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs rounded-lg font-bold">
                    {row.training_type}
                </span>
            )
        },
        { key: 'difficulty_level', label: 'Difficulty', sortable: true },
        { key: 'duration_hours', label: 'Duration (Hrs)', sortable: true },
        { 
            key: 'status', 
            label: 'Status', 
            sortable: true,
            render: (row) => (
                <span className={`px-2 py-1 text-xs rounded-lg font-bold ${
                    row.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                    {row.status}
                </span>
            )
        },
        { 
            key: 'actions', 
            label: 'Actions', 
            render: (row) => (
                <div className="flex items-center gap-2">
                    {['YouTube Video', 'Udemy Course', 'Coursera Course', 'External Website'].includes(row.training_type) && row.training_url && (
                        <a href={row.training_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Open Link">
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                    {row.training_type === 'PDF Document' && row.attachment_url && (
                        <a href={row.attachment_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Download Document">
                            <Download className="w-4 h-4" />
                        </a>
                    )}
                    <button onClick={() => setViewingModule(row)} className="p-1.5 text-[var(--text-dim)] hover:bg-[var(--nav-hover)] hover:text-[var(--accent)] rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenModal(row)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit Module">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(row.module_id)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[var(--text-main)]">Training Modules</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Create Module
                </button>
            </div>

            <div className="flex-1 min-h-0">
                <DataTable
                    columns={columns}
                    data={modules}
                    loading={loading}
                    searchable
                    searchKeys={['title', 'category', 'training_type']}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingModule ? "Edit Training Module" : "Create Training Module"}
                size="3xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Module Title *</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                                placeholder="Enter module title"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                                placeholder="e.g. Compliance, Technical"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Department</label>
                            <select
                                value={formData.department_id}
                                onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => (
                                    <option key={d.department_id} value={d.department_id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Training Type</label>
                            <select
                                value={formData.training_type}
                                onChange={(e) => setFormData({...formData, training_type: e.target.value})}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="YouTube Video">YouTube Video</option>
                                <option value="Udemy Course">Udemy Course</option>
                                <option value="Coursera Course">Coursera Course</option>
                                <option value="External Website">External Website</option>
                                <option value="PDF Document">PDF Document</option>
                                <option value="Presentation">Presentation</option>
                                <option value="Internal Training">Internal Training</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Difficulty Level</label>
                            <select
                                value={formData.difficulty_level}
                                onChange={(e) => setFormData({...formData, difficulty_level: e.target.value})}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Duration (Hours)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.duration_hours}
                                onChange={(e) => setFormData({...formData, duration_hours: e.target.value})}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                                placeholder="e.g. 2.5"
                            />
                        </div>
                        
                        {['YouTube Video', 'Udemy Course', 'Coursera Course', 'External Website'].includes(formData.training_type) && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Training URL</label>
                                <input
                                    type="url"
                                    value={formData.training_url}
                                    onChange={(e) => setFormData({...formData, training_url: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                                    placeholder="https://..."
                                />
                            </div>
                        )}

                        {['PDF Document', 'Presentation'].includes(formData.training_type) && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Attachment URL / Drive Link</label>
                                <input
                                    type="url"
                                    value={formData.attachment_url}
                                    onChange={(e) => setFormData({...formData, attachment_url: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                                    placeholder="Link to hosted PDF or Presentation"
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Description</label>
                            <textarea
                                rows="3"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] resize-none"
                                placeholder="Enter module description..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2.5 rounded-xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20"
                        >
                            {editingModule ? 'Save Changes' : 'Create Module'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Module Details Modal */}
            <Modal
                isOpen={!!viewingModule}
                onClose={() => setViewingModule(null)}
                title="Training Module Details"
                size="2xl"
            >
                {viewingModule && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-[var(--text-main)] mb-1">{viewingModule.title}</h3>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">{viewingModule.category || 'Uncategorized'} • {viewingModule.department_name || 'All Departments'}</p>
                            </div>
                            <span className={`px-3 py-1.5 text-xs rounded-lg font-bold ${
                                viewingModule.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                                {viewingModule.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Training Type</label>
                                <span className="font-semibold text-[var(--text-main)]">{viewingModule.training_type}</span>
                            </div>
                            <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Difficulty Level</label>
                                <span className="font-semibold text-[var(--text-main)]">{viewingModule.difficulty_level}</span>
                            </div>
                            <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Duration</label>
                                <span className="font-semibold text-[var(--text-main)]">{viewingModule.duration_hours ? `${viewingModule.duration_hours} Hours` : 'N/A'}</span>
                            </div>
                            <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Created By</label>
                                <span className="font-semibold text-[var(--text-main)]">{viewingModule.created_by_name || 'System Admin'}</span>
                            </div>
                        </div>

                        {viewingModule.description && (
                            <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">Description</label>
                                <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                    {viewingModule.description}
                                </div>
                            </div>
                        )}

                        {(viewingModule.training_url || viewingModule.attachment_url) && (
                            <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">Resource Links</label>
                                <div className="flex gap-3">
                                    {viewingModule.training_url && (
                                        <a href={viewingModule.training_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-blue-500 hover:bg-blue-500/10 transition-colors">
                                            <ExternalLink className="w-4 h-4" /> Open Training URL
                                        </a>
                                    )}
                                    {viewingModule.attachment_url && (
                                        <a href={viewingModule.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-indigo-500 hover:bg-indigo-500/10 transition-colors">
                                            <Download className="w-4 h-4" /> Download Attachment
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
                            <button
                                type="button"
                                onClick={() => setViewingModule(null)}
                                className="px-6 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-main)] hover:bg-[var(--nav-hover)] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TrainingModules;
