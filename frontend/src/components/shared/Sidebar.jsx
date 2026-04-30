import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RoleBadge from './RoleBadge';
import { 
  Users, 
  ShoppingBag, 
  Wrench, 
  ChevronDown, 
  ChevronUp,
  LogOut,
  Box,
  LayoutDashboard,
  Layers,
  PenTool,
  Zap
} from 'lucide-react';

const Sidebar = ({ role }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({
    users: true,
    designers: false
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isAdmin = role === 'Admin';
  const isDesigner = role === 'Designer';
  const isSales = role === 'Sales';
  const isMaintenance = role === 'Maintenance';

  const NavItem = ({ to, label, icon: Icon, isSubItem = false }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-4 px-10 py-3 transition-all ${
          isActive 
            ? 'text-blue-600 font-bold bg-blue-50' 
            : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
        }`
      }
    >
      <div className="w-6 flex justify-center">
        {Icon && <Icon size={18} className={location.pathname === to ? 'text-blue-600' : 'text-gray-400'} strokeWidth={2} />}
      </div>
      <span className={`text-sm font-bold tracking-tight ${isSubItem ? 'text-[11px] font-medium' : ''}`}>{label}</span>
    </NavLink>
  );

  return (
    <aside className="w-64 bg-white h-screen fixed left-0 top-0 z-40 hidden md:flex flex-col shadow-xl border-r border-gray-100">
      {/* USER PROFILE AT TOP */}
      {/* LOGO AT TOP */}
      <div className="p-8 border-b border-gray-50 flex justify-center">
        <img 
          src="/logo.png" 
          alt="Leons CRM" 
          className="h-10 w-auto object-contain" 
        />
      </div>

      <div className="p-6 border-b border-gray-50 bg-gray-50/50">



        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Avatar with thick green border */}
            <div className="w-24 h-24 rounded-full border-[6px] border-[#61A085] p-0.5 overflow-hidden bg-white shadow-xl">
              <img 
                src="/avatar.png" 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            {/* Settings Overlay Cog */}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 cursor-pointer hover:scale-110 transition-transform">
              <div className="text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-base font-bold text-gray-900 tracking-tight leading-tight">{user?.full_name?.toLowerCase()}</p>
            <p className="text-[12px] font-medium text-gray-400 mt-1">{user?.role_name}</p>
          </div>
        </div>

      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">


        {isAdmin && (
          <div className="mt-4">
            <p className="px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-2">Management</p>
            
            {/* Category: User Center (Matching Image Behavior but Dark Theme) */}
            <div 
              className={`flex items-center justify-between px-8 py-3.5 transition-all ${
                location.pathname === '/admin/users' || (openMenus.users && !location.pathname.includes('/admin/'))
                  ? 'text-blue-600' 
                  : 'text-gray-500'
              }`}
            >
              <div 
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-4 cursor-pointer hover:text-blue-600 transition-colors flex-1 group"
              >
                <Box size={20} className={location.pathname === '/admin/users' ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'} />
                <span className="text-sm font-bold uppercase tracking-tight">Users</span>
              </div>
              <div 
                onClick={(e) => { e.stopPropagation(); toggleMenu('users'); }}
                className="cursor-pointer p-1.5 hover:bg-gray-100 rounded-md transition-all"
              >
                {openMenus.users ? (
                  <ChevronUp size={16} className={openMenus.users ? 'text-blue-600' : 'text-gray-400'} strokeWidth={2.5} />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" strokeWidth={2.5} />
                )}
              </div>
            </div>


            {openMenus.users && (
              <div className="space-y-0.5">
                {/* Nested Designers Sub-category */}
                <div 
                  className={`flex items-center justify-between px-10 py-2.5 transition-all ${
                    location.pathname === '/admin/designers' || openMenus.designers ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <div 
                    onClick={() => navigate('/admin/designers')}
                    className="flex items-center gap-4 cursor-pointer hover:text-blue-600 transition-colors flex-1 group"
                  >
                    <PenTool size={18} className={location.pathname === '/admin/designers' ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'} />
                    <span className="text-sm font-bold tracking-tight">Designers</span>
                  </div>
                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleMenu('designers'); }}
                    className="cursor-pointer p-1 hover:bg-gray-100 rounded-md transition-all"
                  >
                    {openMenus.designers ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-gray-400" />}
                  </div>
                </div>

                {openMenus.designers && (
                  <div className="space-y-0.5 mb-2">
                    <NavItem to="/admin/teams?role=Designer" label="Teams" isSubItem />
                  </div>
                )}

                <NavItem to="/admin/maintenance" label="Maintenance" icon={Wrench} />
                <NavItem to="/admin/sales" label="Sales" icon={ShoppingBag} />

              </div>
            )}
          </div>
        )}

        {!isAdmin && (
          <div className="mt-6">
            <p className="px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-2">Workspace</p>
            {isDesigner && <NavItem to="/designer/dashboard" label="Workstation" icon={Layers} />}
            {isSales && (
              <>
                <NavItem to="/sales/dashboard" label="Analytics Hub" icon={LayoutDashboard} />
                <NavItem to="/sales/opportunities" label="Pipeline" icon={ShoppingBag} />
              </>
            )}
            {isMaintenance && <NavItem to="/maintenance/dashboard" label="Service Console" icon={Wrench} />}
          </div>
        )}

      </div>

      {/* SIGN OUT AT BOTTOM */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-black text-red-600 border border-red-100 transition-all uppercase tracking-widest group"
        >
          <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
