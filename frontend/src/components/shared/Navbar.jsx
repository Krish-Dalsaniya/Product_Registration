import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-20 z-30 transition-all">
      <div className="h-full px-8 flex items-center justify-between backdrop-blur-md bg-[var(--bg-card)]/80 border-b border-[var(--border-color)]">
        <div />
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-blue-600 hover:scale-110 transition-all shadow-sm"
          >
            {theme === 'light' ? <Moon size={20} fill="currentColor" /> : <Sun size={20} fill="currentColor" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
