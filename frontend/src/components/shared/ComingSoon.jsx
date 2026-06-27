import React from 'react';
import { Hammer } from 'lucide-react';

const ComingSoon = ({ feature }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-[var(--nav-hover)] rounded-full flex items-center justify-center mb-6 shadow-inner">
        <Hammer size={40} className="text-[var(--accent)] animate-pulse" />
      </div>
      <h2 className="text-3xl font-black text-[var(--text-main)] mb-3 tracking-tight">Under Construction</h2>
      <p className="text-[var(--text-muted)] max-w-md text-[15px] leading-relaxed">
        We are actively working on <span className="font-bold text-[var(--accent)]">{feature}</span>. This module will be available in an upcoming update!
      </p>
    </div>
  );
};

export default ComingSoon;
