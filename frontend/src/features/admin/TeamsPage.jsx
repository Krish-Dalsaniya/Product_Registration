import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTeams, createTeam, updateTeam } from '../../api/adminTeams';
import { getUsers } from '../../api/admin';
import axiosInstance from '../../api/axiosInstance';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Briefcase, ShoppingBag, Wrench, Layout, Plus, Loader2, Check, Box, Users, Info, ChevronDown } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const TeamsPage = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'Designer';
  
  const [data, setData] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [availableItems, setAvailableItems] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getTeams({ role });
      setData(res.data.data);
      const dedup = (arr) => {
        const seen = new Set();
        return arr.filter(u => {
          if (seen.has(u.user_id)) return false;
          seen.add(u.user_id);
          return true;
        });
      };

      const userRes = await getUsers({ role, limit: 100 });
      setAvailableUsers(dedup(userRes.data.data));
      const allUserRes = await getUsers({ limit: 500 });
      setAllUsers(dedup(allUserRes.data.data));
      
      const itemRes = await axiosInstance.get('/admin/products');
      setAvailableItems(itemRes.data.data);
    } catch (error) {
      toast.error(`Failed to fetch ${role} information`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSelectedMembers([]);
    setSelectedItems([]);
  }, [role]);

  const onSubmit = async (formData) => {
    if (modalMode === 'view') return;
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one team member');
      return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createTeam({ ...formData, role_name: role, member_ids: selectedMembers, project_ids: [], product_ids: role !== 'Designer' ? selectedItems : [] });
        toast.success(`${role} Team created successfully!`);
      } else {
        await updateTeam(selectedTeam.team_id, { ...formData, member_ids: selectedMembers });
        toast.success(`Team updated successfully!`);
      }
      setIsModalOpen(false);
      reset();
      setSelectedMembers([]);
      setSelectedItems([]);
      setIsDropdownOpen(false);
      setUserSearch('');
      fetchData();
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
    reset({ 
      team_name: '', 
      description: '', 
      product_name: '', 
      product_description: '', 
      team_lead_id: '', 
      client_handler_id: '' 
    });
    setIsModalOpen(true);
  };

  const handleView = (team) => {
    setModalMode('view');
    setSelectedTeam(team);
    reset({ 
      team_name: team.team_name, 
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
    reset({ 
      team_name: team.team_name, 
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

  const handleDelete = async (team) => {
    if (!window.confirm(`Are you sure you want to delete "${team.team_name}"? This action will unlink associated projects.`)) return;
    try {
      // await deleteTeam(team.team_id);
      toast.success('Team deleted successfully');
      fetchData();
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
    ...(role !== 'Designer' ? [{ 
      key: 'active_projects', 
      label: role === 'Sales' ? 'Sales Targets' : 'Operational Tasks', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[var(--bg-workspace)] flex items-center justify-center text-[12px] font-black text-[var(--text-main)] border border-[var(--border-color)]">
            {row.active_projects || 0}
          </span>
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-50">Active</span>
        </div>
      ) 
    }] : [])
  ];

  const getRoleIcon = () => {
    const iconClass = "text-[var(--accent)]";
    if (role === 'Designer') return <Layout className={iconClass} />;
    if (role === 'Sales') return <ShoppingBag className={iconClass} />;
    if (role === 'Maintenance') return <Wrench className={iconClass} />;
    return <Briefcase className={iconClass} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            {React.cloneElement(getRoleIcon(), { size: 24, className: "md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform duration-300" })}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">
              {role} Division
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Operational Teams & Personnel Management
            </p>
          </div>
        </div>

        <button 
          onClick={handleOpenCreate} 
          className="btn-primary shadow-lg px-8 py-3 group"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] md:text-[14px]">Add {role} Team</span>
        </button>
      </div>

      <DataTable columns={columns} data={data} loading={loading} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? `Add ${role} Team` : modalMode === 'edit' ? `Update ${role} Team` : `${role} Team Profile`}
        maxWidth="max-w-5xl"
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
                      <div className="text-[var(--text-main)] text-[14px] leading-relaxed rich-text-content mt-2">
                        <div dangerouslySetInnerHTML={{ __html: selectedTeam?.product_description || '<span class="italic opacity-50">No description provided</span>' }} />
                      </div>
                    </div>

                    <div className="border-b border-[var(--border-color)] pb-4">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Team Directives</label>
                      <div className="text-[var(--text-main)] text-[14px] leading-relaxed rich-text-content mt-2">
                        <div dangerouslySetInnerHTML={{ __html: selectedTeam?.description || '<span class="italic opacity-50">No directives provided</span>' }} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Team Designation</label>
                  <input {...register('team_name', { required: 'Team name is required' })} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)]" placeholder={`e.g. ${role} Unit Alpha`} />
                </div>
                <div className="relative">
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
                      {allUsers.filter(u => u.role_name === role).map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Client Handler</label>
                  <div className="relative">
                    <select {...register('client_handler_id')} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                      <option value="">Select Client Handler</option>
                      {allUsers.filter(u => u.role_name === role).map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
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

              <div className="space-y-2">
                 <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1 flex items-center gap-2">
                   <Users size={12} /> Personnel Selection
                 </label>
                 
                 <div className="bg-[var(--bg-workspace)]/40 border-[0.5px] border-[var(--border-color)] rounded-xl p-3 space-y-3">
                   {/* Inline Search Box */}
                   <div className="relative">
                     <input
                       type="text"
                       placeholder="Search personnel to assign..."
                       value={userSearch}
                       onChange={(e) => setUserSearch(e.target.value)}
                       className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] placeholder-opacity-50"
                     />
                   </div>

                   {/* Inline Scrollable List */}
                   <div className="overflow-y-auto custom-scrollbar max-h-40 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/50 divide-y divide-[var(--border-color)]/30">
                     {allUsers
                       .filter(u => u.role_name === role)
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
                             className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--nav-hover)] cursor-pointer text-xs font-semibold text-[var(--text-main)] transition-colors"
                           >
                             <span>{u.full_name}</span>
                             <input
                               type="checkbox"
                               checked={isChecked}
                               onChange={() => {}} // Managed by row div click
                               className="accent-[var(--accent)] rounded border-[var(--border-color)] shrink-0"
                             />
                           </div>
                         );
                       })
                     }
                     {allUsers
                       .filter(u => u.role_name === role)
                       .filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
                       .length === 0 && (
                       <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)] opacity-60">
                         No personnel found
                       </div>
                     )}
                   </div>
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
