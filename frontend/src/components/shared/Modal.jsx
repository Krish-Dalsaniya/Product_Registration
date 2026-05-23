import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import Draggable from 'react-draggable';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', headerActions }) => {
  const nodeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-in fade-in duration-300"
        style={{ background: 'var(--border-glow, rgba(5, 15, 25, 0.8))' }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <Draggable nodeRef={nodeRef} handle=".modal-header" bounds="parent">
        <div ref={nodeRef} className="w-full" style={{ maxWidth: maxWidth === 'max-w-sm' ? '24rem' : maxWidth === 'max-w-md' ? '28rem' : maxWidth === 'max-w-lg' ? '32rem' : maxWidth === 'max-w-xl' ? '36rem' : maxWidth === 'max-w-2xl' ? '42rem' : maxWidth === 'max-w-4xl' ? '56rem' : maxWidth === 'max-w-6xl' ? '72rem' : '100%' }}>
          <div
            className={`relative w-full rounded-2xl shadow-2xl p-0 overflow-hidden animate-scale-in flex flex-col max-h-[90vh] bg-[var(--bg-card)]`}
            style={{
              border: '1px solid var(--border-color)',
            }}
          >
          {/* Header */}
          <div
            className="modal-header px-6 py-4 flex items-center justify-between flex-shrink-0 cursor-move"
          style={{
            background: 'var(--grad-header)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h3
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: 'var(--text-main)' }}
          >
            {title}
          </h3>
          <div className="flex items-center gap-3">
            {headerActions}
            <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--nav-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = ''; }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="p-4 md:p-8 overflow-y-auto custom-scrollbar"
          style={{ color: 'var(--text-main)', background: 'transparent' }}
        >
          {children}
        </div>
        </div>
        </div>
      </Draggable>
    </div>
  );
};

export default Modal;
