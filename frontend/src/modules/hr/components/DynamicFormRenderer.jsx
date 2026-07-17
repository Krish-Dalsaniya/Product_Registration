import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getFieldConfig, getCEFFieldConfig } from './fields/FieldRegistry';
import { SkillMatrixRenderer } from './fields/SkillMatrixField';
import 'react-quill-new/dist/quill.snow.css';

/* ─────────────────────────────────────────────────────────────────
   CEF Public Form Renderer
   
   For candidate_evaluation forms renders in compact document style
   matching real interview evaluation sheets:
   - Rating sections: two per row side-by-side, compact inline radio
   - Knowledge/Checkbox: dense multi-column grid
   - Number: compact inline boxes  
   - RTF: full Quill editor
   - Code: Monaco editor
   - Standard forms: existing card-based layout
───────────────────────────────────────────────────────────────── */

/* ─── Lazy Monaco ─────────────────────────────────────────────── */
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

/* ─── CEF Rating Section Block (compact interview sheet style) ── */
const CEFRatingBlock = ({ question, value, onChange, disabled }) => {
  return (
    <div className="w-full h-full min-w-0">
      {/* Section title */}
      <div className="text-base font-bold text-[#60839b] mb-2 leading-tight">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <SkillMatrixRenderer
        q={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};

/* ─── CEF Checkbox/Knowledge Block (multi-column grid) ─────────── */
const CEFCheckboxBlock = ({ question, value = [], onChange, disabled }) => {
  const options = question.options || [];

  const toggle = (optId) => {
    if (disabled) return;
    const cur = Array.isArray(value) ? value : [];
    const next = cur.includes(optId) ? cur.filter(v => v !== optId) : [...cur, optId];
    onChange(next);
  };

  return (
    <div className="w-full">
      <div className="text-base font-bold text-[#60839b] mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </div>
      {question.help_text && (
        <p className="text-xs text-gray-500 mb-2">{question.help_text}</p>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map(opt => {
          const isChecked = Array.isArray(value) ? value.includes(opt.id) : false;
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-2 text-[14px] text-gray-700 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:text-black'
                }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(opt.id)}
                disabled={disabled}
                className="w-4 h-4 flex-shrink-0 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

/* ─── CEF Radio/MCQ Block ─────────────────────────────────────── */
const CEFRadioBlock = ({ question, value = [], onChange, disabled }) => {
  const options = question.options || [];

  const select = (optId) => {
    if (disabled) return;
    onChange([optId]);
  };

  return (
    <div className="w-full">
      <div className="text-base font-bold text-[#60839b] mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {options.map(opt => {
          const isSelected = Array.isArray(value) ? value.includes(opt.id) : false;
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-2 text-[14px] text-gray-700 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:text-black'
                }`}
            >
              <input
                type="radio"
                checked={isSelected}
                onChange={() => select(opt.id)}
                disabled={disabled}
                className="w-4 h-4 flex-shrink-0 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

/* ─── CEF Text Block ──────────────────────────────────────────── */
const CEFTextBlock = ({ question, value, onChange, disabled }) => {
  if (question.type === 'long_text') {
    return (
      <div className="w-full">
        <div className="text-base font-bold text-[#60839b] mb-2">
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>
        <textarea
          value={value || ''}
          onChange={e => !disabled && onChange(e.target.value)}
          disabled={disabled}
          rows={3}
          placeholder={question.placeholder || ''}
          className="w-full text-[13px] border border-gray-300 bg-white rounded-none px-2 py-1.5 outline-none focus:border-[#60839b] resize-none text-gray-700 disabled:opacity-70 disabled:cursor-not-allowed"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="w-[180px] flex-shrink-0 text-[14px] font-bold text-gray-700 pr-2 leading-tight">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={e => !disabled && onChange(e.target.value)}
        disabled={disabled}
        placeholder={question.placeholder || ''}
        className="w-64 flex-shrink-0 text-[13px] border border-[#a1b9ca] bg-[#e6edf2] px-2 py-1 outline-none focus:border-[#60839b] text-gray-800 disabled:opacity-70 disabled:cursor-not-allowed"
      />
    </div>
  );
};

/* ─── CEF Number Block ────────────────────────────────────────── */
const CEFNumberBlock = ({ question, value, onChange, disabled }) => (
  <div className="flex flex-col mb-2">
    <div className="text-[14px] font-bold text-gray-700 mb-2">
      {question.label}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </div>
    <input
      type="number"
      value={value || ''}
      onChange={e => !disabled && onChange(e.target.value)}
      disabled={disabled}
      placeholder="0"
      className="w-full max-w-[120px] text-[13px] text-center font-bold border border-[#a1b9ca] bg-[#e6edf2] px-2 py-1 outline-none focus:border-[#60839b] text-gray-800 disabled:opacity-70 disabled:cursor-not-allowed"
    />
  </div>
);

/* ─── CEF Rich Text Block ─────────────────────────────────────── */
const ReactQuill = React.lazy(() => import('react-quill-new'));

const CEFRTFBlock = ({ question, value, onChange, disabled }) => {
  if (disabled && value) {
    return (
      <div className="w-full">
        <div className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>
        <div
          className="prose prose-sm dark:prose-invert max-w-none p-3 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <Suspense fallback={<div className="h-32 border border-gray-300 rounded bg-gray-50 dark:bg-gray-800" />}>
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={val => !disabled && onChange(val)}
          readOnly={!!disabled}
          placeholder={question.placeholder || 'Write your answer here...'}
        />
      </Suspense>
    </div>
  );
};

/* ─── CEF Code Block ──────────────────────────────────────────── */
const CEFCodeBlock = ({ question, value, onChange, disabled }) => {
  const language = question.config?.language || 'c';
  const starter = question.starter_code || '';
  return (
    <div className="w-full">
      <div className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <div className="rounded border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          <span className="text-[10px] text-gray-600 dark:text-gray-400 font-mono ml-2">{language}</span>
        </div>
        <Suspense fallback={<div className="h-40 bg-gray-50 flex items-center justify-center text-gray-500 text-xs">Loading editor...</div>}>
          <MonacoEditor
            height="240px"
            language={language}
            theme="light"
            value={value || starter}
            onChange={val => !disabled && onChange(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              readOnly: !!disabled,
              padding: { top: 8, bottom: 8 },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
};

/* ─── CEF Section Renderer (full section) ─────────────────────── */
const CEFSectionRenderer = ({ section, answers, onAnswerUpdate, disabled }) => {
  const questions = section.questions || [];
  const sectionType = section.section_type || 'mixed';

  // For rating sections: render all cef_rating questions in two-column layout
  if (sectionType === 'rating') {


    return (
      <div className="mb-4">
        {section.title && (
          <div className="text-[22px] font-bold text-[#60839b] mb-3 border-b-2 border-gray-100 pb-1">
            {section.title}
          </div>
        )}
        {section.description && (
          <p className="text-xs text-gray-500 mb-3">{section.description}</p>
        )}
        <div
          className="grid gap-x-8 gap-y-5 mt-2"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
        >
          {questions.map(q => {
            const ans = answers[q.id] || { text_value: '{}', options: [] };
            const val = ans.text_value || '{}';
            return (
              <div key={q.id} className="min-w-0">
                <CEFRatingBlock question={q} value={val} onChange={v => onAnswerUpdate(q.id, v, false)} disabled={disabled} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }



  // Programming, RTF, and Mixed — full-width each
  return (
    <div className="mb-4">
      {section.title && (
        <div className="text-[22px] font-bold text-[#60839b] mb-3 border-b-2 border-gray-100 pb-1">
          {section.title}
        </div>
      )}
      {section.description && (
        <p className="text-[13px] text-gray-500 mb-3">{section.description}</p>
      )}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        {questions.map(q => {
          const isOptionsType = ['radio', 'checkbox', 'dropdown'].includes(q.type);
          const isGridOrMatrix = ['grid_radio', 'grid_checkbox', 'cef_rating'].includes(q.type);
          const ans = answers[q.id] || { text_value: '', options: [] };
          const rawValue = isOptionsType ? (ans.options || []) : (ans.text_value || '');
          const fieldValue = isGridOrMatrix ? (ans.text_value || '{}') : rawValue;

          const handleChange = (val) => {
            if (isGridOrMatrix) {
              onAnswerUpdate(q.id, val, false);
            } else {
              onAnswerUpdate(q.id, val, isOptionsType);
            }
          };

          let BlockContent = null;
          if (q.type === 'short_text' || q.type === 'long_text') BlockContent = <CEFTextBlock key={q.id} question={q} value={rawValue} onChange={handleChange} disabled={disabled} />;
          else if (q.type === 'number') BlockContent = <CEFNumberBlock key={q.id} question={q} value={rawValue} onChange={handleChange} disabled={disabled} />;
          else if (q.type === 'radio') BlockContent = <CEFRadioBlock key={q.id} question={q} value={rawValue} onChange={handleChange} disabled={disabled} />;
          else if (q.type === 'checkbox') BlockContent = <CEFCheckboxBlock key={q.id} question={q} value={rawValue} onChange={handleChange} disabled={disabled} />;
          else if (q.type === 'dropdown') BlockContent = <CEFDropdownBlock key={q.id} question={q} value={rawValue} onChange={handleChange} disabled={disabled} />;
          else if (q.type === 'file_upload') BlockContent = <CEFFileUploadBlock key={q.id} question={q} value={rawValue} onChange={handleChange} disabled={disabled} />;
          else if (q.type === 'cef_rtf') BlockContent = <CEFRTFBlock key={q.id} question={q} value={rawValue} onChange={handleChange} disabled={disabled} />;
          else if (q.type === 'cef_code') BlockContent = <CEFCodeBlock key={q.id} question={q} value={rawValue} onChange={handleChange} disabled={disabled} />;
          else if (q.type === 'cef_rating') BlockContent = <CEFRatingBlock key={q.id} question={q} value={fieldValue} onChange={handleChange} disabled={disabled} />;
          else {
            const fieldConfig = getCEFFieldConfig(q.type);
            if (fieldConfig?.RendererComponent) {
              const Renderer = fieldConfig.RendererComponent;
              BlockContent = <Renderer key={q.id} q={q} value={fieldValue} onChange={handleChange} disabled={disabled} />;
            } else {
              BlockContent = <div key={q.id} className="text-red-400 text-xs">Unknown type: {q.type}</div>;
            }
          }

          return (
            <div key={q.id} style={{ gridColumn: `span ${q.layout?.w || 1}` }}>
              {BlockContent}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Standard Question Card (non-CEF forms) ──────────────────── */
const StandardQuestionCard = ({ q, answers, onAnswerUpdate, disabled }) => {
  const isOptionsType = ['radio', 'checkbox', 'dropdown'].includes(q.type);
  const isGridOrMatrix = ['grid_radio', 'grid_checkbox', 'cef_rating'].includes(q.type);
  const ans = answers[q.id] || { text_value: '', options: [] };
  const value = isOptionsType ? (ans.options || []) : (ans.text_value || '');
  const fieldValue = isGridOrMatrix ? (ans.text_value || '{}') : value;

  const handleChange = (val) => {
    if (isGridOrMatrix) {
      onAnswerUpdate(q.id, val, false);
    } else {
      onAnswerUpdate(q.id, val, isOptionsType);
    }
  };

  const fieldConfig = getCEFFieldConfig(q.type);
  if (!fieldConfig?.RendererComponent) return <div className="text-red-500 text-sm">Unsupported: {q.type}</div>;
  const Renderer = fieldConfig.RendererComponent;

  let totalPoints = q.points || 0;
  if (!totalPoints && q.options && Array.isArray(q.options)) {
    totalPoints = q.options.filter(o => o.is_correct).reduce((s, o) => s + (parseFloat(o.score) || 0), 0);
  }

  return (
    <div className="w-full p-5 bg-[var(--bg-workspace)]/50 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors rounded-xl relative">
      {totalPoints > 0 && (
        <div className="absolute top-4 right-5 text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
          {totalPoints} {totalPoints === 1 ? 'point' : 'points'}
        </div>
      )}
      <label className="flex items-start mb-2 pr-20">
        <div className="flex-1">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{q.label}</span>
          {q.required && <span className="text-red-500 ml-1 font-bold">*</span>}
          {q.help_text && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{q.help_text}</p>}
        </div>
      </label>
      <div className="w-full">
        <Renderer q={q} value={isGridOrMatrix ? fieldValue : value} onChange={handleChange} disabled={disabled} />
      </div>
    </div>
  );
};

/* ─── Main DynamicFormRenderer ────────────────────────────────── */
const DynamicFormRenderer = ({ schema, disabled = true, onSubmit, isPublic = false, formMode, initialAnswers = {} }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      setAnswers(initialAnswers);
    }
  }, [initialAnswers]);

  // Normalize legacy vs new schema
  let sections = [];
  if (schema && schema.length > 0) {
    if (schema[0].questions !== undefined) {
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

  const isCEF = formMode === 'candidate_evaluation';
  const currentSection = sections[currentSectionIndex];

  const handleAnswerUpdate = (questionId, value, isOptions = false) => {
    setAnswers(prev => {
      const currentAns = prev[questionId] || {};
      return {
        ...prev,
        [questionId]: {
          ...currentAns,
          options: isOptions ? value : (currentAns.options || []),
          text_value: !isOptions ? value : (currentAns.text_value || '')
        }
      };
    });
  };

  const nextSection = () => {
    if (currentSectionIndex < sections.length - 1) setCurrentSectionIndex(p => p + 1);
  };

  const prevSection = () => {
    if (currentSectionIndex > 0) setCurrentSectionIndex(p => p - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled || !onSubmit) return;
    setIsSubmitting(true);
    try { await onSubmit(answers); } finally { setIsSubmitting(false); }
  };

  const progress = ((currentSectionIndex + 1) / sections.length) * 100;

  const sortedSections = [...sections].sort((a, b) => {
    const aOrder = a.layout?.order ?? sections.indexOf(a);
    const bOrder = b.layout?.order ?? sections.indexOf(b);
    return aOrder - bOrder;
  });

  /* ── CEF Full-Page Layout (all sections on one scroll page) ── */
  if (isCEF) {
    return (
      <div className={isPublic ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'}>
        <form onSubmit={handleSubmit}>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 ${isPublic ? 'px-4 md:px-8 pb-8 pt-2' : 'p-8 md:p-12'}`}>
            {sortedSections.map((section, idx) => (
              <div
                key={section.id}
                style={{ gridColumn: `span ${section.layout?.w || 2}` }}
                className="pt-0"
              >
                <CEFSectionRenderer
                  section={section}
                  answers={answers}
                  onAnswerUpdate={handleAnswerUpdate}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
          {/* Actions */}
          {!disabled && (
            <div className="px-8 md:px-12 pb-10 pt-6 border-t border-gray-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all form fields?')) {
                    setAnswers({});
                  }
                }}
                className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-[#60839b] text-white text-[13px] uppercase tracking-wider font-bold shadow-sm disabled:opacity-50 hover:bg-[#4d6a7d] transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </div>
          )}
        </form>
      </div>
    );
  }

  /* ── Standard Paginated Layout (assessment / survey) ────────── */
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
            <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${progress}%` }} />
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
          {currentSection.questions.map(q => (
            <StandardQuestionCard
              key={q.id}
              q={q}
              answers={answers}
              onAnswerUpdate={handleAnswerUpdate}
              disabled={disabled}
            />
          ))}
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
