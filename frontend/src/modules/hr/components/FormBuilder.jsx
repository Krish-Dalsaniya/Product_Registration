import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus, Trash2, ChevronDown, CheckSquare, Circle, List, Type, AlignLeft,
  Mail, Phone, Hash, Calendar, Upload, Star, ToggleRight, Link as LinkIcon,
  Layers, GripVertical, Copy, MoreVertical, Calculator, PenTool
} from 'lucide-react';

import { FieldRegistry, getFieldConfig } from './fields/FieldRegistry';

const QUESTION_TYPES = Object.values(FieldRegistry).map(f => ({
  id: f.id, label: f.label, icon: f.icon
}));

const TypeDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  
  useEffect(() => {
    const handleClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = getFieldConfig(value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-200"
      >
        <span className="text-gray-400">{current.icon}</span>
        {current.label}
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 py-1">
          {QUESTION_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onChange(t.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left ${value === t.id ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <span className={value === t.id ? 'text-[var(--accent)]' : 'text-gray-400'}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const QuestionCard = ({ q, section, onUpdate, onRemove, onDuplicate, onAddOption, onUpdateOption, onRemoveOption, isActive, onActivate, formMode }) => {
  const hasOptions = ['radio', 'checkbox', 'dropdown'].includes(q.type);

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl border-l-4 transition-all shadow-sm mb-4 ${isActive ? 'border-l-[var(--accent)] shadow-md ring-1 ring-[var(--accent)]/20' : 'border-l-transparent hover:border-l-gray-300 dark:hover:border-l-gray-600'}`}
      onClick={onActivate}
    >
      {/* Drag Handle */}
      <div className="absolute left-0 top-0 -translate-x-5 h-full flex items-center opacity-0 hover:opacity-100 transition-opacity">
        <GripVertical size={16} className="text-gray-400 cursor-grab" />
      </div>

      <div className="p-6">
        {/* Question Label Row */}
        <div className="flex gap-4 items-start mb-4">
          <input
            type="text"
            value={q.label}
            onChange={e => onUpdate({ label: e.target.value })}
            placeholder="Question"
            className="flex-1 text-base font-medium bg-transparent border-0 border-b-2 border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none py-1 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 transition-colors"
          />
          <TypeDropdown value={q.type} onChange={type => onUpdate({ type, options: ['radio','checkbox','dropdown'].includes(type) && q.options?.length ? q.options : ((['radio','checkbox','dropdown'].includes(type)) ? [{ id: uuidv4(), label: 'Option 1', value: 'Option 1', score: 0, is_correct: false }] : []) })} />
        </div>

        {/* Description / help text */}
        {isActive && (
          <input
            type="text"
            value={q.help_text || ''}
            onChange={e => onUpdate({ help_text: e.target.value })}
            placeholder="Description (optional)"
            className="w-full text-sm bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 mb-4 text-gray-500 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600 transition-colors"
          />
        )}

        {/* Registry-based Builder Component */}
        {(() => {
          const fieldConfig = getFieldConfig(q.type);
          if (!fieldConfig || !fieldConfig.BuilderComponent) return null;
          const Builder = fieldConfig.BuilderComponent;
          return (
            <Builder 
              q={q} 
              isActive={isActive} 
              formMode={formMode}
              onUpdate={onUpdate}
              onUpdateOption={onUpdateOption}
              onRemoveOption={onRemoveOption}
              onAddOption={onAddOption}
            />
          );
        })()}

        {/* Card Footer — only visible when active */}
        {isActive && (
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onDuplicate} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Duplicate">
              <Copy size={18} />
            </button>
            <button type="button" onClick={onRemove} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
              <Trash2 size={18} />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Required</span>
              <div
                className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${q.required ? 'bg-[var(--accent)]' : 'bg-gray-200 dark:bg-gray-600'}`}
                onClick={() => onUpdate({ required: !q.required })}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${q.required ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

const FormBuilder = ({ schema = [], onChange, formMode = 'assessment' }) => {
  const [localSchema, setLocalSchema] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);

  useEffect(() => {
    if (schema.length > 0) {
      if (schema[0]?.questions !== undefined) {
        setLocalSchema(schema);
        if (!activeSectionId && schema[0]) setActiveSectionId(schema[0].id);
      } else {
        const defaultSection = { id: uuidv4(), title: 'Section 1', description: '', questions: schema };
        setLocalSchema([defaultSection]);
        if (!activeSectionId) setActiveSectionId(defaultSection.id);
      }
    } else {
      const initSection = { id: uuidv4(), title: 'Section 1', description: '', questions: [] };
      setLocalSchema([initSection]);
      if (!activeSectionId) setActiveSectionId(initSection.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (newSchema) => { setLocalSchema(newSchema); onChange(newSchema); };

  const addQuestion = (sectionId, typeId = 'radio') => {
    const newQ = {
      id: uuidv4(),
      type: typeId,
      label: '',
      required: false,
      placeholder: '',
      help_text: '',
      options: ['radio','checkbox','dropdown'].includes(typeId)
        ? [{ id: uuidv4(), label: 'Option 1', value: 'Option 1', score: 0, is_correct: false }] : []
    };
    const next = localSchema.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, newQ] } : s);
    push(next);
    setActiveSectionId(sectionId);
    setActiveQuestionId(newQ.id);
  };

  const duplicateQuestion = (sectionId, q) => {
    const dup = { ...q, id: uuidv4(), options: (q.options || []).map(o => ({ ...o, id: uuidv4() })) };
    push(localSchema.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, dup] } : s));
    setActiveQuestionId(dup.id);
  };

  const removeQuestion = (sectionId, qId) => {
    push(localSchema.map(s => s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== qId) } : s));
    if (activeQuestionId === qId) setActiveQuestionId(null);
  };

  const updateQuestion = (sectionId, qId, updates) => {
    push(localSchema.map(s => s.id === sectionId ? {
      ...s, questions: s.questions.map(q => q.id === qId ? { ...q, ...updates } : q)
    } : s));
  };

  const addOption = (sectionId, qId) => {
    push(localSchema.map(s => s.id === sectionId ? {
      ...s, questions: s.questions.map(q => q.id === qId ? {
        ...q, options: [...(q.options||[]), { id: uuidv4(), label: `Option ${(q.options||[]).length+1}`, value: `Option ${(q.options||[]).length+1}`, score:0, is_correct:false }]
      } : q)
    } : s));
  };

  const updateOption = (sectionId, qId, idx, updates) => {
    push(localSchema.map(s => s.id === sectionId ? {
      ...s, questions: s.questions.map(q => q.id === qId ? {
        ...q, options: q.options.map((o, i) => i === idx ? { ...o, ...updates } : o)
      } : q)
    } : s));
  };

  const removeOption = (sectionId, qId, idx) => {
    push(localSchema.map(s => s.id === sectionId ? {
      ...s, questions: s.questions.map(q => q.id === qId ? {
        ...q, options: q.options.filter((_, i) => i !== idx)
      } : q)
    } : s));
  };

  const addSection = () => {
    const sec = { id: uuidv4(), title: `Section ${localSchema.length + 1}`, description: '', questions: [] };
    const next = [...localSchema, sec];
    push(next);
    setActiveSectionId(sec.id);
    setActiveQuestionId(null);
  };

  const updateSection = (sId, updates) => push(localSchema.map(s => s.id === sId ? { ...s, ...updates } : s));

  const removeSection = (sId) => {
    if (localSchema.length <= 1) return;
    const next = localSchema.filter(s => s.id !== sId);
    push(next);
    if (activeSectionId === sId) { setActiveSectionId(next[0]?.id || null); setActiveQuestionId(null); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-0 relative pl-6">
      {localSchema.map((section, sIdx) => (
        <div key={section.id} className="relative">
          {/* Section header card — Google Forms purple top border style */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
            <div className="h-2.5 bg-gradient-to-r from-[var(--accent)] to-purple-500" />
            <div className="p-5 space-y-2">
              <input
                type="text"
                value={section.title}
                onChange={e => updateSection(section.id, { title: e.target.value })}
                placeholder="Form Title"
                className="w-full text-2xl font-bold bg-transparent border-0 border-b-2 border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none py-1 text-gray-800 dark:text-gray-100 placeholder-gray-300 transition-colors"
              />
              <input
                type="text"
                value={section.description || ''}
                onChange={e => updateSection(section.id, { description: e.target.value })}
                placeholder="Form description (optional)"
                className="w-full text-sm bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none py-1 text-gray-500 dark:text-gray-400 placeholder-gray-300 transition-colors"
              />
              {localSchema.length > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">Section {sIdx + 1}</span>
                  <button type="button" onClick={() => removeSection(section.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete section">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Questions */}
          {section.questions.map(q => (
            <QuestionCard
              key={q.id}
              q={q}
              section={section}
              isActive={activeQuestionId === q.id}
              onActivate={() => { setActiveQuestionId(q.id); setActiveSectionId(section.id); }}
              onUpdate={updates => updateQuestion(section.id, q.id, updates)}
              onRemove={() => removeQuestion(section.id, q.id)}
              onDuplicate={() => duplicateQuestion(section.id, q)}
              onAddOption={() => addOption(section.id, q.id)}
              onUpdateOption={(idx, updates) => updateOption(section.id, q.id, idx, updates)}
              onRemoveOption={(idx) => removeOption(section.id, q.id, idx)}
              formMode={formMode}
            />
          ))}

          {/* Add Question FAB */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setActiveSectionId(section.id); addQuestion(section.id, 'radio'); }}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-sm transition-all"
              >
                <Plus size={16} strokeWidth={2.5} /> Add question
              </button>
              {sIdx === localSchema.length - 1 && (
                <button
                  type="button"
                  onClick={addSection}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-purple-400 hover:text-purple-500 shadow-sm transition-all"
                >
                  <Layers size={16} /> Add section
                </button>
              )}
            </div>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default FormBuilder;

