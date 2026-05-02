import React from 'react';

const RoleBadge = ({ role }) => {
  const styles = {
    Sales: {
      bg: 'var(--stat-sales-bg)',
      text: 'var(--stat-sales-text)'
    },
    Maintenance: {
      bg: 'var(--stat-maint-bg)',
      text: 'var(--stat-maint-text)'
    },
    Admin: {
      bg: 'var(--badge-admin-bg)',
      text: 'var(--badge-admin-text)'
    },
    Designer: {
      bg: 'var(--stat-designer-bg)',
      text: 'var(--stat-designer-text)'
    }
  };

  const current = styles[role] || { bg: 'var(--badge-default-bg)', text: 'var(--badge-default-text)' };

  return (
    <span 
      style={{ 
        backgroundColor: current.bg, 
        color: current.text,
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: '500',
        borderRadius: '20px',
        display: 'inline-block'
      }}
    >
      {role}
    </span>
  );
};

export default RoleBadge;
