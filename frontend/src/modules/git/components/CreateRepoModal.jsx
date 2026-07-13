import React, { useState } from 'react';
import { X, FolderGit2, AlertCircle } from 'lucide-react';
import { createGitRepository, localGitClone } from '../../../api/gitIntegration';
import toast from 'react-hot-toast';

const CreateRepoModal = ({ isOpen, onClose, onRepoCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            // 1. Create on remote (Gitea)
            const res = await createGitRepository({
                name,
                description,
                private: isPrivate
            });

            if (res.data?.status === 'success' || res.data?.repo) {
                toast.success('Remote repository created successfully!');
                
                // 2. Automatically Clone locally
                toast.loading('Cloning repository locally...', { id: 'clone' });
                try {
                    await localGitClone({ repo_name: name });
                    toast.success('Repository cloned and ready!', { id: 'clone' });
                    onRepoCreated(name);
                    onClose();
                    setName('');
                    setDescription('');
                } catch (cloneErr) {
                    console.error(cloneErr);
                    toast.error('Failed to auto-clone. You can clone it manually.', { id: 'clone' });
                    onRepoCreated(); // Still refresh remote list
                    onClose();
                }
            } else {
                setError(res.data?.error?.message || 'Failed to create repository');
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-[500px] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                            <FolderGit2 size={16} />
                        </div>
                        <h2 className="text-[14px] font-black text-slate-800">Create New Repository</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600 text-[12px] font-medium">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Repository Name <span className="text-rose-500">*</span></label>
                            <input 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value.replace(/\s+/g, '-'))}
                                placeholder="e.g. frontend-core"
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none text-[13px] font-medium transition-all"
                                required
                            />
                            <p className="text-[11px] text-slate-400 mt-1.5">Great repository names are short and memorable.</p>
                        </div>
                        
                        <div>
                            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                            <textarea 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="What is this repository for?"
                                className="w-full p-3 rounded-lg border border-slate-200 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none text-[13px] transition-all resize-none h-20"
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2">
                            <label className="relative flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={isPrivate}
                                    onChange={() => setIsPrivate(!isPrivate)}
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                            </label>
                            <span className="text-[13px] font-bold text-slate-700">Make Repository Private</span>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2 text-[12px] font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={isLoading || !name.trim()}
                                className="px-5 py-2 text-[12px] font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Creating...
                                    </>
                                ) : 'Create Repository'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateRepoModal;
