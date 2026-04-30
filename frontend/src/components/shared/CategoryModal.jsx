import React, { useState, useEffect } from 'react';
import { 
  getCategories, 
  getSubCategories, 
  createCategory, 
  createSubCategory,
  updateCategory,
  deleteCategory,
  updateSubCategory,
  deleteSubCategory
} from '../../api/categories';
import { Plus, X, ChevronRight, Edit2, Trash2, ArrowLeft, Loader2, Folder, Subtitles } from 'lucide-react';
import toast from 'react-hot-toast';

const CategoryModal = ({ isOpen, onClose, onSelect, onSelectCategory, initialCategory = null }) => {
  const [view, setView] = useState('categories'); 
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { id, name }
  const [newName, setNewName] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (catId) => {
    setLoading(true);
    try {
      const res = await getSubCategories(catId);
      setSubCategories(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch sub-categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialCategory) {
        setSelectedCategory(initialCategory);
        fetchSubCategories(initialCategory.id);
        setView('sub_categories');
      } else {
        fetchCategories();
        setView('categories');
      }
    }
  }, [isOpen, initialCategory]);

  const handleCategoryClick = (category) => {
    if (onSelectCategory) {
      onSelectCategory(category);
      onClose();
    } else {
      setSelectedCategory(category);
      fetchSubCategories(category.id);
      setView('sub_categories');
    }
  };

  const handleSubCategorySelect = (sub) => {
    onSelect(sub.name);
    onClose();
  };

  const handleAction = async () => {
    if (!newName.trim()) return;
    try {
      if (editingItem) {
        if (view === 'categories') {
          await updateCategory(editingItem.id, { name: newName });
          fetchCategories();
        } else {
          await updateSubCategory(editingItem.id, { name: newName });
          fetchSubCategories(selectedCategory.id);
        }
        toast.success('Updated successfully');
      } else {
        if (view === 'categories') {
          await createCategory({ name: newName });
          fetchCategories();
        } else {
          await createSubCategory(selectedCategory.id, { name: newName });
          fetchSubCategories(selectedCategory.id);
        }
        toast.success('Created successfully');
      }
      setNewName('');
      setIsAdding(false);
      setEditingItem(null);
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message || 'Action failed';
      toast.error(msg);
      console.error('Category Action Error:', error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      if (view === 'categories') {
        await deleteCategory(id);
        fetchCategories();
      } else {
        await deleteSubCategory(id);
        fetchSubCategories(selectedCategory.id);
      }
      toast.success('Deleted successfully');
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message || 'Delete failed';
      toast.error(msg);
      console.error('Category Delete Error:', error);
    }
  };

  const startEdit = (e, item) => {
    e.stopPropagation();
    setEditingItem(item);
    setNewName(item.name);
    setIsAdding(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header - Premium Blue Theme */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            {view === 'sub_categories' && (
              <button onClick={() => setView('categories')} className="p-1.5 hover:bg-white rounded-lg text-blue-600 shadow-sm border border-gray-200 transition-all active:scale-95">
                <ArrowLeft size={16} strokeWidth={3} />
              </button>
            )}
            <div>
              <h3 className="text-[15px] font-black text-gray-800 uppercase tracking-widest leading-none">
                {view === 'categories' ? 'Product Categories' : 'Sub-Classifications'}
              </h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                {view === 'categories' ? 'Classification Engine' : `Parent: ${selectedCategory?.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setIsAdding(true); setEditingItem(null); setNewName(''); }}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar space-y-4">
          {isAdding && (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300">
              <label className="text-[9px] font-bold text-blue-600 uppercase tracking-widest ml-1">
                {editingItem ? 'Update designation' : 'New designation'}
              </label>
              <div className="flex gap-2">
                <input 
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter name..."
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                />
                <button onClick={handleAction} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-md shadow-blue-900/10">
                  {editingItem ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Synchronizing assets...</p>
            </div>
          ) : view === 'categories' ? (
            categories.length > 0 ? categories.map((cat) => (
              <div 
                key={cat.id} 
                className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-600/30 hover:bg-blue-50/30 hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer border-l-4 border-l-blue-600/10 hover:border-l-blue-600"
                onClick={() => handleCategoryClick(cat)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <Folder size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-800 tracking-tight">{cat.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{cat.sub_category_count} classifications</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  <button onClick={(e) => startEdit(e, cat)} className="p-1.5 bg-white text-gray-400 hover:text-blue-600 rounded-lg shadow-sm border border-gray-100 transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => handleDelete(e, cat.id)} className="p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-lg shadow-sm border border-gray-100 transition-all">
                    <Trash2 size={14} />
                  </button>
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-md transition-all">
                    <ChevronRight size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">No categories initialized</p>
              </div>
            )
          ) : (
            subCategories.length > 0 ? subCategories.map((sub) => (
              <div 
                key={sub.id} 
                className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer border-l-4 border-l-blue-600/5 hover:border-l-blue-500"
                onClick={() => handleSubCategorySelect(sub)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                    <Subtitles size={16} />
                  </div>
                  <h4 className="text-[13px] font-bold text-gray-700 tracking-tight group-hover:text-blue-600 transition-colors">{sub.name}</h4>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={(e) => startEdit(e, sub)} className="p-1.5 bg-white text-gray-400 hover:text-blue-600 rounded-lg shadow-sm border border-gray-100">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={(e) => handleDelete(e, sub.id)} className="p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-lg shadow-sm border border-gray-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">No sub-classifications found</p>
              </div>
            )
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Select an item to synchronize</p>
           <button onClick={onClose} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">Dismiss</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;
