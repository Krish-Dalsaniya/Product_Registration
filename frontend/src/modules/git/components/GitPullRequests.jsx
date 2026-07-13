import React, { useState, useEffect } from 'react';
import { GitPullRequest, GitMerge, CheckCircle2, MessageSquare, Clock, Filter, Search, ArrowLeft, ArrowRight, Plus, X, RefreshCw, FileDiff } from 'lucide-react';
import { getGitPullRequests, getGitBranches, createGitPullRequest, compareGitBranches, compareGitDiffs, getGitUserProfile } from '../../../api/gitIntegration';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const GitPullRequests = ({ selectedRepo }) => {
    const [pullRequests, setPullRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('open'); // 'open' or 'closed'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPR, setSelectedPR] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPRForm, setShowPRForm] = useState(false);
    const [giteaUser, setGiteaUser] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [branches, setBranches] = useState([]);
    const [newPRData, setNewPRData] = useState({ title: '', body: '', head: '', base: 'main' });
    const [comparisonData, setComparisonData] = useState(null);
    const [fileDiffs, setFileDiffs] = useState([]);
    const [isComparing, setIsComparing] = useState(false);

    
    useEffect(() => {
        getGitUserProfile().then(resp => {
            if (resp.data && resp.data.success) {
                setGiteaUser(resp.data.data);
            }
        }).catch(err => console.error("Failed to fetch Gitea user profile", err));
    }, []);

    useEffect(() => {
        if (selectedRepo) {
            fetchPullRequests();
            fetchBranches();
        }
    }, [selectedRepo]);

    const fetchComparison = async () => {
        setIsComparing(true);
        setShowPRForm(false);
        setFileDiffs([]);
        try {
            const owner = selectedRepo?.full_name?.split('/')[0] || selectedRepo?.owner?.login || selectedRepo?.owner?.username || 'unknown';
            const repo = selectedRepo?.name || 'unknown';
            const response = await compareGitBranches(owner, repo, newPRData.base, newPRData.head);
            if (response.data && response.data.success) {
                setComparisonData(response.data.data);
                if (response.data.data.commits?.length > 0) {
                    compareGitDiffs(owner, repo, newPRData.base, newPRData.head)
                        .then(diffResp => {
                            if (diffResp.data && diffResp.data.success) {
                                setFileDiffs(diffResp.data.data);
                            }
                        })
                        .catch(err => console.error("Failed to fetch diffs", err));
                }
            }
        } catch (error) {
            console.error("Failed to compare branches", error);
            setComparisonData(null);
        } finally {
            setIsComparing(false);
        }
    };

    useEffect(() => {
        if (showCreateModal && newPRData.base && newPRData.head) {
            if (newPRData.base === newPRData.head) {
                setComparisonData({ commits: [] });
                return;
            }
            fetchComparison();
        } else {
            setComparisonData(null);
        }
    }, [newPRData.base, newPRData.head, showCreateModal]);

    const fetchBranches = async () => {
        try {
            const owner = selectedRepo?.full_name?.split('/')[0] || selectedRepo?.owner?.login || selectedRepo?.owner?.username || 'unknown';
            const repo = selectedRepo?.name || 'unknown';
            const response = await getGitBranches(owner, repo);
            if (response.data && response.data.success) {
                setBranches(response.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch branches", error);
        }
    };

    const fetchPullRequests = async () => {
        setIsLoading(true);
        setError(null);
        setSelectedPR(null);
        try {
            // Using Gitea's path structure
            const owner = selectedRepo?.full_name?.split('/')[0] || selectedRepo?.owner?.login || selectedRepo?.owner?.username || 'unknown';
            const repo = selectedRepo?.name || 'unknown';
            
            const response = await getGitPullRequests(owner, repo);
            if (response.data && response.data.success) {
                setPullRequests(response.data.data);
            } else {
                setError("Invalid response format from server.");
            }
        } catch (error) {
            console.error("Failed to fetch pull requests", error);
            // Check for specific error status from the backend
            if (error.response?.status === 404) {
                setError("Pull requests are not enabled or not found for this repository.");
            } else {
                setError("An error occurred while fetching pull requests.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePR = async () => {
        if (!newPRData.title.trim() || !newPRData.head || !newPRData.base) {
            toast.error('Title, Head Branch, and Base Branch are required');
            return;
        }
        if (newPRData.head === newPRData.base) {
            toast.error('Head branch and Base branch cannot be the same');
            return;
        }
        setIsCreating(true);
        try {
            const owner = selectedRepo?.full_name?.split('/')[0] || selectedRepo?.owner?.login || selectedRepo?.owner?.username || 'unknown';
            const repo = selectedRepo?.name || 'unknown';
            await createGitPullRequest(owner, repo, newPRData);
            toast.success('Pull Request created successfully!');
            setShowCreateModal(false);
            setNewPRData({ title: '', body: '', head: '', base: 'main' });
            fetchPullRequests();
        } catch (error) {
            console.error("Failed to create PR", error);
            const msg = error.response?.data?.error?.message || 'Failed to create PR. Please try again.';
            toast.error(msg);
        } finally {
            setIsCreating(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const filteredPRs = pullRequests.filter(pr => {
        const matchesTab = activeTab === 'open' ? pr.state === 'open' : pr.state !== 'open';
        const matchesSearch = pr.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              pr.number.toString().includes(searchQuery);
        return matchesTab && matchesSearch;
    });

    const openCount = pullRequests.filter(pr => pr.state === 'open').length;
    const closedCount = pullRequests.length - openCount;

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-white p-8 animate-pulse">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <GitPullRequest size={32} className="animate-bounce" />
                    <span className="text-sm font-bold uppercase tracking-widest">Loading Pull Requests...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white p-8">
                <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-100">
                    <GitPullRequest size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Pull Requests Unavailable</h3>
                <p className="text-sm text-slate-500 max-w-md text-center">{error}</p>
                <button 
                    onClick={fetchPullRequests}
                    className="mt-6 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
            {/* Toolbar */}
            <div className="h-14 shrink-0 bg-white border-b border-[var(--border-color)] flex items-center justify-between px-4 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200">
                        <button 
                            onClick={() => setActiveTab('open')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-bold transition-all ${activeTab === 'open' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <GitPullRequest size={14} className={activeTab === 'open' ? 'text-[#1a7f37]' : ''} />
                            {openCount} Open
                        </button>
                        <button 
                            onClick={() => setActiveTab('closed')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-bold transition-all ${activeTab === 'closed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CheckCircle2 size={14} className={activeTab === 'closed' ? 'text-[#8250df]' : ''} />
                            {closedCount} Closed
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search PRs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-9 pr-3 w-[200px] text-[13px] bg-white border border-[var(--border-color)] rounded-lg outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all font-medium text-slate-700"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[var(--border-color)] rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                        <Filter size={14} /> Filters
                    </button>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#1f883d] hover:bg-[#1a7f37] text-white rounded-lg text-[13px] font-black transition-colors shadow-sm"
                    >
                        New Pull Request
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                {showCreateModal ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white">
                        <div className="w-full">
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="flex items-center gap-2 text-[13px] text-[#0969da] hover:underline mb-6"
                            >
                                <ArrowLeft size={14} /> Back to Pull Requests
                            </button>
                            
                            <h2 className="text-[24px] font-normal text-slate-800 mb-1">Comparing changes</h2>
                            <p className="text-[14px] text-slate-500 mb-4">Choose two branches or tags to see what's changed or to start a new pull request.</p>

                            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md mb-4 text-[13px]">
                                <GitMerge size={16} className="text-slate-500" />
                                <span className="text-slate-600 font-medium">merge into:</span>
                                <select 
                                    value={newPRData.base}
                                    onChange={(e) => setNewPRData({...newPRData, base: e.target.value})}
                                    className="bg-slate-100 border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-800 outline-none hover:bg-slate-200 transition-colors cursor-pointer min-w-[100px]"
                                >
                                    <option value="">Select branch...</option>
                                    {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                </select>
                                
                                <span className="text-slate-400 mx-1">←</span>
                                
                                <span className="text-slate-600 font-medium">pull from:</span>
                                <select 
                                    value={newPRData.head}
                                    onChange={(e) => setNewPRData({...newPRData, head: e.target.value})}
                                    className="bg-slate-100 border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-800 outline-none hover:bg-slate-200 transition-colors cursor-pointer min-w-[150px]"
                                >
                                    <option value="">Select branch...</option>
                                    {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>

                            {isComparing ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw size={24} className="animate-spin text-[#0969da]" />
                                </div>
                            ) : comparisonData ? (
                                comparisonData.commits?.length === 0 ? (
                                    <div className="p-8 bg-white border border-slate-200 rounded-md text-center shadow-sm">
                                        <h3 className="text-[16px] font-bold text-slate-800 mb-1">There isn't anything to compare.</h3>
                                        <p className="text-[14px] text-slate-500">
                                            <strong>{newPRData.base}</strong> and <strong>{newPRData.head}</strong> are entirely up to date.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {!showPRForm && (
                                            <div className="flex items-center justify-between p-4 bg-[#f0f8ff] border border-[#cce5ff] rounded-md text-[13px] mb-6">
                                                <span className="text-slate-700">Discuss and review the changes in this comparison with others.</span>
                                                <button 
                                                    onClick={() => setShowPRForm(true)}
                                                    className="px-4 py-1.5 bg-[#1f883d] hover:bg-[#1a7f37] text-white font-bold rounded-md transition-colors shadow-sm flex items-center gap-2"
                                                >
                                                    New Pull Request
                                                </button>
                                            </div>
                                        )}

                                        {showPRForm && (
                                            <div className="flex gap-4 mb-6">
                                                {/* Avatar */}
                                                <div className="shrink-0 hidden sm:block">
                                                    <img src={giteaUser?.avatar_url || `https://ui-avatars.com/api/?name=${giteaUser?.login || "Admin+User"}&background=random`} className="w-10 h-10 rounded-full" />
                                                </div>
                                                
                                                {/* Form Container */}
                                                <div className="flex-1 border border-slate-200 rounded-md bg-white shadow-sm relative before:content-[''] before:absolute before:top-[15px] before:-left-[14px] before:border-[7px] before:border-transparent before:border-r-slate-200 after:content-[''] after:absolute after:top-[16px] after:-left-[12px] after:border-[6px] after:border-transparent after:border-r-white">
                                                    <div className="p-4 bg-white border-b border-slate-200 rounded-t-md">
                                                        <input 
                                                            type="text" 
                                                            value={newPRData.title}
                                                            onChange={(e) => setNewPRData({...newPRData, title: e.target.value})}
                                                            placeholder="Title"
                                                            className="w-full px-3 py-1.5 text-[14px] font-medium outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da] border border-slate-200 rounded"
                                                        />
                                                        <p className="text-[12px] text-slate-500 mt-2">Start the title with <strong>WIP:</strong> to prevent the pull request from being merged accidentally.</p>
                                                    </div>
                                                    
                                                    <div className="bg-slate-50 border-b border-slate-200 px-4 pt-2 flex items-center gap-4 text-[13px] font-medium text-slate-600">
                                                        <button className="text-slate-800 bg-white border border-slate-200 border-b-white px-4 py-1.5 rounded-t-md -mb-[1px] relative z-10">Write</button>
                                                        <button className="hover:text-[#0969da] px-4 py-1.5">Preview</button>
                                                    </div>
                                                    <div className="bg-white p-2 px-4 border-b border-slate-200 flex items-center gap-3 text-slate-500">
                                                        <span className="font-bold hover:text-slate-800 cursor-pointer">H1</span>
                                                        <span className="font-bold hover:text-slate-800 cursor-pointer">H2</span>
                                                        <span className="font-bold hover:text-slate-800 cursor-pointer">H3</span>
                                                        <span className="font-bold hover:text-slate-800 cursor-pointer px-1">B</span>
                                                        <span className="italic hover:text-slate-800 cursor-pointer px-1">I</span>
                                                        <span className="line-through hover:text-slate-800 cursor-pointer px-1">S</span>
                                                        <div className="h-4 w-px bg-slate-300 mx-1"></div>
                                                        <span className="hover:text-slate-800 cursor-pointer font-mono">&lt;&gt;</span>
                                                    </div>
                                                    
                                                    <div className="p-3">
                                                        <textarea 
                                                            value={newPRData.body}
                                                            onChange={(e) => setNewPRData({...newPRData, body: e.target.value})}
                                                            placeholder="Leave a comment"
                                                            className="w-full h-32 px-3 py-2 text-[13px] outline-none border border-slate-200 rounded resize-y custom-scrollbar focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                                                        />
                                                    </div>
                                                    <div className="px-4 py-3 bg-white border-t border-dashed border-slate-200 text-center text-[13px] text-slate-500 hover:text-[#0969da] cursor-pointer">
                                                        Drop files or click here to upload.
                                                    </div>
                                                    
                                                    <div className="p-3 bg-white border-t border-slate-200 flex justify-end rounded-b-md">
                                                        <button 
                                                            onClick={handleCreatePR}
                                                            disabled={!newPRData.title.trim() || isCreating}
                                                            className="px-4 py-1.5 bg-[#1f883d] hover:bg-[#1a7f37] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors text-[13px] shadow-sm flex items-center gap-2"
                                                        >
                                                            {isCreating ? 'Creating...' : 'Create Pull Request'}
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* Right Sidebar */}
                                                <div className="w-56 shrink-0 hidden lg:block space-y-4 ml-4">
                                                    <div className="border-b border-slate-200 pb-3">
                                                        <div className="text-[13px] font-bold text-slate-700 mb-1 hover:text-[#0969da] cursor-pointer flex justify-between">Reviewers <span className="text-slate-400">⚙</span></div>
                                                        <div className="text-[12px] text-slate-500">No Reviewers</div>
                                                    </div>
                                                    <div className="border-b border-slate-200 pb-3">
                                                        <div className="text-[13px] font-bold text-slate-700 mb-1 hover:text-[#0969da] cursor-pointer flex justify-between">Labels <span className="text-slate-400">⚙</span></div>
                                                        <div className="text-[12px] text-slate-500">No Label</div>
                                                    </div>
                                                    <div className="border-b border-slate-200 pb-3">
                                                        <div className="text-[13px] font-bold text-slate-700 mb-1 hover:text-[#0969da] cursor-pointer flex justify-between">Milestone <span className="text-slate-400">⚙</span></div>
                                                        <div className="text-[12px] text-slate-500">No Milestone</div>
                                                    </div>
                                                    <div className="border-b border-slate-200 pb-3">
                                                        <div className="text-[13px] font-bold text-slate-700 mb-1 hover:text-[#0969da] cursor-pointer flex justify-between">Projects <span className="text-slate-400">⚙</span></div>
                                                        <div className="text-[12px] text-slate-500">No project</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[13px] font-bold text-slate-700 mb-1 hover:text-[#0969da] cursor-pointer flex justify-between">Assignees <span className="text-slate-400">⚙</span></div>
                                                        <div className="text-[12px] text-slate-500">No Assignees</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {(() => {
                                            const changedFiles = new Set();
                                            let totalAdditions = 0;
                                            let totalDeletions = 0;
                                            comparisonData.commits?.forEach(commit => {
                                                commit.files?.forEach(f => changedFiles.add(f.filename));
                                                if (commit.stats) {
                                                    totalAdditions += commit.stats.additions || 0;
                                                    totalDeletions += commit.stats.deletions || 0;
                                                }
                                            });
                                            const fileCount = changedFiles.size;

                                            return (
                                                <>
                                                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white mb-6">
                                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-[13px] font-bold text-slate-700">
                                                            {comparisonData.commits?.length || 0} Commits
                                                        </div>
                                                        <table className="w-full text-left text-[13px]">
                                                            <thead>
                                                                <tr className="border-b border-slate-200 bg-white text-slate-500">
                                                                    <th className="px-4 py-2 font-normal w-1/4">Author</th>
                                                                    <th className="px-4 py-2 font-normal w-32">SHA1</th>
                                                                    <th className="px-4 py-2 font-normal">Message</th>
                                                                    <th className="px-4 py-2 font-normal text-right w-32">Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {comparisonData.commits?.map(commit => (
                                                                    <tr key={commit.sha} className="hover:bg-slate-50 transition-colors group">
                                                                        <td className="px-4 py-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <img src={commit.author?.avatar_url || `https://ui-avatars.com/api/?name=${commit.author?.login || commit.commit?.author?.name}&background=random`} className="w-4 h-4 rounded-full"/>
                                                                                <span className="font-medium text-[#0969da] hover:underline cursor-pointer">{commit.author?.login || commit.commit?.author?.name}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-600 text-[12px] group-hover:text-[#0969da] transition-colors cursor-pointer">
                                                                                {commit.sha?.substring(0, 7)}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-slate-700 truncate max-w-md">
                                                                            {commit.commit?.message?.split('\n')[0]}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-right text-slate-500">
                                                                            {formatDate(commit.commit?.author?.date).split(',')[0]}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="text-[14px] text-slate-600 mb-3 border-b border-slate-200 pb-2">
                                                        <span className="text-slate-800 font-bold">{fileCount} changed files</span> with <span className="text-[#1a7f37] font-bold">{totalAdditions} additions</span> and <span className="text-[#d1242f] font-bold">{totalDeletions} deletions</span>.
                                                    </div>

                                                    {fileDiffs.length > 0 && (
                                                        <div className="space-y-4">
                                                            {fileDiffs.map((diff, idx) => (
                                                                <div key={idx} className="border border-slate-200 rounded-md overflow-hidden bg-white">
                                                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between group">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[13px] font-bold text-[#0969da] font-mono hover:underline cursor-pointer">{diff.filename}</span>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[12px] text-slate-600 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">View File</button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="overflow-x-auto bg-white text-[12px] font-mono leading-relaxed pb-2">
                                                                        <pre className="whitespace-pre w-full m-0 p-0">
                                                                            {diff.patch.split('\n').map((line, i) => {
                                                                                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                                                                                const isSub = line.startsWith('-') && !line.startsWith('---');
                                                                                const isHeader = line.startsWith('@@');
                                                                                const isMeta = line.startsWith('---') || line.startsWith('+++');
                                                                                
                                                                                if (isMeta) return (
                                                                                    <div key={i} className="px-4 py-0.5 min-w-full text-slate-500 bg-white">
                                                                                        {line}
                                                                                    </div>
                                                                                );

                                                                                return (
                                                                                    <div key={i} className={`flex min-w-full group ${
                                                                                        isAdd ? 'bg-[#e6ffec]' : 
                                                                                        isSub ? 'bg-[#ffebe9]' : 
                                                                                        isHeader ? 'bg-[#ddf4ff] text-slate-500 py-1 border-y border-[#b6e3ff]' : 'bg-white text-slate-800 hover:bg-slate-50'
                                                                                    }`}>
                                                                                        <div className={`w-10 shrink-0 text-right pr-2 select-none border-r ${
                                                                                            isAdd ? 'text-[#1a7f37] border-[#ccffd8] bg-[#cdffd8]/30' : 
                                                                                            isSub ? 'text-[#d1242f] border-[#ffd7d5] bg-[#ffd7d5]/30' : 
                                                                                            isHeader ? 'text-transparent border-transparent bg-[#ddf4ff]' : 'text-slate-400 border-transparent group-hover:border-slate-200 bg-white group-hover:bg-slate-50'
                                                                                        }`}>
                                                                                            {!isHeader && (isAdd ? '+' : isSub ? '-' : ' ')}
                                                                                        </div>
                                                                                        <div className={`px-4 whitespace-pre flex-1 ${
                                                                                            isAdd ? 'text-[#1a7f37]' : 
                                                                                            isSub ? 'text-[#d1242f]' : 
                                                                                            isHeader ? 'text-slate-500 font-bold' : 'text-slate-800'
                                                                                        }`}>
                                                                                            {isHeader ? line : line.substring(1)}
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </pre>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )
                            ) : null}
                        </div>
                    </div>
                ) : selectedPR ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <button 
                            onClick={() => setSelectedPR(null)}
                            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-6"
                        >
                            <ArrowLeft size={16} /> Back to Pull Requests
                        </button>
                        
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">
                                    {selectedPR.title} <span className="text-slate-400 font-medium">#{selectedPR.number}</span>
                                </h2>
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[13px] ${
                                        selectedPR.state === 'open' ? 'bg-[#1a7f37]/10 text-[#1a7f37]' : 
                                        selectedPR.merged ? 'bg-[#8250df]/10 text-[#8250df]' : 'bg-rose-500/10 text-rose-500'
                                    }`}>
                                        {selectedPR.state === 'open' ? <GitPullRequest size={14} /> : 
                                         selectedPR.merged ? <GitMerge size={14} /> : <CheckCircle2 size={14} />}
                                        {selectedPR.state === 'open' ? 'Open' : selectedPR.merged ? 'Merged' : 'Closed'}
                                    </div>
                                    <span className="text-slate-500 font-medium">
                                        <span className="font-bold text-slate-700">{selectedPR.user?.login}</span> wants to merge into
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[11px] rounded font-bold border border-indigo-100">{selectedPR.base?.label || selectedPR.base?.ref || 'main'}</span>
                                        <ArrowLeft size={12} className="text-slate-400" />
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] rounded font-bold border border-slate-200">{selectedPR.head?.label || selectedPR.head?.ref || 'branch'}</span>
                                    </div>
                                    <span className="text-slate-500 font-medium ml-1">
                                        on {formatDate(selectedPR.created_at)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <a 
                                    href={selectedPR.html_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-[#1f883d] hover:bg-[#1a7f37] text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                                >
                                    <GitPullRequest size={14} />
                                    View on Gitea
                                </a>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-6">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                                <img 
                                    src={selectedPR.user?.avatar_url || `https://ui-avatars.com/api/?name=${selectedPR.user?.login}&background=random`} 
                                    alt="author" 
                                    className="w-6 h-6 rounded-full bg-slate-200" 
                                />
                                <span className="text-sm font-bold text-slate-700">{selectedPR.user?.login}</span>
                                <span className="text-xs text-slate-500 font-medium">commented</span>
                            </div>
                            <div className="p-6 prose prose-slate max-w-none prose-headings:font-black prose-a:text-[#0969da]">
                                {selectedPR.body ? (
                                    <ReactMarkdown>{selectedPR.body}</ReactMarkdown>
                                ) : (
                                    <p className="text-slate-400 italic">No description provided.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {pullRequests.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                                    <GitPullRequest size={32} />
                                </div>
                                <h3 className="text-lg font-black text-[var(--text-main)] mb-1">Welcome to Pull Requests!</h3>
                                <p className="text-sm text-slate-500 max-w-sm mb-6">
                                    Pull requests let you tell others about changes you've pushed to a branch in a repository.
                                </p>
                            </div>
                        ) : filteredPRs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                                <Search size={32} className="mb-4 opacity-50" />
                                <h3 className="text-sm font-black text-slate-600 mb-1">No results matched your search.</h3>
                                <p className="text-[12px]">Try adjusting your filters or search query.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredPRs.map((pr) => (
                                    <div key={pr.id} className="group p-4 hover:bg-slate-50/80 transition-colors flex gap-3">
                                        <div className="mt-0.5 shrink-0">
                                            {pr.state === 'open' ? (
                                                <GitPullRequest size={16} className="text-[#1a7f37]" />
                                            ) : pr.merged ? (
                                                <GitMerge size={16} className="text-[#8250df]" />
                                            ) : (
                                                <CheckCircle2 size={16} className="text-rose-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button 
                                                        onClick={() => setSelectedPR(pr)}
                                                        className="text-[15px] font-black text-[var(--text-main)] hover:text-[#0969da] truncate cursor-pointer transition-colors text-left"
                                                    >
                                                        {pr.title}
                                                    </button>
                                                    {pr.labels && pr.labels.map(label => (
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
                                                {pr.comments > 0 && (
                                                    <div className="flex items-center gap-1 text-[12px] font-bold text-slate-400 shrink-0">
                                                        <MessageSquare size={12} />
                                                        {pr.comments}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
                                                <span>#{pr.number} opened on {formatDate(pr.created_at)} by</span>
                                                <div className="flex items-center gap-1.5 bg-slate-100 pr-2 py-0.5 rounded-full">
                                                    <img 
                                                        src={pr.user?.avatar_url || `https://ui-avatars.com/api/?name=${pr.user?.login}&background=random`} 
                                                        alt={pr.user?.login} 
                                                        className="w-4 h-4 rounded-full bg-slate-200" 
                                                    />
                                                    <span className="font-bold text-slate-700">{pr.user?.login}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>


        </div>
    );
};

export default GitPullRequests;
