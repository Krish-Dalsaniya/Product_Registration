import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Upload, Calendar, Star, ToggleRight } from 'lucide-react';

const DynamicFormRenderer = ({ schema, disabled = true, onSubmit, isPublic = false }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalize legacy vs new schema
  let sections = [];
  if (schema && schema.length > 0) {
    if (schema[0].questions) {
      sections = schema;
    } else {
      sections = [{ id: 'default', title: 'Assessment', questions: schema }];
    }
  }

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        This form has no questions.
      </div>
    );
  }

  const currentSection = sections[currentSectionIndex];

  const handleInputChange = (questionId, value, options = []) => {
    if (disabled) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: { text_value: value, options }
    }));
  };

  const handleOptionToggle = (questionId, optionId, type) => {
    if (disabled) return;
    setAnswers(prev => {
      const currentAns = prev[questionId] || { options: [] };
      let newOptions = [...currentAns.options];

      if (type === 'radio') {
        newOptions = [optionId];
      } else if (type === 'checkbox') {
        if (newOptions.includes(optionId)) {
          newOptions = newOptions.filter(id => id !== optionId);
        } else {
          newOptions.push(optionId);
        }
      }

      return {
        ...prev,
        [questionId]: { ...currentAns, options: newOptions }
      };
    });
  };

  const nextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const prevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled || !onSubmit) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentSectionIndex + 1) / sections.length) * 100;

  return (
    <div className={`max-w-4xl mx-auto p-6 md:p-8 ${isPublic ? 'bg-transparent' : 'bg-white dark:bg-[#1a232c]'} rounded-2xl`}>
      {/* Progress Bar */}
      {sections.length > 1 && (
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">{currentSection.title}</h2>
              {currentSection.description && <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{currentSection.description}</p>}
            </div>
            <span className="text-[10px] font-black tracking-widest text-[var(--accent)] uppercase">
              Step {currentSectionIndex + 1} of {sections.length}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {sections.length === 1 && (
        <div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{currentSection.title}</h2>
          {currentSection.description && <p className="text-sm text-[var(--text-muted)] font-medium mt-2">{currentSection.description}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8">
          {currentSection.questions.map((q) => {
            const isFullWidth = ['long_text', 'checkbox', 'file_upload'].includes(q.type);
            const ans = answers[q.id] || { text_value: '', options: [] };
            
            return (
              <div 
                key={q.id} 
                className={`flex flex-col ${isFullWidth ? 'w-full' : 'w-full'} gap-2 p-5 bg-[var(--bg-workspace)]/50 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors rounded-xl`}
              >
                <label className="flex items-start mb-2">
                  <div className="flex-1">
                    <span className="text-sm md:text-sm font-bold text-[var(--text-main)] leading-snug">
                      {q.label}
                    </span>
                    {q.required && <span className="text-red-500 ml-1 font-black" title="Required">*</span>}
                    {q.help_text && <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{q.help_text}</p>}
                  </div>
                </label>

                <div className="w-full">
                  {['short_text', 'email', 'phone', 'url'].includes(q.type) && (
                    <input 
                      type={q.type === 'short_text' ? 'text' : q.type}
                      disabled={disabled} 
                      placeholder={q.placeholder || "Enter answer..."}
                      value={ans.text_value || ''}
                      onChange={(e) => handleInputChange(q.id, e.target.value)}
                      required={q.required}
                      className="w-full md:w-2/3 px-4 py-2.5 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-80" 
                    />
                  )}

                  {q.type === 'long_text' && (
                    <textarea 
                      disabled={disabled} 
                      rows={4}
                      placeholder={q.placeholder || "Enter details..."}
                      value={ans.text_value || ''}
                      onChange={(e) => handleInputChange(q.id, e.target.value)}
                      required={q.required}
                      className="w-full px-4 py-3 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:border-[var(--accent)] transition-colors resize-y disabled:opacity-80" 
                    />
                  )}

                  {['number', 'currency', 'percentage'].includes(q.type) && (
                    <div className="relative md:w-1/2">
                      {q.type === 'currency' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>}
                      <input 
                        type="number" 
                        disabled={disabled} 
                        placeholder={q.placeholder || "0"}
                        value={ans.text_value || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        required={q.required}
                        className={`w-full ${q.type === 'currency' ? 'pl-8' : 'px-4'} py-2.5 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-80`} 
                      />
                      {q.type === 'percentage' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>}
                    </div>
                  )}

                  {['date', 'time', 'datetime'].includes(q.type) && (
                    <div className="relative md:w-1/2">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type={q.type === 'datetime' ? 'datetime-local' : q.type}
                        disabled={disabled}
                        value={ans.text_value || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        required={q.required}
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-80" 
                      />
                    </div>
                  )}

                  {q.type === 'dropdown' && (
                    <select 
                      disabled={disabled} 
                      value={ans.options[0] || ''}
                      onChange={(e) => handleOptionToggle(q.id, e.target.value, 'radio')}
                      required={q.required}
                      className="w-full md:w-2/3 px-4 py-2.5 bg-white dark:bg-[#252b36] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-80"
                    >
                      <option value="" disabled>Select option</option>
                      {(q.options || []).map((opt, i) => {
                        const optVal = typeof opt === 'string' ? opt : (opt.id || opt.value || opt.label);
                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                        return <option key={i} value={optVal}>{optLabel}</option>;
                      })}
                    </select>
                  )}

                  {q.type === 'radio' && (
                    <div className="flex flex-col gap-3 py-1">
                      {(q.options || []).map((opt, i) => {
                        const optVal = typeof opt === 'string' ? opt : (opt.id || opt.value || opt.label);
                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                        const isSelected = ans.options.includes(optVal);

                        return (
                          <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252b36]'} ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-[var(--accent)]/50'} transition-all w-full md:w-2/3`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[var(--accent)]' : 'border-gray-300 dark:border-gray-600'}`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{optLabel}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'checkbox' && (
                    <div className="flex flex-col gap-3 py-1">
                      {(q.options || []).map((opt, i) => {
                        const optVal = typeof opt === 'string' ? opt : (opt.id || opt.value || opt.label);
                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                        const isSelected = ans.options.includes(optVal);

                        return (
                          <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252b36]'} ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-[var(--accent)]/50'} transition-all w-full md:w-2/3`}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-gray-300 dark:border-gray-600'}`}>
                              {isSelected && <CheckCircle2 className="text-white w-3 h-3" strokeWidth={4} />}
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{optLabel}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'file_upload' && (
                    <div className="w-full md:w-2/3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center bg-white dark:bg-[#252b36]">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                      <input type="file" className="hidden" disabled={disabled} />
                    </div>
                  )}

                  {q.type === 'rating' && (
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(star => (
                        <Star 
                          key={star} 
                          className={`w-8 h-8 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${parseInt(ans.text_value) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                          onClick={() => !disabled && handleInputChange(q.id, star.toString())}
                        />
                      ))}
                    </div>
                  )}
                  
                  {q.type === 'toggle' && (
                    <div 
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${ans.text_value === 'true' ? 'bg-[var(--accent)]' : 'bg-gray-300 dark:bg-gray-600'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => !disabled && handleInputChange(q.id, ans.text_value === 'true' ? 'false' : 'true')}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${ans.text_value === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          {sections.length > 1 ? (
            <>
              <button 
                type="button" 
                onClick={prevSection}
                disabled={currentSectionIndex === 0}
                className={`px-5 py-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${currentSectionIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                <ChevronLeft size={14} /> Back
              </button>
              
              {currentSectionIndex < sections.length - 1 ? (
                <button 
                  type="button"
                  onClick={nextSection}
                  className="px-6 py-2.5 flex items-center gap-2 bg-[var(--text-main)] text-[var(--bg-card)] text-xs uppercase tracking-widest font-black rounded-lg shadow-md hover:scale-105 transition-transform"
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={disabled || isSubmitting} 
                  className="px-8 py-3 flex items-center gap-2 bg-[var(--accent)] text-white text-[12px] uppercase tracking-widest font-black rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 hover:bg-[var(--accent-hover)] transition-transform"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Form'}
                </button>
              )}
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <button 
                type="submit"
                disabled={disabled || isSubmitting} 
                className="px-8 py-3 bg-[var(--accent)] text-white text-[12px] uppercase tracking-widest font-black rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 hover:bg-[var(--accent-hover)] transition-transform"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Form'}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default DynamicFormRenderer;
