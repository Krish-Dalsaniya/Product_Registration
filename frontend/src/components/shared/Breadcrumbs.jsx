import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Breadcrumbs = ({ items = [] }) => {
  const location = useLocation();
  const { user } = useAuth();

  let homePath = user?.role_name ? `/${user.role_name.toLowerCase()}/dashboard` : '/';

  if (location.pathname.startsWith('/hr')) {
    homePath = '/hr';
  }

  const pathLabels = {
    'admin': 'Dashboard',
    'users': 'Users',
    'designers': 'Designers',
    'sales': 'Sales',
    'maintenance': 'Maintenance',
    'teams': 'Teams',
    'products': 'Products',
    'customers': 'Customers',
    'dashboard': 'Dashboard',
    'designer': 'Designer',
    'opportunities': 'Opportunities',
    'inventory': 'Inventory',
    'finished-goods': 'Finished Goods'
  };

  const pathnames = location.pathname.split('/').filter((x) => x);
  
  const searchParams = new URLSearchParams(location.search);
  const role = searchParams.get('role') || '';

  // Define logical hierarchy that doesn't match the URL structure
  const hierarchyMap = {
    '/admin/users': ['admin'],
    '/admin/designers': ['admin', 'users'],
    '/admin/maintenance': ['admin', 'users'],
    '/admin/sales': ['admin', 'users'],
    '/admin/teams': ['admin'],
    '/admin/finished-goods': ['admin', 'inventory']
  };

  const currentPath = location.pathname;
  const logicalSegments = hierarchyMap[currentPath] 
    ? [...hierarchyMap[currentPath], pathnames[pathnames.length - 1]]
    : pathnames;

  const breadcrumbItems = items.length > 0 ? items : logicalSegments.map((name, index) => {
    let routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
    
    // Handle the custom logical routeTo
    if (hierarchyMap[currentPath]) {
      // For segments in the hierarchy, map to their actual paths
      if (name === 'admin') routeTo = '/admin/dashboard';
      else if (name === 'users') routeTo = '/admin/users';
      else if (name === 'designers') routeTo = '/admin/designers';
      else if (name === 'sales') routeTo = '/admin/sales';
      else if (name === 'maintenance') routeTo = '/admin/maintenance';
      else if (name === 'inventory') routeTo = '/admin/inventory';
      else routeTo = currentPath; // The last item
    } else {
      // Default logic for flat paths
      if (['admin', 'designer', 'sales', 'maintenance'].includes(name.toLowerCase()) && index === 0) {
        routeTo = `/${name.toLowerCase()}/dashboard`;
      }
    }

    const isLast = index === logicalSegments.length - 1;
    let label = pathLabels[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');

    if (name.toLowerCase() === 'dashboard' && index > 0) {
      return null;
    }

    return { label, path: routeTo, active: isLast };
  }).filter(item => item !== null);

  // Ensure the last item is active after filtering
  if (breadcrumbItems.length > 0) {
    breadcrumbItems[breadcrumbItems.length - 1].active = true;
  }

  return (
    <nav className="flex items-center mb-3 animate-entrance-down" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-x-2">
        <li className="flex items-center">
          <Link 
            to={homePath} 
            className="flex items-center text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-200"
          >
            <Home size={16} className="mr-2" />
            <span className="text-sm font-medium">Home</span>
          </Link>
        </li>

        {breadcrumbItems.map((item, index) => {
          // Skip if it's the 'admin' or 'dashboard' root as we have 'Home' now
          if (
            item.label?.toLowerCase() === 'dashboard' || 
            item.label?.toLowerCase() === 'admin' ||
            (location.pathname.startsWith('/hr') && item.label?.toLowerCase() === 'hr')
          ) return null;
          
          return (
            <li key={index} className="flex items-center">
              <ChevronRight size={14} className="text-[var(--text-dim)] mx-1 opacity-50" />
              {item.active ? (
                <span className="text-sm font-semibold text-[var(--text-main)] px-2 py-1 rounded-md bg-[var(--nav-active)]/10">
                  {item.label}
                </span>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)] px-2 py-1 rounded-md transition-all duration-200"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  to={item.path}
                  className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)] px-2 py-1 rounded-md transition-all duration-200"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;

