import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({
    users: false,
    designers: false
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isAdmin = role === 'Admin';
  const isDesigner = role === 'Designer';
  const isSales = role === 'Sales';
  const isMaintenance = role === 'Maintenance';

  const isUserSection = (
    location.pathname === '/admin/users' ||
    location.pathname === '/admin/maintenance' ||
    location.pathname === '/admin/sales' ||
    location.pathname === '/admin/designers' ||
    location.pathname.includes('/admin/teams')
  );

  const NavItem = ({ to, label, icon: Icon, isSubItem = false }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-4 px-8 py-3.5 transition-all duration-300 relative group ${
          isActive
            ? 'font-black'
            : 'hover:bg-[var(--nav-hover)]'
        } ${isSubItem ? 'px-10 py-2.5' : ''}`
      }
      style={({ isActive }) => ({
        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
        background: isActive ? 'var(--nav-active)' : undefined,
      })}
    >
      {({ isActive }) => (
        <>
          {/* Active left border */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300"
            style={{
              background: 'var(--accent)',
              transform: isActive ? 'scaleY(1)' : 'scaleY(0)',
              opacity: isActive ? 1 : 0,
              transformOrigin: 'center',
            }}
          />

          <div className="w-6 flex justify-center relative z-10">
            {Icon && (
              <Icon
                size={20}
                strokeWidth={2.5}
                className="transition-colors duration-300 group-hover:text-[var(--accent)]"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-dim)' }}
              />
            )}
          </div>
          <span
            className="text-[12px] font-black tracking-[0.2em] uppercase relative z-10 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--text-main)]"
            style={{ fontSize: isSubItem ? '11px' : undefined }}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );

  const SubMenu = ({ isOpen, children }) => (
    <div
      className="grid transition-all duration-500 ease-in-out overflow-hidden"
      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
    >
      <div className="min-h-0">
        {children}
      </div>
    </div>
  );

  return (
    <aside
      className="w-64 h-screen fixed left-0 top-0 z-40 hidden md:flex flex-col shadow-2xl transition-colors duration-300"
      style={{
        background: 'var(--grad-sidebar)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* LOGO */}
      <div className="p-8 flex justify-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[22px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]">
            CRUD<span className="text-[var(--accent)]">EX</span>
          </span>
        </div>
      </div>

      {/* USER PROFILE */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--nav-hover)' }}>
        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Avatar */}
            <div
              className="w-24 h-24 rounded-full p-0.5 overflow-hidden shadow-xl transition-all duration-500"
              style={{ border: '2px solid var(--accent)', background: 'var(--bg-elevated)' }}
            >
              <img
                src="/avatar.png"
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            {/* Settings Cog */}
            <div
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform"
              style={{ background: 'var(--bg-workspace)', border: '1px solid var(--border-color)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hover:stroke-[var(--accent)] transition-colors">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-base font-black tracking-tight leading-tight uppercase" style={{ color: 'var(--text-main)' }}>
              {user?.full_name}
            </p>
            <p className="text-[12px] font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
              {user?.role_name}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">

        {isAdmin && (
          <div className="mt-4">
            <p
              className="px-8 mb-2 uppercase font-bold"
              style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.1em' }}
            >
              Management
            </p>

            {/* Users / Personnel row */}
            <div
              className="flex items-center justify-between px-8 py-3.5 transition-all duration-300 group cursor-pointer"
              style={{
                color: isUserSection ? 'var(--primary)' : 'var(--text-muted)',
                background: isUserSection ? 'var(--nav-active)' : undefined,
                borderLeft: isUserSection ? '3px solid var(--accent)' : '3px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isUserSection) {
                  e.currentTarget.style.background = 'var(--nav-hover)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={e => {
                if (!isUserSection) {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-4 cursor-pointer flex-1"
              >
                <div className="w-6 flex justify-center relative z-10">
                  <Users
                    size={20}
                    strokeWidth={2.5}
                    style={{ color: isUserSection ? 'var(--accent)' : 'var(--text-dim)' }}
                    className="group-hover:text-[var(--accent)] transition-colors duration-300"
                  />
                </div>
                <span
                  className="text-[12px] font-black uppercase tracking-[0.2em] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--text-main)]"
                >
                  Users
                </span>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); toggleMenu('users'); }}
                className="cursor-pointer p-1.5 rounded-lg transition-all"
              >
                <ChevronDown
                  size={16}
                  className="transition-transform duration-500"
                  style={{
                    transform: openMenus.users ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: openMenus.users ? 'var(--accent)' : 'var(--text-dim)',
                  }}
                  strokeWidth={3}
                />
              </div>
            </div>

            <SubMenu isOpen={openMenus.users}>
              <div className="space-y-0.5 py-1">

                {/* Designers row */}
                <div
                  className="flex items-center justify-between px-10 py-2.5 transition-all duration-300 relative group cursor-pointer"
                  style={{
                    color: (location.pathname === '/admin/designers' || location.pathname.includes('/admin/teams')) ? 'var(--accent)' : 'var(--text-muted)',
                    background: (location.pathname === '/admin/designers' || location.pathname.includes('/admin/teams')) ? 'var(--nav-active)' : undefined,
                    borderLeft: location.pathname === '/admin/designers' ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (location.pathname !== '/admin/designers') {
                      e.currentTarget.style.background = 'var(--nav-hover)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }
                  }}
                  onMouseLeave={e => {
                    const isActive = location.pathname === '/admin/designers' || location.pathname.includes('/admin/teams');
                    e.currentTarget.style.background = isActive ? 'var(--nav-active)' : '';
                    e.currentTarget.style.color = isActive ? 'var(--accent)' : 'var(--text-muted)';
                  }}
                >
                  <div
                    onClick={() => navigate('/admin/designers')}
                    className="flex items-center gap-4 cursor-pointer flex-1"
                  >
                    <div className="w-6 flex justify-center">
                      <PenTool
                        size={18}
                        className="transition-colors duration-300 group-hover:text-[var(--accent)]"
                        style={{ color: location.pathname === '/admin/designers' ? 'var(--accent)' : 'var(--text-dim)' }}
                      />
                    </div>
                    <span className="text-[12px] font-black tracking-[0.2em] uppercase transition-all duration-300 group-hover:text-[var(--text-main)] group-hover:translate-x-1">
                      Designers
                    </span>
                  </div>
                  <div
                    onClick={(e) => { e.stopPropagation(); toggleMenu('designers'); }}
                    className="cursor-pointer p-1 rounded-lg transition-all"
                  >
                    <ChevronDown
                      size={12}
                      className="transition-transform duration-500"
                      style={{
                        transform: openMenus.designers ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: openMenus.designers ? 'var(--accent)' : 'var(--text-dim)',
                      }}
                      strokeWidth={3}
                    />
                  </div>
                </div>

                <SubMenu isOpen={openMenus.designers}>
                  <div className="space-y-0.5 mb-2">
                    <NavItem to="/admin/teams?role=Designer" label="Teams" isSubItem />
                  </div>
                </SubMenu>

                <NavItem to="/admin/maintenance" label="Maintenance" icon={Wrench} isSubItem />
                <NavItem to="/admin/sales" label="Sales" icon={ShoppingBag} isSubItem />

              </div>
            </SubMenu>

            <NavItem to="/admin/products" label="Products" icon={Zap} />
            <NavItem to="/admin/customers" label="Customers" icon={Users} />
          </div>
        )}

        {!isAdmin && (
          <div className="mt-6">
            <p
              className="px-8 mb-2 uppercase font-bold"
              style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.1em' }}
            >
              Workspace
            </p>
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

      {/* SIGN OUT */}
      <div className="py-5 px-8" style={{ borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 py-2 transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <LogOut size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
