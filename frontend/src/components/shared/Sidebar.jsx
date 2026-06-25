import React, { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { updateProfileImageApi, deleteProfileImageApi } from '../../api/auth';
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
  Bot,
  Shield,
  LockKeyhole,
  Loader2,
  Camera,
  Trash2,
  Settings,
  Clock,
  Target
} from 'lucide-react';

const Sidebar = ({ role, isOpen, onClose, onToggleAssistant }) => {
  const { user, logout, hasPermission, updateUserImage } = useAuth();
  
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
  const { theme, setTheme, font, setFont, AVAILABLE_THEMES, AVAILABLE_FONTS } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({
    userManagement: false,
    users: false,
    designers: false,
    sales: false,
    maintenance: false,
    inventory: false,
    pms: false
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsDropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await updateProfileImageApi(formData);
      if (res.data?.success) {
        if (updateUserImage) {
           updateUserImage(res.data.data.image_url);
        } else {
           window.location.reload();
        }
        toast.success('Profile picture updated successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (e) => {
    e.stopPropagation(); // prevent triggering upload
    Swal.fire({
      title: 'Remove Photo?',
      text: 'Are you sure you want to remove your profile photo?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06532',
      cancelButtonColor: '#a89b96',
      confirmButtonText: 'Yes, remove it',
      background: 'var(--bg-card)',
      color: 'var(--text-main)',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setIsUploadingImage(true);
          const res = await deleteProfileImageApi();
          if (res.data?.success) {
            if (updateUserImage) updateUserImage(null);
            else window.location.reload();
            toast.success('Profile photo removed');
          }
        } catch (error) {
          console.error('Delete error:', error);
          toast.error(error.response?.data?.error?.message || 'Failed to remove image');
        } finally {
          setIsUploadingImage(false);
        }
      }
    });
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (
      location.pathname === '/admin/user-management' ||
      location.pathname === '/admin/users' ||
      location.pathname === '/admin/roles' ||
      location.pathname === '/admin/user-access' ||
      location.pathname === '/admin/teams'
    ) {
      setOpenMenus(prev => ({ ...prev, userManagement: true }));
    }
    if (location.pathname.startsWith('/pms/')) {
      setOpenMenus(prev => ({ ...prev, pms: true }));
    }
  }, [location.pathname]);

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

  const NavItem = ({ to, label, icon: Icon, isSubItem = false, isLastSubItem = false, onClick }) => (
    <div className="relative w-full">
      {isSubItem && (
        <>
          {/* L-Shape branch */}
          <div 
            className="absolute pointer-events-none" 
            style={{
              left: '46px',
              top: 0,
              height: '50%',
              width: '26px',
              borderLeft: '2px solid var(--text-dim)',
              borderBottom: '2px solid var(--text-dim)',
              borderBottomLeftRadius: '6px',
              opacity: 0.4,
              zIndex: 10
            }}
          />
          {/* Continuation vertical line for non-last items */}
          {!isLastSubItem && (
            <div 
              className="absolute bg-[var(--text-dim)] pointer-events-none" 
              style={{
                left: '46px',
                top: '50%',
                bottom: 0,
                width: '2px',
                opacity: 0.4,
                zIndex: 10
              }}
            />
          )}
        </>
      )}
      <button
        onClick={() => {
          if (onClick) {
            onClick();
            if (onClose) onClose();
          } else {
            handleNavigate(to);
          }
        }}
        className={`w-full flex items-center gap-4 px-8 py-2.5 transition-all duration-300 relative group ${
          location.pathname === to
            ? 'font-bold'
            : 'hover:bg-[var(--nav-hover)]'
        } ${isSubItem ? 'pl-[72px] pr-4 py-1.5' : ''}`}
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

        <div className="w-6 flex justify-center relative z-20">
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
          className="text-[12px] font-bold tracking-wider uppercase relative z-20 transition-all duration-300 group-hover:text-[var(--text-main)] whitespace-nowrap"
          style={{ fontSize: isSubItem ? '11px' : undefined }}
        >
          {label}
        </span>
      </button>
    </div>
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

  const getModuleName = () => {
    if (location.pathname.startsWith('/admin') || 
        location.pathname.startsWith('/designer') || 
        location.pathname.startsWith('/sales') || 
        location.pathname.startsWith('/maintenance')) {
      return 'PRODUCT REGISTRATION';
    }
    if (location.pathname.startsWith('/hr')) return 'HR';
    if (location.pathname.startsWith('/accountant')) return 'ACCOUNTS';
    return 'SYSTEM';
  };

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
        <div 
          className="h-[52px] flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-[var(--nav-hover)] transition-colors px-2" 
          onClick={() => navigate('/dashboard')}
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 text-center">
            <span className={`font-bold uppercase tracking-widest text-[var(--accent)] ${getModuleName().length > 10 ? 'text-[14px] leading-tight' : 'text-[22px]'}`}>
              {getModuleName()}
            </span>
          </div>
        </div>

      {/* USER PROFILE */}
      <div className="p-6 relative z-50" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--nav-hover)' }}>
        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Avatar */}
            <div
              className="w-24 h-24 rounded-full p-0.5 shadow-xl transition-all duration-500 relative cursor-pointer group/avatar"
              style={{ border: '2px solid var(--accent)', background: 'var(--bg-elevated)' }}
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
            >
              <div className="w-full h-full rounded-full overflow-hidden relative bg-[var(--bg-card)] flex items-center justify-center">
                {isUploadingImage ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded-full">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover/avatar:opacity-100 transition-opacity z-10 rounded-full">
                    <Camera className="w-6 h-6 text-white" />
                    {user?.image_url && (
                      <button onClick={handleDeleteImage} className="p-1.5 bg-red-500/80 rounded-full hover:bg-red-600 transition-colors z-20" title="Remove Photo">
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                )}
                
                {user?.image_url ? (
                  <img
                    src={user.image_url.startsWith('http') ? user.image_url : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/${user.image_url.startsWith('/') ? user.image_url.substring(1) : user.image_url}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-[var(--accent)] tracking-tighter">
                    {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Settings Cog */}
            <div
              ref={settingsDropdownRef}
              className="absolute -bottom-1 -right-2 w-8 h-8 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform"
              style={{ background: 'var(--bg-workspace)', border: '1px solid var(--border-color)' }}
              onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hover:stroke-[var(--accent)] transition-colors">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </div>

              {/* Settings Dropdown */}
              {isSettingsOpen && (
                <div 
                  className="absolute top-[120%] left-1/2 -translate-x-1/2 w-56 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxHeight: '70vh', overflowY: 'auto' }}
                >
                  <div className="flex flex-col gap-2">
                    {/* Theme Selector */}
                    <div>
                      <div className="px-1 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        🎨 Theme
                      </div>
                      <select
                        value={theme}
                        onChange={(e) => { setTheme(e.target.value); }}
                        className="w-full appearance-none py-2 pl-3 pr-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-workspace)] text-[var(--text-main)] font-bold text-[11px] outline-none cursor-pointer hover:border-[var(--accent)] transition-all"
                        aria-label="Select theme"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundSize: '1.2em',
                          backgroundPosition: 'right 0.4rem center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        <optgroup label="☀️ Light">
                          {AVAILABLE_THEMES.filter(t => t.group === 'Light').map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="🌑 Dark">
                          {AVAILABLE_THEMES.filter(t => t.group === 'Dark').map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="h-px bg-[var(--border-color)]" />

                    {/* Font Selector */}
                    <div>
                      <div className="px-1 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        🔤 Font
                      </div>
                      <select
                        value={font}
                        onChange={(e) => { setFont(e.target.value); }}
                        className="w-full appearance-none py-2 pl-3 pr-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-workspace)] text-[var(--text-main)] font-bold text-[11px] outline-none cursor-pointer hover:border-[var(--accent)] transition-all"
                        aria-label="Select font"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundSize: '1.2em',
                          backgroundPosition: 'right 0.4rem center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        {AVAILABLE_FONTS.map(f => (
                          <option key={f.id} value={f.id}>{f.name} — {f.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="h-px bg-[var(--border-color)]" />
                    
                    <button
                      onClick={() => { setIsSettingsOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold text-[var(--text-main)] hover:bg-[var(--bg-workspace)] transition-all"
                      aria-label="Account settings"
                    >
                      <Settings size={14} />
                      <span className="uppercase tracking-widest font-bold text-[9px]">Account Settings</span>
                    </button>
                    
                    <button
                      onClick={() => { setIsSettingsOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 transition-all"
                      aria-label="Sign out"
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
              <div 
                className="w-full flex items-center justify-between px-8 py-2.5 transition-all duration-300 relative group cursor-pointer hover:bg-[var(--nav-hover)]"
                onClick={() => {
                  toggleMenu('userManagement');
                  handleNavigate('/admin/user-management');
                }}
                style={{
                  color: location.pathname === '/admin/user-management' ? 'var(--accent)' : 'var(--text-muted)',
                  background: location.pathname === '/admin/user-management' ? 'var(--nav-active)' : undefined,
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300"
                  style={{
                    background: 'var(--accent)',
                    transform: location.pathname === '/admin/user-management' ? 'scaleY(1)' : 'scaleY(0)',
                    opacity: location.pathname === '/admin/user-management' ? 1 : 0,
                    transformOrigin: 'center',
                  }}
                />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-6 flex justify-center">
                    <UserCog size={20} strokeWidth={2.5} className="transition-colors duration-300 group-hover:text-[var(--accent)]" style={{ color: location.pathname === '/admin/user-management' ? 'var(--accent)' : 'var(--text-dim)' }} />
                  </div>
                  <span className="text-[12px] font-bold tracking-wider uppercase transition-all duration-300 group-hover:text-[var(--text-main)] whitespace-nowrap">
                    User Management
                  </span>
                </div>
                <div className="relative z-10 text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">
                  <ChevronDown size={16} className={`transition-transform duration-300 ${openMenus.userManagement ? 'rotate-180' : ''}`} />
                </div>
              </div>
              <SubMenu isOpen={openMenus.userManagement}>
                <div className="flex flex-col py-1">
                  <NavItem to="/admin/users" label="Users" icon={Users} isSubItem />
                  <NavItem to="/admin/roles" label="Roles Access" icon={Building2} isSubItem />
                  <NavItem to="/admin/user-access" label="User Access" icon={LockKeyhole} isSubItem />
                  <NavItem to="/admin/teams" label="Teams" icon={Layers} isSubItem />
                  <NavItem to="/admin/projects" label="Projects" icon={Target} isSubItem isLastSubItem />
                </div>
              </SubMenu>
            </div>

            <div className="animate-entrance-right" style={{ animationDelay: '300ms' }}>
              <NavItem to="/admin/products" label="Products" icon={Cpu} />
            </div>
            <div className="animate-entrance-right" style={{ animationDelay: '400ms' }}>
              <NavItem to="/admin/customers" label="Customers" icon={Users} />
            </div>

            

            <div className="animate-entrance-right" style={{ animationDelay: '500ms' }}>
              <NavItem to="/admin/inventory" label="Inventory" icon={Box} />
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
            <div className="animate-entrance-right" style={{ animationDelay: '825ms' }}>
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
            
            {/* Base Dashboards */}
            {isDesigner && <NavItem to="/designer/dashboard" label="Dashboard" icon={Layers} />}
            {isSales && <NavItem to="/sales/dashboard" label="Dashboard" icon={LayoutDashboard} />}
            {isMaintenance && <NavItem to="/maintenance/dashboard" label="Dashboard" icon={Wrench} />}
            {(!isAdmin && !isDesigner && !isSales && !isMaintenance) && <NavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} />}

            {/* Dynamically Granted Modules */}
            {hasPermission('users', 'view') && <NavItem to="/admin/users" label="Users" icon={UserCog} />}
            {hasPermission('teams', 'view') && <NavItem to="/admin/teams" label="Teams" icon={Layers} />}
            {hasPermission('products', 'view') && <NavItem to="/admin/products" label="Products" icon={Cpu} />}
            {hasPermission('customers', 'view') && <NavItem to="/admin/customers" label="Customers" icon={Users} />}
            {hasPermission('inventory', 'view') && <NavItem to="/admin/inventory" label="Inventory" icon={Box} />}
            {hasPermission('sales', 'view') && <NavItem to="/admin/book-a-sale" label="Book a Sale" icon={ShoppingBag} />}
            {hasPermission('supporttickets', 'view') && <NavItem to="/admin/support-tickets" label="Support Center" icon={LifeBuoy} />}

            {/* General Functionality */}
            {isDesigner && <NavItem to="/designer/chat" label="Chat" icon={MessageSquare} />}
            {isSales && <NavItem to="/sales/chat" label="Chat" icon={MessageSquare} />}
            {isMaintenance && <NavItem to="/maintenance/chat" label="Chat" icon={MessageSquare} />}
            {(!isAdmin && !isDesigner && !isSales && !isMaintenance) && <NavItem to="/admin/chat" label="Chat" icon={MessageSquare} />}
            <NavItem to="#" label="AI Assistant" icon={Bot} onClick={onToggleAssistant} />
          </div>
        )}

      </div>


      </aside>
    </>
  );
};

export default Sidebar;
