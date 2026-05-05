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
  Zap,
  X,
  Sun,
  Moon,
  Cpu
} from 'lucide-react';

const Sidebar = ({ role, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({
    users: false,
    designers: false
  });

  const handleNavigate = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

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
    <button
      onClick={() => handleNavigate(to)}
      className={`w-full flex items-center gap-4 px-8 py-3.5 transition-all duration-300 relative group ${
        location.pathname === to
          ? 'font-black'
          : 'hover:bg-[var(--nav-hover)]'
      } ${isSubItem ? 'px-10 py-2.5' : ''}`}
      style={{
        color: location.pathname === to ? 'var(--primary)' : 'var(--text-muted)',
        background: location.pathname === to ? 'var(--nav-active)' : undefined,
      }}
    >
      {/* Active left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300"
        style={{
          background: 'var(--accent)',
          transform: location.pathname === to ? 'scaleY(1)' : 'scaleY(0)',
          opacity: location.pathname === to ? 1 : 0,
          transformOrigin: 'center',
        }}
      />

      <div className="w-6 flex justify-center relative z-10">
        {Icon && (
          <Icon
            size={20}
            strokeWidth={2.5}
            className="transition-colors duration-300 group-hover:text-[var(--accent)]"
            style={{ color: location.pathname === to ? 'var(--accent)' : 'var(--text-dim)' }}
          />
        )}
      </div>
      <span
        className="text-[12px] font-black tracking-[0.1em] uppercase relative z-10 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--text-main)]"
        style={{ fontSize: isSubItem ? '11px' : undefined }}
      >
        {label}
      </span>
    </button>
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
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 h-screen fixed left-0 top-0 z-50 md:flex flex-col shadow-2xl transition-all duration-500 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          background: 'var(--grad-sidebar)',
          borderRight: '1px solid var(--border-color)',
        }}
      >
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="md:hidden absolute top-6 right-6 p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent)]"
        >
          <X size={20} strokeWidth={3} />
        </button>

        {/* LOGO */}
        <div className="p-4 flex justify-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                  className="text-[12px] font-black uppercase tracking-[0.1em] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--text-main)]"
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
                    <span className="text-[12px] font-black tracking-[0.1em] uppercase transition-all duration-300 group-hover:text-[var(--text-main)] group-hover:translate-x-1">
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
            <NavItem to="/admin/feature-mapping" label="Feature Mapping" icon={Cpu} />
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

      {/* FOOTER ACTIONS */}
      <div className="py-5 px-6" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={logout}
            className="flex-1 flex items-center gap-3 py-2.5 transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <LogOut size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl transition-all border border-[var(--border-color)] bg-[var(--bg-workspace)] group shadow-sm"
            style={{ color: 'var(--accent)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={18} className="fill-current" /> : <Sun size={18} className="fill-current" />}
          </button>
        </div>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
