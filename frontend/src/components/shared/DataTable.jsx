import React from 'react';
import { Eye, Trash2 } from 'lucide-react';

const DataTable = ({ columns, data, loading, totalCount, filteredCount, currentPage = 1, totalPages = 1, onView, onEdit, onDelete, rowKey = 'id' }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr style={{ background: 'var(--grad-header)' }}>
              {columns.map((col) => (
                <th key={col.key} className="px-3 md:px-4 py-2.5 text-[10px] md:text-[12px] font-bold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.07em] text-right" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row[rowKey] || index}
                className="transition-colors duration-200 group"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 md:px-4 py-2.5 text-[12px] md:text-[14px] font-medium" style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}

                <td className="px-3 md:px-4 py-2.5 text-right" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(row)}
                      className="p-2 rounded-xl transition-all duration-200"
                      style={{ color: 'var(--text-dim)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--nav-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = ''; }}
                      title="View Details"
                    >
                      <Eye size={18} strokeWidth={2} />
                    </button>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-200"
                        style={{ background: 'transparent', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        Update
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete && onDelete(row); }}
                      className="p-1.5 rounded-lg transition-all duration-200"
                      style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      title="Delete Record"
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="p-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'var(--nav-hover)' }}>
            <Trash2 style={{ color: 'var(--accent)', opacity: 0.3 }} size={32} />
          </div>
          <p className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>No records found in the current view.</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--nav-hover)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Total Records: {filteredCount ?? data.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>
            PAGE {currentPage} <span style={{ opacity: 0.3, margin: '0 4px' }}>/</span> {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DataTable);
