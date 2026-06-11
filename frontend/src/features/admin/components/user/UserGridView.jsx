import React from 'react';
import { Eye, Pencil, Trash2, Mail, Users, Building, Briefcase } from 'lucide-react';
import RoleBadge from '../../../../components/shared/RoleBadge';

const UserGridView = ({
  users,
  onView,
  onEdit,
  onDelete
}) => {
  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const assetBaseURL = rawApiUrl.replace(/\/api$/, '');
  
  const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const base = assetBaseURL.endsWith('/') ? assetBaseURL.slice(0, -1) : assetBaseURL;
    return `${base}/${cleanUrl}`;
  };
  if (!users || users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--nav-hover)] mb-4">
          <Users className="text-[var(--text-muted)]" size={32} />
        </div>
        <p className="text-[14px] font-medium text-[var(--text-muted)]">No users found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
      {users.map((user) => {
        const defaultAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name)}&backgroundColor=3d6a7d,0f172a&textColor=ffffff`;
        const avatarUrl = (user.image_url || user.profile_image_url) 
          ? (getFullUrl ? getFullUrl(user.image_url || user.profile_image_url) : (user.image_url || user.profile_image_url))
          : defaultAvatarUrl;
        const userTeams = Array.isArray(user.teams) ? user.teams : [];

        return (
          <div
            key={user.user_id}
            className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl"
          >
            <div onClick={() => onView(user)} className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] flex flex-col items-center justify-center cursor-pointer group/img">
              <div className="w-24 h-24 rounded-full border-4 border-[var(--bg-card)] shadow-md overflow-hidden group-hover/img:scale-110 transition-transform duration-500">
                <img 
                  src={avatarUrl} 
                  alt={user.full_name} 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onView(user); }} 
                  className="w-12 h-12 bg-[var(--accent)] rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0" 
                  title="View Profile"
                >
                  <Eye size={22} />
                </button>
              </div>

            </div>

            <div className="p-4 flex-1 flex flex-col">
              <div className="flex-1 space-y-3">
                <h3 className="text-[15px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300 text-center truncate">
                  {user.full_name}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.company && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                    <Building size={12} className="shrink-0" />
                    <span className="truncate">{user.company}</span>
                  </div>
                )}
                {user.designation && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                    <Briefcase size={12} className="shrink-0" />
                    <span className="truncate">{user.designation}</span>
                  </div>
                )}
              </div>


              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]">
                <div className="flex items-center">
                  <RoleBadge role={user.role_name} />
                </div>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(user); }} 
                      className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg transition-all" 
                      title="Edit User"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(user); }} 
                      className="p-2 text-rose-500/40 hover:text-rose-500 rounded-lg transition-all" 
                      title="Delete User"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserGridView;
