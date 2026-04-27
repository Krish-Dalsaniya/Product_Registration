import React from 'react';

const Navbar = () => {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-20 z-30 transition-all">
      <div className="h-full px-8 flex items-center justify-between backdrop-blur-md bg-white/80 border-b border-gray-100">
        <h2 className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em]">Operational Terminal</h2>
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
          <span className="text-[10px] font-black text-emerald-600 tracking-widest uppercase">System Online</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
