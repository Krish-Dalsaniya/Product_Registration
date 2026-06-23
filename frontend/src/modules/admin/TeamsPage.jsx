import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from '../../hooks/useTeams';
import { useUsers } from '../../hooks/useUsers';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosInstance';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Briefcase, ShoppingBag, Wrench, Layout, Plus, Loader2, Check, Box, Users, Info, ChevronDown, Search, X } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useStore } from 'react-redux';
import { saveDraft, clearDraft } from '../../store/slices/draftSlice';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

const TeamsPage = () => {
  const { hasPermission } = useAuth();
  const [filterRole, setFilterRole] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: teamsRes, isLoading: teamsLoading } = useTeams();
  const { data: usersRes, isLoading: usersLoading } = useUsers({ limit: 500 });
  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/products');
      return res.data;
    }
  });

  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();

  const data = teamsRes?.data || [];
  const rawUsers = usersRes?.data || [];
  const dedup = (arr) => {
    const seen = new Set();
    return arr.filter(u => {
      if (seen.has(u.user_id)) return false;
      seen.add(u.user_id);
      return true;
    });
  };
  const allUsers = dedup(rawUsers);
  const uniqueRoles = Array.from(new Set(allUsers.map(u => u.role_name).filter(Boolean)));
  
  const availableItems = productsRes?.data || [];
  const loading = teamsLoading || usersLoading || productsLoading;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm();
  const defaultRole = uniqueRoles.length > 0 ? uniqueRoles[0] : 'Designer';
  const selectedRole = watch('role_name') || defaultRole;

  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dispatch = useDispatch();
  const store = useStore();

  const formId = React.useMemo(() => {
    if (!isModalOpen || modalMode === 'view') return null;
    return modalMode === 'create' 
      ? `team_create` 
      : `team_edit_${selectedTeam?.team_id || 'unknown'}`;
  }, [isModalOpen, modalMode, selectedTeam]);

  useEffect(() => {
    if (!formId || !isModalOpen) return;
    
    const subscription = watch((value) => {
      if (value && Object.keys(value).length > 0) {
        dispatch(saveDraft({ formId, data: value }));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formId, dispatch, isModalOpen]);

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  useEffect(() => {
    setSelectedMembers([]);
    setSelectedItems([]);
  }, [filterRole]);

  const onSubmit = async (formData) => {
    if (modalMode === 'view') return;
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one team member');
      return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createTeamMutation.mutateAsync({ ...formData, member_ids: selectedMembers, project_ids: [], product_ids: selectedRole !== 'Designer' ? selectedItems : [] });
        toast.success(`Team created successfully!`);
      } else {
        await updateTeamMutation.mutateAsync({ id: selectedTeam.team_id, data: { ...formData, member_ids: selectedMembers } });
        toast.success(`Team updated successfully!`);
      }
      setIsModalOpen(false);
      reset();
      if (formId) {
        dispatch(clearDraft({ formId }));
      }
      setSelectedMembers([]);
      setSelectedItems([]);
      setIsDropdownOpen(false);
      setUserSearch('');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedTeam(null);
    setSelectedMembers([]);
    setSelectedItems([]);
    setIsDropdownOpen(false);
    setUserSearch('');
    
    const draftId = 'team_create';
    const draft = store.getState().drafts[draftId];
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
    } else {
      reset({ 
        team_name: '', 
        role_name: 'Designer',
        description: '', 
        product_name: '', 
        product_description: '', 
        team_lead_id: '', 
        client_handler_id: '' 
      });
    }
    
    setIsModalOpen(true);
  };

  const handleView = (team) => {
    setModalMode('view');
    setSelectedTeam(team);
    reset({ 
      team_name: team.team_name, 
      role_name: team.role_name || 'Designer',
      description: team.description || '',
      product_name: team.product_name || '',
      product_description: team.product_description || '',
      team_lead_id: team.team_lead_id || '',
      client_handler_id: team.client_handler_id || ''
    });
    setSelectedMembers(team.member_ids || []); 
    setSelectedItems([]);
    setIsDropdownOpen(false);
    setUserSearch('');
    setIsModalOpen(true);
  };

  const handleEdit = (team) => {
    setModalMode('edit');
    setSelectedTeam(team);
    const resetData = { 
      team_name: team.team_name, 
      role_name: team.role_name || 'Designer',
      description: team.description || '',
      product_name: team.product_name || '',
      product_description: team.product_description || '',
      team_lead_id: team.team_lead_id || '',
      client_handler_id: team.client_handler_id || ''
    };
    const draftId = `team_edit_${team.team_id}`;
    const draft = store.getState().drafts[draftId];
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
    } else {
      reset(resetData);
    }
    
    setSelectedMembers(team.member_ids || []); 
    setSelectedItems([]);
    setIsDropdownOpen(false);
    setUserSearch('');
    setIsModalOpen(true);
  };

  const handleDelete = async (team) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete "${team.team_name}"? This action will unlink associated projects.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTeamMutation.mutateAsync(team.team_id);
      toast.success('Team deleted successfully');
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  const toggleSelection = (id, list, setter) => {
    if (modalMode === 'view') return;
    setter(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const columns = [
    { key: 'team_name', label: 'Team Designation' },
    { key: 'role_name', label: 'Team Type', render: (row) => <span className="font-bold text-[var(--accent)]">{row.role_name}</span> },
    { 
      key: 'member_names', 
      label: 'Personnel Crew',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.member_names?.split(', ').map((name, i) => (
            <span key={i} className="px-2.5 py-1 bg-[var(--nav-hover)] text-[var(--accent)] rounded-lg text-[10px] font-black uppercase tracking-[0.05em] border border-[var(--border-color)]">
              {name}
            </span>
          ))}
          {!row.member_names && <span className="text-[var(--text-dim)] text-[11px] font-medium opacity-50 italic">No members assigned</span>}
        </div>
      )
    },
    // { 
    //   key: 'active_projects', 
    //   label: 'Assignments / Targets', 
    //   render: (row) => (
    //     <div className="flex items-center gap-2">
    //       <span className="w-8 h-8 rounded-full bg-[var(--bg-workspace)] flex items-center justify-center text-[12px] font-black text-[var(--text-main)] border border-[var(--border-color)]">
    //         {row.active_projects || 0}
    //       </span>
    //       <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-50">Active</span>
    //     </div>
    //   ) 
    // }
  ];

  const getRoleIcon = () => {
    return <Users className="text-[var(--accent)]" />;
  };

  const filteredData = data.filter(team => {
    const matchesSearch = team.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || team.role_name === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            {React.cloneElement(getRoleIcon(), { size: 24, className: "md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform duration-300" })}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">
              Teams Management
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
            <span className="text-[12px] md:text-[14px]">Add Team</span>
          </button>
        )}
      </div>

      <div className="workspace-card p-3.5 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search teams by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
            {filteredData.length} Teams Found
          </div>
        </div>

        <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-1 rounded-xl shadow-inner whitespace-nowrap">
          {['All', 'Designer', 'Sales', 'Maintenance'].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-5 py-2 rounded-lg text-[11px] font-black transition-all duration-300 tracking-wider ${
                filterRole === r
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
        title={modalMode === 'create' ? `Add Team` : modalMode === 'edit' ? `Update Team` : `Team Profile`}
        maxWidth="max-w-2xl"
        headerActions={modalMode !== 'view' && (
          <button
            form="team-form"
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2 px-6 shadow-md flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
            style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save Team' : 'Update Team')}
          </button>
        )}
      >
        <div className="space-y-6">
          {modalMode === 'view' ? (
            <div className="space-y-6 animate-in fade-in duration-500 py-2">
               <div className="grid grid-cols-1 gap-6">
                  {/* Clean text-based layout without boxes */}
                  <div className="space-y-5">
                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Team Designation</label>
                      <div className="text-[var(--text-main)] font-black text-xl uppercase tracking-tight">
                        {selectedTeam?.team_name}
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Associated Product</label>
                      <div className="text-[var(--text-main)] font-bold text-base">
                        {selectedTeam?.product_name || 'No Product Linked'}
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Team Lead</label>
                      <div className="text-[var(--text-main)] font-bold text-[14px]">
                        {allUsers.find(u => u.user_id === selectedTeam?.team_lead_id)?.full_name || 'Not Assigned'}
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Client Handler</label>
                      <div className="text-[var(--text-main)] font-bold text-[14px]">
                        {allUsers.find(u => u.user_id === selectedTeam?.client_handler_id)?.full_name || 'Not Assigned'}
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Product Description</label>
                      <div className="text-[var(--text-main)] text-[14px] leading-relaxed rich-text-content mt-2 ql-snow">
                        <div className="ql-editor !p-0" dangerouslySetInnerHTML={{ __html: selectedTeam?.product_description || '<span class="italic opacity-50">No description provided</span>' }} />
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Team Directives</label>
                      <div className="text-[var(--text-main)] text-[14px] leading-relaxed rich-text-content mt-2 ql-snow">
                        <div className="ql-editor !p-0" dangerouslySetInnerHTML={{ __html: selectedTeam?.description || '<span class="italic opacity-50">No directives provided</span>' }} />
                      </div>
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2"><Users size={12} /> Active Personnel</label>
                       <div className="flex flex-wrap gap-2">
                         {selectedTeam?.member_ids?.map(id => {
                            const user = allUsers.find(u => u.user_id === id);
                            return user ? (
                              <span key={id} className="px-3 py-1.5 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-lg text-[11px] font-black uppercase tracking-tight text-[var(--accent)]">
                                {user.full_name}
                              </span>
                            ) : null;
                         })}
                         {(!selectedTeam?.member_ids || selectedTeam.member_ids.length === 0) && (
                            <span className="text-[11px] text-[var(--text-dim)] italic">No personnel assigned to this team.</span>
                         )}
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            <form id="team-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Team Designation</label>
                  <input {...register('team_name', { required: 'Team name is required' })} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)]" placeholder="e.g. Unit Alpha" />
                </div>
                
                {/* Popover UI for Team Type and Personnel */}
                <div className="relative">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Team Members</label>
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer transition-all hover:border-[var(--accent)] hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] min-h-[42px]"
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                        {selectedMembers.length > 0 ? (
                          <div className="flex -space-x-2">
                            {selectedMembers.slice(0, 4).map((id, idx) => {
                              const user = allUsers.find(u => u.user_id === id);
                              if (!user) return null;
                              return (
                                <div key={id} className="w-6 h-6 rounded-full border border-[var(--bg-card)] bg-[var(--bg-workspace)] overflow-hidden shrink-0 shadow-sm" style={{ zIndex: 10 - idx }}>
                                  {user.image_url ? (
                                     <img src={user.image_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                     <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-[var(--text-muted)] bg-[var(--nav-hover)]">
                                       {user.full_name.charAt(0)}
                                     </div>
                                  )}
                                </div>
                              );
                            })}
                            {selectedMembers.length > 4 && (
                              <div className="w-6 h-6 rounded-full border border-[var(--bg-card)] bg-[var(--bg-workspace)] flex items-center justify-center text-[9px] font-black text-[var(--text-main)] shrink-0 z-0 shadow-sm">
                                +{selectedMembers.length - 4}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Users size={15} className="text-[var(--text-dim)] shrink-0" />
                            <span className="text-xs text-[var(--text-muted)] font-medium">Assign Team Members...</span>
                          </div>
                        )}
                      </div>
                      <ChevronDown size={15} className={`text-[var(--text-muted)] transition-transform duration-300 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Popup Dropdown */}
                    {isDropdownOpen && (
                      <div className="absolute z-[100] top-[calc(100%+8px)] left-0 right-0 bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col">
                        
                        {/* Header with Title and Close Icon */}
                        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]/50">
                          <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Select Personnel</span>
                          <button 
                            type="button" 
                            onClick={() => setIsDropdownOpen(false)} 
                            className="text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 p-1 rounded-md transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="p-3.5 border-b border-[var(--border-color)] space-y-3">
                           {/* Role Dropdown Filter */}
                           <div className="relative">
                             <select 
                               {...register('role_name', { required: true })} 
                               className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black uppercase tracking-widest text-[var(--text-main)] appearance-none cursor-pointer" 
                               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1em', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
                             >
                               {uniqueRoles.map((role) => (
                                 <option key={role} value={role}>{role}</option>
                               ))}
                             </select>
                           </div>
                           
                           {/* Search Input */}
                           <div className="relative group">
                             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                             <input 
                               type="text" 
                               placeholder={`Search personnel...`} 
                               value={userSearch} 
                               onChange={(e) => setUserSearch(e.target.value)} 
                               className="w-full bg-[var(--bg-workspace)] border-[0.5px] border-[var(--border-color)] rounded-xl py-2 pl-9 pr-3 outline-none focus:border-[var(--accent)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] placeholder-opacity-50 transition-all" 
                             />
                           </div>
                        </div>
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-[var(--bg-card)]/50 divide-y divide-[var(--border-color)]/30">
                          {allUsers
                            .filter(u => u.role_name === selectedRole)
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
                                    <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--bg-workspace)] border border-[var(--border-color)] shrink-0 shadow-sm">
                                      {u.image_url ? (
                                        <img src={u.image_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-[var(--text-muted)]">
                                          {u.full_name.charAt(0)}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-[var(--text-main)]">{u.full_name}</span>
                                      <span className="text-[9px] text-[var(--text-muted)] opacity-80 uppercase tracking-wider font-semibold">{u.role_name}</span>
                                    </div>
                                  </div>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--border-color)]'}`}>
                                    {isChecked && <Check size={10} strokeWidth={3} />}
                                  </div>
                                </div>
                              );
                            })
                          }
                          {allUsers
                            .filter(u => u.role_name === selectedRole)
                            .filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
                            .length === 0 && (
                            <div className="px-4 py-6 text-center text-xs font-medium text-[var(--text-muted)] opacity-60">
                              No personnel found
                            </div>
                          )}
                        </div>
                        
                        {/* Footer with Save Button */}
                        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-workspace)]/80 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(false)}
                            className="bg-[var(--accent)] text-white text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5"
                          >
                            <Check size={14} strokeWidth={3} /> Save Selection
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative md:col-span-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Product Selection</label>
                  <div className="relative">
                    <select {...register('product_name')} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                      <option value="">Select Available Product</option>
                      {availableItems.map(p => <option key={p.product_id} value={p.product_name}>{p.product_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Team Lead</label>
                  <div className="relative">
                    <select {...register('team_lead_id')} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                      <option value="">Select Team Lead</option>
                      {allUsers.filter(u => selectedMembers.includes(u.user_id)).map(u => <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role_name})</option>)}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Client Handler</label>
                  <div className="relative">
                    <select {...register('client_handler_id')} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                      <option value="">Select Client Handler</option>
                      {allUsers.filter(u => selectedMembers.includes(u.user_id)).map(u => <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role_name})</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Product Description</label>
                  <Controller
                    name="product_description"
                    control={control}
                    render={({ field }) => (
                      <ReactQuill 
                        theme="snow"
                        value={field.value || ''}
                        onChange={field.onChange}
                        modules={quillModules}
                        placeholder="Key product requirements..."
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Team Description</label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <ReactQuill 
                        theme="snow"
                        value={field.value || ''}
                        onChange={field.onChange}
                        modules={quillModules}
                        placeholder="Operational directives..."
                      />
                    )}
                  />
                </div>
              </div>



                             {/* Submit button moved to modal header */}
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TeamsPage;
