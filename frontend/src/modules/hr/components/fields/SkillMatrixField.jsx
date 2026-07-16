import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Fixed CEF Rating columns — NEVER editable by HR
export const CEF_RATING_COLS = [
  { id: 'nil',  label: 'Nil',  score: 0 },
  { id: 'noob', label: 'Noob', score: 1 },
  { id: 'mod',  label: 'Mod',  score: 2 },
  { id: 'adv',  label: 'Adv',  score: 3 },
  { id: 'ace',  label: 'Ace',  score: 4 },
];

/* ─── Builder Component ─────────────────────────────────────── */
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
    <div className="mt-4 space-y-4">
      {/* Column Preview — read-only */}
      <div className="flex items-center gap-2">
        <div className="w-1/3 text-xs font-bold text-gray-400 uppercase tracking-wider">Skill</div>
        <div className="flex-1 grid grid-cols-5 gap-2">
          {CEF_RATING_COLS.map(col => (
            <div
              key={col.id}
              className="text-center text-xs font-black uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 rounded-lg py-1.5 px-1"
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Skill Rows */}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2 group/row">
            {isActive && (
              <div className="text-gray-300 cursor-grab opacity-0 group-hover/row:opacity-100 transition-opacity">
                <GripVertical size={14} />
              </div>
            )}
            <div className="flex-none text-xs text-gray-400 font-medium w-4">{i + 1}.</div>
            <input
              type="text"
              value={row.label}
              onChange={e => updateRow(i, e.target.value)}
              placeholder={`e.g. Pointers, UART, Memory Management...`}
              className="w-1/3 text-sm bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 text-gray-700 dark:text-gray-300 placeholder-gray-300 transition-colors"
            />
            <div className="flex-1 grid grid-cols-5 gap-2">
              {CEF_RATING_COLS.map(col => (
                <div
                  key={col.id}
                  className="flex items-center justify-center"
                >
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-600" />
                </div>
              ))}
            </div>
            {isActive && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length <= 1}
                className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors opacity-0 group-hover/row:opacity-100"
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
          className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium mt-2 ml-10"
        >
          <Plus size={14} strokeWidth={2.5} /> Add skill
        </button>
      )}

      {!isActive && (
        <p className="text-xs text-gray-400 italic ml-10">
          Click to edit skill rows · Columns are always: Nil, Noob, Mod, Adv, Ace
        </p>
      )}
    </div>
  );
};

/* ─── Renderer Component ────────────────────────────────────── */
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
    return (
      <div className="text-sm text-gray-400 italic py-2">No skills defined yet.</div>
    );
  }

  return (
    <div className="w-full overflow-x-auto mt-2">
      <table className="w-full text-sm border-collapse min-w-[480px]">
        <thead>
          <tr>
            <th className="p-3 text-left w-2/5 text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
            {CEF_RATING_COLS.map(col => (
              <th key={col.id} className="p-3 text-center">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 rounded-lg">
                  {col.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => {
            const selectedColId = (gridAns[row.id] || [])[0] || null;
            return (
              <tr
                key={row.id}
                className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${
                  rIdx % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/20' : 'bg-white dark:bg-transparent'
                }`}
              >
                <td className="p-3 font-medium text-gray-800 dark:text-gray-200 text-sm">
                  {row.label || <span className="text-gray-300 italic">Unnamed skill</span>}
                </td>
                {CEF_RATING_COLS.map(col => {
                  const isSelected = selectedColId === col.id;
                  return (
                    <td key={col.id} className="p-3 text-center">
                      <label
                        className={`inline-flex items-center justify-center cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}
                        onClick={() => handleSelect(row.id, col.id)}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                              : 'border-gray-300 dark:border-gray-600 hover:border-[var(--accent)]'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                          )}
                        </div>
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
