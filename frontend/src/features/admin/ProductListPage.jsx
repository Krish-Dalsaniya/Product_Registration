import React, { useState, useEffect } from 'react';
// Removed bad import
import { useProducts } from '../../hooks/useProducts';
import { getCategories } from '../../api/categories';
import { getCompanies } from '../../api/companies';
import { deleteProduct } from '../../api/products';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import Lightbox from '../../components/shared/Lightbox';
import { Search, Plus, Tag, Building2, LayoutGrid, List, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

import ProductGridView from './components/product/ProductGridView';
import ProductTableView from './components/product/ProductTableView';
import ProductModal from './components/product/ProductModal';
import { useNavigate as useNav, useLocation as useLoc } from 'react-router-dom';

const ProductListPage = () => {
  const navigate = useNav();
  const location = useLoc();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const queryParams = { 
    page: pagination.page, 
    limit: pagination.limit,
    search: debouncedSearchTerm || undefined,
    category: selectedCategory || undefined,
    company: selectedCompany || undefined
  };

  const { data: productsData, isLoading: loading, refetch: fetchProducts } = useProducts(queryParams);
  const products = productsData?.data || [];

  useEffect(() => {
    if (productsData?.meta) {
      setPagination(prev => ({ ...prev, total: productsData.meta.total }));
    }
  }, [productsData?.meta]);

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
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); 
  const [lightboxData, setLightboxData] = useState({ isOpen: false, images: [], initialIndex: 0 });

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
    const editProductId = location.state?.editProductId;
    if (editProductId) {
      const fetchAndEdit = async () => {
        try {
          // Because getProductById is not imported here, we'll just find it in the current list or fetch it if needed.
          // Wait, we need getProductById. Let me import it.
          const { getProductById } = await import('../../api/products');
          const res = await getProductById(editProductId);
          if (res.data.success) {
            handleEdit(res.data.data);
            navigate(location.pathname, { replace: true, state: {} });
          }
        } catch (err) {
          toast.error('Failed to load product details for editing');
        }
      };
      fetchAndEdit();
    }
  }, [location.state, navigate]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleAutofillTrigger = (e) => {
      if (!isModalOpen) {
        handleOpenCreate();
        // Wait for modal to mount, then re-dispatch so ProductModal can catch it
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('AUTOFILL_PRODUCT_FORM', { detail: e.detail }));
        }, 500);
      }
    };
    
    window.addEventListener('AUTOFILL_PRODUCT_FORM', handleAutofillTrigger);
    return () => window.removeEventListener('AUTOFILL_PRODUCT_FORM', handleAutofillTrigger);
  }, [isModalOpen]);

  const handleView = (product) => {
    navigate(`/admin/products/${product.product_id}`);
  };

  const handleEdit = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (product) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete "${product.product_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteProduct(product.product_id);
      toast.success(`Product deleted successfully!`);
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) { toast.error('Failed to delete product'); }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">Product Catalogue</h1>
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
        <ProductTableView 
          products={products}
          loading={loading}
          pagination={pagination}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <ProductGridView 
          products={products}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getFullUrl={getFullUrl}
          setLightboxData={setLightboxData}
        />
      )}

      {isModalOpen && (
        <ProductModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          modalMode={modalMode}
          selectedProduct={selectedProduct}
          onSuccess={() => fetchProducts()}
          categories={categories}
          companies={companies}
          getFullUrl={getFullUrl}
        />
      )}

      <Lightbox 
        images={lightboxData.images}
        initialIndex={lightboxData.initialIndex}
        isOpen={lightboxData.isOpen}
        onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
      />
      
      {previewImageUrl && ( 
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-10" onClick={() => setPreviewImageUrl(null)}>
          <img src={previewImageUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-3xl" />
          <button className="absolute top-10 right-10 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
            <X size={32} />
          </button>
        </div> 
      )}
    </div>
  );
};

export default ProductListPage;
