import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Settings2, CheckCircle2, ChevronDown } from 'lucide-react';

const questionTypes = [
  { id: 'short_text', label: 'Short Text', icon: 'T' },
  { id: 'long_text', label: 'Long Text', icon: '¶' },
  { id: 'number', label: 'Number', icon: '123' },
  { id: 'dropdown', label: 'Dropdown', icon: '▼' },
  { id: 'radio', label: 'Single Choice', icon: '◉' },
  { id: 'checkbox', label: 'Multiple Choice', icon: '☑' },
];

const FormBuilder = ({ schema, onChange }) => {
  const addQuestion = (type) => {
    const newQuestion = {
      id: Date.now().toString(),
      type,
      label: '',
      required: false,
      options: ['dropdown', 'radio', 'checkbox'].includes(type) ? ['Option 1'] : []
    };
    onChange([...(schema || []), newQuestion]);
  };

  const updateQuestion = (id, updates) => {
    onChange(schema.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id) => {
    onChange(schema.filter(q => q.id !== id));
  };

  const addOption = (questionId) => {
    onChange(schema.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] };
      }
      return q;
    }));
  };

  const updateOption = (questionId, index, value) => {
    onChange(schema.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[index] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeOption = (questionId, index) => {
    onChange(schema.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions.splice(index, 1);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const questions = schema || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] rounded-lg">
        <span className="w-full text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] mb-2">Add Field</span>
        {questionTypes.map(type => (
          <button
            key={type.id}
            type="button"
            onClick={() => addQuestion(type.id)}
            className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[11px] font-semibold text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shadow-sm"
          >
            <span className="text-[10px] opacity-70 font-mono">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {questions.length === 0 ? (
          <div className="text-center py-6 px-4 border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)]/30">
            <Settings2 size={24} className="mx-auto mb-2 text-[var(--text-dim)]" />
            <p className="text-xs font-semibold text-[var(--text-main)]">No fields added yet</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Select a field type above to start building your form.</p>
          </div>
        ) : (
          questions.map((q, index) => (
            <div key={q.id} className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-sm relative group">
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="p-1.5 text-[var(--text-dim)] hover:text-red-500 bg-[var(--bg-workspace)] rounded-md border border-[var(--border-color)] hover:border-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex gap-2 pr-32">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)]">
                    Field Label <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={q.label}
                    onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                    placeholder="Enter question or field name..."
                    className="w-full px-2 py-1.5 text-xs bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded text-[var(--text-main)] focus:border-[var(--accent)] outline-none"
                    required
                  />
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)]">Type</label>
                  <div className="px-2 py-1.5 text-xs bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] rounded text-[var(--text-muted)] cursor-not-allowed">
                    {questionTypes.find(t => t.id === q.type)?.label}
                  </div>
                </div>
              </div>

              {['dropdown', 'radio', 'checkbox'].includes(q.type) && (
                <div className="space-y-1.5 mt-3 pt-3 border-t border-[var(--border-color)]">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-dim)]">Options</label>
                  {(q.options || []).map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <div className="w-5 flex justify-center text-[var(--text-dim)]">
                        {q.type === 'radio' && <div className="w-3 h-3 rounded-full border border-current" />}
                        {q.type === 'checkbox' && <div className="w-3 h-3 rounded-sm border border-current" />}
                        {q.type === 'dropdown' && <span className="text-xs">○</span>}
                      </div>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="flex-1 px-2 py-1 text-xs bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded text-[var(--text-main)] focus:border-[var(--accent)] outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(q.id, optIndex)}
                        disabled={q.options.length <= 1}
                        className="p-1.5 text-[var(--text-dim)] hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(q.id)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] mt-2 ml-7"
                  >
                    <Plus size={12} /> Add Option
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FormBuilder;
