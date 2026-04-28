import React from 'react';

const Navbar = () => {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-20 z-30 transition-all">
      <div className="h-full px-8 flex items-center justify-between backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div />
        <div className="flex items-center gap-4">
          {/* User profile or other nav items could go here */}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
