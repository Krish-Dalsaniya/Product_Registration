import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import LoginBackground from '../../../components/shared/LoginBackground';

const MotionCard = ({ mod, onClick }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // High stiffness, moderate damping = snappy but smooth physical response
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  // Stable 2.5D Parallax instead of buggy CSS translateZ
  const translateX = useTransform(mouseXSpring, [-0.5, 0.5], ["-15px", "15px"]);
  const translateY = useTransform(mouseYSpring, [-0.5, 0.5], ["-15px", "15px"]);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["-20%", "120%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["-20%", "120%"]);

  // Add shine movement for a metallic glass feel
  const shineX = useTransform(mouseXSpring, [-0.5, 0.5], ["100%", "-100%"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className={`col-span-12 ${mod.colSpan} perspective-[1500px]`}>
      <motion.a
        href={mod.path}
        onClick={(e) => {
          e.preventDefault();
          onClick(e);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
        }}
        whileHover={{ scale: 1.02 }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`w-full h-full text-left flex items-center p-6 rounded-[24px] border-[1.5px] border-white/80 backdrop-blur-2xl shadow-[0_10px_30px_rgb(0,0,0,0.05),inset_0_2px_10px_rgb(255,255,255,0.9),inset_0_-2px_10px_rgb(255,255,255,0.4)] hover:shadow-[0_40px_80px_rgb(0,0,0,0.12),inset_0_2px_15px_rgb(255,255,255,1)] relative overflow-hidden group bg-white/85 transition-colors duration-300`}
      >
        {/* Dynamic Glare */}
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at var(--glare-x) var(--glare-y), rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 50%)`,
            '--glare-x': glareX,
            '--glare-y': glareY
          }}
        />

        {/* Shine Sweep */}
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) 25%, transparent 30%)`,
            backgroundSize: '200% 100%',
            backgroundPositionX: shineX
          }}
        />

        {/* Stable 2.5D Parallax Content Wrapper */}
        <motion.div
          className="relative z-10 flex items-center gap-5 w-full pointer-events-none"
          style={{ x: translateX, y: translateY }}
        >
          {/* Floating Icon Base */}
          <div className="w-[72px] h-[72px] rounded-[20px] bg-white/60 border border-white/80 shadow-[0_10px_20px_rgb(0,0,0,0.05)] flex items-center justify-center p-3 backdrop-blur-md">
            <img
              src={mod.iconUrl}
              alt={`${mod.name} icon`}
              className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-110 transition-all duration-300 mix-blend-multiply"
            />
          </div>

          {/* Floating Text */}
          <div>
            <h3 className="font-extrabold text-black text-[19px] tracking-tight mb-1">{mod.name}</h3>
            <p className="text-slate-800 text-[14px] font-semibold leading-relaxed">{mod.description}</p>
          </div>
        </motion.div>
      </motion.a>
    </div>
  );
};

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
    <div className="min-h-screen relative overflow-hidden bg-[#ecdcd0] text-slate-800 font-sans p-6 md:p-10 perspective-[1000px]">
      {/* 2D Canvas Background (Matching Login) */}
      <LoginBackground />

      {/* Content Container */}
      <div className="relative z-10 max-w-[1200px] mx-auto animate-in fade-in duration-700">

        {/* Top Bar */}
        <div className="flex justify-between items-center mb-12">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Crudex Logo"
              className="h-[64px] md:h-[72px] mix-blend-multiply object-contain transition-transform hover:scale-105 duration-300"
            />
          </div>

          {/* Right: User */}
          <div className="flex items-center gap-5">

            <div className="flex items-center gap-3 cursor-default p-1.5 pr-2 rounded-full">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden border-2 border-white shadow-sm">
                {user?.image_url ? (
                  <img
                    src={user.image_url.startsWith('http') ? user.image_url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'}/${user.image_url.startsWith('/') ? user.image_url.substring(1) : user.image_url}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.full_name?.charAt(0)?.toUpperCase() || <User size={16} />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-bold text-[13px] text-slate-900 leading-none">
                  {user?.full_name || user?.username || 'User'}
                </div>
                <div className="text-slate-500 text-[11px] font-medium mt-1 capitalize">
                  {user?.role_name || 'Role'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-14">
          <h1 className="text-[48px] md:text-[56px] font-black mb-3 font-['Fraunces',serif] tracking-tight text-[#1a1c20] leading-tight">
            Crudex Workspace
          </h1>
          {/* <p className="text-slate-600 text-[15px] font-medium max-w-2xl mx-auto">
            Streamline your entire business operation from one central hub.
          </p> */}
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-12 gap-5 mb-14 max-w-[1100px] mx-auto">
          {authorizedModules.map((mod) => (
            <MotionCard key={mod.id} mod={mod} onClick={() => navigate(mod.path)} />
          ))}
        </div>



      </div>
    </div>
  );
};

export default AppLauncher;
