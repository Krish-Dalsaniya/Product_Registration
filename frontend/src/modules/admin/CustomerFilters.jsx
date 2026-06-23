import React from 'react';
import { Search } from 'lucide-react';

const CustomerFilters = ({ 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter, 
  companyTypeFilter, 
  setCompanyTypeFilter, 
  totalCount 
}) => {
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

      <div className="flex gap-4 w-full md:w-auto">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[12px] font-bold text-[var(--text-main)] appearance-none cursor-pointer hover:border-[var(--accent)] w-full md:w-auto"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundSize: '1.2em',
            backgroundPosition: 'right 0.6rem center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          value={companyTypeFilter}
          onChange={(e) => setCompanyTypeFilter(e.target.value)}
          className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[12px] font-bold text-[var(--text-main)] appearance-none cursor-pointer hover:border-[var(--accent)] w-full md:w-auto"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundSize: '1.2em',
            backgroundPosition: 'right 0.6rem center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <option value="">All Company Types</option>
          <option value="Private Limited Company(Pvt Ltd)">Pvt Ltd</option>
          <option value="Public Limited Company(Ltd)">Ltd</option>
          <option value="Partnership Firm">Partnership</option>
          <option value="One Person Company(OPC)">OPC</option>
          <option value="Sole Proprietorship">Proprietorship</option>
          <option value="Limited Liability Partnership(LLP)">LLP</option>
        </select>
      </div>
    </div>
  );
};

export default CustomerFilters;
