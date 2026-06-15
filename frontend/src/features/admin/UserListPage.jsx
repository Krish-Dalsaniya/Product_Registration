import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers, useAdminStats, useCreateUser, useUpdateUser, useDeleteUser, useRemoveUserImage, useResetUser2FA, useResetUserPassword } from '../../hooks/useUsers';
import { useTeams } from '../../hooks/useTeams';
import { useRoles, usePermissions } from '../../hooks/useRoles';
import DataTable from '../../components/shared/DataTable';
import RoleBadge from '../../components/shared/RoleBadge';
import Modal from '../../components/shared/Modal';
import UserAccessModal from './components/UserAccessModal';
import { Search, Plus, Loader2, User, Mail, Phone, Shield, Calendar, Users, PenTool, ShoppingBag, Wrench, Trash2, ChevronDown, ChevronRight, LayoutGrid, List, Building, Briefcase, Eye, EyeOff, Key } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useDispatch, useStore } from 'react-redux';
import { saveDraft, clearDraft } from '../../store/slices/draftSlice';
import toast from 'react-hot-toast';
import { useDebounce } from '../../hooks/useDebounce';
import Swal from 'sweetalert2';
import UserGridView from './components/user/UserGridView';
import ViewToggle from '../../components/shared/ViewToggle';
import { useAuth } from '../../context/AuthContext';

const UserListPage = ({ initialRole = '' }) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [viewMode, setViewMode] = useState('grid');
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [companyFilter, setCompanyFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const queryParams = {
    page: pagination.page,
    limit: pagination.limit,
    role: roleFilter || undefined,
    company: companyFilter || undefined
  };

  const { data: usersData, isLoading: usersLoading } = useUsers(queryParams);
  const { data: statsData } = useAdminStats();
  const { data: teamsData } = useTeams();
  const { data: rolesData } = useRoles();
  const { data: permissionsList } = usePermissions();

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const removeUserImageMutation = useRemoveUserImage();
  const resetUser2FAMutation = useResetUser2FA();
  const resetUserPasswordMutation = useResetUserPassword();

  const users = usersData?.data || [];
  const loading = usersLoading;
  const stats = statsData?.data || { designers: 0, sales: 0, maintenance: 0, teams: 0, designerTeams: 0, salesTeams: 0, maintenanceTeams: 0 };
  const teams = teamsData?.data || [];

  useEffect(() => {
    if (usersData?.meta) {
      setPagination(prev => ({ ...prev, total: usersData.meta.total }));
    }
  }, [usersData?.meta]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const selectedRole = watch('role_name');
  
  const dispatch = useDispatch();
  const store = useStore();

  const formId = React.useMemo(() => {
    if (!isModalOpen || modalMode === 'view') return null;
    return modalMode === 'create' 
      ? `user_create` 
      : `user_edit_${selectedUser?.user_id || 'unknown'}`;
  }, [isModalOpen, modalMode, selectedUser]);

  useEffect(() => {
    if (!formId || !isModalOpen) return;
    
    const subscription = watch((value) => {
      if (value && Object.keys(value).length > 0) {
        dispatch(saveDraft({ formId, data: value }));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formId, dispatch, isModalOpen]);

  useEffect(() => {
    setRoleFilter(initialRole);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [initialRole]);

  const onSubmit = async (data) => {
    if (modalMode === 'view') return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('full_name', data.full_name);
      formData.append('email', data.email);
      if (data.mobile_number) formData.append('mobile_number', data.mobile_number);
      if (data.password) formData.append('password', data.password);
      if (data.company !== undefined) formData.append('company', data.company);
      if (data.designation !== undefined) formData.append('designation', data.designation);
      
      const finalRoleName = data.role_name || (modalMode === 'edit' ? selectedUser?.role_name : (initialRole || 'Designer'));
      formData.append('role_name', finalRoleName);
      
      formData.append('team_ids', JSON.stringify(selectedTeamIds));
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (modalMode === 'create') {
        await createUserMutation.mutateAsync(formData);
        toast.success('User created successfully!');
      } else {
        await updateUserMutation.mutateAsync({ id: selectedUser.user_id, data: formData });
        toast.success('User updated successfully!');
      }
      setIsModalOpen(false);
      reset();
      if (formId) {
        dispatch(clearDraft({ formId }));
      }
      setSelectedTeamIds([]);
      setIsDropdownOpen(false);
      setTeamSearch('');
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setSelectedTeamIds([]);
    setIsDropdownOpen(false);
    setTeamSearch('');
    setImageFile(null);
    setImagePreview(null);
    
    const draftId = 'user_create';
    const draft = store.getState().drafts[draftId];
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
    } else {
      reset({ full_name: '', email: '', mobile_number: '', password: '', role_name: initialRole || 'Designer', company: '', designation: '' });
    }
    
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
    const currentTeamIds = Array.isArray(user.teams) ? user.teams.map(t => t.team_id) : [];
    setSelectedTeamIds(currentTeamIds);
    setIsDropdownOpen(false);
    setTeamSearch('');
    setImageFile(null);
    if (user.image_url || user.profile_image_url) {
       const u = user.image_url || user.profile_image_url;
       setImagePreview(u.startsWith('http') ? u : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/${u.startsWith('/') ? u.substring(1) : u}`);
    } else {
       setImagePreview(null);
    }
    const resetData = {
      full_name: user.full_name,
      email: user.email,
      mobile_number: user.mobile_number || '',
      role_name: user.role_name,
      company: user.company || '',
      designation: user.designation || ''
    };
    const draftId = `user_edit_${user.user_id}`;
    const draft = store.getState().drafts[draftId];
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
    } else {
      reset(resetData);
    }
    
    setIsModalOpen(true);
  };

  const handleRemoveImage = async () => {
    if (!selectedUser?.user_id) return;
    
    const confirm = await Swal.fire({
      title: 'Remove Profile Picture?',
      text: "This will permanently delete the current profile picture.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, remove it!'
    });

    if (confirm.isConfirmed) {
      try {
        await removeUserImageMutation.mutateAsync(selectedUser.user_id);
        setImagePreview(null);
        setImageFile(null);
        setSelectedUser(prev => ({ ...prev, image_url: null }));
        toast.success('Image removed successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to remove image');
      }
    }
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete "${user.full_name}"? This will also remove their profile records.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteUserMutation.mutateAsync(user.user_id);
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleReset2FA = async (user) => {
    const result = await Swal.fire({
      title: 'Reset 2FA Configuration?',
      text: `This will clear the 2FA settings for "${user.full_name}" and force them to re-configure it on their next login. Are you sure?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, reset 2FA'
    });
    if (!result.isConfirmed) return;
    try {
      await resetUser2FAMutation.mutateAsync(user.user_id);
      toast.success('2FA configuration reset successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to reset 2FA');
    }
  };

  const handleResetPassword = async (user) => {
    const result = await Swal.fire({
      title: 'Reset Password?',
      text: `This will reset the password for "${user.full_name}" to a randomly generated temporary password. The password will be emailed to them and shown to you. Are you sure?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, reset password'
    });
    if (!result.isConfirmed) return;
    try {
      const res = await resetUserPasswordMutation.mutateAsync(user.user_id);
      Swal.fire({
        title: 'Password Reset Successful',
        html: `The temporary password for <strong>${user.full_name}</strong> is:<br/><br/><strong style="font-size: 1.5rem; padding: 10px 20px; background: #f1f5f9; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; margin-top: 10px; color: #334155">${res.data.data.tempPassword}</strong><br/><br/>It has also been emailed to them.`,
        icon: 'success'
      });
    } catch (error) {
      toast.error(error.message || 'Failed to reset password');
    }
  };

  const columns = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email Address' },
    {
      key: 'company',
      label: 'Company',
      render: (row) => row.company ? <span className="text-[12px] font-semibold">{row.company}</span> : <span className="text-[11px] text-[var(--text-muted)] italic">N/A</span>
    },
    {
      key: 'designation',
      label: 'Designation',
      render: (row) => row.designation ? <span className="text-[12px]">{row.designation}</span> : <span className="text-[11px] text-[var(--text-muted)] italic">N/A</span>
    },
    {
      key: 'role_name',
      label: 'Role Assignment',
      render: (row) => <RoleBadge role={row.role_name} />
    },
    {
      key: 'teams',
      label: 'Assigned Teams',
      render: (row) => {
        const userTeams = Array.isArray(row.teams) ? row.teams : [];
        if (userTeams.length === 0) {
          return <span className="text-[11px] text-[var(--text-muted)] font-medium">No Teams</span>;
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-[300px]">
            {userTeams.map(t => (
              <span key={t.team_id} className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[var(--nav-hover)] text-[var(--accent)] border border-[var(--border-color)]">
                {t.team_name}
              </span>
            ))}
          </div>
        );
      }
    },
  ];


  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = teamFilter ? u.teams?.some(t => t.team_id.toString() === teamFilter) : true;
    return matchesSearch && matchesTeam;
  });

  const getRoleIcon = () => {
    if (initialRole === 'Designer') return <PenTool className="text-[var(--accent)]" />;
    if (initialRole === 'Sales') return <ShoppingBag className="text-[var(--accent)]" />;
    if (initialRole === 'Maintenance') return <Wrench className="text-[var(--accent)]" />;
    return <Users className="text-[var(--accent)]" />;
  };

  const StatCard = ({ title, count, icon: Icon, to }) => {
    const roleStyles = {
      Designers: {
        accentBg: 'var(--badge-admin-bg)',
        accentText: 'var(--accent)',
      },
      Sales: {
        accentBg: 'var(--badge-sales-bg)',
        accentText: 'var(--badge-sales-text)',
      },
      Maintenance: {
        accentBg: 'var(--badge-maint-bg)',
        accentText: 'var(--badge-maint-text)',
      },
      Teams: {
        accentBg: 'var(--badge-teams-bg)',
        accentText: 'var(--badge-teams-text)',
      }
    };

    const style = roleStyles[title] || roleStyles.Teams;
    // Map team variations to use the base role style
    if (title.includes('Designer Teams')) { style.accentBg = roleStyles.Teams.accentBg; style.accentText = roleStyles.Teams.accentText; }
    else if (title.includes('Sales Teams')) { style.accentBg = roleStyles.Teams.accentBg; style.accentText = roleStyles.Teams.accentText; }
    else if (title.includes('Maintenance Teams')) { style.accentBg = roleStyles.Teams.accentBg; style.accentText = roleStyles.Teams.accentText; }

    return (
      <div
        onClick={() => navigate(to)}
        className="workspace-card px-4 py-3 border border-[var(--border-color)] group cursor-pointer hover:shadow-md transition-all duration-300 outline-none"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-bold tracking-wider text-[var(--text-muted)] mb-0.5">{title}</p>
            <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
              {loading ? '...' : count}
            </h3>
          </div>
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
            style={{ background: style.accentBg, color: style.accentText }}
          >
            <Icon size={18} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 group/link">
          <span className="text-[11px] font-bold tracking-wide text-[var(--accent)]">View details</span>
          <ChevronRight size={14} className="text-[var(--accent)] transition-transform duration-300 group-hover/link:translate-x-1" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            {React.cloneElement(getRoleIcon(), { size: 24, className: "md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform duration-300" })}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">
              {initialRole ? (initialRole === 'Sales' ? initialRole : `${initialRole}s`) : 'User Personnel'}
            </h1>

            {/* <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Operational Records and Access Management
            </p> */}
          </div>
        </div>

        {!initialRole && hasPermission('users', 'create') && (
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



      <div className="workspace-card p-3.5 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search personnel by name, email or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
            {filteredUsers.length} Users Found
          </div>
        </div>

        {!initialRole && (
          <div className="relative min-w-[160px] md:w-auto w-full">
            <select
              value={roleFilter || ''}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black tracking-wider text-[var(--text-main)] uppercase cursor-pointer shadow-sm hover:border-[var(--accent)]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundSize: '1.2em',
                backgroundPosition: 'right 0.6rem center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <option value="">ALL ROLES</option>
              {(rolesData?.map(r => r.role_name) || [])
                .map((role) => (
                  <option key={role} value={role}>
                    {role.toUpperCase()}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="relative min-w-[160px] md:w-auto w-full">
          <select
            value={companyFilter || ''}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="w-full appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black tracking-wider text-[var(--text-main)] uppercase cursor-pointer shadow-sm hover:border-[var(--accent)]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundSize: '1.2em',
              backgroundPosition: 'right 0.6rem center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <option value="">ALL COMPANIES</option>
            <option value="SmarTec">SMARTEC</option>
            <option value="Illuminated Minds">ILLUMINATED MINDS</option>
            <option value="NAF Media">NAF MEDIA</option>
            <option value="Peg-IT Healthcare">PEG-IT HEALTHCARE</option>
            <option value="Leons Integration">LEONS INTEGRATION</option>
            <option value="Crudex Controls">CRUDEX CONTROLS</option>
          </select>
        </div>

        <div className="relative min-w-[160px] md:w-auto w-full">
          <select
            value={teamFilter || ''}
            onChange={(e) => {
              setTeamFilter(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="w-full appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black tracking-wider text-[var(--text-main)] uppercase cursor-pointer shadow-sm hover:border-[var(--accent)]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundSize: '1.2em',
              backgroundPosition: 'right 0.6rem center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <option value="">ALL TEAMS</option>
            {teamsData?.data?.map(team => (
              <option key={team.team_id} value={team.team_id.toString()}>
                {team.team_name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredUsers}
          loading={loading}
          totalCount={pagination.total}
          filteredCount={filteredUsers.length}
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
          onView={handleView}
          onEdit={hasPermission('users', 'edit') ? handleEdit : undefined}
          onDelete={hasPermission('users', 'delete') ? handleDelete : undefined}
        />
      ) : (
        <UserGridView
          users={filteredUsers}
          onView={handleView}
          onEdit={hasPermission('users', 'edit') ? handleEdit : undefined}
          onDelete={hasPermission('users', 'delete') ? handleDelete : undefined}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Add Personnel' : modalMode === 'edit' ? 'Update User Profile' : 'Personnel Details'}
        maxWidth="max-w-2xl"
        headerActions={modalMode !== 'view' && (
          <button
            form="user-form"
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2 px-6 shadow-md flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
            style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save User' : 'Update User')}
          </button>
        )}
      >
        {modalMode === 'view' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-5 p-4 bg-[var(--bg-workspace)] rounded-2xl border-[0.5px] border-[var(--border-color)]">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center border-2 overflow-hidden transition-all bg-[var(--bg-card)] shadow-sm group"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {(() => {
                  const defaultAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser?.full_name)}&backgroundColor=3d6a7d,0f172a&textColor=ffffff`;
                  const avatarUrl = (selectedUser?.image_url || selectedUser?.profile_image_url)
                    ? (selectedUser.image_url || selectedUser.profile_image_url).startsWith('http') 
                        ? (selectedUser.image_url || selectedUser.profile_image_url) 
                        : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/${(selectedUser.image_url || selectedUser.profile_image_url).startsWith('/') ? (selectedUser.image_url || selectedUser.profile_image_url).substring(1) : (selectedUser.image_url || selectedUser.profile_image_url)}`
                    : defaultAvatarUrl;
                  
                  return (
                    <img 
                      src={avatarUrl} 
                      alt={selectedUser?.full_name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  );
                })()}
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

              {selectedUser?.mobile_number && (
                <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                  <div 
                    className="p-2.5 rounded-lg group-hover:scale-110 transition-transform"
                    style={{ background: 'var(--nav-hover)', color: 'var(--accent)' }}
                  >
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Mobile Number</p>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{selectedUser.mobile_number}</p>
                  </div>
                </div>
              )}

              {selectedUser?.company && (
                <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                  <div 
                    className="p-2.5 rounded-lg group-hover:scale-110 transition-transform"
                    style={{ background: 'var(--nav-hover)', color: 'var(--accent)' }}
                  >
                    <Building size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Company</p>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{selectedUser.company}</p>
                  </div>
                </div>
              )}

              {selectedUser?.designation && (
                <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                  <div 
                    className="p-2.5 rounded-lg group-hover:scale-110 transition-transform"
                    style={{ background: 'var(--nav-hover)', color: 'var(--accent)' }}
                  >
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Designation</p>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{selectedUser.designation}</p>
                  </div>
                </div>
              )}

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

              {selectedUser?.teams && selectedUser.teams.length > 0 && (
                <div className="flex items-center gap-4 p-3 hover:bg-[var(--bg-workspace)] transition-colors rounded-xl group">
                  <div 
                    className="p-2.5 rounded-lg group-hover:scale-110 transition-transform"
                    style={{ background: 'var(--nav-hover)', color: 'var(--accent)' }}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Assigned Teams</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedUser.teams.map(t => (
                        <span key={t.team_id} className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--nav-hover)] text-[var(--accent)] border border-[var(--border-color)]">
                          {t.team_name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 space-y-3">

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
          <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-[var(--border-color)] overflow-hidden flex items-center justify-center bg-[var(--bg-workspace)] mb-2 group">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="text-[var(--text-muted)] opacity-50" size={32} />
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-[10px] font-bold uppercase tracking-widest text-center px-2">Click to Upload</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setImageFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setImagePreview(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Profile Picture</p>
                {modalMode === 'edit' && selectedUser?.image_url && (
                  <button 
                    type="button" 
                    onClick={handleRemoveImage}
                    className="text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

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

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Mobile Number</label>
              <input 
                {...register('mobile_number', { 
                  required: 'Mobile Number is required',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Mobile Number must be exactly 10 digits'
                  }
                })} 
                type="text" 
                maxLength="10"
                autoComplete="off" 
                className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)]" 
                placeholder="e.g. 9876543210" 
              />
              {errors.mobile_number && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.mobile_number.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Company</label>
              <select {...register('company', { required: 'Company is required' })} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] appearance-none text-[var(--text-main)] cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                <option value="">Select Company</option>
                <option value="SmarTec">SmarTec</option>
                <option value="Illuminated Minds">Illuminated Minds</option>
                <option value="NAF Media">NAF Media</option>
                <option value="Peg-IT Healthcare">Peg-IT Healthcare</option>
                <option value="Leons Integration">Leons Integration</option>
                <option value="Crudex Controls">Crudex Controls</option>
              </select>
              {errors.company && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.company.message}</p>}
            </div>

            {modalMode === 'create' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <input 
                      {...register('password', { required: 'Password is required' })} 
                      type={showPassword ? 'text' : 'password'} 
                      autoComplete="new-password" 
                      className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg pl-4 pr-10 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)]" 
                      placeholder="••••••••" 
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                  <div className="relative">
                    <input 
                      {...register('confirmPassword', { 
                        required: 'Confirm Password is required',
                        validate: value => value === watch('password') || 'Passwords do not match'
                      })} 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      autoComplete="new-password" 
                      className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg pl-4 pr-10 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)]" 
                      placeholder="••••••••" 
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            )}

            {(!initialRole || initialRole === 'Designer' || initialRole === 'Sales') && (
              <div className={!initialRole ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}>
                {!initialRole && (
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Department</label>
                    <select {...register('role_name', { required: 'Role is required' })} className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] appearance-none text-[var(--text-main)] cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                      {rolesData?.map(r => (
                        <option key={r.role_id} value={r.role_name}>{r.role_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Designation</label>
                  <input {...register('designation')} type="text" className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)]" placeholder="e.g. Embedded Engineer" />
                </div>
                <div className="relative space-y-2">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Assign to Teams</label>
                  
                  {/* Dropdown Toggle Trigger */}
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full min-h-[42px] bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)] cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                      {selectedTeamIds.length === 0 ? (
                        <span className="text-[var(--text-muted)] opacity-60">No Team Assignments</span>
                      ) : (
                        teams
                          .filter(t => selectedTeamIds.includes(t.team_id))
                          .map(t => (
                            <span 
                              key={t.team_id}
                              className="px-2 py-0.5 rounded bg-[var(--nav-hover)] text-[var(--accent)] border border-[var(--border-color)] text-[10px] font-extrabold flex items-center gap-1 group"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTeamIds(selectedTeamIds.filter(id => id !== t.team_id));
                              }}
                            >
                              {t.team_name}
                              <span className="hover:text-red-400 font-normal transition-colors text-[9px] ml-0.5">×</span>
                            </span>
                          ))
                      )}
                    </div>
                    <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''} shrink-0`} />
                  </div>

                  {/* Dropdown Options Popup */}
                  {isDropdownOpen && (
                    <>
                      {/* Invisible backdrop to capture clicks outside the dropdown */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      
                      <div className="absolute left-0 right-0 bottom-full mb-1.5 bg-[var(--bg-card)] border-[0.5px] border-[var(--border-color)] rounded-lg shadow-2xl z-50 overflow-hidden animate-scale-in max-h-48 flex flex-col">
                        {/* Search Box */}
                        <div className="p-2 border-b border-[var(--border-color)] bg-[var(--input-bg)]">
                          <input
                            type="text"
                            placeholder="Search teams..."
                            value={teamSearch}
                            onChange={(e) => setTeamSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-[var(--bg-workspace)] border-[0.5px] border-[var(--border-color)] rounded-md px-3 py-1.5 outline-none focus:border-[var(--accent)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] placeholder-opacity-50"
                          />
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto custom-scrollbar flex-1 py-1 bg-[var(--bg-card)]">
                          {teams
                            .filter(t => !selectedRole || t.role_name === selectedRole)
                            .filter(t => t.team_name.toLowerCase().includes(teamSearch.toLowerCase()))
                            .map(t => {
                              const isChecked = selectedTeamIds.includes(t.team_id);
                              return (
                                <div
                                  key={t.team_id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isChecked) {
                                      setSelectedTeamIds(selectedTeamIds.filter(id => id !== t.team_id));
                                    } else {
                                      setSelectedTeamIds([...selectedTeamIds, t.team_id]);
                                    }
                                  }}
                                  className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--nav-hover)] cursor-pointer text-xs font-semibold text-[var(--text-main)] transition-colors border-b border-[var(--border-color)] border-opacity-30 last:border-0"
                                >
                                  <span className="leading-tight">{t.team_name}</span>
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
                          {teams
                            .filter(t => !selectedRole || t.role_name === selectedRole)
                            .filter(t => t.team_name.toLowerCase().includes(teamSearch.toLowerCase()))
                            .length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)] opacity-60">
                              No matches found
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {modalMode === 'edit' && hasPermission('users', 'edit') && (
              <div className="pt-4 mt-6 border-t border-[var(--border-color)] border-opacity-50">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Admin Actions</p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleResetPassword(selectedUser)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    <Key size={16} />
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReset2FA(selectedUser)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    <Shield size={16} />
                    Reset 2FA
                  </button>
                </div>
              </div>
            )}

            {/* Submit button moved to modal header */}
          </form>
        )}
      </Modal>
      
      {isAccessModalOpen && (
        <UserAccessModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          selectedUser={selectedUser}
          permissionsList={permissionsList}
        />
      )}
    </div>
  );
};

export default UserListPage;
