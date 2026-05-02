import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className={`relative w-full ${maxWidth} bg-[var(--bg-card)] rounded-2xl shadow-2xl p-0 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-[var(--border-color)]`}>
        <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-workspace)]/50 flex-shrink-0">
          <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-workspace)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-card)] text-[var(--text-main)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
