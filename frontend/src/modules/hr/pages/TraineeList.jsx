import React, { useEffect, useState } from 'react';
import { 
    fetchTraineesApi, fetchTraineeDashboardStatsApi, createTraineeApi, 
    updateTraineeApi, deleteTraineeApi, convertToEmployeeApi, assignLmsToTraineeApi 
} from '../../../api/trainee';
import { fetchHRMetadataApi, fetchHREmployeesApi } from '../../../api/hr';
import { getAllModulesApi } from '../../../api/lms';
import { Search, Plus, Loader2, Users, CheckCircle, GraduationCap, Building, Edit, Trash2, Eye, UserPlus, BookOpen, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import DataTable from '../../../components/shared/DataTable';
import Modal from '../../../components/shared/Modal';
import ViewToggle from '../../../components/shared/ViewToggle';
import ImageCropperModal from '../../../components/shared/ImageCropperModal';

const TraineeList = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [trainees, setTrainees] = useState([]);
    const [stats, setStats] = useState({ total_trainees: 0, active_trainees: 0, completed_training: 0, converted_to_employees: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    
    // Filters
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, departmentFilter, statusFilter]);

    // Metadata
    const [metadata, setMetadata] = useState({ departments: [], designations: [] });
    const [employees, setEmployees] = useState([]);
    const [lmsModules, setLmsModules] = useState([]);

    // Modals
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editingTrainee, setEditingTrainee] = useState(null);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [convertingTrainee, setConvertingTrainee] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningTrainee, setAssigningTrainee] = useState(null);

    // Forms
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', mobile: '', gender: '', date_of_birth: '',
        joining_date: '', expected_completion_date: '', department_id: '', mentor_employee_id: '',
        training_batch: '', education: '', institute: '', specialization: '', status: 'Applied', remarks: '', image_url: ''
    });

    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [rawImageSrc, setRawImageSrc] = useState(null);
    const [croppedImageUrl, setCroppedImageUrl] = useState(null);

    const [convertData, setConvertData] = useState({ emp_code: '', base_salary: 0, designation_id: '' });
    const [assignData, setAssignData] = useState({ module_id: '', due_date: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [traineesRes, statsRes, metaRes, empRes, lmsRes] = await Promise.all([
                fetchTraineesApi(),
                fetchTraineeDashboardStatsApi(),
                fetchHRMetadataApi(),
                fetchHREmployeesApi(),
                getAllModulesApi()
            ]);
            
            if (traineesRes.data?.success) setTrainees(traineesRes.data.data);
            if (statsRes.data?.success) setStats(statsRes.data.data);
            if (metaRes.data?.success) setMetadata(metaRes.data.data);
            if (empRes.data?.success) setEmployees(empRes.data.data);
            if (lmsRes.data?.success) setLmsModules(lmsRes.data.data);
        } catch (error) {
            toast.error('Failed to load trainee data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (trainee = null) => {
        if (trainee) {
            setEditingTrainee(trainee);
            setCroppedImageUrl(trainee.image_url || null);
            setFormData({
                first_name: trainee.first_name || '', last_name: trainee.last_name || '', email: trainee.email || '', 
                mobile: trainee.mobile || '', gender: trainee.gender || '', 
                date_of_birth: trainee.date_of_birth ? new Date(trainee.date_of_birth).toISOString().split('T')[0] : '',
                joining_date: trainee.joining_date ? new Date(trainee.joining_date).toISOString().split('T')[0] : '', 
                expected_completion_date: trainee.expected_completion_date ? new Date(trainee.expected_completion_date).toISOString().split('T')[0] : '', 
                department_id: trainee.department_id || '', mentor_employee_id: trainee.mentor_employee_id || '',
                training_batch: trainee.training_batch || '', education: trainee.education || '', 
                institute: trainee.institute || '', specialization: trainee.specialization || '', 
                status: trainee.status || 'Applied', remarks: trainee.remarks || '', image_url: trainee.image_url || ''
            });
        } else {
            setEditingTrainee(null);
            setCroppedImageUrl(null);
            setFormData({
                first_name: '', last_name: '', email: '', mobile: '', gender: '', date_of_birth: '',
                joining_date: '', expected_completion_date: '', department_id: '', mentor_employee_id: '',
                training_batch: '', education: '', institute: '', specialization: '', status: 'Applied', remarks: '', image_url: ''
            });
        }
        setIsAddEditModalOpen(true);
    };

    const handleAvatarSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                setRawImageSrc(reader.result);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleCropComplete = async (croppedFile) => {
        setIsCropperOpen(false);
        if (!croppedFile) {
            toast.error("Failed to crop image.");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = () => {
            setCroppedImageUrl(reader.result);
            setFormData(prev => ({...prev, image_url: reader.result}));
        };
        reader.readAsDataURL(croppedFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTrainee) {
                await updateTraineeApi(editingTrainee.trainee_id, formData);
                toast.success('Trainee updated successfully');
            } else {
                await createTraineeApi(formData);
                toast.success('Trainee created successfully');
            }
            setIsAddEditModalOpen(false);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Trainee?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        });
        if (result.isConfirmed) {
            try {
                await deleteTraineeApi(id);
                toast.success('Trainee deleted');
                loadData();
            } catch (error) {
                toast.error('Failed to delete trainee');
            }
        }
    };

    const handleConvert = async (e) => {
        e.preventDefault();
        try {
            await convertToEmployeeApi(convertingTrainee.trainee_id, convertData);
            toast.success('Trainee successfully converted to Employee!');
            setIsConvertModalOpen(false);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Conversion failed');
        }
    };

    const handleAssignTraining = async (e) => {
        e.preventDefault();
        try {
            await assignLmsToTraineeApi(assigningTrainee.trainee_id, assignData);
            toast.success('Training assigned successfully!');
            setIsAssignModalOpen(false);
            loadData();
        } catch (error) {
            toast.error('Failed to assign training');
        }
    };

    const filteredTrainees = trainees.filter(t => {
        const matchesSearch = `${t.first_name} ${t.last_name} ${t.trainee_code} ${t.email}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = departmentFilter ? String(t.department_id) === String(departmentFilter) : true;
        const matchesStatus = statusFilter ? t.status === statusFilter : true;
        return matchesSearch && matchesDept && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredTrainees.length / pageSize));
    const paginatedTrainees = filteredTrainees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns = [
        { key: 'trainee_code', label: 'Trainee ID', render: (row) => <span className="font-bold text-[var(--accent)]">{row.trainee_code}</span> },
        { key: 'name', label: 'Name', render: (row) => (
            <div>
                <div className="font-bold text-[var(--text-main)]">{row.first_name} {row.last_name}</div>
                <div className="text-xs text-[var(--text-muted)]">{row.email}</div>
            </div>
        )},
        { key: 'department_name', label: 'Department' },
        { key: 'mentor_name', label: 'Mentor', render: (row) => row.mentor_name || <span className="text-xs text-[var(--text-muted)] italic">Unassigned</span> },
        { key: 'training_batch', label: 'Batch' },
        { key: 'status', label: 'Status', render: (row) => {
            const colors = {
                'Applied': 'bg-gray-100 text-gray-700',
                'Selected': 'bg-blue-100 text-blue-700',
                'Joined': 'bg-indigo-100 text-indigo-700',
                'Under Training': 'bg-amber-100 text-amber-700',
                'Completed': 'bg-emerald-100 text-emerald-700',
                'Converted to Employee': 'bg-purple-100 text-purple-700',
                'Discontinued': 'bg-rose-100 text-rose-700'
            };
            return <span className={`px-2 py-1 rounded text-xs font-bold ${colors[row.status] || 'bg-gray-100 text-gray-700'}`}>{row.status}</span>;
        }},
        { key: 'actions', label: 'Actions', render: (row) => (
            <div className="flex items-center gap-1">
                <button onClick={() => navigate(`/hr/trainee/${row.trainee_id}`)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="View Profile">
                    <Eye size={16} />
                </button>
                {hasPermission('hr', 'edit', 'trainee') && (
                <button onClick={() => handleOpenModal(row)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Edit">
                    <Edit size={16} />
                </button>
                )}
                {hasPermission('hr', 'edit', 'trainee') && (
                <button onClick={() => { setAssigningTrainee(row); setAssignData({ module_id: '', due_date: '' }); setIsAssignModalOpen(true); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Assign LMS Training">
                    <BookOpen size={16} />
                </button>
                )}
                {hasPermission('hr', 'edit', 'trainee') && row.status !== 'Converted to Employee' && (
                    <button onClick={() => { setConvertingTrainee(row); setConvertData({ emp_code: '', base_salary: 0, designation_id: '' }); setIsConvertModalOpen(true); }} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg" title="Convert to Employee">
                        <UserPlus size={16} />
                    </button>
                )}
                {hasPermission('hr', 'delete', 'trainee') && (
                <button onClick={() => handleDelete(row.trainee_id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="Delete">
                    <Trash2 size={16} />
                </button>
                )}
            </div>
        )}
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4">
                <div className="flex items-center gap-5">
                    <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm">
                        <GraduationCap size={24} className="text-[var(--accent)]" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)]">Trainee Management</h1>
                </div>
                {hasPermission('hr', 'create', 'trainee') && (
                <button onClick={() => navigate('/hr/trainee/new')} className="btn-primary flex items-center gap-2 px-6">
                    <Plus size={18} /> Add Trainee
                </button>
                )}
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Trainees', value: stats.total_trainees || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Active Trainees', value: stats.active_trainees || 0, icon: GraduationCap, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Completed Training', value: stats.completed_training || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Converted to Employees', value: stats.converted_to_employees || 0, icon: Building, color: 'text-purple-500', bg: 'bg-purple-50' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                            <stat.icon size={24} className={stat.color} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-[var(--text-main)]">{stat.value}</h3>
                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="workspace-card p-4 flex flex-col md:flex-row gap-4 items-center bg-[var(--bg-card)] border border-[var(--border-color)] mb-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search trainees..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                </div>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-full md:w-auto px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--accent)]">
                    <option value="">All Departments</option>
                    {metadata.departments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-auto px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--accent)]">
                    <option value="">All Statuses</option>
                    {['Applied', 'Selected', 'Joined', 'Under Training', 'Completed', 'Converted to Employee', 'Discontinued'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
                </div>
            ) : viewMode === 'table' ? (
                <DataTable striped={true} columns={columns} data={paginatedTrainees} loading={isLoading} totalCount={trainees.length} filteredCount={filteredTrainees.length} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            ) : (
                <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 mb-6">
                    {paginatedTrainees.length > 0 ? paginatedTrainees.map((trainee, index) => {
                        const defaultAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainee.first_name + ' ' + trainee.last_name)}&backgroundColor=3d6a7d,0f172a&textColor=ffffff`;
                        const avatarUrl = trainee.image_url || defaultAvatarUrl;
                        
                        return (
                        <div 
                            key={trainee.trainee_id} 
                            className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl animate-entrance-up"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div onClick={() => navigate(`/hr/trainee/${trainee.trainee_id}`)} className="relative py-6 w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] flex flex-col items-center justify-center cursor-pointer group/img">
                                <div className="w-24 h-24 rounded-full border-4 border-[var(--bg-card)] shadow-md overflow-hidden group-hover/img:scale-110 transition-transform duration-500">
                                    <img 
                                        src={avatarUrl} 
                                        alt={`${trainee.first_name} ${trainee.last_name}`} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); navigate(`/hr/trainee/${trainee.trainee_id}`); }} 
                                        className="w-12 h-12 bg-[var(--accent)] rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0" 
                                        title="View Profile"
                                    >
                                        <Eye size={22} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-[15px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300 text-center truncate">
                                        {trainee.first_name} {trainee.last_name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                                        <GraduationCap size={12} className="shrink-0" />
                                        <span className="truncate">{trainee.trainee_code}</span>
                                    </div>
                                    {trainee.department_name && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                                            <Building size={12} className="shrink-0" />
                                            <span className="truncate">{trainee.department_name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-center mt-2">
                                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                            {trainee.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]">
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setAssigningTrainee(trainee); setAssignData({ module_id: '', due_date: '' }); setIsAssignModalOpen(true); }} 
                                            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all" 
                                            title="Assign LMS Training"
                                        >
                                            <BookOpen size={14} />
                                        </button>
                                        {trainee.status !== 'Converted to Employee' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setConvertingTrainee(trainee); setConvertData({ emp_code: '', base_salary: 0, designation_id: '' }); setIsConvertModalOpen(true); }} 
                                                className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-all" 
                                                title="Convert to Employee"
                                            >
                                                <UserPlus size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(trainee); }} 
                                            className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg transition-all" 
                                            title="Edit Trainee"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(trainee.trainee_id); }} 
                                            className="p-2 text-rose-500/40 hover:text-rose-500 rounded-lg transition-all" 
                                            title="Delete Trainee"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    }) : (
                        <div className="col-span-full py-16 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl border-dashed">
                            <Users size={48} className="mx-auto text-[var(--border-color)] mb-4" />
                            <h3 className="text-lg font-bold text-[var(--text-main)]">No trainees found</h3>
                            <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Adjust your filters or add a trainee.</p>
                        </div>
                    )}
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mb-6">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--nav-hover)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-[12px] font-bold text-[var(--text-muted)]">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--nav-hover)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={isAddEditModalOpen} onClose={() => setIsAddEditModalOpen(false)} title={editingTrainee ? "Edit Trainee" : "Add Trainee"} size="4xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <h4 className="font-bold text-[var(--accent)] border-b pb-2 mb-4">Profile Image</h4>
                            <div className="flex items-start gap-6 mb-2">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                                        {croppedImageUrl ? (
                                            <img src={croppedImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera size={24} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                                        )}
                                    </div>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarSelect} />
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <p className="text-[13px] font-bold text-[var(--text-main)]">Profile Image</p>
                                    <p className="text-[11px] text-[var(--text-muted)] mt-1">Upload a clear photo. Best 1:1 ratio. Max 5MB.</p>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2"><h4 className="font-bold text-[var(--accent)] border-b pb-2 mt-4">Personal Information</h4></div>
                        <div><label className="block text-xs font-bold mb-1">First Name *</label><input required type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div><label className="block text-xs font-bold mb-1">Last Name *</label><input required type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div><label className="block text-xs font-bold mb-1">Email *</label><input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div><label className="block text-xs font-bold mb-1">Mobile</label><input type="text" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Gender</label>
                            <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]">
                                <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                            </select>
                        </div>
                        <div><label className="block text-xs font-bold mb-1">Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>

                        <div className="md:col-span-2 mt-4"><h4 className="font-bold text-[var(--accent)] border-b pb-2">Training Information</h4></div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Department</label>
                            <select value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]">
                                <option value="">Select Department</option>
                                {metadata.departments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Mentor</label>
                            <select value={formData.mentor_employee_id} onChange={(e) => setFormData({...formData, mentor_employee_id: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]">
                                <option value="">Select Mentor</option>
                                {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name} ({e.emp_code})</option>)}
                            </select>
                        </div>
                        <div><label className="block text-xs font-bold mb-1">Joining Date</label><input type="date" value={formData.joining_date} onChange={(e) => setFormData({...formData, joining_date: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div><label className="block text-xs font-bold mb-1">Expected Completion</label><input type="date" value={formData.expected_completion_date} onChange={(e) => setFormData({...formData, expected_completion_date: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div><label className="block text-xs font-bold mb-1">Training Batch</label><input type="text" value={formData.training_batch} onChange={(e) => setFormData({...formData, training_batch: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" placeholder="e.g. 2026-A" /></div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Status</label>
                            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]">
                                {['Applied', 'Selected', 'Joined', 'Under Training', 'Completed', 'Discontinued'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-2 mt-4"><h4 className="font-bold text-[var(--accent)] border-b pb-2">Education & Remarks</h4></div>
                        <div><label className="block text-xs font-bold mb-1">Qualification</label><input type="text" value={formData.education} onChange={(e) => setFormData({...formData, education: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div><label className="block text-xs font-bold mb-1">Institute</label><input type="text" value={formData.institute} onChange={(e) => setFormData({...formData, institute: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div><label className="block text-xs font-bold mb-1">Specialization</label><input type="text" value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                        <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Remarks</label><textarea value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)] resize-none" /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsAddEditModalOpen(false)} className="px-5 py-2 font-bold text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] rounded-xl transition">Cancel</button>
                        <button type="submit" className="btn-primary px-6">{editingTrainee ? 'Save Changes' : 'Create Trainee'}</button>
                    </div>
                </form>
            </Modal>

            {/* Convert Modal */}
            <Modal isOpen={isConvertModalOpen} onClose={() => setIsConvertModalOpen(false)} title="Convert to Employee" size="xl">
                <form onSubmit={handleConvert} className="space-y-4">
                    <p className="text-sm text-[var(--text-muted)] font-medium mb-4">You are about to convert <span className="font-bold text-[var(--text-main)]">{convertingTrainee?.first_name} {convertingTrainee?.last_name}</span> into a full-time employee.</p>
                    <div><label className="block text-xs font-bold mb-1">Employee Code (Leave empty to auto-generate)</label><input type="text" value={convertData.emp_code} onChange={(e) => setConvertData({...convertData, emp_code: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                    <div><label className="block text-xs font-bold mb-1">Base Salary</label><input type="number" required value={convertData.base_salary} onChange={(e) => setConvertData({...convertData, base_salary: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Designation</label>
                        <select required value={convertData.designation_id} onChange={(e) => setConvertData({...convertData, designation_id: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]">
                            <option value="">Select Designation</option>
                            {metadata.designations.filter(d => d.department_id === convertingTrainee?.department_id).map(d => <option key={d.designation_id} value={d.designation_id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                        <button type="button" onClick={() => setIsConvertModalOpen(false)} className="px-5 py-2 font-bold text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] rounded-xl transition">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-md">Convert</button>
                    </div>
                </form>
            </Modal>

            {/* Assign LMS Modal */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign LMS Training" size="lg">
                <form onSubmit={handleAssignTraining} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold mb-1">Select Training Module *</label>
                        <select required value={assignData.module_id} onChange={(e) => setAssignData({...assignData, module_id: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]">
                            <option value="">Choose Module...</option>
                            {lmsModules.map(m => <option key={m.module_id} value={m.module_id}>{m.title} ({m.training_type})</option>)}
                        </select>
                    </div>
                    <div><label className="block text-xs font-bold mb-1">Due Date</label><input type="date" value={assignData.due_date} onChange={(e) => setAssignData({...assignData, due_date: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-[var(--bg-workspace)]" /></div>
                    <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                        <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-5 py-2 font-bold text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] rounded-xl transition">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md">Assign Training</button>
                    </div>
                </form>
            </Modal>

            <ImageCropperModal
                isOpen={isCropperOpen}
                onClose={() => { setIsCropperOpen(false); setRawImageSrc(null); }}
                imageSrc={rawImageSrc}
                onCropComplete={handleCropComplete}
            />
        </div>
    );
};

export default TraineeList;
