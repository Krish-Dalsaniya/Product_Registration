import React, { useState, useEffect } from 'react';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../../hooks/useProjects';
import { useTeams } from '../../hooks/useTeams';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosInstance';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Briefcase, Plus, Loader2, Search, Box, Layers, Target } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useDispatch, useStore } from 'react-redux';
import { saveDraft, clearDraft } from '../../store/slices/draftSlice';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

const ProjectsPage = () => {
  const { hasPermission } = useAuth();
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: projectsRes, isLoading: projectsLoading } = useProjects();
  const { data: teamsRes, isLoading: teamsLoading } = useTeams();
  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/products');
      return res.data;
    }
  });

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const data = projectsRes?.data || [];
  const teams = teamsRes?.data || [];
  const availableItems = productsRes?.data || [];
  const loading = projectsLoading || teamsLoading || productsLoading;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedProject, setSelectedProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const dispatch = useDispatch();
  const store = useStore();

  const formId = React.useMemo(() => {
    if (!isModalOpen || modalMode === 'view') return null;
    return modalMode === 'create' 
      ? `project_create` 
      : `project_edit_${selectedProject?.project_id || 'unknown'}`;
  }, [isModalOpen, modalMode, selectedProject]);

  useEffect(() => {
    if (!formId || !isModalOpen) return;
    
    const subscription = watch((value) => {
      if (value && Object.keys(value).length > 0) {
        dispatch(saveDraft({ formId, data: value }));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formId, dispatch, isModalOpen]);

  const onSubmit = async (formData) => {
    if (modalMode === 'view') return;
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createProjectMutation.mutateAsync({ ...formData });
        toast.success(`Project created successfully!`);
      } else {
        await updateProjectMutation.mutateAsync({ id: selectedProject.project_id, data: { ...formData } });
        toast.success(`Project updated successfully!`);
      }
      setIsModalOpen(false);
      reset();
      if (formId) {
        dispatch(clearDraft({ formId }));
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedProject(null);
    
    const draftId = 'project_create';
    const draft = store.getState().drafts[draftId];
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
    } else {
      reset({ 
        project_name: '', 
        team_id: '',
        product_id: '', 
        status: 'Active'
      });
    }
    
    setIsModalOpen(true);
  };

  const handleView = (project) => {
    setModalMode('view');
    setSelectedProject(project);
    reset({ 
      project_name: project.project_name, 
      team_id: project.team_id || '',
      product_id: project.product_id || '',
      status: project.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (project) => {
    setModalMode('edit');
    setSelectedProject(project);
    const resetData = { 
      project_name: project.project_name, 
      team_id: project.team_id || '',
      product_id: project.product_id || '',
      status: project.status || 'Active'
    };
    const draftId = `project_edit_${project.project_id}`;
    const draft = store.getState().drafts[draftId];
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
    } else {
      reset(resetData);
    }
    
    setIsModalOpen(true);
  };

  const handleDelete = async (project) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete "${project.project_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteProjectMutation.mutateAsync(project.project_id);
      toast.success('Project deleted successfully');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const columns = [
    { key: 'project_name', label: 'Project Name' },
    { 
      key: 'team_name', 
      label: 'Assigned Team', 
      render: (row) => row.team_name ? <span className="font-bold text-[var(--accent)]">{row.team_name}</span> : <span className="text-[var(--text-dim)] italic">Unassigned</span>
    },
    { 
      key: 'product_name', 
      label: 'Product', 
      render: (row) => row.product_name ? <span className="text-[12px] font-medium">{row.product_name}</span> : <span className="text-[var(--text-dim)] italic">None</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.05em] border border-[var(--border-color)] ${
          row.status === 'Active' ? 'bg-[var(--nav-hover)] text-[var(--accent)]' :
          row.status === 'Completed' ? 'bg-green-500/10 text-green-500' :
          row.status === 'On Hold' ? 'bg-amber-500/10 text-amber-500' :
          'bg-rose-500/10 text-rose-500'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  const filteredData = data.filter(project => {
    const matchesSearch = project.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Target size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">
              Projects Management
            </h1>
          </div>
        </div>

        {hasPermission('teams', 'create') && (
          <button 
            onClick={handleOpenCreate} 
            className="btn-primary shadow-lg px-8 py-3 group"
            style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] md:text-[14px]">Add Project</span>
          </button>
        )}
      </div>

      <div className="workspace-card p-3.5 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search projects by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
            {filteredData.length} Projects Found
          </div>
        </div>

        <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-1 rounded-xl shadow-inner whitespace-nowrap overflow-x-auto custom-scrollbar">
          {['All', 'Active', 'Completed', 'On Hold', 'Cancelled'].map((r) => (
            <button
              key={r}
              onClick={() => setFilterStatus(r)}
              className={`px-4 py-2 rounded-lg text-[11px] font-black transition-all duration-300 tracking-wider ${
                filterStatus === r
                  ? 'bg-[var(--accent)] text-white shadow-lg'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filteredData} loading={loading} onView={handleView} onEdit={hasPermission('teams', 'edit') ? handleEdit : undefined} onDelete={hasPermission('teams', 'delete') ? handleDelete : undefined} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? `Add Project` : modalMode === 'edit' ? `Update Project` : `Project Profile`}
        maxWidth="max-w-2xl"
        headerActions={modalMode !== 'view' && (
          <button
            form="project-form"
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2 px-6 shadow-md flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
            style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save Project' : 'Update Project')}
          </button>
        )}
      >
        <div className="space-y-6">
          {modalMode === 'view' ? (
            <div className="space-y-6 animate-in fade-in duration-500 py-2">
               <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-5">
                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Project Name</label>
                      <div className="text-[var(--text-main)] font-black text-xl uppercase tracking-tight">
                        {selectedProject?.project_name}
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Status</label>
                      <div className="mt-2">
                        <span className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-[0.05em] border border-[var(--border-color)] ${
                          selectedProject?.status === 'Active' ? 'bg-[var(--nav-hover)] text-[var(--accent)]' :
                          selectedProject?.status === 'Completed' ? 'bg-green-500/10 text-green-500' :
                          selectedProject?.status === 'On Hold' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-rose-500/10 text-rose-500'
                        }`}>
                          {selectedProject?.status || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Assigned Team</label>
                      <div className="text-[var(--text-main)] font-bold text-base flex items-center gap-2 mt-1">
                        <Layers size={16} className="text-[var(--accent)]" />
                        {selectedProject?.team_name || 'No Team Linked'}
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Associated Product</label>
                      <div className="text-[var(--text-main)] font-bold text-base flex items-center gap-2 mt-1">
                        <Box size={16} className="text-[var(--text-dim)]" />
                        {selectedProject?.product_name || 'No Product Linked'}
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            <form id="project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Project Name</label>
                  <input {...register('project_name', { required: 'Project name is required' })} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)]" placeholder="e.g. NextGen Hardware V2" />
                </div>
                
                <div className="relative md:col-span-1">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Status</label>
                  <div className="relative">
                    <select {...register('status', { required: true })} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="relative md:col-span-1">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Assign to Team</label>
                  <div className="relative">
                    <select {...register('team_id')} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                      <option value="">No Team Assigned</option>
                      {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name} ({t.role_name})</option>)}
                    </select>
                  </div>
                </div>

                <div className="relative md:col-span-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Product Selection</label>
                  <div className="relative">
                    <select {...register('product_id')} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                      <option value="">Select Available Product</option>
                      {availableItems.map(p => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
