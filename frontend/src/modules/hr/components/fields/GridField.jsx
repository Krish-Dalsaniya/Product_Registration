import React from 'react';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const GridBuilder = ({ q, isActive, onUpdate, onUpdateOption, onRemoveOption, onAddOption }) => {
  const rows = q.rows || [{ id: uuidv4(), label: 'Row 1', order_index: 0 }];
  const cols = q.options || [{ id: uuidv4(), label: 'Column 1', order_index: 0 }];

  const addRow = () => {
    onUpdate({ rows: [...rows, { id: uuidv4(), label: `Row ${rows.length + 1}`, order_index: rows.length }] });
  };

  const updateRow = (index, val) => {
    const newRows = [...rows];
    newRows[index].label = val;
    onUpdate({ rows: newRows });
  };

  const removeRow = (index) => {
    if (rows.length <= 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    onUpdate({ rows: newRows });
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 mt-4">
      {/* Rows */}
      <div className="flex-1 space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rows</h4>
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2 group/row">
            <div className="text-gray-400 font-medium text-sm w-4">{i + 1}.</div>
            <input
              type="text"
              value={row.label}
              onChange={e => updateRow(i, e.target.value)}
              placeholder={`Row ${i + 1}`}
              className="flex-1 text-sm bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 text-gray-700 dark:text-gray-300 placeholder-gray-300"
            />
            {isActive && (
              <button type="button" onClick={() => removeRow(i)} disabled={rows.length <= 1} className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors opacity-0 group-hover/row:opacity-100 focus-within:opacity-100">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
        {isActive && (
          <button type="button" onClick={addRow} className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium mt-2">
            <Plus size={14} strokeWidth={2.5} /> Add row
          </button>
        )}
      </div>

      {/* Columns */}
      <div className="flex-1 space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Columns</h4>
        {cols.map((col, i) => (
          <div key={i} className="flex items-center gap-2 group/col">
            <div className="text-gray-400">
              {q.type === 'grid_radio' ? <Circle size={14} /> : <CheckSquareIcon size={14} />}
            </div>
            <input
              type="text"
              value={col.label}
              onChange={e => onUpdateOption(i, { label: e.target.value, value: e.target.value })}
              placeholder={`Column ${i + 1}`}
              className="flex-1 text-sm bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 text-gray-700 dark:text-gray-300 placeholder-gray-300"
            />
            {isActive && (
              <button type="button" onClick={() => onRemoveOption(i)} disabled={cols.length <= 1} className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors opacity-0 group-hover/col:opacity-100 focus-within:opacity-100">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
        {isActive && (
          <button type="button" onClick={onAddOption} className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium mt-2">
            <Plus size={14} strokeWidth={2.5} /> Add column
          </button>
        )}
      </div>
    </div>
  );
};

const CheckSquareIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
);

export const GridRenderer = ({ q, value = '{}', onChange, disabled }) => {
  // Grid answers are stored as a JSON string mapping rowId -> array of optionIds
  let gridAns = {};
  try {
    gridAns = typeof value === 'string' && value ? JSON.parse(value) : (value || {});
  } catch (e) {
    gridAns = {};
  }

  const rows = q.rows || [];
  const cols = q.options || [];

  const handleCellClick = (rowId, colId) => {
    if (disabled) return;
    
    const currentRowAns = gridAns[rowId] || [];
    let nextRowAns;

    if (q.type === 'grid_radio') {
      nextRowAns = [colId];
    } else {
      if (currentRowAns.includes(colId)) {
        nextRowAns = currentRowAns.filter(id => id !== colId);
      } else {
        nextRowAns = [...currentRowAns, colId];
      }
    }

    const nextGridAns = { ...gridAns, [rowId]: nextRowAns };
    onChange(JSON.stringify(nextGridAns));
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="p-4 w-1/3"></th>
            {cols.map((col, i) => (
              <th key={col.id || i} className="p-4 font-semibold text-center text-gray-700 dark:text-gray-300">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => {
            const isEven = rIdx % 2 === 0;
            return (
              <tr key={row.id || rIdx} className={isEven ? 'bg-gray-50 dark:bg-gray-800/30' : 'bg-white dark:bg-transparent'}>
                <td className="p-4 font-medium text-gray-800 dark:text-gray-200">
                  {row.label}
                </td>
                {cols.map((col, cIdx) => {
                  const colId = col.id;
                  const isSelected = (gridAns[row.id] || []).includes(colId);

                  return (
                    <td key={colId || cIdx} className="p-4 text-center">
                      <label className={`inline-flex items-center justify-center cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {q.type === 'grid_radio' ? (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[var(--accent)]' : 'border-gray-300 dark:border-gray-600'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
                          </div>
                        ) : (
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-gray-300 dark:border-gray-600'}`}>
                            {isSelected && <CheckCircle2 className="text-white w-3.5 h-3.5" strokeWidth={3} />}
                          </div>
                        )}
                        <input
                          type={q.type === 'grid_radio' ? 'radio' : 'checkbox'}
                          className="hidden"
                          checked={isSelected}
                          onChange={() => handleCellClick(row.id, colId)}
                          disabled={disabled}
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
