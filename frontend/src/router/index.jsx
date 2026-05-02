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

const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
  </div>
);

const DashboardLayout = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[var(--bg-workspace)] transition-colors duration-300">
      <Navbar />
      <div className="flex">
        <Sidebar role={user?.role_name} />
        <main className="flex-1 md:ml-64 p-6 pt-20 min-h-screen transition-all duration-300">
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
        <Route path="/unauthorized" element={<div className="p-10 text-center text-red-600 font-bold">Unauthorized</div>} />
        
        {/* Admin Routes */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Admin']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/admin/users" element={<UserListPage />} />
          <Route path="/admin/designers" element={<UserListPage initialRole="Designer" />} />
          <Route path="/admin/maintenance" element={<UserListPage initialRole="Maintenance" />} />
          <Route path="/admin/sales" element={<UserListPage initialRole="Sales" />} />
          <Route path="/admin/teams" element={<TeamsPage />} />
          <Route path="/admin/products" element={<ProductListPage />} />
        </Route>

        {/* Designer Routes */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Designer']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/designer/dashboard" element={<div>Designer Dashboard</div>} />
        </Route>

        {/* Sales Routes */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Sales']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/sales/dashboard" element={<div>Sales Dashboard</div>} />
          <Route path="/sales/opportunities" element={<div>Sales Opportunities</div>} />
        </Route>

        {/* Maintenance Routes */}
        <Route element={<AuthGuard><RoleGuard allowedRoles={['Maintenance']}><DashboardLayout /></RoleGuard></AuthGuard>}>
          <Route path="/maintenance/dashboard" element={<div>Maintenance Dashboard</div>} />
        </Route>

        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<div className="p-10 text-center font-bold">404 Not Found</div>} />
      </Routes>
    </Suspense>
  );
};

export default Router;
