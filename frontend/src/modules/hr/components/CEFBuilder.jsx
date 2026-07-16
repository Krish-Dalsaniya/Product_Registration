import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus, Trash2, Copy, GripVertical, ChevronDown, Layers, Star,
  Circle, CheckSquare, Type, Hash, Code2, FileText, LayoutGrid,
  ChevronUp, Pencil, X, Check
} from 'lucide-react';

import {
  CEF_FIELD_REGISTRY,
  CEF_SECTION_TYPES,
  getCEFFieldConfig,
  getCEFSectionType,
} from './fields/FieldRegistry';

import { OptionsBuilder } from './fields/FieldRegistry';

/* ─── Default Question for each type ──────────────────────── */
const makeDefaultQuestion = (typeId) => {
  const base = { id: uuidv4(), type: typeId, label: '', required: false, help_text: '', options: [], rows: [] };
  if (['radio', 'checkbox'].includes(typeId)) {
    base.options = [{ id: uuidv4(), label: 'Option 1', value: 'Option 1', score: 0, is_correct: false }];
  }
  if (typeId === 'cef_rating') {
    base.rows = [{ id: uuidv4(), label: '', order_index: 0 }];
  }
  if (typeId === 'cef_code') {
    base.config = { language: 'c' };
    base.starter_code = '// Write your solution here...\n';
  }
  return base;
};

/* ─── Section Type Selector Modal ──────────────────────────── */
const SectionTypeModal = ({ onSelect, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100">Select Section Type</h2>
          <p className="text-sm text-gray-400 mt-0.5">Choose how this section will be structured</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CEF_SECTION_TYPES.map(st => (
          <button
            key={st.id}
            onClick={() => onSelect(st)}
            className="flex flex-col items-start p-4 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all text-left group"
          >
            <div
              className="p-2.5 rounded-xl mb-3 transition-all"
              style={{ background: `${st.color}15`, color: st.color }}
            >
              {st.icon}
            </div>
            <p className="font-black text-gray-800 dark:text-gray-100 text-sm">{st.label}</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-tight">{st.description}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Type Dropdown for Mixed Sections ─────────────────────── */
const CEFTypeDropdown = ({ value, allowedTypes, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const availableTypes = allowedTypes.map(id => CEF_FIELD_REGISTRY[id]).filter(Boolean);
  const current = getCEFFieldConfig(value);

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
        <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 py-1">
          {availableTypes.map(t => (
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

/* ─── Question Card ─────────────────────────────────────────── */
const CEFQuestionCard = ({
  q, section, sectionType, allowedTypes,
  onUpdate, onRemove, onDuplicate,
  onAddOption, onUpdateOption, onRemoveOption,
  isActive, onActivate,
}) => {
  const fieldConfig = getCEFFieldConfig(q.type);
  const Builder = fieldConfig?.BuilderComponent;
  const isMixed = sectionType?.id === 'mixed';

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl border-l-4 transition-all shadow-sm mb-4 ${
        isActive
          ? 'border-l-[var(--accent)] shadow-md ring-1 ring-[var(--accent)]/20'
          : 'border-l-transparent hover:border-l-gray-300 dark:hover:border-l-gray-600'
      }`}
      onClick={onActivate}
    >
      <div className="p-6">
        {/* Question Label + Type Dropdown */}
        <div className="flex gap-4 items-start mb-4">
          <input
            type="text"
            value={q.label}
            onChange={e => onUpdate({ label: e.target.value })}
            placeholder={q.type === 'cef_rating' ? 'Skill category name (e.g. Embedded C Programming)' : 'Question'}
            className="flex-1 text-base font-medium bg-transparent border-0 border-b-2 border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none py-1 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 transition-colors"
          />
          {/* Only show type selector in Mixed sections */}
          {isMixed && (
            <CEFTypeDropdown
              value={q.type}
              allowedTypes={allowedTypes}
              onChange={type => {
                const defaults = makeDefaultQuestion(type);
                onUpdate({ type, options: defaults.options, rows: defaults.rows, config: defaults.config, starter_code: defaults.starter_code });
              }}
            />
          )}
        </div>

        {/* Help Text */}
        {isActive && q.type !== 'cef_rating' && (
          <input
            type="text"
            value={q.help_text || ''}
            onChange={e => onUpdate({ help_text: e.target.value })}
            placeholder="Description (optional)"
            className="w-full text-sm bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 mb-4 text-gray-500 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600 transition-colors"
          />
        )}

        {/* Field Builder */}
        {Builder && (
          <Builder
            q={q}
            isActive={isActive}
            formMode="candidate_evaluation"
            onUpdate={onUpdate}
            onUpdateOption={onUpdateOption}
            onRemoveOption={onRemoveOption}
            onAddOption={onAddOption}
          />
        )}

        {/* Card Footer */}
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

/* ─── Section Header ────────────────────────────────────────── */
const SectionHeader = ({ section, sectionType, sIdx, total, onUpdate, onRemove, onDuplicate, collapsed, onToggleCollapse }) => {
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
      {/* Accent bar — colored by section type */}
      <div className="h-2.5 w-full" style={{ background: `linear-gradient(90deg, ${sectionType?.color || 'var(--accent)'}, ${sectionType?.color || 'var(--accent)'}99)` }} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Section type badge */}
          <div className="flex-shrink-0 mt-0.5 p-2 rounded-lg" style={{ background: `${sectionType?.color || '#4f46e5'}15`, color: sectionType?.color || '#4f46e5' }}>
            {sectionType?.icon || <Layers size={18} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Section type pill */}
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: `${sectionType?.color || '#4f46e5'}15`, color: sectionType?.color || '#4f46e5' }}
              >
                {sectionType?.label || 'Mixed'}
              </span>
              {total > 1 && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                  Section {sIdx + 1} of {total}
                </span>
              )}
            </div>
            {/* Editable title */}
            <input
              type="text"
              value={section.title}
              onChange={e => onUpdate({ title: e.target.value })}
              placeholder="Section title"
              className="w-full text-xl font-bold bg-transparent border-0 border-b-2 border-transparent focus:border-[var(--accent)] outline-none py-0.5 text-gray-800 dark:text-gray-100 placeholder-gray-300 transition-colors"
            />
            <input
              type="text"
              value={section.description || ''}
              onChange={e => onUpdate({ description: e.target.value })}
              placeholder="Section description (optional)"
              className="w-full text-sm bg-transparent border-0 border-b border-transparent focus:border-gray-200 dark:focus:border-gray-700 outline-none py-0.5 mt-1 text-gray-500 dark:text-gray-400 placeholder-gray-300 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Duplicate section"
            >
              <Copy size={15} />
            </button>
            {total > 1 && (
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete section"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Add Question Bar ─────────────────────────────────────── */
const AddQuestionBar = ({ sectionType, onAdd }) => {
  const allowedTypes = sectionType?.allowedTypes || ['short_text'];
  const isMixed = sectionType?.id === 'mixed';

  // For single-type sections, show inline button with type name
  if (!isMixed) {
    const fieldConfig = getCEFFieldConfig(allowedTypes[0]);
    const defaultTypeId = allowedTypes[0];
    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
        <button
          type="button"
          onClick={() => onAdd(defaultTypeId)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-sm transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          {sectionType?.id === 'rating' ? 'Add skill row' : `Add ${fieldConfig?.label?.replace(' (Skill Matrix)', '').replace(' (Short Answer)', '').replace(' (Paragraph)', '').replace(' (Multiple Choice)', '').replace(' (Checklist)', '')} question`}
        </button>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
      </div>
    );
  }

  // Mixed section — dropdown
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-sm transition-all"
        >
          <Plus size={16} strokeWidth={2.5} /> Add question
          <ChevronDown size={14} />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-2 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 py-1">
            {allowedTypes.map(typeId => {
              const fc = getCEFFieldConfig(typeId);
              return (
                <button
                  key={typeId}
                  type="button"
                  onClick={() => { onAdd(typeId); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <span className="text-gray-400">{fc?.icon}</span>
                  {fc?.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
    </div>
  );
};

/* ─── Main CEF Builder ──────────────────────────────────────── */
const CEFBuilder = ({ schema = [], onChange }) => {
  const [localSchema, setLocalSchema] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  // Initialize from existing schema
  useEffect(() => {
    if (schema.length > 0) {
      if (schema[0]?.questions !== undefined) {
        setLocalSchema(schema);
        if (!activeSectionId && schema[0]) setActiveSectionId(schema[0].id);
      } else {
        const defaultSection = {
          id: uuidv4(),
          title: 'Technical Skills',
          description: '',
          section_type: 'mixed',
          questions: schema,
        };
        setLocalSchema([defaultSection]);
        if (!activeSectionId) setActiveSectionId(defaultSection.id);
      }
    } else {
      const initSection = {
        id: uuidv4(),
        title: 'Technical Skills',
        description: '',
        section_type: 'rating',
        questions: [],
      };
      setLocalSchema([initSection]);
      if (!activeSectionId) setActiveSectionId(initSection.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (newSchema) => { setLocalSchema(newSchema); onChange(newSchema); };

  const addQuestion = (sectionId, typeId) => {
    const newQ = makeDefaultQuestion(typeId);
    const next = localSchema.map(s =>
      s.id === sectionId ? { ...s, questions: [...s.questions, newQ] } : s
    );
    push(next);
    setActiveSectionId(sectionId);
    setActiveQuestionId(newQ.id);
  };

  const duplicateQuestion = (sectionId, q) => {
    const dup = {
      ...q,
      id: uuidv4(),
      options: (q.options || []).map(o => ({ ...o, id: uuidv4() })),
      rows: (q.rows || []).map(r => ({ ...r, id: uuidv4() })),
    };
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
        ...q, options: [...(q.options || []), { id: uuidv4(), label: `Option ${(q.options || []).length + 1}`, value: `Option ${(q.options || []).length + 1}`, score: 0, is_correct: false }]
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

  const addSection = (sectionTypeDef) => {
    const sec = {
      id: uuidv4(),
      title: `${sectionTypeDef.label} Section`,
      description: '',
      section_type: sectionTypeDef.id,
      questions: [],
    };
    const next = [...localSchema, sec];
    push(next);
    setActiveSectionId(sec.id);
    setActiveQuestionId(null);
    setShowSectionModal(false);
  };

  const duplicateSection = (sId) => {
    const src = localSchema.find(s => s.id === sId);
    if (!src) return;
    const dup = {
      ...src,
      id: uuidv4(),
      title: `${src.title} (Copy)`,
      questions: src.questions.map(q => ({
        ...q,
        id: uuidv4(),
        options: (q.options || []).map(o => ({ ...o, id: uuidv4() })),
        rows: (q.rows || []).map(r => ({ ...r, id: uuidv4() })),
      })),
    };
    const idx = localSchema.findIndex(s => s.id === sId);
    const next = [...localSchema.slice(0, idx + 1), dup, ...localSchema.slice(idx + 1)];
    push(next);
  };

  const updateSection = (sId, updates) => push(localSchema.map(s => s.id === sId ? { ...s, ...updates } : s));

  const removeSection = (sId) => {
    if (localSchema.length <= 1) return;
    const next = localSchema.filter(s => s.id !== sId);
    push(next);
    if (activeSectionId === sId) { setActiveSectionId(next[0]?.id || null); setActiveQuestionId(null); }
  };

  const toggleCollapse = (sId) => {
    setCollapsedSections(prev => ({ ...prev, [sId]: !prev[sId] }));
  };

  return (
    <>
      {showSectionModal && (
        <SectionTypeModal
          onSelect={addSection}
          onClose={() => setShowSectionModal(false)}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-0 relative pl-6">
        {localSchema.map((section, sIdx) => {
          const sectionType = getCEFSectionType(section.section_type || 'mixed');
          const allowedTypes = sectionType?.allowedTypes || Object.keys(CEF_FIELD_REGISTRY);
          const isCollapsed = collapsedSections[section.id];

          return (
            <div key={section.id} className="relative">
              {/* Left Timeline Line */}
              {localSchema.length > 1 && (
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-gray-200 dark:from-gray-700 to-transparent" style={{ left: '-24px' }} />
              )}

              {/* Section Header */}
              <SectionHeader
                section={section}
                sectionType={sectionType}
                sIdx={sIdx}
                total={localSchema.length}
                onUpdate={updates => updateSection(section.id, updates)}
                onRemove={() => removeSection(section.id)}
                onDuplicate={() => duplicateSection(section.id)}
                collapsed={isCollapsed}
                onToggleCollapse={() => toggleCollapse(section.id)}
              />

              {/* Questions */}
              {!isCollapsed && (
                <>
                  {section.questions.map(q => (
                    <CEFQuestionCard
                      key={q.id}
                      q={q}
                      section={section}
                      sectionType={sectionType}
                      allowedTypes={allowedTypes}
                      isActive={activeQuestionId === q.id}
                      onActivate={() => { setActiveQuestionId(q.id); setActiveSectionId(section.id); }}
                      onUpdate={updates => updateQuestion(section.id, q.id, updates)}
                      onRemove={() => removeQuestion(section.id, q.id)}
                      onDuplicate={() => duplicateQuestion(section.id, q)}
                      onAddOption={() => addOption(section.id, q.id)}
                      onUpdateOption={(idx, updates) => updateOption(section.id, q.id, idx, updates)}
                      onRemoveOption={idx => removeOption(section.id, q.id, idx)}
                    />
                  ))}

                  {/* Add Question Bar */}
                  <AddQuestionBar
                    sectionType={sectionType}
                    onAdd={typeId => addQuestion(section.id, typeId)}
                  />
                </>
              )}

              {/* Add Section — only after last section */}
              {sIdx === localSchema.length - 1 && (
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                  <button
                    type="button"
                    onClick={() => setShowSectionModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold text-gray-500 hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-sm transition-all"
                  >
                    <Layers size={16} /> + Add section
                  </button>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CEFBuilder;
