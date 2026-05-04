import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const Breadcrumbs = ({ items = [] }) => {
  const location = useLocation();

  const pathnames = location.pathname.split('/').filter((x) => x);
  
  const breadcrumbItems = items.length > 0 ? items : pathnames.map((name, index) => {
    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
    const isLast = index === pathnames.length - 1;
    const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
    return { label: displayName, path: routeTo, active: isLast };
  });

  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              {index > 0 && (
                <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--border-color)', margin: '0 4px' }} />
              )}
              {item.active ? (
                <span
                  className="text-[12px] font-black uppercase tracking-[0.2em]"
                  style={{ color: 'var(--text-main)' }}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="text-[12px] font-black uppercase tracking-[0.2em] transition-colors duration-200"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
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
