import React, { useState, useEffect } from 'react';
import { getFeatureMappings, createFeatureMapping, updateFeatureMapping, deleteFeatureMapping } from '../../api/featureMappings';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Search, Plus, Loader2, Cpu, Code, Trash2, Edit3, Eye, Hash, Info, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const FeatureMappingPage = () => {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic rows for features
  const [hwFeatures, setHwFeatures] = useState(['']);
  const [swFeatures, setSwFeatures] = useState(['']);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const data = await getFeatureMappings();
      setMappings(data);
    } catch (error) {
      toast.error('Failed to fetch feature mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const filteredMappings = mappings.filter(m =>
    m.mapping_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        mapping_name: data.mapping_name,
        hardware_features: hwFeatures.filter(f => f.trim()),
        software_features: swFeatures.filter(f => f.trim())
      };

      if (modalMode === 'create') {
        await createFeatureMapping(payload);
        toast.success('Feature Mapping added successfully');
      } else {
        await updateFeatureMapping(selectedMapping.mapping_id, payload);
        toast.success('Feature Mapping updated successfully');
      }
      setIsModalOpen(false);
      fetchMappings();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedMapping(null);
    reset({ mapping_name: '' });
    setHwFeatures(['']);
    setSwFeatures(['']);
    setIsModalOpen(true);
  };

  const handleEdit = (mapping) => {
    setModalMode('edit');
    setSelectedMapping(mapping);
    reset({ mapping_name: mapping.mapping_name });
    setHwFeatures(mapping.hardware_features?.length > 0 ? mapping.hardware_features : ['']);
    setSwFeatures(mapping.software_features?.length > 0 ? mapping.software_features : ['']);
    setIsModalOpen(true);
  };

  const handleView = (mapping) => {
    setModalMode('view');
    setSelectedMapping(mapping);
    setIsModalOpen(true);
  };

  const handleDelete = async (mapping) => {
    if (!window.confirm(`Are you sure you want to delete ${mapping.mapping_name}?`)) return;
    try {
      await deleteFeatureMapping(mapping.mapping_id);
      toast.success('Feature Mapping deleted successfully');
      fetchMappings();
    } catch (error) {
      toast.error('Failed to delete mapping');
    }
  };

  const addFeatureRow = (setter) => setter(prev => [...prev, '']);
  const removeFeatureRow = (index, setter) => setter(prev => prev.filter((_, i) => i !== index));
  const updateFeatureRow = (index, value, setter) => {
    setter(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const columns = [
    { key: 'mapping_name', label: 'Mapping Name' },
    { 
      key: 'hardware_features', 
      label: 'HW Features',
      render: (row) => (
        <span className="text-[11px] font-bold text-[var(--text-muted)]">
          {row.hardware_features?.length || 0} Items
        </span>
      )
    },
    { 
      key: 'software_features', 
      label: 'SW Features',
      render: (row) => (
        <span className="text-[11px] font-bold text-[var(--text-muted)]">
          {row.software_features?.length || 0} Items
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Date Created',
      render: (row) => (
        <span className="text-[11px] font-medium opacity-60">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Cpu size={28} className="text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">Feature Mapping</h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Manage Hardware & Software Feature Configurations
            </p>
          </div>
        </div>

        <button 
          onClick={handleOpenCreate} 
          className="btn-primary shadow-lg px-8 py-3 flex items-center gap-2"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} />
          <span className="text-[14px]">Add New Feature</span>
        </button>
      </div>

      <div className="workspace-card p-4 border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search mappings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-4 outline-none focus:border-[var(--accent)] transition-all text-[14px] text-[var(--text-main)] font-medium"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredMappings}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Add New Feature Mapping' : modalMode === 'edit' ? 'Update Feature Mapping' : 'Mapping Details'}
        maxWidth="max-w-5xl"
        headerActions={modalMode !== 'view' && (
          <button
            form="feature-mapping-form"
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2 px-6 shadow-md flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
            style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Create Mapping' : 'Update Mapping')}
          </button>
        )}
      >
        {modalMode === 'view' ? (
          <div className="space-y-8 py-4">
             <div className="border-b border-[var(--border-color)] pb-6">
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Mapping Designation</label>
                <div className="text-2xl font-black text-[var(--text-main)]">{selectedMapping?.mapping_name}</div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-[var(--accent)] border-b border-[var(--border-color)] pb-2">
                      <Cpu size={18} />
                      <h3 className="text-[11px] font-black uppercase tracking-widest">Hardware Features</h3>
                   </div>
                   <div className="space-y-2">
                      {selectedMapping?.hardware_features?.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-workspace)]/50 rounded-xl border border-[var(--border-color)]">
                           <CheckCircle2 size={14} className="text-emerald-500" />
                           <span className="text-[13px] font-bold text-[var(--text-main)] uppercase tracking-tight">{f}</span>
                        </div>
                      ))}
                      {(!selectedMapping?.hardware_features || selectedMapping.hardware_features.length === 0) && (
                        <p className="text-[12px] italic text-[var(--text-muted)] opacity-50">No hardware features defined.</p>
                      )}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-[var(--accent)] border-b border-[var(--border-color)] pb-2">
                      <Code size={18} />
                      <h3 className="text-[11px] font-black uppercase tracking-widest">Software Features</h3>
                   </div>
                   <div className="space-y-2">
                      {selectedMapping?.software_features?.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-workspace)]/50 rounded-xl border border-[var(--border-color)]">
                           <CheckCircle2 size={14} className="text-[var(--accent)]" />
                           <span className="text-[13px] font-bold text-[var(--text-main)] uppercase tracking-tight">{f}</span>
                        </div>
                      ))}
                      {(!selectedMapping?.software_features || selectedMapping.software_features.length === 0) && (
                        <p className="text-[12px] italic text-[var(--text-muted)] opacity-50">No software features defined.</p>
                      )}
                   </div>
                </div>
             </div>

             <div className="flex justify-end pt-4">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[var(--nav-hover)] transition-all">Close View</button>
             </div>
          </div>
        ) : (
          <form id="feature-mapping-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 py-4">
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Mapping Name</label>
                <input
                  {...register('mapping_name', { required: 'Mapping name is required' })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-dim)]"
                  placeholder="e.g. Standard Dispenser Features"
                />
                {errors.mapping_name && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.mapping_name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Hardware Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                    <div className="flex items-center gap-2 text-[var(--accent)]">
                      <Cpu size={18} />
                      <h3 className="text-[11px] font-black uppercase tracking-widest">Hardware Feature</h3>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {hwFeatures.map((feature, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          value={feature}
                          onChange={(e) => updateFeatureRow(idx, e.target.value, setHwFeatures)}
                          className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                          placeholder={`Feature #${idx + 1}`}
                        />
                        <button type="button" onClick={() => removeFeatureRow(idx, setHwFeatures)} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addFeatureRow(setHwFeatures)} className="flex items-center gap-2 text-[var(--accent)] text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-all ml-1 pt-2">
                    <Plus size={14} strokeWidth={3} />
                    <span>Add Hardware Row</span>
                  </button>
                </div>

                {/* Software Section */}
                <div className="space-y-4 border-l border-[var(--border-color)] pl-10">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                    <div className="flex items-center gap-2 text-[var(--accent)]">
                      <Code size={18} />
                      <h3 className="text-[11px] font-black uppercase tracking-widest">Software Feature</h3>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {swFeatures.map((feature, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          value={feature}
                          onChange={(e) => updateFeatureRow(idx, e.target.value, setSwFeatures)}
                          className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                          placeholder={`Feature #${idx + 1}`}
                        />
                        <button type="button" onClick={() => removeFeatureRow(idx, setSwFeatures)} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addFeatureRow(setSwFeatures)} className="flex items-center gap-2 text-[var(--accent)] text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-all ml-1 pt-2">
                    <Plus size={14} strokeWidth={3} />
                    <span>Add Software Row</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Submit buttons moved to modal header */}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default FeatureMappingPage;
