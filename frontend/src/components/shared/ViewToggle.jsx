import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

const ViewToggle = ({ viewMode, setViewMode, listMode = 'table' }) => {
  const isGrid = viewMode === 'grid';
  // We handle both 'list' and 'table' as the list view
  const isList = viewMode === 'list' || viewMode === 'table';

  const handleListClick = () => {
    // Determine the string to use for list view, allowing parent override or sticking to its current mode
    if (viewMode === 'list' || listMode === 'list') {
      setViewMode('list');
    } else {
      setViewMode('table');
    }
  };

  return (
    <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-1 rounded-[10px] shadow-sm">
      <button 
        onClick={handleListClick}
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all duration-300 ${isList ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--accent)]'}`}
      >
        <List size={15} />
        <span>LIST</span>
      </button>
      <button 
        onClick={() => setViewMode('grid')} 
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all duration-300 ${isGrid ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--accent)]'}`}
      >
        <LayoutGrid size={15} />
        <span>GRID</span>
      </button>
    </div>
  );
};

export default ViewToggle;
