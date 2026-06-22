import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Search, Bell, User, ChevronDown } from 'lucide-react';

const AppLauncher = () => {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const modules = [
    {
      id: 'product_registration',
      name: 'Product Registration',
      description: 'Manage product lifecycle',
      iconUrl: '/icons/icon_product_1782108325392.png',
      colSpan: 'md:col-span-4',
      gradient: 'bg-gradient-to-r from-blue-100/90 via-white/80 to-white/90',
      shadowColor: 'shadow-blue-500/10',
      path: '/admin/dashboard',
      permissionKey: 'admin'
    },
    {
      id: 'hr',
      name: 'HR',
      description: 'Employees, Payroll',
      iconUrl: '/icons/icon_hr_1782108337141.png',
      colSpan: 'md:col-span-4',
      gradient: 'bg-gradient-to-r from-teal-100/90 via-white/80 to-white/90',
      shadowColor: 'shadow-teal-500/10',
      path: '/hr',
      permissionKey: 'hr'
    },
    {
      id: 'crm',
      name: 'CRM',
      description: 'Manage CRM Lead',
      iconUrl: '/icons/icon_crm_1782108348300.png',
      colSpan: 'md:col-span-4',
      gradient: 'bg-gradient-to-r from-rose-100/90 via-white/80 to-white/90',
      shadowColor: 'shadow-rose-500/10',
      path: '/crm',
      permissionKey: 'crm'
    },
    {
      id: 'inventory',
      name: 'Inventory',
      description: 'Manage Inventory',
      iconUrl: '/icons/icon_inventory_1782108361801.png',
      colSpan: 'md:col-span-3',
      gradient: 'bg-gradient-to-r from-purple-100/90 via-white/80 to-white/90',
      shadowColor: 'shadow-purple-500/10',
      path: '/admin/inventory',
      permissionKey: 'inventory.general.view'
    },
    {
      id: 'logistics',
      name: 'Logistics',
      description: 'Manage delivery trucker',
      iconUrl: '/icons/icon_logistics_1782108373943.png',
      colSpan: 'md:col-span-3',
      gradient: 'bg-gradient-to-r from-amber-100/90 via-white/80 to-white/90',
      shadowColor: 'shadow-amber-500/10',
      path: '/logistics',
      permissionKey: 'logistics'
    },
    {
      id: 'accounts',
      name: 'Accounts',
      description: 'Manage cash credits',
      iconUrl: '/icons/icon_accounts_1782108390232.png',
      colSpan: 'md:col-span-3',
      gradient: 'bg-gradient-to-r from-sky-100/90 via-white/80 to-white/90',
      shadowColor: 'shadow-sky-500/10',
      path: '/accounts',
      permissionKey: 'accounts'
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Manage settings',
      iconUrl: '/icons/icon_settings_1782108401945.png',
      colSpan: 'md:col-span-3',
      gradient: 'bg-gradient-to-r from-slate-100/90 via-white/80 to-white/90',
      shadowColor: 'shadow-slate-500/10',
      path: '/settings',
      permissionKey: 'admin'
    }
  ];

  const authorizedModules = modules.filter(mod => {
    if (user?.role_name?.toLowerCase() === 'admin') return true;
    if (mod.id === 'product_registration') return true; 
    return hasPermission(mod.id, 'view');
  });

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#faf8f3] text-slate-800 font-sans p-6 md:p-10">
      {/* Mesh Background Blobs to match reference */}
      <div className="absolute top-0 right-[10%] w-[60vw] h-[60vw] bg-[#fff1ec] rounded-full blur-[100px] pointer-events-none transform -translate-y-1/2 opacity-80" />
      <div className="absolute bottom-0 left-[-10%] w-[50vw] h-[50vw] bg-[#fff6e5] rounded-full blur-[100px] pointer-events-none transform translate-y-1/3 opacity-80" />
      <div className="absolute top-[30%] right-[-10%] w-[40vw] h-[40vw] bg-[#fdf3ec] rounded-full blur-[80px] pointer-events-none opacity-60" />
      
      {/* Content Container */}
      <div className="relative z-10 max-w-[1200px] mx-auto animate-in fade-in duration-700">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-12">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1e293b] text-white flex items-center justify-center rounded-lg shadow-md">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.29 7 12 12 20.71 7"></polyline>
                <line x1="12" y1="22" x2="12" y2="12"></line>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">ERP Hub</span>
          </div>

          {/* Center: Search */}
          <div className="hidden md:flex items-center bg-white/70 border border-slate-200/70 rounded-full px-4 py-2 w-[360px] shadow-sm backdrop-blur-md transition-all focus-within:bg-white focus-within:shadow-md">
            <Search size={16} className="text-slate-400 mr-2.5" />
            <input 
              type="text" 
              placeholder="Search" 
              className="bg-transparent border-none outline-none w-full text-[14px] placeholder-slate-400 font-medium text-slate-700" 
            />
          </div>

          {/* Right: User */}
          <div className="flex items-center gap-5">
            <button className="relative p-2 rounded-full hover:bg-white/50 transition-colors">
              <Bell size={20} className="text-slate-600" />
              <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#faf8f3]"></span>
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 cursor-pointer group hover:bg-white/50 p-1.5 pr-2 rounded-full transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden border-2 border-white shadow-sm">
                {user?.full_name?.charAt(0) || <User size={16} />}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-bold text-[13px] text-slate-900 leading-none">Admin User</div>
                <div className="text-slate-500 text-[11px] font-medium mt-1">Admin</div>
              </div>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors ml-1" />
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-14">
          <h1 className="text-[48px] md:text-[56px] font-black mb-3 font-['Fraunces',serif] tracking-tight text-[#1a1c20] leading-tight">
            ERP Workspace
          </h1>
          <p className="text-slate-600 text-[15px] font-medium max-w-2xl mx-auto">
            Streamline your entire business operation from one central hub.
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-12 gap-5 mb-14 max-w-[1100px] mx-auto">
          {authorizedModules.map((mod, index) => (
            <button 
              key={mod.id}
              onClick={() => navigate(mod.path)}
              className={`col-span-12 ${mod.colSpan} text-left flex items-center p-6 rounded-[16px] border-t border-l border-white/90 border-b border-r border-slate-100 shadow-[0_10px_30px_rgb(0,0,0,0.03)] backdrop-blur-2xl hover:-translate-y-1 hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden group ${mod.gradient} ${mod.shadowColor}`}
            >
              <div className="relative z-10 flex items-center gap-4 w-full">
                <img 
                  src={mod.iconUrl} 
                  alt={`${mod.name} icon`} 
                  className="w-12 h-12 object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300 mix-blend-multiply" 
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-[15px] tracking-tight mb-0.5">{mod.name}</h3>
                  <p className="text-slate-500 text-[12px] font-medium leading-snug">{mod.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>



      </div>
    </div>
  );
};

export default AppLauncher;
