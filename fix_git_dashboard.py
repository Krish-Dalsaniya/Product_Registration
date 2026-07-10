import sys

with open('frontend/src/modules/git/pages/GitDashboard.jsx', 'r') as f:
    lines = f.readlines()

# The grid starts at line 477 (index 476) and ends at line 611 (index 610)
# Let's verify by finding the exact lines:
start_idx = -1
for i, line in enumerate(lines):
    if '<div className="h-full relative overflow-y-auto custom-scrollbar">' in line:
        start_idx = i
        break
        
if start_idx == -1:
    print("Could not find start index")
    sys.exit(1)

# Find the Diff Overlay closing div
end_idx = -1
for i in range(start_idx, len(lines)):
    if '{/* Diff Overlay */}' in lines[i]:
        # The closing div of the grid is 2 lines below Diff Overlay is closed
        # wait, let's just find the exact line 611
        end_idx = i
        break

new_content = """                                <div className="h-full relative overflow-y-auto custom-scrollbar">
                                    {activeTab === 'changes' ? (
                                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full pb-6">
                                            {/* Advanced Workflow Area */}
                                            <div className="xl:col-span-7 flex flex-col gap-6 h-full">
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
                                        <div className="h-full flex flex-col bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden">
                                            <CommitHistory repoName={selectedRepo.name} onSelectCommit={openCommitDiff} />
                                        </div>
                                    ) : (
                                        <div className="h-[400px] flex flex-col items-center justify-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm mt-6">
                                            <Zap size={48} className="text-slate-300 mb-4" strokeWidth={1} />
                                            <h2 className="text-[18px] font-black text-[var(--text-main)] mb-2 capitalize">{activeTab} Integration</h2>
                                            <p className="text-[13px] text-slate-500 max-w-sm text-center">
                                                This feature mirrors your desktop Git Client's {activeTab} pane. It is currently under development.
                                            </p>
                                        </div>
                                    )}
"""

lines = lines[:start_idx] + [new_content + "\n"] + lines[end_idx:]

with open('frontend/src/modules/git/pages/GitDashboard.jsx', 'w') as f:
    f.writelines(lines)
