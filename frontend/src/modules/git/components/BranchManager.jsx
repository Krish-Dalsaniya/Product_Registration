import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, Plus, Trash2, Check, ChevronDown, AlertCircle } from 'lucide-react';
import { 
    localGitBranches, 
    localGitBranchCheckout, 
    localGitBranchCreate, 
    localGitBranchDelete 
} from '../../../api/gitIntegration';
import toast from 'react-hot-toast';

const BranchManager = ({ repoName, currentBranch, onBranchChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [branches, setBranches] = useState({ local: [], remote: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (isOpen && repoName) {
            fetchBranches();
            setSearchQuery('');
            setIsCreating(false);
            setNewBranchName('');
        }
    }, [isOpen, repoName]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchBranches = async () => {
        setIsLoading(true);
        try {
            const res = await localGitBranches(repoName);
            if (res.data?.status === 'success') {
                setBranches({
                    local: res.data.branches?.local || [],
                    remote: res.data.branches?.remote || []
                });
            }
        } catch (error) {
            toast.error("Failed to fetch branches");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckout = async (branchName) => {
        const loadingToast = toast.loading(`Switching to ${branchName}...`);
        try {
            const res = await localGitBranchCheckout({ repo_name: repoName, branch_name: branchName });
            if (res.data?.status === 'success') {
                toast.success(`Switched to ${branchName}`, { id: loadingToast });
                setIsOpen(false);
                onBranchChange();
            } else {
                toast.error("Failed to switch branch", { id: loadingToast });
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || "Failed to switch branch", { id: loadingToast });
        }
    };

    const handleCreateBranch = async (e) => {
        e.preventDefault();
        if (!newBranchName.trim()) return;

        const loadingToast = toast.loading(`Creating branch ${newBranchName}...`);
        try {
            const res = await localGitBranchCreate({ repo_name: repoName, branch_name: newBranchName.trim() });
            if (res.data?.status === 'success') {
                toast.success(`Created and switched to ${newBranchName}`, { id: loadingToast });
                setIsOpen(false);
                onBranchChange();
            } else {
                toast.error("Failed to create branch", { id: loadingToast });
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || "Failed to create branch", { id: loadingToast });
        }
    };

    const handleDeleteBranch = async (e, branchName, isRemote) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete the branch '${branchName}'?`)) return;

        const loadingToast = toast.loading(`Deleting branch ${branchName}...`);
        try {
            const res = await localGitBranchDelete({ repo_name: repoName, branch_name: branchName, remote: isRemote });
            if (res.data?.status === 'success') {
                toast.success(`Deleted branch ${branchName}`, { id: loadingToast });
                fetchBranches();
            } else {
                toast.error("Failed to delete branch", { id: loadingToast });
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || "Failed to delete branch", { id: loadingToast });
        }
    };

    const filteredLocal = branches.local.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg hover:border-slate-300 transition-colors"
                title="Manage Branches"
            >
                <GitBranch size={14} className="text-slate-400" />
                <span className="text-[12px] font-bold text-[var(--text-main)] truncate max-w-[120px]">
                    {currentBranch || 'Loading...'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-[300px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Header / Search */}
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        {isCreating ? (
                            <form onSubmit={handleCreateBranch} className="flex gap-2">
                                <input 
                                    type="text"
                                    autoFocus
                                    placeholder="New branch name..."
                                    value={newBranchName}
                                    onChange={(e) => setNewBranchName(e.target.value.replace(/\s+/g, '-'))}
                                    className="flex-1 h-8 px-2.5 text-[12px] font-medium border border-slate-200 rounded-lg focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newBranchName.trim()}
                                    className="h-8 px-3 text-[12px] font-bold bg-[var(--accent)] text-white rounded-lg disabled:opacity-50"
                                >
                                    Create
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="h-8 px-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
                                >
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    placeholder="Find or create branch..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 h-8 px-2.5 text-[12px] border border-slate-200 rounded-lg focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
                                />
                                <button 
                                    onClick={() => setIsCreating(true)}
                                    className="h-8 px-2 flex items-center gap-1 text-[12px] font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                    title="Create new branch"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Branch List */}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
                        {isLoading ? (
                            <div className="py-8 flex justify-center text-slate-400">
                                <div className="w-5 h-5 border-2 border-slate-200 border-t-[var(--accent)] rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">Local Branches</div>
                                {filteredLocal.length === 0 ? (
                                    <div className="px-2 py-3 text-[12px] text-slate-400 text-center">No local branches found</div>
                                ) : (
                                    filteredLocal.map((branch) => {
                                        const isCurrent = branch === currentBranch;
                                        return (
                                            <div 
                                                key={branch}
                                                onClick={() => !isCurrent && handleCheckout(branch)}
                                                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors ${isCurrent ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-slate-700 hover:bg-slate-100'}`}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {isCurrent ? <Check size={14} /> : <GitBranch size={14} className="opacity-50" />}
                                                    <span className="truncate">{branch}</span>
                                                </div>
                                                
                                                {!isCurrent && branch !== 'main' && branch !== 'master' && (
                                                    <button 
                                                        onClick={(e) => handleDeleteBranch(e, branch, false)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                                                        title="Delete branch"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchManager;
