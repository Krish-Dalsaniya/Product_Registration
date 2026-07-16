import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, Send, Settings, BarChart2, HelpCircle, MoreVertical,
  Loader2, Globe, Lock, Copy, CheckCircle2, Trash2, ExternalLink,
  ChevronLeft, ChevronRight, Save, AlertCircle
} from 'lucide-react';
import { getFormSchema, updateDynamicForm, publishForm, getFormResponses, deleteForm } from '../../../api/cefApi';
import FormBuilder from '../components/FormBuilder';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/* ─── Utility: debounce ─────────────────────────────────────── */
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

/* ─── Responses Panel ───────────────────────────────────────── */
const ResponsesPanel = ({ form }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [currentIndex, setCurrentIndex] = useState(0);
  const isSurvey = form?.form_mode === 'survey';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getFormResponses(form.id);
        if (res.success) setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [form.id]);

  const allQuestions = React.useMemo(() => {
    if (!data?.responses) return [];
    const qMap = new Map();
    data.responses.forEach(r => {
      (r.answers || []).forEach(a => {
        if (!qMap.has(a.question_id))
          qMap.set(a.question_id, { id: a.question_id, label: a.question_label, type: a.question_type });
      });
    });
    return Array.from(qMap.values());
  }, [data]);

  const chartColors = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-16 text-[var(--text-muted)]">Failed to load responses.</div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stats Row */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="text-center px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
          <p className="text-3xl font-black text-[var(--accent)]">{data.total}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Responses</p>
        </div>
        {!isSurvey && (
          <>
            <div className="text-center px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
              <p className="text-3xl font-black text-green-500">{data.responses.filter(r => r.is_passed).length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Passed</p>
            </div>
            <div className="text-center px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
              <p className="text-3xl font-black text-orange-500">
                {data.total > 0 ? (data.responses.reduce((a, r) => a + (parseFloat(r.total_score) || 0), 0) / data.total).toFixed(1) : '—'}
              </p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Avg Score</p>
            </div>
          </>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {['summary', 'question', 'individual'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold capitalize transition-all border-b-2 -mb-px ${activeTab === tab ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            {tab === 'question' ? 'Question' : tab === 'individual' ? 'Individual' : 'Summary'}
          </button>
        ))}
      </div>

      {data.responses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
          <p className="text-lg font-bold text-gray-500">Waiting for responses</p>
          <p className="text-sm text-gray-400 mt-1">Share the form link to start collecting data.</p>
        </div>
      ) : (
        <>
          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              {allQuestions.map((q) => {
                const isText = ['short_answer', 'long_answer', 'email', 'number', 'date', 'short_text', 'long_text'].includes(q.type);
                const counts = {};
                const rawAnswers = [];
                data.responses.forEach(r => {
                  const ans = (r.answers || []).find(a => a.question_id === q.id);
                  if (ans) {
                    const val = ans.text_value || (ans.selected_options?.length ? ans.selected_options.map(o => o.label).join(', ') : 'Left blank');
                    counts[val] = (counts[val] || 0) + 1;
                    if (ans.text_value && isText) rawAnswers.push(ans.text_value);
                  }
                });
                return (
                  <div key={q.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                    <p className="font-bold text-gray-800 dark:text-gray-100 mb-1">{q.label}</p>
                    <p className="text-xs text-gray-400 mb-5 uppercase tracking-widest">{data.total} responses</p>
                    {isText ? (
                      <div className="space-y-2">
                        {rawAnswers.length === 0 ? <p className="text-sm text-gray-400 italic">No text responses.</p> : null}
                        {rawAnswers.map((val, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                            {val}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([val, count], i) => {
                          const pct = Math.round((count / data.total) * 100);
                          return (
                            <div key={i} className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{val}</span>
                                <span className="text-gray-400">{count} ({pct}%)</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: chartColors[i % chartColors.length] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* QUESTION TAB — Table */}
          {activeTab === 'question' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="p-4 font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700 min-w-[50px] text-center">#</th>
                      <th className="p-4 font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700 min-w-[220px]">Email</th>
                      <th className="p-4 font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700 min-w-[160px]">Submitted</th>
                      {!isSurvey && <th className="p-4 font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700 min-w-[90px]">Score</th>}
                      {allQuestions.map(q => (
                        <th key={q.id} className="p-4 font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700 min-w-[260px] truncate max-w-[300px]" title={q.label}>{q.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.responses.map((r, i) => (
                      <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="p-4 text-center text-xs font-black text-gray-400">{i + 1}</td>
                        <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{r.respondent_email || <span className="text-gray-400 italic">Anonymous</span>}</td>
                        <td className="p-4 text-gray-400 text-xs">{new Date(r.completed_at).toLocaleString()}</td>
                        {!isSurvey && <td className="p-4 font-bold text-[var(--accent)]">{r.total_score ?? '—'}</td>}
                        {allQuestions.map(q => {
                          const ans = (r.answers || []).find(a => a.question_id === q.id);
                          const val = ans ? (ans.text_value || (ans.selected_options?.length ? ans.selected_options.map(o => o.label).join(', ') : '')) : '';
                          return <td key={q.id} className="p-4 truncate max-w-[300px] text-gray-500 dark:text-gray-400" title={val}>{val || '—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INDIVIDUAL TAB */}
          {activeTab === 'individual' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(p => p - 1)}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors text-gray-600 dark:text-gray-300">
                  <ChevronLeft size={20} />
                </button>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  Response <span className="text-[var(--accent)]">{currentIndex + 1}</span>
                  <span className="text-gray-400 font-medium"> of {data.responses.length}</span>
                </div>
                <button disabled={currentIndex === data.responses.length - 1} onClick={() => setCurrentIndex(p => p + 1)}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors text-gray-600 dark:text-gray-300">
                  <ChevronRight size={20} />
                </button>
              </div>
              {(() => {
                const r = data.responses[currentIndex];
                return (
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-black text-sm">
                        {(r.respondent_email || 'A')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 dark:text-gray-100">{r.respondent_email || 'Anonymous'}</p>
                        <p className="text-xs text-gray-400">{new Date(r.completed_at).toLocaleString()}</p>
                      </div>
                      {!isSurvey && (
                        <div className={`ml-auto px-4 py-2 rounded-xl text-sm font-bold ${r.is_passed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {r.total_score ?? 0} pts · {r.is_passed ? 'Passed' : 'Failed'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-5">
                      {(r.answers || []).map((ans, i) => (
                        <div key={i} className="border-b border-gray-100 dark:border-gray-700 pb-5 last:border-0">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{ans.question_label}</p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {ans.text_value || (ans.selected_options?.length ? ans.selected_options.map(o => o.label).join(', ') : <span className="italic text-gray-400">No answer</span>)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Settings Panel ────────────────────────────────────────── */
const SettingsPanel = ({ form, onUpdate }) => {
  const isSurvey = form.form_mode === 'survey';
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Quiz Settings */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">Form Mode</h3>
        </div>
        <div className="p-6 space-y-4">
          <button
            onClick={() => onUpdate({ form_mode: 'assessment' })}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${!isSurvey ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${!isSurvey ? 'border-[var(--accent)]' : 'border-gray-300'}`}>
              {!isSurvey && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
            </div>
            <div>
              <p className="font-bold text-gray-800 dark:text-gray-100">Assessment (Quiz)</p>
              <p className="text-sm text-gray-500 mt-0.5">Questions can have correct answers and points. Scores are calculated automatically.</p>
            </div>
          </button>
          <button
            onClick={() => onUpdate({ form_mode: 'survey' })}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${isSurvey ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSurvey ? 'border-[var(--accent)]' : 'border-gray-300'}`}>
              {isSurvey && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
            </div>
            <div>
              <p className="font-bold text-gray-800 dark:text-gray-100">Survey / Data Collection</p>
              <p className="text-sm text-gray-500 mt-0.5">Collect information without scoring. No pass/fail. Great for interest forms, feedback, and registration.</p>
            </div>
          </button>
        </div>
      </div>

      {/* Responses Settings */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">Responses</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Accepting responses</p>
              <p className="text-sm text-gray-400">When disabled, the form will show a message to respondents</p>
            </div>
            <div
              className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${form.is_public ? 'bg-[var(--accent)]' : 'bg-gray-300 dark:bg-gray-600'}`}
              onClick={() => onUpdate({ is_public: !form.is_public, publish: true })}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-transform ${form.is_public ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Send/Share Modal ──────────────────────────────────────── */
const SendModal = ({ form, onClose }) => {
  const [copied, setCopied] = useState(false);
  const publicLink = form.public_url ? `${window.location.origin}/forms/${form.public_url}` : null;

  const copy = () => {
    if (!publicLink) return;

    // First attempt modern Clipboard API (requires HTTPS/localhost)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(publicLink)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('Clipboard copy failed:', err));
    } else {
      // Enterprise Fallback for HTTP Testing environments (execCommand)
      const textArea = document.createElement('textarea');
      textArea.value = publicLink;
      
      // Prevent scrolling to bottom of page in some browsers
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          console.error('Fallback copy command returned false');
        }
      } catch (err) {
        console.error('Fallback copy error:', err);
      }
      
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100">Send form</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {!form.is_public ? (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">Form not published</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Go to Settings → Responses and toggle "Accepting responses" ON to publish this form.</p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Shareable Link</label>
                <div className="flex gap-2">
                  <input readOnly value={publicLink || ''} className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none" />
                  <button onClick={copy} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-[var(--accent)] text-white hover:opacity-90'}`}>
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <a href={publicLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline">
                <ExternalLink size={16} /> Open form in new tab
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Form Editor Page ─────────────────────────────────── */
const FormEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [schema, setSchema] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('questions');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'
  const [showSend, setShowSend] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreRef = useRef(null);

  // Close more menu on outside click
  useEffect(() => {
    const handler = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMoreMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load form
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getFormSchema(id);
        if (res.success) {
          setForm(res.data);
          setSchema(res.data.form_schema || []);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(null);

  // Auto-save function
  const doSave = useCallback(async (newSchema, overrides = {}) => {
    if (!form) return;
    if (isSavingRef.current) {
      pendingSaveRef.current = { newSchema, overrides };
      return;
    }
    
    isSavingRef.current = true;
    setSaveStatus('saving');
    try {
      await updateDynamicForm(id, {
        label: form.title,
        form_mode: form.form_mode || 'assessment',
        form_schema: newSchema,
        ...overrides,
      });
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      console.error(e);
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        const nextSave = pendingSaveRef.current;
        pendingSaveRef.current = null;
        doSave(nextSave.newSchema, nextSave.overrides);
      }
    }
  }, [form, id]);

  const debouncedSave = useDebounce(doSave, 1200);

  const handleSchemaChange = (newSchema) => {
    setSchema(newSchema);
    setSaveStatus('saving');
    debouncedSave(newSchema);
  };

  const handleSettingsUpdate = async (changes) => {
    const updated = { ...form, ...changes };
    setForm(updated);

    if (changes.publish !== undefined || changes.is_public !== undefined) {
      // Publish toggle — call the publish endpoint
      setSaveStatus('saving');
      try {
        await publishForm(id, changes.is_public);
        setSaveStatus('saved');
        // Refresh form to get new public_url
        const res = await getFormSchema(id);
        if (res.success) setForm(res.data);
      } catch (e) { setSaveStatus('error'); }
    } else {
      setSaveStatus('saving');
      try {
        await updateDynamicForm(id, {
          label: updated.title,
          form_mode: updated.form_mode,
        });
        setSaveStatus('saved');
      } catch (e) { setSaveStatus('error'); }
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setForm(prev => ({ ...prev, title: newTitle }));
    setSaveStatus('saving');
    debouncedSave(schema, { label: newTitle });
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete this form?',
      text: 'All responses will also be deleted. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (result.isConfirmed) {
      try {
        await deleteForm(id);
        navigate('/hr/recruitment/cef');
      } catch (e) {
        Swal.fire('Error', 'Failed to delete form.', 'error');
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#f0ebfb]">
      <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
    </div>
  );

  if (!form) return (
    <div className="flex items-center justify-center h-screen bg-[#f0ebfb]">
      <p className="text-gray-500 font-medium">Form not found.</p>
    </div>
  );

  const tabs = [
    { id: 'questions', label: 'Questions', icon: <HelpCircle size={16} /> },
    { id: 'responses', label: 'Responses', icon: <BarChart2 size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f0ebfb] dark:bg-[#1a1625] flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left — Back + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate('/hr/recruitment/cef')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                <HelpCircle size={16} className="text-white" />
              </div>
              <input
                type="text"
                value={form.title || ''}
                onChange={handleTitleChange}
                className="text-base font-bold text-gray-800 dark:text-gray-100 bg-transparent border-0 border-b-2 border-transparent focus:border-[var(--accent)] outline-none py-0.5 min-w-0 w-full max-w-xs transition-colors"
                placeholder="Untitled Form"
              />
            </div>
          </div>

          {/* Center — Tabs */}
          <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Right — Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Auto-save status */}
            <div className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${saveStatus === 'saving' ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : saveStatus === 'error' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-green-600 bg-green-50 dark:bg-green-900/20'}`}>
              {saveStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> : saveStatus === 'error' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
              <span className="hidden sm:inline">{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Error' : 'Saved'}</span>
            </div>

            {/* Preview */}
            <button
              onClick={() => { if (form.is_public && form.public_url) window.open(`/forms/${form.public_url}`, '_blank'); else Swal.fire('Not Published', 'Publish the form first to preview it.', 'info'); }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              title="Preview"
            >
              <Eye size={18} />
            </button>

            {/* Send */}
            <button
              onClick={() => setShowSend(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Send size={15} />
              <span className="hidden sm:inline">Send</span>
            </button>

            {/* More */}
            <div className="relative" ref={moreRef}>
              <button onClick={() => setShowMoreMenu(v => !v)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                <MoreVertical size={18} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  <button onClick={() => { setShowMoreMenu(false); handleDelete(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={15} /> Delete form
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Content ── */}
      <main className="flex-1 overflow-y-auto py-8 px-4">
        {activeTab === 'questions' && (
          <FormBuilder
            schema={schema}
            onChange={handleSchemaChange}
            formMode={form.form_mode || 'assessment'}
          />
        )}
        {activeTab === 'responses' && <ResponsesPanel form={form} />}
        {activeTab === 'settings' && <SettingsPanel form={form} onUpdate={handleSettingsUpdate} />}
      </main>

      {/* ── Send Modal ── */}
      {showSend && <SendModal form={form} onClose={() => setShowSend(false)} />}
    </div>
  );
};

export default FormEditorPage;
