import React from 'react';

const RoleBadge = ({ role }) => {
  const styles = {
    Sales: {
      background: 'var(--badge-sales-bg)',
      color: 'var(--badge-sales-text)',
      border: '1px solid var(--badge-sales-text)',
      opacity: '0.9',
    },
    Maintenance: {
      background: 'var(--badge-maint-bg)',
      color: 'var(--badge-maint-text)',
      border: '1px solid var(--badge-maint-text)',
      opacity: '0.9',
    },
    Admin: {
      background: 'var(--badge-admin-bg)',
      color: 'var(--badge-admin-text)',
      border: '1px solid var(--badge-admin-text)',
      opacity: '0.9',
    },
    Designer: {
      background: 'var(--badge-admin-bg)',
      color: 'var(--badge-admin-text)',
      border: '1px solid var(--badge-admin-text)',
      opacity: '0.9',
    },
    Teams: {
      background: 'var(--badge-teams-bg)',
      color: 'var(--badge-teams-text)',
      border: '1px solid var(--badge-teams-text)',
      opacity: '0.9',
    },
  };

  const current = styles[role] || {
    background: 'var(--badge-teams-bg)',
    color: 'var(--badge-teams-text)',
    border: '1px solid var(--badge-teams-text)',
  };

  return (
    <span
      style={{
        ...current,
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: '700',
        borderRadius: '20px',
        display: 'inline-block',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {role}
    </span>
  );
};

export default RoleBadge;
