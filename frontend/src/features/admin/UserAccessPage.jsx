import React, { useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import UserAccessModal from './components/UserAccessModal';
import { useUsers } from '../../hooks/useUsers';
import { usePermissions } from '../../hooks/useRoles';
import { useAuth } from '../../context/AuthContext';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

const UserAccessPage = () => {
  const { hasPermission } = useAuth();
  const { data: usersData, isLoading } = useUsers({ limit: 1000 }); // Fetch all users or a large limit
  const users = usersData?.data || [];
  const { data: permissionsList } = usePermissions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-3">
            <Shield className="text-[var(--accent)]" size={32} />
            User Access Control
          </h1>
          <p className="text-[13px] font-bold text-[var(--text-dim)] uppercase tracking-widest mt-2">
            Override inherited role permissions for specific users
          </p>
        </div>
      </div>

      <div className="workspace-card p-6 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl md:rounded-[32px] overflow-hidden relative shadow-sm">
        <DataTable
          columns={columns}
          data={users?.filter(u => u.role_name !== 'Admin') || []}
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
