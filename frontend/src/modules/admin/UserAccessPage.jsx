import React, { useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import UserAccessModal from './components/UserAccessModal';
import { useUsers } from '../../hooks/useUsers';
import { usePermissions } from '../../hooks/useRoles';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ShieldCheck, LockKeyhole, Search } from 'lucide-react';

const UserAccessPage = () => {
  const { hasPermission } = useAuth();
  const { data: usersData, isLoading } = useUsers({ limit: 1000 }); // Fetch all users or a large limit
  const users = usersData?.data || [];
  const { data: permissionsList } = usePermissions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState('');

  const baseUsers = users?.filter(u => u.role_name !== 'Admin') || [];
  const uniqueRoles = [...new Set(baseUsers.map(u => u.role_name))];

  const filteredUsers = baseUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter ? user.role_name === roleFilter : true;
    const matchesAccess = accessFilter ? 
      (accessFilter === 'custom' ? user.has_custom_permissions : !user.has_custom_permissions) : true;
    
    return matchesSearch && matchesRole && matchesAccess;
  });

  const handleManageAccess = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const columns = [
    { 
      key: 'user', 
      label: 'Personnel', 
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img 
              src={row.image_url.startsWith('http') ? row.image_url : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/${row.image_url.startsWith('/') ? row.image_url.substring(1) : row.image_url}`} 
              alt={row.full_name} 
              className="w-10 h-10 rounded-full object-cover border-2 border-[var(--border-color)]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-black uppercase text-sm border-2 border-[var(--accent)]/20">
              {row.full_name.substring(0, 2)}
            </div>
          )}
          <div>
            <div className="font-bold text-[var(--text-main)] capitalize">{row.full_name}</div>
            <div className="text-[11px] text-[var(--text-dim)]">{row.email}</div>
          </div>
        </div>
      ) 
    },
    { 
      key: 'role_name', 
      label: 'Assigned Role',
      render: (row) => (
        <span className="font-bold text-[12px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-workspace)] px-3 py-1 rounded-full border border-[var(--border-color)]">
          {row.role_name}
        </span>
      )
    },
    { 
      key: 'access_type', 
      label: 'Access Type', 
      render: (row) => {
        // We will assume row.has_custom_permissions is passed from backend if available
        // If it's not present directly in the users list, we might just default to indicating they need to click to view
        const hasCustom = row.has_custom_permissions;
        
        return hasCustom ? (
          <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full w-fit border border-amber-500/20">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">Custom Override</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-full w-fit border border-[var(--accent)]/20">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">Inherited from Role</span>
          </div>
        );
      } 
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto pb-12 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <LockKeyhole className="text-[var(--accent)] md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform duration-300" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              User Access Control
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Override inherited role permissions for specific users
            </p>
          </div>
        </div>
      </div>

      <div className="workspace-card p-3.5 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl md:rounded-[32px] mb-6">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search personnel by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-4 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
          />
        </div>

        <div className="relative min-w-[160px] md:w-auto w-full">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black tracking-wider text-[var(--text-main)] uppercase cursor-pointer shadow-sm hover:border-[var(--accent)]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundSize: '1.2em',
              backgroundPosition: 'right 0.6rem center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <option value="">ALL ROLES</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{role.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="relative min-w-[160px] md:w-auto w-full">
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
            className="w-full appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black tracking-wider text-[var(--text-main)] uppercase cursor-pointer shadow-sm hover:border-[var(--accent)]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundSize: '1.2em',
              backgroundPosition: 'right 0.6rem center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <option value="">ALL ACCESS TYPES</option>
            <option value="inherited">INHERITED FROM ROLE</option>
            <option value="custom">CUSTOM OVERRIDE</option>
          </select>
        </div>
      </div>

      <div className="workspace-card p-6 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl md:rounded-[32px] overflow-hidden relative shadow-sm">
        <DataTable
          columns={columns}
          data={filteredUsers}
          loading={isLoading}
          onView={handleManageAccess}
        />
      </div>

      <UserAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedUser={selectedUser}
        permissionsList={permissionsList}
      />
    </div>
  );
};

export default UserAccessPage;
