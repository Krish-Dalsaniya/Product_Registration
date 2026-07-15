import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Upload, Save, Pencil, Trash2, Download, Eye,
  Share2, Copy, BarChart2, CheckCircle, Globe, Lock, ExternalLink,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2, X, Users
} from 'lucide-react';
import Modal from '../../../components/shared/Modal';
import { getForms, uploadForm, updateForm, deleteForm, createDynamicForm, updateDynamicForm, getFormSchema, publishForm, getFormResponses } from '../../../api/cefApi';
import FormBuilder from '../components/FormBuilder';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const formCategories = [
  { id: 'caf',        title: 'Candidate Application Form (CAF)' },
  { id: 'aptitude',   title: 'Aptitude Test' },
  { id: 'knowledge',  title: 'Knowledge Form' },
  { id: 'skill',      title: 'Skill Form' },
  { id: 'trait',      title: 'Trait Form' },
  { id: 'motive',     title: 'Motive Form' },
  { id: 'self_image', title: 'Self Image Form' }
];

/* ─── Response Viewer ─────────────────────────────────────── */
const ResponsesModal = ({ form, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'table', 'individual'
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // Extract all unique questions from all responses to build table columns
  const allQuestions = React.useMemo(() => {
    if (!data || !data.responses) return [];
    const qMap = new Map();
    data.responses.forEach(r => {
      (r.answers || []).forEach(a => {
        if (!qMap.has(a.question_id)) {
          qMap.set(a.question_id, { id: a.question_id, label: a.question_label, type: a.question_type });
        }
      });
    });
    return Array.from(qMap.values());
  }, [data]);

  const chartColors = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

  return (
    <Modal isOpen onClose={onClose} title={`Responses — ${form.label}`} maxWidth="max-w-6xl">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
        </div>
      ) : !data ? (
        <div className="text-center py-16 text-[var(--text-muted)]">Failed to load responses.</div>
      ) : (
        <div className="flex flex-col h-[75vh]">
          {/* Header Stats & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--border-color)] shrink-0">
            <div className="flex gap-4">
              <div className="text-center px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl">
                <p className="text-2xl font-black text-[var(--text-main)]">{data.total}</p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Responses</p>
              </div>
              <div className="text-center px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl">
                <p className="text-2xl font-black text-[var(--text-main)]">{data.responses.filter(r => r.is_passed).length}</p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Passed</p>
              </div>
              <div className="text-center px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl">
                <p className="text-2xl font-black text-[var(--text-main)]">
                  {data.total > 0 ? (data.responses.reduce((a,r) => a + (parseFloat(r.total_score)||0), 0) / data.total).toFixed(1) : '—'}
                </p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Avg Score</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-[var(--bg-workspace)] rounded-lg border border-[var(--border-color)] self-start md:self-auto">
              {['summary', 'table', 'individual'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                    activeTab === tab ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            {data.responses.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)]/30">
                <BarChart2 size={40} className="text-[var(--border-color)] mb-4" />
                <p className="font-bold text-[var(--text-main)] text-lg">Waiting for responses</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Share the public link to start collecting data.</p>
              </div>
            ) : (
              <>
                {/* SUMMARY TAB */}
                {activeTab === 'summary' && (
                  <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-8">
                    {allQuestions.map((q, qIndex) => {
                      const isTextType = ['short_answer', 'long_answer', 'email', 'number', 'date'].includes(q.type);
                      
                      // Count occurrences of each answer for this question
                      const counts = {};
                      const rawAnswers = [];
                      data.responses.forEach(r => {
                        const ans = (r.answers || []).find(a => a.question_id === q.id);
                        if (ans) {
                          const val = ans.text_value || (ans.selected_options?.length ? ans.selected_options.map(o => o.label).join(', ') : 'Left blank');
                          counts[val] = (counts[val] || 0) + 1;
                          if (ans.text_value && isTextType) rawAnswers.push({ val, date: r.completed_at });
                        }
                      });
                      
                      return (
                        <div key={q.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm">
                          <p className="text-[15px] font-bold text-[var(--text-main)] mb-1">{q.label}</p>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-5">{data.total} responses</p>
                          
                          {isTextType ? (
                            <div className="space-y-2">
                              {rawAnswers.length === 0 ? <p className="text-sm text-[var(--text-muted)] italic">No responses.</p> : null}
                              {rawAnswers.map((item, idx) => (
                                <div key={idx} className="bg-[var(--bg-workspace)] px-4 py-3 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-main)]">
                                  {item.val}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {Object.entries(counts).sort((a,b) => b[1] - a[1]).map(([val, count], idx) => {
                                const pct = Math.round((count / data.total) * 100);
                                const color = chartColors[idx % chartColors.length];
                                return (
                                  <div key={idx} className="flex flex-col gap-1">
                                    <div className="flex justify-between items-end text-sm">
                                      <span className="font-medium text-[var(--text-main)]">{val}</span>
                                      <span className="font-bold text-[var(--text-muted)]">{count} ({pct}%)</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-[var(--bg-workspace)] rounded-full overflow-hidden">
                                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
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

                {/* TABLE TAB */}
                {activeTab === 'table' && (
                  <div className="h-full overflow-auto custom-scrollbar bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                      <thead className="bg-[var(--bg-workspace)] sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="p-3 font-bold text-[var(--text-muted)] border-b border-r border-[var(--border-color)] min-w-[50px] text-center">#</th>
                          <th className="p-3 font-bold text-[var(--text-muted)] border-b border-r border-[var(--border-color)] min-w-[200px]">Email</th>
                          <th className="p-3 font-bold text-[var(--text-muted)] border-b border-r border-[var(--border-color)] min-w-[150px]">Date</th>
                          <th className="p-3 font-bold text-[var(--text-muted)] border-b border-r border-[var(--border-color)] min-w-[80px]">Score</th>
                          {allQuestions.map(q => (
                            <th key={q.id} className="p-3 font-bold text-[var(--text-muted)] border-b border-r border-[var(--border-color)] min-w-[250px] truncate max-w-[300px]" title={q.label}>
                              {q.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.responses.map((r, i) => (
                          <tr key={r.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-workspace)]/50 transition-colors">
                            <td className="p-3 border-r border-[var(--border-color)] text-center text-xs font-black text-[var(--text-muted)]">{i + 1}</td>
                            <td className="p-3 border-r border-[var(--border-color)] font-medium text-[var(--text-main)]">{r.respondent_email || 'Anonymous'}</td>
                            <td className="p-3 border-r border-[var(--border-color)] text-[var(--text-muted)] text-xs">{new Date(r.completed_at).toLocaleString()}</td>
                            <td className="p-3 border-r border-[var(--border-color)] font-bold">{r.total_score ?? '—'}</td>
                            {allQuestions.map(q => {
                              const ans = (r.answers || []).find(a => a.question_id === q.id);
                              const val = ans ? (ans.text_value || (ans.selected_options?.length ? ans.selected_options.map(o => o.label).join(', ') : '')) : '';
                              return (
                                <td key={q.id} className="p-3 border-r border-[var(--border-color)] truncate max-w-[300px] text-[var(--text-dim)]" title={val}>
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* INDIVIDUAL TAB */}
                {activeTab === 'individual' && (
                  <div className="h-full flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                    {/* Individual Navigator */}
                    <div className="flex items-center justify-between p-3 bg-[var(--bg-workspace)] border-b border-[var(--border-color)]">
                      <button 
                        disabled={currentIndex === 0} 
                        onClick={() => setCurrentIndex(p => p - 1)}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors text-[var(--text-main)]"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button 
                        onClick={() => {
                          if (!form.is_public) {
                            Swal.fire({
                              icon: 'warning',
                              title: 'Form Not Published',
                              text: 'You must publish this form using the Share button before it can be viewed!',
                            });
                          } else {
                            window.open(`/forms/${form.public_url}`, '_blank');
                          }
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-md transition-colors" 
                        title={form.is_public ? "View Public Form" : "Must publish to view"}
                      >
                        <ExternalLink size={16} />
                      </button>
                      <div className="text-sm font-bold text-[var(--text-main)]">
                        Response {currentIndex + 1} <span className="text-[var(--text-muted)] font-medium">of {data.responses.length}</span>
                      </div>
                      <button 
                        disabled={currentIndex === data.responses.length - 1} 
                        onClick={() => setCurrentIndex(p => p + 1)}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors text-[var(--text-main)]"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                    {/* Individual Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <div className="pb-4 border-b border-[var(--border-color)] flex justify-between items-end">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Respondent</p>
                          <p className="text-lg font-bold text-[var(--text-main)]">{data.responses[currentIndex].respondent_email || 'Anonymous'}</p>
                          <p className="text-xs text-[var(--text-dim)] mt-1">Submitted: {new Date(data.responses[currentIndex].completed_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black text-[var(--accent)]">{data.responses[currentIndex].total_score ?? '—'}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Total Score</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {(data.responses[currentIndex].answers || []).length === 0 ? (
                          <p className="text-[var(--text-muted)] italic">No answers provided.</p>
                        ) : (
                          data.responses[currentIndex].answers.map((ans, idx) => (
                            <div key={idx} className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                              <p className="text-sm font-bold text-[var(--text-main)] mb-2">{ans.question_label}</p>
                              <div className="text-sm text-[var(--text-dim)] bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]">
                                {ans.text_value || (ans.selected_options?.length ? ans.selected_options.map(o => o.label).join(', ') : <span className="italic">Left blank</span>)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ─── Publish Modal ──────────────────────────────────────── */
const PublishModal = ({ form, onClose, onPublished }) => {
  const [isPublic, setIsPublic] = useState(form.is_public || false);
  const [saving, setSaving] = useState(false);
  const publicLink = `${window.location.origin}/forms/${form.public_url}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await publishForm(form.id, isPublic);
      onPublished({ ...form, is_public: isPublic, status: isPublic ? 'Published' : 'Draft' });
      Swal.fire({ title: isPublic ? 'Form Published!' : 'Form set to Draft', icon: 'success', timer: 1800, showConfirmButton: false });
      onClose();
    } catch (e) {
      Swal.fire('Error', 'Failed to update form status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(publicLink);
    Swal.fire({ title: 'Copied!', icon: 'success', timer: 1500, showConfirmButton: false });
  };

  return (
    <Modal isOpen onClose={onClose} title="Share & Publish Form" maxWidth="max-w-lg">
      <div className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between p-5 bg-[var(--bg-workspace)] rounded-xl border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPublic ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
              {isPublic ? <Globe size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-main)]">{isPublic ? 'Public — Accepting responses' : 'Draft — Not accepting responses'}</p>
              <p className="text-xs text-[var(--text-muted)]">{isPublic ? 'Anyone with the link can fill this form.' : 'Only you can see this form.'}</p>
            </div>
          </div>
          <div
            className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${isPublic ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            onClick={() => setIsPublic(p => !p)}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Public Link */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Public Link</label>
          <div className="flex items-center gap-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-3">
            <input type="text" readOnly value={publicLink} className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-[var(--text-main)] truncate" />
            <button type="button" onClick={copy} className="p-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors" title="Copy link">
              <Copy size={15} />
            </button>
            <button 
              type="button" 
              onClick={() => {
                if (!form.is_public) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'Not Published Yet',
                    text: 'You must turn on "Public" and click "Save Changes" before the link will work.',
                  });
                } else {
                  window.open(publicLink, '_blank');
                }
              }}
              className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-dim)] rounded-lg hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors" 
              title="Preview form"
            >
              <ExternalLink size={15} />
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">The link is always unique. Only works when the form is set to Public.</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors uppercase tracking-widest">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* ─── Form Card ──────────────────────────────────────────── */
const FormCard = ({ form, categoryId, onEdit, onDelete, onShare, onResponses, onView }) => {
  const isEnterprise = isNaN(form.id);
  return (
    <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-md transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[var(--accent)]/10 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex justify-between items-start mb-3">
        <div className="p-2.5 rounded-xl bg-[var(--bg-workspace)] text-[var(--accent)] shadow-sm relative">
          <FileText size={22} strokeWidth={2.5} />
          {isEnterprise && form.is_public && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--bg-card)]" title="Published" />
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-workspace)] border border-[var(--border-color)] px-2 py-0.5 rounded-md shadow-sm">
            {form.date}
          </span>
          {form.type === 'dynamic' && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${form.is_public ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' : 'text-[var(--accent)] bg-[var(--accent)]/10'}`}>
              {form.is_public ? 'Published' : 'Digital · Draft'}
            </span>
          )}

          {/* Action buttons — visible on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 translate-y-1 group-hover:translate-y-0 mt-1">
            <button onClick={() => onView(form)} className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all" title="Preview"><Eye size={12} strokeWidth={3} /></button>
            {!isEnterprise && (
              <a href={`${API_URL}/hr/cef-forms/download/${form.id}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all" title="Download">
                <Download size={12} strokeWidth={3} />
              </a>
            )}
            <button onClick={() => onEdit(categoryId, form)} className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all" title="Edit"><Pencil size={12} strokeWidth={3} /></button>
            {isEnterprise && (
              <>
                <button onClick={() => onShare(form)} className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-green-400 hover:text-green-500 text-[var(--text-dim)] shadow-sm transition-all" title="Publish & Share"><Share2 size={12} strokeWidth={3} /></button>
                <button onClick={() => onResponses(form)} className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-indigo-400 hover:text-indigo-500 text-[var(--text-dim)] shadow-sm transition-all" title="View Responses"><BarChart2 size={12} strokeWidth={3} /></button>
              </>
            )}
            <button onClick={() => onDelete(categoryId, form.id)} className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-red-400 hover:text-red-500 text-[var(--text-dim)] shadow-sm transition-all" title="Delete"><Trash2 size={12} strokeWidth={3} /></button>
          </div>
        </div>
      </div>

      <h4 className="text-[14px] font-black text-[var(--text-main)] mb-1.5 line-clamp-1 pr-8" title={form.label}>{form.label}</h4>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <p className="text-[11px] font-medium text-[var(--text-muted)] line-clamp-1 flex-1">{form.fileName}</p>
      </div>
      <p className="text-[10px] font-bold text-[var(--text-dim)] ml-3.5 uppercase tracking-wider">{form.fileSize}</p>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────── */
const CandidateEvaluationFormPage = () => {
  const [forms, setForms] = useState({ caf: [], aptitude: [], knowledge: [], skill: [], trait: [], motive: [], self_image: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('caf');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [creationMode, setCreationMode] = useState('file');
  const [dynamicSchema, setDynamicSchema] = useState([]);
  const [newForm, setNewForm] = useState({ label: '', file: null });

  const [viewingForm, setViewingForm] = useState(null);
  const [sharingForm, setSharingForm] = useState(null);
  const [responsesForm, setResponsesForm] = useState(null);

  useEffect(() => { fetchForms(); }, []);

  const fetchForms = async () => {
    try {
      setIsLoading(true);
      const res = await getForms();
      if (res.success) setForms(res.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleOpenModal = async (categoryId, form = null) => {
    setActiveCategory(categoryId);
    if (form) {
      setEditingFormId(form.id);
      setNewForm({ label: form.label, file: null });
      setCreationMode(form.type === 'dynamic' ? 'dynamic' : 'file');
      let schema = [];
      if (form.type === 'dynamic') {
        const isUUID = isNaN(form.id);
        if (isUUID) {
          try { const r = await getFormSchema(form.id); if (r.success) schema = r.data.form_schema; } catch (e) { console.error(e); }
        } else {
          schema = typeof form.form_schema === 'string' ? JSON.parse(form.form_schema) : (form.form_schema || []);
        }
      }
      setDynamicSchema(schema);
    } else {
      setEditingFormId(null);
      setNewForm({ label: '', file: null });
      setCreationMode('dynamic'); // Default to digital form builder
      setDynamicSchema([]);
    }
    setIsModalOpen(true);
  };

  const handleViewForm = async (form) => {
    if (form.type === 'dynamic' && isNaN(form.id)) {
      try { const r = await getFormSchema(form.id); if (r.success) setViewingForm({ ...form, form_schema: r.data.form_schema }); }
      catch (e) { console.error(e); }
    } else {
      setViewingForm(form);
    }
  };

  const handleCloseModal = () => { setIsModalOpen(false); setActiveCategory(null); setEditingFormId(null); };

  const handleDeleteForm = async (categoryId, formId) => {
    const result = await Swal.fire({ title: 'Delete this form?', text: "This cannot be undone.", icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--accent)', cancelButtonColor: '#d33', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try {
        const res = await deleteForm(formId);
        if (res.success) { fetchForms(); Swal.fire('Deleted!', 'The form has been deleted.', 'success'); }
      } catch (e) { Swal.fire('Error!', 'Failed to delete form.', 'error'); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newForm.label) return;
    if (creationMode === 'file' && !editingFormId && !newForm.file) return;
    if (creationMode === 'dynamic' && dynamicSchema.length === 0) {
      Swal.fire('Warning', 'Please add at least one question to your form.', 'warning'); return;
    }
    try {
      setIsSubmitting(true);
      if (creationMode === 'dynamic') {
        const payload = { label: newForm.label, category: activeCategory, type: 'dynamic', form_schema: dynamicSchema };
        if (editingFormId) await updateDynamicForm(editingFormId, payload);
        else await createDynamicForm(payload);
      } else {
        const formData = new FormData();
        formData.append('label', newForm.label);
        if (newForm.file) formData.append('file', newForm.file);
        if (editingFormId) await updateForm(editingFormId, formData);
        else { formData.append('category', activeCategory); await uploadForm(formData); }
      }
      await fetchForms();
      handleCloseModal();
      Swal.fire('Success', 'Form saved successfully', 'success');
    } catch (e) {
      Swal.fire('Error!', 'Failed to save form.', 'error');
    } finally { setIsSubmitting(false); }
  };

  const handlePublished = (updatedForm) => {
    // Refresh forms list
    fetchForms();
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <FileText size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mb-2">Candidate Evaluation Forms</h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] opacity-70">Manage evaluation forms and digital assessments</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex px-1 gap-2 md:gap-3 overflow-x-auto custom-scrollbar border-b border-[var(--border-color)] pb-3 mb-4 shrink-0">
        {formCategories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedTab(cat.id)}
            className={`px-4 py-2 text-[12px] font-bold transition-all rounded-lg whitespace-nowrap ${selectedTab === cat.id ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'}`}>
            {cat.title}
          </button>
        ))}
      </div>

      {/* Category Panel */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {formCategories.map(cat => {
          if (selectedTab !== cat.id) return null;
          const catForms = forms[cat.id] || [];
          return (
            <div key={cat.id} className="animate-in fade-in zoom-in-95 duration-300">
              <div className="p-3 md:p-4 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black text-[var(--text-main)]">{cat.title}</h3>
                  <span className="px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold rounded-full">{catForms.length} Forms</span>
                </div>
                <button onClick={() => handleOpenModal(cat.id)} className="btn-primary py-2 px-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
                  <Plus size={14} /> Add New Form
                </button>
              </div>

              <div className="p-3 md:p-4">
                {isLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" /></div>
                ) : catForms.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {catForms.map(form => (
                      <FormCard
                        key={form.id}
                        form={form}
                        categoryId={cat.id}
                        onEdit={handleOpenModal}
                        onDelete={handleDeleteForm}
                        onView={handleViewForm}
                        onShare={f => setSharingForm(f)}
                        onResponses={f => setResponsesForm(f)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)]/30 mx-2 mb-2">
                    <FileText size={32} className="text-[var(--border-color)] mb-3" />
                    <p className="text-sm font-bold text-[var(--text-main)] mb-1">No forms added yet</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Click 'Add New Form' to create a digital form or upload a document.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create / Edit Form Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFormId ? 'Edit Form' : `New ${formCategories.find(c => c.id === activeCategory)?.title || 'Form'}`}
        maxWidth={creationMode === 'dynamic' ? 'max-w-4xl' : 'max-w-md'}
      >
        {/* Mode toggle */}
        <div className="mb-5 flex p-1 bg-[var(--bg-workspace)] rounded-xl border border-[var(--border-color)]">
          {['dynamic', 'file'].map(mode => (
            <button key={mode} type="button" onClick={() => setCreationMode(mode)}
              disabled={!!(editingFormId && creationMode !== mode)}
              className={`flex-1 py-2 text-[12px] font-bold transition-all rounded-lg ${creationMode === mode ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-50'}`}>
              {mode === 'dynamic' ? '⚡ Digital Form Builder' : '📄 Upload Document'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form name */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Form Name *</label>
            <input type="text" required value={newForm.label} onChange={e => setNewForm({ ...newForm, label: e.target.value })}
              placeholder="e.g. Aptitude Test v2 — Q4 2026"
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors" />
          </div>

          {creationMode === 'dynamic' ? (
            <div className="border border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)]/30 max-h-[60vh] overflow-y-auto custom-scrollbar p-4">
              <FormBuilder schema={dynamicSchema} onChange={setDynamicSchema} />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">{editingFormId ? 'Replace File (Optional)' : 'Upload File *'}</label>
              <label className="relative block border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 hover:border-[var(--accent)] transition-colors bg-[var(--bg-workspace)]/50 group cursor-pointer text-center">
                <input type="file" required={!editingFormId} onChange={e => e.target.files?.[0] && setNewForm({ ...newForm, file: e.target.files[0] })} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full mb-3 w-fit mx-auto group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                {newForm.file ? (
                  <><p className="text-sm font-bold text-[var(--accent)]">{newForm.file.name}</p><p className="text-[10px] text-[var(--text-muted)]">{(newForm.file.size / 1024).toFixed(2)} KB</p></>
                ) : (
                  <><p className="text-sm font-bold text-[var(--text-main)]">Click or drag to upload</p><p className="text-[10px] text-[var(--text-muted)]">PDF, DOCX, XLSX up to 10MB</p></>
                )}
              </label>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-color)]">
            <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors uppercase tracking-wider">Cancel</button>
            <button type="submit" disabled={isSubmitting || !newForm.label || (creationMode === 'file' && !editingFormId && !newForm.file)}
              className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest disabled:opacity-50">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSubmitting ? 'Saving...' : 'Save Form'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View / Preview Modal ── */}
      <Modal isOpen={!!viewingForm} onClose={() => setViewingForm(null)} title={viewingForm?.label || 'Preview'} maxWidth="max-w-5xl">
        <div className="w-full h-[80vh] bg-[var(--bg-workspace)] rounded-xl overflow-y-auto custom-scrollbar border border-[var(--border-color)]">
          {viewingForm?.type === 'dynamic' ? (
            <DynamicFormRenderer schema={typeof viewingForm.form_schema === 'string' ? JSON.parse(viewingForm.form_schema) : (viewingForm.form_schema || [])} />
          ) : viewingForm ? (
            <iframe src={`${API_URL}/hr/cef-forms/view/${viewingForm.id}`} className="w-full h-full border-0" title="Form Preview" />
          ) : null}
        </div>
      </Modal>

      {/* ── Publish & Share Modal ── */}
      {sharingForm && <PublishModal form={sharingForm} onClose={() => setSharingForm(null)} onPublished={handlePublished} />}

      {/* ── Responses Modal ── */}
      {responsesForm && <ResponsesModal form={responsesForm} onClose={() => setResponsesForm(null)} />}
    </div>
  );
};

export default CandidateEvaluationFormPage;
