import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

/* ─── Toolbar Configuration ─────────────────────────────────── */
const TOOLBAR_FULL = [
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  [{ 'font': [] }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'script': 'sub' }, { 'script': 'super' }],
  [{ 'align': [] }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  ['clean'],
];

const TOOLBAR_COMPACT = [
  ['bold', 'italic', 'underline'],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  ['link', 'blockquote', 'code-block'],
  ['clean'],
];

const QUILL_MODULES_FULL = { toolbar: TOOLBAR_FULL };
const QUILL_MODULES_COMPACT = { toolbar: TOOLBAR_COMPACT };
const QUILL_FORMATS = [
  'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'script', 'align', 'list', 'indent',
  'blockquote', 'code-block', 'link', 'image',
];

/* ─── Shared CSS override — injected once ───────────────────── */
let styleInjected = false;
function injectQuillStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .cef-quill-wrapper .ql-toolbar.ql-snow {
      border-color: var(--ql-border, #e5e7eb);
      border-radius: 0.75rem 0.75rem 0 0;
      background: #f9fafb;
      padding: 8px 12px;
      flex-wrap: wrap;
    }
    .dark .cef-quill-wrapper .ql-toolbar.ql-snow {
      border-color: #374151;
      background: #1f2937;
    }
    .cef-quill-wrapper .ql-container.ql-snow {
      border-color: var(--ql-border, #e5e7eb);
      border-radius: 0 0 0.75rem 0.75rem;
      font-family: inherit;
      font-size: 14px;
      min-height: 120px;
    }
    .dark .cef-quill-wrapper .ql-container.ql-snow {
      border-color: #374151;
      color: #e5e7eb;
      background: #111827;
    }
    .cef-quill-wrapper .ql-editor {
      min-height: 120px;
      color: inherit;
    }
    .dark .cef-quill-wrapper .ql-toolbar .ql-stroke { stroke: #9ca3af; }
    .dark .cef-quill-wrapper .ql-toolbar .ql-fill  { fill: #9ca3af; }
    .dark .cef-quill-wrapper .ql-toolbar .ql-picker { color: #9ca3af; }
    .dark .cef-quill-wrapper .ql-toolbar .ql-picker-options { background: #1f2937; border-color: #374151; }
    .cef-quill-wrapper .ql-editor.ql-blank::before {
      color: #9ca3af;
      font-style: italic;
    }
    /* Focus ring */
    .cef-quill-wrapper:focus-within .ql-toolbar.ql-snow,
    .cef-quill-wrapper:focus-within .ql-container.ql-snow {
      border-color: var(--accent, #4f46e5);
    }
  `;
  document.head.appendChild(style);
}

/* ─── Builder Component ─────────────────────────────────────── */
export const RichTextBuilder = ({ q, isActive }) => {
  useEffect(() => { injectQuillStyles(); }, []);

  return (
    <div className="mt-3">
      <div className="cef-quill-wrapper rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 opacity-50 pointer-events-none select-none">
        <div className="ql-toolbar ql-snow" style={{ borderRadius: '0.75rem 0.75rem 0 0', background: '#f9fafb', padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <span className="text-xs text-gray-400 font-medium">B  I  U  ≡  ○  " "  &lt;&gt;</span>
        </div>
        <div className="bg-white dark:bg-gray-900 h-20 px-4 py-3 text-sm text-gray-300 dark:text-gray-600 italic" style={{ borderRadius: '0 0 0.75rem 0.75rem' }}>
          {q.placeholder || 'Rich text answer area...'}
        </div>
      </div>
      {isActive && (
        <div className="mt-2">
          <input
            type="text"
            value={q.placeholder || ''}
            onChange={e => {}}
            placeholder="Placeholder text..."
            className="w-full text-xs bg-transparent border-0 border-b border-gray-100 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 text-gray-400 placeholder-gray-300 transition-colors"
          />
        </div>
      )}
    </div>
  );
};

/* ─── Renderer Component ────────────────────────────────────── */
export const RichTextRenderer = ({ q, value, onChange, disabled }) => {
  useEffect(() => { injectQuillStyles(); }, []);

  if (disabled && value) {
    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  if (disabled) {
    return (
      <div className="h-12 border-b-2 border-gray-200 dark:border-gray-700 text-xs text-gray-400 flex items-end pb-2 mt-2 italic">
        {q.placeholder || 'Rich text answer...'}
      </div>
    );
  }

  return (
    <div className="cef-quill-wrapper mt-2 rounded-xl overflow-hidden">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={val => onChange(val)}
        modules={QUILL_MODULES_FULL}
        formats={QUILL_FORMATS}
        placeholder={q.placeholder || 'Write your answer here...'}
        readOnly={false}
      />
    </div>
  );
};
