import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Save, Pencil, Trash2, ChevronDown, CheckCircle2, Eye, Download, UploadCloud, FileText, X } from 'lucide-react';
import Modal from '../../../components/shared/Modal';
import { getForms } from '../../../api/cefApi';
import axiosInstance from '../../../api/axiosInstance';
import { getPositions, createPosition, updatePosition, deletePosition } from '../../../api/openPositionsApi';
import { getAllModulesApi } from '../../../api/lms';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import CreatableSelect from 'react-select/creatable';
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
  const [viewingDocument, setViewingDocument] = useState(null);
  const [viewingDocumentTitle, setViewingDocumentTitle] = useState('');

  const getFormById = (id) => {
    if (!id) return null;
    for (const category of Object.values(formsByCategory)) {
      const found = category.find(f => f.id === id);
      if (found) return found;
    }
    return null;
  };

  const [lmsModules, setLmsModules] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    skills: [],
    knowledge: [],
    traits: [],
    self_image: [],
    motive: [],
    lms_training_ids: []
  });

  const [selectInputs, setSelectInputs] = useState({});

  const [files, setFiles] = useState({
    rcd_doc: null,
    prerequisite_doc: null,
    training_doc: null,
    eligibility_doc: null,
    kpi_doc: null,
    kra_doc: null
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [posRes, formsRes, lmsRes] = await Promise.all([
        getPositions(),
        getForms(),
        getAllModulesApi().catch(e => ({ success: false, data: [] }))
      ]);
      if (posRes.success) setPositions(posRes.data);
      if (formsRes.success) setFormsByCategory(formsRes.data);
      if (lmsRes && lmsRes.data && lmsRes.data.success) {
        setLmsModules(lmsRes.data.data);
      } else if (lmsRes && lmsRes.data) {
        setLmsModules(lmsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (pos = null) => {
    if (pos) {
      setEditingPosId(pos.id);
      
      let parsedTrainings = [];
      if (pos.lms_training_ids) {
        if (typeof pos.lms_training_ids === 'string') {
          try {
            parsedTrainings = JSON.parse(pos.lms_training_ids);
          } catch(e) {}
        } else if (Array.isArray(pos.lms_training_ids)) {
          parsedTrainings = pos.lms_training_ids;
        }
      }

      setFormData({
        name: pos.name,
        skills: Array.isArray(pos.skills) ? pos.skills : [],
        knowledge: Array.isArray(pos.knowledge) ? pos.knowledge : [],
        traits: Array.isArray(pos.traits) ? pos.traits : [],
        self_image: Array.isArray(pos.self_image) ? pos.self_image : [],
        motive: Array.isArray(pos.motive) ? pos.motive : [],
        lms_training_ids: parsedTrainings
      });
      setSelectInputs({});
      setFiles({
        rcd_doc: null, prerequisite_doc: null, training_doc: null, 
        eligibility_doc: null, kpi_doc: null, kra_doc: null
      });
    } else {
      setEditingPosId(null);
      setFormData({
        name: '',
        skills: [],
        knowledge: [],
        traits: [],
        self_image: [],
        motive: [],
        lms_training_ids: []
      });
      setSelectInputs({});
      setFiles({
        rcd_doc: null, prerequisite_doc: null, training_doc: null, 
        eligibility_doc: null, kpi_doc: null, kra_doc: null
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
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'lms_training_ids' || key === 'skills' || key === 'knowledge' || key === 'traits' || key === 'self_image' || key === 'motive') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        } else {
          formDataToSend.append(key, '');
        }
      });

      Object.keys(files).forEach(key => {
        if (files[key]) {
          formDataToSend.append(key, files[key]);
        }
      });

      if (editingPosId) {
        await updatePosition(editingPosId, formDataToSend);
      } else {
        await createPosition(formDataToSend);
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

  const buildOptions = (key) => {
    const set = new Set();
    positions.forEach(p => {
      if (Array.isArray(p[key])) {
        p[key].forEach(v => set.add(v));
      }
    });
    return Array.from(set).map(v => ({ value: v, label: v }));
  };

  const handleKeyDown = (event, key) => {
    if (!selectInputs[key]) return;
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        setFormData(prev => ({
          ...prev,
          [key]: [...(prev[key] || []), selectInputs[key]]
        }));
        setSelectInputs(prev => ({ ...prev, [key]: '' }));
        break;
      default:
    }
  };

  const handleBlur = (key) => {
    if (selectInputs[key]) {
      setFormData(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), selectInputs[key]]
      }));
      setSelectInputs(prev => ({ ...prev, [key]: '' }));
    }
  };

  const renderCreatableSelect = (label, key) => (
    <div className="flex flex-col space-y-1.5">
      <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</label>
      <CreatableSelect
        isMulti
        components={{ DropdownIndicator: null, Menu: () => null }}
        inputValue={selectInputs[key] || ''}
        onInputChange={(val) => setSelectInputs(prev => ({...prev, [key]: val}))}
        onKeyDown={(e) => handleKeyDown(e, key)}
        onBlur={() => handleBlur(key)}
        value={(formData[key] || []).map(v => ({ value: v, label: v }))}
        onChange={(selected) => setFormData({...formData, [key]: selected ? selected.map(s => s.value) : []})}
        className="text-sm"
        placeholder={`Type...`}
        styles={{
          control: (base) => ({
            ...base,
            backgroundColor: 'var(--bg-workspace)',
            borderColor: 'var(--border-color)',
            borderRadius: '0.5rem',
            minHeight: '36px',
            boxShadow: 'none',
            '&:hover': { borderColor: 'var(--accent)' }
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px'
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: 'var(--text-main)',
            fontWeight: '600',
            padding: '4px 8px'
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            ':hover': {
              backgroundColor: 'rgba(255,0,0,0.1)',
              color: 'red'
            }
          }),
          input: (base) => ({
            ...base,
            color: 'var(--text-main)'
          })
        }}
      />
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-8">
      {!isModalOpen ? (
        <>
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
            
            <div className="relative mb-3 z-10 pr-24 min-h-[40px]">
              <h3 className="text-lg font-black text-[var(--text-main)] mb-1 leading-tight break-words">{pos.name}</h3>
              <span className="inline-block whitespace-nowrap text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-workspace)] border border-[var(--border-color)] px-2.5 py-1 rounded-full shadow-sm mt-1">
                Created {pos.created_at ? format(new Date(pos.created_at), 'MMM dd, yyyy') : pos.date}
              </span>
              
              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button 
                  onClick={() => setViewingPositionOverview(pos)}
                  className="p-2 rounded-full bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                  title="View Position Overview"
                >
                  <Eye size={14} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={() => handleOpenModal(pos)}
                  className="p-2 rounded-full bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                  title="Edit Position"
                >
                  <Pencil size={14} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={() => handleDelete(pos.id)}
                  className="p-2 rounded-full bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-red-400 hover:text-red-500 text-[var(--text-dim)] shadow-sm transition-all"
                  title="Delete Position"
                >
                  <Trash2 size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 mt-4 border-t border-[var(--border-color)] pt-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)] mb-1.5">Evaluation Criteria</h4>
              
              <div className="grid grid-cols-2 gap-3 mt-3">
                {[
                  { label: 'Skills', tags: pos.skills },
                  { label: 'Knowledge', tags: pos.knowledge },
                  { label: 'Traits', tags: pos.traits },
                  { label: 'Self Image', tags: pos.self_image },
                  { label: 'Motive', tags: pos.motive }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{item.label}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.tags && item.tags.length > 0 ? (
                        <>
                          {item.tags.slice(0, 2).map((tag, tIdx) => (
                            <span key={tIdx} className="text-[10px] font-medium bg-[var(--bg-workspace)] border border-[var(--border-color)] px-2 py-0.5 rounded text-[var(--text-main)] truncate max-w-[80px]" title={tag}>
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 2 && (
                            <span className="text-[9px] font-bold bg-[var(--bg-workspace)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[var(--text-dim)] cursor-help" title={item.tags.slice(2).join(', ')}>
                              +{item.tags.length - 2}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] font-medium text-[var(--text-dim)] italic">None provided</span>
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
      </>
      ) : (
        <div className="animate-entrance-down bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-4 lg:p-6 max-w-6xl mx-auto mt-12 relative z-10">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
            <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-widest">
              {editingPosId ? 'Edit Position' : 'Add New Position'}
            </h2>
            <button 
              type="button"
              onClick={handleCloseModal}
              className="p-2 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all text-[var(--text-dim)] flex items-center gap-2"
            >
              <X size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Close</span>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--bg-workspace)]/50 p-4 rounded-xl border border-[var(--border-color)] flex flex-col justify-center">
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Name of the Position *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Senior Frontend Developer"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors font-semibold"
                />
              </div>

              <div className="bg-[var(--bg-workspace)]/50 p-4 rounded-xl border border-[var(--border-color)] flex flex-col">
                <h4 className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  Link LMS Trainings
                </h4>
                <div className="max-h-24 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 custom-scrollbar">
                  {lmsModules && lmsModules.length > 0 ? lmsModules.map(module => {
                    const currentIds = Array.isArray(formData.lms_training_ids) ? formData.lms_training_ids : [];
                    return (
                      <label key={module.module_id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={currentIds.includes(module.module_id) || currentIds.includes(String(module.module_id))}
                          onChange={(e) => {
                            const newIds = e.target.checked 
                              ? [...currentIds, module.module_id]
                              : currentIds.filter(id => id !== module.module_id && id !== String(module.module_id));
                            setFormData({...formData, lms_training_ids: newIds});
                          }}
                          className="w-3.5 h-3.5 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                        />
                        <span className="text-[11px] font-semibold text-[var(--text-main)] truncate" title={module.title}>{module.title}</span>
                      </label>
                    );
                  }) : (
                    <p className="text-[10px] text-[var(--text-muted)] italic">No LMS Modules available.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-workspace)]/50 p-4 rounded-xl border border-[var(--border-color)]">
              <h4 className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                Define Evaluation Criteria
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {renderCreatableSelect('Skills', 'skills')}
                {renderCreatableSelect('Knowledge', 'knowledge')}
                {renderCreatableSelect('Traits', 'traits')}
                {renderCreatableSelect('Self Image', 'self_image')}
                {renderCreatableSelect('Motive', 'motive')}
              </div>
            </div>

            <div className="bg-[var(--bg-workspace)]/50 p-4 rounded-xl border border-[var(--border-color)]">
              <h4 className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                Upload Documents (PDF)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: 'RCD Document', key: 'rcd_doc' },
                { label: 'Pre-requisite Document', key: 'prerequisite_doc' },
                { label: 'Training Document', key: 'training_doc' },
                { label: 'Eligibility Document', key: 'eligibility_doc' },
                { label: 'KPI Document', key: 'kpi_doc' },
                { label: 'KRA Document', key: 'kra_doc' }
              ].map((field) => (
                <div key={field.key} className="flex flex-col justify-end h-full">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex-1 flex items-end mb-1.5">{field.label}</label>
                  
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept=".pdf"
                      id={`file-${field.key}`}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFiles({...files, [field.key]: e.target.files[0]});
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    
                    <div className={`w-full p-2 rounded-lg border-2 border-dashed flex items-center justify-between transition-all ${
                      files[field.key] ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border-color)] bg-[var(--bg-card)] group-hover:border-[var(--accent)]/50 group-hover:bg-[var(--bg-workspace)]'
                    }`}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`p-1.5 rounded-md ${files[field.key] ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-workspace)] text-[var(--text-dim)] group-hover:text-[var(--accent)]'}`}>
                          {files[field.key] ? <FileText size={14} /> : <UploadCloud size={14} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[10px] font-bold truncate ${files[field.key] ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                            {files[field.key] ? files[field.key].name : 'Choose PDF'}
                          </span>
                          {!files[field.key] && editingPosId && positions.find(p => p.id === editingPosId)?.[field.key] && (
                            <span className="text-[9px] text-[var(--text-dim)] flex items-center gap-1">
                              <CheckCircle2 size={8} className="text-green-500" /> Attached
                            </span>
                          )}
                          {files[field.key] && (
                            <span className="text-[10px] text-[var(--text-dim)] font-medium">
                              {(files[field.key].size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {files[field.key] && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newFiles = { ...files };
                            newFiles[field.key] = null;
                            setFiles(newFiles);
                            // Also clear the actual input value
                            const input = document.getElementById(`file-${field.key}`);
                            if (input) input.value = '';
                          }}
                          className="p-1.5 rounded-lg hover:bg-white text-[var(--text-dim)] hover:text-red-500 z-20 relative transition-colors border border-transparent hover:border-red-200"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end pt-2 mt-2">
            <button 
              type="submit" 
              disabled={isSubmitting || !formData.name}
              className="btn-primary py-2 px-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : <><Save size={14} /> Save Position</>}
            </button>
          </div>
        </form>
        </div>
      )}

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
                { label: 'Skills', tags: viewingPositionOverview?.skills },
                { label: 'Knowledge', tags: viewingPositionOverview?.knowledge },
                { label: 'Traits', tags: viewingPositionOverview?.traits },
                { label: 'Self Image', tags: viewingPositionOverview?.self_image },
                { label: 'Motive', tags: viewingPositionOverview?.motive }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 p-3 bg-[var(--bg-workspace)]/50 rounded-lg border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{item.label}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                     {item.tags && item.tags.length > 0 ? item.tags.map((tag, tIdx) => (
                       <span key={tIdx} className="text-xs font-semibold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] px-2.5 py-1 rounded-md shadow-sm">
                         {tag}
                       </span>
                     )) : (
                       <span className="text-sm font-medium text-[var(--text-dim)] italic flex items-center gap-1.5">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-400/50" /> Not Set
                       </span>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)] border-b border-[var(--border-color)] pb-2">Position Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { label: 'RCD Document', key: 'rcd_doc' },
                { label: 'Pre-requisite Document', key: 'prerequisite_doc' },
                { label: 'Training Document', key: 'training_doc' },
                { label: 'Eligibility Document', key: 'eligibility_doc' },
                { label: 'KPI Document', key: 'kpi_doc' },
                { label: 'KRA Document', key: 'kra_doc' }
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-workspace)]/50 rounded-lg border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{doc.label}</span>
                  {viewingPositionOverview?.[doc.key] ? (
                    <button 
                      onClick={() => {
                        setViewingDocument(viewingPositionOverview[doc.key]);
                        setViewingDocumentTitle(`${viewingPositionOverview.name} - ${doc.label}`);
                      }}
                      className="p-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-dim)] shadow-sm transition-all"
                      title="View Document"
                    >
                      <Eye size={14} />
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-[var(--text-dim)] italic">None</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)] border-b border-[var(--border-color)] pb-2">Linked LMS Trainings</h4>
            <div className="flex flex-col gap-2">
              {viewingPositionOverview?.lms_training_ids?.length > 0 ? viewingPositionOverview.lms_training_ids.map((id, idx) => {
                const module = lmsModules.find(m => m.module_id === id || String(m.module_id) === String(id));
                return (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-[var(--bg-workspace)]/50 rounded-lg border border-[var(--border-color)]">
                    <CheckCircle2 size={14} className="text-[var(--accent)]" />
                    <span className="text-sm font-semibold text-[var(--text-main)]">{module ? module.title : `Module #${id}`}</span>
                  </div>
                );
              }) : (
                <div className="p-3 bg-[var(--bg-workspace)]/50 rounded-lg border border-[var(--border-color)]">
                  <span className="text-xs font-medium text-[var(--text-dim)] italic">No trainings linked.</span>
                </div>
              )}
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

      {/* View Document Modal */}
      <Modal 
        isOpen={!!viewingDocument} 
        onClose={() => {
          setViewingDocument(null);
          setViewingDocumentTitle('');
        }} 
        title={viewingDocumentTitle || 'View Document'}
        maxWidth="max-w-7xl"
      >
        <div className="w-full h-[85vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-[var(--border-color)]">
          {viewingDocument && (
            <iframe 
              src={viewingDocument}
              className="w-full h-full border-0"
              title="Document Preview"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default OpenPositionsPage;
