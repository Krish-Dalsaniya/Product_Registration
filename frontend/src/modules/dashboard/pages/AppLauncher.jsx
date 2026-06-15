import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  Users, 
  Briefcase, 
  Box, 
  Truck, 
  Receipt, 
  PackageSearch,
  Settings,
  LayoutDashboard,
  LogOut,
  User
} from 'lucide-react';

const AppLauncher = () => {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Define all available ERP modules
  // The 'permissionKey' is the Module Access key.
  const modules = [
    {
      id: 'product_registration',
      name: 'Product Registration',
      description: 'Manage product lifecycle and versions',
      icon: PackageSearch,
      color: '#3b82f6', // Blue
      bg: 'rgba(59, 130, 246, 0.1)',
      path: '/admin/dashboard', // Temporary path until fully migrated
      permissionKey: 'admin' // Temporary check for existing access
    },
    {
      id: 'hr',
      name: 'HR',
      description: 'Employees, Payroll, & Leaves',
      icon: Users,
      color: '#10b981', // Emerald
      bg: 'rgba(16, 185, 129, 0.1)',
      path: '/hr',
      permissionKey: 'hr'
    },
    {
      id: 'crm',
      name: 'CRM',
      description: 'Leads, Opportunities, & Sales',
      icon: Briefcase,
      color: '#f43f5e', // Rose
      bg: 'rgba(244, 63, 94, 0.1)',
      path: '/crm',
      permissionKey: 'crm'
    },
    {
      id: 'inventory',
      name: 'Inventory',
      description: 'Stock, Warehouses, & Transfers',
      icon: Box,
      color: '#8b5cf6', // Purple
      bg: 'rgba(139, 92, 246, 0.1)',
      path: '/admin/inventory',
      permissionKey: 'inventory.general.view'
    },
    {
      id: 'logistics',
      name: 'Logistics',
      description: 'Shipping & Delivery Tracking',
      icon: Truck,
      color: '#f59e0b', // Amber
      bg: 'rgba(245, 158, 11, 0.1)',
      path: '/logistics',
      permissionKey: 'logistics'
    },
    {
      id: 'accounts',
      name: 'Accounts',
      description: 'Invoicing, Billing, & Ledgers',
      icon: Receipt,
      color: '#06b6d4', // Cyan
      bg: 'rgba(6, 182, 212, 0.1)',
      path: '/accounts',
      permissionKey: 'accounts'
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Global ERP Configuration',
      icon: Settings,
      color: '#64748b', // Slate
      bg: 'rgba(100, 116, 139, 0.1)',
      path: '/settings',
      permissionKey: 'admin'
    }
  ];

  // Filter modules based on user's module access
  // Temporarily showing all modules for Admin, otherwise rely on permission checks
  const authorizedModules = modules.filter(mod => {
    if (user?.role_name?.toLowerCase() === 'admin') return true;
    
    // For legacy support before DB migration, check existing roles or specific permissions
    if (mod.id === 'product_registration') return true; // Everyone currently has some access
    
    return hasPermission(mod.id, 'view');
  });

  return (
    <div className="min-h-screen bg-[var(--bg-workspace)] p-8">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm">
            <LayoutDashboard size={28} className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">ERP Workspace</h1>
            <p className="text-[14px] text-[var(--text-muted)] font-semibold mt-1">Select an application to launch</p>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] px-4 py-2 rounded-2xl shadow-sm">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0) || <User size={16} />}
            </div>
            <div className="hidden md:block">
              <p className="text-[13px] font-bold text-[var(--text-main)] leading-none">{user?.full_name}</p>
              <p className="text-[11px] text-[var(--text-muted)] font-medium mt-1">{user?.role_name}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-xl transition-colors shadow-sm"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-[1600px]">
        {authorizedModules.map((mod, index) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => navigate(mod.path)}
              className="workspace-card group flex flex-col items-center justify-center p-8 text-center border border-[var(--border-color)] hover:border-[var(--accent)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* App Icon Bubble */}
              <div 
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: mod.bg, color: mod.color }}
              >
                <Icon size={36} strokeWidth={2} />
              </div>
              
              {/* App Title & Description */}
              <h2 className="text-[16px] font-bold text-[var(--text-main)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                {mod.name}
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] font-semibold leading-relaxed line-clamp-2">
                {mod.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppLauncher;
