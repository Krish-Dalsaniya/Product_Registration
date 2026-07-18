import React from 'react';
import { Type, AlignLeft, Circle, CheckSquare, ChevronDown, Calendar, Upload, Star, Hash, List, ToggleRight, PenTool, LayoutGrid, Code2, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Plus } from 'lucide-react';
import { FileUploadField } from './FileUploadField';
import { GridBuilder, GridRenderer } from './GridField';
import { SkillMatrixBuilder, SkillMatrixRenderer } from './SkillMatrixField';
import { MonacoBuilder, MonacoRenderer } from './MonacoField';
import { RichTextBuilder, RichTextRenderer } from './RichTextField';

// Basic Option-Based Fields Builder
export const OptionsBuilder = ({ q, isActive, formMode, onUpdateOption, onRemoveOption, onAddOption, onUpdate }) => (
  <div className="space-y-2 mt-2">
    {(q.options || []).map((opt, i) => (
      <div key={i} className="flex items-center gap-3 group/opt">
        <div className="flex-none text-gray-300 dark:text-gray-600">
          {q.type === 'radio' && <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
          {q.type === 'checkbox' && <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600" />}
          {q.type === 'dropdown' && <span className="text-sm text-gray-400 font-medium w-5 text-center">{i + 1}.</span>}
        </div>
        <input
          type="text"
          value={opt.label}
          onChange={e => onUpdateOption(i, { label: e.target.value, value: e.target.value })}
          onPaste={e => {
            const paste = e.clipboardData.getData('text');
            let items = [];
            if (paste.includes('\n')) {
              items = paste.split(/\r?\n/);
            } else if (paste.includes(',')) {
              items = paste.split(',');
            }
            
            items = items.map(l => l.trim()).filter(Boolean);
            
            if (items.length > 1 && onUpdate) {
              e.preventDefault();
              const newOptions = [...(q.options || [])];
              newOptions[i] = { ...newOptions[i], label: items[0], value: items[0] };
              items.slice(1).forEach((l, idx) => {
                newOptions.splice(i + 1 + idx, 0, { id: uuidv4(), label: l, value: l, score: 0, is_correct: false });
              });
              onUpdate({ options: newOptions });
            }
          }}
          placeholder={`Option ${i + 1}`}
          className="flex-1 text-sm bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 text-gray-700 dark:text-gray-300 placeholder-gray-300 transition-colors"
        />
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
            <button type="button" onClick={() => onRemoveOption(i)} disabled={(q.options || []).length <= 1} className="text-gray-300 hover:text-red-400 disabled:opacity-20 ml-1 transition-colors">
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
);

// The Registry
export const FieldRegistry = {
  short_text: {
    id: 'short_text',
    label: 'Short answer',
    icon: <Type size={16} />,
    BuilderComponent: () => <div className="w-1/2 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1 mt-2">Short answer text</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <input
        type="text"
        placeholder={q.placeholder || "Your answer"}
        className="w-full bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 outline-none focus:border-[var(--accent)] py-2 text-gray-800 dark:text-gray-100 transition-colors"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || q.is_read_only}
      />
    ),
  },
  long_text: {
    id: 'long_text',
    label: 'Paragraph',
    icon: <AlignLeft size={16} />,
    BuilderComponent: () => <div className="w-full h-16 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1 mt-2">Long answer text</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <textarea
        rows={3}
        placeholder={q.placeholder || "Your answer"}
        className="w-full bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 outline-none focus:border-[var(--accent)] py-2 text-gray-800 dark:text-gray-100 resize-y transition-colors"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || q.is_read_only}
      />
    ),
  },
  radio: {
    id: 'radio',
    label: 'Multiple choice',
    icon: <Circle size={16} />,
    BuilderComponent: OptionsBuilder,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <div className="space-y-2 py-1">
        {(q.options || []).map((opt, i) => {
          const optVal = typeof opt === 'string' ? opt : opt.id;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const isSelected = (value || [])[0] === optVal;
          return (
            <label key={i} onClick={() => !disabled && onChange([optVal])} className={`flex items-center gap-3 cursor-pointer group ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[var(--accent)]' : 'border-gray-300 dark:border-gray-600 group-hover:border-[var(--accent)]'}`}>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
              </div>
              <span className="text-gray-700 dark:text-gray-200">{optLabel}</span>
            </label>
          );
        })}
      </div>
    ),
  },
  checkbox: {
    id: 'checkbox',
    label: 'Checkboxes',
    icon: <CheckSquare size={16} />,
    BuilderComponent: OptionsBuilder,
    RendererComponent: ({ q, value = [], onChange, disabled }) => (
      <div className="space-y-2 py-1">
        {(q.options || []).map((opt, i) => {
          const optVal = typeof opt === 'string' ? opt : opt.id;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const isSelected = (value || []).includes(optVal);
          return (
            <label key={i} onClick={() => {
              if (disabled) return;
              const next = isSelected ? (value || []).filter(v => v !== optVal) : [...(value || []), optVal];
              onChange(next);
            }} className={`flex items-center gap-3 cursor-pointer group ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-gray-300 dark:border-gray-600 group-hover:border-[var(--accent)]'}`}>
                {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-gray-700 dark:text-gray-200">{optLabel}</span>
            </label>
          );
        })}
      </div>
    ),
  },
  grid_radio: {
    id: 'grid_radio',
    label: 'Multiple choice grid',
    icon: <LayoutGrid size={16} />,
    BuilderComponent: GridBuilder,
    RendererComponent: GridRenderer
  },
  grid_checkbox: {
    id: 'grid_checkbox',
    label: 'Checkbox grid',
    icon: <LayoutGrid size={16} />,
    BuilderComponent: GridBuilder,
    RendererComponent: GridRenderer
  },
  dropdown: {
    id: 'dropdown',
    label: 'Dropdown',
    icon: <ChevronDown size={16} />,
    BuilderComponent: OptionsBuilder,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <select
        value={(value || [])[0] || ''}
        onChange={e => onChange([e.target.value])}
        disabled={disabled || q.is_read_only}
        className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-[var(--accent)] text-gray-800 dark:text-gray-100 appearance-none transition-colors"
      >
        <option value="" disabled>Choose</option>
        {(q.options || []).map((opt, i) => {
          const optVal = typeof opt === 'string' ? opt : opt.id;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          return <option key={i} value={optVal}>{optLabel}</option>;
        })}
      </select>
    ),
  },
  email: {
    id: 'email',
    label: 'Email',
    icon: <Type size={16} />,
    BuilderComponent: () => <div className="w-1/2 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1 mt-2">example@email.com</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <input type="email" placeholder={q.placeholder || "Your email"} className="w-full bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 outline-none focus:border-[var(--accent)] py-2 text-gray-800 dark:text-gray-100 transition-colors" value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || q.is_read_only} />
    )
  },
  phone: {
    id: 'phone',
    label: 'Phone number',
    icon: <Type size={16} />,
    BuilderComponent: () => <div className="w-1/2 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1 mt-2">Phone number</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <input type="tel" placeholder={q.placeholder || "Your phone number"} className="w-full bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 outline-none focus:border-[var(--accent)] py-2 text-gray-800 dark:text-gray-100 transition-colors" value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || q.is_read_only} />
    )
  },
  number: {
    id: 'number',
    label: 'Number',
    icon: <Hash size={16} />,
    BuilderComponent: () => <div className="w-1/3 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1 mt-2">Number</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <input type="number" placeholder={q.placeholder || "0"} className="w-1/2 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 outline-none focus:border-[var(--accent)] py-2 text-gray-800 dark:text-gray-100 transition-colors" value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || q.is_read_only} />
    )
  },
  currency: {
    id: 'currency',
    label: 'Currency',
    icon: <Hash size={16} />,
    BuilderComponent: () => <div className="w-1/3 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1 mt-2">$ Amount</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <div className="relative w-1/2">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400">$</span>
        <input type="number" placeholder={q.placeholder || "0.00"} className="w-full bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 outline-none focus:border-[var(--accent)] py-2 pl-4 text-gray-800 dark:text-gray-100 transition-colors" value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || q.is_read_only} />
      </div>
    )
  },
  date: {
    id: 'date',
    label: 'Date',
    icon: <Calendar size={16} />,
    BuilderComponent: () => <div className="flex items-center gap-2 text-gray-400 text-sm mt-3"><Calendar size={16} /> Date</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <input type="date" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 outline-none focus:border-[var(--accent)] text-gray-800 dark:text-gray-100 transition-colors" value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || q.is_read_only} />
    )
  },
  time: {
    id: 'time',
    label: 'Time',
    icon: <Calendar size={16} />,
    BuilderComponent: () => <div className="flex items-center gap-2 text-gray-400 text-sm mt-3"><Calendar size={16} /> Time</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <input type="time" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 outline-none focus:border-[var(--accent)] text-gray-800 dark:text-gray-100 transition-colors" value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || q.is_read_only} />
    )
  },
  url: {
    id: 'url',
    label: 'Website URL',
    icon: <Type size={16} />,
    BuilderComponent: () => <div className="w-1/2 h-8 border-b-2 border-gray-200 dark:border-gray-600 text-xs text-gray-400 flex items-end pb-1 mt-2">https://...</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <input type="url" placeholder={q.placeholder || "https://"} className="w-full bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 outline-none focus:border-[var(--accent)] py-2 text-gray-800 dark:text-gray-100 transition-colors" value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || q.is_read_only} />
    )
  },
  file_upload: {
    id: 'file_upload',
    label: 'File upload',
    icon: <Upload size={16} />,
    BuilderComponent: () => (
      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center mt-2">
        <Upload size={20} className="mx-auto text-gray-300 mb-1" />
        <p className="text-xs text-gray-400">File upload</p>
      </div>
    ),
    RendererComponent: FileUploadField
  },
  rating: {
    id: 'rating',
    label: 'Rating',
    icon: <Star size={16} />,
    BuilderComponent: () => (
      <div className="flex gap-2 mt-4">
        {[1,2,3,4,5].map(i => <Star key={i} size={24} className="text-gray-200 dark:text-gray-600" />)}
      </div>
    ),
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <div className="flex gap-2">
        {[1,2,3,4,5].map(s => (
          <button key={s} type="button" onClick={() => !disabled && onChange(s.toString())} disabled={disabled} className={`transition-transform hover:scale-110 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <Star size={32} className={parseInt(value) >= s ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'} />
          </button>
        ))}
      </div>
    )
  },
  toggle: {
    id: 'toggle',
    label: 'Linear scale',
    icon: <ToggleRight size={16} />,
    BuilderComponent: () => (
      <div className="flex gap-4 mt-4 items-center text-sm text-gray-400">
        <span>1</span>
        {[2,3,4,5].map(i => <span key={i} className="text-gray-200 dark:text-gray-700">|</span>)}
        <span>5</span>
      </div>
    ),
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <div className="flex flex-col gap-2 w-full md:w-2/3">
        <div className="flex justify-between px-2 text-xs text-gray-500 font-medium">
          <span>{q.config?.min_label || 'Worst'}</span>
          <span>{q.config?.max_label || 'Best'}</span>
        </div>
        <div className="flex justify-between items-center gap-1">
          {[1,2,3,4,5].map(s => (
            <button key={s} type="button" onClick={() => !disabled && onChange(s.toString())} disabled={disabled} className={`flex-1 py-3 border rounded-lg transition-all ${value === s.toString() ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  },
  signature: {
    id: 'signature',
    label: 'Signature',
    icon: <PenTool size={16} />,
    BuilderComponent: () => <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg h-16 flex items-center justify-center text-xs text-gray-400 mt-2">Signature pad</div>,
    RendererComponent: ({ q, value, onChange, disabled }) => (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg h-24 flex items-center justify-center text-sm text-gray-400 bg-gray-50 dark:bg-gray-800">
        Signature Pad (Not Implemented)
      </div>
    )
  },
  // ── CEF-Specific Field Types ────────────────────────────────
  // These are only exposed via CEF_FIELD_REGISTRY when form_mode = 'candidate_evaluation'
  cef_rating: {
    id: 'cef_rating',
    label: 'Rating (Skill Matrix)',
    icon: <Star size={16} />,
    BuilderComponent: SkillMatrixBuilder,
    RendererComponent: SkillMatrixRenderer,
  },
  cef_code: {
    id: 'cef_code',
    label: 'Programming',
    icon: <Code2 size={16} />,
    BuilderComponent: MonacoBuilder,
    RendererComponent: MonacoRenderer,
  },
  cef_rtf: {
    id: 'cef_rtf',
    label: 'Rich Text (RTF)',
    icon: <FileText size={16} />,
    BuilderComponent: RichTextBuilder,
    RendererComponent: RichTextRenderer,
  },
};

export const getFieldConfig = (type) => FieldRegistry[type] || FieldRegistry.short_text;

// ── CEF Field Registry ─────────────────────────────────────────
// Exposed ONLY when form_mode = 'candidate_evaluation'
// The full FieldRegistry above is untouched for all other modules.
export const CEF_FIELD_REGISTRY = {
  cef_rating: FieldRegistry.cef_rating,
  radio: {
    ...FieldRegistry.radio,
    label: 'MCQ (Multiple Choice)',
  },
  checkbox: {
    ...FieldRegistry.checkbox,
    label: 'Knowledge (Checklist)',
  },
  short_text: {
    ...FieldRegistry.short_text,
    label: 'Text (Short Answer)',
  },
  long_text: {
    ...FieldRegistry.long_text,
    label: 'Text (Paragraph)',
  },
  number: FieldRegistry.number,
  cef_code: FieldRegistry.cef_code,
  cef_rtf: FieldRegistry.cef_rtf,
};

// Returns the right config for a type — CEF types OR standard types
export const getCEFFieldConfig = (type) => {
  return CEF_FIELD_REGISTRY[type] || FieldRegistry[type] || FieldRegistry.short_text;
};

// ── Section Type definitions (CEF) ────────────────────────────
export const CEF_SECTION_TYPES = [
  { id: 'rating',      label: 'Rating',           description: 'Skill Matrix — Nil / Noob / Mod / Adv / Ace', icon: <Star size={20} />,     color: '#f59e0b', allowedTypes: ['cef_rating']                                               },
  { id: 'mcq',         label: 'MCQ',              description: 'Multiple Choice Questions',                    icon: <Circle size={20} />,   color: '#4f46e5', allowedTypes: ['radio']                                                   },
  { id: 'knowledge',   label: 'Knowledge',        description: 'Knowledge Checklists',                         icon: <CheckSquare size={20}/>,color: '#059669', allowedTypes: ['checkbox']                                                 },
  { id: 'text',        label: 'Text',             description: 'Short or Long Answer Text',                   icon: <Type size={20} />,     color: '#0891b2', allowedTypes: ['short_text', 'long_text']                              },
  { id: 'number',      label: 'Number',           description: 'Numeric Input',                               icon: <Hash size={20} />,     color: '#7c3aed', allowedTypes: ['number']                                               },
  { id: 'programming', label: 'Programming',      description: 'Monaco Code Editor (VS Code)',                icon: <Code2 size={20} />,    color: '#0f766e', allowedTypes: ['cef_code']                                            },
  { id: 'rich_text',   label: 'Rich Text (RTF)',  description: 'Full Rich Text Editor',                       icon: <FileText size={20} />, color: '#be185d', allowedTypes: ['cef_rtf']                                              },
  { id: 'mixed',       label: 'Mixed',            description: 'Any question type in one section',            icon: <LayoutGrid size={20}/>,color: '#6b7280', allowedTypes: ['cef_rating','radio','checkbox','short_text','long_text','number','cef_code','cef_rtf'] },
];

export const getCEFSectionType = (id) => CEF_SECTION_TYPES.find(s => s.id === id) || CEF_SECTION_TYPES[CEF_SECTION_TYPES.length - 1];
