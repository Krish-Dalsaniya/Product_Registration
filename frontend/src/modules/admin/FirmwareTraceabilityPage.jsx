import React, { useState } from 'react';
import { useFirmwareTraceabilityMap } from '../../hooks/useInventory';
import { 
    Network, 
    Box, 
    Cpu, 
    CircuitBoard, 
    ChevronDown, 
    ChevronRight, 
    GitBranch, 
    Loader2 
} from 'lucide-react';

const FirmwareTraceabilityPage = () => {
    const { data: mapData, isLoading, error } = useFirmwareTraceabilityMap();
    const [expandedNodes, setExpandedNodes] = useState({});

    const toggleNode = (id) => {
        setExpandedNodes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                Error loading traceability map: {error.message}
            </div>
        );
    }

    const repos = mapData?.data || (Array.isArray(mapData) ? mapData : []);

    return (
        <div className="min-h-screen bg-[var(--bg-main)] p-8">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="mb-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20 shadow-inner">
                        <Network size={24} className="text-[var(--accent)]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Firmware Traceability Map</h1>
                        <p className="text-[var(--text-dim)] font-medium mt-1">
                            Track firmware deployments across Motherboards and Finished Goods
                        </p>
                    </div>
                </div>

                {/* Tree View */}
                <div className="space-y-6">
                    {repos.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-dim)] bg-[var(--bg-workspace)]/50 rounded-2xl border border-dashed border-[var(--border-color)]">
                            No firmware traceability records found.
                        </div>
                    ) : (
                        repos.map(repo => (
                            <div key={repo.firmware_master_id} className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm transition-all hover:border-[var(--accent)]/40">
                                {/* Repo Header */}
                                <div 
                                    onClick={() => toggleNode(`repo_${repo.firmware_master_id}`)}
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-black/5"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                            <GitBranch size={20} className="text-orange-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                                                {repo.firmware_branch_name}
                                            </h3>
                                            {repo.description && (
                                                <p className="text-xs text-[var(--text-muted)] mt-1">{repo.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-black bg-[var(--bg-main)] text-[var(--text-dim)] px-3 py-1 rounded-full uppercase tracking-widest border border-[var(--border-color)]">
                                            {repo.deployments?.length || 0} DEPLOYMENTS
                                        </span>
                                        {expandedNodes[`repo_${repo.firmware_master_id}`] ? 
                                            <ChevronDown size={20} className="text-[var(--text-muted)]" /> : 
                                            <ChevronRight size={20} className="text-[var(--text-muted)]" />
                                        }
                                    </div>
                                </div>

                                {/* Deployments List */}
                                {expandedNodes[`repo_${repo.firmware_master_id}`] && (
                                    <div className="border-t border-[var(--border-color)] bg-black/2 p-5 pl-14 space-y-4">
                                        {repo.deployments?.map((dep, idx) => (
                                            <div key={idx} className="relative pl-6 border-l-2 border-orange-500/30 pb-4 last:pb-0">
                                                {/* Connecting line */}
                                                <div className="absolute left-0 top-6 w-4 border-t-2 border-orange-500/30"></div>
                                                
                                                <div className="bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm">
                                                    
                                                    {/* Motherboard & Processor Info */}
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex gap-4">
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mt-1">
                                                                <CircuitBoard size={16} className="text-emerald-500" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-black text-emerald-500 tracking-widest uppercase">Motherboard</span>
                                                                    <span className="text-sm font-bold text-[var(--text-main)]">{dep.pcb_name}</span>
                                                                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-workspace)] px-2 py-0.5 rounded border border-[var(--border-color)]">{dep.pcb_part_no}</span>
                                                                </div>
                                                                
                                                                {/* Processor */}
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <Cpu size={14} className="text-[var(--text-dim)]" />
                                                                    <span className="text-xs font-medium text-[var(--text-dim)]">Processor:</span>
                                                                    <span className="text-xs font-bold text-[var(--text-main)]">{dep.processor_name}</span>
                                                                    
                                                                    <span className="mx-2 text-[var(--border-color)]">|</span>
                                                                    
                                                                    <span className="text-xs font-medium text-[var(--text-dim)]">Version:</span>
                                                                    <span className="text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 rounded-sm border border-[var(--accent)]/20">{dep.assigned_version || 'Latest'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Finished Good Integration */}
                                                    {dep.finished_good && (
                                                        <div className="mt-4 pt-4 border-t border-dashed border-[var(--border-color)] pl-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-7 h-7 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                                    <Box size={14} className="text-blue-500" />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-black text-blue-500 tracking-widest uppercase">Finished Good Integration</span>
                                                                    <span className="text-xs font-bold text-[var(--text-main)]">{dep.finished_good.product_name}</span>
                                                                    <span className="text-[10px] text-[var(--text-muted)]">v{dep.finished_good.version}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default FirmwareTraceabilityPage;
