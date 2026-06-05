import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const AVAILABLE_THEMES = [
  // Light themes
  { id: 'light', name: '☀️ Sunrise', group: 'Light' },
  { id: 'default-white', name: '🤍 Clean White', group: 'Light' },
  { id: 'forest', name: '🌿 Forest', group: 'Light' },
  { id: 'rose-gold', name: '🌸 Rose Gold', group: 'Light' },
  { id: 'ocean', name: '🌊 Ocean', group: 'Light' },
  { id: 'retro', name: '📜 Retro Parchment', group: 'Light' },
  { id: 'modified-retro', name: '🍂 Modified Retro', group: 'Light' },
  { id: 'pastel-mint', name: '🌱 Mint', group: 'Light' },
  { id: 'cozy-oatmeal', name: '🌾 Oatmeal', group: 'Light' },
  { id: 'lavender-mist', name: '💜 Lavender', group: 'Light' },
  { id: 'amber-clay', name: '🏺 Amber Clay', group: 'Light' },
  { id: 'arctic-sky', name: '❄️ Arctic Sky', group: 'Light' },
  { id: 'sage-linen', name: '🌿 Sage Linen', group: 'Light' },
  // Dark themes
  { id: 'dark', name: '🌑 Midnight', group: 'Dark' },
  { id: 'cyberpunk', name: '⚡ Cyberpunk', group: 'Dark' },
  { id: 'nord', name: '🏔️ Nord', group: 'Dark' },
  { id: 'dracula', name: '🧛 Dracula', group: 'Dark' },
  { id: 'obsidian', name: '🖤 Obsidian', group: 'Dark' },
  { id: 'galaxy', name: '🌌 Galaxy', group: 'Dark' },
  { id: 'crimson-night', name: '🔴 Crimson Night', group: 'Dark' },
  { id: 'forest-night', name: '🌲 Forest Night', group: 'Dark' },
  { id: 'copper-dark', name: '🔶 Copper Dark', group: 'Dark' },
];

export const AVAILABLE_FONTS = [
  { id: 'font-inter', name: 'Inter', label: 'Modern & Clean', import: '' },
  { id: 'font-dm-sans', name: 'DM Sans', label: 'Rounded & Friendly', import: 'DM+Sans:wght@400;500;600;700' },
  { id: 'font-plus-jakarta', name: 'Plus Jakarta Sans', label: 'Editorial', import: 'Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  { id: 'font-outfit', name: 'Outfit', label: 'Geometric & Bold', import: 'Outfit:wght@300;400;500;600;700;800' },
  { id: 'font-sora', name: 'Sora', label: 'Futuristic', import: 'Sora:wght@300;400;500;600;700;800' },
  { id: 'font-lexend', name: 'Lexend', label: 'High Readability', import: 'Lexend:wght@300;400;500;600;700' },
  { id: 'font-nunito', name: 'Nunito', label: 'Playful & Soft', import: 'Nunito:wght@300;400;500;600;700;800' },
  { id: 'font-raleway', name: 'Raleway', label: 'Elegant & Thin', import: 'Raleway:wght@300;400;500;600;700;800' },
  { id: 'font-space-grotesk', name: 'Space Grotesk', label: 'Techy & Sharp', import: 'Space+Grotesk:wght@300;400;500;600;700' },
  { id: 'font-cabinet', name: 'Cabinet Grotesk', label: 'Distinctive', import: '' },
  { id: 'font-jetbrains', name: 'JetBrains Mono', label: 'Monospace Code', import: 'JetBrains+Mono:wght@400;500;600;700' },
  { id: 'font-fraunces', name: 'Fraunces', label: 'Serif & Classic', import: 'Fraunces:wght@300;400;500;600;700' },
];

const FONT_STACK_MAP = {
  'font-inter': '"Inter", system-ui, sans-serif',
  'font-dm-sans': '"DM Sans", system-ui, sans-serif',
  'font-plus-jakarta': '"Plus Jakarta Sans", system-ui, sans-serif',
  'font-outfit': '"Outfit", system-ui, sans-serif',
  'font-sora': '"Sora", system-ui, sans-serif',
  'font-lexend': '"Lexend", system-ui, sans-serif',
  'font-nunito': '"Nunito", system-ui, sans-serif',
  'font-raleway': '"Raleway", system-ui, sans-serif',
  'font-space-grotesk': '"Space Grotesk", system-ui, sans-serif',
  'font-cabinet': '"Cabinet Grotesk", "Outfit", system-ui, sans-serif',
  'font-jetbrains': '"JetBrains Mono", "Fira Code", monospace',
  'font-fraunces': '"Fraunces", Georgia, serif',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(localStorage.getItem('theme') || 'light');
  const [font, setFontState] = useState(localStorage.getItem('font') || 'font-inter');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply font
    const fontDef = AVAILABLE_FONTS.find(f => f.id === font);
    if (fontDef && fontDef.import) {
      const linkId = 'dynamic-font-link';
      let link = document.getElementById(linkId);
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${fontDef.import}&display=swap`;
    }
    // Set CSS variable
    const fontStack = FONT_STACK_MAP[font] || '"Inter", system-ui, sans-serif';
    document.documentElement.style.setProperty('--font-body', fontStack);
    document.documentElement.style.setProperty('--font-sans', fontStack);
    document.documentElement.setAttribute('data-font', font);
    localStorage.setItem('font', font);
  }, [font]);

  const setTheme = (newTheme) => setThemeState(newTheme);
  const setFont = (newFont) => setFontState(newFont);
  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, font, setFont, AVAILABLE_THEMES, AVAILABLE_FONTS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
