import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, createUser, updateUser, deleteUser, getAdminStats, getTeams } from '../../api/admin';
import DataTable from '../../components/shared/DataTable';
import RoleBadge from '../../components/shared/RoleBadge';
import Modal from '../../components/shared/Modal';
import { Search, Plus, Loader2, User, Mail, Shield, Calendar, Users, PenTool, ShoppingBag, Wrench, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

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
    if (initialRole === 'Designer') return <PenTool className="text-[var(--accent)]" />;
    if (initialRole === 'Sales') return <ShoppingBag className="text-[var(--accent)]" />;
    if (initialRole === 'Maintenance') return <Wrench className="text-[var(--accent)]" />;
    return <Users className="text-[var(--accent)]" />;
  };

  const StatCard = ({ title, count, icon: Icon, to }) => {
    const roleStyles = {
      Designers: {
        accent: 'var(--accent)',
      },
      Sales: {
        accent: 'var(--badge-sales-text)',
      },
      Maintenance: {
        accent: 'var(--badge-maint-text)',
      },
      Teams: {
        accent: 'var(--badge-teams-text)',
      }
    };

    const style = roleStyles[title] || roleStyles.Teams;

    return (
      <div
        onClick={() => navigate(to)}
        className="workspace-card p-6 flex items-center justify-between group cursor-pointer overflow-hidden relative border border-[var(--border-color)] bg-[var(--bg-card)] transition-all duration-300 hover:shadow-lg"
      >
        {/* Subtle Side Accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: style.accent }} />

        <div className="space-y-1 relative z-10">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{title}</p>
          <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight group-hover:text-[var(--accent)] transition-colors duration-300">{count}</h3>
        </div>

        <div 
          className="p-4 rounded-2xl transition-all duration-400 relative z-10 group-hover:scale-110 group-hover:rotate-6"
          style={{ background: 'var(--nav-hover)' }}
        >
          <Icon size={24} style={{ color: style.accent }} strokeWidth={2.5} />
        </div>

        {/* Subtle Background Glow on Hover */}
        <div 
          className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500" 
          style={{ background: style.accent }} 
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            {React.cloneElement(getRoleIcon(), { size: 24, className: "md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform duration-300" })}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              {initialRole ? (initialRole === 'Sales' ? initialRole : `${initialRole}s`) : 'User Personnel'}
            </h1>

            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Operational Records and Access Management
            </p>
          </div>
        </div>

        {!initialRole && (
          <button
            onClick={handleOpenCreate}
            className="btn-primary shadow-lg px-8 py-3 group"
            style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] md:text-[14px]">Add New Personnel</span>
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

      <div className="workspace-card p-4 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search personnel by name, email or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
            {filteredUsers.length} Users Found
          </div>
        </div>

        {!initialRole && (
          <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-1 rounded-xl shadow-inner whitespace-nowrap">
            {['', 'Designer', 'Sales', 'Maintenance'].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-5 py-2 rounded-lg text-[11px] font-black transition-all duration-300 tracking-wider ${roleFilter === role
                    ? 'bg-[var(--accent)] text-white shadow-lg'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
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
        title={modalMode === 'create' ? 'Add Personnel' : modalMode === 'edit' ? 'Update User Profile' : 'Personnel Details'}
      >
        {modalMode === 'view' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-5 p-4 bg-[var(--bg-workspace)] rounded-2xl border-[0.5px] border-[var(--border-color)]">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl border transition-all"
                style={{ background: 'var(--nav-hover)', color: 'var(--accent)', borderColor: 'var(--border-color)' }}
              >
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
                <div 
                  className="p-2.5 rounded-lg group-hover:scale-110 transition-transform"
                  style={{ background: 'var(--nav-hover)', color: 'var(--accent)' }}
                >
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Email Address</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">{selectedUser?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                <div 
                  className="p-2.5 rounded-lg group-hover:scale-110 transition-transform"
                  style={{ background: 'var(--nav-hover)', color: 'var(--accent)' }}
                >
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Joined Date</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">{new Date(selectedUser?.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                </div>
              </div>

              {selectedUser?.team_name && (
                <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                  <div 
                    className="p-2.5 rounded-lg group-hover:scale-110 transition-transform"
                    style={{ background: 'var(--nav-hover)', color: 'var(--accent)' }}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Assigned Team</p>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{selectedUser.team_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-full font-bold py-3.5 rounded-lg transition-all active:scale-95 text-[13px] uppercase tracking-widest border border-[var(--border-color)] hover:bg-[var(--nav-hover)]"
                style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
              >
                Close Profile
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <input {...register('full_name', { required: 'Name is required' })} autoComplete="off" className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)]" placeholder="e.g. John Doe" />
              {errors.full_name && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <input {...register('email', { required: 'Email is required' })} type="email" autoComplete="off" className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)]" placeholder="john@procore.sys" />
              {errors.email && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.email.message}</p>}
            </div>

            {modalMode === 'create' && (
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Password</label>
                <input {...register('password', { required: 'Password is required' })} type="password" autoComplete="new-password" className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)]" placeholder="••••••••" />
                {errors.password && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.password.message}</p>}
              </div>
            )}

            {!initialRole && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Department</label>
                  <select {...register('role_name', { required: 'Role is required' })} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] appearance-none text-[var(--text-main)] cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                    <option value="Designer">Designer Department</option>
                    <option value="Sales">Sales Network</option>
                    <option value="Maintenance">Maintenance Crew</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Assign to Team (Optional)</label>
                  <select {...register('team_id')} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] appearance-none text-[var(--text-main)] cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
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
              <button 
                disabled={isSubmitting} 
                type="submit" 
                className="btn-primary w-full py-3.5 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-[13px]"
                style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : modalMode === 'create' ? 'REGISTER PERSONNEL' : 'UPDATE USER PROFILE'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default UserListPage;
