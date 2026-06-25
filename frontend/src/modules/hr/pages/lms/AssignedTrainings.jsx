import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle, ExternalLink, Download, FileText } from 'lucide-react';
import DataTable from '../../../../components/shared/DataTable';
import Modal from '../../../../components/shared/Modal';
import { getAllAssignmentsApi, assignTrainingApi, updateAssignmentStatusApi, getAllModulesApi } from '../../../../api/lms';
import { fetchHREmployeesApi } from '../../../../api/hr';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const AssignedTrainings = () => {
    const { refreshStats } = useOutletContext();
    const [assignments, setAssignments] = useState([]);
    const [modules, setModules] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        employee_id: '',
        module_id: '',
        due_date: ''
    });

    useEffect(() => {
        fetchAssignments();
        fetchModules();
        fetchEmployees();
    }, []);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const { data } = await getAllAssignmentsApi();
            if (data.success) {
                setAssignments(data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    };

    const fetchModules = async () => {
        try {
            const { data } = await getAllModulesApi();
            if (data.success) {
                setModules(data.data.filter(m => m.status === 'Active'));
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await fetchHREmployeesApi();
            if (data.success) {
                setEmployees(data.data);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await assignTrainingApi(formData);
            toast.success('Training assigned successfully');
            setIsModalOpen(false);
            fetchAssignments();
            refreshStats();
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Failed to assign training');
        }
    };

    const handleMarkComplete = async (id) => {
        const result = await Swal.fire({
            title: 'Mark as Completed?',
            text: "Are you sure this training is complete?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Yes, Mark Complete!'
        });

        if (result.isConfirmed) {
            try {
                await updateAssignmentStatusApi(id, 'Completed');
                toast.success('Training marked as completed');
                fetchAssignments();
                refreshStats();
            } catch (error) {
                toast.error('Failed to update status');
            }
        }
    };

    const columns = [
        { key: 'employee_name', label: 'Employee', sortable: true },
        { key: 'emp_code', label: 'Emp Code', sortable: true },
        { key: 'module_title', label: 'Training Module', sortable: true },
        { 
            key: 'assigned_date', 
            label: 'Assigned Date', 
            sortable: true,
            render: (row) => new Date(row.assigned_date).toLocaleDateString()
        },
        { 
            key: 'due_date', 
            label: 'Due Date', 
            sortable: true,
            render: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString() : 'No Due Date'
        },
        { 
            key: 'status', 
            label: 'Status', 
            sortable: true,
            render: (row) => {
                const colors = {
                    'Assigned': 'bg-blue-500/10 text-blue-500',
                    'In Progress': 'bg-amber-500/10 text-amber-500',
                    'Completed': 'bg-emerald-500/10 text-emerald-500',
                    'Overdue': 'bg-rose-500/10 text-rose-500'
                };
                return (
                    <span className={`px-2 py-1 text-xs rounded-lg font-bold ${colors[row.status] || 'bg-gray-500/10 text-gray-500'}`}>
                        {row.status}
                    </span>
                );
            }
        },
        { 
            key: 'completed_at', 
            label: 'Completion Date', 
            sortable: true,
            render: (row) => row.completed_at ? new Date(row.completed_at).toLocaleDateString() : '-'
        },
        { 
            key: 'actions', 
            label: 'Actions', 
            render: (row) => (
                <div className="flex items-center gap-2">
                    {['YouTube Video', 'Udemy Course', 'Coursera Course', 'External Website'].includes(row.training_type) && row.training_url && (
                        <a href={row.training_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Open Training">
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                    {['PDF Document', 'Presentation'].includes(row.training_type) && row.attachment_url && (
                        <a href={row.attachment_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Download Document">
                            <Download className="w-4 h-4" />
                        </a>
                    )}
                    {row.status !== 'Completed' && (
                        <button 
                            onClick={() => handleMarkComplete(row.assignment_id)} 
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" 
                            title="Mark Complete"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[var(--text-main)]">Assigned Trainings</h2>
                <button
                    onClick={() => {
                        setFormData({ employee_id: '', module_id: '', due_date: '' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Assign Training
                </button>
            </div>

            <div className="flex-1 min-h-0">
                <DataTable
                    columns={columns}
                    data={assignments}
                    loading={loading}
                    searchable
                    searchKeys={['employee_name', 'emp_code', 'module_title', 'status']}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Assign Training"
                size="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Employee *</label>
                        <select
                            required
                            value={formData.employee_id}
                            onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                            className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                    {emp.emp_code} - {emp.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Training Module *</label>
                        <select
                            required
                            value={formData.module_id}
                            onChange={(e) => setFormData({...formData, module_id: e.target.value})}
                            className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                        >
                            <option value="">Select Module</option>
                            {modules.map(mod => (
                                <option key={mod.module_id} value={mod.module_id}>
                                    {mod.title} ({mod.training_type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Due Date</label>
                        <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                            className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                        />
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
                            Assign Training
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AssignedTrainings;
