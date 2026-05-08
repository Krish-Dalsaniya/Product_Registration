import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, createProduct, updateProduct, removeAsset, deleteProduct } from '../../api/products';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import CategoryModal from '../../components/shared/CategoryModal';
import { Search, Plus, Loader2, Box, Tag, DollarSign, FileText, Check, Droplets, Flame, Fuel, Droplet, Activity, CheckCircle, ChevronRight, Trash2, LayoutGrid, List, Eye, Download, X, Zap, Building2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { getCategories } from '../../api/categories';
import { getCompanies } from '../../api/companies';
import CompanyModal from '../../components/shared/CompanyModal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const ProductListPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [specRows, setSpecRows] = useState([]);
  const [faqRows, setFaqRows] = useState([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

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

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm();

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      [{ 'align': [] }],
      ['clean']
    ],
  };
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
    const timer = setTimeout(() => { fetchProducts(); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, selectedCompany, pagination.page]);

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
      if (data.image && data.image[0]) formData.append('image', data.image[0]);
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
      faqs: '[]'
    });
    setIsModalOpen(true);
  };

  const handleView = (product) => {
    const hardware = parseHardwareSpec(product.specification);
    const enrichedProduct = { ...product, parsedSpecification: hardware ? hardware.original_spec : product.specification, hardware: hardware };
    setSelectedProduct(enrichedProduct);
    setModalMode('view');
    setActiveTab('description');
    setActiveImageIdx(0);
    const resetData = { ...product, fuel_types: hardware?.fuel_types || [], nozzles: hardware?.nozzles || '', dispensing: hardware?.dispensing || '', dispenser_type: hardware?.dispenser_type || '', specification: hardware ? hardware.original_spec : product.specification };
    reset(resetData);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    const hardware = parseHardwareSpec(product.specification);
    setSpecRows(parseSpecRows(product.specification));
    setFaqRows(product.faqs || []);
    const resetData = { product_name: product.product_name, company_name: product.company_name || '', sub_company: product.sub_company || '', description: product.description || '', category: product.category || '', sub_category: product.sub_category || '', feature: product.feature || '', fuel_types: hardware?.fuel_types || [], nozzles: hardware?.nozzles || '', dispensing: hardware?.dispensing || '', dispenser_type: hardware?.dispenser_type || '', specification: hardware ? hardware.original_spec : product.specification };
    reset(resetData);
    setIsModalOpen(true);
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
          updatedProduct.documents = updatedProduct.documents.filter(u => u !== url);
        }
        if (updatedProduct.document_url === url) {
          updatedProduct.document_url = updatedProduct.documents?.[0] || null;
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
            {...register(name)} 
            accept={accept} 
            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
          />
          <div className={`w-full bg-[var(--input-bg)] border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
            hasFile 
              ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
              : 'border-[var(--text-dim)] group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/5'
          }`}>
            <div className={`p-3 rounded-xl transition-all duration-300 ${
              hasFile ? 'bg-[var(--accent)] text-white scale-110' : 'bg-[var(--bg-workspace)] text-[var(--accent)] shadow-sm'
            }`}>
              {hasFile ? <CheckCircle size={24} /> : <Icon size={24} />}
            </div>
            <div className="text-center">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${hasFile ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`}>
                {hasFile ? 'File Attached' : label.replace('Upload New ', '')}
              </p>
              <p className={`text-[12px] font-bold truncate max-w-[200px] px-4 ${hasFile ? 'text-[var(--text-main)]' : 'text-[var(--text-dim)] opacity-40'}`}>
                {fileName}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <Zap size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">Product Catalogue</h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">Inventory & Specifications Management</p>
          </div>
        </div>
        <button 
          onClick={handleOpenCreate} 
          className="btn-primary shadow-lg px-8 py-3 group"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] md:text-[14px]">Add New Product</span>
        </button>
      </div>

      <div className="workspace-card p-4 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium" 
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">{products.length} Products Found</div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative group min-w-[180px] flex-1 md:flex-none">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={16} />
            <select 
              value={selectedCategory || ''} 
              onChange={(e) => setSelectedCategory(e.target.value || null)} 
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 pl-11 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[13px] appearance-none cursor-pointer font-bold text-[var(--text-main)] uppercase tracking-wider"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => ( <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option> ))}
            </select>
          </div>
          <div className="relative group min-w-[180px] flex-1 md:flex-none">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={16} />
            <select 
              value={selectedCompany || ''} 
              onChange={(e) => setSelectedCompany(e.target.value || null)} 
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 pl-11 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[13px] appearance-none cursor-pointer font-bold text-[var(--text-main)] uppercase tracking-wider"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
            >
              <option value="">All Manufacturers</option>
              {companies.map((comp) => ( <option key={comp.id || comp.name} value={comp.name}>{comp.name}</option> ))}
            </select>
          </div>
          <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-1 rounded-xl shadow-inner">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all duration-300 ${viewMode === 'grid' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`} title="Grid View"><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-lg transition-all duration-300 ${viewMode === 'table' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`} title="Table View"><List size={18} /></button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable columns={columns} data={products} loading={loading} totalCount={pagination.total} filteredCount={products.length} currentPage={pagination.page} totalPages={Math.ceil(pagination.total / pagination.limit) || 1} onView={handleView} onEdit={handleEdit} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <div key={product.product_id} className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div onClick={() => handleView(product)} className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] block cursor-zoom-in group/img">
                {product.image_url ? ( <img src={getFullUrl(product.image_url)} alt={product.product_name} className="w-full h-full object-contain p-6 group-hover/img:scale-110 transition-transform duration-700 ease-out" /> ) : ( <div className="w-full h-full flex items-center justify-center text-[var(--text-dim)] opacity-20"><Box size={64} strokeWidth={1} /></div> )}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); handleView(product); }} className="w-12 h-12 bg-[var(--accent)] rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0" title="View Product"><Eye size={22} /></button>
                </div>
                <div className="absolute top-4 left-4"><span className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-color)] text-[10px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-full text-[var(--accent)] shadow-sm">{product.category || 'Standard'}</span></div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex-1 space-y-3">
                  <h3 className="text-[17px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300">{product.product_name}</h3>
                  <p className="text-[13px] text-[var(--text-muted)] font-medium leading-relaxed line-clamp-3">
                    {(product.description || 'No detailed description available.').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-40" />
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{product.company_name || 'Generic'}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(product); }} className="flex items-center gap-1.5 text-[9px] font-black text-rose-500/50 uppercase tracking-widest hover:text-rose-500 transition-all py-1.5 px-3 rounded-lg hover:bg-rose-500/10 group/del"><Trash2 size={12} />Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'create' ? 'Add Product' : modalMode === 'edit' ? 'Update Specifications' : 'Product Profile'} 
        maxWidth="max-w-[1400px]"
        headerActions={modalMode !== 'view' && (
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
        )}
      >
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          {modalMode === 'view' ? (
            <div className="space-y-12 pb-10">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-4 px-1">
                <button 
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-50 hover:opacity-100 hover:text-[var(--accent)] transition-all cursor-pointer"
                >
                  <span>Dashboard</span>
                </button>
                <ChevronRight size={14} className="text-[var(--text-dim)] opacity-30" />
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-50 hover:opacity-100 hover:text-[var(--accent)] transition-all cursor-pointer"
                >
                  <span>Products</span>
                </button>
                <ChevronRight size={14} className="text-[var(--text-dim)] opacity-30" />
                <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                  <span>{selectedProduct?.product_name}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-6">
                  {(() => {
                    const allImages = selectedProduct?.images && selectedProduct.images.length > 0 ? selectedProduct.images : (selectedProduct?.image_url ? [selectedProduct.image_url] : []);
                    const currentUrl = allImages[activeImageIdx] || allImages[0];
                    return (
                      <>
                        <div className="aspect-square bg-[var(--bg-workspace)] rounded-[32px] border border-[var(--border-color)] overflow-hidden group relative flex items-center justify-center">
                          {currentUrl ? ( <img src={getFullUrl(currentUrl)} className="w-full h-full object-contain p-8 animate-in fade-in zoom-in-95" alt="Main Product" /> ) : ( <Box size={100} className="text-[var(--text-dim)] opacity-20" /> )}
                          {allImages.length > 1 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                              {allImages.map((_, i) => ( <button key={i} onClick={() => setActiveImageIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImageIdx ? 'bg-[var(--accent)] w-6' : 'bg-[var(--text-muted)] opacity-30'}`} /> ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                          {allImages.map((url, idx) => ( <button key={idx} onClick={() => setActiveImageIdx(idx)} className={`w-20 h-20 flex-shrink-0 rounded-2xl border-2 transition-all overflow-hidden bg-[var(--bg-workspace)] ${idx === activeImageIdx ? 'border-[var(--accent)] scale-105' : 'border-transparent opacity-60'}`}><img src={getFullUrl(url)} className="w-full h-full object-contain p-2" /></button> ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="lg:col-span-7 space-y-10 py-4">
                  <div>
                    <div className="flex items-center gap-3 mb-4"><span className="bg-[var(--nav-hover)] text-[var(--accent)] font-black text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">{selectedProduct?.category || 'General'}</span><span className="text-[var(--text-muted)] font-black text-[11px] uppercase tracking-widest opacity-40">Ref: {selectedProduct?.product_id?.toString().slice(0, 8).toUpperCase()}</span></div>
                    {selectedProduct?.company_name && <p className="text-[12px] font-black text-[var(--accent)] uppercase tracking-[0.2em] mb-2">{selectedProduct.company_name}</p>}
                    <h1 className="text-4xl font-black text-[var(--text-main)] leading-tight tracking-tight">{selectedProduct?.product_name}</h1>
                    
                    {(() => {
                      const hardware = parseHardwareSpec(selectedProduct?.specification);
                      if (!hardware) return null;
                      return (
                        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-6">
                          {hardware.fuel_types?.length > 0 && (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/10"><Droplet size={14} strokeWidth={3} /></div>
                              <span className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-tight">{hardware.fuel_types.join(', ')}</span>
                            </div>
                          )}
                          {hardware.dispenser_type && (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/10"><LayoutGrid size={14} strokeWidth={3} /></div>
                              <span className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-tight">{hardware.dispenser_type}</span>
                            </div>
                          )}
                          {hardware.nozzles && (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/10"><Box size={14} strokeWidth={3} /></div>
                              <span className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-tight">{hardware.nozzles}</span>
                            </div>
                          )}
                          {hardware.dispensing && (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/10"><Activity size={14} strokeWidth={3} /></div>
                              <span className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-tight">{hardware.dispensing}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-6 py-6 border-y border-[var(--border-color)]">
                    <div className="flex items-center gap-2"><CheckCircle className="text-emerald-500" size={16} /><span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Certified Operational</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                    <div className="space-y-1"><p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest opacity-60">Manufacturer</p><p className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-wider">{selectedProduct?.company_name || 'Generic Brand'}</p></div>
                    <div className="space-y-1"><p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest opacity-60">Classification</p><p className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-wider">{selectedProduct?.sub_category || 'Industrial System'}</p></div>
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <button onClick={() => { setIsModalOpen(false); setTimeout(() => handleEdit(selectedProduct), 100); }} className="btn-primary flex-1 py-4 px-6 shadow-lg uppercase tracking-widest text-[12px]" style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}>Edit Specifications</button>
                    <button onClick={() => handleDelete(selectedProduct)} className="px-6 py-4 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-color)] overflow-hidden shadow-sm">
                <div className="flex bg-[var(--bg-workspace)] border-b border-[var(--border-color)] overflow-x-auto no-scrollbar">
                  {['description', 'specification', 'features', 'documents', 'faqs'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                      {tab}
                      {activeTab === tab && <div className="absolute bottom-0 left-8 right-8 h-1 bg-[var(--accent)] rounded-t-full shadow-[0_-4px_12px_var(--border-glow)]" />}
                    </button>
                  ))}
                </div>
                <div className="p-10">
                  {activeTab === 'description' && ( 
                    <div 
                      className="text-[15px] text-[var(--text-main)] leading-relaxed font-medium opacity-80 rich-text-content"
                      dangerouslySetInnerHTML={{ __html: selectedProduct?.description || 'No description available.' }}
                    /> 
                  )}
                    {activeTab === 'specification' && (() => {
                      const specTableRows = parseSpecRows(selectedProduct?.specification);
                      
                      return (
                        <div className="space-y-8">
                          {specTableRows.length > 0 && (specTableRows.some(r => r.key.trim() !== '')) ? (
                            <div className="space-y-4">
                              <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
                                {specTableRows.filter(r => r.key.trim() !== '').map((row, idx) => (
                                  <div key={idx} className={`grid grid-cols-[220px_1fr] border-b border-[var(--border-color)] last:border-b-0 ${idx % 2 === 0 ? 'bg-[var(--bg-workspace)]/30' : 'bg-[var(--bg-workspace)]/10'}`}>
                                    <div className="px-6 py-4 text-[13px] font-black text-[var(--text-muted)] border-r border-[var(--border-color)] uppercase tracking-wider">{row.key}</div>
                                    <div className="px-6 py-4 text-[13px] text-[var(--text-main)] font-bold">{row.value || '—'}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12 bg-[var(--bg-workspace)]/20 rounded-3xl border-2 border-dashed border-[var(--border-color)]">
                              <p className="text-[var(--text-dim)] font-black uppercase tracking-widest text-[11px] opacity-40">No technical data specified</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  {activeTab === 'features' && (
                    <div className="space-y-4 rich-text-content">
                      {selectedProduct?.feature ? (
                        <div 
                          className="text-[14px] text-[var(--text-main)] font-bold tracking-wide leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: selectedProduct.feature }}
                        />
                      ) : ( 
                        <p className="text-center text-[var(--text-dim)] font-black uppercase tracking-widest text-[11px] py-10">No specific features listed</p> 
                      )}
                    </div>
                  )}
                  {activeTab === 'documents' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(selectedProduct?.documents || [selectedProduct?.document_url]).filter(Boolean).map((docUrl, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-workspace)]/30 hover:border-[var(--accent)] transition-all group">
                          <div className="p-3 bg-[var(--nav-hover)] rounded-xl text-[var(--accent)]"><FileText size={22} /></div>
                          <div className="flex-1 min-w-0"><p className="text-[13px] font-black text-[var(--text-main)] truncate tracking-wider uppercase">{docUrl.split('/').pop()}</p></div>
                          <div className="flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-all">
                            <a 
                              href={getFullUrl(docUrl)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2.5 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                              title="View Document"
                            >
                              <Eye size={18} />
                            </a>
                            <a 
                              href={getFullUrl(docUrl)} 
                              download 
                              className="p-2.5 bg-[var(--accent)] text-white rounded-xl shadow-lg hover:scale-105 transition-all"
                              title="Download Document"
                            >
                              <Download size={18} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-6 rounded-2xl md:rounded-[32px]">
                    <div className="flex items-center gap-3 mb-4"><div className="w-1 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" /><h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">General Information</h3></div>
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
                            className="w-full p-5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--accent)] rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--accent)]/50 hover:scale-[1.01] transition-all flex items-center justify-between group"
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

                  <div className="p-4 md:p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-6 rounded-2xl md:rounded-[32px]">
                    <div className="flex items-center gap-3 mb-4"><div className="w-1 h-6 md:w-2 md:h-8 bg-[var(--accent)] rounded-full" /><h3 className="text-base md:text-lg font-black text-[var(--text-main)] uppercase tracking-widest">Asset Management</h3></div>
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
                                    <button type="button" onClick={() => handleRemoveAsset(url, 'images')} className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all"><Trash2 size={16} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {((selectedProduct?.documents && selectedProduct.documents.length > 0) || selectedProduct?.document_url) && (
                          <div className="space-y-3">
                            <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Current Documents</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(selectedProduct.documents && selectedProduct.documents.length > 0 ? selectedProduct.documents : [selectedProduct.document_url]).filter(Boolean).map((url, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-workspace)]/30 border border-[var(--border-color)] rounded-xl group hover:border-[var(--accent)]/50 transition-all">
                                  <div className="flex items-center gap-3 truncate">
                                    <FileText size={16} className="text-[var(--accent)]" />
                                    <span className="text-[11px] font-bold text-[var(--text-main)] truncate uppercase tracking-wider">{url.split('/').pop()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a 
                                      href={getFullUrl(url)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
                                      title="View"
                                    >
                                      <Eye size={14} />
                                    </a>
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveAsset(url, 'documents')} 
                                      className="p-1.5 text-rose-500/50 hover:text-rose-500 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FileInput label="Upload New Image" name="image" accept="image/*" icon={Plus} />
                      <FileInput label="Upload New Datasheet" name="document" accept=".pdf,.doc,.docx,.xls,.xlsx" icon={FileText} />
                    </div>
                  </div>

                  <div className="p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-6 rounded-[32px]">
                    <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className="w-2 h-8 bg-[var(--accent)] rounded-full" /><h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-widest">FAQs</h3></div></div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {faqRows.map((faq, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-[var(--bg-workspace)]/30 border border-[var(--border-color)] space-y-4 group">
                          <div className="flex items-center justify-between"><span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Question {idx + 1}</span><button type="button" onClick={() => setFaqRows(faqRows.filter((_, i) => i !== idx))} disabled={faqRows.length === 1} className="text-[var(--text-dim)] hover:text-rose-500 disabled:opacity-10 transition-colors"><Trash2 size={16} /></button></div>
                          <input type="text" value={faq.question} onChange={(e) => { const updated = [...faqRows]; updated[idx].question = e.target.value; setFaqRows(updated); }} placeholder="Enter question here..." className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold" />
                          <textarea value={faq.answer} onChange={(e) => { const updated = [...faqRows]; updated[idx].answer = e.target.value; setFaqRows(updated); }} placeholder="Enter answer here..." rows={2} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-all resize-none font-medium" />
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setFaqRows([...faqRows, { question: '', answer: '' }])} className="flex items-center gap-2 text-[var(--accent)] text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-all ml-1"><Plus size={16} strokeWidth={3} /><span>Add New FAQ Item</span></button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-8 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-6 rounded-[32px]">
                    <div className="flex items-center gap-3 mb-4"><div className="w-2 h-8 bg-[var(--accent)] rounded-full" /><h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-widest">Technical Specifications</h3></div>
                    <div className="space-y-5">
                      <div className="space-y-2"><label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Product Description</label><Controller name="description" control={control} render={({ field }) => ( <ReactQuill theme="snow" value={field.value || ''} onChange={field.onChange} modules={quillModules} readOnly={modalMode === 'view'} placeholder="Primary operational description..." /> )} /></div>
                      <div className="space-y-2"><label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Key Features</label><Controller name="feature" control={control} render={({ field }) => ( <ReactQuill theme="snow" value={field.value || ''} onChange={field.onChange} modules={quillModules} readOnly={modalMode === 'view'} placeholder="• High durability&#10;• Weather resistant..." /> )} /></div>
                      <div className="pt-4 space-y-4">
                        <div className="flex items-center justify-between ml-1"><label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Product Specifications</label></div>
                        <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-workspace)]/20">
                          <div className="grid grid-cols-[1fr_1fr_48px] bg-[var(--nav-hover)] border-b border-[var(--border-color)]"><div className="px-5 py-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Attribute</div><div className="px-5 py-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-l border-[var(--border-color)]">Value</div><div /></div>
                          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {specRows.map((row, idx) => (
                              <div key={idx} className="grid grid-cols-[1fr_1fr_48px] border-b border-[var(--border-color)] last:border-b-0 group hover:bg-[var(--accent)]/5 transition-colors">
                                <input type="text" value={row.key} onChange={(e) => { const updated = [...specRows]; updated[idx].key = e.target.value; setSpecRows(updated); }} placeholder="e.g. Item Type" className="px-5 py-4 text-[13px] font-bold bg-transparent outline-none text-[var(--text-main)] placeholder-[var(--text-dim)]" />
                                <input type="text" value={row.value} onChange={(e) => { const updated = [...specRows]; updated[idx].value = e.target.value; setSpecRows(updated); }} placeholder="e.g. Camera Bracket" className="px-5 py-4 text-[13px] font-bold bg-transparent outline-none text-[var(--text-muted)] placeholder-[var(--text-dim)] border-l border-[var(--border-color)]" />
                                <button type="button" onClick={() => setSpecRows(specRows.filter((_, i) => i !== idx))} disabled={specRows.length === 1} className="flex items-center justify-center text-[var(--text-dim)] hover:text-rose-500 disabled:opacity-10 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button type="button" onClick={() => setSpecRows([...specRows, { key: '', value: '' }])} className="flex items-center gap-2 text-[var(--accent)] text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-all ml-1"><Plus size={16} strokeWidth={3} /><span>Add Specification Row</span></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
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
      {previewImageUrl && ( <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-10" onClick={() => setPreviewImageUrl(null)}><img src={previewImageUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-3xl" /><button className="absolute top-10 right-10 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"><X size={32} /></button></div> )}
    </div>
  );
};

export default ProductListPage;
