import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Eye, Send, Settings, BarChart2, HelpCircle, MoreVertical,
  Loader2, Globe, Lock, Copy, CheckCircle2, Trash2, ExternalLink,
  ChevronLeft, ChevronRight, Save, AlertCircle, Download, Edit3, User, Users, CheckCircle, XCircle, Award, ListFilter, AlignLeft, Clock, FileText
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { getFormSchema, updateDynamicForm, publishForm, getFormResponses, deleteForm } from '../../../api/cefApi';
import FormBuilder from '../components/FormBuilder';
import CEFBuilder from '../components/CEFBuilder';
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
const getFormattedAnswerString = (ans, formSchema = []) => {
  if (!ans) return '';
  let q;
  for (const sec of formSchema) {
    q = (sec.questions || []).find(qs => qs.id === ans.question_id);
    if (q) break;
  }
  q = q || { type: ans.question_type };
  
  if (q.type === 'file_upload' && ans.text_value) {
    try {
      const files = JSON.parse(ans.text_value);
      if (Array.isArray(files)) return files.map(f => f.original_name || 'File').join(', ');
    } catch (e) {}
  }
  
  if (q.type === 'cef_rtf' && ans.text_value) {
    try {
      const doc = new DOMParser().parseFromString(ans.text_value, 'text/html');
      return doc.body.textContent.trim() || 'No text';
    } catch (e) {
      return ans.text_value.replace(/<[^>]+>/g, '').trim() || 'No text';
    }
  }
  
  if ((q.type === 'grid_radio' || q.type === 'grid_checkbox' || q.type === 'cef_rating') && ans.text_value) {
    try {
      const gridData = JSON.parse(ans.text_value);
      const rowLabels = [];
      const CEF_RATING_COLS = [
        { id: 'nil',  label: 'NILL', score: 0 },
        { id: 'noob', label: 'NOOB', score: 1 },
        { id: 'mod',  label: 'MOD',  score: 2 },
        { id: 'adv',  label: 'ADV',  score: 3 },
        { id: 'ace',  label: 'ACE',  score: 4 },
      ];
      
      Object.entries(gridData).forEach(([rowId, colIds]) => {
        const rowObj = (q.rows || []).find(r => r.id === rowId);
        const rLabel = rowObj ? rowObj.label : rowId;
        const cLabels = (Array.isArray(colIds) ? colIds : [colIds]).map(cId => {
          let colObj;
          if (q.type === 'cef_rating') {
            colObj = CEF_RATING_COLS.find(o => o.id === cId);
          } else {
            colObj = (q.options || []).find(o => o.id === cId);
          }
          return colObj ? colObj.label : cId;
        }).join(', ');
        if (rLabel && cLabels) rowLabels.push(`${rLabel}: ${cLabels}`);
      });
      return rowLabels.join(' | ');
    } catch (e) {}
  }
  
  return ans.text_value || (ans.selected_options?.length ? ans.selected_options.map(o => o.label).join(', ') : '');
};

const ResponsesPanel = ({ form }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOriginalForm, setShowOriginalForm] = useState(false);
  const isSurvey = form?.form_mode === 'survey';
  const isCEF = form?.form_mode === 'candidate_evaluation';

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

  const handleDownloadPDF = () => {
    const printElement = document.getElementById('original-form-print-area');
    if (!printElement) return;

    // Sync input values to attributes so innerHTML captures them correctly
    const inputs = printElement.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked) input.setAttribute('checked', 'checked');
        else input.removeAttribute('checked');
      } else {
        input.setAttribute('value', input.value);
        if (input.tagName === 'TEXTAREA') input.textContent = input.value;
      }
    });

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-1';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('');

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Form Response - ${data.responses[currentIndex]?.respondent_email || 'Anonymous'}</title>
          ${styles}
          <style>
             body { background: white !important; margin: 0; padding: 20px; color: black; }
             @page { margin: 10mm; }
             * { overflow: visible !important; }
             .print-hide { display: none !important; }
          </style>
        </head>
        <body>
          <div style="max-width: 1000px; margin: 0 auto; background: white; padding: 20px;">
            ${printElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 750);
  };

  const allQuestions = React.useMemo(() => {
    const qMap = new Map();
    
    // 1. Preload ALL questions from the current form schema
    if (form?.form_schema) {
      form.form_schema.forEach(sec => {
        (sec.questions || []).forEach(q => {
          qMap.set(q.id, {
            id: q.id,
            label: q.label || sec.title || 'Untitled Question',
            type: q.type
          });
        });
      });
    }

    // 2. Add any additional questions from responses (e.g. deleted questions)
    if (data?.responses) {
      data.responses.forEach(r => {
        (r.answers || []).forEach(a => {
          if (!qMap.has(a.question_id)) {
            let label = a.question_label;
            if (!label && form?.form_schema) {
              for (const sec of form.form_schema) {
                const qs = (sec.questions || []).find(q => q.id === a.question_id);
                if (qs) {
                  label = sec.title;
                  break;
                }
              }
            }
            qMap.set(a.question_id, { id: a.question_id, label: label || 'Untitled Question', type: a.question_type });
          }
        });
      });
    }
    
    return Array.from(qMap.values());
  }, [data, form]);

  const chartColors = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

  const exportToExcel = () => {
    if (!data || !data.responses || data.responses.length === 0) return;

    const escapeCsv = (val) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    // Build columns: Timestamp, Email, Score, ...questions
    const headers = ['Timestamp', 'Respondent Email', 'Score', 'Passed'];
    allQuestions.forEach(q => headers.push(q.label));

    const rows = data.responses.map(r => {
      const base = [
        r.completed_at ? new Date(r.completed_at).toLocaleString() : '',
        r.respondent_email || '',
        r.total_score ?? '',
        r.is_passed === null ? '' : r.is_passed ? 'Yes' : 'No',
      ];
      allQuestions.forEach(q => {
        const ans = (r.answers || []).find(a => a.question_id === q.id);
        base.push(getFormattedAnswerString(ans, form?.form_schema));
      });
      return base;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(escapeCsv).join(','))
      .join('\r\n');

    // Add BOM for Excel to recognise UTF-8
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form?.title || 'responses'}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
      {/* Premium Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider mb-1">Total Responses</p>
            <p className="text-4xl font-black">{data.total}</p>
          </div>
          <Users className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10" />
        </div>
        {!isSurvey && !isCEF && (
          <>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Pass Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black">{data.total > 0 ? Math.round((data.responses.filter(r => r.is_passed).length / data.total) * 100) : 0}%</p>
                  <p className="text-emerald-200 text-sm font-medium">{data.responses.filter(r => r.is_passed).length} passed</p>
                </div>
              </div>
              <CheckCircle className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10" />
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-1">Average Score</p>
                <p className="text-4xl font-black">
                  {data.total > 0 ? (data.responses.reduce((a, r) => a + (parseFloat(r.total_score) || 0), 0) / data.total).toFixed(1) : '—'}
                </p>
              </div>
              <Award className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10" />
            </div>
          </>
        )}
      </div>

      {/* Tab Bar + Export Button */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex">
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
        {data.responses.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 mb-1 text-sm font-semibold rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all shadow-sm"
          >
            <Download size={15} />
            Export to Excel
          </button>
        )}
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
            <div className="space-y-6">
              {allQuestions.map((q) => {
                const isText = ['short_answer', 'long_answer', 'email', 'number', 'date', 'short_text', 'long_text', 'file_upload', 'cef_rtf', 'cef_code'].includes(q.type);
                const counts = {};
                const rawAnswers = [];
                let skippedCount = data.total || 0;
                
                if (data.responses) {
                  data.responses.forEach(r => {
                    const ans = (r.answers || []).find(a => a.question_id === q.id);
                    if (ans) {
                      skippedCount--;
                      const val = getFormattedAnswerString(ans, form?.form_schema) || 'Left blank';
                      
                      // For multiple choice/checkboxes with multiple selected options, split them so they count individually
                      if (q.type === 'checkbox' && val.includes(',')) {
                         val.split(',').forEach(v => {
                            const trimmed = v.trim();
                            counts[trimmed] = (counts[trimmed] || 0) + 1;
                         });
                      } else {
                         counts[val] = (counts[val] || 0) + 1;
                      }

                      if (val !== 'Left blank' && isText) rawAnswers.push({ val, ans, email: r.respondent_email });
                    }
                  });
                }
                
                if (skippedCount > 0 && !isText) {
                  counts['Skipped'] = (counts['Skipped'] || 0) + skippedCount;
                }
                
                const chartData = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

                return (
                  <div key={q.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-8 shadow-sm">
                    <div className="mb-6">
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{q.label}</p>
                      <p className="text-xs text-gray-400 uppercase tracking-widest">{data.total} responses</p>
                    </div>
                    {isText ? (
                      <div className="space-y-3">
                        {rawAnswers.length === 0 ? <p className="text-sm text-gray-400 italic bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">No text responses provided yet.</p> : null}
                        {rawAnswers.map(({ val, ans, email }, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                            <div className="flex items-center gap-2 mb-2">
                               <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 font-bold text-[10px]">
                                  {(email || 'A')[0].toUpperCase()}
                               </div>
                               <span className="text-xs font-semibold text-gray-500">{email || 'Anonymous'}</span>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-8">
                              {q.type === 'file_upload' ? (
                                (() => {
                                  try {
                                    const files = JSON.parse(ans.text_value);
                                    return <div className="flex gap-3 flex-wrap">{files.map((f, fi) => (
                                      <a key={fi} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-indigo-600 hover:text-indigo-700 hover:border-indigo-300 transition-colors shadow-sm text-xs font-medium">
                                        📄 {f.original_name || 'View File'}
                                      </a>
                                    ))}</div>;
                                  } catch(e) { return val; }
                                })()
                              ) : q.type === 'cef_code' ? (
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto font-mono">
                                  {val}
                                </pre>
                              ) : (
                                <p className="whitespace-pre-wrap">{val}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4">
                        {['radio', 'dropdown', 'boolean'].includes(q.type) ? (
                           <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
                                  </Pie>
                                  <RechartsTooltip formatter={(val) => [`${val} responses`, 'Count']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                  <Legend iconType="circle" />
                                </PieChart>
                              </ResponsiveContainer>
                           </div>
                        ) : (
                           <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                  <XAxis type="number" allowDecimals={false} stroke="#9ca3af" />
                                  <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12, fill: '#6b7280'}} />
                                  <RechartsTooltip formatter={(val) => [`${val} responses`, 'Count']} cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                           </div>
                        )}
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
                          const val = getFormattedAnswerString(ans, form?.form_schema);
                          
                          if (q.type === 'file_upload' && ans?.text_value) {
                             try {
                               const files = JSON.parse(ans.text_value);
                               return (
                                 <td key={q.id} className="p-4">
                                   <div className="flex flex-col gap-1">
                                     {files.map((f, fi) => (
                                       <a key={fi} href={f.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline truncate max-w-[250px] inline-block" title={f.original_name}>
                                         📄 {f.original_name}
                                       </a>
                                     ))}
                                   </div>
                                 </td>
                               );
                             } catch(e) {}
                          }
                          
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
            <div className="bg-[#f8fafc] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-md">
              {/* Profile Navigation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl shadow-inner">
                    {(data.responses[currentIndex]?.respondent_email || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{data.responses[currentIndex]?.respondent_email || 'Anonymous'}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Clock size={14} />
                      {new Date(data.responses[currentIndex]?.completed_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {!isSurvey && !isCEF && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Score</p>
                      <div className="flex items-baseline gap-2 justify-end">
                        <span className="text-2xl font-black text-gray-800 dark:text-gray-100">{data.responses[currentIndex]?.total_score ?? 0}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data.responses[currentIndex]?.is_passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {data.responses[currentIndex]?.is_passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* View Original Form Button */}
                  <button 
                    onClick={() => setShowOriginalForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-xl transition-all border border-indigo-200 dark:border-indigo-800"
                  >
                    <Eye size={16} />
                    View Original Form
                  </button>

                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(p => p - 1)}
                      className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm disabled:opacity-30 transition-all text-gray-600 dark:text-gray-300">
                      <ChevronLeft size={20} />
                    </button>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300 px-2 min-w-[70px] text-center">
                      {currentIndex + 1} <span className="text-gray-400 font-medium">/ {data.responses.length}</span>
                    </div>
                    <button disabled={currentIndex === data.responses.length - 1} onClick={() => setCurrentIndex(p => p + 1)}
                      className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm disabled:opacity-30 transition-all text-gray-600 dark:text-gray-300">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Profile Body */}
              {(() => {
                const r = data.responses[currentIndex];
                return (
                  <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
                    {(r.answers || []).map((ans, i) => {
                      const q = (form?.form_schema || []).find(qs => qs.id === ans.question_id) || { type: ans.question_type };
                      const val = getFormattedAnswerString(ans, form?.form_schema);
                      const fallbackQ = allQuestions.find(aq => aq.id === ans.question_id);
                      const displayLabel = ans.question_label || fallbackQ?.label || 'Untitled Question';
                      
                      return (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                          {/* Question Label */}
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 font-bold text-xs flex-shrink-0 mt-1">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-snug">{displayLabel}</p>
                              {q.type && <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{q.type.replace('_', ' ')}</p>}
                            </div>
                          </div>
                          
                          {/* Answer Content */}
                          <div className="pl-12">
                            {val ? (
                              q.type === 'file_upload' && ans.text_value ? (
                                <div className="flex flex-wrap gap-3">
                                  {(() => {
                                    try {
                                      const files = JSON.parse(ans.text_value);
                                      return files.map((f, fi) => (
                                        <a key={fi} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 transition-colors shadow-sm group/file">
                                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg group-hover/file:bg-indigo-200 transition-colors">
                                            <FileText size={18} />
                                          </div>
                                          <span className="font-medium text-sm">{f.original_name || 'Attached File'}</span>
                                        </a>
                                      ));
                                    } catch(e) { return val; }
                                  })()}
                                </div>
                              ) : q.type === 'grid_radio' || q.type === 'grid_checkbox' ? (
                                <div className="flex flex-col gap-2">
                                  {val.split(' | ').map((line, li) => {
                                    const [row, col] = line.split(': ');
                                    return (
                                      <div key={li} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-1 sm:mb-0">{row}</span>
                                        <span className="bg-white dark:bg-gray-800 px-3 py-1.5 shadow-sm border border-gray-100 dark:border-gray-700 rounded-lg text-sm font-medium text-[var(--accent)]">{col}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : q.type === 'cef_code' ? (
                                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-800 bg-[#1e1e1e]">
                                  <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                  </div>
                                  <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">
                                    {val}
                                  </pre>
                                </div>
                              ) : q.type === 'cef_rtf' ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800" dangerouslySetInnerHTML={{ __html: ans.text_value }} />
                              ) : (
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-[15px]">
                                  {val}
                                </div>
                              )
                            ) : (
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl text-gray-400 text-sm font-medium italic">
                                <AlertCircle size={14} />
                                Question was skipped
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* Original Form View Modal */}
      {showOriginalForm && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start bg-black/60 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
          <div className="bg-white dark:bg-gray-900 w-full max-w-7xl min-h-[80vh] rounded-3xl shadow-2xl relative flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowOriginalForm(false)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Original Form View</h3>
                  <p className="text-xs text-gray-500">Filled by {data.responses[currentIndex]?.respondent_email || 'Anonymous'}</p>
                </div>
              </div>
              <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all">
                <Download size={16} />
                Download PDF
              </button>
            </div>
            
            <div id="original-form-print-area" className="flex-1 p-8 bg-gray-50 dark:bg-gray-950 overflow-y-auto">
              <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
                <div className="mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
                  <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">{form?.title}</h1>
                  <p className="text-gray-500 dark:text-gray-400">{form?.description}</p>
                </div>
                {(() => {
                  const r = data.responses[currentIndex];
                  const mappedAnswers = {};
                  (r.answers || []).forEach(a => {
                    mappedAnswers[a.question_id] = {
                      options: a.selected_options ? a.selected_options.map(o => o.id) : [],
                      text_value: a.text_value || ''
                    };
                  });
                  return (
                    <DynamicFormRenderer
                      schema={form?.form_schema || []}
                      formMode={form?.form_mode || 'assessment'}
                      disabled={true}
                      initialAnswers={mappedAnswers}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Settings Panel ────────────────────────────────────────── */
const SettingsPanel = ({ form, onUpdate }) => {
  const mode = form.form_mode || 'assessment';
  const isSurvey = mode === 'survey';
  const isCEF = mode === 'candidate_evaluation';
  const isAssessment = !isSurvey && !isCEF;

  const ModeOption = ({ id, label, description, active }) => (
    <button
      onClick={() => onUpdate({ form_mode: id })}
      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${active ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? 'border-[var(--accent)]' : 'border-gray-300'}`}>
        {active && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
      </div>
      <div>
        <p className="font-bold text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Form Mode Settings */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">Form Mode</h3>
        </div>
        <div className="p-6 space-y-4">
          <ModeOption id="assessment" label="Assessment (Quiz)" description="Questions can have correct answers and points. Scores are calculated automatically." active={isAssessment} />
          <ModeOption id="survey" label="Survey / Data Collection" description="Collect information without scoring. No pass/fail. Great for interest forms, feedback, and registration." active={isSurvey} />
          <ModeOption id="candidate_evaluation" label="Candidate Evaluation Form (CEF)" description="Enterprise Interview Assessment Builder. Section types, Skill Matrix, Monaco Code Editor, Rich Text. For HR, Technical Interviewers, and Managers." active={isCEF} />
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

  const location = useLocation();

  const [form, setForm] = useState(null);
  const [schema, setSchema] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'questions');
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
      const response = await updateDynamicForm(id, {
        label: form.title,
        form_mode: form.form_mode || 'assessment',
        form_schema: newSchema,
        ...overrides,
      });
      setSaveStatus('saved');
      
      // If the backend created a new version (e.g. because the current one was published),
      // update the URL so we are editing the new draft version.
      if (response && response.data && response.data.id && response.data.id !== id) {
        navigate(`/hr/recruitment/cef/${response.data.id}/edit`, { replace: true });
        return; // Don't process pending saves on the old ID, the navigate will trigger a reload
      }
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
        const response = await updateDynamicForm(id, {
          label: updated.title,
          form_mode: updated.form_mode,
        });
        setSaveStatus('saved');
        
        if (response && response.data && response.data.id && response.data.id !== id) {
          navigate(`/hr/recruitment/cef/${response.data.id}/edit`, { replace: true });
        }
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
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 h-14 gap-4">
          {/* Left — Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/hr/recruitment/cef')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0 hidden sm:flex">
                <HelpCircle size={16} className="text-white" />
              </div>
              <div className="relative group cursor-text flex-none min-w-0 max-w-full">
                <input
                  type="text"
                  value={form.title || ''}
                  onChange={handleTitleChange}
                  style={{ width: `${Math.max(20, (form.title || '').length)}ch` }}
                  className="text-base font-bold text-gray-800 dark:text-gray-100 bg-gray-50/80 hover:bg-gray-100 border border-gray-300 border-dashed hover:border-gray-400 focus:border-[var(--accent)] focus:border-solid focus:bg-white px-2 pr-8 outline-none py-1 min-w-0 max-w-full transition-all rounded"
                  placeholder="Click here to rename form..."
                  title="Click to rename form"
                />
                <Edit3 size={14} className="text-[var(--accent)] opacity-70 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity" />
              </div>
            </div>
          </div>

          {/* Center — Tabs */}
          <div className="flex items-center gap-1">
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
          <div className="flex items-center gap-2 justify-end">
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
          form.form_mode === 'candidate_evaluation' ? (
            <CEFBuilder
              schema={schema}
              onChange={handleSchemaChange}
            />
          ) : (
            <FormBuilder
              schema={schema}
              onChange={handleSchemaChange}
              formMode={form.form_mode || 'assessment'}
            />
          )
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
