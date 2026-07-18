import React, { Suspense, lazy } from 'react';
import { Code2, ChevronDown } from 'lucide-react';

// Lazy-load Monaco Editor — only downloaded when a Programming question is rendered
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export const SUPPORTED_LANGUAGES = [
  { value: 'c',          label: 'C' },
  { value: 'cpp',        label: 'C++' },
  { value: 'csharp',     label: 'C#' },
  { value: 'java',       label: 'Java' },
  { value: 'python',     label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'go',         label: 'Go' },
  { value: 'rust',       label: 'Rust' },
  { value: 'php',        label: 'PHP' },
  { value: 'sql',        label: 'SQL' },
  { value: 'bash',       label: 'Bash' },
  { value: 'json',       label: 'JSON' },
  { value: 'xml',        label: 'XML' },
  { value: 'html',       label: 'HTML' },
  { value: 'css',        label: 'CSS' },
];

const MONACO_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  lineNumbers: 'on',
  wordWrap: 'on',
  automaticLayout: true,
  scrollBeyondLastLine: false,
  tabSize: 4,
  insertSpaces: true,
  bracketPairColorization: { enabled: true },
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoIndent: 'full',
  formatOnType: true,
  formatOnPaste: true,
  renderLineHighlight: 'all',
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  padding: { top: 12, bottom: 12 },
};

/* ─── Monaco Loading Fallback ────────────────────────────────── */
const MonacoLoadingFallback = () => (
  <div className="flex items-center justify-center h-48 bg-gray-50 border border-gray-200 rounded-b-lg">
    <div className="flex items-center gap-3 text-gray-500">
      <Code2 size={20} className="animate-pulse" />
      <span className="text-sm font-mono">Loading editor...</span>
    </div>
  </div>
);

/* ─── Builder Component ─────────────────────────────────────── */
export const MonacoBuilder = ({ q, isActive, onUpdate }) => {
  const language = q.config?.language || 'c';
  const placeholder = q.placeholder || '// Write your solution here...';

  return (
    <div className="mt-3 space-y-3">
      {/* Language Selector */}
      {isActive && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">
            Language
          </label>
          <div className="relative">
            <select
              value={language}
              onChange={e => onUpdate({ config: { ...q.config, language: e.target.value } })}
              className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer ml-3">
            <input 
              type="checkbox" 
              checked={q.config?.allow_language_selection || false}
              onChange={e => onUpdate({ config: { ...q.config, allow_language_selection: e.target.checked } })}
              className="accent-[#60839b]"
            />
            <span className="text-xs text-gray-600 font-medium tracking-wide">Candidate selects language</span>
          </label>

          {/* Default starter code */}
          <input
            type="text"
            value={placeholder}
            onChange={e => onUpdate({ placeholder: e.target.value })}
            placeholder="Starter code / instructions..."
            className="flex-1 text-xs bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 focus:border-[var(--accent)] outline-none pb-1 text-gray-500 dark:text-gray-400 placeholder-gray-300 transition-colors ml-3"
          />
        </div>
      )}

      {/* Editor Preview in Builder */}
      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-xs text-gray-600 dark:text-gray-400 font-mono">
            {SUPPORTED_LANGUAGES.find(l => l.value === language)?.label || 'Code'} • {language === 'cpp' ? 'solution.cpp' : language === 'python' ? 'solution.py' : language === 'java' ? 'Solution.java' : `solution.${language}`}
          </span>
        </div>
        <Suspense fallback={<MonacoLoadingFallback />}>
          <MonacoEditor
            height="200px"
            language={language}
            theme="light"
            value={q.starter_code || placeholder}
            onChange={val => onUpdate({ starter_code: val || '' })}
            options={{ ...MONACO_OPTIONS, readOnly: false }}
          />
        </Suspense>
      </div>

      {!isActive && (
        <p className="text-xs text-gray-400 italic">
          Click to configure language and starter code
        </p>
      )}
    </div>
  );
};

/* ─── Renderer Component ────────────────────────────────────── */
export const MonacoRenderer = ({ q, value, onChange, disabled }) => {
  const allowSelect = q.config?.allow_language_selection;
  const defaultLang = q.config?.language || 'c';
  const defaultCode = q.starter_code || q.placeholder || '';
  
  let currentLang = defaultLang;
  let code = defaultCode;

  try {
    if (value && value.trim().startsWith('{')) {
      const parsed = JSON.parse(value);
      if (parsed.language) currentLang = parsed.language;
      if (typeof parsed.code !== 'undefined') code = parsed.code;
    } else if (value) {
      code = value;
    }
  } catch (e) {
    if (value) code = value;
  }

  const handleLangChange = (e) => {
    if (disabled) return;
    onChange(JSON.stringify({ language: e.target.value, code }));
  };

  const handleCodeChange = (val) => {
    if (disabled) return;
    onChange(JSON.stringify({ language: currentLang, code: val || '' }));
  };

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        {allowSelect && !disabled ? (
          <div className="ml-3 relative">
            <select
              value={currentLang}
              onChange={handleLangChange}
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 pr-6 text-[11px] font-mono font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-[#60839b] transition-colors cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        ) : (
          <span className="ml-3 text-xs text-gray-600 dark:text-gray-400 font-mono">
            {SUPPORTED_LANGUAGES.find(l => l.value === currentLang)?.label || currentLang}
          </span>
        )}
        <span className="ml-auto text-[10px] text-gray-600 font-mono uppercase tracking-wider">
          {disabled ? 'Read-only' : 'Editor'}
        </span>
      </div>
      <Suspense fallback={<MonacoLoadingFallback />}>
        <MonacoEditor
          height="320px"
          language={currentLang}
          theme="light"
          value={code}
          onChange={handleCodeChange}
          options={{ ...MONACO_OPTIONS, readOnly: !!disabled }}
        />
      </Suspense>
    </div>
  );
};
