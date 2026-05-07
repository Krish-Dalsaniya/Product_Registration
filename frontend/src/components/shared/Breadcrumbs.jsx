import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const Breadcrumbs = ({ items = [] }) => {
  const location = useLocation();

  const pathLabels = {
    'admin': 'Dashboard',
    'users': 'Users',
    'designers': 'Designers',
    'sales': 'Sales',
    'maintenance': 'Maintenance',
    'teams': 'Teams',
    'products': 'Products',
    'customers': 'Customers',
    'feature-mapping': 'Feature Mapping',
    'dashboard': 'Overview',
    'designer': 'Designer',
    'opportunities': 'Opportunities'
  };

  const pathnames = location.pathname.split('/').filter((x) => x);
  
  // Define logical hierarchy that doesn't match the URL structure
  const hierarchyMap = {
    '/admin/users': ['admin'],
    '/admin/designers': ['admin', 'users'],
    '/admin/maintenance': ['admin', 'users'],
    '/admin/sales': ['admin', 'users'],
    '/admin/teams': ['admin', 'users', 'designers']
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
    <nav className="flex mb-6 overflow-hidden" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-y-2">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight size={10} strokeWidth={4} className="text-[var(--text-dim)] mx-3 opacity-40" />
            )}
            {item.active ? (
              <span
                className="text-[11px] font-black uppercase tracking-[0.25em] whitespace-nowrap"
                style={{ color: 'var(--text-main)' }}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-300 whitespace-nowrap opacity-60 hover:opacity-100 hover:translate-x-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
