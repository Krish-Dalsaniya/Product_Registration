import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useStore } from 'react-redux';
import { saveDraft, clearDraft } from '../../../../store/slices/draftSlice';
import { createProduct, updateProduct, removeAsset, getBomOptions, getProductBom, saveProductBom } from '../../../../api/products';
import Modal from '../../../../components/shared/Modal';
import CategoryModal from '../../../../components/shared/CategoryModal';
import CompanyModal from '../../../../components/shared/CompanyModal';
import HardwareConfigModal from './HardwareConfigModal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { Loader2, Box, Tag, FileText, Check, Activity, ChevronRight, Trash2, Plus, CheckCircle, Zap, Cpu, CircuitBoard, Layers, X, Eye } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

const Quill = ReactQuill.Quill;
const Parchment = Quill.import('parchment');
const StyleAttributor = Parchment.StyleAttributor || Parchment.Attributor.Style;
const LineHeightStyle = new StyleAttributor('line-height', 'line-height', {
  scope: Parchment.Scope.INLINE,
  whitelist: ['1', '1.2', '1.5', '1.8', '2', '2.5', '3']
});
Quill.register(LineHeightStyle, true);

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'line-height': ['1', '1.2', '1.5', '1.8', '2', '2.5', '3'] }],
    ['link'],
    [{ 'align': [] }],
    ['clean']
  ],
};

const quillFormats = [
  'bold', 'italic', 'underline', 'strike',
  'list', 'line-height', 'link', 'align'
];

const parseHardwareSpec = (specStr) => {
  try {
    if (!specStr) return null;
    let parsed = typeof specStr === 'string' ? JSON.parse(specStr) : specStr;
    if (parsed?.original_spec && typeof parsed.original_spec === 'string') {
      try {
        const inner = JSON.parse(parsed.original_spec);
        if (inner && (inner.fuel_types || inner.dispenser_type || inner.nozzles)) {
          parsed = { ...inner, ...parsed };
        }
      } catch(e) {}
    }
    if (parsed && typeof parsed === 'object' && ('fuel_types' in parsed || 'dispenser_type' in parsed || 'nozzles' in parsed)) return parsed;
  } catch (e) {}
  return null;
};

const parseSpecRows = (specStr) => {
  try {
    if (!specStr) return [{ key: '', value: '' }];
    const outerParsed = typeof specStr === 'string' ? JSON.parse(specStr) : specStr;
    if (outerParsed?.original_spec) {
      try {
        const innerParsed = typeof outerParsed.original_spec === 'string' ? JSON.parse(outerParsed.original_spec) : outerParsed.original_spec;
        if (innerParsed?.type === 'specs_table' && Array.isArray(innerParsed.rows)) return innerParsed.rows;
      } catch (e) {}
    }
    if (outerParsed?.type === 'specs_table' && Array.isArray(outerParsed.rows)) return outerParsed.rows;
  } catch (e) {}
  return [{ key: '', value: '' }];
};

const ProductModal = ({
  isOpen,
  onClose,
  modalMode,
  selectedProduct,
  onSuccess,
  categories,
  companies,
  getFullUrl
}) => {
  const { user, hasPermission } = useAuth();
  const canManageSpecs = hasPermission('products', 'tech_view') || hasPermission('products', 'edit');

  const [modalActiveTab, setModalActiveTab] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specRows, setSpecRows] = useState([]);
  const [faqRows, setFaqRows] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  
  const [bomOptions, setBomOptions] = useState({ pcb: [], electrical: [], electronics: [], structural: [] });
  const [bomItems, setBomItems] = useState([]);
  const [isSavingBom, setIsSavingBom] = useState(false);
  const [bomExpandedSection, setBomExpandedSection] = useState('pcb');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState('category');
  const [companyModalMode, setCompanyModalMode] = useState('company');

  const dispatch = useDispatch();
  const store = useStore();

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm();

  const formId = useMemo(() => {
    if (!isOpen || modalMode === 'view') return null;
    return modalMode === 'create' 
      ? `product_create` 
      : `product_edit_${selectedProduct?.product_id || 'unknown'}`;
  }, [isOpen, modalMode, selectedProduct]);

  useEffect(() => {
    if (!formId || !isOpen) return;
    const subscription = watch((value) => {
      if (value && Object.keys(value).length > 0) {
        // Strip non-serializable file inputs from drafts
        const serializableValue = { ...value };
        delete serializableValue.document;
        delete serializableValue.image;
        
        dispatch(saveDraft({ formId, data: serializableValue, tab: modalActiveTab }));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formId, modalActiveTab, dispatch, isOpen]);

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
        return null;
      }
    }).filter(p => p !== null);

    setPreviews(newPreviews);
    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [pendingImages]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) setPendingImages(prev => [...prev, ...files]);
  };

  const removePendingImage = (index) => setPendingImages(prev => prev.filter((_, i) => i !== index));
  const clearPendingImages = () => setPendingImages([]);

  const watchedCategory = watch('category');
  const watchedSubCategory = watch('sub_category');
  const watchedCompany = watch('company_name');

  useEffect(() => {
    if (isOpen) {
      if (modalMode === 'create') {
        const draft = store.getState().drafts['product_create'];
        if (draft && draft.data && Object.keys(draft.data).length > 0) {
          reset(draft.data);
          setModalActiveTab(draft.tab || 'general');
        } else {
          reset({
            product_name: '', category: '', sub_category: '', company_name: '', sub_company: '',
            description: '', unit_price: '', specification: '', feature: '', faqs: '[]',
            product_promoted: false, product_inquired: false, product_quoted: false,
            product_sampled: false, product_purchased: false, document_label: ''
          });
          setModalActiveTab('general');
        }
        setSpecRows([]);
        setFaqRows([]);
        setBomItems([]);
        setPendingImages([]);
        getBomOptions().then(res => setBomOptions(res.data.data || { pcb: [], electrical: [], electronics: [], structural: [] })).catch(() => {});
      } else if (selectedProduct) {
        const hardware = parseHardwareSpec(selectedProduct.specification);
        setSpecRows(parseSpecRows(selectedProduct.specification));
        setFaqRows(selectedProduct.faqs || []);
        
        const resetData = { 
          product_name: selectedProduct.product_name, company_name: selectedProduct.company_name || '', 
          sub_company: selectedProduct.sub_company || '', description: selectedProduct.description || '', 
          category: selectedProduct.category || '', sub_category: selectedProduct.sub_category || '', 
          feature: selectedProduct.feature || '', fuel_types: hardware?.fuel_types || [], 
          nozzles: hardware?.nozzles || '', dispensing: hardware?.dispensing || '', 
          dispenser_type: hardware?.dispenser_type || '', specification: hardware ? hardware.original_spec : selectedProduct.specification,
          product_promoted: !!selectedProduct.product_promoted, product_inquired: !!selectedProduct.product_inquired,
          product_quoted: !!selectedProduct.product_quoted, product_sampled: !!selectedProduct.product_sampled,
          product_purchased: !!selectedProduct.product_purchased, document_label: ''
        };
        const draftId = `product_edit_${selectedProduct.product_id}`;
        const draft = store.getState().drafts[draftId];
        if (draft && draft.data && Object.keys(draft.data).length > 0 && modalMode === 'edit') {
          reset(draft.data);
          setModalActiveTab(draft.tab || 'general');
        } else {
          reset(resetData);
          setModalActiveTab('general');
        }
        
        setPendingImages([]);
        setBomItems([]);
        Promise.all([
          getBomOptions().catch(() => ({ data: { data: { pcb: [], electrical: [], electronics: [], structural: [] } } })),
          getProductBom(selectedProduct.product_id).catch(() => ({ data: { data: [] } }))
        ]).then(([optRes, bomRes]) => {
          const opts = optRes.data.data || { pcb: [], electrical: [], electronics: [], structural: [] };
          setBomOptions(opts);
          const rawItems = bomRes.data.data || [];
          const resolved = rawItems.map(item => {
            const list = opts[item.component_type] || [];
            const found = list.find(o => String(o.id) === String(item.component_id));
            return { ...item, name: found ? found.name : `ID: ${item.component_id}` };
          });
          setBomItems(resolved);
        });
      }
    }
  }, [isOpen, modalMode, selectedProduct]);

  useEffect(() => {
    if (!isOpen) return;

    const handleAutofill = (e) => {
      const payload = e.detail;
      if (!payload) return;
      
      let populatedCount = 0;
      Object.keys(payload).forEach(key => {
        if (payload[key]) {
          setValue(key, payload[key], { shouldValidate: true, shouldDirty: true });
          populatedCount++;
        }
      });
      
      if (populatedCount > 0) {
        toast.success(`AI Auto-filled ${populatedCount} fields!`, { icon: '✨' });
      }
    };

    window.addEventListener('AUTOFILL_PRODUCT_FORM', handleAutofill);
    return () => window.removeEventListener('AUTOFILL_PRODUCT_FORM', handleAutofill);
  }, [isOpen, setValue]);

  const onSubmit = async (data) => {
    if (modalMode === 'view') return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const validRows = specRows.filter(r => r.key.trim() !== '');
      const specJson = validRows.length > 0 ? JSON.stringify({ type: 'specs_table', rows: validRows }) : '';

      const isDispenser = watchedCategory?.toLowerCase().includes('dispenser') || watchedSubCategory?.toLowerCase().includes('dispenser');
      if (isDispenser) {
        const hardwareSpec = {
          fuel_types: data.fuel_types || [],
          nozzles: data.nozzles || '',
          dispensing: data.dispensing || '',
          dispenser_type: data.dispenser_type || '',
          original_spec: specJson
        };
        formData.append('specification', JSON.stringify(hardwareSpec));
      } else {
        formData.append('specification', specJson);
      }

      Object.keys(data).forEach(key => {
        if (!['image', 'document', 'specification', 'fuel_types', 'nozzles', 'dispensing', 'dispenser_type'].includes(key)) {
          formData.append(key, data[key]);
        }
      });

      if (pendingImages.length > 0) pendingImages.forEach(file => formData.append('image', file));
      if (data.document && data.document[0]) formData.append('document', data.document[0]);

      const validFaqs = faqRows.filter(f => f.question.trim() !== '');
      formData.append('faqs', JSON.stringify(validFaqs));

      if (modalMode === 'create') {
        await createProduct(formData);
        toast.success('Product created successfully!');
      } else {
        await updateProduct(selectedProduct.product_id, formData);
        toast.success('Product updated successfully!');
      }
      
      onClose();
      if (formId) dispatch(clearDraft({ formId }));
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBom = async () => {
    if (!selectedProduct?.product_id) return;
    setIsSavingBom(true);
    try {
      await saveProductBom(selectedProduct.product_id, bomItems);
      toast.success('Bill of Material saved!');
    } catch (err) {
      toast.error('Failed to save BOM');
    } finally {
      setIsSavingBom(false);
    }
  };

  const addBomItem = (type, id, name) => {
    if (!id) return;
    if (bomItems.some(i => i.component_type === type && String(i.component_id) === String(id))) {
      toast('Already added!', { icon: 'ℹ️' }); return;
    }
    setBomItems(prev => [...prev, { component_type: type, component_id: id, name, quantity: 1, notes: '' }]);
  };
  const removeBomItem = (index) => setBomItems(prev => prev.filter((_, i) => i !== index));
  const updateBomItem = (index, field, value) => {
    setBomItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveAssetClick = async (url, type) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this asset?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
      await removeAsset(selectedProduct.product_id, url, type);
      toast.success('Asset removed');
      onSuccess();
    } catch (error) {
      toast.error('Failed to remove asset');
    }
  };

  const FileInput = ({ label, name, accept = "*", icon: Icon }) => {
    const selectedFile = watch(name);
    const hasFile = selectedFile && selectedFile.length > 0;
    const fileName = hasFile ? selectedFile[0].name : 'Select file to upload';

    return (
      <div className="space-y-3">
        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">{label}</label>
        <div className="relative group">
          <input 
            type="file" 
            {...(name === 'image' ? { multiple: true, onChange: handleImageChange } : register(name))} 
            accept={accept} 
            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
          />
          <div className={`w-full bg-[var(--input-bg)] border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
            (name === 'image' ? pendingImages.length > 0 : hasFile) 
              ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
              : 'border-[var(--text-dim)] group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/5'
          }`}>
            <div className={`p-3 rounded-xl transition-all duration-300 ${
              (name === 'image' ? pendingImages.length > 0 : hasFile) ? 'bg-[var(--accent)] text-white scale-110' : 'bg-[var(--bg-workspace)] text-[var(--accent)] shadow-sm'
            }`}>
              {(name === 'image' ? pendingImages.length > 0 : hasFile) ? <CheckCircle size={24} /> : <Icon size={24} />}
            </div>
            <div className="text-center">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${(name === 'image' ? pendingImages.length > 0 : hasFile) ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`}>
                {(name === 'image' ? pendingImages.length > 0 : hasFile) ? (name === 'image' ? `${pendingImages.length} Files Selected` : 'File Attached') : label.replace('Upload New ', '')}
              </p>
              <p className={`text-[12px] font-bold truncate max-w-[200px] px-4 ${(name === 'image' ? pendingImages.length > 0 : hasFile) ? 'text-[var(--text-main)]' : 'text-[var(--text-dim)] opacity-40'}`}>
                {name === 'image' && pendingImages.length > 0 ? 'Click to add more...' : fileName}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={modalMode === 'create' ? 'Add Product' : modalMode === 'edit' ? 'Update Specifications' : 'View Product'} 
        maxWidth="max-w-[1400px]"
        headerActions={
          modalMode !== 'view' && (
            <div className="flex items-center gap-3">
              <button
                form="product-form"
                type="submit"
                disabled={isSubmitting}
                className="btn-primary py-2 px-6 shadow-md flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save Product' : 'Update Product')}
              </button>
            </div>
          )
        }
      >
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
              <div className="flex border-b border-[var(--border-color)] mb-8 overflow-x-auto no-scrollbar gap-2">
                {[
                  { id: 'general', label: 'General Information' },
                  ...(canManageSpecs ? [
                    { id: 'specs', label: 'Technical Specifications' },
                    { id: 'bom', label: 'Bill of Material' }
                  ] : []),
                  { id: 'files', label: 'Files' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalActiveTab(tab.id)}
                    className={`px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative rounded-t-xl -mb-[1px] cursor-pointer ${
                      modalActiveTab === tab.id
                        ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'
                    }`}
                  >
                    {tab.label}
                    {tab.id === 'bom' && bomItems.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[8px] font-black">{bomItems.length}</span>
                    )}
                    {modalActiveTab === tab.id && (
                      <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-[var(--accent)] rounded-t-full shadow-[0_-4px_12px_var(--border-glow)]" />
                    )}
                  </button>
                ))}
              </div>

              {/* 1. General Info */}
              <div className={modalActiveTab === 'general' ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
                <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-6 rounded-2xl md:rounded-[32px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" />
                    <h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">General Information</h3>
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                      <div>
                        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Company / Brand</label>
                        <input {...register('company_name', { required: 'Company is required' })} readOnly onClick={() => { setCompanyModalMode('company'); setIsCompanyModalOpen(true); }} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-4 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold cursor-pointer" placeholder="Select Manufacturer..." />
                        {errors.company_name && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-wider ml-1">{errors.company_name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Product Name</label>
                        <input {...register('product_name', { required: 'Name is required' })} disabled={modalMode === 'view'} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-4 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold" placeholder="Enterprise Dispenser X-1..." />
                        {errors.product_name && <p className="text-red-500 text-[10px] mt-1.5 font-bold uppercase tracking-wider ml-1">{errors.product_name.message}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1 ml-1">Division / Dept</label>
                        <input {...register('sub_company')} readOnly onClick={() => { if(watchedCompany){ setCompanyModalMode('subcompany'); setIsCompanyModalOpen(true); } }} className={`w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none transition-all ${!watchedCompany ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer focus:border-[var(--accent)]'}`} placeholder="Select Division" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1 ml-1">Category</label>
                        <input {...register('category', { required: 'Required' })} readOnly onClick={() => { setCategoryModalMode('category'); setIsCategoryModalOpen(true); }} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] cursor-pointer outline-none focus:border-[var(--accent)] transition-all" placeholder="Select Category" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1 ml-1">Sub Category</label>
                        <input {...register('sub_category')} readOnly onClick={() => { if(watchedCategory){ setCategoryModalMode('subcategory'); setIsCategoryModalOpen(true); } }} className={`w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none transition-all ${!watchedCategory ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer focus:border-[var(--accent)]'}`} placeholder="Select Sub-Category" />
                      </div>
                    </div>

                    {(watchedCategory?.toLowerCase().includes('dispenser') || watchedSubCategory?.toLowerCase().includes('dispenser')) && (
                      <div className="pt-2">
                        <button type="button" onClick={() => setIsHardwareModalOpen(true)} className="w-full p-5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--accent)] rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--accent)]/50 hover:scale-[1.01] transition-all flex items-center justify-between group cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-[var(--accent)]/10 rounded-xl"><Activity className="text-[var(--accent)]" size={24} /></div>
                            <div className="text-left">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-70">Dispenser Specification</p>
                              <h4 className="text-[15px] font-black uppercase tracking-tight text-[var(--text-main)]">Configure Hardware</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {(watch('fuel_types')?.length > 0 || watch('nozzles') || watch('dispensing')) && ( 
                              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                <Check size={12} strokeWidth={4} /><span>Configured</span>
                              </div> 
                            )}
                            <ChevronRight size={20} strokeWidth={3} className="text-[var(--text-dim)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                    <button type="button" onClick={() => setModalActiveTab(canManageSpecs ? 'specs' : 'files')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">Save & Next <ChevronRight size={16} strokeWidth={3} /></button>
                  </div>
                </div>
              </div>

              {/* 2. Specs Tab */}
              <div className={modalActiveTab === 'specs' ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
                <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-8 rounded-2xl md:rounded-[32px]">
                  <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]/60">
                    <div className="w-1.5 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" />
                    <h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">Technical Specifications & FAQs</h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Product Description</label>
                      <Controller name="description" control={control} render={({ field }) => ( <ReactQuill theme="snow" value={field.value || ''} onChange={field.onChange} modules={quillModules} formats={quillFormats} readOnly={modalMode === 'view'} placeholder="Primary operational description..." /> )} />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Key Features</label>
                      <Controller name="feature" control={control} render={({ field }) => ( <ReactQuill theme="snow" value={field.value || ''} onChange={field.onChange} modules={quillModules} formats={quillFormats} readOnly={modalMode === 'view'} placeholder="• High durability&#10;• Weather resistant..." /> )} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[var(--border-color)]/40">
                    <div className="space-y-4">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Product Specifications Table</label>
                      <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-workspace)]/20">
                        <div className="grid grid-cols-[1fr_1fr_48px] bg-[var(--nav-hover)] border-b border-[var(--border-color)]">
                          <div className="px-5 py-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Attribute</div>
                          <div className="px-5 py-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-l border-[var(--border-color)]">Value</div><div />
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          {specRows.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_1fr_48px] border-b border-[var(--border-color)] last:border-b-0 group hover:bg-[var(--accent)]/5 transition-colors">
                              <input type="text" value={row.key} onChange={(e) => { const updated = [...specRows]; updated[idx].key = e.target.value; setSpecRows(updated); }} placeholder="e.g. Item Type" className="px-5 py-4 text-[13px] font-bold bg-transparent outline-none text-[var(--text-main)] placeholder-[var(--text-dim)]" disabled={modalMode === 'view'}/>
                              <input type="text" value={row.value} onChange={(e) => { const updated = [...specRows]; updated[idx].value = e.target.value; setSpecRows(updated); }} placeholder="e.g. Camera Bracket" className="px-5 py-4 text-[13px] font-bold bg-transparent outline-none text-[var(--text-muted)] placeholder-[var(--text-dim)] border-l border-[var(--border-color)]" disabled={modalMode === 'view'}/>
                              {modalMode !== 'view' && <button type="button" onClick={() => setSpecRows(specRows.filter((_, i) => i !== idx))} className="flex items-center justify-center text-[var(--text-dim)] hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>}
                            </div>
                          ))}
                        </div>
                      </div>
                      {modalMode !== 'view' && <button type="button" onClick={() => setSpecRows([...specRows, { key: '', value: '' }])} className="flex items-center gap-2 text-[var(--accent)] text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-all ml-1 cursor-pointer"><Plus size={16} strokeWidth={3} /><span>Add Specification Row</span></button>}
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Frequently Asked Questions (FAQs)</label>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {faqRows.map((faq, idx) => (
                          <div key={idx} className="p-5 rounded-2xl bg-[var(--bg-workspace)]/40 border border-[var(--border-color)] space-y-4 relative group hover:border-[var(--accent)]/30 transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest">FAQ Item #{idx + 1}</span>
                              {modalMode !== 'view' && <button type="button" onClick={() => setFaqRows(faqRows.filter((_, i) => i !== idx))} className="text-[var(--text-dim)] hover:text-rose-500 transition-colors cursor-pointer p-1 rounded-md hover:bg-rose-500/10"><Trash2 size={14} /></button>}
                            </div>
                            <div className="space-y-3">
                              <div className="flex gap-3 items-center"><span className="text-[var(--accent)] font-black text-sm w-4 flex-shrink-0">Q.</span><input type="text" value={faq.question} onChange={(e) => { const updated = [...faqRows]; updated[idx].question = e.target.value; setFaqRows(updated); }} placeholder="What is the operating voltage?" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] font-bold transition-all" disabled={modalMode === 'view'}/></div>
                              <div className="flex gap-3 items-start"><span className="text-emerald-500 font-black text-sm w-4 flex-shrink-0 mt-2">A.</span><textarea value={faq.answer} onChange={(e) => { const updated = [...faqRows]; updated[idx].answer = e.target.value; setFaqRows(updated); }} placeholder="The operating voltage is 230V AC." rows={2} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--text-muted)] outline-none focus:border-[var(--accent)] resize-none font-medium transition-all" disabled={modalMode === 'view'}/></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {modalMode !== 'view' && <button type="button" onClick={() => setFaqRows([...faqRows, { question: '', answer: '' }])} className="w-full py-3 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] flex items-center justify-center gap-2 hover:bg-[var(--accent)]/5 hover:border-[var(--accent)]/50 transition-all group mt-2 cursor-pointer"><Plus size={14} strokeWidth={3} /><span className="text-[10px] font-black uppercase tracking-widest">Add FAQ Row</span></button>}
                    </div>
                  </div>
                  <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                    <button type="button" onClick={() => setModalActiveTab('bom')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">Save & Next <ChevronRight size={16} strokeWidth={3} /></button>
                  </div>
                </div>
              </div>

              {/* 3. BOM Tab */}
              <div className={modalActiveTab === 'bom' ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
                <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-8 rounded-2xl md:rounded-[32px]">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]/60">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" />
                      <h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">Bill of Material</h3>
                    </div>
                    {selectedProduct?.product_id && modalMode !== 'view' && (
                      <button type="button" onClick={handleSaveBom} disabled={isSavingBom} className="btn-primary py-2 px-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}>
                        {isSavingBom ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />} Save BOM
                      </button>
                    )}
                  </div>
                  <div className="flex border-b border-[var(--border-color)] overflow-x-auto no-scrollbar gap-2 mb-6">
                    {[{ type: 'pcb', label: 'PCB', icon: Cpu }, { type: 'electrical', label: 'Electrical Parts', icon: Zap }, { type: 'electronics', label: 'Electronics Parts', icon: CircuitBoard }, { type: 'structural', label: 'Structural Parts', icon: Layers }].map(({ type, label, icon: Icon }) => {
                      const isActive = bomExpandedSection === type;
                      const count = bomItems.filter(i => i.component_type === type).length;
                      return (
                        <button key={type} type="button" onClick={() => setBomExpandedSection(type)} className={`px-5 py-3 text-[11px] font-black uppercase tracking-[0.1em] transition-all relative rounded-t-xl -mb-[1px] cursor-pointer flex items-center gap-2 flex-shrink-0 ${isActive ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent)]/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'}`}>
                          <Icon size={14} /><span>{label}</span>
                          {count > 0 && <span className={`ml-1.5 inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-black ${isActive ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--border-color)] text-[var(--text-main)]'}`}>{count}</span>}
                          {isActive && <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-[var(--accent)] rounded-t-full shadow-[0_-4px_12px_var(--border-glow)]" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-workspace)]">
                    {[{ type: 'pcb', label: 'PCB' }, { type: 'electrical', label: 'Electrical Parts' }, { type: 'electronics', label: 'Electronics Parts' }, { type: 'structural', label: 'Structural Parts' }].map(({ type, label }) => {
                      if (bomExpandedSection !== type) return null;
                      const sectionItems = bomItems.filter(i => i.component_type === type);
                      const opts = bomOptions[type] || [];
                      return (
                        <div key={type} className="animate-in fade-in duration-300">
                          <div className="p-5 md:p-6 space-y-6">
                            {modalMode !== 'view' && (
                              <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Add {label} to BOM</label>
                                <select className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--border-glow)] focus:border-[var(--accent)] transition-all appearance-none cursor-pointer" onChange={(e) => { const opt = opts.find(o => String(o.id) === e.target.value); if (opt) addBomItem(type, opt.id, opt.name); e.target.value = ''; }} defaultValue="" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}>
                                  <option value="">— Select {label} to add —</option>
                                  {opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                              </div>
                            )}
                            {sectionItems.length > 0 && (
                              <div className={`space-y-3 pt-4 ${modalMode !== 'view' ? 'border-t border-[var(--border-color)]/40' : ''}`}>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Selected Components ({sectionItems.length})</label>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                  {sectionItems.map((item, idx) => {
                                    const globalIdx = bomItems.findIndex(b => b.component_type === type && String(b.component_id) === String(item.component_id));
                                    return (
                                      <div key={idx} className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] group hover:border-[var(--accent)]/50 hover:shadow-sm transition-all">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[var(--accent)]" />
                                        <span className="flex-1 text-[13px] font-bold text-[var(--text-main)] truncate">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                          <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">Qty</label>
                                          <input type="number" min="1" value={item.quantity} onChange={(e) => updateBomItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)} className="w-16 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-[12px] font-black text-center text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all" disabled={modalMode === 'view'}/>
                                        </div>
                                        {modalMode !== 'view' && <button type="button" onClick={() => removeBomItem(globalIdx)} className="p-2 text-[var(--text-dim)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all flex-shrink-0 ml-1"><X size={14} strokeWidth={2.5} /></button>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {bomItems.length > 0 && (
                    <div className="pt-4 border-t border-[var(--border-color)]/40">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">BOM Summary — {bomItems.length} component{bomItems.length !== 1 ? 's' : ''}</p>
                      <div className="flex flex-wrap gap-2">
                        {bomItems.map((item, i) => (
                          <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider">
                            <span className="opacity-60">{item.component_type}:</span><span>{item.name}</span>{item.quantity > 1 && <span className="opacity-60">×{item.quantity}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-6 flex justify-end border-t border-[var(--border-color)]/40 mt-6">
                    <button type="button" onClick={() => setModalActiveTab('files')} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">Save & Next <ChevronRight size={16} strokeWidth={3} /></button>
                  </div>
                </div>
              </div>

              {/* 4. Files Tab */}
              <div className={modalActiveTab === 'files' ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
                <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-6 rounded-2xl md:rounded-[32px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" />
                    <h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">Files</h3>
                  </div>
                  {modalMode !== 'create' && (
                    <div className="space-y-6">
                      {((selectedProduct?.images && selectedProduct.images.length > 0) || selectedProduct?.image_url) && (
                        <div className="space-y-3">
                          <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Current Gallery</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {(selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images : [selectedProduct.image_url]).filter(Boolean).map((url, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] group bg-[var(--bg-workspace)]/50">
                                <img src={getFullUrl(url)} alt="" className="w-full h-full object-contain p-2" />
                                {modalMode !== 'view' && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <button type="button" onClick={() => handleRemoveAssetClick(url, 'images')} className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all cursor-pointer"><Trash2 size={16} /></button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {previews.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] ml-1">Pending Photos ({previews.length})</label>
                            {modalMode !== 'view' && <button type="button" onClick={clearPendingImages} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline cursor-pointer">Clear All</button>}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {previews.map((preview, idx) => (
                              <div key={preview.id} className="relative aspect-square rounded-xl border-2 border-[var(--accent)] border-dashed overflow-hidden group bg-[var(--bg-workspace)]">
                                <img src={preview.url} alt="Preview" className="w-full h-full object-contain p-2" />
                                {modalMode !== 'view' && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <button type="button" onClick={() => removePendingImage(idx)} className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all cursor-pointer"><Trash2 size={16} /></button>
                                  </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1"><p className="text-[8px] text-white truncate">{preview.name}</p></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {((selectedProduct?.documents && selectedProduct.documents.length > 0) || selectedProduct?.document_url) && (
                        <div className="space-y-3">
                          <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Current Documents</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(selectedProduct.documents && selectedProduct.documents.length > 0 
                              ? selectedProduct.documents 
                              : (selectedProduct?.document_url ? [selectedProduct.document_url] : [])
                            ).filter(Boolean).map((docItem, idx) => {
                              const doc = typeof docItem === 'string' ? { url: docItem, name: docItem.split('/').pop() } : docItem;
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-workspace)]/30 border border-[var(--border-color)] rounded-xl group hover:border-[var(--accent)]/50 transition-all">
                                  <div className="flex items-center gap-3 truncate"><FileText size={16} className="text-[var(--accent)]" /><span className="text-[11px] font-bold text-[var(--text-main)] truncate uppercase tracking-wider">{doc.name}</span></div>
                                  <div className="flex items-center gap-2">
                                    <a href={getFullUrl(doc.url)} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"><Eye size={14} /></a>
                                    {modalMode !== 'view' && <button type="button" onClick={() => handleRemoveAssetClick(doc.url, 'documents')} className="p-1.5 text-rose-500/50 hover:text-rose-500 transition-colors cursor-pointer"><Trash2 size={14} /></button>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {modalMode !== 'view' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FileInput label="Upload New Image" name="image" accept="image/*" icon={Plus} />
                      <div className="space-y-4">
                        <FileInput label="Upload New Datasheet" name="document" accept=".pdf,.doc,.docx,.xls,.xlsx" icon={FileText} />
                        <div>
                          <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2 ml-1">Datasheet Label / Name</label>
                          <input type="text" {...register('document_label')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold" placeholder="e.g. Technical Datasheet V2, User Manual..." />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
        </div>
      </Modal>

      <CategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        onSelect={(subCat) => setValue('sub_category', subCat)} 
        onSelectCategory={(cat) => { setValue('category', cat.name); setValue('sub_category', ''); }} 
        initialCategory={categoryModalMode === 'subcategory' ? categories.find(c => c.name === watchedCategory) : null} 
      />
      <CompanyModal 
        isOpen={isCompanyModalOpen} 
        onClose={() => setIsCompanyModalOpen(false)} 
        onSelect={(subComp) => setValue('sub_company', subComp)} 
        onSelectCompany={(comp) => { setValue('company_name', comp.name); setValue('sub_company', ''); }} 
        initialCompany={companyModalMode === 'subcompany' ? companies.find(c => c.name === watchedCompany) : null} 
      />
      <HardwareConfigModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        watchedSubCategory={watchedSubCategory}
        modalMode={modalMode}
        register={register}
        watch={watch}
      />
    </>
  );
};

export default ProductModal;
