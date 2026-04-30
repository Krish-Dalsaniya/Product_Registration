import React, { useState, useEffect } from 'react';
import { getProducts, createProduct } from '../../api/products';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import CategoryModal from '../../components/shared/CategoryModal';
import { Search, Plus, Loader2, Box, Tag, DollarSign, FileText, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState('category'); // 'category' or 'subcategory'
  const [currentCategoryObject, setCurrentCategoryObject] = useState(null);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const watchedCategory = watch('category');

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
      if (modalMode === 'create') {
        await createProduct(data);
        toast.success('Product created successfully!');
      } else {
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
      feature: ''
    });
    setIsModalOpen(true);
  };

  const handleView = (product) => {
    setModalMode('view');
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    reset({ 
      product_name: product.product_name, 
      product_code: product.product_code, 
      description: product.description || '', 
      unit_price: product.unit_price,
      category: product.category || '',
      sub_category: product.sub_category || '',
      specification: product.specification || '',
      feature: product.feature || ''
    });
    setIsModalOpen(true);
  };

  const columns = [
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
      </div>

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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'create' ? 'Product Initialization' : modalMode === 'edit' ? 'Update Specifications' : 'Product Profile'}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
          {/* Header Branding */}
          <div className="flex items-center gap-5 p-5 bg-blue-50/50 rounded-2xl border-[0.5px] border-blue-100/50">
             <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                <Box size={28} strokeWidth={2.5} />
             </div>
             <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase leading-none">
                  {modalMode === 'create' ? 'Register New Item' : 'Item Configuration'}
                </h2>
                <p className="text-[10px] font-bold text-blue-600/60 mt-1.5 uppercase tracking-[0.2em]">Operational Specifications Control</p>
             </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Row 1 */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Name</label>
                <input {...register('product_name', { required: true })} className="w-full bg-white border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="Enter product name" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Category</label>
                <div className="flex gap-2">
                  <input 
                    {...register('category')} 
                    readOnly
                    onClick={openCategoryModal}
                    className="flex-1 bg-gray-50 border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer" 
                    placeholder="Select category" 
                  />
                  <button 
                    type="button"
                    onClick={openCategoryModal}
                    className="w-[46px] h-[46px] bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Row 2 */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Sub Category</label>
                <div className="flex gap-2">
                  <input 
                    {...register('sub_category')} 
                    readOnly
                    onClick={openSubCategoryModal}
                    className={`flex-1 border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none transition-all cursor-pointer ${!watchedCategory ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-gray-50 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5'}`} 
                    placeholder={watchedCategory ? "Select sub category" : "Select category first"} 
                  />
                  <button 
                    type="button"
                    disabled={!watchedCategory}
                    onClick={openSubCategoryModal}
                    className={`w-[46px] h-[46px] border rounded-xl flex items-center justify-center transition-all ${!watchedCategory ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600/10 border-blue-600/20 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-90'}`}
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Description</label>
                <textarea {...register('description')} rows={1} className="w-full bg-white border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none" placeholder="Enter description" />
              </div>

              {/* Row 3 */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Specification</label>
                <textarea {...register('specification')} rows={2} className="w-full bg-white border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none" placeholder="Enter specifications" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Feature</label>
                <textarea {...register('feature')} rows={2} className="w-full bg-white border-[0.5px] border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none" placeholder="Enter features" />
              </div>

              {/* Row 4 */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Image</label>
                <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-blue-50 transition-all cursor-pointer group">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-400 group-hover:text-blue-600 shadow-sm border border-gray-200 transition-all group-hover:scale-110">
                    <Box size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Upload Product Image</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Product Documents</label>
                <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-blue-50 transition-all cursor-pointer group">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-400 group-hover:text-blue-500 shadow-sm border border-gray-200 transition-all group-hover:scale-110">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Upload Product Documents</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note: product_code is still needed for the database but hidden from this simple view if user only wants these 8 */}
            <input type="hidden" {...register('product_code')} value={Math.random().toString(36).substring(7).toUpperCase()} />

            {/* Operational Chips (Premium Design) */}
            <div className="flex flex-wrap gap-2 py-4">
              {['Products', 'Materials', 'Spares', 'Assemblies'].map((chip, idx) => (
                <button key={chip} type="button" className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-2.5 ${idx === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-gray-400'}`} />
                  {chip}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-[12px] uppercase tracking-[0.2em]">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <Check size={18} strokeWidth={3} />
                    <span>Finalize Product Registration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <CategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        onSelect={handleSubCategoryPick}
        onSelectCategory={categoryModalMode === 'category' ? handleCategoryPick : null}
        initialCategory={categoryModalMode === 'subcategory' ? currentCategoryObject : null}
      />
    </div>
  );
};

export default ProductListPage;
