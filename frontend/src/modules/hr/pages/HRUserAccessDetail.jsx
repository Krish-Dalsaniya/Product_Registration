import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from "../../../api/axiosInstance";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '../../../hooks/useRoles';

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

const HRUserAccessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isViewMode = queryParams.get('mode') === 'view';

  const queryClient = useQueryClient();
  const { data: permissionsList } = usePermissions();

  const [selectedPerms, setSelectedPerms] = useState({});

  const { data: userPermsData, isLoading } = useQuery({
    queryKey: ['userPermissions', id],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${id}/permissions`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      // Need user details like full_name, role. We can just use the user list or fetch a single user if available.
      // Alternatively, we use the user endpoint
      const res = await api.get(`/admin/users`);
      const user = res.data.data.find(u => u.user_id.toString() === id);
      return user;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.put(`/admin/users/${id}/permissions`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userPermissions', id]);
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['hrEmployees']);
    }
  });

  useEffect(() => {
    if (userPermsData?.permissions) {
      const initialPerms = {};
      userPermsData.permissions.forEach(key => {
        initialPerms[key] = true;
      });
      setSelectedPerms(initialPerms);
    }
  }, [userPermsData]);

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
      navigate('/hr/user-access');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to update user access');
    }
  };

  const isSubmitting = updateMutation.isPending;
  const isReadOnly = userData?.role_id === 1 || isViewMode;

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto pb-12 pt-6">
      <div className="flex items-center gap-4 animate-entrance-down mb-6">
        <button 
          onClick={() => navigate('/hr/user-access')}
          className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-workspace)] hover:text-[var(--accent)] transition-colors group shadow-sm"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
            HR Access Control {isViewMode && <span className="text-[var(--text-muted)] text-lg ml-2 font-medium">(View Only)</span>}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
            {isViewMode ? 'Viewing' : 'Manage'} permissions for {userData?.full_name || 'User'}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex items-center gap-4 bg-[var(--accent)]/10 p-4 rounded-xl border border-[var(--accent)]/30 w-fit pr-10">
          <ShieldAlert size={32} className="text-[var(--accent)]" />
          <div>
            <h4 className="text-[14px] font-bold text-[var(--text-main)]">{userData?.full_name}</h4>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Role: {userData?.role_name}</p>
          </div>
        </div>

        <div className="workspace-card p-6 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl md:rounded-[32px] overflow-hidden relative shadow-sm">
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] overflow-y-auto relative custom-scrollbar">
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
                {HR_MODULES.map((module) => {
                  if (module.subsections) {
                    return (
                      <React.Fragment key={module.name}>
                        <tr className="bg-[var(--bg-workspace)]/40 border-b border-[var(--border-color)]">
                          <td className="p-4 text-[13px] font-bold text-[var(--text-main)] border-r border-[var(--border-color)]" colSpan={5}>
                            {module.name}
                          </td>
                        </tr>
                        {module.subsections.map((sub) => (
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
                                        disabled={isReadOnly}
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
                                  disabled={isReadOnly}
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
          {userData?.role_id === 1 && (
            <p className="text-[11px] text-[var(--accent)] font-bold italic mt-4">* This user is an Admin and their permissions cannot be overridden.</p>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)] mt-6">
            <button type="button" onClick={() => navigate('/hr/user-access')} className="px-5 py-2.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors uppercase tracking-wider">
              {isViewMode ? 'Back' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button type="submit" disabled={isSubmitting || isReadOnly} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Save Access Control'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default HRUserAccessDetail;
