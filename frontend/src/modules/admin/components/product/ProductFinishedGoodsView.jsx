import React from 'react';
import { useFinishedGoods, useFinishedGoodsOptions } from '../../../../hooks/useFinishedGoods';
import { Loader2, Box, ImageOff } from 'lucide-react';

const ProductFinishedGoodsView = ({ productId }) => {
    const { data: itemsData, isLoading: itemsLoading } = useFinishedGoods({ 
        page: 1, 
        limit: 100, // Fetch all finished goods for this product
        search: '', 
        product_id: productId 
    });
    const { data: optionsData, isLoading: optionsLoading } = useFinishedGoodsOptions();

    const items = itemsData?.data || [];
    const options = optionsData || { products: [], pcb: [], electrical: [], electronics: [], structural: [] };
    const loading = itemsLoading || optionsLoading;

    const getComponentName = (type, id) => {
        const list = options[type] || [];
        const item = list.find(i => String(i.id) === String(id));
        return item ? item.name : `ID: ${id}`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12 bg-[var(--bg-workspace)]/10 rounded-2xl border border-dashed border-[var(--border-color)]">
                <Box size={48} className="text-[var(--text-muted)] mb-4 mx-auto opacity-50" />
                <p className="text-[var(--text-dim)] font-black uppercase tracking-widest text-[10px] opacity-40">No Finished Goods associated with this product.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {items.map((viewItem, index) => (
                <div key={viewItem.id || index} className="p-6 md:p-8 space-y-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-sm">
                    <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                        <h3 className="text-xl font-black text-[var(--text-main)]">{viewItem.product_name}</h3>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${viewItem.is_iot ? 'bg-[var(--border-glow)] text-[var(--accent)]' : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-dim)]'}`}>
                            {viewItem.is_iot ? 'IoT Device' : 'Non-IoT Device'}
                        </span>
                    </div>
                    
                    <p className="text-sm text-[var(--text-dim)] font-medium">Quantity: <span className="font-black text-lg text-[var(--accent)] ml-1">{viewItem.quantity}</span></p>
                    
                    {viewItem.hardware_features && viewItem.hardware_features.length > 0 && (
                        <div>
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-3">Hardware Features</h4>
                            <ul className="space-y-2">
                                {viewItem.hardware_features.map((h, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <span className="px-2 py-1 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-md text-[9px] uppercase font-black text-[var(--accent)] tracking-widest shadow-sm">{h.component_type}</span>
                                        <span className="font-bold text-[14px] text-[var(--text-main)]">{getComponentName(h.component_type, h.component_id)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {viewItem.is_iot && (
                        <div className="space-y-6 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-2">Power Controller</h4>
                                    <p className="text-[14px] font-black text-[var(--text-main)]">{viewItem.power_controller ? 'Enabled' : 'Disabled'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-2">Motherboard</h4>
                                    <p className="text-[14px] font-black text-[var(--text-main)]">
                                        {viewItem.motherboard_id ? getComponentName('pcb', viewItem.motherboard_id) : 'None'}
                                    </p>
                                </div>
                            </div>

                            {(viewItem.communication_details || []).length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-3">Communication Interfaces</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {(Array.isArray(viewItem.communication_details) ? viewItem.communication_details : (viewItem.communication_details?.interfaces || [])).map((comm, i) => (
                                            <div key={i} className="p-4 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl">
                                                <h5 className="text-[12px] font-black uppercase tracking-widest text-[var(--accent)] mb-4">{comm.method}</h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-2">Comm Protocol</span>
                                                        <div className="flex flex-wrap gap-1.5">{(comm.communicationProtocol || []).map(p => <span key={p} className="px-2 py-1 border border-[var(--border-color)] rounded-md bg-[var(--bg-card)] text-[10px] font-bold text-[var(--text-main)] shadow-sm">{p}</span>)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-2">OTA Protocol</span>
                                                        <div className="flex flex-wrap gap-1.5">{(comm.otaProtocol || []).map(p => <span key={p} className="px-2 py-1 border border-[var(--border-color)] rounded-md bg-[var(--bg-card)] text-[10px] font-bold text-[var(--text-main)] shadow-sm">{p}</span>)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-2">Data Format</span>
                                                        <div className="flex flex-wrap gap-1.5">{(comm.dataFormat || []).map(p => <span key={p} className="px-2 py-1 border border-[var(--border-color)] rounded-md bg-[var(--bg-card)] text-[10px] font-bold text-[var(--text-main)] shadow-sm">{p}</span>)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Traceability Details */}
                            {(viewItem.repository_owner || (viewItem.communication_details?.git_traceability?.repository_owner)) && (viewItem.repository_name || (viewItem.communication_details?.git_traceability?.repository_name)) && (
                                <div className="space-y-4 pt-6 border-t border-[var(--border-color)]">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-3">Firmware Traceability</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-1">Repository</span>
                                            <span className="text-[13px] font-bold text-[var(--text-main)]">{viewItem.repository_owner || viewItem.communication_details?.git_traceability?.repository_owner}/{viewItem.repository_name || viewItem.communication_details?.git_traceability?.repository_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-1">Branch</span>
                                            <span className="text-[13px] font-bold text-[var(--text-main)]">{viewItem.branch || viewItem.communication_details?.git_traceability?.branch || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-1">Commit</span>
                                            <span className="text-[13px] font-bold text-[var(--text-main)] font-mono">{(viewItem.commit_sha || viewItem.communication_details?.git_traceability?.commit_sha) ? (viewItem.commit_sha || viewItem.communication_details?.git_traceability?.commit_sha).substring(0, 7) : 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-1">Tag / Release</span>
                                            <span className="text-[13px] font-bold text-[var(--text-main)]">{viewItem.tag || viewItem.communication_details?.git_traceability?.tag || viewItem.release_id || viewItem.communication_details?.git_traceability?.release_id || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-1">Workflow / Build</span>
                                            <span className="text-[13px] font-bold text-[var(--text-main)]">{viewItem.workflow_run_id || viewItem.communication_details?.git_traceability?.workflow_run_id || viewItem.build_number || viewItem.communication_details?.git_traceability?.build_number || 'N/A'}</span>
                                        </div>
                                        {(viewItem.firmware_binary_url || viewItem.communication_details?.git_traceability?.firmware_binary_url) && (
                                            <div className="lg:col-span-3">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-dim)] block mb-1">Binary Asset</span>
                                                <a href={viewItem.firmware_binary_url || viewItem.communication_details?.git_traceability?.firmware_binary_url} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-blue-500 hover:underline break-all">
                                                    {viewItem.firmware_binary_url || viewItem.communication_details?.git_traceability?.firmware_binary_url}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {viewItem.serial_numbers && viewItem.serial_numbers.length > 0 && (
                        <div className="pt-4 border-t border-[var(--border-color)]">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-3">Serial Numbers</h4>
                            <div className="text-[13px] font-mono text-[var(--text-muted)] bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] break-all leading-relaxed">
                                {viewItem.serial_numbers.join(', ')}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ProductFinishedGoodsView;
