import React, { useRef, useState, useEffect } from 'react';
import { Menu, X, Briefcase, ChevronLeft, ChevronRight, Trash2, Package } from 'lucide-react';
import { Home, Users, ShoppingBag, Wrench, Box, Layers, Cpu, LayoutGrid } from 'lucide-react';

const IconMap = {
  Home,
  Users,
  Briefcase,
  ShoppingBag,
  Wrench,
  Box,
  Layers,
  Cpu,
  LayoutGrid,
  Package
};

const Navbar = ({ onMenuClick, tabs = [], activePath = '', onTabClose, onTabClick, onClearAllTabs }) => {
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs]);

  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activePath, tabs.length]);

  const scrollByAmount = (amount) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-[52px] z-30 transition-all">
      <div
        className="h-full px-4 md:px-8 flex items-center justify-between gap-4"
        style={{
          background: 'var(--grad-header)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <button
          onClick={onMenuClick}
          className="md:hidden p-3 rounded-xl transition-all bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent)]"
        >
          <Menu size={20} strokeWidth={3} />
        </button>

        {/* Dynamic Workspace Tabs inside Navbar */}
        <div className="hidden md:flex flex-1 items-center gap-2 overflow-hidden h-full">
          {canScrollLeft && (
            <button
              onClick={() => scrollByAmount(-200)}
              className="z-10 p-1.5 h-[32px] w-[32px] flex-shrink-0 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] rounded-lg shadow-sm transition-all"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
          )}
          
          <div 
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center gap-2 overflow-hidden h-full py-2 select-none w-full scroll-smooth"
          >
          {tabs.map((tab) => {
            const isActive = activePath === tab.fullPath;
            const Icon = IconMap[tab.iconType] || Briefcase;
            return (
              <div
                key={tab.fullPath}
                ref={isActive ? activeTabRef : null}
                onClick={() => onTabClick(tab.fullPath)}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border transition-all duration-300 flex-shrink-0 group ${
                  isActive
                    ? 'text-white border-transparent shadow-md shadow-[var(--border-glow)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--accent)]/40 hover:text-[var(--text-main)]'
                }`}
                style={isActive ? { background: 'var(--grad-button)', boxShadow: '0 4px 12px -2px var(--border-glow)' } : {}}
              >
                <Icon size={12} className={isActive ? 'text-white' : 'text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors'} />
                <span>{tab.label}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => onTabClose(e, tab.fullPath)}
                    className={`p-0.5 rounded-full transition-all duration-200 ${
                      isActive
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-rose-500/10 text-[var(--text-dim)] hover:text-rose-500'
                    }`}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scrollByAmount(200)}
              className="z-10 p-1.5 h-[32px] w-[32px] flex-shrink-0 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] rounded-lg shadow-sm transition-all"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          )}

          {tabs.length > 1 && (
            <div className="flex items-center pl-2 ml-1 border-l border-[var(--border-color)]">
              <button
                onClick={onClearAllTabs}
                title="Clear All Tabs"
                className="z-10 p-1.5 h-[32px] w-[32px] flex-shrink-0 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 rounded-lg shadow-sm transition-all"
              >
                <Trash2 size={16} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
          {/* Theme toggle removed per user request */}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
