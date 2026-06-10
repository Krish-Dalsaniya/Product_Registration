import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../components/shared/Modal';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateRole, useUpdateRole } from '../../../hooks/useRoles';

const MODULES = [
  { name: 'Customers' },
  { 
    name: 'Products', 
    subsections: [
      { id: 'general', name: 'General' },
      { id: 'tech_spec', name: 'Technical Specification' },
      { id: 'bom', name: 'Bill of Material' },
      { id: 'files', name: 'Files' }
    ] 
  },
  { 
    name: 'Inventory', 
    subsections: [
      { id: 'general', name: 'General' },
      { id: 'tech_spec', name: 'Technical Specification' },
      { id: 'files', name: 'Files' }
    ] 
  },
  { name: 'Sales' },
  { name: 'Support Tickets' }
];

const ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' }
];

const RoleModal = ({ isOpen, onClose, editingItem, permissionsList, modalMode }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [selectedPerms, setSelectedPerms] = useState({});
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, editingItem?.role_id]);

  useEffect(() => {
    if (isOpen && permissionsList && !isInitialized) {
      if (editingItem) {
        reset({ role_name: editingItem.role_name, description: editingItem.description || '' });
        const initialPerms = {};
        if (editingItem.permissions) {
          editingItem.permissions.forEach(pid => {
            const p = permissionsList.find(x => x.permission_id === pid);
            if (p) {
              const parts = p.permission_key.split('.');
              if (parts.length === 2) {
                const [mod, act] = parts;
                if (!initialPerms[mod]) initialPerms[mod] = {};
                initialPerms[mod][act] = true;
              } else if (parts.length === 3) {
                const [mod, sub, act] = parts;
                if (!initialPerms[mod]) initialPerms[mod] = {};
                if (!initialPerms[mod][sub]) initialPerms[mod][sub] = {};
                initialPerms[mod][sub][act] = true;
              }
            }
          });
        }
        setSelectedPerms(initialPerms);
      } else {
        reset({ role_name: '', description: '' });
        setSelectedPerms({});
      }
      setIsInitialized(true);
    }
  }, [isOpen, editingItem, reset, permissionsList, isInitialized]);

  const handleToggle = (moduleKey, actionKey, subKey = null) => {
    setSelectedPerms(prev => {
      const newPerms = { ...prev };
      
      if (!newPerms[moduleKey]) {
        newPerms[moduleKey] = {};
      } else {
        newPerms[moduleKey] = { ...newPerms[moduleKey] };
      }
      
      if (subKey) {
        if (!newPerms[moduleKey][subKey]) {
          newPerms[moduleKey][subKey] = {};
        } else {
          newPerms[moduleKey][subKey] = { ...newPerms[moduleKey][subKey] };
        }
        
        newPerms[moduleKey][subKey][actionKey] = !newPerms[moduleKey][subKey][actionKey];
      } else {
        newPerms[moduleKey][actionKey] = !newPerms[moduleKey][actionKey];
      }
      return newPerms;
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data) => {
    try {
      const permissions = [];
      if (permissionsList) {
        Object.entries(selectedPerms).forEach(([mod, val1]) => {
          Object.entries(val1).forEach(([subOrAct, val2]) => {
            if (typeof val2 === 'boolean') {
              if (val2) {
                const key = `${mod}.${subOrAct}`;
                const p = permissionsList.find(x => x.permission_key === key);
                if (p) permissions.push(p.permission_id);
              }
            } else {
              Object.entries(val2).forEach(([act, isSelected]) => {
                if (isSelected) {
                  const key = `${mod}.${subOrAct}.${act}`;
                  const p = permissionsList.find(x => x.permission_key === key);
                  if (p) permissions.push(p.permission_id);
                }
              });
            }
          });
        });
      }

      const payload = { ...data, permissions };

      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.role_id, data: payload });
        toast.success('Role updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Role created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to save role');
    }
  };

  const isView = modalMode === 'view';
  const isAdmin = editingItem && editingItem.role_id === 1;
  const isReadOnly = isAdmin || isView;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isView ? 'View Role' : (editingItem ? 'Edit Role' : 'New Role')}
      maxWidth="max-w-[1000px]"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Role Name *</label>
            <input 
              {...register('role_name', { required: 'Role name is required' })}
              disabled={isReadOnly}
              className={`w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-[var(--accent)] transition-colors ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              placeholder="e.g. Content Manager"
            />
            {errors.role_name && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider ml-1">{errors.role_name.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Description</label>
            <input 
              {...register('description')}
              disabled={isReadOnly}
              className={`w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:border-[var(--accent)] transition-colors ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              placeholder="Role description..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[12px] font-black uppercase tracking-widest text-[var(--text-main)]">Permissions Matrix</h4>
          
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[var(--bg-card)]">
                <tr className="border-b border-[var(--border-color)]">
                  <th className="p-4 w-[20%] text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border-color)]">MODULE</th>
                  {ACTIONS.map(action => (
                    <th key={action.id} className="p-4 w-[20%] text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border-color)] last:border-0">{action.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(module => {
                  const modKey = module.id || module.name.replace(/\s+/g, '').toLowerCase();
                  
                  if (module.subsections) {
                    return (
                      <React.Fragment key={module.name}>
                        <tr className="bg-[var(--bg-workspace)]/40 border-b border-[var(--border-color)]">
                          <td className="p-4 text-[13px] font-bold text-[var(--text-main)] border-r border-[var(--border-color)]" colSpan={5}>
                            {module.name}
                          </td>
                        </tr>
                        {module.subsections.map((sub, idx) => (
                          <tr key={`${module.name}-${sub.id}`} className={`border-b border-[var(--border-color)] hover:bg-[var(--accent)]/5 transition-colors`}>
                            <td className="p-3 pl-8 text-[12px] font-medium text-[var(--text-dim)] border-r border-[var(--border-color)] flex items-center gap-2">
                              <span className="text-[var(--text-muted)] opacity-50">↳</span> {sub.name}
                            </td>
                            {ACTIONS.map(action => {
                              const actKey = action.id;
                              const isChecked = selectedPerms[modKey]?.[sub.id]?.[actKey] || false;
                              const permKey = `${modKey}.${sub.id}.${actKey}`;
                              const exists = permissionsList?.some(p => p.permission_key === permKey);

                              return (
                                <td key={action.id} className="p-3 border-r border-[var(--border-color)] last:border-0">
                                  {exists && (
                                    <div className="flex justify-center w-full">
                                      <input
                                        type="checkbox"
                                        checked={isAdmin ? true : isChecked}
                                        disabled={isReadOnly}
                                        onChange={() => handleToggle(modKey, actKey, sub.id)}
                                        className={`w-4 h-4 accent-[var(--accent)] ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                      />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  }

                  return (
                    <tr key={module.name} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--accent)]/5 transition-colors">
                      <td className="p-4 text-[13px] font-bold text-[var(--text-main)] border-r border-[var(--border-color)]">{module.name === 'Sales' ? 'Book a Sale' : module.name}</td>
                      {ACTIONS.map(action => {
                        const actKey = action.id;
                        const isChecked = selectedPerms[modKey]?.[actKey] || false;
                        const permKey = `${modKey}.${actKey}`;
                        const exists = permissionsList?.some(p => p.permission_key === permKey);

                        return (
                          <td key={action.id} className="p-4 border-r border-[var(--border-color)] last:border-0">
                            {exists && (
                              <div className="flex justify-center w-full">
                                <input
                                  type="checkbox"
                                  checked={isAdmin ? true : isChecked}
                                  disabled={isReadOnly}
                                  onChange={() => handleToggle(modKey, actKey)}
                                  className={`w-4 h-4 accent-[var(--accent)] ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isAdmin && (
            <p className="text-[11px] text-[var(--accent)] font-bold italic">* The Admin role automatically has all permissions and cannot be modified.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors uppercase tracking-wider">
            {isView ? 'Close' : 'Cancel'}
          </button>
          {!isView && (
            <button type="submit" disabled={isSubmitting || isAdmin} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (editingItem ? 'Update Role' : 'Create Role')}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default RoleModal;
