import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import Lightbox from '../../components/shared/Lightbox';
import ViewToggle from '../../components/shared/ViewToggle';
import { 
  getPCBById, deletePCBImage, deletePCBFile,
  getElectronicsPartById, getElectricalPartById, getStructuralPartById,
  deleteElectricalImage, deleteElectricalFile, deleteStructuralImage, deleteStructuralFile, deleteElectronicsImage, deleteElectronicsFile
} from '../../api/inventory';
import { 
  useInventoryStats, useInventoryOverview,
  useCreatePCB, useUpdatePCB, useDeletePCB,
  useUpdateElectronicsPart, useDeleteElectronicsPart,
  useUpdateElectricalPart, useDeleteElectricalPart,
  useUpdateStructuralPart, useDeleteStructuralPart,
  useAddInventoryStock
} from '../../hooks/useInventory';
import { 
  STRUCTURAL_SPEC_FIELDS, ELECTRONICS_SPEC_FIELDS, ELECTRICAL_SPEC_FIELDS,
  STRUCTURAL_CATEGORY_CONFIG, ELECTRONICS_CATEGORY_CONFIG, ELECTRICAL_CATEGORY_CONFIG 
} from '../../constants/inventorySpecs';
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
  Fingerprint,
  X,
  Factory,
  Ruler,
  Pencil,
  Maximize2,
  PackagePlus
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useStore } from 'react-redux';
import { saveDraft, clearDraft } from '../../store/slices/draftSlice';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

const InventoryListPage = ({ type = '' }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useStore();
  const { hasPermission } = useAuth();

  const FILE_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
  const buildFileUrl = (filePath) => {
    if (!filePath || filePath === "#") return null;

    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
    return `${baseUrl}/${filePath.startsWith('/') ? filePath.slice(1) : filePath}`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState({ isOpen: false, images: [], initialIndex: 0 });
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalTab, setModalTab] = useState('general');
  const [pendingImages, setPendingImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  // Derive formId for drafts
  const formId = useMemo(() => {
    if (!isModalOpen || modalMode === 'view') return null;
    return modalMode === 'create' 
      ? `inventory_create_${type || 'PCB'}` 
      : `inventory_edit_${selectedItem?.pcb_id || selectedItem?.part_id || selectedItem?.id || 'unknown'}`;
  }, [isModalOpen, modalMode, type, selectedItem]);

  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const { data: statsData } = useInventoryStats();
  const stats = statsData || { pcb: 0, electronics: 0, electrical: 0, structural: 0 };

  const { data: inventoryData, isLoading } = useInventoryOverview({ 
    type, 
    selectedCategory, 
    searchTerm: debouncedSearchTerm, 
    pagination 
  });
  
  let items = inventoryData?.data || [];
  if (stockStatusFilter) {
    items = items.filter(item => {
      const qty = item.stock_quantity ?? 0;
      if (stockStatusFilter === 'In Stock') return qty > 0;
      if (stockStatusFilter === 'Out of Stock') return qty === 0;
      return true;
    });
  }
  const loading = isLoading;

  useEffect(() => {
    if (inventoryData?.total !== undefined) {
      setPagination(prev => ({ ...prev, total: inventoryData.total }));
    }
  }, [inventoryData?.total]);

  // Mutations
  const createPCBMutation = useCreatePCB();
  const updatePCBMutation = useUpdatePCB();
  const deletePCBMutation = useDeletePCB();

  const updateElectronicsPartMutation = useUpdateElectronicsPart();
  const deleteElectronicsPartMutation = useDeleteElectronicsPart();

  const updateElectricalPartMutation = useUpdateElectricalPart();
  const deleteElectricalPartMutation = useDeleteElectricalPart();

  const updateStructuralPartMutation = useUpdateStructuralPart();
  const deleteStructuralPartMutation = useDeleteStructuralPart();

  const addStockMutation = useAddInventoryStock();
  const [quickAddModal, setQuickAddModal] = useState({ isOpen: false, item: null, quantityToAdd: '' });

  const handleQuickAddOpen = (item) => {
      setQuickAddModal({ isOpen: true, item, quantityToAdd: '' });
  };

  const handleQuickAddSubmit = async (e) => {
      e.preventDefault();
      const { item, quantityToAdd } = quickAddModal;
      const qty = parseInt(quantityToAdd, 10);
      if (!qty || qty <= 0) {
          toast.error('Please enter a valid quantity greater than 0');
          return;
      }
      
      try {
          const id = item.pcb_id || item.part_id || item.id;
          const category = item.category || type || 'PCB';
          
          await addStockMutation.mutateAsync({ category, id, quantityToAdd: qty });
          toast.success(`Successfully added ${qty} units to stock.`);
          setQuickAddModal({ isOpen: false, item: null, quantityToAdd: '' });
      } catch (err) {
          toast.error('Failed to add stock');
      }
  };

  const getFullUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
    return `${baseUrl}/${path.startsWith('/') ? path.slice(1) : path}`;
  };

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm({
    mode: 'onChange'
  });

  // Sync draft to Redux without triggering component re-renders
  useEffect(() => {
    if (!formId || !isModalOpen) return;
    
    const subscription = watch((value, { name, type }) => {
      // Avoid saving empty states when modal just opens
      if (value && Object.keys(value).length > 0) {
        dispatch(saveDraft({ formId, data: value, tab: modalTab }));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formId, modalTab, dispatch, isModalOpen]);

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
  
  const SelectField = ({ label, name, options, required = false }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <select 
        {...register(name, { required: required ? `${label} is required` : false })}
        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
      >
        <option value="">Select {label}</option>
        {options?.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
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

  const FileInput = ({ label, name, accept = "*", existingUrl }) => {
    const selectedFile = watch(name);
    const hasNewFile = selectedFile && selectedFile.length > 0;
    
    const fileName = hasNewFile 
      ? selectedFile[0].name 
      : (existingUrl ? existingUrl.split(/[\\/]/).pop() : 'Click or drag to upload');

    return (
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
          <input 
            type="file" 
            {...register(name)} 
            accept={accept}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
          />
          <div className={`flex items-center gap-4 p-3 bg-[var(--bg-workspace)] border ${hasNewFile ? 'border-[var(--accent)] ring-2 ring-[var(--border-glow)]' : 'border-[var(--border-color)]'} rounded-xl group-hover:border-[var(--accent)] transition-all`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasNewFile ? 'bg-[var(--accent)] text-white animate-pulse' : 'bg-[var(--nav-hover)] text-[var(--accent)]'}`}>
              <FileUp size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-bold truncate ${hasNewFile ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'}`}>
                {fileName}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {existingUrl && !hasNewFile && (
                  <>
                    <button 
                      type="button"
                      onClick={() => handleDownload(existingUrl)}
                      className="text-[10px] text-[var(--accent)] font-black uppercase flex items-center gap-1 hover:underline relative z-20"
                    >
                      <Download size={10} /> Download
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleRemoveFile(name)}
                      className="text-[10px] text-rose-500 font-black uppercase flex items-center gap-1 hover:underline relative z-20"
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </>
                )}
                {hasNewFile && (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setValue(name, null); }}
                    className="text-[10px] text-rose-500 font-black uppercase flex items-center gap-1 hover:underline relative z-20"
                  >
                    <X size={10} /> Clear Selection
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  useEffect(() => {
    if (pendingImages.length === 0) {
      setPreviews([]);
      return;
    }

    const newPreviews = pendingImages.map(file => {
      try {
        return {
          id: Math.random().toString(36).substr(2, 9),
          url: URL.createObjectURL(file),
          name: file.name
        };
      } catch (err) {
        console.error("Preview generation failed", err);
        return null;
      }
    }).filter(p => p !== null);

    setPreviews(newPreviews);

    // Cleanup function
    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [pendingImages]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPendingImages(prev => [...prev, ...files]);
    }
  };

  const removePendingImage = (index) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearPendingImages = () => {
    setPendingImages([]);
  };


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

      if (pendingImages.length > 0) {
        pendingImages.forEach(file => {
          formData.append('pcb_images', file);
        });
      }

      if (type === 'PCB' || selectedItem?.category === 'PCB') {
          if (modalMode === 'create') {
              await createPCBMutation.mutateAsync(formData);
              toast.success('PCB registered successfully!');
          } else if (modalMode === 'edit') {
              await updatePCBMutation.mutateAsync({ id: selectedItem.pcb_id, data: formData });
              toast.success('PCB specifications updated!');
          }
      } else {
          const category = selectedItem?.category;
          const id = selectedItem?.pcb_id || selectedItem?.part_id || selectedItem?.id;
          
          if (category === 'Electronic Part') {
              const specFields = Object.keys(data).filter(k => k.startsWith('spec_'));
              const specDataObj = {};
              specFields.forEach(k => { specDataObj[k.replace('spec_', '')] = data[k]; });
              formData.delete('spec_data'); 
              formData.append('spec_data', JSON.stringify(specDataObj));
              
              if (modalMode === 'edit') {
                  await updateElectronicsPartMutation.mutateAsync({ id, data: formData });
                  toast.success('Electronics Part updated!');
              }
          } else if (category === 'Electrical Part') {
              if (modalMode === 'edit') {
                  await updateElectricalPartMutation.mutateAsync({ id, data: formData });
                  toast.success('Electrical Part updated!');
              }
          } else if (category === 'Structural Part') {
              const specFields = Object.keys(data).filter(k => k.startsWith('spec_'));
              const specDataObj = {};
              specFields.forEach(k => { specDataObj[k.replace('spec_', '')] = data[k]; });
              formData.delete('spec_data'); 
              formData.append('spec_data', JSON.stringify(specDataObj));

              if (modalMode === 'edit') {
                  await updateStructuralPartMutation.mutateAsync({ id, data: formData });
                  toast.success('Structural Part updated!');
              }
          }
      }

      setIsModalOpen(false);
      reset();
      if (formId) {
        dispatch(clearDraft({ formId }));
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedItem(null);
    setPendingImages([]);
    
    const draftId = `inventory_create_${type || 'PCB'}`;
    const draft = store.getState().drafts[draftId];
    
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
        reset(draft.data);
        setModalTab(draft.tab || 'general');
    } else {
        setModalTab('general');
        reset({
            pcb_name: '', part_number: '', pcb_description: '', pcb_type: '', pcb_type_desc: '',
            processor_type: '', processor_part_no: '', processor_count: 0, processor_desc: '',
            firmware_branch: '', firmware_version: '', firmware_feature: '', firmware_feature_desc: ''
        });
    }
    
    setIsModalOpen(true);
  };

  const loadPCBDetails = async (id, mode) => {
      try {
          const res = await getPCBById(id);
          const fullData = { ...res.data.data, category: 'PCB' };
          setSelectedItem(fullData);
          
          if (mode === 'edit') {
            const draftId = `inventory_edit_${id}`;
            const draft = store.getState().drafts[draftId];
            if (draft && draft.data && Object.keys(draft.data).length > 0) {
              reset(draft.data);
              setModalTab(draft.tab || 'general');
            } else {
              reset({ ...fullData, part_number: fullData.part_no, pcb_description: fullData.description });
            }
          } else {
            reset({ ...fullData, part_number: fullData.part_no, pcb_description: fullData.description });
          }
          
          if (mode) setModalMode(mode);
      } catch (error) {
          toast.error('Failed to load PCB details');
      }
  };

  const loadElectronicsDetails = async (id, mode) => {
      try {
          const res = await getElectronicsPartById(id);
          const fullData = { ...res.data.data, category: 'Electronic Part' };
          setSelectedItem(fullData);
          
          // Map technical specs to form
          let formData = { ...fullData, ...fullData.techSpec };
          if (fullData.categorySpec) {
              formData.category_name = fullData.categorySpec.category_name;
              if (fullData.categorySpec.spec_data) {
                  const specData = typeof fullData.categorySpec.spec_data === 'string' 
                    ? JSON.parse(fullData.categorySpec.spec_data) 
                    : fullData.categorySpec.spec_data;
                  Object.keys(specData).forEach(k => { formData[`spec_${k}`] = specData[k]; });
              }
          }
          reset(formData);
          if (mode) setModalMode(mode);
      } catch (error) {
          toast.error('Failed to load Electronics details');
      }
  };

  const loadElectricalDetails = async (id, mode) => {
      try {
          const res = await getElectricalPartById(id);
          const fullData = { ...res.data.data, category: 'Electrical Part' };
          setSelectedItem(fullData);
          reset(fullData);
          if (mode) setModalMode(mode);
      } catch (error) {
          toast.error('Failed to load Electrical details');
      }
  };

  const loadStructuralDetails = async (id, mode) => {
      try {
          const res = await getStructuralPartById(id);
          const fullData = { ...res.data.data, category: 'Structural Part' };
          setSelectedItem(fullData);
          
          let formData = { ...fullData, ...fullData.techSpec };
          if (fullData.categorySpec) {
              formData.category_name = fullData.categorySpec.category_name;
              if (fullData.categorySpec.spec_data) {
                  const specData = typeof fullData.categorySpec.spec_data === 'string' 
                    ? JSON.parse(fullData.categorySpec.spec_data) 
                    : fullData.categorySpec.spec_data;
                  Object.keys(specData).forEach(k => { formData[`spec_${k}`] = specData[k]; });
              }
          } else if (fullData.categoryData) {
              // Handle case where it might be in categoryData
              Object.keys(fullData.categoryData).forEach(k => { formData[`spec_${k}`] = fullData.categoryData[k]; });
          }
          
          reset(formData);
          if (mode) setModalMode(mode);
      } catch (error) {
          toast.error('Failed to load Structural details');
      }
  };

  const handleView = async (item) => {
    setSelectedItem(item);
    setModalMode('view');
    setModalTab('general');
    setActiveImageIdx(0);
    setIsModalOpen(true);
    setPendingImages([]);
    
    const id = item.pcb_id;
    const category = item.category || type || 'PCB';

    if (id) {
        if (category === 'PCB') {
            await loadPCBDetails(id);
        } else if (category === 'Electronic Part') {
            await loadElectronicsDetails(id);
        } else if (category === 'Electrical Part') {
            await loadElectricalDetails(id);
        } else if (category === 'Structural Part') {
            await loadStructuralDetails(id);
        }
    }
  };

   const handleEdit = async (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setModalTab('general');
    setIsModalOpen(true);
    setPendingImages([]);
    
    const id = item.pcb_id || item.part_id || item.id;
    const itemType = item.category || type || 'PCB';
    if (id) {
        if (itemType === 'PCB') {
            await loadPCBDetails(id);
        } else if (itemType === 'Electronic Part') {
            navigate('/admin/inventory/electronics', { state: { editId: id } });
            setIsModalOpen(false);
        } else if (itemType === 'Electrical Part') {
            navigate('/admin/inventory/electrical', { state: { editId: id } });
            setIsModalOpen(false);
        } else if (itemType === 'Structural Part') {
            navigate('/admin/inventory/structural', { state: { editId: id } });
            setIsModalOpen(false);
        }
    }
  };

  const handleDelete = async (item) => {
    const itemType = item.category || 'PCB';
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete ${itemType}: ${item.pcb_name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      try {
        if (itemType === 'PCB') {
            await deletePCBMutation.mutateAsync(item.pcb_id);
        } else if (itemType === 'Electronic Part') {
            await deleteElectronicsPartMutation.mutateAsync(item.pcb_id); 
        } else if (itemType === 'Electrical Part') {
            await deleteElectricalPartMutation.mutateAsync(item.pcb_id);
        } else if (itemType === 'Structural Part') {
            await deleteStructuralPartMutation.mutateAsync(item.pcb_id);
        }
        toast.success(`${itemType} deleted successfully`);
      } catch (error) {
        toast.error(`Failed to delete ${itemType}`);
      }
    }
  };

  const handleRemoveImage = async (imageUrl) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to remove this image?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, remove it!'
    });
    if (result.isConfirmed) {
        try {
            const category = selectedItem?.category;
            const id = selectedItem?.pcb_id || selectedItem?.part_id || selectedItem?.id;
            
            if (category === 'PCB' || !category) {
                await deletePCBImage(id, imageUrl);
                loadPCBDetails(id, 'edit');
            } else if (category === 'Electronic Part') {
                // Electronics doesn't have a specific deleteImage API in the provided snippet?
                // Wait, I should check electronicsController.js again.
                // Actually, let's assume it doesn't have one if not in api/inventory.js.
                toast.error('Image removal for Electronics not implemented in API');
            } else if (category === 'Electrical Part') {
                await deleteElectricalImage(id, imageUrl);
                loadElectricalDetails(id, 'edit');
            } else if (category === 'Structural Part') {
                await deleteStructuralImage(id, imageUrl);
                loadStructuralDetails(id, 'edit');
            }
            toast.success('Image removed successfully');
        } catch (error) {
            toast.error('Failed to remove image');
        }
    }
  };

  const handleRemoveFile = async (fieldName) => {
    if (!selectedItem) return;
    
    const category = selectedItem?.category;
    const id = selectedItem?.pcb_id || selectedItem?.part_id || selectedItem?.id;

    const pcbMapping = {
        'file_gerber': 'processor_file_url',
        'file_board': 'brd_file_url',
        'file_schematic': 'sch_file_url',
        'file_bom': 'bom_file_url',
        'file_stencile': 'stencil_file_url',
        'file_panel_gerber': 'panel_gerber_file_url',
        'file_layer_stack': 'layer_stacking_file_url',
        'file_production_note': 'production_instruction_url'
    };

    const electronicsMapping = {
        'file_datasheet': 'datasheet_url',
        'file_wiring': 'wiring_diagram_url',
        'file_manual': 'user_manual_url',
        'file_test_report': 'test_report_url',
        'file_calib_cert': 'calibration_cert_url',
        'file_warranty': 'warranty_cert_url',
        'file_invoice': 'invoice_url'
    };

    const electricalMapping = {
        'file_datasheet': 'datasheet_url',
        'file_wiring': 'wiring_diagram_url',
        'file_manual': 'installation_manual_url',
        'file_test_report': 'test_report_url',
        'file_calib_cert': 'calibration_cert_url',
        'file_compliance': 'compliance_cert_url',
        'file_warranty': 'warranty_doc_url',
        'file_invoice': 'invoice_url'
    };

    const structuralMapping = {
        'file_2d_drawing': 'file_2d_drawing',
        'file_3d_model': 'file_3d_model',
        'file_fabrication_drawing': 'file_fabrication_drawing',
        'file_assembly_drawing': 'file_assembly_drawing',
        'file_cutting': 'file_cutting'
    };

    let dbField = null;
    let deleteApi = null;
    let reloadFn = null;

    if (category === 'PCB' || !category) {
        dbField = pcbMapping[fieldName];
        deleteApi = deletePCBFile;
        reloadFn = loadPCBDetails;
    } else if (category === 'Electronic Part') {
        dbField = electronicsMapping[fieldName];
        deleteApi = deleteElectronicsFile;
        reloadFn = loadElectronicsDetails;
    } else if (category === 'Electrical Part') {
        dbField = electricalMapping[fieldName];
        deleteApi = deleteElectricalFile;
        reloadFn = loadElectricalDetails;
    } else if (category === 'Structural Part') {
        dbField = structuralMapping[fieldName];
        deleteApi = deleteStructuralFile;
        reloadFn = loadStructuralDetails;
    }

    if (!dbField || !deleteApi) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this file?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
        try {
            await deleteApi(id, dbField);
            toast.success('File removed successfully');
            reloadFn(id, 'edit');
        } catch (error) {
            toast.error('Failed to remove file');
        }
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const fullUrl = buildFileUrl(url);
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
      window.open(buildFileUrl(url), '_blank');
    }
  };

  const getTypeIcon = (itemType = type) => {
    switch (itemType) {
      case 'PCB': return <Cpu size={24} className="text-[var(--accent)]" />;
      case 'Electronic Part': return <CircuitBoard size={24} className="text-[var(--accent)]" />;
      case 'Electrical Part': return <Plug size={24} className="text-[var(--accent)]" />;
      case 'Structural Part': return <Layers size={24} className="text-[var(--accent)]" />;
      default: return <Box size={24} className="text-[var(--accent)]" />;
    }
  };

  const StatCard = ({ title, count, icon: Icon, to, colorAccent }) => (
    <div
      onClick={() => navigate(to)}
      className="workspace-card px-4 py-3 border border-[var(--border-color)] group cursor-pointer hover:shadow-md transition-all duration-300 outline-none"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-bold tracking-wider text-[var(--text-muted)] mb-0.5">{title}</p>
          <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
            {loading ? '...' : count}
          </h3>
        </div>
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
          style={{ background: 'var(--nav-hover)', color: colorAccent }}
        >
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 group/link">
        <span className="text-[11px] font-bold tracking-wide text-[var(--accent)]">View details</span>
        <ChevronRight size={14} className="text-[var(--accent)] transition-transform duration-300 group-hover/link:translate-x-1" />
      </div>
    </div>
  );




  const renderTechnicalSpecs = () => {
    const category = selectedItem?.category || type || 'PCB';
    
    if (category === 'PCB') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
           {/* Hardware Profile */}
           <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
              <div className="flex items-center gap-4 mb-7">
                 <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-inner"><Cpu size={22} /></div>
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
      );
    }

    // For other categories, render a generic spec sheet
    const specs = selectedItem?.techSpec || selectedItem || {};
    const categoryData = selectedItem?.categoryData || selectedItem?.categorySpec?.spec_data || {};
    
    return (
       <div className="space-y-10">
          <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
              <div className="flex items-center gap-4 mb-7">
                 <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-inner"><Settings size={22} /></div>
                 <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Technical Specifications</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                 {/* Common Specs */}
                 {specs.mounting_type && <DataSheetEntry label="Mounting" value={specs.mounting_type} icon={Layers} />}
                 {specs.material && <DataSheetEntry label="Material" value={specs.material} icon={Box} />}
                 {specs.dimensions && <DataSheetEntry label="Dimensions" value={specs.dimensions} icon={Ruler} />}
                 {specs.weight && <DataSheetEntry label="Weight" value={specs.weight} icon={Activity} />}
                 
                 {/* Category Specific Specs */}
                 {Object.entries(categoryData).map(([key, value]) => {
                    const ignoreKeys = [
                      'id', 'part_id', 'tech_id', 'spec_id', 'inventory_id', 'procurement_id', 
                      'file_id', 'image_id', 'created_at', 'updated_at', 'is_active', 
                      'datasheet_file', 'warranty_document', 'part_images_gallery',
                      'datasheet_url', 'warranty_doc_url', 'category_name'
                    ];
                    if (ignoreKeys.includes(key.toLowerCase()) || typeof value === 'object' || !value) return null;
                    return <DataSheetEntry key={key} label={key.replace(/_/g, ' ')} value={String(value)} icon={Activity} />;
                 })}
              </div>
          </div>
       </div>
    );
  };

  const DataSheetEntry = ({ label, value, icon: Icon }) => {
    if (!value || value === 'Not Defined' || value === '0×0×0') return null;
    return (
      <div className="bg-[var(--bg-workspace)]/40 p-4 rounded-2xl border border-[var(--border-color)]/60 hover:border-[var(--accent)]/30 transition-all group">
        <div className="flex items-center gap-3 mb-1.5">
          {Icon && <Icon size={14} className="text-[var(--accent)]" />}
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">{label}</p>
        </div>
        <p className="text-[15px] font-black text-[var(--text-main)] tracking-tight leading-snug">{value}</p>
      </div>
    );
  };

  const renderDocumentationLibrary = () => {
      const category = selectedItem?.category || type || 'PCB';
      
      if (category === 'PCB') {
          return (
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
          );
      }

      // For others, we can map common file fields
      const files = selectedItem?.files || selectedItem || {};
      const fileFields = [];
      
      if (category === 'Electronic Part' || category === 'Electrical Part') {
          if (files.datasheet_url) fileFields.push({ label: 'Datasheet', url: files.datasheet_url });
          if (files.warranty_cert_url || files.warranty_doc_url) fileFields.push({ label: 'Warranty Document', url: files.warranty_cert_url || files.warranty_doc_url });
      } else if (category === 'Structural Part') {
          const catData = selectedItem?.categoryData || {};
          if (catData.file_2d_drawing) fileFields.push({ label: '2D Drawing', url: catData.file_2d_drawing });
          if (catData.file_3d_model) fileFields.push({ label: '3D Model', url: catData.file_3d_model });
          if (catData.file_fabrication_drawing) fileFields.push({ label: 'Fabrication Dwg', url: catData.file_fabrication_drawing });
      }

      if (fileFields.length === 0) {
          return (
              <div className="p-10 border-2 border-dashed border-[var(--border-color)] rounded-[32px] flex flex-col items-center justify-center text-[var(--text-dim)]">
                  <FileText size={48} className="opacity-10 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Technical Documents Attached</p>
              </div>
          );
      }

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {fileFields.map((file, idx) => (
                  <FileCard key={idx} label={file.label} url={file.url} />
              ))}
          </div>
      );
  };

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
                href={buildFileUrl(url)} 
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

  const combinedColumns = [
    { 
      key: 'image', label: 'Asset',
      render: (row) => {
        const imgUrl = row.pcb_images?.[0] || row.part_images?.[0] || row.image_url;
        return (
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-workspace)] flex items-center justify-center shadow-sm">
            {imgUrl ? (
              <img src={getFullUrl(imgUrl)} alt="Asset" className="w-full h-full object-cover" />
            ) : ( <Box size={18} className="text-[var(--text-dim)] opacity-30" /> )}
          </div>
        );
      }
    },
    { key: 'pcb_name', label: 'Item Name' },
    { key: 'part_no', label: 'Part ID' },
    { key: 'category', label: 'Category' },
    { key: 'created_at', label: 'Registered On', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  const pcbColumns = [
    { 
      key: 'image', label: 'Preview',
      render: (row) => (
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-workspace)] flex items-center justify-center shadow-sm">
          {row.pcb_images?.[0] || row.image_url ? (
            <img src={getFullUrl(row.pcb_images?.[0] || row.image_url)} alt="PCB" className="w-full h-full object-cover" />
          ) : ( <CircuitBoard size={18} className="text-[var(--text-dim)] opacity-30" /> )}
        </div>
      )
    },
    { key: 'pcb_name', label: 'PCB Name' },
    { key: 'part_no', label: 'Part Number' },
    { key: 'processor_count', label: 'Processors' },
    { key: 'stock_quantity', label: 'Stock Qty', render: (row) => <span className="font-black text-[var(--accent)]">{row.stock_quantity ?? 0}</span> },
    { key: 'created_at', label: 'Registered On', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10 px-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            {getTypeIcon()}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">
              {type ? `${type} Inventory` : 'Inventory Overview'}
            </h1>
            {/* <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              {type ? `Central ${type} Registry & Specification Management` : 'Central Hardware & Components Registry'}
            </p> */}
          </div>
        </div>
        {type && hasPermission('inventory', 'create') && (
          <button 
            onClick={handleOpenCreate}
            className="btn-primary shadow-lg px-8 py-3 group hover-scale-md"
            style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] md:text-[14px]">Add {type}</span>
          </button>
        )}
      </div>

      {/* Overview Stats */}
      {!type && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard title="PCB Units" count={stats.pcb} icon={CircuitBoard} to="/admin/inventory/pcb" colorAccent="#3b82f6" />
          <StatCard title="Electronic Parts" count={stats.electronics} icon={Cpu} to="/admin/inventory/electronics" colorAccent="#10b981" />
          <StatCard title="Electrical Parts" count={stats.electrical} icon={Plug} to="/admin/inventory/electrical" colorAccent="#f59e0b" />
          <StatCard title="Structural Parts" count={stats.structural} icon={Layers} to="/admin/inventory/structural" colorAccent="#ec4899" />
          <StatCard title="Finished Goods" count={stats.finishedGoodsCount} icon={PackagePlus} to="/admin/finished-goods" colorAccent="#8b5cf6" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="workspace-card p-3 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
            <input 
              type="text" 
              placeholder={type ? `Search ${type}s...` : "Search across all inventory categories..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
            />
            {items.length > 0 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
                {pagination.total} Records Found
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {!type && (
                <div className="relative group min-w-[180px] flex-1 md:flex-none">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={16} />
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)} 
                        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 pl-11 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[13px] appearance-none cursor-pointer font-bold text-[var(--text-main)] uppercase tracking-wider"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
                    >
                        <option value="">All Categories</option>
                        <option value="PCB">PCB Units</option>
                        <option value="Electronic Part">Electronic Parts</option>
                        <option value="Electrical Part">Electrical Parts</option>
                        <option value="Structural Part">Structural Parts</option>
                    </select>
                </div>
            )}
            
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
             <div className="relative group min-w-[150px] flex-1 md:flex-none">
                 <select 
                     value={stockStatusFilter} 
                     onChange={(e) => setStockStatusFilter(e.target.value)} 
                     className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[13px] appearance-none cursor-pointer font-bold text-[var(--text-main)] uppercase tracking-wider"
                     style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
                 >
                     <option value="">All Stock Status</option>
                     <option value="In Stock">In Stock</option>
                     <option value="Out of Stock">Out of Stock</option>
                 </select>
             </div>
          </div>
        </div>

        {!type && items.length === 0 ? (
          <div className="w-full min-h-[400px]" />
        ) : loading ? (
          <div className="p-20 text-center flex items-center justify-center">
            <Loader2 size={40} className="animate-spin text-[var(--accent)] opacity-40" />
          </div>
        ) : viewMode === 'table' ? (
          <DataTable 
            columns={!type ? combinedColumns : (type === 'PCB' ? pcbColumns : combinedColumns)}
            data={items}
            loading={loading}
            totalCount={pagination.total}
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
            onView={handleView}
            onEdit={hasPermission('inventory', 'edit') ? handleEdit : undefined}
            onDelete={hasPermission('inventory', 'delete') ? handleDelete : undefined}
            onRestock={hasPermission('inventory', 'edit') ? handleQuickAddOpen : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            {items.map((item) => (
              <div key={item.pcb_id || item.id} className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div onClick={() => handleView(item)} className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] block cursor-zoom-in group/img">
                  {(item.pcb_images?.[0] || item.part_images?.[0] || item.image_url) ? (
                    <img 
                        src={getFullUrl(item.pcb_images?.[0] || item.part_images?.[0] || item.image_url)} 
                        alt={item.pcb_name || item.name} 
                        className="w-full h-full object-contain p-6 group-hover/img:scale-110 transition-transform duration-700 ease-out" 
                        onClick={(e) => {
                            e.stopPropagation();
                            const allImages = item.pcb_images || item.part_images || (item.image_url ? [item.image_url] : []);
                            setLightboxData({ isOpen: true, images: allImages, initialIndex: 0 });
                        }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-dim)] opacity-20"><Box size={64} strokeWidth={1} /></div>
                  )}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); handleView(item); }} className="w-12 h-12 bg-[var(--accent)] rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0" title="View Details">
                      <Eye size={22} />
                    </button>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg text-[var(--accent)] shadow-sm">
                      {item.part_no || item.part_number || 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">{item.category || type}</span>
                    </div>
                    <h3 className="text-[15px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300">
                      {item.pcb_name || item.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed line-clamp-2 opacity-70">
                      {item.description || item.pcb_description || 'No detailed technical specifications provided for this inventory record.'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-[var(--border-color)]/60">
                    <div className="flex items-center gap-1.5">
                      {(item.stock_quantity !== undefined && item.stock_quantity !== null) && (
                        <div className="px-2.5 py-1 bg-[var(--accent)]/10 rounded-md">
                          <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider">
                            Qty: {item.stock_quantity}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 transition-opacity">
                       {hasPermission('inventory', 'edit') && (
                          <button onClick={(e) => { e.stopPropagation(); handleQuickAddOpen(item); }} className="w-7 h-7 flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded-md transition-all shadow-sm" title="Quick Restock"><PackagePlus size={12} /></button>
                       )}
                       {hasPermission('inventory', 'edit') && (
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="w-7 h-7 flex items-center justify-center bg-[var(--bg-workspace)] hover:bg-[var(--accent)] text-[var(--text-dim)] hover:text-white rounded-md transition-all shadow-sm" title="Edit"><Pencil size={12} /></button>
                       )}
                       {hasPermission('inventory', 'delete') && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="w-7 h-7 flex items-center justify-center bg-[var(--bg-workspace)] hover:bg-rose-500 text-[var(--text-dim)] hover:text-white rounded-md transition-all shadow-sm" title="Delete"><Trash2 size={12} /></button>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Universal Management Modal */}
      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'view' ? "Technical Data Sheet" : (modalMode === 'create' ? `Add ${type || 'Item'}` : `Update ${type || 'Item'} Specifications`)}
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
            /* Universal View Mode */
            <div className="space-y-10 pb-10 max-h-[82vh] overflow-y-auto custom-scrollbar pr-4">
               <div className="px-1">
                  <Breadcrumbs 
                    items={[
                      { label: 'Dashboard', path: '/admin/dashboard' },
                      { label: 'Inventory', path: '/admin/inventory' },
                      { label: selectedItem?.category || type || 'General', path: `/admin/inventory/${(selectedItem?.category || type || '').toLowerCase()}` },
                      { label: selectedItem?.pcb_name || selectedItem?.part_name || selectedItem?.name, active: true }
                    ]} 
                  />
               </div>

               {/* Premium Header Layout */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Visual Reference Side */}
                  <div className="lg:col-span-5 space-y-6">
                    {(() => {
                        const allImages = selectedItem?.pcb_images && selectedItem.pcb_images.length > 0 
                            ? selectedItem.pcb_images 
                            : (selectedItem?.part_images && selectedItem.part_images.length > 0 
                                ? selectedItem.part_images 
                                : (selectedItem?.images && selectedItem.images.length > 0 
                                    ? selectedItem.images 
                                    : (selectedItem?.image_url ? [selectedItem.image_url] : [])));
                        const currentUrl = allImages[activeImageIdx] || allImages[0];
                        
                        return (
                            <>
                                <div 
                                    className="aspect-square bg-[var(--bg-workspace)] rounded-[40px] border-2 border-[var(--border-color)] overflow-hidden group relative flex items-center justify-center shadow-inner hover:border-[var(--accent)]/30 transition-all duration-500 cursor-zoom-in"
                                    onClick={() => {
                                        if(currentUrl) setLightboxData({ isOpen: true, images: allImages, initialIndex: activeImageIdx });
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 opacity-40 pointer-events-none" />
                                    {currentUrl && (
                                        <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md text-white p-2.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl pointer-events-none z-10 translate-y-2 group-hover:translate-y-0">
                                            <Maximize2 size={20} />
                                        </div>
                                    )}
                                    {currentUrl ? (
                                        <img 
                                            src={getFullUrl(currentUrl)} 
                                            className="w-full h-full object-contain p-10 animate-in fade-in zoom-in-95 duration-700 group-hover:scale-105" 
                                            alt="Technical Asset" 
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 opacity-10">
                                            <Box size={100} strokeWidth={1} />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Visual Data</p>
                                        </div>
                                    )}
                                    {allImages.length > 1 && (
                                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 z-10 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                                            {allImages.map((_, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setActiveImageIdx(i)} 
                                                    className={`h-1.5 rounded-full transition-all duration-500 ${i === activeImageIdx ? 'bg-[var(--accent)] w-8 shadow-[0_0_10px_var(--accent)]' : 'bg-white/40 w-1.5 hover:bg-white/80'}`} 
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {allImages.length > 1 && (
                                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
                                        {allImages.map((url, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setActiveImageIdx(idx)} 
                                                className={`w-24 h-24 flex-shrink-0 rounded-[20px] border-2 transition-all duration-300 overflow-hidden bg-[var(--bg-workspace)] shadow-md ${idx === activeImageIdx ? 'border-[var(--accent)] scale-105 shadow-xl ring-4 ring-[var(--accent)]/10' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}
                                            >
                                                <img src={getFullUrl(url)} className="w-full h-full object-contain p-2.5" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                  </div>

                  {/* Technical Information Side */}
                  <div className="lg:col-span-7 space-y-8">
                     <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="bg-[var(--nav-hover)] text-[var(--accent)] font-black text-[11px] uppercase tracking-[0.2em] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                              {selectedItem?.category || selectedItem?.type || type || 'General Inventory'}
                          </span>
                          <span className="text-[var(--text-muted)] font-black text-[11px] uppercase tracking-widest opacity-40">REF: {selectedItem?.pcb_id || selectedItem?.part_id || 'INTERNAL-ID'}</span>
                        </div>
                        
                        <div>
                            <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-[1.1]">
                                {selectedItem?.pcb_name || selectedItem?.part_name || selectedItem?.name}
                            </h2>
                            <p className="text-[14px] font-bold text-[var(--accent)] uppercase tracking-[0.25em] mt-3 opacity-80">{selectedItem?.manufacturer || 'LIPL INTERNAL LOGISTICS'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 py-8 border-y border-[var(--border-color)]">
                          <div className="space-y-2">
                             <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Master Part ID</p>
                             <div className="flex items-center gap-3">
                                <Fingerprint size={18} className="text-[var(--accent)]" />
                                <span className="text-[17px] font-black text-[var(--text-main)] font-mono">{selectedItem?.part_no || selectedItem?.part_number || 'N/A-RECORD'}</span>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Registration Date</p>
                             <div className="flex items-center gap-3">
                                <Calendar size={18} className="text-[var(--accent)]" />
                                <span className="text-[17px] font-black text-[var(--text-main)]">{new Date(selectedItem?.created_at).toLocaleDateString()}</span>
                             </div>
                          </div>
                          {(selectedItem?.category === 'PCB' || (!selectedItem?.category && type === 'PCB')) && (
                            <div className="col-span-2 space-y-2">
                               <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Stock Quantity</p>
                               <div className="flex items-center gap-3">
                                  <Box size={18} className="text-[var(--accent)]" />
                                  <span className="text-[24px] font-black text-[var(--accent)]">{selectedItem?.stock_quantity ?? 0}</span>
                                  <span className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Units in Stock</span>
                               </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            {hasPermission('inventory', 'edit') && (
                                <button 
                                    onClick={() => { setIsModalOpen(false); setTimeout(() => handleEdit(selectedItem), 100); }} 
                                    className="btn-primary flex-1 py-4 px-6 shadow-lg uppercase tracking-widest text-[11px]" 
                                    style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
                                >
                                    Edit Specifications
                                </button>
                            )}
                            {hasPermission('inventory', 'delete') && (
                               <button 
                                   onClick={() => handleDelete(selectedItem)} 
                                   className="px-6 py-4 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                               >
                                   <Trash2 size={18} />
                               </button>
                            )}
                        </div>                        {hasPermission('inventory', 'view', 'general') && (
                          <div className="p-8 bg-[var(--bg-workspace)]/50 rounded-[32px] border border-[var(--border-color)] shadow-inner">
                             <h4 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.25em] mb-4 flex items-center gap-3">
                                <Info size={14} /> Technical Abstract
                             </h4>
                             <p className="text-[15px] text-[var(--text-main)] leading-relaxed font-bold opacity-90 italic">
                                "{selectedItem?.description || selectedItem?.pcb_description || selectedItem?.part_description || 'Detailed technical specifications for this hardware asset are available in the attached documentation library.'}"
                             </p>
                          </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Technical Specs Grid */}
               {hasPermission('inventory', 'view', 'tech_spec') && renderTechnicalSpecs()}

               {/* Documentation Library */}
               {hasPermission('inventory', 'view', 'files') && (
                 <div className="space-y-6">
                    <div className="flex items-center gap-4 ml-4">
                       <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-sm"><FileUp size={20} /></div>
                       <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Documentation Library</h3>
                    </div>
                    {renderDocumentationLibrary()}
                 </div>
               )}
            </div>
          ) : (
            /* Create / Edit Mode (Tabs) */
            <div className="flex flex-col h-full max-h-[85vh]">
              {/* Tab Navigation */}
              <div className="flex bg-[var(--bg-workspace)]/50 p-1.5 rounded-2xl mb-8 border border-[var(--border-color)]">
                  {((selectedItem?.category === 'PCB' || !selectedItem?.category) ? (
                    [
                      { id: 'general', label: 'General', icon: Info },
                      { id: 'processor', label: 'Processor', icon: Settings },
                      { id: 'firmware', label: 'Firmware', icon: Code },
                      { id: 'files', label: 'PCB Files', icon: FileUp }
                    ]
                  ) : (
                    [
                      { id: 'general', label: 'General Info', icon: Info },
                      { id: 'specifications', label: 'Specifications', icon: Settings },
                      { id: 'files', label: 'Documents & Images', icon: FileUp }
                    ]
                  )).map((tab) => (
                  <button
                      key={tab.id}
                      type="button"
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
                          <FormField label={(selectedItem?.category === 'PCB' || !selectedItem?.category) ? "PCB Name" : "Part Name"} name={(selectedItem?.category === 'PCB' || !selectedItem?.category) ? "pcb_name" : "part_name"} placeholder="e.g. Main Control Board V2" required />
                          <FormField label="Part Number" name="part_number" placeholder="e.g. PCB-MCB-001" required />
                      </div>
                      {(selectedItem?.category === 'PCB' || !selectedItem?.category) ? (
                        <>
                          <div className="grid grid-cols-2 gap-8">
                              <FormField label="PCB Type" name="pcb_type" placeholder="e.g. 4-Layer FR4" />
                              <FormField label="PCB Type Description" name="pcb_type_desc" placeholder="Details about construction..." />
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                              <FormField label="Processor Count" name="processor_count" type="number" placeholder="e.g. 1" />
                              <FormField label="Stock Quantity" name="stock_quantity" type="number" placeholder="e.g. 10" />
                          </div>
                          <TextAreaField label="PCB Description" name="pcb_description" placeholder="Technical overview and purpose of this board..." />
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-8">
                              <FormField label="Manufacturer" name="manufacturer" />
                              <FormField label="Status" name="status" />
                          </div>
                          <TextAreaField label="Description" name="description" />
                        </>
                      )}
                      
                      {/* Save & Next Button for General */}
                      <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                          <button type="button" onClick={() => setModalTab((selectedItem?.category === 'PCB' || !selectedItem?.category) ? 'processor' : 'specifications')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">
                              Save & Next <ChevronRight size={16} strokeWidth={3} />
                          </button>
                      </div>
                      </div>
                  )}

                  {modalTab === 'specifications' && (
                      <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                          <div className="grid grid-cols-2 gap-8">
                              {selectedItem?.category === 'Electronic Part' && selectedItem?.categorySpec?.category_name && (
                                  ELECTRONICS_SPEC_FIELDS[selectedItem.categorySpec.category_name]?.map(f => (
                                      f.isSelect ? (
                                        <SelectField key={f.key} label={f.label} name={`spec_${f.key}`} options={f.options} />
                                      ) : (
                                        <FormField key={f.key} label={f.label} name={`spec_${f.key}`} type={f.type || 'text'} />
                                      )
                                  ))
                              )}
                              {selectedItem?.category === 'Electrical Part' && selectedItem?.category_name && (
                                  ELECTRICAL_SPEC_FIELDS[selectedItem.category_name]?.map(f => (
                                      f.isSelect ? (
                                        <SelectField key={f.key} label={f.label} name={f.key} options={f.options} />
                                      ) : (
                                        <FormField key={f.key} label={f.label} name={f.key} type={f.type || 'text'} />
                                      )
                                  ))
                              )}
                              {selectedItem?.category === 'Structural Part' && selectedItem?.category_name && (
                                  STRUCTURAL_SPEC_FIELDS[selectedItem.category_name]?.map(f => (
                                      f.isSelect ? (
                                        <SelectField key={f.key} label={f.label} name={`spec_${f.key}`} options={f.options} />
                                      ) : (
                                        <FormField key={f.key} label={f.label} name={`spec_${f.key}`} type={f.type || 'text'} />
                                      )
                                  ))
                              )}
                          </div>
                          
                          {/* Save & Next Button for Specifications */}
                          <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                              <button type="button" onClick={() => setModalTab('files')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">
                                  Save & Next <ChevronRight size={16} strokeWidth={3} />
                              </button>
                          </div>
                      </div>
                  )}
                  {/* Processor & Firmware Tabs (PCB Only) */}
                  {(selectedItem?.category === 'PCB' || !selectedItem?.category) && (
                    <>
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
                          
                          {/* Save & Next Button for Processor */}
                          <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                              <button type="button" onClick={() => setModalTab('firmware')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">
                                  Save & Next <ChevronRight size={16} strokeWidth={3} />
                              </button>
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
                          
                          {/* Save & Next Button for Firmware */}
                          <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                              <button type="button" onClick={() => setModalTab('files')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">
                                  Save & Next <ChevronRight size={16} strokeWidth={3} />
                              </button>
                          </div>
                          </div>
                      )}
                    </>
                  )}

                  {modalTab === 'files' && (
                      <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          {(selectedItem?.category === 'PCB' || !selectedItem?.category) ? (
                            <>
                              <FileInput label="Individual Gerber File" name="file_gerber" existingUrl={selectedItem?.files?.processor_file_url} />
                              <FileInput label="Board File (.brd/.pcb)" name="file_board" existingUrl={selectedItem?.files?.brd_file_url} />
                              <FileInput label="Schematic File (.sch/.pdf)" name="file_schematic" existingUrl={selectedItem?.files?.sch_file_url} />
                              <FileInput label="BOM File (.csv/.xlsx)" name="file_bom" existingUrl={selectedItem?.files?.bom_file_url} />
                              <FileInput label="Stencile File" name="file_stencile" existingUrl={selectedItem?.files?.stencil_file_url} />
                              <FileInput label="Panel Gerber File" name="file_panel_gerber" existingUrl={selectedItem?.files?.panel_gerber_file_url} />
                              <FileInput label="Layer Stacking File" name="file_layer_stack" existingUrl={selectedItem?.files?.layer_stacking_file_url} />
                              <FileInput label="Production Instruction File" name="file_production_note" existingUrl={selectedItem?.files?.production_instruction_url} />
                            </>
                          ) : selectedItem?.category === 'Structural Part' ? (
                            <>
                              <FileInput label="2D Drawing" name="file_2d_drawing" existingUrl={selectedItem?.categoryData?.file_2d_drawing} />
                              <FileInput label="3D Model" name="file_3d_model" existingUrl={selectedItem?.categoryData?.file_3d_model} />
                              <FileInput label="Fabrication Drawing" name="file_fabrication_drawing" existingUrl={selectedItem?.categoryData?.file_fabrication_drawing} />
                              <FileInput label="Assembly Drawing" name="file_assembly_drawing" existingUrl={selectedItem?.categoryData?.file_assembly_drawing} />
                              <FileInput label="Cutting File" name="file_cutting" existingUrl={selectedItem?.categoryData?.file_cutting} />
                            </>
                          ) : (
                            <>
                              <FileInput label="Technical Datasheet" name="file_datasheet" existingUrl={selectedItem?.files?.datasheet_url} />
                              <FileInput label="Warranty Certificate" name="file_warranty" existingUrl={selectedItem?.files?.warranty_cert_url || selectedItem?.files?.warranty_doc_url} />
                            </>
                          )}
                          <div className="md:col-span-2">
                          <div className="space-y-3 p-6 bg-[var(--nav-hover)]/30 border border-dashed border-[var(--border-color)] rounded-[24px]">
                              <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                      <ImageIcon size={18} className="text-[var(--accent)]" />
                                      <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)]">PCB Images Gallery</h4>
                                  </div>
                                  {previews.length > 0 && (
                                      <button 
                                          type="button" 
                                          onClick={clearPendingImages}
                                          className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                                      >
                                          Clear All Pending
                                      </button>
                                  )}
                              </div>

                              {/* Existing Images Display in Edit Mode */}
                              {modalMode === 'edit' && (selectedItem?.pcb_images || selectedItem?.part_images || selectedItem?.images) && (
                                  <div className="space-y-3 mb-6">
                                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Existing Images</p>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                          {(selectedItem.pcb_images || selectedItem.part_images || selectedItem.images || []).map((img, idx) => (
                                              <div key={idx} className="relative aspect-square rounded-xl border border-[var(--border-color)] overflow-hidden group">
                                                  <img src={buildFileUrl(img)} alt="Part" className="w-full h-full object-cover" />
                                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                      <a href={buildFileUrl(img)} target="_blank" rel="noreferrer" className="text-white hover:text-[var(--accent)]"><Eye size={16} /></a>
                                                      <button type="button" onClick={() => handleRemoveImage(img)} className="text-rose-500 hover:text-white"><Trash2 size={16} /></button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* Pending Images Previews */}
                              {previews.length > 0 && (
                                  <div className="space-y-3 mb-6">
                                      <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest ml-1">Pending Uploads ({previews.length})</p>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                          {previews.map((preview, idx) => (
                                              <div key={preview.id} className="relative aspect-square rounded-xl border-2 border-[var(--accent)] border-dashed overflow-hidden group bg-[var(--bg-workspace)]">
                                                  <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                      <button 
                                                          type="button" 
                                                          onClick={() => removePendingImage(idx)}
                                                          className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all"
                                                      >
                                                          <Trash2 size={16} />
                                                      </button>
                                                  </div>
                                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                                                      <p className="text-[8px] text-white truncate">{preview.name}</p>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              <div className="relative group">
                              <input 
                                  type="file" 
                                  multiple 
                                  onChange={handleImageChange}
                                  accept="image/*" 
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                              />
                              <div className="w-full bg-[var(--bg-workspace)]/50 border border-dashed border-[var(--text-dim)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all">
                                  <div className="p-4 bg-[var(--bg-workspace)] rounded-2xl text-[var(--accent)] shadow-sm"><Plus size={24} /></div>
                                  <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest text-center">
                                      {pendingImages.length > 0 ? 'Add More Board Photos' : 'Upload Multiple Board Photos'}
                                  </p>
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
      )}

      {/* Quick Add Stock Modal */}
      {quickAddModal.isOpen && (
        <Modal
          isOpen={quickAddModal.isOpen}
          onClose={() => setQuickAddModal({ isOpen: false, item: null, quantityToAdd: '' })}
          title="Quick Restock"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleQuickAddSubmit} className="space-y-6">
             <div className="bg-[var(--bg-workspace)] p-4 rounded-2xl border border-[var(--border-color)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Item to Restock</p>
                <p className="text-[14px] font-bold text-[var(--text-main)] truncate">{quickAddModal.item?.pcb_name || quickAddModal.item?.part_name || quickAddModal.item?.name}</p>
                <p className="text-[11px] font-black text-[var(--accent)] mt-1">{quickAddModal.item?.part_no || quickAddModal.item?.part_number}</p>
             </div>
             
             <div className="space-y-2">
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                   Quantity to Add <span className="text-rose-500">*</span>
                </label>
                <input 
                   type="number"
                   min="1"
                   required
                   value={quickAddModal.quantityToAdd}
                   onChange={(e) => setQuickAddModal(prev => ({ ...prev, quantityToAdd: e.target.value }))}
                   placeholder="Enter quantity"
                   className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all font-bold"
                />
             </div>

             <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                   type="button"
                   onClick={() => setQuickAddModal({ isOpen: false, item: null, quantityToAdd: '' })}
                   className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                >
                   Cancel
                </button>
                <button
                   type="submit"
                   disabled={addStockMutation.isLoading}
                   className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest bg-[var(--accent)] text-white rounded-xl hover:opacity-90 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                   {addStockMutation.isLoading ? <Loader2 size={14} className="animate-spin" /> : <PackagePlus size={14} />}
                   Confirm Restock
                </button>
             </div>
          </form>
        </Modal>
      )}
        <Lightbox 
            images={lightboxData.images}
            initialIndex={lightboxData.initialIndex}
            isOpen={lightboxData.isOpen}
            onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
        />
    </div>
  );
};

export default InventoryListPage;
