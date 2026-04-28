import React from 'react';

const RoleBadge = ({ role }) => {
  const styles = {
    Sales: {
      bg: '#ecfeff',
      text: '#0891b2'
    },
    Designer: {
      bg: '#e4e2ff',
      text: '#3730a3'
    },
    Maintenance: {
      bg: '#fef3c7',
      text: '#92400e'
    },
    Admin: {
      bg: '#f3e8ff',
      text: '#6b21a8'
    }
  };

  const current = styles[role] || { bg: '#f1f5f9', text: '#475569' };

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
