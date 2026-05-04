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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-[var(--border-color)]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-workspace)]/50">
          <div className="flex items-center gap-4">
            {view === 'sub_categories' && (
              <button 
                onClick={() => setView('categories')} 
                className="p-1.5 hover:bg-[var(--bg-card)] rounded-lg text-[var(--accent)] shadow-sm border border-[var(--border-color)] transition-all active:scale-95"
              >
                <ArrowLeft size={16} strokeWidth={3} />
              </button>
            )}
            <div>
              <h3 className="text-[15px] font-black text-[var(--text-main)] uppercase tracking-widest leading-none">
                {view === 'categories' ? 'Product Categories' : 'Sub-Classifications'}
              </h3>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1.5">
                {view === 'categories' ? 'Classification Engine' : `Parent: ${selectedCategory?.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsAdding(true); setEditingItem(null); setNewName(''); }}
              className="p-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-all shadow-lg active:scale-95"
              style={{ boxShadow: '0 5px 15px -3px var(--border-glow)' }}
            >
              <Plus size={18} strokeWidth={3} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--nav-hover)] rounded-lg text-[var(--text-dim)] transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar space-y-4 bg-[var(--bg-card)]">
          {isAdding && (
            <div className="p-4 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-xl flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300">
              <label className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest ml-1">
                {editingItem ? 'Update designation' : 'New designation'}
              </label>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter name..."
                  className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[var(--text-main)]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                />
                <button 
                  onClick={handleAction} 
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-md"
                >
                  {editingItem ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Synchronizing assets...</p>
            </div>
          ) : view === 'categories' ? (
            categories.length > 0 ? categories.map((cat) => (
              <div
                key={cat.id}
                className="group flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:border-[var(--accent)] hover:bg-[var(--nav-hover)] transition-all cursor-pointer border-l-4 border-l-[var(--accent)]/10 hover:border-l-[var(--accent)]"
                onClick={() => handleCategoryClick(cat)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[var(--bg-workspace)] rounded-lg flex items-center justify-center text-[var(--text-dim)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all shadow-sm">
                    <Folder size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-main)] tracking-tight">{cat.name}</h4>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">{cat.sub_category_count} classifications</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  <button onClick={(e) => startEdit(e, cat)} className="p-1.5 bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg shadow-sm border border-[var(--border-color)] transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => handleDelete(e, cat.id)} className="p-1.5 bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-rose-500 rounded-lg shadow-sm border border-[var(--border-color)] transition-all">
                    <Trash2 size={14} />
                  </button>
                  <div className="p-1.5 bg-[var(--accent)] text-white rounded-lg shadow-md transition-all">
                    <ChevronRight size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center">
                <p className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em]">No categories initialized</p>
              </div>
            )
          ) : (
            subCategories.length > 0 ? subCategories.map((sub) => (
              <div
                key={sub.id}
                className="group flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:border-[var(--accent)]/50 hover:bg-[var(--nav-hover)] transition-all cursor-pointer border-l-4 border-l-[var(--accent)]/5 hover:border-l-[var(--accent)]"
                onClick={() => handleSubCategorySelect(sub)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[var(--bg-workspace)] rounded flex items-center justify-center text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">
                    <Subtitles size={16} />
                  </div>
                  <h4 className="text-[13px] font-bold text-[var(--text-main)] tracking-tight group-hover:text-[var(--accent)] transition-colors">{sub.name}</h4>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={(e) => startEdit(e, sub)} className="p-1.5 bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg shadow-sm border border-[var(--border-color)]">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={(e) => handleDelete(e, sub.id)} className="p-1.5 bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-rose-500 rounded-lg shadow-sm border border-[var(--border-color)]">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center">
                <p className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em]">No sub-classifications found</p>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-workspace)]/50 border-t border-[var(--border-color)] flex justify-between items-center">
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Select an item to synchronize</p>
          <button onClick={onClose} className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest hover:opacity-80 transition-colors">Dismiss</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;
