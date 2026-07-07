import React from 'react';
import { PackageOpen } from 'lucide-react';

const EmptyState = ({ 
  icon: Icon = PackageOpen, 
  title = "No Data Found", 
  message = "There are no records to display in this view.",
  actionButton = null,
  className = ""
}) => {
  return (
    <div className={`p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center ${className}`}>
      <div className="relative mb-6 group">
        <div className="absolute inset-0 bg-[var(--accent)]/20 blur-2xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-[var(--bg-workspace)] border border-[var(--border-color)] shadow-inner relative z-10 transform group-hover:-translate-y-2 group-hover:rotate-6 transition-all duration-300">
          <Icon className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors duration-300" size={40} strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight mb-2">
        {title}
      </h3>
      
      <p className="text-[13px] font-medium text-[var(--text-muted)] max-w-sm mx-auto mb-8 leading-relaxed">
        {message}
      </p>

      {actionButton && (
        <div className="relative z-10">
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
