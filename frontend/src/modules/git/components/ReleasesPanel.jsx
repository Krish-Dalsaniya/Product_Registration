import React, { useState, useEffect } from 'react';
import { Tag, Calendar, Download, RefreshCw, FileBox, File, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { getGitReleases } from '../../../api/gitIntegration';

const ReleasesPanel = ({ repoOwner, repoName }) => {
    const [releases, setReleases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReleases = async () => {
        setIsLoading(true);
        try {
            const res = await getGitReleases(repoOwner, repoName);
            if (res.data?.success) {
                setReleases(res.data.data || []);
            }
        } catch (error) {
            toast.error("Failed to load releases");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (repoOwner && repoName) {
            fetchReleases();
        }
    }, [repoOwner, repoName]);

    
    const handleDownload = async (e, asset) => {
        e.preventDefault();
        const toastId = toast.loading(`Downloading ${asset.name}...`);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/integrations/git/repos/${repoOwner}/${repoName}/releases/assets/${asset.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Download failed');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', asset.name);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success(`Downloaded ${asset.name}`, { id: toastId });
        } catch (error) {
            toast.error(`Failed to download ${asset.name}`, { id: toastId });
            console.error(error);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm">
                <RefreshCw size={32} className="animate-spin text-[var(--accent)] mb-4" />
                <p className="text-[13px] font-bold text-slate-500">Loading Releases...</p>
            </div>
        );
    }

    if (releases.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-8">
                <FileBox size={64} className="text-slate-200 mb-6" strokeWidth={1} />
                <h2 className="text-[18px] font-black text-[var(--text-main)] mb-2">No Releases Found</h2>
                <p className="text-[13px] text-slate-500 max-w-sm text-center">
                    This repository doesn't have any releases yet. You can create one by navigating to the <strong>Changes</strong> tab and using the "Version Tag" tool at the bottom!
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-workspace)]">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-[18px] font-black text-[var(--text-main)] flex items-center gap-2">
                    <Tag size={20} className="text-[var(--accent)]" /> Releases ({releases.length})
                </h2>
                <button 
                    onClick={fetchReleases}
                    className="btn-outline flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-bold"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pb-6 min-h-0">
                {releases.map((release) => (
                    <div key={release.id} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col shrink-0">
                        
                        {/* Release Header */}
                        <div className="bg-slate-50 border-b border-[var(--border-color)] p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-[18px] font-black text-[var(--text-main)] mb-1">
                                        {release.name || release.tag_name}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-4 text-[12px] font-bold text-slate-500">
                                        <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                            <Tag size={12} /> {release.tag_name}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={14} /> 
                                            {new Date(release.published_at || release.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <User size={14} /> {release.author?.username || 'Unknown'}
                                        </span>
                                        {release.prerelease && (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pre-release</span>
                                        )}
                                        {release.draft && (
                                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">Draft</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Release Body (Markdown) */}
                        <div className="p-6 border-b border-[var(--border-color)]">
                            {release.body ? (
                                <div className="prose prose-sm max-w-none text-slate-700">
                                    <ReactMarkdown>{release.body}</ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-[13px] text-slate-400 italic">No release notes provided.</p>
                            )}
                        </div>

                        {/* Assets Section */}
                        <div className="p-5 bg-slate-50">
                            <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                <FileBox size={14} /> Assets ({release.assets?.length || 0})
                            </h4>
                            
                            {release.assets && release.assets.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {release.assets.map(asset => (
                                        <div key={asset.id} className="flex items-center justify-between bg-white border border-[var(--border-color)] rounded-xl p-3 hover:border-blue-300 transition-colors shadow-sm group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                    <File size={16} className="text-blue-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-bold text-[var(--text-main)] truncate" title={asset.name}>
                                                        {asset.name}
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-400">
                                                        {formatBytes(asset.size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <a 
                                                href="#" onClick={(e) => handleDownload(e, asset)} 
                                                 
                                                
                                                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors shrink-0 opacity-0 group-hover:opacity-100 md:opacity-100"
                                                title={`Download ${asset.name}`}
                                            >
                                                <Download size={14} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[13px] text-slate-500 font-medium">No assets attached to this release. Source code only.</p>
                            )}
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReleasesPanel;
