import React from 'react';
import { Eye, Trash2 } from 'lucide-react';

const DataTable = ({ columns, data, loading, totalCount, filteredCount, currentPage = 1, totalPages = 1, onView, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a7a48]"></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-[var(--bg-card)] border-[0.5px] border-[var(--border-color)] rounded-lg">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-[var(--border-color)] bg-[var(--bg-workspace)]/30">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[var(--border-color)]">
            {data.map((row, index) => (
              <tr 
                key={index} 
                className="group hover:bg-[var(--bg-workspace)]/50 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 text-[13px] text-[var(--text-main)] font-medium">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onView && onView(row); }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit && onEdit(row); }}
                      className="border-[0.5px] border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[6px] text-[var(--text-muted)] hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete && onDelete(row); }}
                      className="p-1.5 text-[var(--text-muted)]/50 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete Record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {data.length === 0 && (
        <div className="p-12 text-center text-[var(--text-muted)] italic text-[12px] tracking-wide">
          No records found in the current view.
        </div>
      )}

      {/* User Count Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t-[0.5px] border-[var(--border-color)] bg-[var(--bg-workspace)]/30">
        <span className="text-[12px] text-[var(--text-muted)] font-medium">
          Showing {filteredCount ?? data.length} of {totalCount ?? data.length} users
        </span>
        <span className="text-[12px] text-[var(--text-muted)] font-medium">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
};

export default DataTable;
