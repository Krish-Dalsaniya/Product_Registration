import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Upload, Save, Pencil, Trash2, Download, Eye,
  Share2, BarChart2, Loader2, Search, Grid, List, Clock, Globe, Lock,
  ClipboardList, MessageSquare
} from 'lucide-react';
import { getForms, uploadForm, updateForm, deleteForm, createDynamicForm } from '../../../api/cefApi';
import Modal from '../../../components/shared/Modal';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const formCategories = [
  { id: 'caf',        title: 'Candidate Application Form (CAF)', color: '#4f46e5' },
  { id: 'aptitude',   title: 'Aptitude Test',                     color: '#7c3aed' },
  { id: 'knowledge',  title: 'Knowledge Form',                    color: '#0891b2' },
  { id: 'skill',      title: 'Skill Form',                        color: '#059669' },
  { id: 'trait',      title: 'Trait Form',                        color: '#d97706' },
  { id: 'motive',     title: 'Motive Form',                       color: '#db2777' },
  { id: 'self_image', title: 'Self Image Form',                   color: '#dc2626' },
];

/* ─── Template Card (for "blank" + "upload") ────────────────── */
const TemplateCard = ({ label, icon, description, onClick, accent }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-start p-5 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl hover:border-[var(--accent)] hover:shadow-lg transition-all text-left group"
  >
    <div className="p-3 rounded-xl mb-3 transition-colors" style={{ backgroundColor: `${accent}18` }}>
      <div style={{ color: accent }}>{icon}</div>
    </div>
    <p className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">{label}</p>
    <p className="text-xs text-gray-400">{description}</p>
  </button>
);

/* ─── Form Card ─────────────────────────────────────────────── */
const FormCard = ({ form, onEdit, onDelete, onView, viewMode }) => {
  const isEnterprise = isNaN(form.id);
  const catColor = formCategories.find(c => c.id === form.category)?.color || '#4f46e5';

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-[var(--accent)] hover:shadow-sm transition-all group">
        <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${catColor}18` }}>
          <FileText size={20} style={{ color: catColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{form.label}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> {form.date}</span>
            {isEnterprise && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${form.is_public ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'}`}>
                {form.is_public ? 'Published' : 'Draft'}
              </span>
            )}
            {form.form_mode === 'survey' && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                Survey
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onView(form)} className="p-2 rounded-lg text-gray-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" title="Preview"><Eye size={16} /></button>
          <button onClick={() => onEdit(form)} className="p-2 rounded-lg text-gray-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" title="Edit"><Pencil size={16} /></button>
          {!isEnterprise && <a href={`${API_URL}/hr/cef-forms/download/${form.id}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-gray-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" title="Download"><Download size={16} /></a>}
          <button onClick={() => onDelete(form)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-[var(--accent)] hover:shadow-md transition-all group cursor-pointer" onClick={() => onEdit(form)}>
      {/* Color Header */}
      <div className="h-3" style={{ backgroundColor: catColor }} />
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${catColor}15` }}>
            <FileText size={18} style={{ color: catColor }} />
          </div>
          <div className="flex flex-col items-end gap-1">
            {isEnterprise && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${form.is_public ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'}`}>
                {form.is_public ? 'Published' : 'Draft'}
              </span>
            )}
            {form.form_mode === 'survey' && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-blue-600 bg-blue-100 dark:bg-blue-900/30">Survey</span>
            )}
          </div>
        </div>
        <h4 className="font-black text-gray-800 dark:text-gray-100 text-sm mb-1 line-clamp-2">{form.label}</h4>
        <p className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={11} /> {form.date}</p>
      </div>
      {/* Hover Actions */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); onView(form); }} className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" title="Preview"><Eye size={14} /></button>
        {!isEnterprise && <a onClick={e => e.stopPropagation()} href={`${API_URL}/hr/cef-forms/download/${form.id}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" title="Download"><Download size={14} /></a>}
        <button onClick={e => { e.stopPropagation(); onDelete(form); }} className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

/* ─── Main Dashboard ─────────────────────────────────────────── */
const CandidateEvaluationFormPage = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState({ caf: [], aptitude: [], knowledge: [], skill: [], trait: [], motive: [], self_image: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('caf');
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  // Upload file modal state
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({ label: '', file: null });
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // Preview modal state
  const [viewingForm, setViewingForm] = useState(null);

  useEffect(() => { fetchForms(); }, []);

  const fetchForms = async () => {
    try {
      setIsLoading(true);
      const res = await getForms();
      if (res.success) setForms(res.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  // Create a blank digital form and immediately navigate to editor
  const handleCreateBlankForm = async (categoryId) => {
    setCreating(true);
    try {
      const res = await createDynamicForm({
        label: 'Untitled Form',
        category: categoryId,
        type: 'dynamic',
        form_schema: [],
        form_mode: 'assessment',
      });
      if (res.success) {
        navigate(`/hr/recruitment/cef/${res.data.id}/edit`);
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to create form.', 'error');
    } finally { setCreating(false); }
  };

  const handleEditForm = (form) => {
    if (isNaN(form.id)) {
      // Enterprise (digital) form → go to editor
      navigate(`/hr/recruitment/cef/${form.id}/edit`);
    } else {
      // File-based form → open legacy upload modal
      setUploadData({ label: form.label, file: null, editId: form.id });
      setUploadModal(true);
    }
  };

  const handleViewForm = async (form) => {
    if (form.type === 'dynamic') {
      if (isNaN(form.id)) navigate(`/hr/recruitment/cef/${form.id}/edit`);
    } else {
      setViewingForm(form);
    }
  };

  const handleDelete = async (form) => {
    const result = await Swal.fire({
      title: 'Delete this form?',
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (result.isConfirmed) {
      try {
        const res = await deleteForm(form.id);
        if (res.success) { fetchForms(); Swal.fire('Deleted!', '', 'success'); }
      } catch (e) { Swal.fire('Error', 'Failed to delete form.', 'error'); }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.label) return;
    if (!uploadData.editId && !uploadData.file) return;
    setUploadSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('label', uploadData.label);
      if (uploadData.file) formData.append('file', uploadData.file);
      if (uploadData.editId) {
        await updateForm(uploadData.editId, formData);
      } else {
        formData.append('category', selectedTab);
        await uploadForm(formData);
      }
      await fetchForms();
      setUploadModal(false);
      setUploadData({ label: '', file: null });
      Swal.fire('Saved!', '', 'success');
    } catch (e) { Swal.fire('Error', 'Failed to save form.', 'error'); }
    finally { setUploadSubmitting(false); }
  };

  const currentCat = formCategories.find(c => c.id === selectedTab);
  const catForms = (forms[selectedTab] || []).filter(f =>
    !search || f.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full pb-10 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
            <ClipboardList size={26} className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight">Candidate Evaluation Forms</h1>
            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 opacity-70">Manage digital assessments and documents</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 border-b border-gray-200 dark:border-gray-700">
        {formCategories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedTab(cat.id)}
            className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${selectedTab === cat.id ? 'text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
            style={selectedTab === cat.id ? { backgroundColor: cat.color } : {}}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Panel header — Search + View Toggle + Create */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search forms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[var(--accent)] transition-colors text-gray-700 dark:text-gray-300"
          />
        </div>
        <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[var(--accent)] text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}><Grid size={16} /></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[var(--accent)] text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}><List size={16} /></button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" /></div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4' : 'space-y-2'}>

          {/* Template Cards — always show for grid, show at top for list */}
          {viewMode === 'grid' && (
            <>
              <TemplateCard
                label="Blank form"
                description="Build with drag-and-drop questions"
                icon={<Plus size={22} strokeWidth={2.5} />}
                accent={currentCat?.color || '#4f46e5'}
                onClick={() => handleCreateBlankForm(selectedTab)}
              />
              <TemplateCard
                label="Upload document"
                description="Upload a PDF, DOCX, or XLSX"
                icon={<Upload size={22} />}
                accent="#6b7280"
                onClick={() => { setUploadData({ label: '', file: null }); setUploadModal(true); }}
              />
            </>
          )}

          {viewMode === 'list' && (
            <div className="flex gap-3 mb-4">
              <button onClick={() => handleCreateBlankForm(selectedTab)} disabled={creating}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all">
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                New blank form
              </button>
              <button onClick={() => { setUploadData({ label: '', file: null }); setUploadModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 transition-all">
                <Upload size={16} /> Upload document
              </button>
            </div>
          )}

          {catForms.map(form => (
            <FormCard
              key={form.id}
              form={form}
              viewMode={viewMode}
              onEdit={handleEditForm}
              onDelete={handleDelete}
              onView={handleViewForm}
            />
          ))}

          {catForms.length === 0 && viewMode === 'grid' && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <FileText size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-sm font-bold text-gray-500">No forms yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "Blank form" above to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Upload Document Modal ── */}
      <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title={uploadData.editId ? 'Edit Document Form' : 'Upload Document'} maxWidth="max-w-md">
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Form Name *</label>
            <input type="text" required value={uploadData.label} onChange={e => setUploadData(p => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Aptitude Test v2"
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:border-[var(--accent)] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{uploadData.editId ? 'Replace File (optional)' : 'Upload File *'}</label>
            <label className="relative block border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:border-[var(--accent)] transition-colors cursor-pointer text-center group">
              <input type="file" required={!uploadData.editId} onChange={e => e.target.files?.[0] && setUploadData(p => ({ ...p, file: e.target.files[0] }))} className="absolute inset-0 opacity-0 cursor-pointer" />
              <Upload size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2 group-hover:text-[var(--accent)] transition-colors" />
              {uploadData.file ? (
                <><p className="text-sm font-bold text-[var(--accent)]">{uploadData.file.name}</p><p className="text-xs text-gray-400">{(uploadData.file.size / 1024).toFixed(2)} KB</p></>
              ) : (
                <><p className="text-sm font-bold text-gray-600 dark:text-gray-400">Click to choose a file</p><p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX up to 10MB</p></>
              )}
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={() => setUploadModal(false)} className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors uppercase tracking-wider">Cancel</button>
            <button type="submit" disabled={uploadSubmitting} className="px-6 py-2.5 bg-[var(--accent)] text-white text-xs font-black rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
              {uploadSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {uploadSubmitting ? 'Saving...' : 'Save Form'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Preview Modal (file-based forms) ── */}
      <Modal isOpen={!!viewingForm} onClose={() => setViewingForm(null)} title={viewingForm?.label || 'Preview'} maxWidth="max-w-5xl">
        <div className="w-full h-[80vh] bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
          {viewingForm && (
            <iframe src={`${API_URL}/hr/cef-forms/view/${viewingForm.id}`} className="w-full h-full border-0" title="Form Preview" />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CandidateEvaluationFormPage;
