import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, ChevronDown, CheckSquare, Circle, List, Type, AlignLeft,
  Mail, Phone, Hash, Calendar, Upload, Star, ToggleRight, Link as LinkIcon,
  Layers, GripVertical, Copy, MoreVertical, Calculator, PenTool
} from 'lucide-react';

const QUESTION_TYPES = [
  { id: 'short_text',  label: 'Short answer',      icon: <Type size={16} /> },
  { id: 'long_text',   label: 'Paragraph',          icon: <AlignLeft size={16} /> },
  { id: 'radio',       label: 'Multiple choice',    icon: <Circle size={16} /> },
  { id: 'checkbox',    label: 'Checkboxes',         icon: <CheckSquare size={16} /> },
  { id: 'dropdown',    label: 'Dropdown',           icon: <ChevronDown size={16} /> },
  { id: 'email',       label: 'Email',              icon: <Mail size={16} /> },
  { id: 'phone',       label: 'Phone number',       icon: <Phone size={16} /> },
  { id: 'number',      label: 'Number',             icon: <Hash size={16} /> },
  { id: 'date',        label: 'Date',               icon: <Calendar size={16} /> },
  { id: 'time',        label: 'Time',               icon: <Calendar size={16} /> },
  { id: 'file_upload', label: 'File upload',        icon: <Upload size={16} /> },
  { id: 'rating',      label: 'Rating (stars)',     icon: <Star size={16} /> },
  { id: 'toggle',      label: 'Linear scale',       icon: <ToggleRight size={16} /> },
  { id: 'url',         label: 'URL / Link',         icon: <LinkIcon size={16} /> },
  { id: 'currency',    label: 'Currency',           icon: <Calculator size={16} /> },
  { id: 'signature',   label: 'Signature',          icon: <PenTool size={16} /> },
];

const getTypeLabel = (typeId) => QUESTION_TYPES.find(t => t.id === typeId)?.label || typeId;
const getTypeIcon  = (typeId) => QUESTION_TYPES.find(t => t.id === typeId)?.icon  || <Type size={16} />;

const TypeDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--accent)] transition-colors shadow-sm min-w-[170px] justify-between"
      >
        <span className="flex items-center gap-2">
          <span className="text-[var(--accent)]">{getTypeIcon(value)}</span>
          {getTypeLabel(value)}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-56 py-1 overflow-y-auto max-h-72">
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
          <TypeDropdown value={q.type} onChange={type => onUpdate({ type, options: ['radio','checkbox','dropdown'].includes(type) && q.options?.length ? q.options : ((['radio','checkbox','dropdown'].includes(type)) ? [{ label: 'Option 1', value: 'Option 1', score: 0, is_correct: false }] : []) })} />
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

        {/* Preview of answer type */}
        {!hasOptions && (
          <div className="mt-2">
            {q.type === 'short_text' && <div className="w-1/2 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1">Short answer text</div>}
            {q.type === 'long_text' && <div className="w-full h-16 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1">Long answer text</div>}
            {q.type === 'email' && <div className="w-1/2 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1">example@email.com</div>}
            {q.type === 'phone' && <div className="w-1/2 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1">Phone number</div>}
            {q.type === 'number' && <div className="w-1/3 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1">Number</div>}
            {q.type === 'currency' && <div className="w-1/3 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1">$ Amount</div>}
            {q.type === 'date' && <div className="flex items-center gap-2 text-gray-400 text-sm mt-1"><Calendar size={16} /> Date</div>}
            {q.type === 'time' && <div className="flex items-center gap-2 text-gray-400 text-sm mt-1"><Calendar size={16} /> Time</div>}
            {q.type === 'url' && <div className="w-1/2 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1">https://...</div>}
            {q.type === 'file_upload' && (
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                <Upload size={20} className="mx-auto text-gray-300 mb-1" />
                <p className="text-xs text-gray-400">File upload</p>
              </div>
            )}
            {q.type === 'rating' && (
              <div className="flex gap-2 mt-2">
                {[1,2,3,4,5].map(i => <Star key={i} size={24} className="text-gray-200 dark:text-gray-600" />)}
              </div>
            )}
            {q.type === 'toggle' && (
              <div className="flex gap-4 mt-2 items-center text-sm text-gray-400">
                <span>1</span>
                {[2,3,4,5,6,7,8,9,10].map(i => <span key={i} className="text-gray-200 dark:text-gray-700">|</span>)}
                <span>10</span>
              </div>
            )}
            {q.type === 'signature' && <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg h-16 flex items-center justify-center text-xs text-gray-400">Signature pad</div>}
          </div>
        )}

        {/* Options for radio/checkbox/dropdown */}
        {hasOptions && (
          <div className="space-y-2 mt-2">
            {(q.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-3 group/opt">
                <div className="flex-none text-gray-300 dark:text-gray-600">
                  {q.type === 'radio'    && <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                  {q.type === 'checkbox' && <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600" />}
                  {q.type === 'dropdown' && <span className="text-sm text-gray-400 font-medium w-5 text-center">{i+1}.</span>}
                </div>
                <input
                  type="text"
                  value={opt.label}
                  onChange={e => onUpdateOption(i, { label: e.target.value, value: e.target.value })}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 text-sm bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 text-gray-700 dark:text-gray-300 placeholder-gray-300 transition-colors"
                />
                {/* Score input — visible when active and not survey */}
                {isActive && (
                  <div className="flex items-center gap-1 opacity-0 group-hover/opt:opacity-100 focus-within:opacity-100 transition-opacity">
                    {formMode !== 'survey' && (
                      <>
                        <span className="text-[10px] text-gray-400 font-medium">Score:</span>
                        <input
                          type="number"
                          value={opt.score || 0}
                          onChange={e => onUpdateOption(i, { score: parseFloat(e.target.value) || 0 })}
                          className="w-10 text-xs bg-gray-50 dark:bg-gray-700 rounded px-1 text-center outline-none border border-gray-200 dark:border-gray-600"
                        />
                        <label className="flex items-center gap-1 cursor-pointer ml-1" title="Mark correct">
                          <input
                            type="checkbox"
                            checked={!!opt.is_correct}
                            onChange={e => onUpdateOption(i, { is_correct: e.target.checked })}
                            className="accent-green-500 w-3 h-3"
                          />
                          <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">✓</span>
                        </label>
                      </>
                    )}
                    <button type="button" onClick={() => onRemoveOption(i)} disabled={q.options.length <= 1} className="text-gray-300 hover:text-red-400 disabled:opacity-20 ml-1 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={onAddOption}
              className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] mt-2 ml-7 font-medium transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} /> Add option
            </button>
          </div>
        )}

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
        const defaultSection = { id: 'section_1', title: 'Section 1', description: '', questions: schema };
        setLocalSchema([defaultSection]);
        if (!activeSectionId) setActiveSectionId(defaultSection.id);
      }
    } else {
      const initSection = { id: 'section_1', title: 'Section 1', description: '', questions: [] };
      setLocalSchema([initSection]);
      if (!activeSectionId) setActiveSectionId(initSection.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (newSchema) => { setLocalSchema(newSchema); onChange(newSchema); };

  const addQuestion = (sectionId, typeId = 'radio') => {
    const newQ = {
      id: `q_${Date.now()}`,
      type: typeId,
      label: '',
      required: false,
      placeholder: '',
      help_text: '',
      options: ['radio','checkbox','dropdown'].includes(typeId)
        ? [{ label: 'Option 1', value: 'Option 1', score: 0, is_correct: false }] : []
    };
    const next = localSchema.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, newQ] } : s);
    push(next);
    setActiveSectionId(sectionId);
    setActiveQuestionId(newQ.id);
  };

  const duplicateQuestion = (sectionId, q) => {
    const dup = { ...q, id: `q_${Date.now()}`, options: (q.options || []).map(o => ({ ...o })) };
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
        ...q, options: [...(q.options||[]), { label: `Option ${(q.options||[]).length+1}`, value: `Option ${(q.options||[]).length+1}`, score:0, is_correct:false }]
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
    const sec = { id: `sec_${Date.now()}`, title: `Section ${localSchema.length + 1}`, description: '', questions: [] };
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

