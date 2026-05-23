import React, { useState, useEffect, useRef } from 'react';
import {
  getCompanies,
  getSubCompanies,
  createCompany,
  createSubCompany,
  updateCompany,
  deleteCompany,
  updateSubCompany,
  deleteSubCompany
} from '../../api/companies';
import { Plus, X, ChevronRight, Edit2, Trash2, ArrowLeft, Loader2, Building2, LayoutPanelLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Draggable from 'react-draggable';

const CompanyModal = ({ isOpen, onClose, onSelect, onSelectCompany, initialCompany = null }) => {
  const nodeRef = useRef(null);
  const [view, setView] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [subCompanies, setSubCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { id, name }
  const [newName, setNewName] = useState('');

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await getCompanies();
      setCompanies(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCompanies = async (compId) => {
    setLoading(true);
    try {
      const res = await getSubCompanies(compId);
      setSubCompanies(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch sub-companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialCompany) {
        setSelectedCompany(initialCompany);
        fetchSubCompanies(initialCompany.id);
        setView('sub_companies');
      } else {
        fetchCompanies();
        setView('companies');
      }
    }
  }, [isOpen, initialCompany]);

  const handleCompanyClick = (company) => {
    if (onSelectCompany) {
      onSelectCompany(company);
      onClose();
    } else {
      setSelectedCompany(company);
      fetchSubCompanies(company.id);
      setView('sub_companies');
    }
  };

  const handleSubCompanySelect = (sub) => {
    onSelect(sub.name);
    onClose();
  };

  const handleAction = async () => {
    if (!newName.trim()) return;
    try {
      if (editingItem) {
        if (view === 'companies') {
          await updateCompany(editingItem.id, { name: newName });
          fetchCompanies();
        } else {
          await updateSubCompany(editingItem.id, { name: newName });
          fetchSubCompanies(selectedCompany.id);
        }
        toast.success('Updated successfully');
      } else {
        if (view === 'companies') {
          await createCompany({ name: newName });
          fetchCompanies();
        } else {
          await createSubCompany(selectedCompany.id, { name: newName });
          fetchSubCompanies(selectedCompany.id);
        }
        toast.success('Created successfully');
      }
      setNewName('');
      setIsAdding(false);
      setEditingItem(null);
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message || 'Action failed';
      toast.error(msg);
      console.error('Company Action Error:', error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      if (view === 'companies') {
        await deleteCompany(id);
        fetchCompanies();
      } else {
        await deleteSubCompany(id);
        fetchSubCompanies(selectedCompany.id);
      }
      toast.success('Deleted successfully');
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message || 'Delete failed';
      toast.error(msg);
      console.error('Company Delete Error:', error);
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
      <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={onClose} />

      <Draggable nodeRef={nodeRef} handle=".modal-header" bounds="parent">
        <div ref={nodeRef} className="w-full max-w-md">
          <div className="relative w-full bg-[var(--bg-card)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-[var(--border-color)]">
          {/* Header */}
          <div className="modal-header px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-workspace)]/50 cursor-move">
          <div className="flex items-center gap-4">
            {view === 'sub_companies' && (
              <button 
                onClick={() => setView('companies')} 
                className="p-1.5 hover:bg-[var(--bg-card)] rounded-lg text-[var(--accent)] shadow-sm border border-[var(--border-color)] transition-all active:scale-95"
              >
                <ArrowLeft size={16} strokeWidth={3} />
              </button>
            )}
            <div>
              <h3 className="text-[15px] font-black text-[var(--text-main)] uppercase tracking-widest leading-none">
                {view === 'companies' ? 'Manufacturers' : 'Divisions'}
              </h3>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1.5">
                {view === 'companies' ? 'Company Registry' : `Parent: ${selectedCompany?.name}`}
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
        <div className="p-4 md:p-6 max-h-[450px] overflow-y-auto custom-scrollbar space-y-4 bg-[var(--bg-card)]">
          {isAdding && (
            <div className="p-4 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-xl flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300">
              <label className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest ml-1">
                {editingItem ? 'Update name' : 'New name'}
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
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Synchronizing registry...</p>
            </div>
          ) : view === 'companies' ? (
            companies.length > 0 ? companies.map((comp) => (
              <div
                key={comp.id}
                className="group flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:border-[var(--accent)] hover:bg-[var(--nav-hover)] transition-all cursor-pointer border-l-4 border-l-[var(--accent)]/10 hover:border-l-[var(--accent)]"
                onClick={() => handleCompanyClick(comp)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[var(--bg-workspace)] rounded-lg flex items-center justify-center text-[var(--text-dim)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all shadow-sm">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-main)] tracking-tight">{comp.name}</h4>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">{comp.sub_company_count} divisions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  <button onClick={(e) => startEdit(e, comp)} className="p-1.5 bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg shadow-sm border border-[var(--border-color)] transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => handleDelete(e, comp.id)} className="p-1.5 bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-rose-500 rounded-lg shadow-sm border border-[var(--border-color)] transition-all">
                    <Trash2 size={14} />
                  </button>
                  <div className="p-1.5 bg-[var(--accent)] text-white rounded-lg shadow-md transition-all">
                    <ChevronRight size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center">
                <p className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em]">No companies initialized</p>
              </div>
            )
          ) : (
            subCompanies.length > 0 ? subCompanies.map((sub) => (
              <div
                key={sub.id}
                className="group flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:border-[var(--accent)]/50 hover:bg-[var(--nav-hover)] transition-all cursor-pointer border-l-4 border-l-[var(--accent)]/5 hover:border-l-[var(--accent)]"
                onClick={() => handleSubCompanySelect(sub)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[var(--bg-workspace)] rounded flex items-center justify-center text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">
                    <LayoutPanelLeft size={16} />
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
                <p className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em]">No divisions found</p>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-workspace)]/50 border-t border-[var(--border-color)] flex justify-between items-center">
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Select manufacturer or division</p>
          <button onClick={onClose} className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest hover:opacity-80 transition-colors">Dismiss</button>
        </div>
        </div>
        </div>
      </Draggable>
    </div>
  );
};

export default CompanyModal;
