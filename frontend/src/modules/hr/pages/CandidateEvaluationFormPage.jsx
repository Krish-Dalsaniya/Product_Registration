import React, { useState, useEffect } from 'react';
import { FileText, Plus, Upload, X, Save, Pencil, Trash2, Download, Eye } from 'lucide-react';
import Modal from '../../../components/shared/Modal';
import Breadcrumbs from '../../../components/shared/Breadcrumbs';
import { getForms, uploadForm, updateForm, deleteForm, createDynamicForm, updateDynamicForm } from '../../../api/cefApi';
import FormBuilder from '../components/FormBuilder';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';


const formCategories = [
  { id: 'caf', title: 'Candidate Application Form (CAF)' },
  { id: 'aptitude', title: 'Aptitude Test Form' },
  { id: 'knowledge', title: 'Knowledge Form' },
  { id: 'skill', title: 'Skill Form' },
  { id: 'trait', title: 'Trait Form' },
  { id: 'motive', title: 'Motive Form' },
  { id: 'self_image', title: 'Self Image Form' }
];

const CandidateEvaluationFormPage = () => {
  const [forms, setForms] = useState({
    caf: [],
    aptitude: [],
    knowledge: [],
    skill: [],
    trait: [],
    motive: [],
    self_image: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('caf');
  const [editingFormId, setEditingFormId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [viewingForm, setViewingForm] = useState(null);
  
  const [creationMode, setCreationMode] = useState('file'); // 'file' or 'dynamic'
  const [dynamicSchema, setDynamicSchema] = useState([]);

  const [newForm, setNewForm] = useState({
    label: '',
    file: null
  });

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setIsLoading(true);
      const res = await getForms();
      if (res.success) {
        setForms(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (categoryId, form = null) => {
    setActiveCategory(categoryId);
    if (form) {
      setEditingFormId(form.id);
      setNewForm({ label: form.label, file: null });
      setCreationMode(form.type === 'dynamic' ? 'dynamic' : 'file');
      setDynamicSchema(form.type === 'dynamic' ? (typeof form.form_schema === 'string' ? JSON.parse(form.form_schema) : form.form_schema) : []);
    } else {
      setEditingFormId(null);
      setNewForm({ label: '', file: null });
      setCreationMode('file');
      setDynamicSchema([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveCategory(null);
    setEditingFormId(null);
  };

  const handleDeleteForm = async (categoryId, formId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteForm(formId);
        if (res.success) {
          fetchForms();
          Swal.fire(
            'Deleted!',
            'The form has been deleted.',
            'success'
          );
        }
      } catch (error) {
        console.error('Failed to delete form:', error);
        Swal.fire('Error!', 'Failed to delete form.', 'error');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewForm({ ...newForm, file: e.target.files[0] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newForm.label) return;
    
    if (creationMode === 'file' && !editingFormId && !newForm.file) return;
    if (creationMode === 'dynamic' && dynamicSchema.length === 0) {
      Swal.fire('Warning', 'Please add at least one field to your dynamic form.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (creationMode === 'dynamic') {
        const payload = {
          label: newForm.label,
          category: activeCategory,
          type: 'dynamic',
          form_schema: dynamicSchema
        };
        
        if (editingFormId) {
          await updateDynamicForm(editingFormId, payload);
        } else {
          await createDynamicForm(payload);
        }
      } else {
        const formData = new FormData();
        formData.append('label', newForm.label);
        if (newForm.file) {
          formData.append('file', newForm.file);
        }

        if (editingFormId) {
          await updateForm(editingFormId, formData);
        } else {
          formData.append('category', activeCategory);
          await uploadForm(formData);
        }
      }
      
      await fetchForms();
      handleCloseModal();
      Swal.fire('Success', 'Form saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save form:', error);
      Swal.fire('Error!', 'Failed to save form.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <FileText size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mb-2">
              Candidate Evaluation Form
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] opacity-70">
              Manage all evaluation forms and templates
            </p>
          </div>
        </div>
      </div>

      <div className="flex px-1 gap-2 md:gap-3 overflow-x-auto custom-scrollbar border-b border-[var(--border-color)] pb-3 mb-4 shrink-0">
        {formCategories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedTab(category.id)}
            className={`px-4 py-2 text-[12px] font-bold transition-all rounded-lg whitespace-nowrap ${
              selectedTab === category.id
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
            }`}
          >
            {category.title}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {formCategories.map(category => {
          if (selectedTab !== category.id) return null;
          return (
          <div key={category.id} className="animate-in fade-in zoom-in-95 duration-300">
            <div className="p-3 md:p-4 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-[var(--text-main)]">{category.title}</h3>
                <span className="px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold rounded-full">
                  {forms[category.id].length} Forms
                </span>
              </div>
              <button 
                onClick={() => handleOpenModal(category.id)}
                className="btn-primary py-2 px-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
              >
                <Plus size={14} /> Add New Form
              </button>
            </div>
            
            <div className="p-3 md:p-4">
              {forms[category.id].length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {forms[category.id].map(form => (
                    <div key={form.id} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-md transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[var(--accent)]/10 to-transparent rounded-bl-full pointer-events-none" />
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 rounded-xl bg-[var(--bg-workspace)] text-[var(--accent)] shadow-sm">
                          <FileText size={22} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-workspace)] border border-[var(--border-color)] px-2 py-0.5 rounded-md shadow-sm">
                            {form.date}
                          </span>
                          {form.type === 'dynamic' && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md shadow-sm">
                              Digital Form
                            </span>
                          )}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 translate-y-1 group-hover:translate-y-0 mt-1">
                            <button 
                              onClick={() => setViewingForm(form)}
                              className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                              title="View Form"
                            >
                              <Eye size={12} strokeWidth={3} />
                            </button>
                            <a 
                              href={`${API_URL}/hr/cef-forms/download/${form.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                              title="Download Form"
                            >
                              <Download size={12} strokeWidth={3} />
                            </a>
                            <button 
                              onClick={() => handleOpenModal(category.id, form)}
                              className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                              title="Edit Form"
                            >
                              <Pencil size={12} strokeWidth={3} />
                            </button>
                            <button 
                              onClick={() => handleDeleteForm(category.id, form.id)}
                              className="p-1.5 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-red-400 hover:text-red-500 text-[var(--text-dim)] shadow-sm transition-all"
                              title="Delete Form"
                            >
                              <Trash2 size={12} strokeWidth={3} />
                            </button>
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
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)]/30 mx-2 mb-2">
                  <FileText size={32} className="text-[var(--border-color)] mb-3" />
                  <p className="text-sm font-bold text-[var(--text-main)] mb-1">No forms added yet</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Click 'Add New Form' to upload a document to this section.</p>
                </div>
              )}
            </div>
          </div>
        )})}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingFormId ? `Edit ${activeCategory ? formCategories.find(c => c.id === activeCategory)?.title : 'Form'}` : `Add New ${activeCategory ? formCategories.find(c => c.id === activeCategory)?.title : 'Form'}`}
        maxWidth={creationMode === 'dynamic' ? "max-w-3xl" : "max-w-md"}
      >
        <div className="mb-6 flex p-1 bg-[var(--bg-workspace)] rounded-xl border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setCreationMode('file')}
            disabled={editingFormId && creationMode !== 'file'}
            className={`flex-1 py-2 text-[12px] font-bold transition-all rounded-lg ${
              creationMode === 'file' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-50'
            }`}
          >
            Upload Document
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('dynamic')}
            disabled={editingFormId && creationMode !== 'dynamic'}
            className={`flex-1 py-2 text-[12px] font-bold transition-all rounded-lg ${
              creationMode === 'dynamic' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-50'
            }`}
          >
            Create Digital Form
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Field Label / Form Name *</label>
            <input 
              type="text" 
              required
              value={newForm.label}
              onChange={(e) => setNewForm({...newForm, label: e.target.value})}
              placeholder="e.g. Assessment Template v1"
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          
          {creationMode === 'file' ? (
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                {editingFormId ? 'Replace File (Optional)' : 'Upload File *'}
              </label>
              <div className="relative border-2 border-dashed border-[var(--border-color)] rounded-xl p-6 hover:border-[var(--accent)] transition-colors bg-[var(--bg-workspace)]/50 group cursor-pointer text-center">
                <input 
                  type="file" 
                  required={!editingFormId && creationMode === 'file'}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                {newForm.file ? (
                  <>
                    <p className="text-sm font-bold text-[var(--accent)] mb-1">{newForm.file.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{(newForm.file.size / 1024).toFixed(2)} KB</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[var(--text-main)] mb-1">Click or drag file to upload</p>
                    <p className="text-[10px] text-[var(--text-muted)]">PDF, DOCX, XLSX up to 10MB</p>
                  </>
                )}
              </div>
            </div>
            </div>
          ) : (
            <div className="border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-workspace)]/30 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <FormBuilder schema={dynamicSchema} onChange={setDynamicSchema} />
            </div>
          )}
          
          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-color)]">
            <button 
              type="button" 
              onClick={handleCloseModal}
              className="px-5 py-2.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !newForm.label || (creationMode === 'file' && !editingFormId && !newForm.file)}
              className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : <><Save size={14} /> Save Form</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Form Modal */}
      <Modal 
        isOpen={!!viewingForm} 
        onClose={() => setViewingForm(null)} 
        title={viewingForm?.label || 'View Form'}
        maxWidth="max-w-7xl"
      >
        <div className="w-full h-[85vh] bg-white dark:bg-gray-900 rounded-xl overflow-y-auto custom-scrollbar border border-[var(--border-color)]">
          {viewingForm && viewingForm.type === 'dynamic' ? (
            <DynamicFormRenderer schema={typeof viewingForm.form_schema === 'string' ? JSON.parse(viewingForm.form_schema) : viewingForm.form_schema} />
          ) : viewingForm ? (
            <iframe 
              src={`${API_URL}/hr/cef-forms/view/${viewingForm.id}`} 
              className="w-full h-full border-0"
              title="Form Preview"
            />
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default CandidateEvaluationFormPage;
