import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useStore } from 'react-redux';
import { saveDraft, clearDraft } from '../../store/slices/draftSlice';
import { toast } from 'react-hot-toast';
import { 
  Search, Plus, Loader2, Plug, Zap, Info, Settings, 
  FileUp, ChevronRight, Eye, Download, Trash2, Box, Cpu,
  Activity, ArrowLeft, ImageIcon, CheckCircle2, Layers, Factory, ShieldAlert, FileText, BatteryCharging, Wrench, Package, Shield, Scale, Ruler, Banknote, ShoppingCart, X, LayoutGrid, List, Fingerprint, Calendar, Pencil
} from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/shared/DataTable';
import InventoryCard from '../../components/shared/InventoryCard';
import Modal from '../../components/shared/Modal';
import { getElectricalPartById, deleteElectricalImage, deleteElectricalFile } from '../../api/inventory';
import { useElectricalParts, useCreateElectricalPart, useUpdateElectricalPart, useDeleteElectricalPart } from '../../hooks/useInventory';
import { getProducts } from '../../api/products';
import { ELECTRICAL_SPEC_FIELDS, ELECTRICAL_CATEGORY_CONFIG } from '../../constants/inventorySpecs';
import { getCustomCategories, getCategoryFields, saveCategoryFields, deleteCustomCategory } from '../../api/customCategories';
import Swal from 'sweetalert2';
import ViewToggle from '../../components/shared/ViewToggle';

const CATEGORY_CONFIG = ELECTRICAL_CATEGORY_CONFIG;

const buildFileUrl = (filePath) => {
  if (!filePath || filePath === "#") return null;

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
  return `${baseUrl}/${filePath.startsWith('/') ? filePath.slice(1) : filePath}`;
};


const BASE_CATEGORIES = Object.keys(CATEGORY_CONFIG);

// CATEGORY_CONFIG imported from constants

const ElectricalPartsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const { data: electricalData, isLoading: loading } = useElectricalParts({ page: pagination.page, limit: pagination.limit, search: searchTerm });
  const items = electricalData?.data || [];

  useEffect(() => {
    if (electricalData?.meta) {
      setPagination(prev => ({ ...prev, page: electricalData.meta.page, total: electricalData.meta.total }));
    }
  }, [electricalData?.meta]);

  const createElectricalMutation = useCreateElectricalPart();
  const updateElectricalMutation = useUpdateElectricalPart();
  const deleteElectricalMutation = useDeleteElectricalPart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalTab, setModalTab] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [products, setProducts] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newCategoryFields, setNewCategoryFields] = useState([{ label: '' }]);
  const [customFieldDefs, setCustomFieldDefs] = useState({}); // { categoryName: [{ label, key }] }

  const dispatch = useDispatch();
  const store = useStore();

  // Derive formId for drafts
  const formId = useMemo(() => {
    if (!isModalOpen || modalMode === 'view') return null;
    return modalMode === 'create' 
      ? `electrical_create` 
      : `electrical_edit_${selectedItem?.part_id || selectedItem?.id || 'unknown'}`;
  }, [isModalOpen, modalMode, selectedItem]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
      defaultValues: { status: 'Active' }
  });

  // Sync draft to Redux without triggering component re-renders
  useEffect(() => {
    if (!formId || !isModalOpen) return;
    
    const subscription = watch((value, { name, type }) => {
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

  const selectedCategory = watch('category_name');

  useEffect(() => {
    if (pendingImages.length === 0) {
      setImagePreviews([]);
      return;
    }

    const newPreviews = pendingImages.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name
    }));

    setImagePreviews(newPreviews);

    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [pendingImages]);

  const handlePendingImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPendingImages(prev => [...prev, ...files]);
    }
  };

  const removePendingImage = (idx) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const clearPendingImages = () => {
    setPendingImages([]);
    setImagePreviews([]);
  };

  const fetchProducts = async () => {
    try {
        const res = await getProducts();
        setProducts(res.data.data);
    } catch (error) {
        console.error('Failed to fetch products for dropdown');
    }
  };

  useEffect(() => {
      fetchProducts();
  }, []);

  // Load saved custom categories from DB on mount
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const cats = await getCustomCategories('electrical');
        const names = cats.data.map(c => c.category_name);
        setCustomCategories(names);
        
        const defs = {};
        cats.data.forEach(c => {
          defs[c.category_name] = typeof c.fields === 'string' ? JSON.parse(c.fields) : c.fields;
        });
        setCustomFieldDefs(defs);
      } catch (err) {
        console.error('Failed to load custom categories', err);
      }
    };
    loadCustomCategories();
  }, []);

  const handleEditCategory = (catName) => {
    setEditingCategoryName(catName);
    setNewCategoryInput(catName);
    const existingFields = customFieldDefs[catName] || [{ label: '' }];
    setNewCategoryFields(existingFields);
    setIsAddingCategory(true);
  };

  const handleDeleteCategory = async (catName) => {
    const result = await Swal.fire({
      title: 'Delete Custom Category?',
      text: `Are you sure you want to delete "${catName}"? Parts using this category will retain data, but custom fields won't render.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        await deleteCustomCategory('electrical', catName);
        toast.success(`Category "${catName}" deleted`);
        setCustomCategories(prev => prev.filter(c => c !== catName));
        const newDefs = { ...customFieldDefs };
        delete newDefs[catName];
        setCustomFieldDefs(newDefs);
      } catch (e) {
        toast.error('Failed to delete category');
        console.error(e);
      }
    }
  };

  // Handle redirect from Inventory Overview for editing
  useEffect(() => {
    if (location.state?.editId) {
        loadPartDetails(location.state.editId, 'edit');
        // Clear state to avoid re-opening on refresh
        navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      // Append all text fields
      Object.keys(data).forEach(key => {
          if (key !== 'file_datasheet' && key !== 'file_wiring' && key !== 'file_manual' && key !== 'file_test_report' && key !== 'file_calib_cert' && key !== 'file_compliance' && key !== 'file_warranty' && key !== 'file_invoice' && key !== 'part_images' && key !== 'custom_params' && key !== 'files') {
              if (data[key] !== undefined && data[key] !== null) {
                  formData.append(key, data[key]);
              }
          }
      });

      // If this is a custom category, collect custom field values and send as custom_params
      const catName = data.category_name || selectedCategory;
      const isCustomCat = catName && !ELECTRICAL_SPEC_FIELDS[catName];
      if (isCustomCat && customFieldDefs[catName]) {
        const customParams = {};
        customFieldDefs[catName].forEach(f => {
          customParams[f.key] = data[f.key] || '';
        });
        formData.append('custom_params', JSON.stringify(customParams));
      }

      // Append single files
      const singleFiles = [
          'file_datasheet', 'file_wiring', 'file_manual', 'file_test_report', 
          'file_calib_cert', 'file_compliance', 'file_warranty', 'file_invoice'
      ];
      
      singleFiles.forEach(fieldName => {
          if (data[fieldName] && data[fieldName].length > 0) {
              formData.append(fieldName, data[fieldName][0]);
          }
      });

      // Append multiple images (Cumulative)
      if (pendingImages.length > 0) {
          pendingImages.forEach(file => {
              formData.append('part_images', file);
          });
      }


      if (modalMode === 'create') {
        await createElectricalMutation.mutateAsync(formData);
        toast.success('Electrical part registered successfully');
      } else {
        await updateElectricalMutation.mutateAsync({ id: selectedItem.part_id, data: formData });
        toast.success('Specifications updated successfully');
      }
      setIsModalOpen(false);
      reset({ status: 'Active' });
      if (formId) {
        dispatch(clearDraft({ formId }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedItem(null);
    setPendingImages([]);
    setImagePreviews([]);
    setEditingCategoryName(null);
    setIsAddingCategory(false);

    const draftId = 'electrical_create';
    const draft = store.getState().drafts[draftId];

    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
      setModalTab(draft.tab || 'general');
    } else {
      setModalTab('general');
      reset({ status: 'Active' });
    }

    setIsModalOpen(true);
  };

  const loadPartDetails = async (id, mode) => {
    if (mode) setModalMode(mode);
    setIsModalOpen(true);
    try {
      const res = await getElectricalPartById(id);
      const fullData = res.data.data;
      setSelectedItem(fullData);
      
      let formData = { ...fullData, ...fullData.techSpec };
      if (fullData.categorySpec) {
        formData.category_name = fullData.categorySpec.category_name;
        const specData = fullData.categoryData || {};
        Object.keys(specData).forEach(k => { formData[`spec_${k}`] = specData[k]; });
      }
      if (fullData.custom_params) {
        const customParams = typeof fullData.custom_params === 'string'
          ? JSON.parse(fullData.custom_params)
          : fullData.custom_params;
        Object.keys(customParams).forEach(k => {
          formData[k] = customParams[k];
        });
      }

      // Convert dates for inputs
      ['purchase_date', 'warranty_start_date', 'warranty_end_date'].forEach(dateField => {
          if (formData[dateField]) {
              formData[dateField] = new Date(formData[dateField]).toISOString().split('T')[0];
          }
      });

      if (mode === 'edit') {
        const draftId = `electrical_edit_${id}`;
        const draft = store.getState().drafts[draftId];
        if (draft && draft.data && Object.keys(draft.data).length > 0) {
          reset(draft.data);
          setModalTab(draft.tab || 'general');
        } else {
          reset(formData);
        }
      } else {
        reset(formData);
      }
    } catch (error) { toast.error('Failed to load details'); }
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete ${item.part_name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      try {
        await deleteElectricalMutation.mutateAsync(item.part_id);
        toast.success('Part deleted successfully');
      } catch (error) {
        toast.error('Failed to delete part');
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
            await deleteElectricalImage(selectedItem.part_id, imageUrl);
            toast.success('Image removed successfully');
            loadPartDetails(selectedItem.part_id, 'edit');
        } catch (error) {
            toast.error('Failed to remove image');
        }
    }
  };

  const handleRemoveFile = async (fieldName) => {
    if (!selectedItem) return;
    
    // Map form names to DB columns
    const fieldMapping = {
        'file_datasheet': 'datasheet_url',
        'file_wiring': 'wiring_diagram_url',
        'file_manual': 'installation_manual_url',
        'file_test_report': 'test_report_url',
        'file_calib_cert': 'calibration_cert_url',
        'file_compliance': 'compliance_cert_url',
        'file_warranty': 'warranty_doc_url',
        'file_invoice': 'invoice_url'
    };

    const dbField = fieldMapping[fieldName];
    if (!dbField) return;

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
            await deleteElectricalFile(selectedItem.part_id, dbField);
            toast.success('File removed successfully');
            loadPartDetails(selectedItem.part_id, 'edit');
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
      toast.error('Download failed. Opening in new tab.');
      window.open(buildFileUrl(url), '_blank');
    }
  };





  const DataSheetEntry = ({ label, value, icon: Icon }) => {
    if (!value || value === 'Not Defined' || value === '0×0×0') return null;
    return (
      <div className="bg-[var(--bg-workspace)]/40 p-4 rounded-2xl border border-[var(--border-color)]/60 hover:border-[var(--accent)]/30 transition-all group">
        <div className="flex items-center gap-3 mb-1.5">
          {Icon && <Icon size={14} className="text-[var(--accent)]" />}
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">{label}</p>
        </div>
        <p className="text-[15px] font-bold text-[var(--text-main)] tracking-tight leading-snug">{value}</p>
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

  const renderCategoryFields = () => {
    const fields = ELECTRICAL_SPEC_FIELDS[selectedCategory];
    if (!fields) return null;

    return fields.map(f => (
        f.isSelect ? (
            <SelectField key={f.key} label={f.label} name={f.key} options={f.options} />
        ) : (
            <FormField key={f.key} label={f.label} name={f.key} type={f.type || 'text'} />
        )
    ));
  };

  const columns = [
    { 
      key: 'image_url', 
      label: 'Image', 
      render: (row) => (
        <div className="w-12 h-12 rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-workspace)]">
          {row.image_url ? (
            <img src={buildFileUrl(row.image_url)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-dim)]">
              <ImageIcon size={16} />
            </div>
          )}
        </div>
      )
    },
    { key: 'part_name', label: 'Part Name' },
    { key: 'part_category', label: 'Category' },
    { key: 'part_number', label: 'Part Number' },
    { key: 'status', label: 'Status' },
    { key: 'stock_quantity', label: 'Stock Qty', render: (row) => <span className="font-black text-[var(--accent)]">{row.stock_quantity ?? 0}</span> },
    { key: 'created_at', label: 'Registered On', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Plug size={24} className="text-[#f59e0b] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">
              Electrical Parts
            </h1>
            {/* <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Electrical Inventory & Specifications Management
            </p> */}
          </div>
        </div>
        {hasPermission('inventory', 'create') && (
          <button 
            onClick={handleOpenCreate}
            className="btn-primary shadow-lg px-8 py-3 group"
            style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] md:text-[14px]">Add Electrical Part</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="workspace-card p-3 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
            <input 
              type="text" 
              placeholder="Search by part name, number, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
              {pagination.total} Records Found
            </div>
          </div>
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        {viewMode === 'table' ? (
          <DataTable 
            columns={columns}
            data={items}
            loading={loading}
            totalCount={pagination.total}
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
            onView={(item) => loadPartDetails(item.part_id, 'view')}
            onEdit={hasPermission('inventory', 'edit') ? (item) => loadPartDetails(item.part_id, 'edit') : undefined}
            onDelete={hasPermission('inventory', 'delete') ? handleDelete : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            {items.map((item) => (
              <InventoryCard
                key={item.part_id}
                item={item}
                title={item.part_name}
                category={item.part_category}
                description={item.description || 'No detailed technical specifications provided for this inventory record.'}
                date={item.created_at}
                imageSrc={item.part_images?.[0] || item.image_url}
                code={item.part_number}
                stockQuantity={item.stock_quantity}
                onView={(row) => loadPartDetails(row.part_id, 'view')}
                onEdit={hasPermission('inventory', 'edit') ? (row) => loadPartDetails(row.part_id, 'edit') : undefined}
                onDelete={hasPermission('inventory', 'delete') ? handleDelete : undefined}
                getImageSrc={buildFileUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? "Register Electrical Part" : modalMode === 'edit' ? "Edit Electrical Specifications" : "Technical Data Sheet"}
        maxWidth={!selectedCategory && modalMode === 'create' ? 'max-w-2xl' : 'max-w-6xl'}
        headerActions={
          <div className="flex items-center gap-3">
             {modalMode !== 'view' && (
                 (!selectedCategory && modalMode === 'create') ? (
                     <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="btn-primary py-2.5 px-6 shadow-md flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                     >
                         <Plus size={14} className="text-[#f59e0b]" /> Add Category
                     </button>
                 ) : (
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                        className="btn-primary py-2.5 px-8 shadow-md flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save' : 'Update Specs')}
                    </button>
                 )
             )}
          </div>
        }
      >
        {modalMode === 'view' ? (
          <div className="space-y-12 pb-10 max-h-[82vh] overflow-y-auto custom-scrollbar pr-4">
               <div className="px-1">
                  <Breadcrumbs 
                    items={[
                      { label: 'Dashboard', path: '/admin/dashboard' },
                      { label: 'Inventory', path: '/admin/inventory' },
                      { label: 'Electrical', path: '/admin/inventory/electrical' },
                      { label: selectedItem?.part_name, active: true }
                    ]} 
                  />
               </div>

             {/* Premium Header Layout */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Visual Reference Side */}
                <div className="lg:col-span-5 space-y-6">
                  {(() => {
                      const allImages = selectedItem?.part_images && selectedItem.part_images.length > 0 
                          ? selectedItem.part_images 
                          : (selectedItem?.image_url ? [selectedItem.image_url] : []);
                      const currentUrl = allImages[activeImageIdx] || allImages[0];
                      
                      return (
                          <>
                              <div className="aspect-square bg-[var(--bg-workspace)] rounded-[40px] border-2 border-[var(--border-color)] overflow-hidden group relative flex items-center justify-center shadow-inner hover:border-[var(--accent)]/30 transition-all duration-500">
                                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 opacity-40" />
                                  {currentUrl ? (
                                      <img 
                                          src={buildFileUrl(currentUrl)} 
                                          className="w-full h-full object-contain p-10 animate-in fade-in zoom-in-95 duration-700" 
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
                                              <img src={buildFileUrl(url)} className="w-full h-full object-contain p-2.5" />
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
                            {selectedItem?.part_category || 'Electrical Part'}
                        </span>
                        <span className="text-[var(--text-muted)] font-black text-[11px] uppercase tracking-widest opacity-40">REF: {selectedItem?.part_id || 'INTERNAL-ID'}</span>
                      </div>
                      
                      <div>
                          <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-[1.1]">
                              {selectedItem?.part_name}
                          </h2>
                          <p className="text-[14px] font-bold text-[var(--accent)] uppercase tracking-[0.25em] mt-3 opacity-80">{selectedItem?.manufacturer || 'LIPL INTERNAL LOGISTICS'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-8 py-8 border-y border-[var(--border-color)]">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Master Part ID</p>
                           <div className="flex items-center gap-3">
                              <Fingerprint size={18} className="text-[var(--accent)]" />
                              <span className="text-[17px] font-black text-[var(--text-main)] font-mono">{selectedItem?.part_number || 'N/A-RECORD'}</span>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Registration Date</p>
                           <div className="flex items-center gap-3">
                              <Calendar size={18} className="text-[var(--accent)]" />
                              <span className="text-[17px] font-black text-[var(--text-main)]">{new Date(selectedItem?.created_at).toLocaleDateString()}</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 py-2">
                         <button 
                             onClick={() => { setIsModalOpen(false); setTimeout(() => loadPartDetails(selectedItem.part_id, 'edit'), 100); }} 
                             className="btn-primary flex-1 py-4 px-6 shadow-lg uppercase tracking-widest text-[11px]" 
                             style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
                         >
                             Edit Specifications
                         </button>
                         <button 
                             onClick={() => handleDelete(selectedItem)} 
                             className="px-6 py-4 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                         >
                             <Trash2 size={18} />
                         </button>
                      </div>

                      <div className="p-8 bg-[var(--bg-workspace)]/50 rounded-[32px] border border-[var(--border-color)] shadow-inner relative">
                         <div className="absolute -top-3 left-6 bg-[var(--bg-workspace)] px-3 py-1 border border-[var(--border-color)] rounded-lg">
                           <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                              TECHNICAL OVERVIEW
                           </p>
                         </div>
                         <p className="text-[15px] text-[var(--text-main)] leading-relaxed font-bold opacity-90 italic mt-2">
                           "{selectedItem?.description || 'No detailed technical description provided.'}"
                         </p>
                         <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                             <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Target Application: <span className="text-[var(--text-main)] ml-1">{selectedItem?.used_in_product || 'N/A'}</span></p>
                             <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Part Type: <span className="text-[var(--text-main)] ml-1">{selectedItem?.part_type || 'N/A'}</span></p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                   <div className="flex items-center gap-4 mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-inner"><Zap size={22} /></div>
                      <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Technical Specs</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <DataSheetEntry label="Voltage" value={selectedItem?.rated_voltage} icon={BatteryCharging} />
                      <DataSheetEntry label="Current" value={selectedItem?.rated_current} icon={Zap} />
                      <DataSheetEntry label="Power Rating" value={selectedItem?.power_rating} />
                      <DataSheetEntry label="Phase Type" value={selectedItem?.phase_type} />
                      <DataSheetEntry label="Frequency" value={selectedItem?.frequency} />
                      <DataSheetEntry label="Protection" value={selectedItem?.protection_rating} icon={ShieldAlert} />
                   </div>
                </div>

                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                   <div className="flex items-center gap-4 mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-inner"><Box size={22} /></div>
                      <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Physical & Installation</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <DataSheetEntry label="Mounting Type" value={selectedItem?.mounting_type} icon={Wrench} />
                      <DataSheetEntry label="Connector Type" value={selectedItem?.connector_type} icon={Plug} />
                      <DataSheetEntry label="Operating Temp" value={selectedItem?.operating_temperature} icon={Activity} />
                      <DataSheetEntry label="Material" value={selectedItem?.material} />
                      <DataSheetEntry label="Dimensions" value={selectedItem?.dimensions} icon={Ruler} />
                      <DataSheetEntry label="Weight" value={selectedItem?.weight} icon={Scale} />
                   </div>
                </div>
             </div>

             {/* Category Params */}
             {selectedItem?.category_name && (
                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                   <div className="flex items-center gap-4 mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-inner"><Layers size={22} /></div>
                      <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">{selectedItem.category_name} Parameters</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                       {ELECTRICAL_SPEC_FIELDS[selectedItem.category_name] ? (
                           ELECTRICAL_SPEC_FIELDS[selectedItem.category_name].map(f => {
                               const value = selectedItem[f.key];
                               if (value === null || value === undefined || value === '') return null;
                               const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
                               return <DataSheetEntry key={f.key} label={f.label} value={displayValue} />;
                           })
                       ) : (
                           Object.entries(selectedItem).map(([key, value]) => {
                               const ignoreKeys = ['id','part_id','tech_id','spec_id','inventory_id','procurement_id','file_id','image_id','created_at','updated_at','is_active','part_name','part_number','part_category','manufacturer','part_type','description','used_in_product','material','status','category_name','rated_voltage','rated_current','power_rating','phase_type','frequency','input_type','output_type','connector_type','mounting_type','protection_rating','operating_temperature','dimensions','weight','part_images','files','parameters','file_datasheet','file_warranty','part_images_gallery','datasheet_file','warranty_document'];
                               if (ignoreKeys.includes(key) || (value === null || value === undefined || value === '') || typeof value === 'object') return null;
                               const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
                               return <DataSheetEntry key={key} label={key.replace(/_/g, ' ')} value={displayValue} />;
                           })
                       )}
                   </div>
                </div>
             )}

             <div className="space-y-6">
                <div className="flex items-center gap-4 ml-4">
                   <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-sm"><FileUp size={20} /></div>
                   <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Documentation Library</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                   <FileCard label="Datasheet" url={selectedItem?.files?.datasheet_url || selectedItem?.datasheet_file} />
                   <FileCard label="Warranty Document" url={selectedItem?.files?.warranty_doc_url || selectedItem?.warranty_document} />
                </div>
             </div>
             {(selectedItem?.part_images?.length > 0 || (selectedItem?.part_images_gallery && JSON.parse(selectedItem.part_images_gallery || '[]').length > 0)) && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 ml-4">
                        <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-sm"><ImageIcon size={20} /></div>
                        <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Visual Gallery</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {(selectedItem?.part_images_gallery 
                            ? JSON.parse(selectedItem.part_images_gallery) 
                            : selectedItem?.part_images || []
                        ).map((img, idx) => (
                           <div key={idx} className="aspect-square rounded-[24px] border-2 border-[var(--border-color)] overflow-hidden bg-[var(--bg-workspace)] group relative cursor-pointer shadow-md">
                                <img src={buildFileUrl(img)} alt="Part" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <a href={buildFileUrl(img)} target="_blank" rel="noreferrer" title="View" className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-[var(--accent)] transition-all shadow-lg"><Eye size={22} /></a>
                                    <button onClick={() => handleDownload(img)} title="Download" className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-[var(--accent)] transition-all shadow-lg"><Download size={22} /></button>
                                </div>
                           </div>
                        ))}
                    </div>
                </div>
             )}
          </div>
        ) : !selectedCategory && modalMode === 'create' ? (
          /* Category Selection Landing Page */
          <div className="flex flex-col h-full items-center justify-center py-8 px-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="max-w-4xl w-full">
                <div className="text-center mb-8 relative">
                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#f59e0b]/5 rounded-full blur-3xl animate-pulse" />
                   <div className="w-14 h-14 bg-gradient-to-br from-[var(--bg-card)] to-[var(--nav-hover)] border-2 border-[#f59e0b]/20 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#f59e0b]/10 relative z-10 -rotate-3 hover:rotate-0 transition-transform duration-500">
                       <Layers size={28} className="text-[#f59e0b]" />
                   </div>
                   <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">
                       Select <span className="text-[#f59e0b]">Electrical Category</span>
                   </h3>
                   <p className="text-[11px] font-bold text-[var(--text-muted)] opacity-80 uppercase tracking-widest">
                       Classification Required
                   </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                   {[...BASE_CATEGORIES, ...customCategories].map((cat, idx) => {
                      const Icon = CATEGORY_CONFIG[cat]?.icon || Layers;
                       const isCustom = customCategories.includes(cat);
                      return (
                        <div key={cat} className="relative group/cat animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 40}ms` }}>
                            <button 
                               type="button"
                               onClick={() => { 
                                   setValue('category_name', cat, { shouldValidate: true }); 
                                   setModalTab('general'); 
                               }}
                               className="p-5 w-full bg-white/40 backdrop-blur-md border border-white/20 rounded-[28px] hover:border-[#f59e0b] hover:bg-white/60 transition-all duration-500 group flex flex-col items-center gap-3 hover:-translate-y-1.5 hover:shadow-xl relative overflow-hidden"
                            >
                               <div className="w-10 h-10 bg-gradient-to-br from-white to-[var(--nav-hover)] rounded-[14px] flex items-center justify-center shadow-sm group-hover:shadow-[#f59e0b]/10 transition-all duration-500 group-hover:scale-110 relative z-10">
                                   <Icon size={20} className="text-[var(--text-dim)] group-hover:text-[#f59e0b] transition-colors duration-500" />
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-main)] group-hover:text-[#f59e0b] transition-colors duration-500 text-center relative z-10">{cat}</span>
                            </button>
                            {isCustom && (
                                <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover/cat:opacity-100 transition-opacity z-20">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} title="Edit Category Fields" className="p-1.5 bg-white shadow-sm border border-[var(--border-color)] rounded-xl text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                                        <Pencil size={12} strokeWidth={3} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }} title="Delete Custom Category" className="p-1.5 bg-white shadow-sm border border-[var(--border-color)] rounded-xl text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors">
                                        <Trash2 size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            )}
                        </div>
                      );
                   })}

                </div>
             </div>
             
             {/* Add New Category Popup */}
             {isAddingCategory && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-[32px] p-4">
                   <div className="bg-[var(--bg-card)] border border-[#f59e0b]/30 p-6 rounded-[24px] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      <h4 className="text-[14px] font-black uppercase text-[var(--text-main)] mb-4 flex items-center gap-2"><Plus size={16} className="text-[#f59e0b]"/> {editingCategoryName ? 'Edit Custom Category' : 'Add Custom Category'}</h4>
                      
                      {/* Category Name */}
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Category Name</label>
                      <input
                         autoFocus
                         type="text"
                         readOnly={!!editingCategoryName}
                         value={newCategoryInput}
                         onChange={e => setNewCategoryInput(e.target.value)}
                         placeholder="Category name..."
                         className={`w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] px-4 py-3 rounded-xl outline-none focus:border-[#f59e0b] text-[12px] font-black uppercase text-[var(--text-main)] mb-5 ${editingCategoryName ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />

                      {/* Field Definitions */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Custom Fields (Specialized Parameters)</label>
                          <button
                            type="button"
                            onClick={() => setNewCategoryFields(prev => [...prev, { label: '' }])}
                            className="flex items-center gap-1 text-[10px] font-black text-[#f59e0b] uppercase hover:underline"
                          >
                            <Plus size={12} /> Add Field
                          </button>
                        </div>
                        <div className="space-y-2">
                          {newCategoryFields.map((field, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest">#{idx + 1}</span>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={e => setNewCategoryFields(prev => prev.map((f, i) => i === idx ? { label: e.target.value } : f))}
                                  placeholder={`Field name (e.g. Wire Gauge)`}
                                  className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#f59e0b] text-[11px] font-bold text-[var(--text-main)]"
                                />
                              </div>
                              {newCategoryFields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setNewCategoryFields(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] text-[var(--text-dim)] mt-2 opacity-60">These fields will appear in the Specialized Parameters section when you register a part under this category.</p>
                      </div>

                      <div className="flex justify-end gap-3 mt-4">
                         <button onClick={() => { setIsAddingCategory(false); setEditingCategoryName(null); setNewCategoryInput(''); setNewCategoryFields([{ label: '' }]); }} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
                         <button onClick={async () => {
                            const trimmed = newCategoryInput.trim();
                            if (!trimmed) return;
                            const validFields = newCategoryFields
                              .filter(f => f.label.trim())
                              .map(f => ({ label: f.label.trim(), key: f.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') }));
                            try {
                              await saveCategoryFields('electrical', trimmed, validFields);
                              toast.success(`Category "${trimmed}" saved`);
                            } catch(e) { toast.error('Failed to save category fields'); }
                            if (![...BASE_CATEGORIES, ...customCategories].includes(trimmed)) {
                              setCustomCategories(prev => [...prev, trimmed]);
                            }
                            setCustomFieldDefs(prev => ({ ...prev, [trimmed]: validFields }));
                            setValue('category_name', trimmed, { shouldValidate: true });
                            setModalTab('general');
                            setIsAddingCategory(false);
                            setEditingCategoryName(null);
                            setNewCategoryInput('');
                            setNewCategoryFields([{ label: '' }]);
                         }} className="px-4 py-2 bg-[#f59e0b] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-80 transition-all shadow-md">Save & Select</button>
                      </div>
                   </div>
                </div>
             )}

          </div>

        ) : (
          <div className="flex flex-col h-full max-h-[85vh]">
            {modalMode === 'create' && (
                <div className="flex justify-between items-center mb-4 bg-[var(--bg-workspace)]/50 p-2.5 rounded-2xl border border-[var(--border-color)] animate-in fade-in duration-500">
                   <div className="flex items-center gap-3 pl-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Selected Category:</span>
                      <span className="text-[11px] font-black text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 rounded-full flex items-center gap-1.5"><Layers size={12}/> {selectedCategory}</span>
                   </div>
                   <button 
                      type="button" 
                      onClick={() => { setValue('category_name', ''); }} 
                      className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:text-white flex items-center gap-1.5 bg-[var(--bg-card)] hover:bg-[var(--accent)] px-4 py-2 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent)] shadow-sm transition-all"
                   >
                      <ArrowLeft size={12} /> Change Category
                   </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-[var(--bg-workspace)]/50 p-1.5 rounded-2xl mb-4 border border-[var(--border-color)] flex-wrap gap-1">
                {[
                { id: 'general', label: 'General Information', icon: Info },
                { id: 'technical', label: 'Technical Spec', icon: Settings },
                { id: 'files', label: 'Files', icon: FileUp }
                ].map((tab) => {
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setModalTab(tab.id)}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-300 font-black text-[9px] uppercase tracking-widest ${modalTab === tab.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                        >
                            <tab.icon size={14} strokeWidth={3} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-4">
                <form id="electrical-form" className="space-y-8">
                
                {modalTab === 'general' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <input type="hidden" {...register('category_name')} />
                            <FormField label="Part Category" name="part_category" placeholder="e.g. Pump" required />
                            <FormField label="Part Name" name="part_name" placeholder="e.g. Water Circulation Pump" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FormField label="Part Number / Model Number" name="part_number" placeholder="e.g. WP-100" />
                            <FormField label="Manufacturer" name="manufacturer" placeholder="e.g. Grundfos" />
                            <FormField label="Part Type" name="part_type" placeholder="e.g. Centrifugal" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <SelectField label="Status" name="status" options={['Active', 'Inactive', 'Damaged', 'Deleted']} />
                            <SelectField label="Used in Product" name="used_in_product" options={products.map(p => p.product_name)} />
                            <FormField label="Material" name="material" placeholder="e.g. Cast Iron" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FormField label="Stock Quantity" name="stock_quantity" type="number" placeholder="e.g. 25" />
                        </div>
                        <TextAreaField label="Description" name="description" placeholder="Technical overview..." />
                        
                        {/* Save & Next Button for General Info */}
                        <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                            <button type="button" onClick={() => setModalTab('technical')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">
                                Save & Next <ChevronRight size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}

                {modalTab === 'technical' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-10">
                        {/* Standard Parameters */}
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-[#f59e0b] mb-6 flex items-center gap-2 bg-[#f59e0b]/5 px-4 py-2 rounded-lg border-l-4 border-[#f59e0b]">
                                <Settings size={14} /> Global Technical Parameters
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                                <FormField label="Rated Voltage" name="rated_voltage" />
                                <FormField label="Rated Current" name="rated_current" />
                                <FormField label="Power Rating" name="power_rating" />
                                <FormField label="Phase Type" name="phase_type" />
                                <FormField label="Frequency" name="frequency" />
                                <FormField label="Input Type" name="input_type" />
                                <FormField label="Output Type" name="output_type" />
                                <FormField label="Connector Type" name="connector_type" />
                                <FormField label="Mounting Type" name="mounting_type" />
                                <FormField label="Protection Rating" name="protection_rating" />
                                <FormField label="Operating Temperature" name="operating_temperature" />
                                <FormField label="Dimensions" name="dimensions" />
                                <FormField label="Weight" name="weight" />
                            </div>
                        </div>

                        {/* Category Specialized Parameters */}
                        {selectedCategory && (
                            <div className="space-y-6 pt-4 border-t border-[var(--border-color)]">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#f59e0b] mb-6 flex items-center gap-2 bg-[#f59e0b]/5 px-4 py-2 rounded-lg border-l-4 border-[#f59e0b]">
                                    <Activity size={14} /> Specialized {selectedCategory} Parameters
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                                    {ELECTRICAL_SPEC_FIELDS[selectedCategory]
                                      ? renderCategoryFields()
                                      : (customFieldDefs[selectedCategory] && customFieldDefs[selectedCategory].length > 0)
                                        ? customFieldDefs[selectedCategory].map(f => (
                                            <FormField key={f.key} label={f.label} name={f.key} placeholder={`Enter ${f.label}`} />
                                          ))
                                        : <p className="text-[11px] text-[var(--text-muted)] col-span-3 opacity-60">No specialized fields defined for this category. Add fields by recreating the category.</p>
                                    }
                                </div>
                            </div>
                        )}

                        {/* Save & Next Button for Technical Specs */}
                        <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                            <button type="button" onClick={() => setModalTab('files')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">
                                Save & Next <ChevronRight size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}


                 {modalTab === 'files' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <FileInput label="Datasheet File" name="file_datasheet" existingUrl={selectedItem?.files?.datasheet_url} />
                            <FileInput label="Warranty Document" name="file_warranty" existingUrl={selectedItem?.files?.warranty_doc_url} />
                            
                            <div className="md:col-span-2">
                            <div className="space-y-3 p-6 bg-[var(--nav-hover)]/30 border border-dashed border-[var(--border-color)] rounded-[24px]">
                                <div className="flex items-center gap-3 mb-4">
                                    <ImageIcon size={18} className="text-[#f59e0b]" />
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)]">Part Images Gallery</h4>
                                </div>
                                
                                {modalMode === 'edit' && selectedItem?.part_images && selectedItem.part_images.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-6">
                                        {selectedItem.part_images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-xl border border-[var(--border-color)] overflow-hidden group">
                                                <img src={buildFileUrl(img)} alt="Part" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                    <a href={buildFileUrl(img)} target="_blank" rel="noreferrer" className="text-white hover:text-[var(--accent)]"><Eye size={16} /></a>
                                                    <button type="button" onClick={() => handleRemoveImage(img)} className="text-rose-500 hover:text-white"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                 <div className="relative group">
                                 <input 
                                    type="file" 
                                    multiple 
                                    onChange={handlePendingImageChange}
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                 />
                                 <div className="w-full bg-[var(--bg-workspace)]/50 border border-dashed border-[var(--text-dim)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all">
                                     <div className="p-4 bg-[var(--bg-workspace)] rounded-2xl text-[var(--accent)] shadow-sm"><Plus size={24} /></div>
                                     <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest">Upload Multiple Part Photos</p>
                                 </div>
                                 </div>

                                 {imagePreviews.length > 0 && (
                                    <div className="mt-6 space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[#f59e0b]">Pending Uploads ({imagePreviews.length})</h5>
                                            <button 
                                                type="button" 
                                                onClick={() => setPendingImages([])}
                                                className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {imagePreviews.map((preview, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl border-2 border-[var(--accent)]/30 overflow-hidden group shadow-lg bg-[var(--bg-card)]">
                                                    <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                        <p className="text-[8px] text-white font-bold px-2 text-center truncate w-full mb-1">{preview.name}</p>
                                                        <button 
                                                            type="button"
                                                            onClick={() => removePendingImage(idx)}
                                                            className="p-1.5 bg-rose-500 text-white rounded-lg hover:scale-110 transition-transform shadow-md"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                    <div className="absolute top-1 right-1">
                                                        <div className="bg-[var(--accent)] text-white p-1 rounded-md shadow-md">
                                                            <CheckCircle2 size={10} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                 )}
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
    </div>
  );
};

export default ElectricalPartsPage;

