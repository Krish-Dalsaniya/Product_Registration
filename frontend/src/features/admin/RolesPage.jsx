import React, { useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import RoleModal from './components/RoleModal';
import { useRoles, usePermissions, useDeleteRole } from '../../hooks/useRoles';
import { Plus, Shield } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

const RolesPage = () => {
  const { hasPermission } = useAuth();
  const { data: roles, isLoading } = useRoles();
  const { data: permissionsList } = usePermissions();
  const deleteMutation = useDeleteRole();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [modalMode, setModalMode] = useState('create');

  const handleEdit = (role) => {
    setEditingItem(role);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (role) => {
    setEditingItem(role);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (role) => {
    if (role.role_id === 1) {
      Swal.fire('Error', 'Cannot delete the Admin role.', 'error');
      return;
    }
    
    const result = await Swal.fire({
      title: 'Delete Role?',
      text: `Are you sure you want to delete ${role.role_name}? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete'
    });

    if (result.isConfirmed) {
      try {
        await deleteMutation.mutateAsync(role.role_id);
        Swal.fire('Deleted!', 'Role has been deleted.', 'success');
      } catch (err) {
        Swal.fire('Error', err.response?.data?.error?.message || 'Failed to delete role.', 'error');
      }
    }
  };

  const columns = [
    { key: 'role_name', label: 'Role Name', render: (row) => (
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <Shield size={16} />
        </div>
        <span className="font-bold">{row.role_name}</span>
      </div>
    ) },
    { key: 'description', label: 'Description' },
    { key: 'permissions', label: 'Permissions Count', render: (row) => (
      <span className="px-3 py-1 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-full text-[10px] font-black uppercase tracking-wider text-[var(--text-main)]">
        {row.permissions ? row.permissions.length : 0} Permissions
      </span>
    ) }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight">Access Control</h1>
          <p className="text-[13px] font-bold text-[var(--text-dim)] uppercase tracking-widest mt-1">Manage Roles and Permissions</p>
        </div>
        {hasPermission('roles', 'create') && (
          <button
            onClick={() => { setEditingItem(null); setModalMode('create'); setIsModalOpen(true); }}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={16} strokeWidth={3} />
            <span>New Role</span>
          </button>
        )}
      </div>

      <div className="workspace-card p-6 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl md:rounded-[32px] overflow-hidden relative">
        <DataTable
          columns={columns}
          data={roles?.filter(r => r.role_id !== 1 && r.role_name !== 'Admin') || []}
          loading={isLoading}
          onView={handleView}
          onEdit={hasPermission('roles', 'edit') ? handleEdit : undefined}
          onDelete={hasPermission('roles', 'delete') ? handleDelete : undefined}
          rowKey="role_id"
        />
      </div>

      {isModalOpen && (
        <RoleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingItem={editingItem}
          modalMode={modalMode}
          permissionsList={permissionsList}
        />
      )}
    </div>
  );
};

export default RolesPage;
