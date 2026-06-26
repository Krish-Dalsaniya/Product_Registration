import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/shared/Modal';
import { Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from "../../../../api/axiosInstance";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const HR_MODULES = [
  { name: 'Dashboard', prefix: 'hr.dashboard', actions: ['view'] },
  { name: 'Organogram', prefix: 'hr.organogram', actions: ['view'] },
  { name: 'Recruitment', prefix: 'hr.recruitment' },
  { name: 'Onboarding', prefix: 'hr.onboarding' },
  { name: 'Offboarding', prefix: 'hr.offboarding' },
  { name: 'Trainees', prefix: 'hr.trainee' },
  { name: 'Employees', prefix: 'hr.employees' },
  { 
    name: 'Payrolls',
    subsections: [
      { name: 'Leaves', prefix: 'hr.payrolls_leaves' },
      { name: 'Holiday (Roaster)', prefix: 'hr.payrolls_holiday' },
      { name: 'Attendance', prefix: 'hr.payrolls_attendance' }
    ]
  },
  { 
    name: 'PMS',
    subsections: [
      { name: 'Closure', prefix: 'hr.pms_closure' },
      { name: 'Projects', prefix: 'hr.pms_projects' },
      { name: 'Teams', prefix: 'hr.pms_teams' },
      { name: 'Tasks', prefix: 'hr.pms_tasks' },
      { name: 'Scrums', prefix: 'hr.pms_scrums' }
    ]
  },
  { name: 'LMS', prefix: 'hr.lms' }
];

const DEFAULT_ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' }
];

const HRUserAccessModal = ({ isOpen, onClose, selectedUser, permissionsList }) => {
  const [selectedPerms, setSelectedPerms] = useState({});
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

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsInitialized(false);
      const timer = setTimeout(() => setShowContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen, selectedUser?.user_id]);

  useEffect(() => {
    if (isOpen && userPermsData && showContent && !isInitialized) {
      const initialPerms = {};
      if (userPermsData.permissions) {
        userPermsData.permissions.forEach(key => {
          initialPerms[key] = true;
        });
      }
      setSelectedPerms(initialPerms);
      setIsInitialized(true);
    } else if (!isOpen) {
      setSelectedPerms({});
    }
  }, [isOpen, userPermsData, showContent, isInitialized]);

  const handleToggle = (permKey) => {
    setSelectedPerms(prev => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const permissions = [];
      
      if (permissionsList) {
        // First, add all existing permissions that are NOT HR permissions
        if (userPermsData?.permissions) {
          userPermsData.permissions.forEach(key => {
            if (!key.startsWith('hr.')) {
              const p = permissionsList.find(x => x.permission_key === key);
              if (p) permissions.push(p.permission_id);
            }
          });
        }
        
        // Then, add the HR permissions that are currently checked in the UI
        Object.keys(selectedPerms).forEach(key => {
          if (key.startsWith('hr.') && selectedPerms[key]) {
            const p = permissionsList.find(x => x.permission_key === key);
            if (p) permissions.push(p.permission_id);
          }
        });
      }

      await updateMutation.mutateAsync({ has_custom_permissions: true, permissions });
      toast.success('User access updated successfully');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to update user access');
    }
  };

  const isSubmitting = updateMutation.isPending;
  const isReadOnly = selectedUser?.role_id === 1; // Admin role

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="HR Access Control"
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

        <div className="space-y-4 transition-opacity duration-300">
          <h4 className="text-[12px] font-black uppercase tracking-widest text-[var(--text-main)]">HR Permissions Matrix</h4>
          
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] h-[400px] overflow-y-auto relative custom-scrollbar">
            {isLoading || !showContent ? (
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--accent)]" /></div>
            ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[var(--bg-card)]">
                <tr className="border-b border-[var(--border-color)]">
                  <th className="p-4 w-[20%] text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border-color)]">MODULE</th>
                  {DEFAULT_ACTIONS.map(action => (
                    <th key={action.id} className="p-4 w-[20%] text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-r border-[var(--border-color)] last:border-0">{action.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HR_MODULES.map((module, mIdx) => {
                  if (module.subsections) {
                    return (
                      <React.Fragment key={module.name}>
                        <tr className="bg-[var(--bg-workspace)]/40 border-b border-[var(--border-color)]">
                          <td className="p-4 text-[13px] font-bold text-[var(--text-main)] border-r border-[var(--border-color)]" colSpan={5}>
                            {module.name}
                          </td>
                        </tr>
                        {module.subsections.map((sub, sIdx) => (
                          <tr key={`${module.name}-${sub.name}`} className={`border-b border-[var(--border-color)] hover:bg-[var(--accent)]/5 transition-colors`}>
                            <td className="p-3 pl-8 text-[12px] font-medium text-[var(--text-dim)] border-r border-[var(--border-color)] flex items-center gap-2">
                              <span className="text-[var(--text-muted)] opacity-50">↳</span> {sub.name}
                            </td>
                            {DEFAULT_ACTIONS.map(action => {
                              const isAllowedAction = !module.actions || module.actions.includes(action.id);
                              const permKey = `${sub.prefix}.${action.id}`;
                              const isChecked = selectedPerms[permKey] || false;
                              const exists = permissionsList?.some(p => p.permission_key === permKey);

                              return (
                                <td key={action.id} className="p-3 border-r border-[var(--border-color)] last:border-0">
                                  {isAllowedAction && exists && (
                                    <div className="flex justify-center w-full">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggle(permKey)}
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
                      <td className="p-4 text-[13px] font-bold text-[var(--text-main)] border-r border-[var(--border-color)]">{module.name}</td>
                      {DEFAULT_ACTIONS.map(action => {
                        const isAllowedAction = !module.actions || module.actions.includes(action.id);
                        const permKey = `${module.prefix}.${action.id}`;
                        const isChecked = selectedPerms[permKey] || false;
                        const exists = permissionsList?.some(p => p.permission_key === permKey);

                        return (
                          <td key={action.id} className="p-4 border-r border-[var(--border-color)] last:border-0">
                            {isAllowedAction && exists && (
                              <div className="flex justify-center w-full">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggle(permKey)}
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

export default HRUserAccessModal;
