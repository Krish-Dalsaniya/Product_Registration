import React, { useState } from 'react';
import Swal from 'sweetalert2';
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
  Package,
  LayoutDashboard,
  Layers,
  PenTool,
  Zap,
  X,
  Sun,
  Moon,
  Cpu,
  UserCog,
  Building2,
  CircuitBoard,
  Plug,
  LifeBuoy,
  MessageSquare,
  Bot
} from 'lucide-react';

const Sidebar = ({ role, isOpen, onClose, onToggleAssistant }) => {
  const { user, logout } = useAuth();
  
  const handleLogout = () => {
    Swal.fire({
      title: 'Sign Out?',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f06532',
      cancelButtonColor: '#a89b96',
      confirmButtonText: 'Yes, sign out',
      background: 'var(--bg-card)',
      color: 'var(--text-main)',
      iconColor: '#f06532'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
      }
    });
  };
  const { theme, setTheme, AVAILABLE_THEMES } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({
    users: false,
    designers: false,
    sales: false,
    maintenance: false,
    inventory: false
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    location.pathname === '/admin/designers'
  );
  
  const isInventorySection = (
    location.pathname.includes('/admin/inventory')
  );

  const isFinishedGoodsSection = (
    location.pathname.includes('/admin/finished-goods')
  );

  const isBookASaleSection = (
    location.pathname.includes('/admin/book-a-sale')
  );

  const isMaintenanceActive = location.pathname === '/admin/maintenance';

  const NavItem = ({ to, label, icon: Icon, isSubItem = false, onClick }) => (
    <button
      onClick={() => {
        if (onClick) {
          onClick();
          if (onClose) onClose();
        } else {
          handleNavigate(to);
        }
      }}
      className={`w-full flex items-center gap-4 px-8 py-3.5 transition-all duration-300 relative group ${
        location.pathname === to
          ? 'font-bold'
          : 'hover:bg-[var(--nav-hover)]'
      } ${isSubItem ? 'pl-10 pr-4 py-2.5' : ''}`}
      style={{
        color: location.pathname === to ? 'var(--accent)' : 'var(--text-muted)',
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
        className="text-[12px] font-bold tracking-wider uppercase relative z-10 transition-all duration-300 group-hover:text-[var(--text-main)] whitespace-nowrap"
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
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
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
        <div className="h-[52px] flex items-center justify-center flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-bold uppercase tracking-widest text-[var(--text-main)]">
              CRUD<span className="text-[var(--accent)]">EX</span>
            </span>
          </div>
        </div>

      {/* USER PROFILE */}
      <div className="p-6 relative z-50" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--nav-hover)' }}>
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
              ref={settingsDropdownRef}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform"
              style={{ background: 'var(--bg-workspace)', border: '1px solid var(--border-color)' }}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              <div className="w-full h-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hover:stroke-[var(--accent)] transition-colors">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </div>

              {/* Settings Dropdown */}
              {isSettingsOpen && (
                <div 
                  className="absolute top-[120%] left-1/2 -translate-x-1/2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col gap-2">
                    <div>
                      <div className="px-1 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        Appearance
                      </div>
                      <select
                        value={theme}
                        onChange={(e) => {
                          setTheme(e.target.value);
                          setIsSettingsOpen(false);
                        }}
                        className="w-full appearance-none py-2 pl-3 pr-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-workspace)] text-[var(--text-main)] font-bold text-[11px] outline-none cursor-pointer hover:border-[var(--accent)] transition-all"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundSize: '1.2em',
                          backgroundPosition: 'right 0.4rem center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        {AVAILABLE_THEMES.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="h-px bg-[var(--border-color)]" />
                    
                    <button
                      onClick={() => { setIsSettingsOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 transition-all"
                    >
                      <LogOut size={14} />
                      <span className="uppercase tracking-widest font-bold text-[9px]">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-base font-bold tracking-tight leading-tight uppercase" style={{ color: 'var(--text-main)' }}>
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
          <div className="space-y-1">
            <div className="mb-2 animate-entrance-right" style={{ animationDelay: '100ms' }}>
              <NavItem to="/admin/dashboard" label="Dashboard" icon={LayoutDashboard} />
            </div>

            <div className="animate-entrance-right" style={{ animationDelay: '200ms' }}>
              <NavItem to="/admin/users" label="Users" icon={UserCog} />
            </div>

            <div className="animate-entrance-right" style={{ animationDelay: '250ms' }}>
              <NavItem to="/admin/teams" label="Teams" icon={Layers} />
            </div>

            <div className="animate-entrance-right" style={{ animationDelay: '300ms' }}>
              <NavItem to="/admin/products" label="Products" icon={Zap} />
            </div>
            <div className="animate-entrance-right" style={{ animationDelay: '400ms' }}>
              <NavItem to="/admin/customers" label="Customers" icon={Users} />
            </div>

            

            {/* Inventory row */}
            <div className="animate-entrance-right" style={{ animationDelay: '500ms' }}>
              <NavItem to="/admin/inventory" label="Inventory" icon={Box} />
            </div>

            <div className="animate-entrance-right" style={{ animationDelay: '650ms' }}>
              <NavItem to="/admin/finished-goods" label="Finished Goods" icon={Package} />
            </div>
            <div className="animate-entrance-right" style={{ animationDelay: '700ms' }}>
              <NavItem to="/admin/book-a-sale" label="Book a Sale" icon={ShoppingBag} />
            </div>
            <div className="animate-entrance-right" style={{ animationDelay: '750ms' }}>
              <NavItem to="/admin/support-tickets" label="Support Center" icon={LifeBuoy} />
            </div>
            <div className="animate-entrance-right" style={{ animationDelay: '800ms' }}>
              <NavItem to="/admin/chat" label="Chat" icon={MessageSquare} />
            </div>
            <div className="animate-entrance-right" style={{ animationDelay: '850ms' }}>
              <NavItem to="#" label="AI Assistant" icon={Bot} onClick={onToggleAssistant} />
            </div>
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
            {isDesigner && (
              <>
                <NavItem to="/designer/dashboard" label="Workstation" icon={Layers} />
                <NavItem to="/designer/support-tickets" label="Support Center" icon={LifeBuoy} />
                <NavItem to="/designer/chat" label="Chat" icon={MessageSquare} />
                <NavItem to="#" label="AI Assistant" icon={Bot} onClick={onToggleAssistant} />
              </>
            )}
            {isSales && (
              <>
                <NavItem to="/sales/dashboard" label="Dashboard" icon={LayoutDashboard} />
                {/* <NavItem to="/sales/opportunities" label="Pipeline" icon={ShoppingBag} /> */}
                <NavItem to="/sales/support-tickets" label="Support Center" icon={LifeBuoy} />
                <NavItem to="/sales/chat" label="Chat" icon={MessageSquare} />
                <NavItem to="#" label="AI Assistant" icon={Bot} onClick={onToggleAssistant} />
              </>
            )}
            {isMaintenance && (
              <>
                <NavItem to="/maintenance/dashboard" label="Service Console" icon={Wrench} />
                <NavItem to="/maintenance/support-tickets" label="Support Center" icon={LifeBuoy} />
                <NavItem to="/maintenance/chat" label="Chat" icon={MessageSquare} />
                <NavItem to="#" label="AI Assistant" icon={Bot} onClick={onToggleAssistant} />
              </>
            )}
          </div>
        )}

      </div>


      </aside>
    </>
  );
};

export default Sidebar;
