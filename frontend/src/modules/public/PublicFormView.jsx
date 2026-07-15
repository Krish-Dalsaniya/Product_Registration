import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Upload, Calendar, Star, Loader2, Send
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/* ---------- Field Components ---------- */
const ShortField = ({ q, value, onChange, disabled }) => (
  <input
    type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'url' ? 'url' : 'text'}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={q.placeholder || 'Your answer'}
    disabled={disabled}
    required={q.required}
    className="w-full border-0 border-b-2 border-gray-200 focus:border-indigo-500 bg-transparent outline-none py-2 text-gray-800 placeholder-gray-300 text-sm transition-colors disabled:opacity-60"
  />
);

const LongField = ({ q, value, onChange, disabled }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={q.placeholder || 'Your answer'}
    disabled={disabled}
    required={q.required}
    rows={4}
    className="w-full border-0 border-b-2 border-gray-200 focus:border-indigo-500 bg-transparent outline-none py-2 text-gray-800 placeholder-gray-300 text-sm transition-colors resize-none disabled:opacity-60"
  />
);

const NumberField = ({ q, value, onChange, disabled }) => (
  <div className="relative w-56">
    {q.type === 'currency' && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>}
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="0"
      disabled={disabled}
      required={q.required}
      className={`w-full border-0 border-b-2 border-gray-200 focus:border-indigo-500 bg-transparent outline-none py-2 text-gray-800 text-sm transition-colors disabled:opacity-60 ${q.type === 'currency' ? 'pl-4' : ''}`}
    />
  </div>
);

const DateField = ({ q, value, onChange, disabled }) => (
  <input
    type={q.type === 'datetime' ? 'datetime-local' : q.type}
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    required={q.required}
    className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-60 bg-white"
  />
);

const RadioField = ({ q, value, onChange, disabled }) => (
  <div className="space-y-2">
    {(q.options || []).map((opt, i) => {
      const optVal = typeof opt === 'string' ? opt : (opt.id || opt.value || opt.label);
      const optLabel = typeof opt === 'string' ? opt : opt.label;
      const isSelected = value === optVal;
      return (
        <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-gray-300 bg-white'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-none transition-colors ${isSelected ? 'border-indigo-500' : 'border-gray-300'}`}>
            {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
          </div>
          <input type="radio" className="sr-only" checked={isSelected} onChange={() => !disabled && onChange(optVal)} />
          <span className="text-sm text-gray-700">{optLabel}</span>
        </label>
      );
    })}
  </div>
);

const CheckboxField = ({ q, value = [], onChange, disabled }) => (
  <div className="space-y-2">
    {(q.options || []).map((opt, i) => {
      const optVal = typeof opt === 'string' ? opt : (opt.id || opt.value || opt.label);
      const optLabel = typeof opt === 'string' ? opt : opt.label;
      const isSelected = value.includes(optVal);
      return (
        <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-gray-300 bg-white'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-none transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
            {isSelected && <CheckCircle2 className="text-white w-3 h-3" strokeWidth={4} />}
          </div>
          <input type="checkbox" className="sr-only" checked={isSelected}
            onChange={() => {
              if (disabled) return;
              const next = isSelected ? value.filter(v => v !== optVal) : [...value, optVal];
              onChange(next);
            }}
          />
          <span className="text-sm text-gray-700">{optLabel}</span>
        </label>
      );
    })}
  </div>
);

const DropdownField = ({ q, value, onChange, disabled }) => (
  <select
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    required={q.required}
    className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-60 bg-white min-w-[220px]"
  >
    <option value="" disabled>Choose</option>
    {(q.options || []).map((opt, i) => {
      const optVal = typeof opt === 'string' ? opt : (opt.value || opt.label);
      const optLabel = typeof opt === 'string' ? opt : opt.label;
      return <option key={i} value={optVal}>{optLabel}</option>;
    })}
  </select>
);

const RatingField = ({ value, onChange, disabled }) => (
  <div className="flex gap-2">
    {[1,2,3,4,5].map(s => (
      <button key={s} type="button" onClick={() => !disabled && onChange(s.toString())} disabled={disabled}
        className={`transition-transform hover:scale-125 disabled:cursor-not-allowed ${disabled ? '' : 'cursor-pointer'}`}>
        <Star size={32} className={parseInt(value) >= s ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
      </button>
    ))}
  </div>
);

const QuestionBlock = ({ q, ans, onTextChange, onOptionChange, disabled }) => {
  const hasChoices = ['radio', 'checkbox', 'dropdown'].includes(q.type);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 transition-colors">
      <div className="mb-4">
        <p className="text-base font-medium text-gray-800 leading-snug">
          {q.label || <span className="text-gray-400 italic">Untitled question</span>}
          {q.required && <span className="text-red-500 ml-1">*</span>}
        </p>
        {q.help_text && <p className="text-sm text-gray-500 mt-1">{q.help_text}</p>}
      </div>

      {['short_text', 'email', 'phone', 'url'].includes(q.type) && (
        <ShortField q={q} value={ans?.text_value || ''} onChange={onTextChange} disabled={disabled} />
      )}
      {q.type === 'long_text' && (
        <LongField q={q} value={ans?.text_value || ''} onChange={onTextChange} disabled={disabled} />
      )}
      {['number', 'currency', 'percentage'].includes(q.type) && (
        <NumberField q={q} value={ans?.text_value || ''} onChange={onTextChange} disabled={disabled} />
      )}
      {['date', 'time', 'datetime'].includes(q.type) && (
        <DateField q={q} value={ans?.text_value || ''} onChange={onTextChange} disabled={disabled} />
      )}
      {q.type === 'radio' && (
        <RadioField q={q} value={ans?.options?.[0] || ''} onChange={v => onOptionChange([v])} disabled={disabled} />
      )}
      {q.type === 'checkbox' && (
        <CheckboxField q={q} value={ans?.options || []} onChange={onOptionChange} disabled={disabled} />
      )}
      {q.type === 'dropdown' && (
        <DropdownField q={q} value={ans?.options?.[0] || ''} onChange={v => onOptionChange([v])} disabled={disabled} />
      )}
      {q.type === 'rating' && (
        <RatingField value={ans?.text_value || ''} onChange={onTextChange} disabled={disabled} />
      )}
      {q.type === 'file_upload' && (
        <label className="inline-flex flex-col items-center gap-2 px-6 py-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
          <Upload size={22} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Click to upload file</span>
          <input type="file" className="sr-only" disabled={disabled} />
        </label>
      )}
    </div>
  );
};

/* ---------- Main Component ---------- */
const PublicFormView = () => {
  const { uuid } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState('');

  useEffect(() => { fetchForm(); }, [uuid]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/hr/public-forms/${uuid}`);
      if (res.data.success) setForm(res.data.data);
      else setError(res.data.message || 'Form not found');
    } catch (err) {
      setError(err.response?.data?.message || 'Form is no longer available.');
    } finally {
      setLoading(false);
    }
  };

  const getSections = () => {
    if (!form?.form_schema) return [];
    const s = form.form_schema;
    if (s.length > 0 && s[0]?.questions !== undefined) return s;
    return [{ id: 'default', title: form.title, questions: s }];
  };

  const sections = getSections();
  const activeSection = sections[currentSection];
  const progress = sections.length > 1 ? ((currentSection + 1) / sections.length) * 100 : null;

  const handleText = (qId, val) => setAnswers(p => ({ ...p, [qId]: { ...(p[qId] || {}), text_value: val, options: p[qId]?.options || [] } }));
  const handleOptions = (qId, opts) => setAnswers(p => ({ ...p, [qId]: { ...(p[qId] || {}), options: opts, text_value: p[qId]?.text_value || '' } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/hr/public-forms/${uuid}/submit`, { answers, email });
      if (res.data.success) setSubmitted(true);
      else setError(res.data.message || 'Submission failed');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* --- States --- */
  if (loading) return (
    <div className="min-h-screen bg-[#f0f4f9] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-3" />
        <p className="text-gray-500 font-medium text-sm">Loading form...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#f0f4f9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Form Unavailable</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-[#f0f4f9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-md w-full">
        <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
        <div className="p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Response Recorded</h2>
          <p className="text-gray-500">Your response has been submitted successfully. Thank you!</p>
          <p className="text-sm text-gray-400 mt-6 font-medium">{form?.title}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f4f9] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Form Header Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          <div className="h-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{form?.title}</h1>
            {form?.description && <p className="text-gray-500 text-sm leading-relaxed">{form.description}</p>}
            {email !== undefined && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border-0 border-b-2 border-gray-200 focus:border-indigo-500 bg-transparent outline-none py-2 text-gray-800 placeholder-gray-300 text-sm transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar for multi-section */}
        {sections.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm px-8 py-4 mb-4 flex items-center gap-4">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
              Section {currentSection + 1} of {sections.length}
            </span>
          </div>
        )}

        {/* Section Title (multi-section only) */}
        {sections.length > 1 && activeSection && (
          <div className="bg-white rounded-xl shadow-sm px-8 py-5 mb-4 border-l-4 border-indigo-500">
            <h2 className="text-lg font-bold text-gray-800">{activeSection.title}</h2>
            {activeSection.description && <p className="text-sm text-gray-500 mt-1">{activeSection.description}</p>}
          </div>
        )}

        {/* Questions */}
        <form onSubmit={currentSection === sections.length - 1 ? handleSubmit : e => { e.preventDefault(); setCurrentSection(p => p + 1); }}>
          <div className="space-y-3 mb-6">
            {(activeSection?.questions || []).map(q => (
              <QuestionBlock
                key={q.id}
                q={q}
                ans={answers[q.id]}
                onTextChange={v => handleText(q.id, v)}
                onOptionChange={opts => handleOptions(q.id, opts)}
                disabled={false}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {sections.length > 1 && currentSection > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentSection(p => p - 1)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}

            {currentSection < sections.length - 1 ? (
              <button
                type="submit"
                className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all hover:shadow-lg"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-10 mb-4">
          <p className="text-xs text-gray-400 font-medium">Powered by <span className="font-semibold text-gray-500">Enterprise Form Engine</span></p>
        </div>
      </div>
    </div>
  );
};

export default PublicFormView;
