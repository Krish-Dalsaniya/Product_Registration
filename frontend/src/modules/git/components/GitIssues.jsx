import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, MessageSquare, Clock, Filter, Search, ShieldAlert, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { getGitIssues, createGitIssue } from '../../../api/gitIntegration';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const GitIssues = ({ selectedRepo }) => {
    const [issues, setIssues] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('open'); // 'open' or 'closed'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newIssueData, setNewIssueData] = useState({ title: '', body: '' });

    useEffect(() => {
        if (selectedRepo) {
            fetchIssues();
        }
    }, [selectedRepo]);

    const fetchIssues = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const owner = selectedRepo?.full_name?.split('/')[0] || selectedRepo?.owner?.login || selectedRepo?.owner?.username || 'unknown';
            const repo = selectedRepo?.name || 'unknown';
            const res = await getGitIssues(owner, repo);
            
            // Handle success format from Node backend: { success: true, data: [...] }
            if (res.data?.success && Array.isArray(res.data?.data)) {
                setIssues(res.data.data);
            } else if (res.data?.status === 'success' || Array.isArray(res.data?.issues)) {
                setIssues(res.data.issues || []);
            } else if (Array.isArray(res.data)) {
                setIssues(res.data);
            } else {
                setIssues([]);
            }
        } catch (error) {
            console.error("Failed to fetch issues", error);
            // Ignore 404s gracefully as "no issues enabled"
            if (error.response?.status === 404) {
                setError("Issues are not enabled or not found for this repository.");
            } else {
                setError("An error occurred while fetching issues.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateIssue = async () => {
        if (!newIssueData.title.trim()) {
            toast.error('Title is required');
            return;
        }
        setIsCreating(true);
        try {
            const owner = selectedRepo?.full_name?.split('/')[0] || selectedRepo?.owner?.login || selectedRepo?.owner?.username || 'unknown';
            const repo = selectedRepo?.name || 'unknown';
            await createGitIssue(owner, repo, newIssueData);
            toast.success('Issue created successfully!');
            setShowCreateModal(false);
            setNewIssueData({ title: '', body: '' });
            fetchIssues(); // Refresh list
        } catch (error) {
            console.error("Failed to create issue", error);
            toast.error('Failed to create issue. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    };

    const filteredIssues = issues.filter(issue => {
        const matchesTab = issue.state === activeTab;
        const matchesSearch = issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              String(issue.number).includes(searchQuery);
        return matchesTab && matchesSearch;
    });

    const openCount = issues.filter(i => i.state === 'open').length;
    const closedCount = issues.filter(i => i.state === 'closed').length;

    if (isLoading) {
        return (
            <div className="h-full w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col items-center justify-center p-8">
                <div className="animate-spin text-slate-300 mb-4"><AlertCircle size={32} /></div>
                <p className="text-sm text-slate-500 font-bold">Loading issues...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full w-full bg-[var(--bg-card)] rounded-2xl border border-red-100 shadow-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert size={32} />
                </div>
                <h3 className="text-lg font-black text-[var(--text-main)] mb-2">Issues Unavailable</h3>
                <p className="text-sm text-slate-500 max-w-md">{error}</p>
                <button 
                    onClick={fetchIssues}
                    className="mt-6 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Toolbar */}
            <div className="h-16 shrink-0 border-b border-[var(--border-color)] px-6 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setActiveTab('open')}
                            className={`flex items-center gap-2 text-sm font-black transition-colors ${activeTab === 'open' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <AlertCircle size={16} className={activeTab === 'open' ? 'text-green-600' : ''} />
                            {openCount} Open
                        </button>
                        <button 
                            onClick={() => setActiveTab('closed')}
                            className={`flex items-center gap-2 text-sm font-bold transition-colors ${activeTab === 'closed' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CheckCircle2 size={16} className={activeTab === 'closed' ? 'text-purple-600' : ''} />
                            {closedCount} Closed
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search issues..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64 pl-9 pr-4 py-1.5 bg-white border border-[var(--border-color)] rounded-lg text-[13px] font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[var(--border-color)] rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                        <Filter size={14} /> Filters
                    </button>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#1f883d] hover:bg-[#1a7f37] text-white rounded-lg text-[13px] font-black transition-colors shadow-sm"
                    >
                        New Issue
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                {selectedIssue ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <button 
                            onClick={() => setSelectedIssue(null)}
                            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-6"
                        >
                            <ArrowLeft size={16} /> Back to issues
                        </button>
                        
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">
                                    {selectedIssue.title} <span className="text-slate-400 font-medium">#{selectedIssue.number}</span>
                                </h2>
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[13px] ${selectedIssue.state === 'open' ? 'bg-[#1a7f37]/10 text-[#1a7f37]' : 'bg-[#8250df]/10 text-[#8250df]'}`}>
                                        {selectedIssue.state === 'open' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                                        {selectedIssue.state === 'open' ? 'Open' : 'Closed'}
                                    </div>
                                    <span className="text-slate-500 font-medium">
                                        <span className="font-bold text-slate-700">{selectedIssue.user?.login}</span> opened this issue on {formatDate(selectedIssue.created_at)}
                                    </span>
                                    {selectedIssue.comments > 0 && (
                                        <span className="text-slate-500 font-medium flex items-center gap-1">
                                            • <MessageSquare size={14} className="ml-1" /> {selectedIssue.comments} comments
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <a 
                                    href={selectedIssue.html_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors flex items-center"
                                >
                                    View on Gitea
                                </a>
                                <button 
                                    onClick={() => toast('Linking to ERP Task coming soon!', { icon: '🔗' })}
                                    className="px-3 py-1.5 bg-[#1f883d] hover:bg-[#1a7f37] text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                                >
                                    <ArrowRight size={14} />
                                    Create Task
                                </button>
                            </div>
                        </div>

                        {selectedIssue.labels && selectedIssue.labels.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-6">
                                {selectedIssue.labels.map(label => (
                                    <span 
                                        key={label.id} 
                                        className="px-2.5 py-0.5 rounded-full text-[12px] font-bold border"
                                        style={{ backgroundColor: `#${label.color}15`, borderColor: `#${label.color}30`, color: `#${label.color}` }}
                                    >
                                        {label.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-4">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                                <img 
                                    src={selectedIssue.user?.avatar_url || `https://ui-avatars.com/api/?name=${selectedIssue.user?.login}&background=random`} 
                                    alt="author" 
                                    className="w-6 h-6 rounded-full bg-slate-200" 
                                />
                                <span className="text-sm font-bold text-slate-700">{selectedIssue.user?.login}</span>
                                <span className="text-xs text-slate-500 font-medium">commented</span>
                            </div>
                            <div className="p-6 prose prose-slate max-w-none prose-headings:font-black prose-a:text-[#0969da]">
                                {selectedIssue.body ? (
                                    <ReactMarkdown>{selectedIssue.body}</ReactMarkdown>
                                ) : (
                                    <p className="text-slate-400 italic">No description provided.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {issues.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                            <AlertCircle size={32} />
                        </div>
                        <h3 className="text-lg font-black text-[var(--text-main)] mb-1">Welcome to Issues!</h3>
                        <p className="text-sm text-slate-500 max-w-sm mb-6">
                            Issues are used to track bugs, features, and tasks for this repository.
                        </p>
                    </div>
                ) : filteredIssues.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                        <Search size={32} className="mb-4 opacity-50" />
                        <h3 className="text-sm font-black text-slate-600 mb-1">No results matched your search.</h3>
                        <p className="text-[12px]">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredIssues.map((issue) => (
                            <div key={issue.id} className="group p-4 hover:bg-slate-50/80 transition-colors flex gap-3">
                                <div className="mt-0.5 shrink-0">
                                    {issue.state === 'open' ? (
                                        <AlertCircle size={16} className="text-[#1a7f37]" />
                                    ) : (
                                        <CheckCircle2 size={16} className="text-[#8250df]" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button 
                                                onClick={() => setSelectedIssue(issue)}
                                                className="text-[15px] font-black text-[var(--text-main)] hover:text-[#0969da] truncate cursor-pointer transition-colors text-left"
                                            >
                                                {issue.title}
                                            </button>
                                            {issue.labels && issue.labels.map(label => (
                                                <span 
                                                    key={label.id} 
                                                    className="px-2 py-0.5 rounded-full text-[11px] font-bold border"
                                                    style={{ 
                                                        backgroundColor: `#${label.color}15`, 
                                                        borderColor: `#${label.color}30`,
                                                        color: `#${label.color}` 
                                                    }}
                                                >
                                                    {label.name}
                                                </span>
                                            ))}
                                        </div>
                                        {issue.comments > 0 && (
                                            <div className="flex items-center gap-1 text-[12px] font-bold text-slate-400 shrink-0">
                                                <MessageSquare size={12} />
                                                {issue.comments}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
                                        <span>#{issue.number} opened on {formatDate(issue.created_at)} by</span>
                                        <div className="flex items-center gap-1.5 bg-slate-100 pr-2 py-0.5 rounded-full">
                                            <img 
                                                src={issue.user?.avatar_url || `https://ui-avatars.com/api/?name=${issue.user?.login}&background=random`} 
                                                alt={issue.user?.login} 
                                                className="w-4 h-4 rounded-full bg-slate-200" 
                                            />
                                            <span className="font-bold text-slate-700">{issue.user?.login}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors shadow-sm"
                                        title="Create ERP Task from Issue"
                                        onClick={() => toast('Linking to ERP Task coming soon!', { icon: '🔗' })}
                                    >
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                        )}
                    </div>
                )}
            </div>

            {/* New Issue Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-800">Create New Issue</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Issue Title <span className="text-red-400">*</span></label>
                                <input 
                                    type="text" 
                                    value={newIssueData.title}
                                    onChange={(e) => setNewIssueData({...newIssueData, title: e.target.value})}
                                    placeholder="Brief summary of the issue..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Description</label>
                                <textarea 
                                    value={newIssueData.body}
                                    onChange={(e) => setNewIssueData({...newIssueData, body: e.target.value})}
                                    placeholder="Detailed description, steps to reproduce, or requirements... (Markdown supported)"
                                    className="w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all resize-none"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition-colors text-sm shadow-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateIssue}
                                disabled={!newIssueData.title.trim() || isCreating}
                                className="px-4 py-2 bg-[#1f883d] hover:bg-[#1a7f37] disabled:bg-[#1f883d]/50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-sm shadow-sm flex items-center gap-2"
                            >
                                {isCreating ? 'Creating...' : 'Submit Issue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GitIssues;
