import React from 'react';

const DataTable = ({ columns, data, loading, totalCount, filteredCount, currentPage = 1, totalPages = 1, onView, onEdit }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a7a48]"></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-white border-[0.5px] border-gray-200 rounded-lg">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-gray-100 bg-gray-50/50">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-gray-100">
            {data.map((row, index) => (
              <tr 
                key={index} 
                className="group hover:bg-gray-50/80 transition-colors cursor-pointer"
                onClick={() => onView && onView(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 text-[13px] text-gray-700 font-medium">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                
                {/* Row Hover Actions */}
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onView && onView(row); }}
                      className="border-[0.5px] border-gray-300 bg-transparent text-[11px] px-2 py-1 rounded-[5px] hover:bg-white hover:border-emerald-500 transition-all"
                    >
                      View
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit && onEdit(row); }}
                      className="border-[0.5px] border-gray-300 bg-transparent text-[11px] px-2 py-1 rounded-[5px] hover:bg-white hover:border-emerald-500 transition-all"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {data.length === 0 && (
        <div className="p-12 text-center text-gray-400 italic text-[12px] tracking-wide">
          No records found in the current view.
        </div>
      )}

      {/* User Count Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t-[0.5px] border-gray-100 bg-gray-50/30">
        <span className="text-[12px] text-gray-500 font-medium">
          Showing {filteredCount ?? data.length} of {totalCount ?? data.length} users
        </span>
        <span className="text-[12px] text-gray-500 font-medium">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
};

export default DataTable;
