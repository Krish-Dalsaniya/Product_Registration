import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const DynamicFormRenderer = ({ schema, disabled = true }) => {
  if (!schema || schema.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        This form has no questions.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 bg-white dark:bg-[#1a232c] rounded-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
        {schema.map((q, index) => {
          const isFullWidth = q.type === 'long_text' || q.type === 'checkbox';
          
          return (
            <div 
              key={q.id} 
              className={`flex flex-col ${isFullWidth ? 'lg:col-span-2 mt-4' : 'xl:flex-row xl:items-center justify-between'} gap-3`}
            >
              <label className={`flex items-start ${isFullWidth ? '' : 'xl:w-[45%] shrink-0'}`}>
                <div className="flex-1">
                  <span className="text-[10px] md:text-[11px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-wider leading-snug">
                    {q.label}
                  </span>
                  {q.required && <span className="text-red-500 ml-1 font-black" title="Required">*</span>}
                </div>
              </label>

              <div className={`${isFullWidth ? 'w-full' : 'w-full xl:w-[55%]'}`}>
                {q.type === 'short_text' && (
                  <input 
                    type="text" 
                    disabled={disabled} 
                    placeholder="Enter text..." 
                    className="w-full px-5 py-2.5 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:border-gray-400 transition-colors disabled:opacity-80" 
                  />
                )}

                {q.type === 'long_text' && (
                  <textarea 
                    disabled={disabled} 
                    rows={3}
                    placeholder="Enter details..." 
                    className="w-full px-5 py-3 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:border-gray-400 transition-colors resize-none disabled:opacity-80" 
                  />
                )}

                {q.type === 'number' && (
                  <input 
                    type="number" 
                    disabled={disabled} 
                    placeholder="0" 
                    className="w-full px-5 py-2.5 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:border-gray-400 transition-colors disabled:opacity-80" 
                  />
                )}

                {q.type === 'dropdown' && (
                  <select disabled={disabled} className="w-full px-5 py-2.5 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:border-gray-400 transition-colors appearance-none disabled:opacity-80">
                    <option value="" disabled selected>Select option</option>
                    {(q.options || []).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {q.type === 'radio' && (
                  <div className="flex flex-wrap items-center gap-6 py-1">
                    {(q.options || []).map((opt, i) => (
                      <label key={i} className={`flex items-center gap-2.5 ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'checkbox' && (
                  <div className="flex flex-wrap items-center gap-6 py-1">
                    {(q.options || []).map((opt, i) => (
                      <label key={i} className={`flex items-center gap-2.5 ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                        <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
        <button disabled={disabled} className="px-8 py-3 bg-[var(--text-main)] text-[var(--bg-card)] text-[12px] uppercase tracking-widest font-black rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform">
          Submit Assessment
        </button>
      </div>
    </div>
  );
};

export default DynamicFormRenderer;
