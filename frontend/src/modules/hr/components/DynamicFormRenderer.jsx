import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const DynamicFormRenderer = ({ schema }) => {
  if (!schema || schema.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        This form has no questions.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto p-3 md:p-4 bg-white dark:bg-[#1a232c] rounded-xl">
      {schema.map((q, index) => (
        <div key={q.id} className="p-3 bg-[var(--bg-workspace)]/30 border border-[var(--border-color)] border-l-[3px] hover:border-l-[var(--accent)] transition-all rounded-lg">
          <label className="flex items-start gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-black shrink-0 text-[var(--text-muted)] mt-0.5">
              {index + 1}
            </span>
            <div className="flex-1">
              <span className="text-[13px] font-bold text-[var(--text-main)]">
                {q.label}
              </span>
              {q.required && <span className="text-red-500 ml-1 font-black" title="Required">*</span>}
            </div>
          </label>

          {q.type === 'short_text' && (
            <input 
              type="text" 
              disabled 
              placeholder="Short text answer..." 
              className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-xs opacity-60 cursor-not-allowed ml-7" 
            />
          )}

          {q.type === 'long_text' && (
            <textarea 
              disabled 
              rows={2}
              placeholder="Long text answer..." 
              className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-xs opacity-60 cursor-not-allowed resize-none ml-7" 
            />
          )}

          {q.type === 'number' && (
            <input 
              type="number" 
              disabled 
              placeholder="Numeric answer..." 
              className="w-full max-w-[200px] px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-xs opacity-60 cursor-not-allowed ml-7" 
            />
          )}

          {q.type === 'dropdown' && (
            <select disabled className="w-full max-w-[200px] px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-xs opacity-60 cursor-not-allowed appearance-none ml-7">
              <option value="">Select an option...</option>
              {(q.options || []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {q.type === 'radio' && (
            <div className="space-y-1.5 ml-7">
              {(q.options || []).map((opt, i) => (
                <label key={i} className="flex items-center gap-2 opacity-70 cursor-not-allowed">
                  <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[var(--border-color)] flex items-center justify-center">
                  </div>
                  <span className="text-xs text-[var(--text-main)]">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'checkbox' && (
            <div className="space-y-1.5 ml-7">
              {(q.options || []).map((opt, i) => (
                <label key={i} className="flex items-center gap-2 opacity-70 cursor-not-allowed">
                  <div className="w-3.5 h-3.5 rounded-sm border-[1.5px] border-[var(--border-color)] flex items-center justify-center">
                  </div>
                  <span className="text-xs text-[var(--text-main)]">{opt}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
        <button disabled className="px-5 py-2 bg-[var(--accent)] text-white text-[11px] uppercase tracking-wider font-bold rounded-lg opacity-50 cursor-not-allowed">
          Submit Assessment
        </button>
      </div>
    </div>
  );
};

export default DynamicFormRenderer;
