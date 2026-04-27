import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RoleGuard = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role_name)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default RoleGuard;
