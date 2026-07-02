import React from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Router from './router';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthInterceptor />
          <TitleUpdater />
          <Router />
          <Toaster position="top-right" />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

function AuthInterceptor() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  React.useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      navigate('/login');
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [navigate, logout]);

  return null;
}

function TitleUpdater() {
  const location = useLocation();

  React.useEffect(() => {
    const defaultTitle = "Leons' Integration ERP";
    const path = location.pathname;
    const segment = path.split('/')[1];

    let moduleName = "";

    switch (segment) {
      case 'hr':
        moduleName = 'HR';
        break;
      case 'admin':
      case 'designer':
      case 'sales':
      case 'maintenance':
      case 'accountant':
        moduleName = 'Product Registration';
        break;
      case 'crm':
        moduleName = 'CRM';
        break;
      case 'logistics':
        moduleName = 'Logistics';
        break;
      case 'accounts':
        moduleName = 'Accounts';
        break;
      case 'settings':
        moduleName = 'Settings';
        break;
      default:
        moduleName = '';
    }

    if (moduleName) {
      document.title = `${moduleName} | ${defaultTitle}`;
    } else {
      document.title = defaultTitle;
    }
  }, [location]);

  return null;
}

export default App;
