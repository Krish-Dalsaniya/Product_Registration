import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import AuthGuard from '../features/auth/AuthGuard';
import RoleGuard from '../features/auth/RoleGuard';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Breadcrumbs from '../components/shared/Breadcrumbs';
import AssistantPanel from '../components/shared/AssistantPanel';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { X, Home, Users, Briefcase, ShoppingBag, Wrench, Box, Layers, Cpu, LayoutGrid, Package, LifeBuoy, MessageSquare, Shield } from 'lucide-react';

const IconMap = {
  Home,
  Users,
  Briefcase,
  ShoppingBag,
  Wrench,
  Box,
  Layers,
  Cpu,
  LayoutGrid,
  Package,
  LifeBuoy,
  MessageSquare,
  Shield
};

const getTabMetadata = (pathname, search) => {
  const params = new URLSearchParams(search);
  const role = params.get('role') || '';
  
  if (pathname === '/admin/dashboard' || pathname === '/designer/dashboard' || pathname === '/sales/dashboard' || pathname === '/maintenance/dashboard') {
    return { label: 'Dashboard', iconType: 'Home' };
  }
  if (pathname === '/admin/users') {
    return { label: 'Users', iconType: 'Users' };
  }
  if (pathname === '/admin/designers') {
    return { label: 'Designers', iconType: 'Users' };
  }
  if (pathname === '/admin/roles') {
    return { label: 'Roles', iconType: 'Shield' };
  }
  if (pathname === '/admin/maintenance') {
    return { label: 'Maintenance', iconType: 'Wrench' };
  }
  if (pathname === '/admin/sales') {
    return { label: 'Sales', iconType: 'ShoppingBag' };
  }
  if (pathname === '/admin/teams') {
    return { label: 'Teams', iconType: 'Users' };
  }
  if (pathname === '/admin/products') {
    return { label: 'Products', iconType: 'Box' };
  }
  if (pathname.startsWith('/admin/products/')) {
    return { label: 'Product Profile', iconType: 'Box' };
  }
  if (pathname === '/admin/customers') {
    return { label: 'Customers', iconType: 'Layers' };
  }
  if (pathname === '/admin/finished-goods') {
    return { label: 'Finished Goods', iconType: 'Package' };
  }
  if (pathname === '/admin/book-a-sale') {
    return { label: 'Book a Sale', iconType: 'ShoppingBag' };
  }
  if (pathname.endsWith('/support-tickets')) {
    return { label: 'Support Center', iconType: 'LifeBuoy' };
  }
  if (pathname.includes('/support-tickets/')) {
    return { label: 'Support Ticket', iconType: 'LifeBuoy' };
  }
  if (pathname === '/admin/inventory') {
    return { label: 'Inventory', iconType: 'Box' };
  }
  if (pathname === '/admin/inventory/pcb') {
    return { label: 'PCB Inventory', iconType: 'Cpu' };
  }
  if (pathname === '/admin/inventory/electronics') {
    return { label: 'Electronics Parts', iconType: 'Cpu' };
  }
  if (pathname === '/admin/inventory/electrical') {
    return { label: 'Electrical Parts', iconType: 'Wrench' };
  }
  if (pathname === '/admin/inventory/structural') {
    return { label: 'Structural Parts', iconType: 'Box' };
  }
  
  if (pathname.includes('/chat')) {
    return { label: 'Chat', iconType: 'MessageSquare' };
  }
  
  // Default fallback
  return { label: 'System Page', iconType: 'Briefcase' };
};

// Lazy load components
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const UserListPage = lazy(() => import('../features/admin/UserListPage'));
const TeamsPage = lazy(() => import('../features/admin/TeamsPage'));
const ProductListPage = lazy(() => import('../features/admin/ProductListPage'));
const ProductProfilePage = lazy(() => import('../features/admin/ProductProfilePage'));
const CustomerListPage = lazy(() => import('../features/admin/CustomerListPage'));
const FinishedGoodsPage = lazy(() => import('../features/admin/FinishedGoodsPage'));
const InventoryListPage = lazy(() => import('../features/admin/InventoryListPage'));
const ElectronicsPartsPage = lazy(() => import('../features/admin/ElectronicsPartsPage'));
const ElectricalPartsPage = lazy(() => import('../features/admin/ElectricalPartsPage'));
const StructuralPartsPage = lazy(() => import('../features/admin/StructuralPartsPage'));
const BookASalePage = lazy(() => import('../features/admin/BookASalePage'));
const SupportTicketsPage = lazy(() => import('../features/admin/SupportTicketsPage'));
const SupportTicketProfilePage = lazy(() => import('../features/admin/SupportTicketProfilePage'));
const ChatPage = lazy(() => import('../features/chat/ChatPage'));
const RolesPage = lazy(() => import('../features/admin/RolesPage'));


const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent)]"></div>
  </div>
);

const DashboardLayout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const storageKey = user?.user_id ? `workspace_tabs_${user.user_id}` : 'workspace_tabs_default';

  // State to store open tabs
  const [tabs, setTabs] = React.useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const activePath = location.pathname + location.search;

  // Add a tab when location changes
  React.useEffect(() => {
    // Avoid adding tabs for login, unauthorized or wildcard pages
    if (['/login', '/unauthorized', '/unauthorized/'].includes(location.pathname)) return;
    if (location.pathname === '/' || location.pathname === '') return;
    if (location.pathname.endsWith('/dashboard')) return; // Do not add tabs for dashboards

    const meta = getTabMetadata(location.pathname, location.search);
    
    setTabs(prevTabs => {
      const exists = prevTabs.some(t => t.fullPath === activePath);
      if (exists) return prevTabs;
      
      const newTabs = [...prevTabs, {
        fullPath: activePath,
        label: meta.label,
        iconType: meta.iconType
      }];
      
      localStorage.setItem(storageKey, JSON.stringify(newTabs));
      return newTabs;
    });
  }, [activePath, location.pathname, location.search]);

  // Function to close a tab
  const handleCloseTab = (e, pathToDelete) => {
    e.stopPropagation(); // Prevent navigating to the tab being closed
    
    const indexToDelete = tabs.findIndex(t => t.fullPath === pathToDelete);
    const newTabs = tabs.filter(t => t.fullPath !== pathToDelete);
    
    if (newTabs.length === 0) {
      const isStandardRole = ['Admin', 'Designer', 'Sales', 'Maintenance'].includes(user?.role_name);
      const defaultPath = isStandardRole ? `/${user.role_name.toLowerCase()}/dashboard` : '/admin/dashboard';
      setTabs([]);
      localStorage.removeItem(storageKey);
      navigate(defaultPath);
      return;
    }

    setTabs(newTabs);
    localStorage.setItem(storageKey, JSON.stringify(newTabs));

    // If the closed tab was active, navigate to another tab
    if (activePath === pathToDelete) {
      const nextIndex = indexToDelete < newTabs.length ? indexToDelete : newTabs.length - 1;
      const nextTab = newTabs[nextIndex];
      navigate(nextTab.fullPath);
    }
  };

  // Function to clear all tabs
  const handleClearAllTabs = async () => {
    const result = await Swal.fire({
      title: 'Clear all tabs?',
      text: "Would you like to close all open tabs?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, clear them!'
    });
    
    if (result.isConfirmed) {
      const isStandardRole = ['Admin', 'Designer', 'Sales', 'Maintenance'].includes(user?.role_name);
      const defaultPath = isStandardRole ? `/${user.role_name.toLowerCase()}/dashboard` : '/admin/dashboard';
      
      setTabs([]);
      localStorage.removeItem(storageKey);
      navigate(defaultPath);
      toast.success('All tabs cleared');
    }
  };

  // Function to update a tab's label dynamically
  const updateTabLabel = React.useCallback((fullPath, newLabel) => {
    setTabs(prevTabs => {
      const needsUpdate = prevTabs.some(t => t.fullPath === fullPath && t.label !== newLabel);
      if (!needsUpdate) return prevTabs;

      const updated = prevTabs.map(t => {
        if (t.fullPath === fullPath) {
          return { ...t, label: newLabel };
        }
        return t;
      });
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-workspace)] transition-colors duration-300">
      <Navbar 
        onMenuClick={toggleSidebar} 
        tabs={tabs}
        activePath={activePath}
        onTabClose={handleCloseTab}
        onTabClick={(path) => navigate(path)}
        onClearAllTabs={handleClearAllTabs}
      />
      <div className="flex">
        <Sidebar 
          role={user?.role_name} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
        />
        <AssistantPanel isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
        <main className={`flex-1 md:ml-64 px-4 md:px-8 pt-[60px] pb-8 min-h-screen transition-all duration-300 bg-[var(--bg-workspace)]`}>
          {!location.pathname.match(/^\/admin\/products\/[^\/]+$/) && !location.pathname.match(/^\/admin\/support-tickets\/[^\/]+$/) && (
            <div className="max-w-[1600px] mx-auto h-0 overflow-visible flex justify-end pt-0 relative z-20 pointer-events-none">
              <div className="pointer-events-auto">
                <Breadcrumbs />
              </div>
            </div>
          )}
          <Suspense fallback={<PageLoader />}>
            <Outlet context={{ updateTabLabel }} />
          </Suspense>
        </main>
      </div>
    </div>
  );
};


const AdminDashboard = lazy(() => import('../features/admin/AdminDashboard'));

const Router = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<div className="p-10 text-center text-rose-500 font-bold bg-[var(--bg-workspace)] h-screen uppercase tracking-widest text-sm">Unauthorized Access Restricted</div>} />
        
        {/* Shared Workspace Routes */}
        <Route element={<AuthGuard><DashboardLayout /></AuthGuard>}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserListPage />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/admin/designers" element={<UserListPage initialRole="Designer" />} />
          <Route path="/admin/maintenance" element={<UserListPage initialRole="Maintenance" />} />
          <Route path="/admin/sales" element={<UserListPage initialRole="Sales" />} />
          <Route path="/admin/teams" element={<TeamsPage />} />
          <Route path="/admin/products" element={<ProductListPage />} />
          <Route path="/admin/products/:id" element={<ProductProfilePage />} />
          <Route path="/admin/customers" element={<CustomerListPage />} />
          <Route path="/admin/finished-goods" element={<FinishedGoodsPage />} />
          <Route path="/admin/inventory" element={<InventoryListPage />} />
          <Route path="/admin/inventory/pcb" element={<InventoryListPage type="PCB" />} />
          <Route path="/admin/inventory/electronics" element={<ElectronicsPartsPage />} />
          <Route path="/admin/inventory/electrical" element={<ElectricalPartsPage />} />
          <Route path="/admin/inventory/structural" element={<StructuralPartsPage />} />
          <Route path="/admin/book-a-sale" element={<BookASalePage />} />
          <Route path="/admin/support-tickets" element={<SupportTicketsPage />} />
          <Route path="/admin/support-tickets/:id" element={<SupportTicketProfilePage />} />
          <Route path="/admin/chat" element={<ChatPage />} />

        </Route>

        {/* Designer Workspace Dashboard & Specifics */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Designer']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/designer" element={<Navigate to="/designer/dashboard" />} />
          <Route path="/designer/dashboard" element={<div className="p-10 text-[var(--text-main)] font-black uppercase tracking-widest">Designer Dashboard Initialization...</div>} />
          <Route path="/designer/support-tickets" element={<SupportTicketsPage />} />
          <Route path="/designer/support-tickets/:id" element={<SupportTicketProfilePage />} />
          <Route path="/designer/chat" element={<ChatPage />} />
        </Route>

        {/* Sales Workspace Dashboard & Specifics */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Sales']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/sales" element={<Navigate to="/sales/dashboard" />} />
          <Route path="/sales/dashboard" element={<div className="p-10 text-[var(--text-main)] font-black uppercase tracking-widest">Sales Dashboard Initialization...</div>} />
          {/* <Route path="/sales/opportunities" element={<div className="p-10 text-[var(--text-main)] font-black uppercase tracking-widest">Opportunities Pipeline...</div>} /> */}
          <Route path="/sales/support-tickets" element={<SupportTicketsPage />} />
          <Route path="/sales/support-tickets/:id" element={<SupportTicketProfilePage />} />
          <Route path="/sales/chat" element={<ChatPage />} />
        </Route>

        {/* Maintenance Workspace Dashboard & Specifics */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Maintenance']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/maintenance" element={<Navigate to="/maintenance/dashboard" />} />
          <Route path="/maintenance/dashboard" element={<div className="p-10 text-[var(--text-main)] font-black uppercase tracking-widest">Maintenance Dashboard Initialization...</div>} />
          <Route path="/maintenance/support-tickets" element={<SupportTicketsPage />} />
          <Route path="/maintenance/support-tickets/:id" element={<SupportTicketProfilePage />} />
          <Route path="/maintenance/chat" element={<ChatPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/admin/dashboard" />} />
        <Route path="*" element={<div className="p-10 text-center font-black text-[var(--text-main)] bg-[var(--bg-workspace)] h-screen uppercase tracking-widest text-sm">404 — Record Not Found</div>} />
      </Routes>
    </Suspense>
  );
};

export default Router;
