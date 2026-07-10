import re

with open("frontend/src/modules/git/pages/GitDashboard.jsx", "r") as f:
    content = f.read()

# 1. Replace the start of the grid
old_grid_start = """                                <div className="h-full grid grid-cols-1 xl:grid-cols-12 gap-6 relative">
                                    
                                    {/* Advanced Workflow Area */}
                                    <div className="xl:col-span-7 flex flex-col gap-6 overflow-hidden">
                                        {activeTab === 'changes' ? ("""
new_grid_start = """                                <div className="h-full relative overflow-y-auto custom-scrollbar">
                                    {activeTab === 'changes' ? (
                                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full pb-6">
                                            {/* Advanced Workflow Area */}
                                            <div className="xl:col-span-7 flex flex-col gap-6 h-full">"""

content = content.replace(old_grid_start, new_grid_start)

# 2. Replace the middle part (CommitHistory toggle)
old_middle = """                                        </div>
                                        ) : (
                                            <CommitHistory repoName={selectedRepo.name} onSelectCommit={openCommitDiff} />
                                        )}
                                    </div>"""
new_middle = """                                        </div>
                                    </div>"""

content = content.replace(old_middle, new_middle)

# 3. Replace the end of the ERP mapping panel to insert the other tabs logic
old_end = """                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Diff Overlay */}"""
new_end = """                                                </button>
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

                                {/* Diff Overlay */}"""

content = content.replace(old_end, new_end)

with open("frontend/src/modules/git/pages/GitDashboard.jsx", "w") as f:
    f.write(content)
