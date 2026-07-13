import React, { useState, useEffect } from 'react';
import { FileDiff, X, RefreshCw } from 'lucide-react';
import { localGitDiff } from '../../../api/gitIntegration';
import toast from 'react-hot-toast';

const DiffParser = {
    parse: (rawDiff) => {
        if (!rawDiff) return [];
        const lines = rawDiff.split('\n');
        const parsed = [];
        let oldLn = 0;
        let newLn = 0;
        let inHunk = false;

        const hunkHeaderRe = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

        for (const line of lines) {
            if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
                parsed.push({ type: 'header', content: line, oldLn: '', newLn: '' });
                continue;
            }

            const match = line.match(hunkHeaderRe);
            if (match) {
                inHunk = true;
                oldLn = parseInt(match[1]);
                newLn = parseInt(match[2]);
                parsed.push({ type: 'hunk', content: line, oldLn: '...', newLn: '...' });
                continue;
            }

            if (inHunk) {
                if (line.startsWith('-')) {
                    parsed.push({ type: 'deletion', content: line, oldLn: String(oldLn), newLn: '' });
                    oldLn++;
                } else if (line.startsWith('+')) {
                    parsed.push({ type: 'addition', content: line, oldLn: '', newLn: String(newLn) });
                    newLn++;
                } else if (line.startsWith(' ')) {
                    parsed.push({ type: 'context', content: line, oldLn: String(oldLn), newLn: String(newLn) });
                    oldLn++;
                    newLn++;
                } else if (line === '\\ No newline at end of file') {
                    parsed.push({ type: 'info', content: line, oldLn: '', newLn: '' });
                }
            } else {
                if (line.trim()) {
                    parsed.push({ type: 'header', content: line, oldLn: '', newLn: '' });
                }
            }
        }
        return parsed;
    }
};

const DiffViewer = ({ repoName, filename, commitHash, onClose }) => {
    const [viewMode, setViewMode] = useState('unified'); // 'unified' or 'split'
    const [parsedDiff, setParsedDiff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDiff();
    }, [repoName, filename, commitHash]);

    const fetchDiff = async () => {
        setIsLoading(true);
        try {
            const res = await localGitDiff(repoName, filename, commitHash);
            if (res.data?.status === 'success') {
                setParsedDiff(DiffParser.parse(res.data.diff));
            }
        } catch (error) {
            toast.error("Failed to fetch diff");
        } finally {
            setIsLoading(false);
        }
    };

    const renderUnified = () => {
        return (
            <table className="w-full border-collapse font-mono text-[12px]">
                <tbody>
                    {parsedDiff.map((line, idx) => {
                        let bgClass = 'bg-white text-slate-800';
                        let lnBgClass = 'bg-slate-100 text-slate-400';
                        if (line.type === 'addition') {
                            bgClass = 'bg-[#e6ffec] text-[#1a7f37]';
                            lnBgClass = 'bg-[#e6ffec] text-slate-500';
                        } else if (line.type === 'deletion') {
                            bgClass = 'bg-[#ffebe9] text-[#cf222e]';
                            lnBgClass = 'bg-[#ffebe9] text-slate-500';
                        } else if (['header', 'hunk', 'info'].includes(line.type)) {
                            bgClass = 'bg-[#f6f8fa] text-[#0969da] font-bold';
                            lnBgClass = 'bg-[#f6f8fa] text-transparent';
                        }

                        return (
                            <tr key={idx} className={`${bgClass}`}>
                                <td className={`w-12 text-right pr-2 py-0.5 select-none border-r border-slate-200 ${lnBgClass}`}>{line.oldLn}</td>
                                <td className={`w-12 text-right pr-2 py-0.5 select-none border-r border-slate-200 ${lnBgClass}`}>{line.newLn}</td>
                                <td className="pl-4 py-0.5 whitespace-pre-wrap word-break">{line.content}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    const renderSplit = () => {
        // Group into rows
        const rows = [];
        let i = 0;
        const n = parsedDiff.length;

        while (i < n) {
            const line = parsedDiff[i];
            if (['header', 'hunk', 'info', 'context'].includes(line.type)) {
                rows.push({ left: line, right: line });
                i++;
            } else if (line.type === 'deletion') {
                const dels = [];
                while (i < n && parsedDiff[i].type === 'deletion') {
                    dels.push(parsedDiff[i]);
                    i++;
                }
                const adds = [];
                while (i < n && parsedDiff[i].type === 'addition') {
                    adds.push(parsedDiff[i]);
                    i++;
                }
                const maxLen = Math.max(dels.length, adds.length);
                for (let j = 0; j < maxLen; j++) {
                    const leftLine = j < dels.length ? dels[j] : { type: 'empty', content: '', oldLn: '', newLn: '' };
                    const rightLine = j < adds.length ? adds[j] : { type: 'empty', content: '', oldLn: '', newLn: '' };
                    rows.push({ left: leftLine, right: rightLine });
                }
            } else if (line.type === 'addition') {
                rows.push({ left: { type: 'empty', content: '', oldLn: '', newLn: '' }, right: line });
                i++;
            } else {
                i++;
            }
        }

        const getClasses = (type) => {
            if (type === 'addition') return { bg: 'bg-[#e6ffec] text-[#1a7f37]', lnBg: 'bg-[#e6ffec] text-slate-500' };
            if (type === 'deletion') return { bg: 'bg-[#ffebe9] text-[#cf222e]', lnBg: 'bg-[#ffebe9] text-slate-500' };
            if (['header', 'hunk', 'info'].includes(type)) return { bg: 'bg-[#f6f8fa] text-[#0969da] font-bold', lnBg: 'bg-[#f6f8fa] text-transparent' };
            if (type === 'empty') return { bg: 'bg-slate-50', lnBg: 'bg-slate-50' };
            return { bg: 'bg-white text-slate-800', lnBg: 'bg-slate-100 text-slate-400' };
        };

        return (
            <table className="w-full border-collapse font-mono text-[12px] table-fixed">
                <tbody>
                    {rows.map((row, idx) => {
                        const leftCls = getClasses(row.left.type);
                        const rightCls = getClasses(row.right.type);

                        return (
                            <tr key={idx}>
                                {/* Left Side */}
                                <td className={`w-12 text-right pr-2 py-0.5 select-none border-r border-slate-200 ${leftCls.lnBg}`}>{row.left.oldLn}</td>
                                <td className={`pl-4 py-0.5 whitespace-pre-wrap word-break border-r border-slate-200 ${leftCls.bg}`}>{row.left.content}</td>
                                {/* Right Side */}
                                <td className={`w-12 text-right pr-2 py-0.5 select-none border-r border-slate-200 ${rightCls.lnBg}`}>{row.right.newLn}</td>
                                <td className={`pl-4 py-0.5 whitespace-pre-wrap word-break ${rightCls.bg}`}>{row.right.content}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    return (
        <div className="h-full w-full bg-white flex flex-col">
            {/* Header */}
            <div className="h-14 shrink-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                        <FileDiff size={16} />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-black text-[var(--text-main)]">
                            {filename ? filename : `Commit: ${commitHash?.substring(0, 7)}`}
                        </h2>
                        <p className="text-[11px] font-bold text-slate-400">Diff Viewer</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button 
                            onClick={() => setViewMode('unified')}
                            className={`px-3 py-1 rounded text-[11px] font-black transition-colors ${viewMode === 'unified' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Unified
                        </button>
                        <button 
                            onClick={() => setViewMode('split')}
                            className={`px-3 py-1 rounded text-[11px] font-black transition-colors ${viewMode === 'split' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Split
                        </button>
                    </div>

                    <div className="w-px h-5 bg-[var(--border-color)]"></div>

                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Diff Content */}
            <div className="flex-1 overflow-auto bg-white custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <RefreshCw size={24} className="animate-spin text-[var(--accent)]" />
                    </div>
                ) : parsedDiff.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <FileDiff size={48} className="mb-4 opacity-50" />
                        <h3 className="text-[14px] font-black">No changes to display</h3>
                        <p className="text-[12px]">The diff output is empty.</p>
                    </div>
                ) : (
                    <div className="min-w-[800px] border-b border-slate-200">
                        {viewMode === 'unified' ? renderUnified() : renderSplit()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiffViewer;
