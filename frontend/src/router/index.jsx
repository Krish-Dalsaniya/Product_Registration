import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthGuard from '../features/auth/AuthGuard';
import RoleGuard from '../features/auth/RoleGuard';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import { useAuth } from '../context/AuthContext';

// Lazy load components
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const UserListPage = lazy(() => import('../features/admin/UserListPage'));
const TeamsPage = lazy(() => import('../features/admin/TeamsPage'));
const ProductListPage = lazy(() => import('../features/admin/ProductListPage'));
const CustomerListPage = lazy(() => import('../features/admin/CustomerListPage'));
const FeatureMappingPage = lazy(() => import('../features/admin/FeatureMappingPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent)]"></div>
  </div>
);

const DashboardLayout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-[var(--bg-workspace)] transition-colors duration-300">
      <Navbar onMenuClick={toggleSidebar} />
      <div className="flex">
        <Sidebar 
          role={user?.role_name} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        <main className={`flex-1 md:ml-64 px-4 md:px-8 py-0 pt-[4.2rem] md:pt-[4.2rem] min-h-screen transition-all duration-300 bg-[var(--bg-workspace)]`}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};


const Router = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<div className="p-10 text-center text-rose-500 font-bold bg-[var(--bg-workspace)] h-screen uppercase tracking-widest text-sm">Unauthorized Access Restricted</div>} />
        
        {/* Admin Routes */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Admin']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/admin/users" element={<UserListPage />} />
          <Route path="/admin/designers" element={<UserListPage initialRole="Designer" />} />
          <Route path="/admin/maintenance" element={<UserListPage initialRole="Maintenance" />} />
          <Route path="/admin/sales" element={<UserListPage initialRole="Sales" />} />
          <Route path="/admin/teams" element={<TeamsPage />} />
          <Route path="/admin/products" element={<ProductListPage />} />
          <Route path="/admin/customers" element={<CustomerListPage />} />
          <Route path="/admin/feature-mapping" element={<FeatureMappingPage />} />
        </Route>

        {/* Designer Routes */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Designer']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/designer/dashboard" element={<div className="p-10 text-[var(--text-main)] font-black uppercase tracking-widest">Designer Dashboard Initialization...</div>} />
        </Route>

        {/* Sales Routes */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Sales']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/sales/dashboard" element={<div className="p-10 text-[var(--text-main)] font-black uppercase tracking-widest">Sales Dashboard Initialization...</div>} />
          <Route path="/sales/opportunities" element={<div className="p-10 text-[var(--text-main)] font-black uppercase tracking-widest">Opportunities Pipeline...</div>} />
        </Route>

        {/* Maintenance Routes */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Maintenance']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/maintenance/dashboard" element={<div className="p-10 text-[var(--text-main)] font-black uppercase tracking-widest">Maintenance Dashboard Initialization...</div>} />
        </Route>

        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<div className="p-10 text-center font-black text-[var(--text-main)] bg-[var(--bg-workspace)] h-screen uppercase tracking-widest text-sm">404 — Record Not Found</div>} />
      </Routes>
    </Suspense>
  );
};

export default Router;
