import React, { useState, useEffect } from 'react';
import { Clock, User, GitCommit, Search, RefreshCw, GitBranch } from 'lucide-react';
import { localGitLog } from '../../../api/gitIntegration';
import toast from 'react-hot-toast';

const CommitHistory = ({ repoName, onSelectCommit }) => {
    const [commits, setCommits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (repoName) {
            fetchHistory();
        }
    }, [repoName]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const res = await localGitLog(repoName, 50);
            if (res.data?.status === 'success') {
                setCommits(res.data.log || []);
            }
        } catch (error) {
            toast.error("Failed to fetch commit history");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCommits = commits.filter(c => 
        c.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.hash.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden h-full">
            <div className="h-14 shrink-0 bg-slate-50 flex items-center justify-between px-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <h3 className="text-[13px] font-black text-slate-700">Commit History</h3>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Filter commits..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-[200px] h-8 pl-9 pr-3 rounded-lg bg-white border border-slate-200 text-[12px] focus:outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <button onClick={fetchHistory} className="p-1.5 text-slate-400 hover:text-[var(--text-main)] rounded bg-white border border-slate-200">
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <RefreshCw size={24} className="animate-spin text-[var(--accent)]" />
                    </div>
                ) : filteredCommits.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[12px] font-bold text-slate-400">
                        No commits found
                    </div>
                ) : (
                    <div className="min-w-[600px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-200">
                                <tr>
                                    <th className="py-2 px-4 text-[11px] font-black uppercase text-slate-500 w-[120px]">Commit</th>
                                    <th className="py-2 px-4 text-[11px] font-black uppercase text-slate-500 w-[200px]">Refs</th>
                                    <th className="py-2 px-4 text-[11px] font-black uppercase text-slate-500">Message</th>
                                    <th className="py-2 px-4 text-[11px] font-black uppercase text-slate-500 w-[150px]">Author</th>
                                    <th className="py-2 px-4 text-[11px] font-black uppercase text-slate-500 w-[120px]">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCommits.map((commit, idx) => (
                                    <tr 
                                        key={idx} 
                                        onClick={() => onSelectCommit(commit.hash)}
                                        className="border-b border-slate-100 hover:bg-[var(--accent)]/5 cursor-pointer transition-colors group"
                                    >
                                        <td className="py-2 px-4">
                                            <div className="flex items-center gap-2">
                                                <GitCommit size={14} className="text-slate-400 group-hover:text-[var(--accent)]" />
                                                <span className="font-mono text-[12px] font-bold text-[var(--accent)]">{commit.hash.substring(0, 7)}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {commit.refs?.map((ref, i) => (
                                                    <span key={i} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                        ref.includes('origin/') ? 'bg-amber-100 text-amber-700' :
                                                        ref.includes('tag: ') ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                        {ref.replace('tag: ', '')}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <span className="text-[12px] font-medium text-slate-700 truncate block max-w-[300px]">
                                                {commit.message}
                                            </span>
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="flex items-center gap-1.5">
                                                <User size={12} className="text-slate-400" />
                                                <span className="text-[11px] font-bold text-slate-600 truncate">{commit.author}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <span className="text-[11px] text-slate-500">{commit.date}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommitHistory;
