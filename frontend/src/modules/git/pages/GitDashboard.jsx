import React, { useState, useEffect } from 'react';
import { 
    Database, Search, Download, Upload, Tag, RefreshCw, 
    Plus, Check, FolderGit2, AlertCircle, File, FileText, 
    FileCode, LayoutTemplate, MoreVertical, GitPullRequest, 
    Play, MessageSquare, TerminalSquare, Settings2,
    FileDiff, Folder, RefreshCcw, Minus, AlertTriangle, GitCommit, List, Clock, Code2, Zap, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    getGitRepositories,
    localGitStatus,
    localGitClone,
    localGitPull,
    localGitFetch,
    localGitPush,
    localGitStage,
    localGitUnstage,
    localGitCommit,
    localGitTag,
    localGitPushTags,
    localGitBranches,
    localFsBrowse
} from '../../../api/gitIntegration';

import CommitHistory from '../components/CommitHistory';
import DiffViewer from '../components/DiffViewer';
import ReleasesPanel from '../components/ReleasesPanel';
import GitIssues from '../components/GitIssues';
import GitPullRequests from '../components/GitPullRequests';
import CreateRepoModal from '../components/CreateRepoModal';
import BranchManager from '../components/BranchManager';

const GitDashboard = () => {
    const [repos, setRepos] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [localStatus, setLocalStatus] = useState(null);
    const [trackingStatus, setTrackingStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isCreateRepoModalOpen, setIsCreateRepoModalOpen] = useState(false);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [cloneTargetPath, setCloneTargetPath] = useState('');
    
    // FS Browser States
    const [fsPath, setFsPath] = useState('');
    const [fsParentPath, setFsParentPath] = useState('');
    const [fsDirectories, setFsDirectories] = useState([]);
    const [isFsLoading, setIsFsLoading] = useState(false);

    // Advanced Workflow States
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('git_last_tab') || 'changes'); // 'changes' | 'history'
    
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        localStorage.setItem('git_last_tab', tabId);
    };
    const [diffContext, setDiffContext] = useState(null); // { filename?: str, commitHash?: str }

    // Commit & Tag states
    const [commitMessage, setCommitMessage] = useState('');
    const [commitDescription, setCommitDescription] = useState('');
    const [versionTag, setVersionTag] = useState('');
    const [tagMessage, setTagMessage] = useState('');

    useEffect(() => {
        fetchRepos();
    }, []);

    // Clear diff context when switching tabs or repositories
    useEffect(() => {
        setDiffContext(null);
    }, [activeTab, selectedRepo]);

    const fetchRepos = async () => {
        setIsLoading(true);
        try {
            const res = await getGitRepositories();
            if (res.data?.success) {
                const fetchedRepos = res.data.data || [];
                setRepos(fetchedRepos);
                
                // Auto-restore last selected repo
                const lastRepoName = localStorage.getItem('git_last_repo');
                if (lastRepoName) {
                    const repo = fetchedRepos.find(r => r.name === lastRepoName);
                    if (repo) {
                        setSelectedRepo(repo);
                        checkLocalStatus(repo.name);
                    }
                }
            }
        } catch (error) {
            toast.error("Failed to fetch repositories");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectRepo = async (repo) => {
        setSelectedRepo(repo);
        localStorage.setItem('git_last_repo', repo.name);
        checkLocalStatus(repo.name);
    };

    const checkLocalStatus = async (repoName) => {
        setIsLoading(true);
        try {
            const [statusRes, branchRes] = await Promise.all([
                localGitStatus(repoName).catch(() => ({ data: { status: 'error' } })),
                localGitBranches(repoName).catch(() => ({ data: { status: 'error' } }))
            ]);

            if (statusRes.data?.status === 'success') {
                const changes = statusRes.data.changes || [];
                const staged = changes.filter(c => c.raw.startsWith('M ') || c.raw.startsWith('A ') || c.raw.startsWith('D ') || c.raw.startsWith('R '));
                const unstaged = changes.filter(c => c.raw.startsWith(' M') || c.raw.startsWith('??') || c.raw.startsWith(' D'));
                
                let currentBranch = 'main';
                if (branchRes.data?.status === 'success') {
                    currentBranch = branchRes.data.branches?.current || 'main';
                }

                setLocalStatus({
                    branch: currentBranch,
                    staged: staged,
                    unstaged: unstaged,
                    not_cloned: false
                });
                setTrackingStatus(statusRes.data.tracking || null);
            } else {
                setLocalStatus({ not_cloned: true });
                setTrackingStatus(null);
            }
        } catch (error) {
            setLocalStatus({ not_cloned: true });
            setTrackingStatus(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClone = async () => {
        if (!selectedRepo) return;
        setIsActionLoading(true);
        setIsCloneModalOpen(false);
        try {
            await localGitClone({
                url: selectedRepo.clone_url,
                name: selectedRepo.name,
                target_path: cloneTargetPath.trim() || null
            });
            toast.success("Repository cloned successfully!");
            checkLocalStatus(selectedRepo.name);
            setCloneTargetPath('');
        } catch (error) {
            toast.error(error.response?.data?.error?.message || "Clone failed");
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchFs = async (path = '') => {
        setIsFsLoading(true);
        try {
            const res = await localFsBrowse(path);
            if (res.data?.status === 'success') {
                setFsPath(res.data.current_path);
                setFsParentPath(res.data.parent_path);
                setFsDirectories(res.data.directories);
                if (!cloneTargetPath && !path) {
                    setCloneTargetPath(res.data.current_path); // Set initial default
                }
            }
        } catch (error) {
            toast.error("Failed to load directories: " + (error.response?.data?.error?.message || error.message));
        } finally {
            setIsFsLoading(false);
        }
    };

    useEffect(() => {
        if (isCloneModalOpen && !fsPath) {
            fetchFs();
        }
    }, [isCloneModalOpen]);

    const handleFetch = async () => {
        if (!selectedRepo) return;
        setIsActionLoading(true);
        try {
            await localGitFetch({ repo_name: selectedRepo.name });
            toast.success("Fetched latest metadata.");
            checkLocalStatus(selectedRepo.name);
        } catch (error) {
            toast.error("Fetch failed");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handlePull = async () => {
        if (!selectedRepo) return;
        setIsActionLoading(true);
        try {
            await localGitPull({ repo_name: selectedRepo.name });
            toast.success("Pulled latest changes!");
            checkLocalStatus(selectedRepo.name);
        } catch (error) {
            toast.error("Pull failed");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handlePush = async () => {
        if (!selectedRepo) return;
        setIsActionLoading(true);
        try {
            await localGitPush({ repo_name: selectedRepo.name, force: false });
            toast.success("Pushed to remote!");
            checkLocalStatus(selectedRepo.name);
        } catch (error) {
            toast.error(error.response?.data?.error?.message || "Push failed");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleStage = async (file) => {
        if (!selectedRepo) return;
        setIsActionLoading(true);
        try {
            await localGitStage({ repo_name: selectedRepo.name, files: [file] });
            checkLocalStatus(selectedRepo.name);
        } catch (error) {
            toast.error("Failed to stage file");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUnstage = async (file) => {
        if (!selectedRepo) return;
        setIsActionLoading(true);
        try {
            await localGitUnstage({ repo_name: selectedRepo.name, files: [file] });
            checkLocalStatus(selectedRepo.name);
        } catch (error) {
            toast.error("Failed to unstage file");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleStageAll = async () => {
        if (!selectedRepo || !localStatus) return;
        setIsActionLoading(true);
        try {
            const files = localStatus.unstaged.map(f => f.file);
            await localGitStage({ repo_name: selectedRepo.name, files });
            checkLocalStatus(selectedRepo.name);
        } catch (error) {
            toast.error("Failed to stage files");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUnstageAll = async () => {
        if (!selectedRepo || !localStatus) return;
        setIsActionLoading(true);
        try {
            const files = localStatus.staged.map(f => f.file);
            await localGitUnstage({ repo_name: selectedRepo.name, files });
            checkLocalStatus(selectedRepo.name);
        } catch (error) {
            toast.error("Failed to unstage files");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCommit = async () => {
        if (!selectedRepo || !commitMessage) return;
        setIsActionLoading(true);
        try {
            const fullMessage = commitDescription ? `${commitMessage}\n\n${commitDescription}` : commitMessage;
            await localGitCommit({
                repo_name: selectedRepo.name,
                message: fullMessage,
                amend: false
            });
            toast.success("Committed successfully!");
            setCommitMessage('');
            setCommitDescription('');
            checkLocalStatus(selectedRepo.name);
        } catch (error) {
            toast.error("Commit failed");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCreateVersionRelease = async () => {
        if (!selectedRepo || !versionTag) {
            toast.error("Please enter a version tag (e.g. v1.0)");
            return;
        }
        setIsActionLoading(true);
        try {
            await localGitTag({
                repo_name: selectedRepo.name,
                tag_name: versionTag,
                message: tagMessage || `Release ${versionTag}`
            });
            await localGitPushTags({ repo_name: selectedRepo.name });
            toast.success(`Version ${versionTag} successfully tagged and pushed!`);
            setVersionTag('');
            setTagMessage('');
        } catch (error) {
            toast.error(error.response?.data?.error?.message || "Failed to create version mapping");
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredRepos = repos.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const getFileIcon = (fileName) => {
        if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return <FileCode size={14} className="text-yellow-500" />;
        if (fileName.endsWith('.json')) return <FileCode size={14} className="text-green-500" />;
        if (fileName.endsWith('.md')) return <FileText size={14} className="text-blue-500" />;
        if (fileName.endsWith('.html') || fileName.endsWith('.css')) return <LayoutTemplate size={14} className="text-orange-500" />;
        return <File size={14} className="text-slate-400" />;
    };

    const getStatusColor = (status) => {
        switch(status?.trim()) {
            case 'M': return 'text-amber-500';
            case 'A': return 'text-emerald-500';
            case 'D': return 'text-rose-500';
            case '??': return 'text-slate-500';
            default: return 'text-slate-500';
        }
    };

    const openDiff = (filename) => {
        setDiffContext({ filename });
    };

    const openCommitDiff = (commitHash) => {
        setDiffContext({ commitHash });
    };

    const FileRow = ({ file, isStaged }) => (
        <div 
            onClick={() => openDiff(file.file)}
            className="group flex items-center justify-between py-1.5 px-3 hover:bg-[var(--accent)]/5 rounded-lg cursor-pointer transition-colors"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <input 
                    type="checkbox" 
                    checked={isStaged} 
                    readOnly 
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer" 
                    onClick={(e) => { e.stopPropagation(); isStaged ? handleUnstage(file.file) : handleStage(file.file); }} 
                />
                {getFileIcon(file.file)}
                <span className="text-[12px] text-[var(--text-main)] truncate font-mono">{file.file}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-black w-4 text-center ${getStatusColor(file.status)}`}>{file.status}</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); isStaged ? handleUnstage(file.file) : handleStage(file.file); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-500 transition-opacity"
                    title={isStaged ? "Unstage" : "Stage"}
                >
                    {isStaged ? <Minus size={14} /> : <Plus size={14} />}
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex overflow-hidden animate-in fade-in duration-500 min-h-0">
            {/* Sidebar */}
            <div className="w-[280px] shrink-0 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)]">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[14px] font-black tracking-tight text-[var(--text-main)] flex items-center gap-2">
                            <FolderGit2 size={16} className="text-[var(--accent)]" /> Repositories
                        </h2>
                        <button 
                            onClick={() => setIsCreateRepoModalOpen(true)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm hover:shadow hover:bg-[var(--accent)]/90 transition-all"
                            title="New Repository"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Find repository..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[12px] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder-slate-400"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
                    {filteredRepos.map(repo => (
                        <button
                            key={repo.id}
                            onClick={() => handleSelectRepo(repo)}
                            className={`w-full flex flex-col text-left p-3 rounded-xl transition-all duration-200 border ${
                                selectedRepo?.id === repo.id 
                                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30' 
                                    : 'border-transparent hover:bg-[var(--bg-workspace)]'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className={`font-bold text-[13px] ${selectedRepo?.id === repo.id ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'}`}>
                                    {repo.name}
                                </div>
                                {repo.private && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">Priv</span>}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{repo.full_name}</div>
                        </button>
                    ))}
                </div>
                
                {/* Connection Status */}
                <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-workspace)] flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        Git Engine Connected
                    </div>
                    <Settings2 size={14} className="cursor-pointer hover:text-[var(--text-main)]" />
                </div>
            </div>

            {/* Main Workspace Area */}
            <div className="flex-1 flex flex-col bg-[var(--bg-workspace)] min-w-0">
                {!selectedRepo ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <FolderGit2 size={64} strokeWidth={1} className="mb-6 opacity-50" />
                        <h2 className="text-xl font-black text-slate-700 mb-2">No Repository Selected</h2>
                        <p className="text-[13px] max-w-md text-center">Select a repository from the sidebar to view its working tree, commit changes, or map its history to an ERP Version.</p>
                    </div>
                ) : (
                    <>
                        {/* Sync Toolbar */}
                        <div className="h-14 shrink-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-[15px] font-black text-[var(--text-main)]">{selectedRepo.name}</h2>
                                <div className="h-4 w-px bg-[var(--border-color)]"></div>
                                <BranchManager 
                                    repoName={selectedRepo.name}
                                    currentBranch={localStatus?.branch}
                                    onBranchChange={() => checkLocalStatus(selectedRepo.name)}
                                />
                            </div>

                            {/* Navigation Tabs replaced by a bar below */}
                            
                            {!localStatus?.not_cloned && (
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleFetch} 
                                        disabled={isActionLoading} 
                                        className="btn-outline flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-bold"
                                        title="Fetch latest from remote"
                                    >
                                        <RefreshCw size={14} className={isActionLoading ? 'animate-spin' : ''} /> Fetch
                                    </button>
                                    <button 
                                        onClick={handlePull} 
                                        disabled={isActionLoading} 
                                        className="btn-outline flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-bold"
                                    >
                                        <Download size={14} /> Pull
                                        {trackingStatus?.behind > 0 && (
                                            <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center shadow-sm ml-1">
                                                ↓ {trackingStatus.behind}
                                            </span>
                                        )}
                                    </button>
                                    <button 
                                        onClick={handlePush} 
                                        disabled={isActionLoading} 
                                        className="btn-primary flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-bold bg-[var(--accent)] text-white hover:opacity-90"
                                    >
                                        <Upload size={14} /> Push Origin
                                        {trackingStatus?.ahead > 0 && (
                                            <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center shadow-sm ml-1">
                                                ↑ {trackingStatus.ahead}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {/* Tab Navigation Bar */}
                        {!localStatus?.not_cloned && (
                            <div className="h-12 shrink-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center px-6 gap-6 overflow-x-auto">
                                {[
                                    { id: 'changes', label: 'Changes', icon: GitCommit },
                                    { id: 'history', label: 'History', icon: Clock },
                                    { id: 'files', label: 'Files', icon: Code2 },
                                    { id: 'issues', label: 'Issues', icon: AlertCircle },
                                    { id: 'prs', label: 'Pull Requests', icon: GitPullRequest },
                                    { id: 'actions', label: 'Actions', icon: Play },
                                    { id: 'releases', label: 'Releases', icon: Tag }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`h-full flex items-center gap-2 px-1 text-[13px] font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-[var(--accent)] text-[var(--text-main)]' : 'border-transparent text-slate-500 hover:text-[var(--text-main)] hover:border-[var(--border-color)]'}`}
                                    >
                                        <tab.icon size={15} className={activeTab === tab.id ? 'text-[var(--accent)]' : ''} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Content Grid */}
                        <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0">
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <RefreshCw size={24} className="animate-spin text-[var(--accent)]" />
                                </div>
                            ) : localStatus?.not_cloned ? (
                                <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-card)] rounded-[24px] border border-[var(--border-color)] shadow-sm">
                                    <AlertTriangle size={48} className="text-amber-500 mb-6" strokeWidth={1.5} />
                                    <h2 className="text-[18px] font-black text-[var(--text-main)] mb-3">Repository Not Cloned</h2>
                                    <p className="text-[13px] text-slate-500 max-w-md text-center mb-8">This repository exists on the server but has not been cloned locally yet. Clone it to a folder on your system to start managing changes.</p>
                                    <button 
                                        onClick={() => setIsCloneModalOpen(true)} 
                                        disabled={isActionLoading}
                                        className="btn-primary flex items-center gap-2 h-11 px-8 rounded-xl font-black text-[13px] bg-[var(--accent)] text-white hover:opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20"
                                    >
                                        <Download size={16} /> 
                                        {isActionLoading ? 'Cloning Repository...' : 'Clone Repository Locally'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                                    {activeTab === 'changes' ? (
                                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 pb-6 min-h-0">
                                            {/* Advanced Workflow Area */}
                                            <div className="xl:col-span-7 flex flex-col gap-6 flex-1 min-h-0">
                                                <div className="flex-1 flex flex-col bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden">
                                                    
                                                    {/* Staged Changes */}
                                                    <div className="flex-1 flex flex-col min-h-[150px] border-b border-[var(--border-color)]">
                                                        <div className="h-10 shrink-0 bg-slate-50 flex items-center justify-between px-4 border-b border-[var(--border-color)]">
                                                            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Staged Changes ({localStatus?.staged?.length || 0})</h3>
                                                            {localStatus?.staged?.length > 0 && (
                                                                <button onClick={handleUnstageAll} disabled={isActionLoading} className="text-[11px] font-bold text-slate-500 hover:text-rose-500">Unstage All</button>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                                            {localStatus?.staged?.length > 0 ? (
                                                                localStatus.staged.map((f, i) => <FileRow key={i} file={f} isStaged={true} />)
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center text-[12px] font-bold text-slate-400">No staged changes</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Unstaged Changes */}
                                                    <div className="flex-1 flex flex-col min-h-[150px]">
                                                        <div className="h-10 shrink-0 bg-slate-50 flex items-center justify-between px-4 border-b border-[var(--border-color)]">
                                                            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Changes ({localStatus?.unstaged?.length || 0})</h3>
                                                            {localStatus?.unstaged?.length > 0 && (
                                                                <button onClick={handleStageAll} disabled={isActionLoading} className="text-[11px] font-bold text-[var(--accent)] hover:underline">Stage All</button>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                                            {localStatus?.unstaged?.length > 0 ? (
                                                                localStatus.unstaged.map((f, i) => <FileRow key={i} file={f} isStaged={false} />)
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center text-[12px] font-bold text-slate-400">No uncommitted changes</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Commit & Map */}
                                            <div className="xl:col-span-5 flex flex-col gap-6">
                                                {/* Commit Panel */}
                                                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-5 flex flex-col shrink-0">
                                                    <h3 className="font-black text-[var(--text-main)] text-[14px] mb-4 flex items-center gap-2">
                                                        <GitCommit size={16} className="text-[var(--accent)]" /> Commit Changes
                                                    </h3>
                                                    
                                                    <input 
                                                        type="text"
                                                        placeholder="Summary (required)"
                                                        value={commitMessage}
                                                        onChange={e => setCommitMessage(e.target.value)}
                                                        className="w-full h-10 px-3 text-[13px] font-bold rounded-lg border border-[var(--border-color)] bg-[var(--bg-workspace)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none mb-3"
                                                    />
                                                    
                                                    <textarea 
                                                        placeholder="Description (optional)"
                                                        value={commitDescription}
                                                        onChange={e => setCommitDescription(e.target.value)}
                                                        className="w-full h-24 p-3 text-[13px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-workspace)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none resize-none mb-4 custom-scrollbar"
                                                    />
                                                    
                                                    <div className="flex gap-3">
                                                        <button 
                                                            onClick={handleCommit}
                                                            disabled={isActionLoading || !commitMessage || localStatus?.staged?.length === 0}
                                                            className="flex-1 h-10 rounded-lg font-black text-[13px] flex items-center justify-center gap-2 bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[var(--accent)]/20"
                                                        >
                                                            <Check size={16} /> Commit to {localStatus?.branch || 'main'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Version Mapping Panel */}
                                                <div className="bg-gradient-to-br from-indigo-50/50 to-[var(--bg-workspace)] rounded-2xl border border-indigo-100 shadow-sm p-5 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none transform group-hover:scale-110 transition-transform duration-500">
                                                        <Tag size={140} />
                                                    </div>
                                                    
                                                    <h3 className="font-black text-[var(--text-main)] text-[14px] mb-2 flex items-center gap-2 relative z-10">
                                                        <Tag size={16} className="text-indigo-500" /> ERP Version Mapping
                                                    </h3>
                                                    <p className="text-[12px] font-medium text-slate-500 mb-5 relative z-10">
                                                        Generate a Git tag and release. This maps this exact codebase version to the ERP so the Finished Goods Auto-Fill integration can detect it.
                                                    </p>

                                                    <div className="space-y-4 relative z-10">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1.5">Version Tag</label>
                                                            <input 
                                                                type="text"
                                                                placeholder="e.g. v2.1.0"
                                                                value={versionTag}
                                                                onChange={e => setVersionTag(e.target.value)}
                                                                className="w-full h-10 px-3 text-[13px] font-mono font-bold rounded-lg border border-[var(--border-color)] bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1.5">Release Notes (Optional)</label>
                                                            <input 
                                                                type="text"
                                                                placeholder="e.g. Initial production firmware"
                                                                value={tagMessage}
                                                                onChange={e => setTagMessage(e.target.value)}
                                                                className="w-full h-10 px-3 text-[13px] rounded-lg border border-[var(--border-color)] bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                            />
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={handleCreateVersionRelease}
                                                            disabled={isActionLoading || !versionTag}
                                                            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[13px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
                                                        >
                                                            <Plus size={16} /> Tag & Release ERP Version
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : activeTab === 'history' ? (
                                        <div className="flex-1 flex flex-col gap-6 min-h-0">
                                            <div className={`${diffContext ? 'h-[40%]' : 'flex-1'} shrink-0 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden transition-all duration-300 min-h-0`}>
                                                <CommitHistory repoName={selectedRepo.name} onSelectCommit={openCommitDiff} />
                                            </div>
                                            {diffContext && (
                                                <div className="flex-1 bg-white rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden relative min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                                    <DiffViewer 
                                                        repoName={selectedRepo.name}
                                                        filename={diffContext.filename}
                                                        commitHash={diffContext.commitHash}
                                                        onClose={() => setDiffContext(null)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : activeTab === 'releases' ? (
                                        <ReleasesPanel repoOwner={selectedRepo.owner?.username || 'devops-LIPL'} repoName={selectedRepo.name} />
                                    ) : activeTab === 'issues' ? (
                                        <div className="h-full flex flex-col bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm mt-6 min-h-0">
                                            <GitIssues selectedRepo={selectedRepo} />
                                        </div>
                                    ) : activeTab === 'prs' ? (
                                        <div className="h-full flex flex-col bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm mt-6 min-h-0">
                                            <GitPullRequests selectedRepo={selectedRepo} />
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm mt-6 min-h-0">
                                            <Zap size={48} className="text-slate-300 mb-4" strokeWidth={1} />
                                            <h2 className="text-[18px] font-black text-[var(--text-main)] mb-2 capitalize">{activeTab} Integration</h2>
                                            <p className="text-[13px] text-slate-500 max-w-sm text-center">
                                                This feature mirrors your desktop Git Client's {activeTab} pane. It is currently under development.
                                            </p>
                                        </div>
                                    )}

                                    {/* Diff Overlay (For other tabs like Changes) */}
                                    {diffContext && activeTab !== 'history' && (
                                        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                                            <div className="h-full w-full bg-white rounded-2xl border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col">
                                                <DiffViewer 
                                                    repoName={selectedRepo.name}
                                                    filename={diffContext.filename}
                                                    commitHash={diffContext.commitHash}
                                                    onClose={() => setDiffContext(null)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <CreateRepoModal 
                isOpen={isCreateRepoModalOpen} 
                onClose={() => setIsCreateRepoModalOpen(false)} 
                onRepoCreated={(repoName) => {
                    fetchRepos();
                    if (repoName) {
                        const newRepo = { name: repoName, clone_url: '' }; // Mock object just for selection
                        handleRepoSelect(newRepo);
                    }
                }}
            />

            {/* Clone Repository Modal */}
            {isCloneModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <Download size={16} className="text-[var(--accent)]" /> Clone Repository
                            </h3>
                            <button onClick={() => setIsCloneModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Repository</label>
                                <div className="text-[14px] font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">{selectedRepo?.name}</div>
                            </div>
                            <div className="mb-6">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Target Path</label>
                                <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-white shadow-sm">
                                    <div className="bg-slate-50 px-3 py-2 border-b border-[var(--border-color)] flex items-center gap-2">
                                        <button 
                                            onClick={() => fetchFs(fsParentPath)}
                                            disabled={isFsLoading || fsPath === '/'}
                                            className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"
                                            title="Go Up"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                        </button>
                                        <div className="text-[12px] font-mono text-slate-700 truncate flex-1">{fsPath}</div>
                                        {isFsLoading && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
                                    </div>
                                    <div className="h-[200px] overflow-y-auto p-2">
                                        {fsDirectories.length === 0 && !isFsLoading && (
                                            <div className="h-full flex items-center justify-center text-[12px] text-slate-400 italic">No subdirectories found</div>
                                        )}
                                        {fsDirectories.map(dir => (
                                            <div 
                                                key={dir.path}
                                                onClick={() => {
                                                    setCloneTargetPath(dir.path);
                                                    fetchFs(dir.path);
                                                }}
                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${cloneTargetPath === dir.path ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                                            >
                                                <Folder size={16} className={cloneTargetPath === dir.path ? 'text-blue-500 fill-blue-100' : 'text-slate-400 fill-slate-100'} />
                                                <span className="text-[13px] truncate">{dir.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 px-1">
                                    <span className="text-[12px] font-bold text-slate-500 whitespace-nowrap">Selected:</span>
                                    <input 
                                        type="text"
                                        value={cloneTargetPath}
                                        onChange={(e) => setCloneTargetPath(e.target.value)}
                                        className="flex-1 h-8 px-2 text-[12px] font-mono rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-[var(--accent)]"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setIsCloneModalOpen(false)}
                                    className="flex-1 h-10 rounded-xl font-bold text-[13px] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleClone}
                                    disabled={isActionLoading}
                                    className="flex-1 h-10 rounded-xl font-bold text-[13px] text-white bg-[var(--accent)] hover:opacity-90 transition-colors shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50"
                                >
                                    {isActionLoading ? 'Cloning...' : 'Clone Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GitDashboard;
