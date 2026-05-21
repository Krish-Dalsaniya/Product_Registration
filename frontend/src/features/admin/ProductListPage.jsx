import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProducts, getProductById, createProduct, updateProduct, removeAsset, deleteProduct, getBomOptions, getProductBom, saveProductBom } from '../../api/products';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import CategoryModal from '../../components/shared/CategoryModal';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import { Search, Plus, Loader2, Box, Tag, DollarSign, FileText, Check, Droplets, Flame, Fuel, Droplet, Activity, CheckCircle, ChevronRight, Trash2, LayoutGrid, List, Eye, Download, X, Zap, Building2, Pencil, Cpu, CircuitBoard, Layers, ClipboardList, ChevronDown } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useDebounce } from '../../hooks/useDebounce';
import { getCategories } from '../../api/categories';
import { getCompanies } from '../../api/companies';
import CompanyModal from '../../components/shared/CompanyModal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Register custom line height format in Quill
const Quill = ReactQuill.Quill;
const Parchment = Quill.import('parchment');
const StyleAttributor = Parchment.StyleAttributor || Parchment.Attributor.Style;
const LineHeightStyle = new StyleAttributor('line-height', 'line-height', {
  scope: Parchment.Scope.INLINE,
  whitelist: ['1', '1.2', '1.5', '1.8', '2', '2.5', '3']
});
Quill.register(LineHeightStyle, true);


const ProductListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const assetBaseURL = rawApiUrl.replace(/\/api$/, '');

  const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const base = assetBaseURL.endsWith('/') ? assetBaseURL.slice(0, -1) : assetBaseURL;
    return `${base}/${cleanUrl}`;
  };
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState('category'); 
  const [companyModalMode, setCompanyModalMode] = useState('company'); 
  const [currentCategoryObject, setCurrentCategoryObject] = useState(null);
  const [currentCompanyObject, setCurrentCompanyObject] = useState(null);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); 
  const [activeTab, setActiveTab] = useState('description'); 
  const [modalActiveTab, setModalActiveTab] = useState('general');
  const [specRows, setSpecRows] = useState([]);
  const [faqRows, setFaqRows] = useState([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [pendingImages, setPendingImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  // BOM state
  const [bomOptions, setBomOptions] = useState({ pcb: [], electrical: [], electronics: [], structural: [] });
  const [bomItems, setBomItems] = useState([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [isSavingBom, setIsSavingBom] = useState(false);
  const [bomExpandedSection, setBomExpandedSection] = useState(null);

  useEffect(() => {
    if (modalMode !== 'view') return;
    const allImages = selectedProduct?.images && selectedProduct.images.length > 1
      ? selectedProduct.images
      : null;
    if (!allImages) return;
    const timer = setInterval(() => {
      setActiveImageIdx(i => (i + 1) % allImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [modalMode, selectedProduct, activeImageIdx]);

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

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm();

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
    'list',
    'line-height',
    'link',
    'align'
  ];
  const watchedCategory = watch('category');
  const watchedSubCategory = watch('sub_category');
  const watchedCompany = watch('company_name');

  const parseHardwareSpec = (specStr) => {
    try {
      if (!specStr) return null;
      let parsed = typeof specStr === 'string' ? JSON.parse(specStr) : specStr;
      
      // Recover from potential double-nesting caused by previous backend logic
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
      
      // If it's a hardware spec object, look for original_spec
      if (outerParsed?.original_spec) {
        try {
          const innerParsed = typeof outerParsed.original_spec === 'string' ? JSON.parse(outerParsed.original_spec) : outerParsed.original_spec;
          if (innerParsed?.type === 'specs_table' && Array.isArray(innerParsed.rows)) return innerParsed.rows;
        } catch (e) {}
      }
      
      // If it's already a specs table
      if (outerParsed?.type === 'specs_table' && Array.isArray(outerParsed.rows)) return outerParsed.rows;
    } catch (e) {}
    return [{ key: '', value: '' }];
  };

  const handleCategoryPick = (category) => {
    setValue('category', category.name);
    setValue('sub_category', ''); 
    setCurrentCategoryObject(category);
  };

  const handleCompanyPick = (company) => {
    setValue('company_name', company.name);
    setValue('sub_company', ''); 
    setCurrentCompanyObject(company);
  };

  const handleSubCategoryPick = (subCategoryName) => {
    setValue('sub_category', subCategoryName);
  };

  const handleSubCompanyPick = (subCompanyName) => {
    setValue('sub_company', subCompanyName);
  };

  const openCategoryModal = () => {
    setCategoryModalMode('category');
    setIsCategoryModalOpen(true);
  };

  const openCompanyModal = () => {
    setCompanyModalMode('company');
    setIsCompanyModalOpen(true);
  };

  const openSubCategoryModal = () => {
    if (!watchedCategory) {
      toast.error('Please select a category first');
      return;
    }
    setCategoryModalMode('subcategory');
    setIsCategoryModalOpen(true);
  };

  const openSubCompanyModal = () => {
    if (!watchedCompany) {
      toast.error('Please select a company first');
      return;
    }
    setCompanyModalMode('subcompany');
    setIsCompanyModalOpen(true);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { 
        page: pagination.page, 
        limit: pagination.limit,
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        company: selectedCompany || undefined
      };
      const res = await getProducts(params);
      setProducts(res.data.data);
      setPagination(prev => ({ ...prev, total: res.data.meta.total }));
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data.data || res.data || []);
    } catch (error) {}
  };

  const fetchCompanies = async () => {
    try {
      const res = await getCompanies();
      setCompanies(res.data.data || res.data || []);
    } catch (error) {}
  };

  useEffect(() => { 
    fetchCategories(); 
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearchTerm, selectedCategory, selectedCompany, pagination.page]);

  useEffect(() => {
    const editProductId = location.state?.editProductId;
    if (editProductId) {
      const fetchAndEdit = async () => {
        try {
          const res = await getProductById(editProductId);
          if (res.data.success) {
            handleEdit(res.data.data);
            // Clear location state to prevent reopening on subsequent renders
            navigate(location.pathname, { replace: true, state: {} });
          }
        } catch (err) {
          toast.error('Failed to load product details for editing');
        }
      };
      fetchAndEdit();
    }
  }, [location.state]);

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

      // Append non-file fields first
      Object.keys(data).forEach(key => {
        if (key !== 'image' && key !== 'document' && key !== 'specification' && key !== 'fuel_types' && key !== 'nozzles' && key !== 'dispensing' && key !== 'dispenser_type') {
          formData.append(key, data[key]);
        }
      });

      // Append files last
      if (pendingImages.length > 0) {
        pendingImages.forEach(file => {
          formData.append('image', file);
        });
      }
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
      setIsModalOpen(false);
      reset();
      setSpecRows([{ key: '', value: '' }]);
      setFaqRows([{ question: '', answer: '' }]);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setSpecRows([]);
    setFaqRows([]);
    setBomItems([]);
    setModalMode('create');
    setSelectedProduct(null);
    setCurrentCategoryObject(null);
    setCurrentCompanyObject(null);
    reset({
      product_name: '',
      category: '',
      sub_category: '',
      company_name: '',
      sub_company: '',
      description: '',
      unit_price: '',
      specification: '',
      feature: '',
      faqs: '[]',
      product_promoted: false,
      product_inquired: false,
      product_quoted: false,
      product_sampled: false,
      product_purchased: false,
      document_label: ''
    });
    setPendingImages([]);
    setModalActiveTab('general');
    loadBomOptionsForCreate();
    setIsModalOpen(true);
  };

  const handleView = (product) => {
    navigate(`/admin/products/${product.product_id}`);
  };

  const handleEdit = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    const hardware = parseHardwareSpec(product.specification);
    setSpecRows(parseSpecRows(product.specification));
    setFaqRows(product.faqs || []);
    const resetData = { 
      product_name: product.product_name, 
      company_name: product.company_name || '', 
      sub_company: product.sub_company || '', 
      description: product.description || '', 
      category: product.category || '', 
      sub_category: product.sub_category || '', 
      feature: product.feature || '', 
      fuel_types: hardware?.fuel_types || [], 
      nozzles: hardware?.nozzles || '', 
      dispensing: hardware?.dispensing || '', 
      dispenser_type: hardware?.dispenser_type || '', 
      specification: hardware ? hardware.original_spec : product.specification,
      product_promoted: !!product.product_promoted,
      product_inquired: !!product.product_inquired,
      product_quoted: !!product.product_quoted,
      product_sampled: !!product.product_sampled,
      product_purchased: !!product.product_purchased,
      document_label: ''
    };
    reset(resetData);
    setPendingImages([]);
    setModalActiveTab('general');
    setBomItems([]);
    // Load BOM data and options for edit mode
    Promise.all([
      getBomOptions().catch(() => ({ data: { data: { pcb: [], electrical: [], electronics: [], structural: [] } } })),
      getProductBom(product.product_id).catch(() => ({ data: { data: [] } }))
    ]).then(([optRes, bomRes]) => {
      const opts = optRes.data.data || { pcb: [], electrical: [], electronics: [], structural: [] };
      setBomOptions(opts);
      const rawItems = bomRes.data.data || [];
      // Resolve names from options
      const resolved = rawItems.map(item => {
        const list = opts[item.component_type] || [];
        const found = list.find(o => String(o.id) === String(item.component_id));
        return { ...item, name: found ? found.name : `ID: ${item.component_id}` };
      });
      setBomItems(resolved);
    });
    setIsModalOpen(true);
  };

  // Load BOM options when opening create modal
  const loadBomOptionsForCreate = () => {
    getBomOptions().then(res => {
      setBomOptions(res.data.data || { pcb: [], electrical: [], electronics: [], structural: [] });
    }).catch(() => {});
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
    const already = bomItems.some(i => i.component_type === type && String(i.component_id) === String(id));
    if (already) { toast('Already added!', { icon: 'ℹ️' }); return; }
    setBomItems(prev => [...prev, { component_type: type, component_id: id, name, quantity: 1, notes: '' }]);
  };

  const removeBomItem = (index) => {
    setBomItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateBomItem = (index, field, value) => {
    setBomItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveAsset = async (url, type) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await removeAsset(selectedProduct.product_id, url, type);
      toast.success('Asset removed');
      const updatedProduct = { ...selectedProduct };
      if (type === 'images') {
        if (Array.isArray(updatedProduct.images)) {
          updatedProduct.images = updatedProduct.images.filter(u => u !== url);
        }
        if (updatedProduct.image_url === url) {
          updatedProduct.image_url = updatedProduct.images?.[0] || null;
        }
      } else if (type === 'documents') {
        if (Array.isArray(updatedProduct.documents)) {
          updatedProduct.documents = updatedProduct.documents.filter(doc => {
            const docUrl = typeof doc === 'string' ? doc : doc.url;
            return docUrl !== url;
          });
        }
        if (updatedProduct.document_url === url) {
          const nextDoc = updatedProduct.documents?.[0];
          updatedProduct.document_url = nextDoc ? (typeof nextDoc === 'string' ? nextDoc : nextDoc.url) : null;
        }
      }
      setSelectedProduct(updatedProduct);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to remove asset');
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.product_name}"?`)) return;
    try {
      await deleteProduct(product.product_id);
      toast.success(`Product deleted successfully!`);
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) { toast.error('Failed to delete product'); }
  };

  const columns = [
    { 
      key: 'image_url', label: 'Image',
      render: (row) => (
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-workspace)] flex items-center justify-center shadow-sm">
          {row.image_url ? (
            <img src={getFullUrl(row.image_url)} alt={row.product_name} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(getFullUrl(row.image_url)); }} />
          ) : ( <Box size={18} className="text-[var(--text-dim)]" /> )}
        </div>
      )
    },
    { key: 'product_name', label: 'Product Name' },
    { key: 'company_name', label: 'Company Name' },
    { key: 'created_at', label: 'Registration Date', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Zap size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">Product Catalogue</h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">Inventory & Specifications Management</p>
          </div>
        </div>
        <button 
          onClick={handleOpenCreate} 
          className="btn-primary shadow-lg px-8 py-3 group hover-scale-md animate-glow"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] md:text-[14px]">Add New Product</span>
        </button>
      </div>

      <div className="workspace-card p-2.5 flex flex-col md:flex-row gap-3 items-center border border-[var(--border-color)] bg-[var(--bg-card)] rounded-xl">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={16} />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg py-2 pl-10 pr-28 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium" 
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">{products.length} Products Found</div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative group min-w-[160px] flex-1 md:flex-none">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={14} />
            <select 
              value={selectedCategory || ''} 
              onChange={(e) => setSelectedCategory(e.target.value || null)} 
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg py-2 pl-9 pr-8 outline-none focus:border-[var(--accent)] transition-all text-[12px] appearance-none cursor-pointer font-bold text-[var(--text-main)] uppercase tracking-wider"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.1em', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => ( <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option> ))}
            </select>
          </div>
          <div className="relative group min-w-[160px] flex-1 md:flex-none">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={14} />
            <select 
              value={selectedCompany || ''} 
              onChange={(e) => setSelectedCompany(e.target.value || null)} 
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg py-2 pl-9 pr-8 outline-none focus:border-[var(--accent)] transition-all text-[12px] appearance-none cursor-pointer font-bold text-[var(--text-main)] uppercase tracking-wider"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.1em', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
            >
              <option value="">All Manufacturers</option>
              {companies.map((comp) => ( <option key={comp.id || comp.name} value={comp.name}>{comp.name}</option> ))}
            </select>
          </div>
          <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-0.5 rounded-lg shadow-inner">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all duration-300 ${viewMode === 'grid' ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`} title="Grid View"><LayoutGrid size={15} /></button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-all duration-300 ${viewMode === 'table' ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`} title="Table View"><List size={15} /></button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable columns={columns} data={products} loading={loading} totalCount={pagination.total} filteredCount={products.length} currentPage={pagination.page} totalPages={Math.ceil(pagination.total / pagination.limit) || 1} onView={handleView} onEdit={handleEdit} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
          {products.map((product) => (
            <div key={product.product_id} className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div onClick={() => handleView(product)} className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] block cursor-zoom-in group/img">
                {product.image_url ? ( <img src={getFullUrl(product.image_url)} alt={product.product_name} className="w-full h-full object-contain p-6 group-hover/img:scale-110 transition-transform duration-700 ease-out" /> ) : ( <div className="w-full h-full flex items-center justify-center text-[var(--text-dim)] opacity-20"><Box size={64} strokeWidth={1} /></div> )}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); handleView(product); }} className="w-12 h-12 bg-[var(--accent)] rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0" title="View Product"><Eye size={22} /></button>
                </div>
                <div className="absolute top-4 left-4"><span className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-color)] text-[10px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-full text-[var(--accent)] shadow-sm">{product.category || 'Standard'}</span></div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1 space-y-3">
                  <h3 className="text-[15px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300">{product.product_name}</h3>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed line-clamp-2">
                    {(product.description || 'No detailed description available.').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-40" />
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{product.company_name || 'Generic'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg transition-all" title="Edit Product"><Pencil size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(product); }} className="p-2 text-rose-500/40 hover:text-rose-500 rounded-lg transition-all" title="Delete Product"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'create' ? 'Add Product' : 'Update Specifications'} 
        maxWidth="max-w-[1400px]"
        headerActions={
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
        }
      >
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
              {/* Tab Navigation */}
              <div className="flex border-b border-[var(--border-color)] mb-8 overflow-x-auto no-scrollbar gap-2">
                {[
                  { id: 'general', label: 'General Information' },
                  { id: 'specs', label: 'Technical Specifications' },
                  { id: 'bom', label: 'Bill of Material' },
                  { id: 'status', label: 'Product Status' },
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

              {/* Tab Contents */}

              {/* 1. General Information Tab */}
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
                        <input {...register('company_name', { required: 'Company is required' })} readOnly onClick={openCompanyModal} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-4 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold cursor-pointer" placeholder="Select Manufacturer..." />
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
                        <div className="flex gap-2">
                          <input {...register('sub_company')} readOnly onClick={openSubCompanyModal} className={`flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none transition-all ${!watchedCompany ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer focus:border-[var(--accent)]'}`} placeholder="Select Division" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1 ml-1">Category</label>
                        <div className="flex gap-2">
                          <input {...register('category', { required: 'Required' })} readOnly onClick={openCategoryModal} className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] cursor-pointer outline-none focus:border-[var(--accent)] transition-all" placeholder="Select Category" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1 ml-1">Sub Category</label>
                        <div className="flex gap-2">
                          <input {...register('sub_category')} readOnly onClick={openSubCategoryModal} className={`flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none transition-all ${!watchedCategory ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer focus:border-[var(--accent)]'}`} placeholder="Select Sub-Category" />
                        </div>
                      </div>
                    </div>

                    {(watchedCategory?.toLowerCase().includes('dispenser') || watchedSubCategory?.toLowerCase().includes('dispenser')) && (
                      <div className="pt-2">
                        <button 
                          type="button" 
                          onClick={() => setIsHardwareModalOpen(true)} 
                          className="w-full p-5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--accent)] rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--accent)]/50 hover:scale-[1.01] transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-[var(--accent)]/10 rounded-xl">
                              <Activity className="text-[var(--accent)]" size={24} />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-70">Dispenser Specification</p>
                              <h4 className="text-[15px] font-black uppercase tracking-tight text-[var(--text-main)]">Configure Hardware</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {(watch('fuel_types')?.length > 0 || watch('nozzles') || watch('dispensing')) && ( 
                              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                <Check size={12} strokeWidth={4} />
                                <span>Configured</span>
                              </div> 
                            )}
                            <ChevronRight size={20} strokeWidth={3} className="text-[var(--text-dim)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Technical Specifications Tab */}
              <div className={modalActiveTab === 'specs' ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
                <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-8 rounded-2xl md:rounded-[32px]">
                  
                  {/* Tab Title/Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]/60">
                    <div className="w-1.5 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" />
                    <h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">Technical Specifications & FAQs</h3>
                  </div>

                  {/* Descriptions Grid */}
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

                  {/* Grid for Specifications and FAQs */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[var(--border-color)]/40">
                    {/* Product Specifications Section */}
                    <div className="space-y-4">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Product Specifications Table</label>
                      <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-workspace)]/20">
                        <div className="grid grid-cols-[1fr_1fr_48px] bg-[var(--nav-hover)] border-b border-[var(--border-color)]">
                          <div className="px-5 py-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Attribute</div>
                          <div className="px-5 py-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-l border-[var(--border-color)]">Value</div>
                          <div />
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          {specRows.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_1fr_48px] border-b border-[var(--border-color)] last:border-b-0 group hover:bg-[var(--accent)]/5 transition-colors">
                              <input type="text" value={row.key} onChange={(e) => { const updated = [...specRows]; updated[idx].key = e.target.value; setSpecRows(updated); }} placeholder="e.g. Item Type" className="px-5 py-4 text-[13px] font-bold bg-transparent outline-none text-[var(--text-main)] placeholder-[var(--text-dim)]" />
                              <input type="text" value={row.value} onChange={(e) => { const updated = [...specRows]; updated[idx].value = e.target.value; setSpecRows(updated); }} placeholder="e.g. Camera Bracket" className="px-5 py-4 text-[13px] font-bold bg-transparent outline-none text-[var(--text-muted)] placeholder-[var(--text-dim)] border-l border-[var(--border-color)]" />
                              <button type="button" onClick={() => setSpecRows(specRows.filter((_, i) => i !== idx))} className="flex items-center justify-center text-[var(--text-dim)] hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button type="button" onClick={() => setSpecRows([...specRows, { key: '', value: '' }])} className="flex items-center gap-2 text-[var(--accent)] text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-all ml-1 cursor-pointer">
                        <Plus size={16} strokeWidth={3} />
                        <span>Add Specification Row</span>
                      </button>
                    </div>

                    {/* FAQs Section */}
                    <div className="space-y-4">
                      <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Frequently Asked Questions (FAQs)</label>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {faqRows.map((faq, idx) => (
                          <div key={idx} className="p-5 rounded-2xl bg-[var(--bg-workspace)]/40 border border-[var(--border-color)] space-y-4 relative group hover:border-[var(--accent)]/30 transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest">FAQ Item #{idx + 1}</span>
                              <button type="button" onClick={() => setFaqRows(faqRows.filter((_, i) => i !== idx))} className="text-[var(--text-dim)] hover:text-rose-500 transition-colors cursor-pointer p-1 rounded-md hover:bg-rose-500/10" title="Remove FAQ">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="space-y-3">
                              <div className="flex gap-3 items-center">
                                <span className="text-[var(--accent)] font-black text-sm w-4 flex-shrink-0">Q.</span>
                                <input 
                                  type="text" 
                                  value={faq.question} 
                                  onChange={(e) => { const updated = [...faqRows]; updated[idx].question = e.target.value; setFaqRows(updated); }} 
                                  placeholder="What is the operating voltage?" 
                                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] font-bold transition-all" 
                                />
                              </div>
                              <div className="flex gap-3 items-start">
                                <span className="text-emerald-500 font-black text-sm w-4 flex-shrink-0 mt-2">A.</span>
                                <textarea 
                                  value={faq.answer} 
                                  onChange={(e) => { const updated = [...faqRows]; updated[idx].answer = e.target.value; setFaqRows(updated); }} 
                                  placeholder="The operating voltage is 230V AC." 
                                  rows={2} 
                                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--text-muted)] outline-none focus:border-[var(--accent)] resize-none font-medium transition-all" 
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFaqRows([...faqRows, { question: '', answer: '' }])} 
                        className="w-full py-3 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] flex items-center justify-center gap-2 hover:bg-[var(--accent)]/5 hover:border-[var(--accent)]/50 transition-all group mt-2 cursor-pointer"
                      >
                        <Plus size={14} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Add FAQ Row</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* 3. Bill of Material Tab */}
              <div className={modalActiveTab === 'bom' ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
                <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-8 rounded-2xl md:rounded-[32px]">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]/60">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" />
                      <h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">Bill of Material</h3>
                    </div>
                    {selectedProduct?.product_id && (
                      <button
                        type="button"
                        onClick={handleSaveBom}
                        disabled={isSavingBom}
                        className="btn-primary py-2 px-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                        style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
                      >
                        {isSavingBom ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
                        Save BOM
                      </button>
                    )}
                  </div>

                  {/* Component Selector Sections */}
                  <div className="space-y-4">
                    {[
                      { type: 'pcb', label: 'PCB', icon: Cpu, color: '#00d2ff', bgColor: 'rgba(0, 210, 255, 0.08)' },
                      { type: 'electrical', label: 'Electrical Parts', icon: Zap, color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.08)' },
                      { type: 'electronics', label: 'Electronics Parts', icon: CircuitBoard, color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.08)' },
                      { type: 'structural', label: 'Structural Parts', icon: Layers, color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.08)' }
                    ].map(({ type, label, icon: Icon, color, bgColor }) => {
                      const isOpen = bomExpandedSection === type;
                      const sectionItems = bomItems.filter(i => i.component_type === type);
                      const opts = bomOptions[type] || [];

                      return (
                        <div key={type} className="border border-[var(--border-color)] rounded-2xl overflow-hidden transition-all duration-300" style={{ borderColor: isOpen ? color + '55' : undefined }}>
                          {/* Accordion Header */}
                          <button
                            type="button"
                            onClick={() => setBomExpandedSection(isOpen ? null : type)}
                            className="w-full flex items-center justify-between px-5 py-4 transition-all group"
                            style={{ background: isOpen ? bgColor : undefined }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: bgColor, color }}>
                                <Icon size={16} strokeWidth={2.5} />
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Component Group</p>
                                <h4 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-tight">{label}</h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {sectionItems.length > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: bgColor, color }}>
                                  {sectionItems.length} selected
                                </span>
                              )}
                              <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} style={{ color }} />
                            </div>
                          </button>

                          {/* Dropdown Content */}
                          {isOpen && (
                            <div className="px-5 pb-5 space-y-4 border-t border-[var(--border-color)]/40">
                              {/* Selector */}
                              <div className="pt-4">
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Add component</label>
                                <select
                                  className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] font-bold text-[var(--text-main)] outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
                                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
                                  onChange={(e) => {
                                    const opt = opts.find(o => String(o.id) === e.target.value);
                                    if (opt) addBomItem(type, opt.id, opt.name);
                                    e.target.value = '';
                                  }}
                                  defaultValue=""
                                >
                                  <option value="">— Select {label} to add —</option>
                                  {opts.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                  ))}
                                </select>
                                {opts.length === 0 && (
                                  <p className="text-[10px] text-[var(--text-dim)] italic mt-2 ml-1">No active {label} found in inventory.</p>
                                )}
                              </div>

                              {/* Selected items */}
                              {sectionItems.length > 0 && (
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Selected ({sectionItems.length})</label>
                                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {sectionItems.map((item, idx) => {
                                      const globalIdx = bomItems.findIndex(b => b.component_type === type && String(b.component_id) === String(item.component_id));
                                      return (
                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-workspace)]/60 group hover:border-[var(--accent)]/30 transition-all">
                                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                          <span className="flex-1 text-[12px] font-bold text-[var(--text-main)] truncate">{item.name}</span>
                                          <div className="flex items-center gap-2">
                                            <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">Qty</label>
                                            <input
                                              type="number"
                                              min="1"
                                              value={item.quantity}
                                              onChange={(e) => updateBomItem(globalIdx, 'quantity', parseInt(e.target.value) || 1)}
                                              className="w-14 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[12px] font-black text-center text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => removeBomItem(globalIdx)}
                                            className="p-1.5 text-[var(--text-dim)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all flex-shrink-0"
                                            title="Remove"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* BOM Summary */}
                  {bomItems.length > 0 && (
                    <div className="pt-4 border-t border-[var(--border-color)]/40">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">BOM Summary — {bomItems.length} component{bomItems.length !== 1 ? 's' : ''}</p>
                      <div className="flex flex-wrap gap-2">
                        {bomItems.map((item, i) => (
                          <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider" style={{
                            borderColor: item.component_type === 'pcb' ? '#00d2ff44' : item.component_type === 'electrical' ? '#fbbf2444' : item.component_type === 'electronics' ? '#34d39944' : '#a78bfa44',
                            color: item.component_type === 'pcb' ? '#00d2ff' : item.component_type === 'electrical' ? '#fbbf24' : item.component_type === 'electronics' ? '#34d399' : '#a78bfa',
                            background: item.component_type === 'pcb' ? 'rgba(0,210,255,0.08)' : item.component_type === 'electrical' ? 'rgba(251,191,36,0.08)' : item.component_type === 'electronics' ? 'rgba(52,211,153,0.08)' : 'rgba(167,139,250,0.08)'
                          }}>
                            <span className="opacity-60">{item.component_type}:</span>
                            <span>{item.name}</span>
                            {item.quantity > 1 && <span className="opacity-60">×{item.quantity}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Product Status Tab */}
              <div className={modalActiveTab === 'status' ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
                <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-6 rounded-2xl md:rounded-[32px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" />
                    <h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">Product Status</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { name: 'product_promoted', label: 'Product Promoted', desc: 'Actively marketed & featured in campaigns' },
                      { name: 'product_inquired', label: 'Product Inquired', desc: 'Customer queries received for this product' },
                      { name: 'product_quoted', label: 'Product Quoted', desc: 'Formal price quotes generated for clients' },
                      { name: 'product_sampled', label: 'Product Sampled', desc: 'Samples sent to prospective customers' },
                      { name: 'product_purchased', label: 'Product Purchased', desc: 'Successfully ordered & sold in orders' }
                    ].map(status => {
                      const isChecked = watch(status.name);
                      return (
                        <label 
                          key={status.name}
                          className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 cursor-pointer select-none group relative overflow-hidden ${
                            isChecked 
                              ? 'bg-[var(--accent)]/5 border-[var(--accent)]' 
                              : 'bg-[var(--bg-workspace)]/40 border-[var(--border-color)] hover:border-[var(--text-muted)]/50'
                          }`}
                          style={{ boxShadow: isChecked ? '0 0 15px -3px var(--border-glow)' : 'none' }}
                        >
                          <input 
                            type="checkbox"
                            {...register(status.name)}
                            disabled={modalMode === 'view'}
                            className="sr-only"
                          />
                          {/* Custom Checkbox Indicator */}
                          <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                            isChecked 
                              ? 'bg-[var(--accent)] border-[var(--accent)] text-white' 
                              : 'border-[var(--text-muted)] group-hover:border-[var(--text-main)]'
                          }`}>
                            {isChecked && <Check size={12} strokeWidth={4} />}
                          </div>

                          <div className="space-y-1">
                            <span className={`block text-[13px] font-black uppercase tracking-wider transition-colors ${
                              isChecked ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'
                            }`}>
                              {status.label}
                            </span>
                            <span className="block text-[11px] text-[var(--text-muted)] leading-relaxed font-medium">
                              {status.desc}
                            </span>
                          </div>
                        </label>
                      );
                    })}
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
                  {modalMode === 'edit' && (
                    <div className="space-y-6">
                      {((selectedProduct?.images && selectedProduct.images.length > 0) || selectedProduct?.image_url) && (
                        <div className="space-y-3">
                          <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Current Gallery</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {(selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images : [selectedProduct.image_url]).filter(Boolean).map((url, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] group bg-[var(--bg-workspace)]/50">
                                <img src={getFullUrl(url)} alt="" className="w-full h-full object-contain p-2" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                  <button type="button" onClick={() => handleRemoveAsset(url, 'images')} className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all cursor-pointer"><Trash2 size={16} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pending Images Previews */}
                      {previews.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] ml-1">Pending Photos ({previews.length})</label>
                            <button type="button" onClick={clearPendingImages} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline cursor-pointer">Clear All</button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {previews.map((preview, idx) => (
                              <div key={preview.id} className="relative aspect-square rounded-xl border-2 border-[var(--accent)] border-dashed overflow-hidden group bg-[var(--bg-workspace)]">
                                <img src={preview.url} alt="Preview" className="w-full h-full object-contain p-2" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                  <button type="button" onClick={() => removePendingImage(idx)} className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all cursor-pointer"><Trash2 size={16} /></button>
                                </div>
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
                                  <div className="flex items-center gap-3 truncate">
                                    <FileText size={16} className="text-[var(--accent)]" />
                                    <span className="text-[11px] font-bold text-[var(--text-main)] truncate uppercase tracking-wider">{doc.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a 
                                      href={getFullUrl(doc.url)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
                                      title="View"
                                    >
                                      <Eye size={14} />
                                    </a>
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveAsset(doc.url, 'documents')} 
                                      className="p-1.5 text-rose-500/50 hover:text-rose-500 transition-colors cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileInput label="Upload New Image" name="image" accept="image/*" icon={Plus} />
                    <div className="space-y-4">
                      <FileInput label="Upload New Datasheet" name="document" accept=".pdf,.doc,.docx,.xls,.xlsx" icon={FileText} />
                      <div>
                        <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2 ml-1">Datasheet Label / Name</label>
                        <input 
                          type="text" 
                          {...register('document_label')} 
                          disabled={modalMode === 'view'}
                          className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold"
                          placeholder="e.g. Technical Datasheet V2, User Manual..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
        </div>
      </Modal>

      <Modal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        title="Hardware Configuration"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-8 p-2">
          <div className="flex items-center gap-4 p-5 bg-[var(--nav-hover)] rounded-2xl border border-[var(--border-color)]">
             <div className="w-12 h-12 bg-[var(--accent)] rounded-xl flex items-center justify-center text-white shadow-lg">
                <Fuel size={24} strokeWidth={2.5} />
             </div>
             <div>
                <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight uppercase leading-none">Dispenser Specifications</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1.5 uppercase tracking-[0.2em] opacity-70">Select hardware options for {watchedSubCategory || 'Dispenser'}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Tag size={14} strokeWidth={3} />
                <label className="text-[11px] font-black uppercase tracking-widest">Fuel Variant</label>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'Def', label: 'DEF', icon: <Droplets size={16} /> },
                  { id: 'Petrol', label: 'Petrol', icon: <Flame size={16} /> },
                  { id: 'Diesel', label: 'Diesel', icon: <Fuel size={16} /> },
                  { id: 'Oil', label: 'Oil', icon: <Droplet size={16} /> }
                ].map(type => (
                  <label key={type.id} className="relative cursor-pointer group">
                    <input type="checkbox" value={type.id} {...register('fuel_types')} disabled={modalMode === 'view'} className="peer sr-only" />
                    <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all peer-checked:border-[var(--accent)] peer-checked:bg-[var(--nav-hover)] group-hover:border-[var(--accent)]/50 peer-checked:[&_svg]:scale-100 peer-checked:[&_.check-box]:bg-[var(--accent)] peer-checked:[&_.check-box]:border-[var(--accent)]">
                      <div className="text-[var(--text-dim)] peer-checked:text-[var(--accent)] transition-colors">{type.icon}</div>
                      <span className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-tighter">{type.label}</span>
                      <div className="check-box ml-auto w-6 h-6 rounded-md border-2 border-[var(--border-color)] bg-[var(--bg-workspace)] transition-all flex items-center justify-center">
                        <Check size={14} className="text-white scale-0 transition-transform" strokeWidth={4.5} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-l border-[var(--border-color)] pl-6">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <LayoutGrid size={14} strokeWidth={3} />
                <label className="text-[11px] font-black uppercase tracking-widest">Dispenser Type</label>
              </div>
              <div className="space-y-3">
                {['Mini', 'Tower', 'Storage', 'MultiProduct'].map(type => (
                  <label key={type} className="relative cursor-pointer block group">
                    <input type="radio" value={type} {...register('dispenser_type')} disabled={modalMode === 'view'} className="peer sr-only" />
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all peer-checked:border-[var(--accent)] peer-checked:bg-[var(--nav-hover)] group-hover:border-[var(--accent)]/50 peer-checked:[&_.dot]:scale-100">
                      <span className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-tight">{type}</span>
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] peer-checked:border-[var(--accent)] flex items-center justify-center transition-all">
                        <div className="dot w-2.5 h-2.5 rounded-full bg-[var(--accent)] scale-0 transition-transform" />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-l border-[var(--border-color)] pl-6">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Box size={14} strokeWidth={3} />
                <label className="text-[11px] font-black uppercase tracking-widest">Nozzle Count</label>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].filter(num => {
                  const fuelCount = watch('fuel_types')?.length || 0;
                  if (fuelCount > 1 && num === 1) return false;
                  if (fuelCount > 2 && num === 2) return false;
                  return true;
                }).map(num => (
                  <label key={num} className="relative cursor-pointer block group">
                    <input type="radio" value={`${num} Nozzle`} {...register('nozzles')} disabled={modalMode === 'view'} className="peer sr-only" />
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all peer-checked:border-[var(--accent)] peer-checked:bg-[var(--nav-hover)] group-hover:border-[var(--accent)]/50 peer-checked:[&_.dot]:scale-100">
                      <span className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-tight">{num} Nozzle</span>
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] peer-checked:border-[var(--accent)] flex items-center justify-center transition-all">
                        <div className="dot w-2.5 h-2.5 rounded-full bg-[var(--accent)] scale-0 transition-transform" />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-l border-[var(--border-color)] pl-6">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Activity size={14} strokeWidth={3} />
                <label className="text-[11px] font-black uppercase tracking-widest">Dispensing Flow</label>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].filter(num => {
                  const nozzleValue = watch('nozzles');
                  if (!nozzleValue) return true; // Show all if no nozzle selected yet
                  const nozzleCount = parseInt(nozzleValue) || 0;
                  return num <= nozzleCount;
                }).map(num => (
                  <label key={num} className="relative cursor-pointer block group">
                    <input type="radio" value={`${num} dispensing`} {...register('dispensing')} disabled={modalMode === 'view'} className="peer sr-only" />
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all peer-checked:border-[var(--accent)] peer-checked:bg-[var(--nav-hover)] group-hover:border-[var(--accent)]/50 peer-checked:[&_.dot]:scale-100">
                      <span className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-tight">{num} dispensing</span>
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] peer-checked:border-[var(--accent)] flex items-center justify-center transition-all">
                        <div className="dot w-2.5 h-2.5 rounded-full bg-[var(--accent)] scale-0 transition-transform" />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button type="button" onClick={() => setIsHardwareModalOpen(false)} className="btn-primary w-full py-4 shadow-lg uppercase tracking-widest text-[12px]">
              {modalMode === 'view' ? 'Close Specifications' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </Modal>

      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSelect={handleSubCategoryPick} onSelectCategory={handleCategoryPick} initialCategory={categoryModalMode === 'subcategory' ? categories.find(c => c.name === watchedCategory) : null} />
      <CompanyModal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} onSelect={handleSubCompanyPick} onSelectCompany={handleCompanyPick} initialCompany={companyModalMode === 'subcompany' ? companies.find(c => c.name === watchedCompany) : null} />
      {previewImageUrl && ( <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-10" onClick={() => setPreviewImageUrl(null)}><img src={previewImageUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-3xl" /><button className="absolute top-10 right-10 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"><X size={32} /></button></div> )}
    </div>
  );
};

export default ProductListPage;
