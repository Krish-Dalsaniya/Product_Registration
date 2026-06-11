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
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));

    if (user) {
      dispatch({
        type: 'LOGIN',
        payload: { user }
      });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }

    const handleUnauthorized = () => {
      logout();
    };

    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        const newUser = e.newValue ? JSON.parse(e.newValue) : null;
        if (newUser) {
          dispatch({ type: 'LOGIN', payload: { user: newUser } });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (email, password, rememberMe = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await loginApi(email, password);
      const { user } = res.data.data;
      
      if (rememberMe) {
        localStorage.setItem('user', JSON.stringify(user));
        sessionStorage.removeItem('user');
      } else {
        sessionStorage.setItem('user', JSON.stringify(user));
        localStorage.removeItem('user');
      }
      
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
    // Clear all workspace tabs to prevent them from persisting after logout
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('workspace_tabs_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUserImage = (newImageUrl) => {
    if (!state.user) return;
    const updatedUser = { ...state.user, image_url: newImageUrl };
    
    // Update storage
    if (localStorage.getItem('user')) {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } else if (sessionStorage.getItem('user')) {
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    dispatch({ type: 'LOGIN', payload: { user: updatedUser } });
  };

  const hasPermission = (moduleName, action, subsection = null) => {
    if (!state.user) return false;
    if (state.user.role_name?.toLowerCase() === 'admin') return true;
    
    if (!state.user.permissions) return false;
    if (state.user.permissions.includes('admin')) return true;
    
    const actionLower = action.toLowerCase();
    const modKey = moduleName.replace(/\s+/g, '').toLowerCase();

    if (subsection) {
      const subKey = subsection.replace(/\s+/g, '_').toLowerCase();
      return state.user.permissions.includes(`${modKey}.${subKey}.${actionLower}`);
    }

    const directKey = `${modKey}.${actionLower}`;
    if (state.user.permissions.includes(directKey)) return true;

    // Sub-section fallback logic:
    // If checking for general access (e.g. 'view') on a module, 
    // grant it if they have that action on ANY subsection of that module.
    if (actionLower === 'view' || actionLower === 'create' || actionLower === 'edit' || actionLower === 'delete') {
       return state.user.permissions.some(p => p.startsWith(`${modKey}.`) && p.endsWith(`.${actionLower}`));
    }

    return false;
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUserImage, hasPermission }}>
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
