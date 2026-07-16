import React, { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { getFieldConfig } from './fields/FieldRegistry';

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

  const handleAnswerUpdate = (questionId, value, isOptionsType) => {
    if (disabled) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: isOptionsType 
        ? { ...prev[questionId], options: value, text_value: prev[questionId]?.text_value || '' } 
        : { ...prev[questionId], text_value: value, options: prev[questionId]?.options || [] }
    }));
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
            const isOptionsType = ['radio', 'checkbox', 'dropdown'].includes(q.type);
            const ans = answers[q.id] || { text_value: '', options: [] };
            const value = isOptionsType ? (ans.options || []) : (ans.text_value || '');
            const Renderer = getFieldConfig(q.type).renderer;
            
            return (
              <div 
                key={q.id} 
                className="w-full gap-2 p-5 bg-[var(--bg-workspace)]/50 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors rounded-xl relative"
              >
                {(() => {
                  let totalPoints = q.points || 0;
                  if (!totalPoints && q.options && Array.isArray(q.options)) {
                    totalPoints = q.options.filter(o => o.is_correct).reduce((sum, opt) => sum + (parseFloat(opt.score) || 0), 0);
                  }
                  if (totalPoints > 0) {
                    return (
                      <div className="absolute top-4 right-5 text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                        {totalPoints} {totalPoints === 1 ? 'point' : 'points'}
                      </div>
                    );
                  }
                  return null;
                })()}

                <label className="flex items-start mb-2 pr-20">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{q.label}</span>
                    {q.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                    {q.help_text && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{q.help_text}</p>}
                  </div>
                </label>

                <div className="w-full">
                  {/* Dynamic Renderer */}
                  {(() => {
                    const fieldConfig = getFieldConfig(q.type);
                    if (!fieldConfig || !fieldConfig.RendererComponent) return <div className="text-red-500 text-sm">Unsupported field type: {q.type}</div>;
                    const Renderer = fieldConfig.RendererComponent;
                    
                    return <Renderer q={q} value={value} onChange={val => handleAnswerUpdate(q.id, val, isOptionsType)} disabled={disabled} />;
                  })()}
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
