import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle, ExternalLink, Download, FileText, TrendingUp, Play, LayoutGrid, List, Trash2, Briefcase } from 'lucide-react';
import DataTable from '../../../../components/shared/DataTable';
import Modal from '../../../../components/shared/Modal';
import ViewToggle from '../../../../components/shared/ViewToggle';
import { getAllAssignmentsApi, assignTrainingApi, updateAssignmentStatusApi, updateAssignmentProgressApi, getAllModulesApi, deleteAssignmentApi } from '../../../../api/lms';
import { fetchHREmployeesApi, fetchTraineesApi, assignTrainingToTraineeApi } from '../../../../api/hr';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const LMSThumbnail = ({ url, type, title }) => {
    const [error, setError] = React.useState(false);

    if (type === 'YouTube Video' && url && !error) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        if (match && match[7].length === 11) {
            const thumbUrl = `https://img.youtube.com/vi/${match[7]}/hqdefault.jpg`;
            return (
                <>
                    <img
                        src={thumbUrl}
                        alt={title}
                        onError={() => setError(true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent"></div>
                </>
            );
        }
    }

    return (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/20 to-[var(--bg-workspace)] flex items-center justify-center">
            <FileText className="w-16 h-16 text-[var(--accent)]/40" />
        </div>
    );
};

const AssignedTrainings = () => {
    const { refreshStats } = useOutletContext();
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [modules, setModules] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [trainees, setTrainees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'list' or 'grid'

    const [formData, setFormData] = useState({
        assignee: '',
        module_id: '',
        due_date: ''
    });

    const [progressModal, setProgressModal] = useState({
        isOpen: false,
        assignment: null,
        progress: 0
    });

    useEffect(() => {
        fetchAssignments();
        fetchModules();
        fetchEmployees();
        fetchTrainees();

        // Live Tracking Polling: Silently refresh the table every 10 seconds
        const intervalId = setInterval(() => {
            fetchAssignments(true);
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchAssignments = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await getAllAssignmentsApi();
            if (data.success) {
                setAssignments(data.data);
            }
        } catch (error) {
            if (!silent) toast.error('Failed to fetch assignments');
        } finally {
            if (!silent) setLoading(false);
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

    const fetchTrainees = async () => {
        try {
            const { data } = await fetchTraineesApi();
            if (data.success) {
                setTrainees(data.data);
            }
        } catch (error) {
            console.error('Error fetching trainees:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const [type, id] = formData.assignee.split('_');
            if (type === 'trn') {
                await assignTrainingToTraineeApi(id, {
                    module_id: formData.module_id,
                    due_date: formData.due_date
                });
            } else {
                await assignTrainingApi({
                    employee_id: id,
                    module_id: formData.module_id,
                    due_date: formData.due_date
                });
            }
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
                await updateAssignmentProgressApi(id, 100);
                toast.success('Training marked as completed');
                fetchAssignments();
                refreshStats();
            } catch (error) {
                toast.error('Failed to update status');
            }
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Assignment?',
            text: "This will permanently remove the training assignment.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteAssignmentApi(id);
                toast.success('Assignment deleted successfully');
                fetchAssignments();
                refreshStats();
            } catch (error) {
                toast.error('Failed to delete assignment');
            }
        }
    };

    const handleUpdateProgress = async (e) => {
        e.preventDefault();
        try {
            await updateAssignmentProgressApi(progressModal.assignment.assignment_id, progressModal.progress);
            toast.success('Progress updated successfully');
            setProgressModal({ isOpen: false, assignment: null, progress: 0 });
            fetchAssignments();
            refreshStats();
        } catch (error) {
            toast.error('Failed to update progress');
        }
    };

    const columns = [
        { key: 'employee_name', label: 'Assignee', sortable: true },
        { key: 'emp_code', label: 'ID Code', sortable: true },
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
            align: 'center',
            render: (row) => {
                const colors = {
                    'Assigned': 'bg-blue-500/10 text-blue-500',
                    'In Progress': 'bg-amber-500/10 text-amber-500',
                    'Completed': 'bg-emerald-500/10 text-emerald-500',
                    'Overdue': 'bg-rose-500/10 text-rose-500'
                };
                return (
                    <div className="flex justify-center">
                        <span className={`px-2 py-1 text-xs rounded-lg font-bold ${colors[row.status] || 'bg-gray-500/10 text-gray-500'}`}>
                            {row.status}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'progress_percentage',
            label: 'Progress',
            sortable: true,
            render: (row) => (
                <div className="w-[120px] flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${row.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${row.progress_percentage || 0}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-bold text-[var(--text-muted)] w-8 text-right">{row.progress_percentage || 0}%</span>
                </div>
            )
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
            align: 'right',
            render: (row) => {
                const canPlayInApp = row.training_type === 'YouTube Video' || row.training_type === 'PDF Document';
                return (
                    <div className="flex items-center justify-end gap-2">
                        {canPlayInApp ? (
                            <button
                                onClick={() => navigate(`/hr/lms/assignments/${row.assignment_id}/play`, { state: { assignment: row } })}
                                className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Play Training"
                            >
                                <Play className="w-4 h-4" />
                            </button>
                        ) : (
                            <>
                                {row.training_url && (
                                    <a href={row.training_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Open Training">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                                {row.attachment_url && (
                                    <a href={row.attachment_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Download Document">
                                        <Download className="w-4 h-4" />
                                    </a>
                                )}
                            </>
                        )}
                        {row.status !== 'Completed' && hasPermission('hr', 'edit', 'lms') && (
                            <>
                                <button
                                    onClick={() => setProgressModal({ isOpen: true, assignment: row, progress: row.progress_percentage || 0 })}
                                    className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                    title="Update Progress"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleMarkComplete(row.assignment_id)}
                                    className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                    title="Mark Complete"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        {hasPermission('hr', 'delete', 'lms') && (
                            <button
                                onClick={() => handleDelete(row.assignment_id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete Assignment"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];



    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4">
                <div className="flex items-center gap-5">
                    <div className="p-3 md:p-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl shadow-lg group animate-float">
                        <Briefcase size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none drop-shadow-sm">Assigned Trainings</h1>
                        <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">Track training assignments and completion status</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ViewToggle viewMode={viewMode} setViewMode={setViewMode} listMode="list" />
                    {hasPermission('hr', 'create', 'lms') && (
                        <button
                            onClick={() => {
                                setFormData({ assignee: '', module_id: '', due_date: '' });
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white hover:bg-opacity-90 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                        >
                            <Plus className="w-4 h-4" />
                            Assign Training
                        </button>
                    )}
                </div>
            </div>

            <div className={`flex-1 min-h-0 ${viewMode === 'grid' ? 'overflow-y-auto custom-scrollbar pr-2' : ''}`}>
                {viewMode === 'list' ? (
                    <DataTable
                        columns={columns}
                        data={assignments}
                        loading={loading}
                        searchable
                        searchKeys={['employee_name', 'emp_code', 'module_title', 'status']}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-6">
                        {assignments.map((assignment, index) => {
                            const canPlayInApp = assignment.training_type === 'YouTube Video' || assignment.training_type === 'PDF Document' || assignment.training_type === 'NAS / Local Video (MP4)' || assignment.training_type === 'NAS Video Playlist (JSON)';
                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={assignment.assignment_id}
                                    className="bg-white/40 backdrop-blur-xl rounded-[20px] shadow-lg overflow-hidden flex flex-col hover:shadow-xl hover:shadow-[var(--accent)]/10 transition-all duration-300 group border border-white/50 hover:border-[var(--accent)]/30 hover:-translate-y-1"
                                >
                                    {/* Thumbnail Area */}
                                    <div className="h-44 w-full relative bg-white/50 overflow-hidden flex items-center justify-center">
                                        <LMSThumbnail url={assignment.training_url} type={assignment.training_type} title={assignment.module_title} />
                                        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                                            <span className={`px-3 py-1 text-[11px] uppercase tracking-widest font-black rounded-full shadow-lg backdrop-blur-md ${assignment.status === 'Completed' ? 'bg-emerald-500/90 text-white' :
                                                    assignment.status === 'In Progress' ? 'bg-amber-500/90 text-white' :
                                                        assignment.status === 'Overdue' ? 'bg-rose-500/90 text-white' :
                                                            'bg-blue-500/90 text-white'
                                                }`}>
                                                {assignment.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar (Attached precisely below image) */}
                                    <div className="w-full h-1.5 bg-black/5 relative">
                                        <div
                                            className={`absolute left-0 top-0 bottom-0 ${assignment.progress_percentage === 100 ? 'bg-emerald-400' : 'bg-amber-400'} shadow-sm`}
                                            style={{ width: `${assignment.progress_percentage || 0}%`, transition: 'width 0.5s ease-in-out' }}
                                        />
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-black text-[var(--text-main)] line-clamp-2 leading-tight tracking-tight drop-shadow-sm group-hover:text-[var(--accent)] transition-colors">{assignment.module_title}</h3>
                                        </div>
                                        <p className="text-sm font-bold text-[var(--text-muted)] mb-4">{assignment.employee_name} <span className="text-[var(--text-muted)] font-semibold opacity-70">({assignment.emp_code})</span></p>

                                        <div className="flex items-center justify-between text-[12px] font-bold text-[var(--text-muted)] mb-5">
                                            <span>Assigned: {new Date(assignment.assigned_date).toLocaleDateString()}</span>
                                            <span>Progress: <span className="text-[var(--text-main)]">{assignment.progress_percentage || 0}%</span></span>
                                        </div>

                                        <div className="mt-auto flex items-center justify-between pt-5 border-t border-[var(--border-color)]">
                                            <div className="flex gap-1.5">
                                                {canPlayInApp ? (
                                                    <button
                                                        onClick={() => navigate(`/hr/lms/assignments/${assignment.assignment_id}/play`, { state: { assignment } })}
                                                        className="px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)] hover:text-white rounded-xl transition-all duration-300 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <Play className="w-4 h-4" /> Play Course
                                                    </button>
                                                ) : (
                                                    <>
                                                        {assignment.training_url && (
                                                            <a href={assignment.training_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 rounded-xl transition-all shadow-md hover:-translate-y-0.5" title="Open Link">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        {assignment.attachment_url && (
                                                            <a href={assignment.attachment_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 rounded-xl transition-all shadow-md hover:-translate-y-0.5" title="Download Document">
                                                                <Download className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {assignment.status !== 'Completed' && hasPermission('hr', 'edit', 'lms') && (
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => setProgressModal({ isOpen: true, assignment, progress: assignment.progress_percentage || 0 })}
                                                        className="p-2 text-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-white rounded-xl transition-all duration-300 shadow-sm"
                                                        title="Update Progress"
                                                    >
                                                        <TrendingUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkComplete(assignment.assignment_id)}
                                                        className="p-2 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-xl transition-all duration-300 shadow-sm"
                                                        title="Mark Complete"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            {hasPermission('hr', 'delete', 'lms') && (
                                                <div className="flex gap-1.5 ml-auto">
                                                    <button
                                                        onClick={() => handleDelete(assignment.assignment_id)}
                                                        className="p-2 text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all duration-300 shadow-sm"
                                                        title="Delete Assignment"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {assignments.length === 0 && !loading && (
                            <div className="col-span-full py-12 text-center text-[var(--text-muted)] font-semibold">
                                No assigned trainings found.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Assign Training"
                size="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Assign To *</label>
                        <select
                            required
                            value={formData.assignee}
                            onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                            className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                        >
                            <option value="">Select Employee or Trainee</option>
                            <optgroup label="Employees">
                                {employees.map(emp => (
                                    <option key={`emp_${emp.employee_id}`} value={`emp_${emp.employee_id}`}>
                                        {emp.emp_code} - {emp.full_name}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Trainees">
                                {trainees.map(trn => (
                                    <option key={`trn_${trn.trainee_id}`} value={`trn_${trn.trainee_id}`}>
                                        {trn.trainee_code} - {trn.first_name} {trn.last_name}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Training Module *</label>
                        <select
                            required
                            value={formData.module_id}
                            onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
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
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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

            {/* Update Progress Modal */}
            <Modal
                isOpen={progressModal.isOpen}
                onClose={() => setProgressModal({ isOpen: false, assignment: null, progress: 0 })}
                title="Update Training Progress"
                size="md"
            >
                {progressModal.assignment && (
                    <form onSubmit={handleUpdateProgress} className="space-y-6">
                        <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                            <h4 className="font-bold text-[var(--text-main)] mb-1">{progressModal.assignment.module_title}</h4>
                            <p className="text-xs font-semibold text-[var(--text-muted)]">Assigned to: {progressModal.assignment.employee_name}</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase">Progress Percentage</label>
                                <span className="font-black text-2xl text-[var(--accent)]">{progressModal.progress}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={progressModal.progress}
                                onChange={(e) => setProgressModal({ ...progressModal, progress: parseInt(e.target.value) })}
                                className="w-full h-2 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] mt-2">
                                <span>0% (Just Started)</span>
                                <span>100% (Completed)</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                            <button
                                type="button"
                                onClick={() => setProgressModal({ isOpen: false, assignment: null, progress: 0 })}
                                className="px-6 py-2.5 rounded-xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20"
                            >
                                Save Progress
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default AssignedTrainings;
