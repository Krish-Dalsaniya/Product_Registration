import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, createUser, updateUser, deleteUser, getAdminStats, getTeams } from '../../api/admin';
import DataTable from '../../components/shared/DataTable';
import RoleBadge from '../../components/shared/RoleBadge';
import Modal from '../../components/shared/Modal';
import { Search, Plus, Loader2, User, Mail, Shield, Calendar, Users, PenTool, ShoppingBag, Wrench, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../components/shared/Breadcrumbs';

const UserListPage = ({ initialRole = '' }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ designers: 0, sales: 0, maintenance: 0, teams: 0 });
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [searchTerm, setSearchTerm] = useState('');
  const [teams, setTeams] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const selectedRole = watch('role_name');

  useEffect(() => {
    setRoleFilter(initialRole);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [initialRole]);
  
  const fetchStats = async () => {
    try {
      const res = await getAdminStats();
      setStats(res.data.data);
      const teamsRes = await getTeams();
      setTeams(teamsRes.data.data);
    } catch (error) {
      console.error('Stats fetch error', error);
    }
  };

  useEffect(() => {
    if (!initialRole) {
      fetchStats();
    }
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
        await updateUser(selectedUser.user_id, data);
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
    reset({ full_name: '', email: '', password: '', role_name: initialRole || 'Designer', team_id: '' });
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
    reset({ 
      full_name: user.full_name, 
      email: user.email, 
      role_name: user.role_name, 
      team_id: user.team_id || '' 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete "${user.full_name}"? This will also remove their profile records.`)) return;
    try {
      await deleteUser(user.user_id);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
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
    if (initialRole === 'Designer') return <PenTool className="text-blue-600" />;
    if (initialRole === 'Sales') return <ShoppingBag className="text-blue-600" />;
    if (initialRole === 'Maintenance') return <Wrench className="text-blue-600" />;
    return <Users className="text-blue-600" />;
  };

  const StatCard = ({ title, count, icon: Icon, to }) => {
    const roleColors = {
      Designers: { 
        bg: 'bg-[var(--stat-designer-bg)]', 
        text: 'text-[var(--stat-designer-text)]', 
        iconBg: 'bg-[var(--stat-designer-text)]/10', 
        iconColor: 'text-[var(--stat-designer-icon)]',
        border: 'border-[var(--stat-designer-text)]/20'
      },
      Sales: { 
        bg: 'bg-[var(--stat-sales-bg)]', 
        text: 'text-[var(--stat-sales-text)]', 
        iconBg: 'bg-[var(--stat-sales-text)]/10', 
        iconColor: 'text-[var(--stat-sales-icon)]',
        border: 'border-[var(--stat-sales-text)]/20'
      },
      Maintenance: { 
        bg: 'bg-[var(--stat-maint-bg)]', 
        text: 'text-[var(--stat-maint-text)]', 
        iconBg: 'bg-[var(--stat-maint-text)]/10', 
        iconColor: 'text-[var(--stat-maint-icon)]',
        border: 'border-[var(--stat-maint-text)]/20'
      },
      Teams: { 
        bg: 'bg-[var(--bg-card)]', 
        text: 'text-[var(--text-main)]', 
        iconBg: 'bg-[var(--bg-workspace)]', 
        iconColor: 'text-[var(--text-muted)]',
        border: 'border-[var(--border-color)]'
      }
    };

    const style = roleColors[title] || roleColors.Teams;

    return (
      <div 
        onClick={() => navigate(to)}
        className={`${style.bg} p-5 rounded-2xl border-[0.5px] ${style.border} shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group active:scale-[0.98] flex items-center justify-between`}
      >
        <div className="space-y-1">
          <p className={`text-[10px] font-bold ${style.text} opacity-70 uppercase tracking-[0.2em]`}>{title}</p>
          <h3 className={`text-2xl font-black ${style.text} tracking-tighter`}>{count}</h3>
        </div>
        <div className={`p-3.5 rounded-xl ${style.iconBg} group-hover:scale-110 transition-all duration-300`}>
          <Icon size={22} className={`${style.iconColor}`} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <Breadcrumbs items={[
        { label: 'Users', path: '/admin/users', active: !initialRole },
        ...(initialRole ? [{ label: initialRole, active: true }] : [])
      ]} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Brand Icon Box matching Image Style */}
          <div className="p-4 bg-[var(--bg-card)] border-[0.5px] border-[var(--border-color)] rounded-xl shadow-sm">
            {getRoleIcon()}
          </div>
          <div>
            <h1 className="text-[26px] font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">
              {initialRole ? (initialRole === 'Sales' ? initialRole : `${initialRole}s`) : 'Users'}
            </h1>

            <p className="text-[12px] text-[var(--text-muted)] font-bold mt-1.5 uppercase tracking-[0.15em]">
              OPERATIONAL RECORDS AND USER MANAGEMENT
            </p>
          </div>
        </div>
        
        {!initialRole && (
          <button 
            onClick={handleOpenCreate} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-blue-900/10 transition-all active:scale-95 flex items-center gap-2 text-[13px]"
          >
            <Plus size={18} />
            <span>Add New User</span>
          </button>
        )}
      </div>

      {!initialRole && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Designers" count={stats.designers} icon={PenTool} to="/admin/designers" />
          <StatCard title="Teams" count={stats.teams} icon={Users} to="/admin/teams" />
          <StatCard title="Maintenance" count={stats.maintenance} icon={Wrench} to="/admin/maintenance" />
          <StatCard title="Sales" count={stats.sales} icon={ShoppingBag} to="/admin/sales" />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-600 transition-colors" size={16} />
          <input
            type="text"
            placeholder="Filter records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg py-2.5 pl-10 pr-4 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px] text-[var(--text-main)]"
          />
        </div>
        
        {!initialRole && (
          <div className="flex bg-[var(--bg-card)] p-[3px] rounded-[8px] border-[0.5px] border-[var(--border-color)] shadow-sm whitespace-nowrap">
            {['', 'Designer', 'Sales', 'Maintenance'].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-4 py-1.5 rounded-[6px] text-[11px] font-bold transition-all tracking-tight ${
                  roleFilter === role 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
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
        onDelete={handleDelete}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'create' ? 'Personnel Registration' : modalMode === 'edit' ? 'Update User Profile' : 'Personnel Details'}
      >
        {modalMode === 'view' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-5 p-4 bg-[var(--bg-workspace)] rounded-2xl border-[0.5px] border-[var(--border-color)]">
              <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold text-2xl border border-blue-600/20">
                {selectedUser?.full_name?.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-black text-[var(--text-main)] tracking-tight">{selectedUser?.full_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={selectedUser?.role_name} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg group-hover:scale-110 transition-transform"><Mail size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Email Address</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">{selectedUser?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-lg group-hover:scale-110 transition-transform"><Calendar size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Joined Date</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">{new Date(selectedUser?.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                </div>
              </div>

              {selectedUser?.team_name && (
                <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                  <div className="p-2.5 bg-green-500/10 text-green-500 rounded-lg group-hover:scale-110 transition-transform"><Users size={18} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Assigned Team</p>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{selectedUser.team_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button onClick={() => setIsModalOpen(false)} className="w-full bg-[var(--text-main)] hover:bg-black text-[var(--bg-card)] font-bold py-3.5 rounded-lg transition-all active:scale-95 text-[13px] uppercase tracking-widest">Close Profile</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <input {...register('full_name', { required: 'Name is required' })} autoComplete="off" className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px] text-[var(--text-main)]" placeholder="e.g. John Doe" />
              {errors.full_name && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <input {...register('email', { required: 'Email is required' })} type="email" autoComplete="off" className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px] text-[var(--text-main)]" placeholder="john@procore.sys" />
              {errors.email && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.email.message}</p>}
            </div>

            {modalMode === 'create' && (
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Password</label>
                <input {...register('password', { required: 'Password is required' })} type="password" autoComplete="new-password" className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px] text-[var(--text-main)]" placeholder="••••••••" />
                {errors.password && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.password.message}</p>}
              </div>
            )}

            {!initialRole && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Department</label>
                  <select {...register('role_name', { required: 'Role is required' })} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px] appearance-none text-[var(--text-main)]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                    <option value="Designer">Designer Department</option>
                    <option value="Sales">Sales Network</option>
                    <option value="Maintenance">Maintenance Crew</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Assign to Team (Optional)</label>
                  <select {...register('team_id')} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px] appearance-none text-[var(--text-main)]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                    <option value="">No Team Assignment</option>
                    {teams
                      .filter(t => !selectedRole || t.role_name === selectedRole)
                      .map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)
                    }
                  </select>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-900/10 transition-all active:scale-95 flex items-center justify-center gap-2 text-[13px]">
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
