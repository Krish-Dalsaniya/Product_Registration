import React from 'react';
import { Search } from 'lucide-react';

const CustomerFilters = ({ searchTerm, setSearchTerm, totalCount }) => {
  return (
    <div className="workspace-card p-3 flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1 group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
        <input
          type="text"
          placeholder="Search by name, code or company details..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
          {totalCount} Records Listed
        </div>
      </div>
    </div>
  );
};

export default CustomerFilters;
