import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Trash2, Copy, GripVertical, ChevronDown, Layers, Star,
  Circle, CheckSquare, Type, Hash, Code2, FileText, LayoutGrid,
  ChevronUp, Pencil, X, Check, Edit3, Maximize2, Minimize2
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
        className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-200 whitespace-nowrap flex-shrink-0"
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

/* ─── Question Card (WYSIWYG) ─────────────────────────────────── */
const CEFQuestionCard = ({
  q, section, sectionType, allowedTypes,
  onUpdate, onRemove, onDuplicate,
  onAddOption, onUpdateOption, onRemoveOption,
  isActive, onActivate, dragHandleProps,
}) => {
  const fieldConfig = getCEFFieldConfig(q.type);
  const Builder = fieldConfig?.BuilderComponent;
  const isMixed = sectionType?.id === 'mixed';

  return (
    <div className={`relative p-3 mb-2 rounded-xl transition-colors ${isActive ? 'bg-white border-2 border-[#60839b] shadow-md z-10' : 'bg-transparent border-2 border-transparent hover:border-gray-100 hover:bg-gray-50/50'}`} onClick={() => !isActive && onActivate()}>
      <div className="pl-6 relative">
        {isActive && (
          <div {...(dragHandleProps || {})} className="absolute left-0 top-3 text-gray-300 cursor-grab hover:text-gray-500 transition-colors">
            <GripVertical size={16} />
          </div>
        )}

        {/* Header / Editor */}
        {isActive ? (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2 items-start mb-2">
              <input
                type="text"
                value={q.label}
                onChange={e => onUpdate({ label: e.target.value })}
                placeholder={q.type === 'cef_rating' ? 'Category name (e.g. C & Embedded C)' : 'Question text'}
                className="flex-1 min-w-[120px] text-[14px] font-bold bg-white border border-[#a1b9ca] px-2 py-1 outline-none focus:border-[#60839b] text-[#4a728a]"
              />
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
          </div>
        ) : (
          /* Inactive Preview Mode (WYSIWYG) */
          <div className="flex items-start justify-between group/qtitle">
            <div className={`text-[12px] font-bold text-gray-800 leading-tight mb-1 ${q.type === 'cef_rating' ? 'text-[#4a728a] text-[14px] mb-2' : ''}`}>
              {q.label || <span className="text-gray-400 italic">Untitled Question</span>}
              {q.required && <span className="text-red-500 ml-1">*</span>}
            </div>
            <div className="opacity-0 group-hover/qtitle:opacity-100 transition-opacity">
              <Pencil size={14} className="text-gray-400 cursor-pointer hover:text-[#60839b]" onClick={(e) => { e.stopPropagation(); onActivate(); }} />
            </div>
          </div>
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

        {/* Card Footer (Actions) */}
        {isActive && (
          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-200">
            <button type="button" onClick={onDuplicate} className="p-1.5 text-gray-500 hover:text-[#60839b] transition-colors rounded hover:bg-white" title="Duplicate">
              <Copy size={16} />
            </button>
            <button type="button" onClick={onRemove} className="p-1.5 text-gray-500 hover:text-red-500 transition-colors rounded hover:bg-red-50" title="Delete">
              <Trash2 size={16} />
            </button>
            <div className="w-px h-5 bg-gray-300" />
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <span className="text-xs font-bold text-gray-600">Required</span>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${q.required ? 'bg-[#60839b]' : 'bg-gray-300'}`}
                onClick={() => onUpdate({ required: !q.required })}
              >
                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${q.required ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
            <div className="w-px h-5 bg-gray-300 ml-1" />
            <button
              type="button"
              onClick={() => onUpdate({ layout: { ...(q.layout || {}), w: (q.layout?.w || 1) === 2 ? 1 : 2 } })}
              className="p-1.5 text-gray-500 hover:text-[#60839b] transition-colors rounded hover:bg-white"
              title={(q.layout?.w || 1) === 2 ? 'Make Half Width' : 'Make Full Width'}
            >
              {(q.layout?.w || 1) === 2 ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Sortable Section Wrapper ───────────────────────────────── */
const SortableSection = ({ section, renderContent }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id, data: { type: 'section' } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.4 : 1,
    gridColumn: `span ${section.layout?.w || 2}`,
    minWidth: 0,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative flex flex-col h-full rounded-xl transition-all ${isDragging ? 'shadow-2xl ring-2 ring-[#60839b] bg-white' : ''}`}>
      {renderContent({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
};

/* ─── Sortable Question Wrapper ──────────────────────────────── */
const SortableQuestion = ({ question, sectionId, renderContent }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id, data: { type: 'question', sectionId } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
    gridColumn: `span ${question.layout?.w || 1}`,
    minWidth: 0,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {renderContent({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
};

/* ─── Section Header (WYSIWYG) ────────────────────────────────── */
const SectionHeader = ({ section, sectionType, sIdx, total, onUpdate, onRemove, onDuplicate, collapsed, onToggleCollapse, dragHandleProps }) => {
  const w = section.layout?.w || 2;
  const toggleWidth = () => {
    onUpdate({ layout: { ...(section.layout || { order: sIdx }), w: w === 1 ? 2 : 1 } });
  };

  return (
    <div className="group/section flex items-start justify-between mb-3 pt-4 border-t-2 border-gray-100">
      <div className="flex-1 min-w-0 pr-4 flex items-center gap-2">
        <div 
          {...(dragHandleProps || {})} 
          className="cursor-grab hover:text-gray-600 text-gray-300 transition-colors"
          title="Drag to reorder section"
        >
          <GripVertical size={16} />
        </div>
        <div className="relative group cursor-text flex-1">
          <input
            type="text"
            value={section.title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Click to enter Section Title..."
            title="Click to edit section title"
            className="w-full text-[22px] font-bold text-[#60839b] bg-[#f8fafc] border border-gray-300 border-dashed hover:border-gray-400 focus:border-[#60839b] focus:border-solid focus:bg-white rounded px-2 pr-8 -ml-2 py-1 outline-none transition-all placeholder-gray-400"
          />
          <Edit3 size={15} className="text-[#60839b] opacity-60 group-hover:opacity-100 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity" />
        </div>
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity mt-1">
        <span className="text-[10px] font-bold uppercase text-[#60839b] bg-[#e6edf2] px-2 py-0.5 rounded mr-2">
          {sectionType?.label || 'Mixed'}
        </span>
        <button type="button" onClick={toggleWidth} className="p-1 text-gray-400 hover:text-[#60839b]" title={w === 1 ? 'Make Full Width' : 'Make Half Width'}>
          {w === 1 ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
        <button type="button" onClick={onToggleCollapse} className="p-1 text-gray-400 hover:text-gray-800" title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        <button type="button" onClick={onDuplicate} className="p-1 text-gray-400 hover:text-[#60839b]" title="Duplicate section">
          <Copy size={13} />
        </button>
        {total > 1 && (
          <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500" title="Delete section">
            <Trash2 size={13} />
          </button>
        )}
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
      <div className="flex items-center gap-2 my-2 opacity-50 hover:opacity-100 transition-opacity pl-2">
        <button
          type="button"
          onClick={() => onAdd(defaultTypeId)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#60839b] hover:text-[#4d6a7d]"
        >
          <Plus size={14} strokeWidth={3} />
          {sectionType?.id === 'rating' ? 'ADD SKILL ROW' : `ADD ${fieldConfig?.label?.replace(' (Skill Matrix)', '').replace(' (Short Answer)', '').replace(' (Paragraph)', '').replace(' (Multiple Choice)', '').replace(' (Checklist)', '').toUpperCase()} QUESTION`}
        </button>
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
    <div className="flex items-center gap-2 my-2 opacity-50 hover:opacity-100 transition-opacity pl-2 relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-[#60839b] hover:text-[#4d6a7d]"
      >
        <Plus size={14} strokeWidth={3} /> ADD QUESTION
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-[#a1b9ca] rounded shadow-lg z-20 py-1">
          {allowedTypes.map(typeId => {
            const fc = getCEFFieldConfig(typeId);
            return (
              <button
                key={typeId}
                type="button"
                onClick={() => { onAdd(typeId); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-[#e6edf2] hover:text-[#60839b] transition-colors text-left"
              >
                {fc?.label}
              </button>
            );
          })}
        </div>
      )}
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
          title: '',
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
        title: '',
        description: '',
        section_type: 'mixed',
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
    const next = localSchema.map(s => {
      if (s.id === sectionId) {
        const qs = [...s.questions, newQ];
        const sequenced = qs.map((q, i) => ({ ...q, order: i }));
        return { ...s, questions: sequenced };
      }
      return s;
    });
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
    push(localSchema.map(s => {
      if (s.id === sectionId) {
        const idx = s.questions.findIndex(x => x.id === q.id);
        const qs = [...s.questions.slice(0, idx + 1), dup, ...s.questions.slice(idx + 1)];
        const sequenced = qs.map((x, i) => ({ ...x, order: i }));
        return { ...s, questions: sequenced };
      }
      return s;
    }));
    setActiveQuestionId(dup.id);
  };

  const removeQuestion = (sectionId, qId) => {
    push(localSchema.map(s => {
      if (s.id === sectionId) {
        const qs = s.questions.filter(x => x.id !== qId);
        const sequenced = qs.map((x, i) => ({ ...x, order: i }));
        return { ...s, questions: sequenced };
      }
      return s;
    }));
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
    const nextOrder = localSchema.length > 0 ? Math.max(...localSchema.map(s => s.layout?.order ?? 0)) + 1 : 0;
    const sec = {
      id: uuidv4(),
      title: `${sectionTypeDef.label} Section`,
      description: '',
      section_type: sectionTypeDef.id,
      questions: [],
      layout: { order: nextOrder, w: 2 },
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
      layout: { ...(src.layout || {}), w: src.layout?.w || 2 },
    };
    const idx = localSchema.findIndex(s => s.id === sId);
    const next = [...localSchema.slice(0, idx + 1), dup, ...localSchema.slice(idx + 1)];
    const sequenced = next.map((s, i) => ({ ...s, layout: { ...(s.layout || {}), order: i } }));
    push(sequenced);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;

    if (activeType === 'section') {
      const oldIndex = sortedSchema.findIndex(s => s.id === active.id);
      const newIndex = sortedSchema.findIndex(s => s.id === over.id);
      const moved = arrayMove(sortedSchema, oldIndex, newIndex);
      const sequenced = moved.map((s, i) => ({ ...s, layout: { ...(s.layout || {}), order: i } }));
      push(sequenced);
    }

    if (activeType === 'question') {
      const sectionId = active.data.current.sectionId;
      const overSectionId = over.data.current?.sectionId;
      if (sectionId !== overSectionId) return;

      const section = localSchema.find(s => s.id === sectionId);
      if (!section) return;

      const sortedQuestions = [...section.questions].sort((a, b) => {
        const aOrder = a.order ?? section.questions.indexOf(a);
        const bOrder = b.order ?? section.questions.indexOf(b);
        return aOrder - bOrder;
      });

      const oldIndex = sortedQuestions.findIndex(q => q.id === active.id);
      const newIndex = sortedQuestions.findIndex(q => q.id === over.id);
      const reordered = arrayMove(sortedQuestions, oldIndex, newIndex)
        .map((q, i) => ({ ...q, order: i }));

      push(localSchema.map(s =>
        s.id === sectionId ? { ...s, questions: reordered } : s
      ));
    }
  };

  const sortedSchema = [...localSchema].sort((a, b) => {
    const aOrder = a.layout?.order ?? localSchema.indexOf(a);
    const bOrder = b.layout?.order ?? localSchema.indexOf(b);
    return aOrder - bOrder;
  });

  return (
    <>
      {showSectionModal && (
        <SectionTypeModal
          onSelect={addSection}
          onClose={() => setShowSectionModal(false)}
        />
      )}

      <div className="max-w-4xl mx-auto bg-white border border-[#a1b9ca] p-8 md:p-12 shadow-sm font-sans text-gray-800">
        <div className="text-right text-[10px] text-gray-400 font-bold mb-4 uppercase tracking-widest border-b border-gray-100 pb-2">
          Enterprise Interview Assessment Builder
        </div>
        <div className="space-y-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedSchema.map(s => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-4">
                {sortedSchema.map((section, sIdx) => {
                  const sectionType = getCEFSectionType(section.section_type || 'mixed');
                  const allowedTypes = sectionType?.allowedTypes || Object.keys(CEF_FIELD_REGISTRY);
                  const isCollapsed = collapsedSections[section.id];

                  return (
                    <SortableSection key={section.id} section={section} renderContent={({ dragHandleProps }) => (
                      <div className="p-4 flex-1">
                        {/* Section Header */}
                        <SectionHeader
                          section={section}
                          sectionType={sectionType}
                          sIdx={sIdx}
                          total={sortedSchema.length}
                          onUpdate={updates => updateSection(section.id, updates)}
                          onRemove={() => removeSection(section.id)}
                          onDuplicate={() => duplicateSection(section.id)}
                          collapsed={isCollapsed}
                          onToggleCollapse={() => toggleCollapse(section.id)}
                          dragHandleProps={dragHandleProps}
                        />

                        {/* Questions */}
                        {!isCollapsed && (
                          <div
                            className={sectionType.id !== 'rating' ? 'grid grid-cols-2 gap-x-8 gap-y-5' : ''}
                            style={sectionType.id === 'rating'
                              ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', columnGap: '2.5rem', rowGap: '1.5rem' }
                              : {}}
                          >
                            {(() => {
                              const sortedQuestions = [...section.questions].sort((a, b) => {
                                const aOrder = a.order ?? section.questions.indexOf(a);
                                const bOrder = b.order ?? section.questions.indexOf(b);
                                return aOrder - bOrder;
                              });
                              return (
                                <SortableContext items={sortedQuestions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                  {sortedQuestions.map(q => (
                                    <SortableQuestion key={q.id} question={q} sectionId={section.id} renderContent={({ dragHandleProps }) => (
                                      <CEFQuestionCard
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
                                        dragHandleProps={dragHandleProps}
                                      />
                                    )} />
                                  ))}
                                </SortableContext>
                              );
                            })()}

                            {/* Add Question Bar */}
                            <div className="col-span-2">
                              <AddQuestionBar
                                sectionType={sectionType}
                                onAdd={typeId => addQuestion(section.id, typeId)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )} />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
          
          <div className="flex items-center gap-2 mt-8 pt-8 border-t border-gray-200 justify-center">
            <button
              type="button"
              onClick={() => setShowSectionModal(true)}
              className="flex items-center gap-2 px-5 py-2 bg-[#e6edf2] text-[#60839b] font-bold text-[11px] uppercase tracking-wide hover:bg-[#60839b] hover:text-white transition-colors rounded"
            >
              <Layers size={14} /> ADD NEW SECTION
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CEFBuilder;
