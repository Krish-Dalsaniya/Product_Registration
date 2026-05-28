import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const AVAILABLE_THEMES = [
  { id: 'light', name: 'Light (Default)' },
  { id: 'dark', name: 'Dark (Default)' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'retro', name: 'Retro' },
  { id: 'modified-retro', name: 'Modified Retro' },
  { id: 'forest', name: 'Forest' },
  { id: 'rose-gold', name: 'Rose Gold' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'nord', name: 'Nord' },
  { id: 'default-white', name: 'Clean White' },
  { id: 'pastel-mint', name: 'Mint' },
  { id: 'cozy-oatmeal', name: 'Oatmeal' },
  { id: 'lavender-mist', name: 'Lavender' }
];

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    // dark is the default :root styling, so we don't necessarily need a data-theme="dark", 
    // but setting it is fine and ensures consistency.
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  // Keep toggleTheme for backwards compatibility if needed, toggling between light/dark
  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
