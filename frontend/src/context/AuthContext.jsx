import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { loginApi, logoutApi } from '../api/auth';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
      dispatch({
        type: 'LOGIN',
        payload: { user }
      });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await loginApi(email, password);
      const { user } = res.data.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({
        type: 'LOGIN',
        payload: { user }
      });
      return user;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  const hasPermission = (moduleName, action) => {
    if (!state.user) return false;
    if (state.user.role_name === 'Admin') return true;
    
    if (!state.user.permissions) return false;
    
    const actionLower = action.toLowerCase();
    const modKey = moduleName.replace(/\s+/g, '').toLowerCase();

    // Transparently proxy 'view' to check for either 'tech_view' or 'comm_view'
    if (actionLower === 'view') {
      return state.user.permissions.includes(`${modKey}.tech_view`) || 
             state.user.permissions.includes(`${modKey}.comm_view`);
    }

    const permissionKey = `${modKey}.${actionLower}`;
    return state.user.permissions.includes(permissionKey);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
