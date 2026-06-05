import React, { useState, useEffect } from 'react';
import { Eye, Trash2, Maximize2, Minimize2, CheckSquare } from 'lucide-react';

const DataTable = ({ 
  columns, data, loading, totalCount, filteredCount, currentPage = 1, totalPages = 1, 
  onView, onEdit, onDelete, rowKey = 'id', 
  enableBulkSelection = false, onBulkDelete 
}) => {
  const [density, setDensity] = useState(() => {
    return localStorage.getItem('datatable_density') || 'compact';
  });
  
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    localStorage.setItem('datatable_density', density);
  }, [density]);

  // Reset selection when data changes
  useEffect(() => {
    setSelectedRows([]);
  }, [data]);

  const toggleDensity = () => {
    setDensity(prev => prev === 'compact' ? 'comfortable' : 'compact');
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(data.map(row => row[rowKey] || row.id || Math.random()));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (rowId) => {
    setSelectedRows(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId) 
        : [...prev, rowId]
    );
  };

  const isComfortable = density === 'comfortable';
  const pyClass = isComfortable ? 'py-4' : 'py-2';
  const textClass = isComfortable ? 'text-[14px] md:text-[15px]' : 'text-[12px] md:text-[14px]';
  const headerTextClass = isComfortable ? 'text-[11px] md:text-[13px]' : 'text-[10px] md:text-[12px]';
  const btnPad = isComfortable ? 'p-3' : 'p-2';
  const iconSize = isComfortable ? 20 : 18;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
      {enableBulkSelection && selectedRows.length > 0 && (
        <div className="p-3 md:p-4 bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckSquare className="text-[var(--accent)]" size={20} />
            <span className="text-[13px] font-bold text-[var(--accent)]">{selectedRows.length} item(s) selected</span>
          </div>
          {onBulkDelete && (
            <button 
              onClick={() => onBulkDelete(selectedRows)}
              className="px-4 py-2 bg-rose-500 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} /> Delete Selected
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr style={{ background: 'var(--grad-header)' }}>
              {enableBulkSelection && (
                <th className={`px-4 ${pyClass} w-[40px]`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                    checked={data.length > 0 && selectedRows.length === data.length}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={`px-3 md:px-4 ${pyClass} ${headerTextClass} font-bold uppercase tracking-[0.07em]`} style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  {col.label}
                </th>
              ))}
              <th className={`px-4 ${pyClass} ${headerTextClass} font-bold uppercase tracking-[0.07em] text-right`} style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const rId = row[rowKey] || row.id || index;
              const isSelected = selectedRows.includes(rId);
              return (
                <tr
                  key={rId}
                  className={`transition-colors duration-200 group ${isSelected ? 'bg-[var(--accent)]/5' : ''}`}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'var(--nav-hover)'; }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = ''; }}
                >
                  {enableBulkSelection && (
                    <td className={`px-4 ${pyClass}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                        checked={isSelected}
                        onChange={() => handleSelectRow(rId)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 md:px-4 ${pyClass} ${textClass} font-medium`} style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}

                  <td className={`px-3 md:px-4 ${pyClass} text-right`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onView(row)}
                        className={`${btnPad} rounded-lg transition-all duration-200`}
                        style={{ color: 'var(--text-dim)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--nav-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = ''; }}
                        title="View Details"
                      >
                        <Eye size={iconSize} strokeWidth={2} />
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className={`text-[11px] font-bold uppercase tracking-wider px-4 ${pyClass} rounded-md transition-all duration-200`}
                          style={{ background: 'transparent', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          Update
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete && onDelete(row); }}
                        className={`${btnPad} rounded-lg transition-all duration-200`}
                        style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                        title="Delete Record"
                      >
                        <Trash2 size={iconSize-4} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--nav-hover)' }}>
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Total Records: {filteredCount ?? data.length}
          </span>
          <button 
            onClick={toggleDensity}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--accent)] hover:underline ml-2"
          >
            {isComfortable ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
            {isComfortable ? 'Compact View' : 'Comfortable View'}
          </button>
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
