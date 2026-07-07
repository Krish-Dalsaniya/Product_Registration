import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Save, Pencil, Trash2, ChevronDown, CheckCircle2, Eye, Download } from 'lucide-react';
import Modal from '../../../components/shared/Modal';
import { getForms } from '../../../api/cefApi';
import axiosInstance from '../../../api/axiosInstance';
import { getPositions, createPosition, updatePosition, deletePosition } from '../../../api/openPositionsApi';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const OpenPositionsPage = () => {
  const [positions, setPositions] = useState([]);
  const [formsByCategory, setFormsByCategory] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosId, setEditingPosId] = useState(null);
  const [viewingPositionOverview, setViewingPositionOverview] = useState(null);
  
  const [viewingForm, setViewingForm] = useState(null);
  const [viewingFormTitle, setViewingFormTitle] = useState('');

  const getFormById = (id) => {
    if (!id) return null;
    for (const category of Object.values(formsByCategory)) {
      const found = category.find(f => f.id === id);
      if (found) return found;
    }
    return null;
  };

  const [formData, setFormData] = useState({
    name: '',
    skills_form_id: '',
    knowledge_form_id: '',
    traits_form_id: '',
    self_image_form_id: '',
    motive_form_id: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [posRes, formsRes] = await Promise.all([
        getPositions(),
        getForms()
      ]);
      if (posRes.success) setPositions(posRes.data);
      if (formsRes.success) setFormsByCategory(formsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (pos = null) => {
    if (pos) {
      setEditingPosId(pos.id);
      setFormData({
        name: pos.name,
        skills_form_id: pos.skills_form_id || '',
        knowledge_form_id: pos.knowledge_form_id || '',
        traits_form_id: pos.traits_form_id || '',
        self_image_form_id: pos.self_image_form_id || '',
        motive_form_id: pos.motive_form_id || ''
      });
    } else {
      setEditingPosId(null);
      setFormData({
        name: '',
        skills_form_id: '',
        knowledge_form_id: '',
        traits_form_id: '',
        self_image_form_id: '',
        motive_form_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPosId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setIsSubmitting(true);
      const payload = { ...formData };
      
      // Convert empty strings to null for DB insertion
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      if (editingPosId) {
        await updatePosition(editingPosId, payload);
      } else {
        await createPosition(payload);
      }
      
      await fetchInitialData();
      handleCloseModal();
      Swal.fire('Success', 'Position saved successfully', 'success');
    } catch (error) {
      console.error('Error saving position:', error);
      Swal.fire('Error!', 'Failed to save position', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
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
        await deletePosition(id);
        await fetchInitialData();
        Swal.fire('Deleted!', 'The position has been deleted.', 'success');
      } catch (error) {
        console.error('Error deleting position:', error);
        Swal.fire('Error!', 'Failed to delete position', 'error');
      }
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await axiosInstance.get(`/hr/cef-forms/download/${id}`, {
        responseType: 'blob'
      });
      
      let filename = 'document.pdf';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('attachment')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Download failed', error);
      Swal.fire('Error!', error.message || 'Failed to download form', 'error');
    }
  };

  const renderSelect = (label, key, category) => (
    <div className="flex flex-col space-y-1.5">
      <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select 
          value={formData[key]}
          onChange={(e) => setFormData({...formData, [key]: e.target.value})}
          className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
        >
          <option value="">Select {label} Form...</option>
          {(formsByCategory[category] || []).map(form => (
            <option key={form.id} value={form.id}>{form.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Briefcase size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mb-2">
              Open Positions
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] opacity-70">
              Manage Job Roles and Evaluation Criteria
            </p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[12px] font-black uppercase tracking-widest whitespace-nowrap shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={16} /> Add New Position
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {positions.map(pos => (
          <div key={pos.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[var(--accent)] transition-all group relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--accent)]/10 to-transparent rounded-bl-full pointer-events-none" />
            
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div>
                <h3 className="text-lg font-black text-[var(--text-main)] mb-1 leading-tight">{pos.name}</h3>
                <span className="inline-block whitespace-nowrap text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-workspace)] border border-[var(--border-color)] px-2.5 py-1 rounded-md shadow-sm mt-1">
                  Created {pos.created_at ? format(new Date(pos.created_at), 'MMM dd, yyyy') : pos.date}
                </span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button 
                  onClick={() => setViewingPositionOverview(pos)}
                  className="p-2 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                  title="View Position Overview"
                >
                  <Eye size={14} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={() => handleOpenModal(pos)}
                  className="p-2 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                  title="Edit Position"
                >
                  <Pencil size={14} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={() => handleDelete(pos.id)}
                  className="p-2 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-red-400 hover:text-red-500 text-[var(--text-dim)] shadow-sm transition-all"
                  title="Delete Position"
                >
                  <Trash2 size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 mt-4 border-t border-[var(--border-color)] pt-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)] mb-1.5">Evaluation Criteria</h4>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Skills', value: pos.skills_form_label, id: pos.skills_form_id },
                  { label: 'Knowledge', value: pos.knowledge_form_label, id: pos.knowledge_form_id },
                  { label: 'Traits', value: pos.traits_form_label, id: pos.traits_form_id },
                  { label: 'Self Image', value: pos.self_image_form_label, id: pos.self_image_form_id },
                  { label: 'Motive', value: pos.motive_form_label, id: pos.motive_form_id }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      {item.value ? (
                        <>
                          <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                          <span className="text-xs font-medium text-[var(--text-main)] line-clamp-1" title={item.value}>{item.value}</span>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-[var(--text-dim)] italic">Not Set</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {positions.length === 0 && !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-workspace)]/30">
            <Briefcase size={40} className="text-[var(--border-color)] mb-4" />
            <p className="text-lg font-black text-[var(--text-main)] mb-2">No Open Positions</p>
            <p className="text-sm text-[var(--text-muted)] max-w-md">Create your first position opening by defining its required evaluation criteria based on the Candidate Evaluation Forms.</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingPosId ? 'Edit Position' : 'Add New Position'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Name of the Position *</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Senior Frontend Developer"
              className="w-full px-4 py-3 text-sm rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors font-semibold"
            />
          </div>

          <div className="bg-[var(--bg-workspace)]/50 p-5 rounded-xl border border-[var(--border-color)]">
            <h4 className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              Link Evaluation Forms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {renderSelect('Skills Form', 'skills_form_id', 'skill')}
              {renderSelect('Knowledge Form', 'knowledge_form_id', 'knowledge')}
              {renderSelect('Traits Form', 'traits_form_id', 'trait')}
              {renderSelect('Self Image Form', 'self_image_form_id', 'self_image')}
              {renderSelect('Motive Form', 'motive_form_id', 'motive')}
            </div>
            <p className="text-[10px] font-medium text-[var(--text-dim)] mt-4">
              * Note: You can select forms that were uploaded in the Candidate Evaluation Forms (CEF) section. Forms are grouped by their respective categories.
            </p>
          </div>
          
          <div className="flex justify-end pt-2 border-t border-[var(--border-color)] mt-2">
            <button 
              type="submit" 
              disabled={isSubmitting || !formData.name}
              className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : <><Save size={14} /> Save Position</>}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={!!viewingPositionOverview} 
        onClose={() => setViewingPositionOverview(null)} 
        title={`Position Overview: ${viewingPositionOverview?.name}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)]">
            <h3 className="text-lg font-black text-[var(--text-main)] mb-1">{viewingPositionOverview?.name}</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Created {viewingPositionOverview?.date}
            </span>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)] border-b border-[var(--border-color)] pb-2">Evaluation Criteria</h4>
            
            <div className="flex flex-col gap-2">
              {[
                { label: 'Skills', value: viewingPositionOverview?.skills_form_label, id: viewingPositionOverview?.skills_form_id },
                { label: 'Knowledge', value: viewingPositionOverview?.knowledge_form_label, id: viewingPositionOverview?.knowledge_form_id },
                { label: 'Traits', value: viewingPositionOverview?.traits_form_label, id: viewingPositionOverview?.traits_form_id },
                { label: 'Self Image', value: viewingPositionOverview?.self_image_form_label, id: viewingPositionOverview?.self_image_form_id },
                { label: 'Motive', value: viewingPositionOverview?.motive_form_label, id: viewingPositionOverview?.motive_form_id }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-workspace)]/50 rounded-lg border border-[var(--border-color)]">
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{item.label}</span>
                    {item.value ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span className="text-sm font-semibold text-[var(--text-main)] truncate max-w-[200px]" title={item.value}>{item.value}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-[var(--text-dim)] italic flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400/50" /> Not Set
                      </span>
                    )}
                  </div>
                  
                  {item.value && (
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => {
                          const form = getFormById(item.id);
                          setViewingForm(form);
                          setViewingFormTitle(`${viewingPositionOverview.name} - ${item.label} Evaluation`);
                        }}
                        className="p-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                        title="View Form"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          handleDownload(item.id, item.value);
                        }}
                        className="p-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all flex items-center justify-center"
                        title="Download Form"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* View Form Modal */}
      <Modal 
        isOpen={!!viewingForm} 
        onClose={() => {
          setViewingForm(null);
          setViewingFormTitle('');
        }} 
        title={viewingFormTitle || 'View Form'}
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

export default OpenPositionsPage;
