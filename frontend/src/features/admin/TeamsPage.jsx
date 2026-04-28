import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTeams, createTeam } from '../../api/adminTeams';
import { getUsers } from '../../api/admin';
import axiosInstance from '../../api/axiosInstance';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Briefcase, ShoppingBag, Wrench, Layout, Plus, Loader2, Check, Box, Users, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const TeamsPage = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'Designer';
  
  const [data, setData] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableItems, setAvailableItems] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getTeams({ role });
      setData(res.data.data);
      const userRes = await getUsers({ role, limit: 100 });
      setAvailableUsers(userRes.data.data);
      if (role !== 'Designer') {
        const itemRes = await axiosInstance.get(role === 'Sales' ? '/admin/products' : '/admin/products');
        setAvailableItems(itemRes.data.data);
      } else {
        setAvailableItems([]);
      }
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
        toast.success(`Team updated successfully!`);
      }
      setIsModalOpen(false);
      reset();
      setSelectedMembers([]);
      setSelectedItems([]);
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
    reset({ team_name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleView = (team) => {
    setModalMode('view');
    setSelectedTeam(team);
    setSelectedMembers([]); 
    setSelectedItems([]);
    setIsModalOpen(true);
  };

  const handleEdit = (team) => {
    setModalMode('edit');
    setSelectedTeam(team);
    reset({ team_name: team.team_name, description: team.description || '' });
    setSelectedMembers([]); 
    setSelectedItems([]);
    setIsModalOpen(true);
  };

  const toggleSelection = (id, list, setter) => {
    if (modalMode === 'view') return;
    setter(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const columns = [
    { key: 'team_name', label: 'Team Name' },
    { 
      key: 'member_names', 
      label: 'Members',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.member_names?.split(', ').map((name, i) => (
            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">{name}</span>
          ))}
          {!row.member_names && <span className="text-gray-400 text-xs italic">No members</span>}
        </div>
      )
    },
    ...(role !== 'Designer' ? [{ 
      key: 'active_projects', 
      label: role === 'Sales' ? 'Sales Targets' : 'Tasks', 
      render: (row) => <span className="font-bold text-gray-800">{row.active_projects || 0}</span> 
    }] : [])
  ];

  const getRoleIcon = () => {
    if (role === 'Designer') return <Layout className="text-blue-600" />;
    if (role === 'Sales') return <ShoppingBag className="text-blue-600" />;
    if (role === 'Maintenance') return <Wrench className="text-blue-600" />;
    return <Briefcase className="text-blue-600" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Brand Icon Box matching Image Style */}
          <div className="p-4 bg-white border-[0.5px] border-gray-200 rounded-xl shadow-sm">
            {getRoleIcon()}
          </div>
          <div>
            <h1 className="text-[26px] font-black text-[#0B1A16] tracking-tighter uppercase leading-none">
              {role} Teams
            </h1>
            <p className="text-[12px] text-[#64748B] font-bold mt-1.5 uppercase tracking-[0.15em]">
              OPERATIONAL RECORDS AND PERSONNEL MANAGEMENT
            </p>
          </div>
        </div>

        <button onClick={handleOpenCreate} className="btn-primary">
          <Plus size={20} />
          <span>Add {role} Team</span>
        </button>
      </div>

      <DataTable columns={columns} data={data} loading={loading} onView={handleView} onEdit={handleEdit} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'create' ? `Configure New ${role} Team` : modalMode === 'edit' ? `Update ${role} Team` : `${role} Team Profile`}>
        <div className="space-y-6">
          {modalMode === 'view' && (
             <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                <Info className="text-blue-600 mt-0.5" size={18} />
                <p className="text-xs text-blue-800 font-medium leading-relaxed">Viewing active configuration for <strong>{selectedTeam?.team_name}</strong>. This record is currently operational.</p>
             </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Team Designation</label>
              <input {...register('team_name', { required: 'Team name is required' })} disabled={modalMode === 'view'} className="w-full bg-white border-[0.5px] border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px] disabled:bg-gray-50" placeholder={`e.g. ${role} Unit Alpha`} />
            </div>

            <div className={`grid ${role === 'Designer' ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={12} /> Personnel</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1 custom-scrollbar bg-gray-50/30">
                  {availableUsers.map(u => {
                    const isSelected = selectedMembers.includes(u.user_id) || (modalMode === 'view' && selectedTeam?.member_names?.includes(u.full_name));
                    return (
                      <div key={u.user_id} onClick={() => toggleSelection(u.user_id, selectedMembers, setSelectedMembers)} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${isSelected ? 'bg-blue-600/10 border border-blue-600/20' : modalMode === 'view' ? 'opacity-50' : 'hover:bg-white cursor-pointer'}`}>
                        <span className={`text-[11px] font-bold tracking-tight ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>{u.full_name}</span>
                        {isSelected && <Check size={12} className="text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>
              {role !== 'Designer' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Box size={12} /> {role === 'Sales' ? 'Products' : 'Tasks'}</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1 custom-scrollbar bg-gray-50/30">
                    {availableItems.map(item => {
                      const itemName = item.project_name || item.product_name;
                      const isSelected = selectedItems.includes(item.project_id || item.product_id) || (modalMode === 'view' && (selectedTeam?.active_project_names?.includes(itemName) || selectedTeam?.linked_products?.includes(itemName)));
                      return (
                        <div key={item.project_id || item.product_id} onClick={() => toggleSelection(item.project_id || item.product_id, selectedItems, setSelectedItems)} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${isSelected ? 'bg-blue-500/10 border border-blue-500/20' : modalMode === 'view' ? 'opacity-50' : 'hover:bg-white cursor-pointer'}`}>
                          <span className={`text-[11px] font-bold tracking-tight ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>{itemName}</span>
                          {isSelected && <Check size={12} className="text-blue-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Operation Description</label>
              <textarea {...register('description')} disabled={modalMode === 'view'} rows={2} className="w-full bg-white border-[0.5px] border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px] resize-none disabled:bg-gray-50" placeholder="Operational directives and notes..." />
            </div>

            {modalMode !== 'view' && (
              <div className="pt-2">
                <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-900/10 transition-all active:scale-95 flex items-center justify-center gap-2 text-[13px]">
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : modalMode === 'create' ? `INITIALIZE ${role.toUpperCase()} TEAM` : `UPDATE ${role.toUpperCase()} TEAM`}
                </button>
              </div>
            )}
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default TeamsPage;
