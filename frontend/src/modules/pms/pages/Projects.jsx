import React, { useState, useEffect } from 'react';
import { Plus, Clock, FileText, CheckCircle, Search, AlertCircle, Trash2, Edit2, Users, ChevronDown, X, Check, FolderGit2 } from 'lucide-react';
import { getProjects, createProject, updateProject, deleteProject, getProjectMetrics } from '../../../api/pms';

import { getTeams } from '../../../api/adminTeams';
import { getProducts } from '../../../api/products';
import { fetchHREmployeesApi } from '../../../api/hr';
import DataTable from '../../../components/shared/DataTable';
import Modal from '../../../components/shared/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

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

const Projects = () => {
  const { user, hasPermission } = useAuth();
  const [projects, setProjects] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: ''
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [projectsRes, metricsRes] = await Promise.all([
        getProjects(filters),
        getProjectMetrics()
      ]);
      if (projectsRes.data?.success) setProjects(projectsRes.data.data);
      if (metricsRes.data?.success) setMetrics(metricsRes.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load projects data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await deleteProject(row.project_id);
      if (res.data?.success) {
        toast.success('Project deleted successfully');
        loadData();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete project');
    }
  };

  const handleView = (row) => {
    setSelectedProject(row);
    setIsViewModalOpen(true);
  };

  const columns = [
    { label: 'Code', key: 'project_code' },
    { label: 'Name', key: 'project_name' },
    { label: 'Team', key: 'team_name' },
    { label: 'Team Lead', key: 'team_lead_name' },
    { label: 'Client Handler', key: 'client_handler_name' },
    { label: 'Product', key: 'product_name' },
    { label: 'Progress (%)', key: 'progress_percentage' },
    { 
      label: 'Priority', 
      key: 'priority',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
          row.priority === 'Critical' ? 'bg-red-50 text-red-600' :
          row.priority === 'High' ? 'bg-orange-50 text-orange-600' :
          row.priority === 'Medium' ? 'bg-blue-50 text-blue-600' :
          'bg-gray-50 text-gray-600'
        }`}>
          {row.priority}
        </span>
      )
    },
    { 
      label: 'Status', 
      key: 'status',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
          row.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
          row.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
          row.status === 'On Hold' ? 'bg-orange-50 text-orange-600 border-orange-200' :
          row.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
          'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
          {row.status}
        </span>
      )
    },
    { label: 'Start Date', key: 'start_date', render: (row) => row.start_date ? new Date(row.start_date).toLocaleDateString() : 'N/A' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pt-4">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <FolderGit2 size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              Project Management
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
              Central repository for PMS projects, resources, and progress tracking
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-[12px] font-bold shadow-sm hover:bg-[var(--nav-hover)] transition-colors">
            Export CSV
          </button>
          {hasPermission('hr', 'create', 'pms_projects') && (
          <button
            onClick={() => { setSelectedProject(null); setIsAddModalOpen(true); }}
            className="btn-primary shadow-lg px-6 py-2.5 group flex items-center gap-2 rounded-xl"
          >
            <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] font-black uppercase tracking-widest">Add Project</span>
          </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MiniStatCard 
          title="Total Projects" 
          count={metrics?.totalProjects || 0} 
          icon={FileText} 
          iconBg="bg-blue-50" 
          iconColor="text-blue-500" 
        />
        <MiniStatCard 
          title="Active Projects" 
          count={metrics?.activeProjects || 0} 
          icon={Clock} 
          iconBg="bg-purple-50" 
          iconColor="text-purple-500" 
        />
        <MiniStatCard 
          title="Completed" 
          count={metrics?.completedProjects || 0} 
          icon={CheckCircle} 
          iconBg="bg-emerald-50" 
          iconColor="text-emerald-500" 
        />
        <MiniStatCard 
          title="On Hold" 
          count={metrics?.onHoldProjects || 0} 
          icon={AlertCircle} 
          iconBg="bg-orange-50" 
          iconColor="text-orange-500" 
        />
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
          <input 
            type="text" 
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search by code or name..." 
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] focus:border-[var(--accent)] outline-none"
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <select 
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <select 
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable 
        columns={columns}
        data={projects}
        loading={isLoading}
        onView={handleView}
        onDelete={hasPermission('hr', 'delete', 'pms_projects') ? handleDelete : undefined}
        rowKey="project_id"
        totalCount={projects.length}
      />

      <AddEditProjectModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={loadData}
        initialData={selectedProject}
      />

      {isViewModalOpen && selectedProject && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Project Details"
          maxWidth="max-w-3xl"
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-6 border-b border-[var(--border-color)] pb-4">
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{selectedProject.project_code}</p>
                <h2 className="text-2xl font-black text-[var(--text-main)] mt-1">{selectedProject.project_name}</h2>
              </div>
              <div className="flex gap-2">
                {hasPermission('hr', 'edit', 'pms_projects') && (
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsAddModalOpen(true);
                  }}
                  className="p-2 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-workspace)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Status</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedProject.status}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Priority</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedProject.priority}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Start Date</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedProject.start_date ? new Date(selectedProject.start_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">End Date</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedProject.end_date ? new Date(selectedProject.end_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Assigned Team</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedProject.team_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Team Lead</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedProject.team_lead_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Client Handler</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedProject.client_handler_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Product Registration</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedProject.product_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Progress</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-full bg-[var(--border-color)] rounded-full h-2">
                    <div className="bg-[var(--accent)] h-2 rounded-full" style={{ width: `${selectedProject.progress_percentage}%` }}></div>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--text-main)]">{selectedProject.progress_percentage}%</span>
                </div>
              </div>

            </div>

            {selectedProject.description && (
              <div className="mb-6">
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-2">Description</p>
                <p className="text-[13px] text-[var(--text-main)] bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] whitespace-pre-wrap leading-relaxed">{selectedProject.description}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

const AddEditProjectModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState({
    project_code: '',
    project_name: '',
    description: '',
    team_id: '',
    product_id: '',
    start_date: '',
    end_date: '',
    status: 'Planned',
    priority: 'Medium',
    progress_percentage: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for dropdowns
  const [teams, setTeams] = useState([]);
  const [products, setProducts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  
  const dropdownRef = React.useRef(null);

  const uniqueDepartments = React.useMemo(() => {
    const depts = allUsers.map(u => u.department_name).filter(Boolean);
    return [...new Set(depts)];
  }, [allUsers]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [teamsRes, prodRes, empRes] = await Promise.all([
          getTeams({ limit: 100 }),
          getProducts({ limit: 100 }),
          fetchHREmployeesApi()
        ]);
        if (teamsRes.data?.success) setTeams(teamsRes.data.data || []);
        if (prodRes.data?.success) setProducts(prodRes.data.data || []);
        if (empRes.data?.success) setAllUsers(empRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch dropdown data:', err);
      }
    };
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          project_code: initialData.project_code || '',
          project_name: initialData.project_name || '',
          description: initialData.description || '',
          team_id: initialData.team_id || '',
          product_id: initialData.product_id || '',
          team_lead_id: initialData.team_lead_id || '',
          client_handler_id: initialData.client_handler_id || '',
          start_date: initialData.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : '',
          end_date: initialData.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : '',
          status: initialData.status || 'Planned',
          priority: initialData.priority || 'Medium',
          progress_percentage: initialData.progress_percentage || 0
        });
        setSelectedMembers(initialData.project_members || []);
      } else {
        setFormData({
          project_code: '',
          project_name: '',
          description: '',
          team_id: '',
          product_id: '',
          team_lead_id: '',
          client_handler_id: '',
          start_date: '',
          end_date: '',
          status: 'Planned',
          priority: 'Medium',
          progress_percentage: 0
        });
        setSelectedMembers([]);
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = { ...formData, project_members: selectedMembers };
      
      // Clean up empty strings for IDs
      if (!payload.team_id) delete payload.team_id;
      if (!payload.product_id) delete payload.product_id;
      if (!payload.team_lead_id) delete payload.team_lead_id;
      if (!payload.client_handler_id) delete payload.client_handler_id;
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;

      let res;
      if (initialData) {
        res = await updateProject(initialData.project_id, payload);
      } else {
        res = await createProject(payload);
      }

      if (res.data?.success) {
        toast.success(initialData ? 'Project updated successfully' : 'Project created successfully');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error?.message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Project" : "Add Project"} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Project Code *</label>
            <input 
              type="text" 
              name="project_code"
              value={formData.project_code}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Project Name *</label>
            <input 
              type="text" 
              name="project_name"
              value={formData.project_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Description</label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Start Date</label>
            <input 
              type="date" 
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">End Date</label>
            <input 
              type="date" 
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Status</label>
            <select 
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            >
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Priority</label>
            <select 
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="col-span-2 relative">
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Team Members</label>
            <div className="relative" ref={dropdownRef}>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2 flex items-center justify-between cursor-pointer transition-all hover:border-[var(--accent)] min-h-[44px]"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                  {selectedMembers.length > 0 ? (
                    <div className="flex -space-x-2">
                      {selectedMembers.slice(0, 4).map((id, idx) => {
                        const user = allUsers.find(u => u.user_id === id);
                        if (!user) return null;
                        return (
                          <div key={id} className="w-7 h-7 rounded-full border border-[var(--bg-card)] bg-[var(--bg-workspace)] overflow-hidden shrink-0 shadow-sm" style={{ zIndex: 10 - idx }}>
                            {user.image_url ? (
                               <img src={user.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-[var(--text-muted)] bg-[var(--nav-hover)]">
                                 {user.full_name.charAt(0)}
                               </div>
                            )}
                          </div>
                        );
                      })}
                      {selectedMembers.length > 4 && (
                        <div className="w-7 h-7 rounded-full border border-[var(--bg-card)] bg-[var(--bg-workspace)] flex items-center justify-center text-[10px] font-black text-[var(--text-main)] shrink-0 z-0 shadow-sm">
                          +{selectedMembers.length - 4}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[var(--text-dim)] shrink-0" />
                      <span className="text-[13px] text-[var(--text-muted)] font-medium">Assign Team Members...</span>
                    </div>
                  )}
                </div>
                <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-300 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-[100] top-[calc(100%+8px)] left-0 right-0 bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]/50">
                    <span className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider">Select Personnel</span>
                    <button 
                      type="button" 
                      onClick={() => setIsDropdownOpen(false)} 
                      className="text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 p-1.5 rounded-md transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="p-3.5 border-b border-[var(--border-color)] space-y-3">
                     <div className="relative">
                       <select 
                         value={selectedDepartment}
                         onChange={(e) => setSelectedDepartment(e.target.value)}
                         className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black uppercase tracking-widest text-[var(--text-main)] appearance-none cursor-pointer" 
                         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1em', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
                       >
                         <option value="">ALL DEPARTMENTS</option>
                         {uniqueDepartments.map(dept => (
                           <option key={dept} value={dept}>{dept}</option>
                         ))}
                       </select>
                     </div>
                     <div className="relative group">
                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                       <input 
                         type="text" 
                         placeholder="Search personnel..." 
                         value={userSearch} 
                         onChange={(e) => setUserSearch(e.target.value)} 
                         className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-9 pr-3 outline-none focus:border-[var(--accent)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] transition-all" 
                       />
                     </div>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-[var(--bg-card)]/50 divide-y divide-[var(--border-color)]/30">
                    {allUsers
                      .filter(u => selectedDepartment ? u.department_name === selectedDepartment : true)
                      .filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
                      .map(u => {
                        const isChecked = selectedMembers.includes(u.user_id);
                        return (
                          <div
                            key={u.user_id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedMembers(selectedMembers.filter(id => id !== u.user_id));
                              } else {
                                setSelectedMembers([...selectedMembers, u.user_id]);
                              }
                            }}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer text-xs transition-colors ${isChecked ? 'bg-[var(--nav-hover)]' : 'hover:bg-[var(--bg-workspace)]'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg-workspace)] border border-[var(--border-color)] shrink-0 shadow-sm">
                                {u.image_url ? (
                                  <img src={u.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-[var(--text-muted)]">
                                    {u.full_name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--text-main)] text-[13px]">{u.full_name}</span>
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mt-0.5">{u.role_name}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--border-color)]'}`}>
                              {isChecked && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })
                    }
                    {allUsers
                      .filter(u => selectedDepartment ? u.department_name === selectedDepartment : true)
                      .filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
                      .length === 0 && (
                      <div className="px-4 py-6 text-center text-xs font-medium text-[var(--text-muted)] opacity-60">
                        No personnel found
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-workspace)]/80 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(false)}
                      className="bg-[var(--accent)] text-white text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2"
                    >
                      <Check size={14} strokeWidth={3} /> Save Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Progress (%)</label>
            <input 
              type="number" 
              name="progress_percentage"
              value={formData.progress_percentage}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Linked Product Registration</label>
            <select 
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">-- None --</option>
              {products.map(p => (
                <option key={p.product_id} value={p.product_id}>{p.product_code} - {p.product_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Team Lead</label>
            <select 
              name="team_lead_id"
              value={formData.team_lead_id}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">-- Select Team Lead --</option>
              {allUsers.filter(u => selectedMembers.includes(u.user_id)).map(u => (
                <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role_name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Client Handler</label>
            <select 
              name="client_handler_id"
              value={formData.client_handler_id}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">-- Select Client Handler --</option>
              {allUsers.filter(u => selectedMembers.includes(u.user_id)).map(u => (
                <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role_name})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 border-t border-[var(--border-color)] pt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 bg-[var(--bg-workspace)] text-[var(--text-main)] font-bold text-[12px] rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn-primary shadow-lg px-6 py-2.5 flex items-center gap-2 rounded-xl text-[12px] font-bold disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Projects;
