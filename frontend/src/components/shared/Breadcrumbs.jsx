import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = ({ items = [] }) => {
  const location = useLocation();

  // If no items are passed, we can try to generate them from the URL path
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  const breadcrumbItems = items.length > 0 ? items : pathnames.map((name, index) => {
    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
    const isLast = index === pathnames.length - 1;
    const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');

    return {
      label: displayName,
      path: routeTo,
      active: isLast
    };
  });

  return (
    <nav className="flex mb-2" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              {index > 0 && <ChevronRight size={14} className="text-[var(--text-muted)] opacity-50 mx-1" />}
              {item.active ? (
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="text-[11px] font-black text-[var(--text-muted)] hover:text-blue-600 uppercase tracking-[0.2em] transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
