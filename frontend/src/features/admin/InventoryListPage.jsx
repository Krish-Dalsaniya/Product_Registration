import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { getAdminStats } from '../../api/admin';
import { getPCBs, createPCB, getPCBById, deletePCB, updatePCB, deletePCBImage } from '../../api/inventory';
import { 
  Search, 
  Plus, 
  Loader2, 
  Cpu, 
  Zap, 
  Layers, 
  Box, 
  ChevronRight, 
  Trash2,
  FileText,
  Activity,
  ArrowLeft,
  CircuitBoard,
  Plug,
  Info,
  Settings,
  Code,
  FileUp,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  ShieldCheck,
  Cpu as ProcessorIcon,
  Binary,
  HardDrive,
  Eye,
  Calendar,
  Fingerprint
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';

const InventoryListPage = ({ type = '' }) => {
  const navigate = useNavigate();
  const FILE_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ pcb: 0, electronics: 0, electrical: 0, structural: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalTab, setModalTab] = useState('general');

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    mode: 'onChange'
  });

  const fetchStats = async () => {
    try {
      const res = await getAdminStats();
      if (res.data?.data?.inventory) {
        setStats(res.data.data.inventory);
      }
    } catch (error) {
      console.error('Failed to fetch inventory stats', error);
    }
  };

  const fetchItems = async () => {
    if (!type) return;
    setLoading(true);
    try {
      if (type === 'PCB') {
        const res = await getPCBs({
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm
        });
        setItems(res.data.data);
        setPagination(prev => ({ ...prev, total: res.data.meta.total }));
      } else {
          setItems([]);
      }
    } catch (error) {
      toast.error(`Failed to fetch ${type} records`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [type]);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [type, pagination.page, searchTerm]);

  const onSubmit = async (data) => {
    if (modalMode === 'view') return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (!key.startsWith('file_') && key !== 'pcb_images') {
           formData.append(key, data[key]);
        }
      });

      const fileFields = [
        'file_gerber', 'file_board', 'file_schematic', 'file_bom', 
        'file_stencile', 'file_panel_gerber', 'file_layer_stack', 'file_production_note'
      ];
      fileFields.forEach(field => {
        if (data[field] && data[field][0]) {
          formData.append(field, data[field][0]);
        }
      });

      if (data.pcb_images && data.pcb_images.length > 0) {
        Array.from(data.pcb_images).forEach(file => {
          formData.append('pcb_images', file);
        });
      }

      if (type === 'PCB') {
          if (modalMode === 'create') {
              await createPCB(formData);
              toast.success('PCB registered successfully!');
          } else if (modalMode === 'edit') {
              await updatePCB(selectedItem.pcb_id, formData);
              toast.success('PCB specifications updated!');
          }
      }

      setIsModalOpen(false);
      reset();
      fetchItems();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedItem(null);
    setModalTab('general');
    reset({
        pcb_name: '', part_number: '', pcb_description: '', pcb_type: '', pcb_type_desc: '',
        processor_type: '', processor_part_no: '', processor_count: 0, processor_desc: '',
        firmware_branch: '', firmware_version: '', firmware_feature: '', firmware_feature_desc: ''
    });
    setIsModalOpen(true);
  };

  const handleView = async (item) => {
    setModalMode('view');
    setIsModalOpen(true);
    try {
        const res = await getPCBById(item.pcb_id);
        const fullData = res.data.data;
        setSelectedItem(fullData);
        reset({ ...fullData, part_number: fullData.part_no, pcb_description: fullData.description });
    } catch (error) {
        toast.error('Failed to load PCB details');
    }
  };

  const handleEdit = async (item) => {
    setModalMode('edit');
    setModalTab('general');
    setIsModalOpen(true);
    try {
        const res = await getPCBById(item.pcb_id);
        const fullData = res.data.data;
        setSelectedItem(fullData);
        reset({ ...fullData, part_number: fullData.part_no, pcb_description: fullData.description });
    } catch (error) {
        toast.error('Failed to load PCB details');
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete PCB: ${item.pcb_name}?`)) {
      try {
        await deletePCB(item.pcb_id);
        toast.success('PCB deleted successfully');
        fetchItems();
        fetchStats();
      } catch (error) {
        toast.error('Failed to delete PCB');
      }
    }
  };

  const handleRemoveImage = async (imageUrl) => {
    if (window.confirm('Are you sure you want to remove this image?')) {
        try {
            await deletePCBImage(selectedItem.pcb_id, imageUrl);
            toast.success('Image removed successfully');
            // Refresh the item data
            const res = await getPCBById(selectedItem.pcb_id);
            const fullData = res.data.data;
            setSelectedItem(fullData);
            reset({ ...fullData, part_number: fullData.part_no, pcb_description: fullData.description });
        } catch (error) {
            toast.error('Failed to remove image');
        }
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const fullUrl = `${FILE_BASE_URL}/${url}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || url.split(/[\\/]/).pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed. Opening in new tab instead.');
      window.open(`${FILE_BASE_URL}/${url}`, '_blank');
    }
  };

  const getTypeIcon = (itemType = type) => {
    switch (itemType) {
      case 'PCB': return <Cpu size={24} className="text-[var(--accent)]" />;
      case 'Electronic Part': return <CircuitBoard size={24} className="text-[var(--accent)]" />;
      case 'Electrical Part': return <Plug size={24} className="text-[var(--accent)]" />;
      case 'Structural Component': return <Layers size={24} className="text-[var(--accent)]" />;
      default: return <Box size={24} className="text-[var(--accent)]" />;
    }
  };

  const StatCard = ({ title, count, icon: Icon, to, colorAccent }) => (
    <div
      onClick={() => navigate(to)}
      className="workspace-card p-6 flex items-center justify-between group cursor-pointer overflow-hidden relative border border-[var(--border-color)] bg-[var(--bg-card)] transition-all duration-300 hover:shadow-lg"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: colorAccent }} />
      <div className="space-y-1 relative z-10">
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{title}</p>
        <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight group-hover:text-[var(--accent)] transition-colors duration-300">{count}</h3>
      </div>
      <div 
        className="p-4 rounded-2xl transition-all duration-400 relative z-10 group-hover:scale-110 group-hover:rotate-6"
        style={{ background: 'var(--nav-hover)' }}
      >
        <Icon size={24} style={{ color: colorAccent }} strokeWidth={2.5} />
      </div>
    </div>
  );

  const FileInput = ({ label, name, accept = "*", existingUrl }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <input 
          type="file" 
          {...register(name)} 
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        <div className="flex items-center gap-4 p-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl group-hover:border-[var(--accent)] transition-all">
          <div className="w-10 h-10 rounded-lg bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)]">
            <FileUp size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[var(--text-main)] truncate">
              {existingUrl ? existingUrl.split(/[\\/]/).pop() : 'Click or drag to upload'}
            </p>
            {existingUrl && (
              <button 
                type="button"
                onClick={() => handleDownload(existingUrl)}
                className="text-[10px] text-[var(--accent)] font-black uppercase flex items-center gap-1 mt-1 hover:underline relative z-20"
              >
                <Download size={10} /> Download File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const FormField = ({ label, name, placeholder, type = "text", required = false }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input 
        type={type}
        {...register(name, { required: required ? `${label} is required` : false })}
        placeholder={placeholder}
        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all placeholder:text-[var(--text-dim)] font-bold"
      />
      {errors[name] && <p className="text-rose-500 text-[10px] font-black uppercase tracking-wider ml-1 mt-1">{errors[name].message}</p>}
    </div>
  );

  const TextAreaField = ({ label, name, placeholder }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{label}</label>
      <textarea 
        {...register(name)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-dim)] font-bold resize-none"
      />
    </div>
  );

  const DataSheetEntry = ({ label, value, icon: Icon }) => (
    <div className="bg-[var(--bg-workspace)]/40 p-4 rounded-2xl border border-[var(--border-color)]/60 hover:border-[var(--accent)]/30 transition-all group">
      <div className="flex items-center gap-3 mb-1.5">
        {Icon && <Icon size={14} className="text-[var(--accent)]" />}
        <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">{label}</p>
      </div>
      <p className="text-[15px] font-black text-[var(--text-main)] tracking-tight leading-snug">{value || 'Not Defined'}</p>
    </div>
  );

  const FileCard = ({ label, url }) => (
    <div className="flex items-center justify-between p-4.5 bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] rounded-2xl group hover:border-[var(--accent)] transition-all relative overflow-hidden">
       <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 bg-[var(--nav-hover)] rounded-xl text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{label}</p>
            <p className="text-[13px] font-bold text-[var(--text-main)] truncate max-w-[140px]">{url ? url.split(/[\\/]/).pop() : 'Not Available'}</p>
          </div>
       </div>
       <div className="flex items-center gap-2.5">
          {url && (
            <>
              <a 
                href={`${FILE_BASE_URL}/${url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                title="View File"
                className="p-3 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
              >
                <Eye size={16} />
              </a>
              <button 
                onClick={() => handleDownload(url)}
                title="Download File"
                className="p-3 bg-[var(--accent)] text-white rounded-xl shadow-md hover:scale-105 transition-transform"
              >
                <Download size={16} />
              </button>
            </>
          )}
       </div>
    </div>
  );

  const pcbColumns = [
    { key: 'pcb_name', label: 'PCB Name' },
    { key: 'part_no', label: 'Part Number' },
    { key: 'processor_count', label: 'Processors' },
    { key: 'created_at', label: 'Registered On', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            {getTypeIcon()}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">
              {type ? `${type}s` : 'Inventory Overview'}
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              {type ? `${type} Inventory & Stock Management` : 'Central Hardware & Components Registry'}
            </p>
          </div>
        </div>
        {type && (
          <button 
            onClick={handleOpenCreate}
            className="btn-primary shadow-lg px-8 py-3 group"
            style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] md:text-[14px]">Add New {type}</span>
          </button>
        )}
      </div>

      {/* Overview Stats */}
      {!type && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="PCB Units" count={stats.pcb} icon={Cpu} to="/admin/inventory/pcb" colorAccent="var(--accent)" />
          <StatCard title="Electronics" count={stats.electronics} icon={CircuitBoard} to="/admin/inventory/electronics" colorAccent="#3b82f6" />
          <StatCard title="Electrical" count={stats.electrical} icon={Plug} to="/admin/inventory/electrical" colorAccent="#f59e0b" />
          <StatCard title="Structural" count={stats.structural} icon={Layers} to="/admin/inventory/structural" colorAccent="#10b981" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="workspace-card p-4 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
            <input 
              type="text" 
              placeholder={type ? `Search ${type}s...` : "Search across all inventory categories..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
            />
          </div>
        </div>

        {type ? (
          <DataTable 
            columns={type === 'PCB' ? pcbColumns : []}
            data={items}
            loading={loading}
            totalCount={pagination.total}
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <div className="p-12 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] border-dashed">
            <div className="w-16 h-16 bg-[var(--nav-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[var(--text-dim)] opacity-40">
              <Box size={32} />
            </div>
            <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Select a category above to view detailed records</p>
          </div>
        )}
      </div>

      {/* PCB Management Modal */}
      <Modal 
        isOpen={isModalOpen && type === 'PCB'} 
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? "Register New PCB Architecture" : modalMode === 'edit' ? "Edit PCB Specifications" : "Technical Data Sheet"}
        maxWidth="max-w-6xl"
        headerActions={
          <div className="flex items-center gap-3">
             {modalMode !== 'view' && (
                <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className="btn-primary py-2.5 px-8 shadow-md flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save' : 'Update Specs')}
                </button>
             )}
          </div>
        }
      >
        {modalMode === 'view' ? (
          /* Unified View Mode (Data Sheet) */
          <div className="space-y-10 pb-10 max-h-[82vh] overflow-y-auto custom-scrollbar pr-4">
             {/* Master Header - REFINED COMPACT DESIGN */}
             <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-color)] relative overflow-hidden shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                   <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5 text-[12px] font-black text-[var(--text-dim)] uppercase tracking-widest">
                            <Layers size={14} className="text-[var(--accent)]" />
                            {selectedItem?.pcb_type || 'Main PCB'}
                        </div>
                      </div>
                      <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">{selectedItem?.pcb_name}</h2>
                      <div className="flex flex-wrap items-center gap-5 text-[12px] font-bold text-[var(--text-muted)]">
                        <div className="flex items-center gap-3 bg-[var(--bg-workspace)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                           <Fingerprint size={14} className="text-[var(--accent)]" />
                           <span className="uppercase text-[10px] opacity-60 font-black">Part ID:</span>
                           <span className="text-[var(--text-main)] font-mono text-[14px]">{selectedItem?.part_no}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[var(--bg-workspace)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                           <ProcessorIcon size={14} className="text-[var(--accent)]" />
                           <span className="uppercase text-[10px] opacity-60 font-black">Processors:</span>
                           <span className="text-[var(--text-main)] text-[14px]">{selectedItem?.processor_count}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[var(--bg-workspace)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                           <Calendar size={14} className="text-[var(--accent)]" />
                           <span className="uppercase text-[10px] opacity-60 font-black">Registered:</span>
                           <span className="text-[var(--text-main)] text-[14px]">{new Date(selectedItem?.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                   </div>
                   
                   {/* Compact Description In Header */}
                   <div className="lg:max-w-[450px] w-full p-6 bg-[var(--bg-workspace)] rounded-2xl border border-[var(--border-color)] shadow-inner relative">
                      <div className="absolute -top-3 left-6 bg-[var(--bg-workspace)] px-3 py-1 border border-[var(--border-color)] rounded-lg">
                        <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                           PCB OVERVIEW
                        </p>
                      </div>
                      <p className="text-[14px] text-[var(--text-main)] leading-relaxed font-bold opacity-90 mt-2">
                        {selectedItem?.description || 'No detailed technical description provided for this architecture.'}
                      </p>
                   </div>
                </div>
             </div>

             {/* Technical Specs Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Processor Specifications */}
                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                   <div className="flex items-center gap-4 mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-inner"><ProcessorIcon size={22} /></div>
                      <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Hardware Profile</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <DataSheetEntry label="Core Architecture" value={selectedItem?.processor_type} icon={Cpu} />
                      <DataSheetEntry label="Component Part No" value={selectedItem?.processor_part_no} icon={HardDrive} />
                      <div className="sm:col-span-2">
                        <DataSheetEntry label="Technical Notes" value={selectedItem?.processor_desc} icon={Info} />
                      </div>
                   </div>
                </div>

                {/* Firmware Profile */}
                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                   <div className="flex items-center gap-4 mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-inner"><Binary size={22} /></div>
                      <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Firmware Build</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <DataSheetEntry label="Active Branch" value={selectedItem?.firmware_branch} icon={Code} />
                      <DataSheetEntry label="Version Spec" value={selectedItem?.firmware_version} icon={CheckCircle2} />
                      <DataSheetEntry label="Primary Feature" value={selectedItem?.firmware_feature} icon={Zap} />
                      <DataSheetEntry label="Release Context" value={selectedItem?.firmware_feature_desc} icon={Info} />
                   </div>
                </div>
             </div>

             {/* Documentation Library */}
             <div className="space-y-6">
                <div className="flex items-center gap-4 ml-4">
                   <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-sm"><FileUp size={20} /></div>
                   <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Documentation Library</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                   <FileCard label="Gerber File" url={selectedItem?.files?.processor_file_url} />
                   <FileCard label="Board File" url={selectedItem?.files?.brd_file_url} />
                   <FileCard label="Schematics" url={selectedItem?.files?.sch_file_url} />
                   <FileCard label="BOM File" url={selectedItem?.files?.bom_file_url} />
                   <FileCard label="Stencil Data" url={selectedItem?.files?.stencil_file_url} />
                   <FileCard label="Panel Gerber" url={selectedItem?.files?.panel_gerber_file_url} />
                   <FileCard label="Layer Stacking" url={selectedItem?.files?.layer_stacking_file_url} />
                   <FileCard label="Production Note" url={selectedItem?.files?.production_instruction_url} />
                </div>
             </div>

             {/* Image Gallery */}
             {selectedItem?.pcb_images && selectedItem.pcb_images.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 ml-4">
                        <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-sm"><ImageIcon size={20} /></div>
                        <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Architecture Visuals</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {selectedItem.pcb_images.map((img, idx) => (
                           <div key={idx} className="aspect-square rounded-[24px] border-2 border-[var(--border-color)] overflow-hidden bg-[var(--bg-workspace)] group relative cursor-pointer shadow-md">
                                <img src={`${FILE_BASE_URL}/${img}`} alt="PCB Visual" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <a href={`${FILE_BASE_URL}/${img}`} target="_blank" rel="noreferrer" title="View Image" className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-[var(--accent)] hover:scale-110 transition-all border border-white/20 shadow-lg"><Eye size={22} /></a>
                                    <button onClick={() => handleDownload(img)} title="Download Image" className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-[var(--accent)] hover:scale-110 transition-all border border-white/20 shadow-lg"><Download size={22} /></button>
                                </div>
                           </div>
                        ))}
                    </div>
                </div>
             )}
          </div>
        ) : (
          /* Create / Edit Mode (Tabs) */
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Tab Navigation */}
            <div className="flex bg-[var(--bg-workspace)]/50 p-1.5 rounded-2xl mb-8 border border-[var(--border-color)]">
                {[
                { id: 'general', label: 'General', icon: Info },
                { id: 'processor', label: 'Processor', icon: Settings },
                { id: 'firmware', label: 'Firmware', icon: Code },
                { id: 'files', label: 'PCB Files', icon: FileUp }
                ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest ${modalTab === tab.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                >
                    <tab.icon size={14} strokeWidth={3} />
                    <span>{tab.label}</span>
                </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-4">
                <form id="pcb-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                
                {modalTab === 'general' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        <FormField label="PCB Name" name="pcb_name" placeholder="e.g. Main Control Board V2" required />
                        <FormField label="Part Number" name="part_number" placeholder="e.g. PCB-MCB-001" required />
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <FormField label="PCB Type" name="pcb_type" placeholder="e.g. 4-Layer FR4" />
                        <FormField label="PCB Type Description" name="pcb_type_desc" placeholder="Details about construction..." />
                    </div>
                    <TextAreaField label="PCB Description" name="pcb_description" placeholder="Technical overview and purpose of this board..." />
                    </div>
                )}

                {modalTab === 'processor' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        <FormField label="Processor Type" name="processor_type" placeholder="e.g. ARM Cortex-M4" />
                        <FormField label="Processor Part Number" name="processor_part_no" placeholder="e.g. STM32F405RGT6" />
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <FormField label="Processor Count" name="processor_count" type="number" placeholder="e.g. 1" />
                        <FormField label="Processor Description" name="processor_desc" placeholder="Package type, clock speed, etc..." />
                    </div>
                    </div>
                )}

                {modalTab === 'firmware' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        <FormField label="Firmware Branch Name" name="firmware_branch" placeholder="e.g. main / production-v1" />
                        <FormField label="Firmware Version Number" name="firmware_version" placeholder="e.g. v2.1.0-stable" />
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        <FormField label="Firmware Feature Name" name="firmware_feature" placeholder="e.g. CAN-FD Support" />
                        <TextAreaField label="Firmware Feature Description" name="firmware_feature_desc" placeholder="Describe the capabilities of this firmware build..." />
                    </div>
                    </div>
                )}

                {modalTab === 'files' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <FileInput label="Individual Gerber File" name="file_gerber" existingUrl={selectedItem?.files?.processor_file_url} />
                        <FileInput label="Board File (.brd/.pcb)" name="file_board" existingUrl={selectedItem?.files?.brd_file_url} />
                        <FileInput label="Schematic File (.sch/.pdf)" name="file_schematic" existingUrl={selectedItem?.files?.sch_file_url} />
                        <FileInput label="BOM File (.csv/.xlsx)" name="file_bom" existingUrl={selectedItem?.files?.bom_file_url} />
                        <FileInput label="Stencile File" name="file_stencile" existingUrl={selectedItem?.files?.stencil_file_url} />
                        <FileInput label="Panel Gerber File" name="file_panel_gerber" existingUrl={selectedItem?.files?.panel_gerber_file_url} />
                        <FileInput label="Layer Stacking File" name="file_layer_stack" existingUrl={selectedItem?.files?.layer_stacking_file_url} />
                        <FileInput label="Production Instruction File" name="file_production_note" existingUrl={selectedItem?.files?.production_instruction_url} />
                        <div className="md:col-span-2">
                        <div className="space-y-3 p-6 bg-[var(--nav-hover)]/30 border border-dashed border-[var(--border-color)] rounded-[24px]">
                            <div className="flex items-center gap-3 mb-4">
                                <ImageIcon size={18} className="text-[var(--accent)]" />
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)]">PCB Images Gallery</h4>
                            </div>

                            {modalMode === 'edit' && selectedItem?.pcb_images && selectedItem.pcb_images.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-6">
                                    {selectedItem.pcb_images.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl border border-[var(--border-color)] overflow-hidden group">
                                            <img src={`${FILE_BASE_URL}/${img}`} alt="Part" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                <a href={`${FILE_BASE_URL}/${img}`} target="_blank" rel="noreferrer" className="text-white hover:text-[var(--accent)]"><Eye size={16} /></a>
                                                <button type="button" onClick={() => handleRemoveImage(img)} className="text-rose-500 hover:text-white"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="relative group">
                            <input type="file" multiple {...register('pcb_images')} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <div className="w-full bg-[var(--bg-workspace)]/50 border border-dashed border-[var(--text-dim)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all">
                                <div className="p-4 bg-[var(--bg-workspace)] rounded-2xl text-[var(--accent)] shadow-sm"><Plus size={24} /></div>
                                <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest">Upload Multiple Board Photos</p>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>
                )}

                </form>
            </div>
          </div>
        )}
      </Modal>

      {/* Generic Modal for other types */}
      {isModalOpen && type !== 'PCB' && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'create' ? `Add ${type}` : modalMode === 'edit' ? `Update ${type}` : `${type} Details`}
          maxWidth="max-w-2xl"
        >
          <div className="p-10 text-center">
            <Activity size={48} className="mx-auto text-[var(--accent)] mb-4 animate-pulse" />
            <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-2">Interface Under Development</h3>
            <p className="text-[12px] text-[var(--text-muted)] font-bold tracking-widest uppercase opacity-60">Database integration and form schemas are pending initialization.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InventoryListPage;
