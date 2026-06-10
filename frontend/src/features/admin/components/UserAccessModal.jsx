import React, { useState, useEffect } from 'react';
import Modal from '../../../components/shared/Modal';
import { Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import api from "../../../api/axiosInstance";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

const UserAccessModal = ({ isOpen, onClose, selectedUser, permissionsList }) => {
  const [selectedPerms, setSelectedPerms] = useState({});
  const [hasCustomPerms, setHasCustomPerms] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const queryClient = useQueryClient();

  const { data: userPermsData, isLoading } = useQuery({
    queryKey: ['userPermissions', selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser?.user_id) return null;
      const res = await api.get(`/admin/users/${selectedUser.user_id}/permissions`);
      return res.data.data;
    },
    enabled: isOpen && !!selectedUser,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.put(`/admin/users/${selectedUser.user_id}/permissions`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userPermissions', selectedUser?.user_id]);
      queryClient.invalidateQueries(['users']);
    }
  });

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && userPermsData && showContent) {
      setHasCustomPerms(userPermsData.has_custom_permissions);
      
      const initialPerms = {};
      if (userPermsData.permissions && permissionsList) {
        userPermsData.permissions.forEach(key => {
          const parts = key.split('.');
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
        });
      }
      setSelectedPerms(initialPerms);
    } else if (!isOpen) {
      setSelectedPerms({});
      setHasCustomPerms(false);
    }
  }, [isOpen, userPermsData, permissionsList, showContent]);

  const handleToggle = (moduleKey, actionKey, subKey = null) => {
    if (!hasCustomPerms) return;
    
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

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const permissions = [];
      if (hasCustomPerms && permissionsList) {
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

      await updateMutation.mutateAsync({ has_custom_permissions: hasCustomPerms, permissions });
      toast.success('User permissions updated successfully');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to update user permissions');
    }
  };

  const isSubmitting = updateMutation.isPending;
  const isReadOnly = selectedUser?.role_id === 1; // Cannot override Admin role users usually

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Access Control"
      maxWidth="max-w-[1000px]"
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex items-center gap-4 bg-[var(--accent)]/10 p-4 rounded-xl border border-[var(--accent)]/30">
          <ShieldAlert size={32} className="text-[var(--accent)]" />
          <div>
            <h4 className="text-[14px] font-bold text-[var(--text-main)]">{selectedUser?.full_name}</h4>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Role: {selectedUser?.role_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] shadow-sm">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={hasCustomPerms} 
                onChange={(e) => setHasCustomPerms(e.target.checked)}
                disabled={isReadOnly}
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${hasCustomPerms ? 'bg-[var(--accent)]' : 'bg-gray-400'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hasCustomPerms ? 'translate-x-4' : ''}`}></div>
            </div>
            <div className="flex flex-col">
              <span className={`text-[13px] font-black uppercase tracking-widest ${hasCustomPerms ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'}`}>
                Override Role Permissions
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {hasCustomPerms ? 'User permissions will be used instead of their assigned role.' : 'User is currently inheriting permissions from their assigned role.'}
              </span>
            </div>
          </label>
        </div>

        <div className={`space-y-4 transition-opacity duration-300 ${!hasCustomPerms ? 'opacity-50 pointer-events-none' : ''}`}>
          <h4 className="text-[12px] font-black uppercase tracking-widest text-[var(--text-main)]">Custom Permissions Matrix</h4>
          
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] h-[400px] overflow-y-auto relative">
            {isLoading || !showContent ? (
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--accent)]" /></div>
            ) : (
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
                  const modKey = module.name.replace(/\s+/g, '').toLowerCase();
                  
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
                                        checked={isChecked}
                                        onChange={() => handleToggle(modKey, actKey, sub.id)}
                                        className={`w-4 h-4 accent-[var(--accent)] cursor-pointer`}
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
                                  checked={isChecked}
                                  onChange={() => handleToggle(modKey, actKey)}
                                  className={`w-4 h-4 accent-[var(--accent)] cursor-pointer`}
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
            )}
          </div>
          {isReadOnly && (
            <p className="text-[11px] text-[var(--accent)] font-bold italic">* This user is an Admin and their permissions cannot be overridden.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors uppercase tracking-wider">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || isReadOnly} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Save Access Control'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserAccessModal;
