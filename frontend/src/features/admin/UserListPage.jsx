import React, { useState, useEffect } from 'react';
import { getUsers, createUser } from '../../api/admin';
import DataTable from '../../components/shared/DataTable';
import RoleBadge from '../../components/shared/RoleBadge';
import Modal from '../../components/shared/Modal';
import { Search, Plus, Loader2, User, Mail, Shield, Calendar, Users, PenTool, ShoppingBag, Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const UserListPage = ({ initialRole = '' }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    setRoleFilter(initialRole);
  }, [initialRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { 
        page: pagination.page, 
        limit: pagination.limit,
        role: roleFilter || undefined
      };
      const res = await getUsers(params);
      setUsers(res.data.data);
      setPagination(prev => ({ ...prev, total: res.data.meta.total }));
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, pagination.page]);

  const onSubmit = async (data) => {
    if (modalMode === 'view') return;
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createUser(data);
        toast.success('User created successfully!');
      } else {
        toast.success('User updated successfully!');
      }
      setIsModalOpen(false);
      reset();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    reset({ full_name: '', email: '', password: '', role_name: initialRole || 'Designer' });
    setIsModalOpen(true);
  };

  const handleView = (user) => {
    setModalMode('view');
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    reset({ full_name: user.full_name, email: user.email, role_name: user.role_name });
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email Address' },
    { 
      key: 'role_name', 
      label: 'Role Assignment',
      render: (row) => <RoleBadge role={row.role_name} />
    },
  ];


  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = () => {
    if (initialRole === 'Designer') return <PenTool className="text-[#1a7a48]" />;
    if (initialRole === 'Sales') return <ShoppingBag className="text-[#1a7a48]" />;
    if (initialRole === 'Maintenance') return <Wrench className="text-[#1a7a48]" />;
    return <Users className="text-[#1a7a48]" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Brand Icon Box matching Image Style */}
          <div className="p-4 bg-white border-[0.5px] border-gray-200 rounded-xl shadow-sm">
            {getRoleIcon()}
          </div>
          <div>
            <h1 className="text-[26px] font-black text-[#0B1A16] tracking-tighter uppercase leading-none">
              {initialRole ? (initialRole === 'Sales' ? initialRole : `${initialRole}s`) : 'Users'}
            </h1>

            <p className="text-[12px] text-[#64748B] font-bold mt-1.5 uppercase tracking-[0.15em]">
              OPERATIONAL RECORDS AND PERSONNEL MANAGEMENT
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleOpenCreate} 
          className="bg-[#1a7a48] hover:bg-[#15633a] text-white font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-emerald-900/10 transition-all active:scale-95 flex items-center gap-2 text-[13px]"
        >
          <Plus size={18} />
          <span>{initialRole ? `Add ${initialRole}` : 'Add New User'}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1a7a48] transition-colors" size={16} />
          <input
            type="text"
            placeholder="Filter records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-[0.5px] border-gray-200 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:border-[#1a7a48] focus:ring-4 focus:ring-emerald-500/5 transition-all text-[13px]"
          />
        </div>
        
        {!initialRole && (
          <div className="flex bg-gray-100 p-[3px] rounded-[8px] border-[0.5px] border-gray-200 shadow-sm whitespace-nowrap">
            {['', 'Designer', 'Sales', 'Maintenance'].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-4 py-1.5 rounded-[6px] text-[11px] font-bold transition-all tracking-tight ${
                  roleFilter === role 
                    ? 'bg-[#1a7a48] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                {(role || 'All').toUpperCase()}
              </button>

            ))}
          </div>
        )}
      </div>

      <DataTable 
        columns={columns} 
        data={filteredUsers} 
        loading={loading}
        totalCount={pagination.total}
        filteredCount={filteredUsers.length}
        currentPage={pagination.page}
        totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
        onView={handleView}
        onEdit={handleEdit}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'create' ? 'Personnel Registration' : modalMode === 'edit' ? 'Update User Profile' : 'Personnel Details'}
      >
        {modalMode === 'view' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-2xl border-[0.5px] border-gray-100">
              <div className="w-16 h-16 rounded-full bg-[#1a7a48]/10 flex items-center justify-center text-[#1a7a48] font-bold text-2xl border border-[#1a7a48]/20">
                {selectedUser?.full_name?.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-900 tracking-tight">{selectedUser?.full_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={selectedUser?.role_name} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors rounded-xl group">
                <div className="p-2.5 bg-blue-50 text-blue-500 rounded-lg group-hover:scale-110 transition-transform"><Mail size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-sm font-semibold text-gray-700">{selectedUser?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors rounded-xl group">
                <div className="p-2.5 bg-purple-50 text-purple-500 rounded-lg group-hover:scale-110 transition-transform"><Calendar size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Joined Date</p>
                  <p className="text-sm font-semibold text-gray-700">{new Date(selectedUser?.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                </div>
              </div>

            </div>

            <div className="pt-4">
              <button onClick={() => setIsModalOpen(false)} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-lg transition-all active:scale-95 text-[13px] uppercase tracking-widest">Close Profile</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <input {...register('full_name', { required: 'Name is required' })} autoComplete="off" className="w-full bg-white border-[0.5px] border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#1a7a48] focus:ring-4 focus:ring-emerald-500/5 transition-all text-[13px]" placeholder="e.g. John Doe" />
              {errors.full_name && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <input {...register('email', { required: 'Email is required' })} type="email" autoComplete="off" className="w-full bg-white border-[0.5px] border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#1a7a48] focus:ring-4 focus:ring-emerald-500/5 transition-all text-[13px]" placeholder="john@procore.sys" />
              {errors.email && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.email.message}</p>}
            </div>

            {modalMode === 'create' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                <input {...register('password', { required: 'Password is required' })} type="password" autoComplete="new-password" className="w-full bg-white border-[0.5px] border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#1a7a48] focus:ring-4 focus:ring-emerald-500/5 transition-all text-[13px]" placeholder="••••••••" />
                {errors.password && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.password.message}</p>}
              </div>
            )}

            {!initialRole && (
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Department</label>
                <select {...register('role_name', { required: 'Role is required' })} className="w-full bg-white border-[0.5px] border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-[#1a7a48] focus:ring-4 focus:ring-emerald-500/5 transition-all text-[13px] appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                  <option value="Designer">Designer Department</option>
                  <option value="Sales">Sales Network</option>
                  <option value="Maintenance">Maintenance Crew</option>
                </select>
              </div>
            )}

            <div className="pt-4">
              <button disabled={isSubmitting} type="submit" className="w-full bg-[#1a7a48] hover:bg-[#15633a] text-white font-bold py-3.5 rounded-lg shadow-lg shadow-emerald-900/10 transition-all active:scale-95 flex items-center justify-center gap-2 text-[13px]">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : modalMode === 'create' ? 'INITIALIZE REGISTRATION' : 'UPDATE USER PROFILE'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default UserListPage;
