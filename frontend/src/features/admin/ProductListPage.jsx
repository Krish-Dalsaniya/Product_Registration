import React, { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, removeAsset } from '../../api/products';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import CategoryModal from '../../components/shared/CategoryModal';
import { Search, Plus, Loader2, Box, Tag, DollarSign, FileText, Check, Droplets, Flame, Fuel, Droplet, Activity, CheckCircle, ChevronRight, Trash2, LayoutGrid, List } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const assetBaseURL = rawApiUrl.replace(/\/api$/, '');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState('category'); // 'category' or 'subcategory'
  const [currentCategoryObject, setCurrentCategoryObject] = useState(null);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'table' or 'grid'

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const watchedCategory = watch('category');
  const watchedSubCategory = watch('sub_category');

  const parseHardwareSpec = (specStr) => {
    console.log('Parsing Spec String:', specStr);
    try {
      if (!specStr) return null;
      const parsed = JSON.parse(specStr);
      console.log('Parsed Hardware:', parsed);
      if (parsed && typeof parsed === 'object' && 'fuel_types' in parsed) {
        return parsed;
      }
    } catch (e) {
      console.error('Spec parse error:', e);
    }
    return null;
  };

  const handleCategoryPick = (category) => {
    setValue('category', category.name);
    setValue('sub_category', ''); // Reset sub-category
    setCurrentCategoryObject(category);
  };

  const handleSubCategoryPick = (subCategoryName) => {
    setValue('sub_category', subCategoryName);
  };

  const openCategoryModal = () => {
    setCategoryModalMode('category');
    setIsCategoryModalOpen(true);
  };

  const openSubCategoryModal = () => {
    if (!watchedCategory) {
      toast.error('Please select a category first');
      return;
    }
    setCategoryModalMode('subcategory');
    setIsCategoryModalOpen(true);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { 
        page: pagination.page, 
        limit: pagination.limit,
        search: searchTerm || undefined
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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, pagination.page]);

  const onSubmit = async (data) => {
    if (modalMode === 'view') return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'image' || key === 'document') {
          if (data[key] && data[key][0]) {
            formData.append(key, data[key][0]);
          }
        } else if (key === 'fuel_types' && Array.isArray(data[key])) {
          data[key].forEach(val => formData.append('fuel_types', val));
        } else {
          formData.append(key, data[key]);
        }
      });


      if (modalMode === 'create') {
        await createProduct(formData);
        toast.success('Product created successfully!');
      } else {
        await updateProduct(selectedProduct.product_id, formData);
        toast.success('Product updated successfully!');
      }
      setIsModalOpen(false);
      reset();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedProduct(null);
    setCurrentCategoryObject(null);
    reset({ 
      product_name: '', 
      product_code: Math.random().toString(36).substring(7).toUpperCase(), 
      description: '', 
      unit_price: 0,
      category: '',
      sub_category: '',
      specification: '',
      feature: '',
      fuel_types: [],
      nozzles: '',
      dispensing: ''
    });
    setIsModalOpen(true);
  };



  const handleView = (product) => {
    console.log('Viewing Product:', product);
    setModalMode('view');
    setSelectedProduct(product);
    
    const hardware = parseHardwareSpec(product.specification);
    const resetData = {
      ...product,
      fuel_types: hardware?.fuel_types || [],
      nozzles: hardware?.nozzles || '',
      dispensing: hardware?.dispensing || '',
      specification: hardware ? hardware.original_spec : product.specification
    };
    console.log('Resetting Form with (View):', resetData);
    reset(resetData);
    
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    console.log('Editing Product:', product);
    setModalMode('edit');
    setSelectedProduct(product);
    
    const hardware = parseHardwareSpec(product.specification);
    const resetData = { 
      product_name: product.product_name, 
      product_code: product.product_code, 
      description: product.description || '', 
      unit_price: product.unit_price,
      category: product.category || '',
      sub_category: product.sub_category || '',
      feature: product.feature || '',
      fuel_types: hardware?.fuel_types || [],
      nozzles: hardware?.nozzles || '',
      dispensing: hardware?.dispensing || '',
      specification: hardware ? hardware.original_spec : product.specification
    };
    console.log('Resetting Form with (Edit):', resetData);
    reset(resetData);
    setIsModalOpen(true);
  };

  const handleRemoveAsset = async (url, type) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await removeAsset(selectedProduct.product_id, url, type);
      toast.success('Asset removed');
      
      const updatedProduct = { ...selectedProduct };
      updatedProduct[type] = updatedProduct[type].filter(u => u !== url);
      setSelectedProduct(updatedProduct);
      
      fetchProducts();
    } catch (error) {
      toast.error('Failed to remove asset');
    }
  };

  const columns = [
    { 
      key: 'image_url', 
      label: 'Image',
      render: (row) => (
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm">
          {row.image_url ? (
            <img 
              src={`${assetBaseURL}${row.image_url}`} 
              alt={row.product_name} 
              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImageUrl(`${assetBaseURL}${row.image_url}`);
              }}
            />
          ) : (
            <Box size={18} className="text-gray-300" />
          )}
        </div>
      )
    },
    { key: 'product_code', label: 'Product Code' },
    { key: 'product_name', label: 'Product Name' },
    { 
      key: 'unit_price', 
      label: 'Unit Price',
      render: (row) => <span className="font-bold text-gray-900">${parseFloat(row.unit_price).toLocaleString()}</span>
    },
    { 
      key: 'created_at', 
      label: 'Registration Date',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white border-[0.5px] border-gray-200 rounded-xl shadow-sm">
            <Box className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-[26px] font-black text-[#0B1A16] tracking-tighter uppercase leading-none">
              Products Catalogue
            </h1>
            <p className="text-[12px] text-[#64748B] font-bold mt-1.5 uppercase tracking-[0.15em]">
              INVENTORY AND PRODUCT SPECIFICATIONS
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleOpenCreate} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-blue-900/10 transition-all active:scale-95 flex items-center gap-2 text-[13px]"
        >
          <Plus size={18} />
          <span>Add New Product</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search products by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-[0.5px] border-gray-200 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-[13px]"
          />
        </div>

        <div className="flex bg-white border-[0.5px] border-gray-200 p-1 rounded-xl shadow-sm self-stretch md:self-auto">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable 
          columns={columns} 
          data={products} 
          loading={loading}
          totalCount={pagination.total}
          filteredCount={products.length}
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
          onView={handleView}
          onEdit={handleEdit}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div 
              key={product.product_id} 
              className="bg-white border-[0.5px] border-gray-200 rounded-2xl overflow-hidden group hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col"
            >
              <button 
                onClick={() => handleView(product)}
                className="relative aspect-square w-full overflow-hidden bg-gray-50 border-b-[0.5px] border-gray-100 block cursor-zoom-in group/img"
              >
                {product.image_url ? (
                  <img 
                    src={`${assetBaseURL}${product.image_url}`} 
                    alt={product.product_name} 
                    className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <Box size={60} strokeWidth={1} />
                  </div>
                )}
                
                <div className="absolute top-3 right-3 opacity-0 group-hover/img:opacity-100 transition-opacity translate-x-4 group-hover/img:translate-x-0 transition-all duration-300">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(product); }} 
                    className="w-9 h-9 bg-white rounded-xl shadow-xl flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 backdrop-blur-md border border-white/50 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-blue-600 shadow-sm">
                    {product.category || 'Standard'}
                  </span>
                </div>
              </button>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{product.product_code}</p>
                    <h3 className="text-[18px] font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{product.product_name}</h3>
                  </div>

                  <div className="pt-2">
                    <p className="text-[12px] text-gray-500 font-medium leading-relaxed line-clamp-4 text-left">
                      {product.description || 'No description available for this product.'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => handleView(product)}
                  className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-end group/btn w-full"
                >
                  <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all group-hover/btn:translate-x-0 translate-x-2">
                    <span>View Profile</span>
                    <ChevronRight size={14} strokeWidth={3} />
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'create' ? 'Product Initialization' : modalMode === 'edit' ? 'Update Specifications' : 'Product Profile'}
        maxWidth="max-w-5xl"
      >
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          {modalMode === 'view' ? (
            <div className="space-y-12 pb-10">
              {/* Top Section: Gallery & Quick Info */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left: Gallery */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="aspect-square bg-gray-50 rounded-2xl border-[0.5px] border-gray-200 overflow-hidden group relative flex items-center justify-center">
                    {selectedProduct?.image_url ? (
                      <button 
                        onClick={() => setPreviewImageUrl(`${assetBaseURL}${selectedProduct.image_url}`)}
                        className="w-full h-full cursor-zoom-in"
                      >
                        <img 
                          src={`${assetBaseURL}${selectedProduct.image_url}`} 
                          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                          alt="Main Product"
                        />
                      </button>
                    ) : (
                      <Box size={100} className="text-gray-200" strokeWidth={1} />
                    )}
                    <div className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur rounded-xl shadow-xl text-blue-600 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                      <Search size={20} />
                    </div>
                  </div>
                  
                  {/* Thumbnail Gallery */}
                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {(selectedProduct?.images || (selectedProduct?.image_url ? [selectedProduct.image_url] : [])).map((url, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSelectedProduct({...selectedProduct, image_url: url})}
                        className={`w-20 h-20 flex-shrink-0 rounded-xl border-2 transition-all overflow-hidden bg-gray-50 flex items-center justify-center ${selectedProduct?.image_url === url ? 'border-blue-600 shadow-md shadow-blue-900/10' : 'border-gray-100 hover:border-blue-200'}`}
                      >
                        <img src={`${assetBaseURL}${url}`} className="w-full h-full object-contain p-1" alt={`Thumb ${idx}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Quick Info */}
                <div className="lg:col-span-7 space-y-8 pt-4">
                  <div>
                    <p className="text-blue-600 font-black text-[12px] uppercase tracking-[0.2em] mb-2">{selectedProduct?.category || 'General'}</p>
                    <h1 className="text-[36px] font-black text-gray-900 leading-none tracking-tight">{selectedProduct?.product_name}</h1>
                  </div>

                  <div className="flex items-center gap-4 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 text-yellow-500">
                      {[1, 2, 3, 4, 5].map(i => <Plus key={i} size={14} fill="currentColor" className="rotate-45" />)}
                      <span className="text-[12px] font-bold text-gray-400 ml-2">(0 customer review)</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[15px] text-gray-500 font-medium leading-relaxed">
                      LIPL Smart Solutions provides industrial-grade equipment designed for reliability and operational excellence.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 pt-8">
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Brand</p>
                    <p className="text-[12px] font-black text-gray-900 uppercase tracking-widest">: LIPL SMART SOLUTIONS</p>
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Category</p>
                    <p className="text-[12px] font-black text-gray-900 uppercase tracking-widest">: {selectedProduct?.category}</p>
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Tags</p>
                    <p className="text-[12px] font-black text-gray-900 uppercase tracking-widest">: {selectedProduct?.sub_category || 'INDUSTRIAL'}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Tabs */}
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="flex bg-gray-50/50 border-b border-gray-100 p-2">
                  <button className="px-8 py-4 text-[13px] font-black uppercase tracking-widest text-blue-600 border-b-4 border-blue-600">Description</button>
                  <button className="px-8 py-4 text-[13px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Specification</button>
                </div>
                <div className="p-10 space-y-6">
                  <div className="prose prose-blue max-w-none">
                    <p className="text-[15px] text-gray-600 leading-relaxed font-medium">
                      {selectedProduct?.description || 'No detailed description available for this product yet.'}
                    </p>
                    {selectedProduct?.specification && (
                      <div className="mt-8 pt-8 border-t border-gray-50">
                        <h4 className="text-[16px] font-black text-gray-900 uppercase tracking-widest mb-4">Product Specifications:</h4>
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-[14px] text-gray-600 font-bold leading-relaxed whitespace-pre-wrap">
                          {selectedProduct.specification}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-5 p-5 bg-blue-50/50 rounded-2xl border-[0.5px] border-blue-100/50">
                 <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                    <Box size={28} strokeWidth={2.5} />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase leading-none">
                      {modalMode === 'create' ? 'Register New Item' : 'Update Item Details'}
                    </h2>
                    <p className="text-[10px] font-bold text-blue-600/60 mt-1.5 uppercase tracking-[0.2em]">Operational Specifications Control</p>
                 </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Name</label>
                    <input 
                      {...register('product_name', { required: true })} 
                      className="w-full bg-white border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5" 
                      placeholder="Enter product name" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Category</label>
                    <div className="flex gap-2">
                      <input 
                        {...register('category')} 
                        readOnly
                        onClick={openCategoryModal}
                        className="flex-1 border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none transition-all bg-white cursor-pointer focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5" 
                        placeholder="Select category" 
                      />
                      <button type="button" onClick={openCategoryModal} className="w-[46px] h-[46px] bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all active:scale-90">
                        <Plus size={20} strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Sub Category</label>
                    <div className="flex gap-2">
                      <input 
                        {...register('sub_category')} 
                        readOnly
                        onClick={openSubCategoryModal}
                        className={`flex-1 border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none transition-all ${watchedCategory ? 'bg-white cursor-pointer focus:border-blue-600' : 'bg-gray-100 opacity-50 cursor-not-allowed'}`} 
                        placeholder={watchedCategory ? "Select sub category" : "Select category first"} 
                      />
                      <button type="button" disabled={!watchedCategory} onClick={openSubCategoryModal} className={`w-[46px] h-[46px] border rounded-xl flex items-center justify-center transition-all ${!watchedCategory ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600/10 border-blue-600/20 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-90'}`}>
                        <Plus size={20} strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Unit Price ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="number" 
                        step="0.01" 
                        {...register('unit_price', { required: true })} 
                        className="w-full bg-white border-[0.5px] border-gray-200 rounded-xl pl-10 pr-4 py-3 text-[13px] font-medium outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>

                  {(watchedCategory?.toLowerCase() === 'dispenser' || watchedSubCategory?.toLowerCase() === 'dispenser') && (
                    <div className="col-span-full">
                      <button
                        type="button"
                        onClick={() => setIsHardwareModalOpen(true)}
                        className="w-full p-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                            <Activity className="text-white" size={24} />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Optional Hardware Specs</p>
                            <h4 className="text-[15px] font-black uppercase tracking-tight">Configure Dispenser Hardware</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {(watch('fuel_types')?.length > 0 || watch('nozzles') || watch('dispensing')) && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-green-300">
                              <Check size={12} strokeWidth={4} />
                              <span>Configured</span>
                            </div>
                          )}
                          <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    </div>
                  )}

                  <div className="col-span-full space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Description</label>
                    <textarea {...register('description')} rows={2} className="w-full border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none transition-all resize-none bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5" placeholder="Enter product details..." />
                  </div>

                  <div className="col-span-full space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Specification</label>
                    <textarea {...register('specification')} rows={3} className="w-full border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none transition-all resize-none bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5" placeholder="Enter technical specifications..." />
                  </div>

                  <div className="col-span-full space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Image</label>
                    {modalMode === 'edit' && (
                      <div className="flex flex-wrap gap-3 mb-3">
                        {(selectedProduct?.images || (selectedProduct?.image_url ? [selectedProduct.image_url] : [])).map((url, idx) => (
                          <div key={idx} className="relative group w-20 h-20">
                            <img src={`${assetBaseURL}${url}`} alt="Product" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                               <button type="button" onClick={() => setPreviewImageUrl(`${assetBaseURL}${url}`)} className="p-1.5 bg-white rounded-lg text-blue-600 shadow-lg hover:bg-blue-50"><Search size={14} /></button>
                               <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveAsset(url, 'images'); }} className="p-1.5 bg-white rounded-lg text-red-600 shadow-lg hover:bg-red-50"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="relative group">
                      <input type="file" accept="image/*" multiple {...register('image')} className="w-full opacity-0 absolute inset-0 cursor-pointer z-10" />
                      <div className="w-full bg-gray-50 border-[0.5px] border-gray-200 border-dashed rounded-xl px-4 py-3 flex items-center justify-between group-hover:border-blue-600 group-hover:bg-blue-50/30 transition-all">
                        <span className="text-[13px] text-gray-400 font-medium">
                          {watch('image')?.length > 0 ? `${watch('image').length} new image(s) selected` : "Select product images"}
                        </span>
                        <Plus size={18} className="text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-full space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Documents</label>
                    {modalMode === 'edit' && (
                      <div className="space-y-2 mb-3">
                        {(selectedProduct?.documents || (selectedProduct?.document_url ? [selectedProduct.document_url] : [])).map((url, idx) => {
                          const displayName = url.split('/').pop().replace(/^[^-]+-\d+-\d+-/, '');
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl transition-all group">
                              <div className="flex items-center gap-3">
                                <FileText size={18} className="text-blue-600" />
                                <span className="text-[11px] font-bold uppercase tracking-tight truncate max-w-[180px] text-blue-600">{displayName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <a href={`${assetBaseURL}${url}`} target="_blank" rel="noreferrer" className="p-1.5 bg-white rounded-lg text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-blue-50"><Search size={14} /></a>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveAsset(url, 'documents'); }} className="p-1.5 bg-white rounded-lg text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="relative group">
                      <input type="file" multiple {...register('document')} className="w-full opacity-0 absolute inset-0 cursor-pointer z-10" />
                      <div className="w-full bg-gray-50 border-[0.5px] border-gray-200 border-dashed rounded-xl px-4 py-3 flex items-center justify-between group-hover:border-blue-600 group-hover:bg-blue-50/30 transition-all">
                        <span className="text-[13px] text-gray-400 font-medium">
                          {watch('document')?.length > 0 ? `${watch('document').length} new document(s) selected` : "Select manuals/datasheets"}
                        </span>
                        <Plus size={18} className="text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-[12px] uppercase tracking-[0.2em]">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <Check size={18} strokeWidth={3} />
                        <span>{modalMode === 'create' ? 'Finalize Registration' : 'Update Specifications'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
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
          <div className="flex items-center gap-4 p-5 bg-blue-50/50 rounded-2xl border-[0.5px] border-blue-100/50">
             <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                <Fuel size={24} strokeWidth={2.5} />
             </div>
             <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase leading-none">Dispenser Specifications</h3>
                <p className="text-[10px] font-bold text-blue-600/60 mt-1.5 uppercase tracking-[0.2em]">Select hardware options for {watchedSubCategory || 'Dispenser'}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
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
                    <div className="flex items-center gap-4 p-4 bg-white border-[0.5px] border-gray-200 rounded-xl transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50/50 group-hover:border-blue-300">
                      <div className="text-gray-400 peer-checked:text-blue-600 transition-colors">{type.icon}</div>
                      <span className="text-[12px] font-black text-gray-900 uppercase tracking-tighter">{type.label}</span>
                      <div className="ml-auto w-5 h-5 rounded-md border border-gray-200 bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                        <Check size={12} className="text-white" strokeWidth={5} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-l-[0.5px] border-gray-100 pl-8">
              <div className="flex items-center gap-2 text-blue-600">
                <Box size={14} strokeWidth={3} />
                <label className="text-[11px] font-black uppercase tracking-widest">Nozzle Count</label>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map(num => (
                  <label key={num} className="relative cursor-pointer block group">
                    <input type="radio" value={`${num} Nozzle`} {...register('nozzles')} disabled={modalMode === 'view'} className="peer sr-only" />
                    <div className="flex items-center justify-between p-4 bg-white border-[0.5px] border-gray-200 rounded-xl transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50/50 group-hover:border-blue-300">
                      <span className="text-[12px] font-bold text-gray-700 uppercase tracking-tight">{num} Nozzle</span>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200 peer-checked:border-blue-600 peer-checked:border-[6px] transition-all" />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-l-[0.5px] border-gray-100 pl-8">
              <div className="flex items-center gap-2 text-blue-600">
                <Activity size={14} strokeWidth={3} />
                <label className="text-[11px] font-black uppercase tracking-widest">Dispensing Flow</label>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map(num => (
                  <label key={num} className="relative cursor-pointer block group">
                    <input type="radio" value={`${num} dispensing`} {...register('dispensing')} disabled={modalMode === 'view'} className="peer sr-only" />
                    <div className="flex items-center justify-between p-4 bg-white border-[0.5px] border-gray-200 rounded-xl transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50/50 group-hover:border-blue-300">
                      <span className="text-[12px] font-bold text-gray-700 uppercase tracking-tight">{num} dispensing</span>
                      <CheckCircle size={20} className="text-gray-200 peer-checked:text-blue-600 transition-colors" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button type="button" onClick={() => setIsHardwareModalOpen(false)} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/20 uppercase tracking-widest text-[12px] hover:bg-blue-700 transition-all active:scale-95">
              {modalMode === 'view' ? 'Close Specifications' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </Modal>

      <CategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        onSelect={handleSubCategoryPick}
        onSelectCategory={categoryModalMode === 'category' ? handleCategoryPick : null}
        initialCategory={categoryModalMode === 'subcategory' ? currentCategoryObject : null}
      />

      {/* Image Preview Lightbox */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-10 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <img 
              src={previewImageUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className="absolute -top-12 right-0 md:-right-12 text-white/70 hover:text-white transition-colors p-2"
              onClick={() => setPreviewImageUrl(null)}
            >
              <Plus className="rotate-45" size={40} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
