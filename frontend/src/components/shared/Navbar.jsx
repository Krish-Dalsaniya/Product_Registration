import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Bell } from 'lucide-react';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-20 z-30 transition-all">
      <div
        className="h-full px-8 flex items-center justify-between"
        style={{
          background: 'var(--grad-header)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div />
        <div className="flex items-center gap-6">
          <button
            className="p-1 rounded-full transition-all group"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Bell size={20} strokeWidth={2.5} />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent)',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--border-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20} className="fill-current" /> : <Sun size={20} className="fill-current" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
