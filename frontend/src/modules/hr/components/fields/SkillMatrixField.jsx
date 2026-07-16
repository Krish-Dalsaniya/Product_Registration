import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Fixed CEF Rating columns — NEVER editable by HR
export const CEF_RATING_COLS = [
  { id: 'nil',  label: 'NILL', score: 0 },
  { id: 'noob', label: 'NOOB', score: 1 },
  { id: 'mod',  label: 'MOD',  score: 2 },
  { id: 'adv',  label: 'ADV',  score: 3 },
  { id: 'ace',  label: 'ACE',  score: 4 },
];

/* ─── Builder Component (unchanged) ─────────────────────────── */
export const SkillMatrixBuilder = ({ q, isActive, onUpdate }) => {
  const rows = q.rows || [{ id: uuidv4(), label: '', order_index: 0 }];

  const addRow = () => {
    onUpdate({ rows: [...rows, { id: uuidv4(), label: '', order_index: rows.length }] });
  };

  const updateRow = (index, val) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], label: val };
    onUpdate({ rows: newRows });
  };

  const removeRow = (index) => {
    if (rows.length <= 1) return;
    onUpdate({ rows: rows.filter((_, i) => i !== index) });
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Layout Config */}
      {isActive && (
        <div className="flex items-center gap-4 mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
          <label className="text-[11px] font-bold text-gray-500 uppercase">Layout:</label>
          <div className="flex bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
            <button
              onClick={() => onUpdate({ config: { ...q.config, columns: 1 } })}
              className={`px-3 py-1 text-xs font-bold transition-colors ${!q.config?.columns || q.config.columns === 1 ? 'bg-[#60839b] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              1 Column (Half Width)
            </button>
            <button
              onClick={() => onUpdate({ config: { ...q.config, columns: 2 } })}
              className={`px-3 py-1 text-xs font-bold transition-colors border-l border-gray-200 ${q.config?.columns === 2 ? 'bg-[#60839b] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              2 Columns (Full Width)
            </button>
          </div>
        </div>
      )}

      {/* Skill Rows */}
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2 group/row">
            {isActive && (
              <div className="text-gray-300 cursor-grab opacity-0 group-hover/row:opacity-100 transition-opacity flex-none">
                <GripVertical size={13} />
              </div>
            )}
            <div className="flex-none text-[10px] text-gray-400 font-medium w-3">{i + 1}.</div>
            <input
              type="text"
              value={row.label}
              onChange={e => updateRow(i, e.target.value)}
              placeholder="e.g. C-Programming"
              className="w-32 xl:w-40 flex-shrink-0 text-[12px] bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 focus:border-[#60839b] outline-none pb-0.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 transition-colors font-medium"
            />
            
            {/* Inline Radio buttons preview */}
            <div className="flex-1 flex flex-wrap items-center gap-x-2 xl:gap-x-3 gap-y-1 pointer-events-none opacity-60">
              {CEF_RATING_COLS.map(col => (
                <label key={col.id} className="flex items-center gap-0.5 xl:gap-1 select-none">
                  <div className="w-3 h-3 rounded-full border-2 border-gray-400" />
                  <span className="text-[10px] uppercase text-gray-600 tracking-wide font-semibold">{col.label === 'NILL' ? 'Nill' : col.label}</span>
                </label>
              ))}
            </div>

            {isActive && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length <= 1}
                className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors opacity-0 group-hover/row:opacity-100 ml-2 flex-none"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isActive && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 text-[11px] uppercase font-bold text-[#60839b] hover:text-[#4d6a7d] mt-2 ml-8 tracking-widest"
        >
          <Plus size={14} strokeWidth={3} /> Add skill
        </button>
      )}
    </div>
  );
};

/* ─── Renderer: Classic Interview Sheet Style ─────────────────
   Matches the user's screenshots: inline native-looking radios 
   with labels next to them. 
─────────────────────────────────────────────────────────────── */
export const SkillMatrixRenderer = ({ q, value = '{}', onChange, disabled }) => {
  let gridAns = {};
  try {
    gridAns = typeof value === 'string' && value ? JSON.parse(value) : (value || {});
  } catch (e) {
    gridAns = {};
  }

  const rows = q.rows || [];

  const handleSelect = (rowId, colId) => {
    if (disabled) return;
    const nextAns = { ...gridAns, [rowId]: [colId] };
    onChange(JSON.stringify(nextAns));
  };

  if (rows.length === 0) {
    return <div className="text-sm text-gray-400 italic py-1">No skills defined yet.</div>;
  }

  const columns = q.config?.columns === 2 ? 2 : 1;

  return (
    <div className="w-full">
      {/* Skill rows */}
      <div className={columns === 2 ? "grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1" : "flex flex-col gap-y-1"}>
        {rows.map((row) => {
          const selectedColId = (gridAns[row.id] || [])[0] || null;
          return (
            <div key={row.id} className="flex items-center py-0.5">
              {/* Skill name */}
              <div className="w-[140px] xl:w-[170px] flex-shrink-0 text-[12px] text-[#333333] font-bold truncate pr-2 leading-tight">
                {row.label || 'Unnamed skill'}
              </div>
              
              {/* Inline Radio buttons with labels */}
              <div className="flex-1 flex items-center gap-x-3">
                {CEF_RATING_COLS.map(col => {
                  const isSelected = selectedColId === col.id;
                  return (
                    <label
                      key={col.id}
                      className={`flex items-center gap-1.5 select-none ${
                        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer group'
                      }`}
                    >
                      <input 
                        type="radio"
                        checked={isSelected}
                        onChange={() => handleSelect(row.id, col.id)}
                        disabled={disabled}
                        className="w-3 h-3 text-[#60839b] border-gray-400 focus:ring-0 cursor-pointer accent-[#60839b] mt-0.5"
                      />
                      <span className={`text-[11px] font-bold tracking-wide transition-colors ${isSelected ? 'text-[#60839b]' : 'text-gray-400 group-hover:text-gray-500'}`}>
                        {col.label === 'NILL' ? 'Nill' : col.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
