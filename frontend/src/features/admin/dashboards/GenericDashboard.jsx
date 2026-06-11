import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Cpu, 
  Briefcase, 
  ShoppingBag, 
  LifeBuoy, 
  Box, 
  ChevronRight,
  ShieldCheck,
  Clock,
  MessageSquare
} from 'lucide-react';

const GenericDashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const ModuleCard = ({ title, description, icon: Icon, path, permissionModule, permissionAction, accentColor, bgGradient }) => {
    if (permissionModule && !hasPermission(permissionModule, permissionAction)) return null;

    return (
      <div
        onClick={() => navigate(path)}
        className="workspace-card p-5 border border-[var(--border-color)] group cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 relative overflow-hidden h-full flex flex-col"
        style={{ background: 'var(--bg-card)' }}
      >
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
          style={{ background: bgGradient || `linear-gradient(135deg, ${accentColor} 0%, transparent 100%)` }}
        />
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 shadow-sm group-hover:-rotate-3"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-workspace)] border border-[var(--border-color)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-colors">
            <ChevronRight size={16} />
          </div>
        </div>
        
        <div className="relative z-10 mt-auto">
          <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight mb-1">{title}</h3>
          <p className="text-[12px] font-medium text-[var(--text-muted)] line-clamp-2">{description}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-92px)] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6 px-4 md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-8">
      
      {/* Dynamic Header Hero Section */}
      <div className="relative w-full rounded-3xl overflow-hidden mt-10 mb-4 border border-[var(--border-color)] shadow-sm animate-entrance-down flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[var(--bg-card)] opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--accent)] rounded-full blur-3xl opacity-10 pointer-events-none animate-pulse" />
        
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex items-center md:items-start gap-6 flex-col md:flex-row text-center md:text-left">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[var(--bg-elevated)] border-2 border-[var(--accent)] shadow-lg flex items-center justify-center relative z-10">
                {user?.image_url ? (
                  <img
                    src={user.image_url.startsWith('http') ? user.image_url : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/${user.image_url.startsWith('/') ? user.image_url.substring(1) : user.image_url}`}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-3xl font-black text-[var(--accent)] tracking-tighter">
                    {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border-2 border-[var(--bg-card)] shadow-sm z-20 flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Active
              </div>
            </div>
            
            <div className="mt-2">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-1 text-[var(--text-muted)] font-semibold text-sm">
                <Clock size={14} className="text-[var(--accent)]" /> {greeting}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
                 {user?.full_name || 'User'}
              </h1>
              <div className="mt-3 flex items-center gap-2 justify-center md:justify-start">
                <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-[var(--accent)]/20 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  {user?.role_name || 'System Role'} Workspace
                </span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex flex-col items-end justify-center text-right pr-4 border-r-2 border-[var(--accent)] h-full opacity-80">
             <h2 className="font-bold text-[var(--text-main)] text-lg mb-1 tracking-wide">CRUD<span className="text-[var(--accent)]">EX</span> System</h2>
             <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Enterprise Platform</p>
          </div>
        </div>
      </div>

      {/* Accessible Modules Section */}
      <div className="animate-entrance-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-2 mb-6 ml-2">
          <LayoutDashboard className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-lg font-bold text-[var(--text-main)] tracking-wide">Your Modules</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <ModuleCard 
            title="Users Directory" 
            description="Manage system users and access controls."
            icon={Users} 
            path="/admin/users" 
            permissionModule="users" 
            permissionAction="view" 
            accentColor="#6366f1" // Indigo
          />
          <ModuleCard 
            title="Product Catalog" 
            description="View and manage the core product database."
            icon={Cpu} 
            path="/admin/products" 
            permissionModule="products" 
            permissionAction="view" 
            accentColor="#06b6d4" // Cyan
          />
          <ModuleCard 
            title="Customer Registry" 
            description="Manage client relationships and customer data."
            icon={Briefcase} 
            path="/admin/customers" 
            permissionModule="customers" 
            permissionAction="view" 
            accentColor="#8b5cf6" // Purple
          />
          <ModuleCard 
            title="Sales Hub" 
            description="Book new sales and view transaction history."
            icon={ShoppingBag} 
            path="/admin/book-a-sale" 
            permissionModule="sales" 
            permissionAction="view" 
            accentColor="#f59e0b" // Amber
          />
          <ModuleCard 
            title="Support Tickets" 
            description="Handle maintenance requests and issue tracking."
            icon={LifeBuoy} 
            path="/admin/support-tickets" 
            permissionModule="supporttickets" 
            permissionAction="view" 
            accentColor="#ef4444" // Red
          />
          <ModuleCard 
            title="Inventory Check" 
            description="Monitor components, PCBs, and structural parts."
            icon={Box} 
            path="/admin/inventory" 
            permissionModule="inventory" 
            permissionAction="view" 
            accentColor="#10b981" // Emerald
          />
          <ModuleCard 
            title="Communication" 
            description="Connect with your team in real-time."
            icon={MessageSquare} 
            path="/admin/chat" 
            accentColor="#ec4899" // Pink
            // No permission check for Chat based on current logic, visible to all mapped generic users
          />
        </div>
      </div>
      
    </div>
  );
};

export default GenericDashboard;
