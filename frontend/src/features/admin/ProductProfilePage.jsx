import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { getProductById, deleteProduct, getProductBom, getBomOptions } from '../../api/products';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import Lightbox from '../../components/shared/Lightbox';
import { Loader2, Box, Droplet, LayoutGrid, Activity, FileText, Eye, Download, CheckCircle, Pencil, Trash2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

const ProductProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { updateTabLabel } = useOutletContext() || {};
  const { hasPermission } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('description');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [bomItems, setBomItems] = useState([]);
  const [bomOptionsMap, setBomOptionsMap] = useState({ pcb: [], electrical: [], electronics: [], structural: [] });

  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const assetBaseURL = rawApiUrl.replace(/\/api$/, '');

  const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const base = assetBaseURL.endsWith('/') ? assetBaseURL.slice(0, -1) : assetBaseURL;
    return `${base}/${cleanUrl}`;
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await getProductById(id);
        if (response.data.success) {
          setSelectedProduct(response.data.data);
          
          try {
            const [bomRes, optRes] = await Promise.all([
              getProductBom(id),
              getBomOptions()
            ]);
            if (bomRes.data.success) setBomItems(bomRes.data.data || []);
            if (optRes.data.success) setBomOptionsMap(optRes.data.data || { pcb: [], electrical: [], electronics: [], structural: [] });
          } catch (e) {
            console.error('Failed to load BOM details', e);
          }
        } else {
          toast.error('Failed to load product');
          navigate('/admin/products');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Product not found');
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

  useEffect(() => {
    if (!selectedProduct) return;
    const allImages = selectedProduct?.images && selectedProduct.images.length > 1
      ? selectedProduct.images
      : null;
    if (!allImages || isLightboxOpen) return;
    const timer = setInterval(() => {
      setActiveImageIdx(i => (i + 1) % allImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [selectedProduct, activeImageIdx, isLightboxOpen]);

  useEffect(() => {
    if (selectedProduct?.product_name && updateTabLabel) {
      updateTabLabel(location.pathname + location.search, selectedProduct.product_name);
    }
  }, [selectedProduct, updateTabLabel, location]);

  const parseHardwareSpec = (specStr) => {
    try {
      if (!specStr) return null;
      let parsed = typeof specStr === 'string' ? JSON.parse(specStr) : specStr;
      if (parsed?.original_spec && typeof parsed.original_spec === 'string') {
        try {
          const inner = JSON.parse(parsed.original_spec);
          if (inner && (inner.fuel_types || inner.dispenser_type || inner.nozzles)) {
            parsed = { ...inner, ...parsed };
          }
        } catch(e) {}
      }
      if (parsed && typeof parsed === 'object' && ('fuel_types' in parsed || 'dispenser_type' in parsed || 'nozzles' in parsed)) return parsed;
    } catch (e) {}
    return null;
  };

  const parseSpecRows = (specStr) => {
    try {
      if (!specStr) return [{ key: '', value: '' }];
      const outerParsed = typeof specStr === 'string' ? JSON.parse(specStr) : specStr;
      if (outerParsed?.original_spec) {
        try {
          const innerParsed = typeof outerParsed.original_spec === 'string' ? JSON.parse(outerParsed.original_spec) : outerParsed.original_spec;
          if (innerParsed?.type === 'specs_table' && Array.isArray(innerParsed.rows)) return innerParsed.rows;
        } catch (e) {}
      }
      if (outerParsed?.type === 'specs_table' && Array.isArray(outerParsed.rows)) return outerParsed.rows;
    } catch (e) {}
    return [{ key: '', value: '' }];
  };

  const handleEditClick = () => {
    navigate('/admin/products', { state: { editProductId: selectedProduct.product_id } });
  };

  const handleDeleteClick = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete "${selectedProduct.product_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteProduct(selectedProduct.product_id);
      toast.success('Product deleted successfully!');
      navigate('/admin/products');
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!selectedProduct) return null;

  return (
    <div className="space-y-12 pb-10 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="px-1 h-0 overflow-visible flex justify-end relative z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <Breadcrumbs 
            items={[
              { label: 'Dashboard', path: '/admin/dashboard' },
              { label: 'Products', path: '/admin/products' },
              { label: selectedProduct?.product_name, active: true }
            ]} 
          />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          {(() => {
            const allImages = selectedProduct?.images && selectedProduct.images.length > 0 ? selectedProduct.images : (selectedProduct?.image_url ? [selectedProduct.image_url] : []);
            const currentUrl = allImages[activeImageIdx] || allImages[0];
            return (
              <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] p-5 shadow-sm space-y-4 max-w-[340px] mx-auto">
                <div 
                  className="aspect-square w-full bg-[var(--bg-workspace)] rounded-2xl border border-[var(--border-color)]/50 overflow-hidden group relative flex items-center justify-center cursor-zoom-in hover:border-[var(--accent)]/50 transition-colors"
                  onClick={() => { if(currentUrl) setIsLightboxOpen(true); }}
                >
                  {currentUrl && (
                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl pointer-events-none z-10 translate-y-2 group-hover:translate-y-0">
                      <Maximize2 size={18} />
                    </div>
                  )}
                  {currentUrl ? ( <img src={getFullUrl(currentUrl)} className="w-full h-full object-contain p-6 animate-in fade-in zoom-in-95 group-hover:scale-105 transition-transform duration-500 pointer-events-none" alt="Main Product" /> ) : ( <Box size={80} className="text-[var(--text-dim)] opacity-20" /> )}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {allImages.map((_, i) => ( <button key={i} onClick={() => setActiveImageIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImageIdx ? 'bg-[var(--accent)] w-6' : 'bg-[var(--text-muted)] opacity-30'}`} /> ))}
                    </div>
                  )}
                </div>
                {allImages.length > 1 && (
                  <div className="flex gap-3 justify-center overflow-x-auto pb-1 no-scrollbar">
                    {allImages.map((url, idx) => ( <button key={idx} onClick={() => setActiveImageIdx(idx)} className={`w-12 h-12 flex-shrink-0 rounded-xl border-2 transition-all overflow-hidden bg-[var(--bg-workspace)] ${idx === activeImageIdx ? 'border-[var(--accent)] scale-105' : 'border-transparent opacity-60'}`}><img src={getFullUrl(url)} className="w-full h-full object-contain p-1" /></button> ))}
                  </div>
                )}
              </div>
            );
          })()}
          {(() => {
             const allImages = selectedProduct?.images && selectedProduct.images.length > 0 ? selectedProduct.images : (selectedProduct?.image_url ? [selectedProduct.image_url] : []);
             return (
               <Lightbox 
                 images={allImages} 
                 initialIndex={activeImageIdx} 
                 isOpen={isLightboxOpen} 
                 onClose={() => setIsLightboxOpen(false)} 
               />
             );
          })()}
        </div>
        <div className="lg:col-span-8 space-y-6 py-2">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="bg-[var(--nav-hover)] text-[var(--accent)] font-black text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-md border border-[var(--border-color)]">{selectedProduct?.category || 'General'}</span>
                <span className="text-[var(--text-muted)] font-black text-[10px] uppercase tracking-widest opacity-40">Ref: {selectedProduct?.product_id?.toString().slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-lg shadow-sm text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Pencil size={12} strokeWidth={3} />
                  Edit
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 rounded-lg shadow-sm text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Trash2 size={12} strokeWidth={3} />
                  Delete
                </button>
              </div>
            </div>
            {selectedProduct?.company_name && <p className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] mb-1">{selectedProduct.company_name}</p>}
            <h1 className="text-3xl font-black text-[var(--text-main)] leading-tight tracking-tight">{selectedProduct?.product_name}</h1>
            
            {/* Active Status Badges */}
            {(selectedProduct?.product_promoted || selectedProduct?.product_inquired || selectedProduct?.product_quoted || selectedProduct?.product_sampled || selectedProduct?.product_purchased) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedProduct?.product_promoted && (
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">Promoted</span>
                )}
                {selectedProduct?.product_inquired && (
                  <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">Inquired</span>
                )}
                {selectedProduct?.product_quoted && (
                  <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">Quoted</span>
                )}
                {selectedProduct?.product_sampled && (
                  <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">Sampled</span>
                )}
                {selectedProduct?.product_purchased && (
                  <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">Purchased</span>
                )}
              </div>
            )}
            
            {hasPermission('products', 'tech_view') && (() => {
              const hardware = parseHardwareSpec(selectedProduct?.specification);
              if (!hardware) return null;
              return (
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                  {hardware.fuel_types?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/10"><Droplet size={12} strokeWidth={3} /></div>
                      <span className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight">{hardware.fuel_types.join(', ')}</span>
                    </div>
                  )}
                  {hardware.dispenser_type && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/10"><LayoutGrid size={12} strokeWidth={3} /></div>
                      <span className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight">{hardware.dispenser_type}</span>
                    </div>
                  )}
                  {hardware.nozzles && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/10"><Box size={12} strokeWidth={3} /></div>
                      <span className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight">{hardware.nozzles}</span>
                    </div>
                  )}
                  {hardware.dispensing && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/10"><Activity size={12} strokeWidth={3} /></div>
                      <span className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight">{hardware.dispensing}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {selectedProduct?.feature && (
            <div className="border-t border-[var(--border-color)] pt-2 space-y-2">
              <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest opacity-60">Key Features</p>
              <div className="ql-snow">
                <div 
                  className="text-[13px] text-[var(--text-main)] font-semibold leading-relaxed rich-text-content ql-editor !p-0"
                  style={{ color: 'var(--text-secondary)' }}
                  dangerouslySetInnerHTML={{ __html: selectedProduct.feature }}
                />
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="flex bg-[var(--bg-workspace)] border-b border-[var(--border-color)] overflow-x-auto no-scrollbar">
          {[
            'description', 
            ...(hasPermission('products', 'tech_view') ? ['specification'] : []), 
            'documents', 
            ...(hasPermission('products', 'tech_view') ? ['faqs', 'bill of materials'] : [])
          ].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-4.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-8 right-8 h-1 bg-[var(--accent)] rounded-t-full shadow-[0_-4px_12px_var(--border-glow)]" />}
            </button>
          ))}
        </div>
        <div className="p-8">
          {activeTab === 'description' && ( 
            <div className="ql-snow">
              <div 
                className="text-[15px] text-[var(--text-main)] leading-relaxed font-medium opacity-80 rich-text-content ql-editor !p-0"
                dangerouslySetInnerHTML={{ __html: selectedProduct?.description || 'No description available.' }}
              /> 
            </div>
          )}
            {activeTab === 'specification' && (() => {
              const specTableRows = parseSpecRows(selectedProduct?.specification);
              
              return (
                <div className="space-y-8">
                  {specTableRows.length > 0 && (specTableRows.some(r => r.key.trim() !== '')) ? (
                    <div className="space-y-4">
                      <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
                        {specTableRows.filter(r => r.key.trim() !== '').map((row, idx) => (
                          <div key={idx} className={`grid grid-cols-[220px_1fr] border-b border-[var(--border-color)] last:border-b-0 ${idx % 2 === 0 ? 'bg-[var(--bg-workspace)]/30' : 'bg-[var(--bg-workspace)]/10'}`}>
                            <div className="px-6 py-4 text-[13px] font-black text-[var(--text-muted)] border-r border-[var(--border-color)] uppercase tracking-wider">{row.key}</div>
                            <div className="px-6 py-4 text-[13px] text-[var(--text-main)] font-bold">{row.value || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-[var(--bg-workspace)]/20 rounded-3xl border-2 border-dashed border-[var(--border-color)]">
                      <p className="text-[var(--text-dim)] font-black uppercase tracking-widest text-[11px] opacity-40">No technical data specified</p>
                    </div>
                  )}
                </div>
              );
            })()}
          {activeTab === 'features' && (
            <div className="space-y-4 ql-snow">
              {selectedProduct?.feature ? (
                <div 
                  className="text-[14px] text-[var(--text-main)] font-bold tracking-wide leading-relaxed rich-text-content ql-editor !p-0"
                  dangerouslySetInnerHTML={{ __html: selectedProduct.feature }}
                />
              ) : ( 
                <p className="text-center text-[var(--text-dim)] font-black uppercase tracking-widest text-[11px] py-10">No specific features listed</p> 
              )}
            </div>
          )}
          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(selectedProduct?.documents && selectedProduct.documents.length > 0 
                ? selectedProduct.documents 
                : (selectedProduct?.document_url ? [selectedProduct.document_url] : [])
              ).filter(Boolean).map((docItem, idx) => {
                const doc = typeof docItem === 'string' ? { url: docItem, name: docItem.split('/').pop() } : docItem;
                return (
                  <div key={idx} className="flex items-center gap-4 p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-workspace)]/30 hover:border-[var(--accent)] transition-all group">
                    <div className="p-3 bg-[var(--nav-hover)] rounded-xl text-[var(--accent)]"><FileText size={22} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-[var(--text-main)] truncate tracking-wider uppercase">
                        {doc.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-all">
                      <a 
                        href={getFullUrl(doc.url)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2.5 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                        title="View Document"
                      >
                        <Eye size={18} />
                      </a>
                      <a 
                        href={getFullUrl(doc.url)} 
                        download 
                        className="p-2.5 bg-[var(--accent)] text-white rounded-xl shadow-lg hover:scale-105 transition-all"
                        title="Download Document"
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === 'faqs' && (
            <div className="space-y-8 py-2">
              {selectedProduct?.faqs && selectedProduct.faqs.length > 0 ? (
                <div className="divide-y divide-[var(--border-color)]/60">
                  {selectedProduct.faqs.map((faq, idx) => (
                    <div key={idx} className="py-6 first:pt-0 last:pb-0 space-y-3">
                      <h4 className="text-[15px] font-bold text-[var(--text-main)] flex items-start gap-3">
                        <span className="text-[var(--accent)] font-black">Q.</span>
                        {faq.question}
                      </h4>
                      <div className="pl-8 flex items-start gap-3">
                        <span className="text-emerald-500 font-black text-[13px]">A.</span>
                        <p className="text-[14px] text-[var(--text-muted)] font-medium leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[var(--bg-workspace)]/10 rounded-2xl border border-dashed border-[var(--border-color)]">
                  <p className="text-[var(--text-dim)] font-black uppercase tracking-widest text-[10px] opacity-40">No technical FAQs available</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'bill of materials' && (
            <div className="space-y-6">
              {bomItems.length > 0 ? (
                <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
                  <div className="grid grid-cols-[150px_1fr_100px_1fr] bg-[var(--bg-workspace)]/50 border-b border-[var(--border-color)]">
                    <div className="px-6 py-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Type</div>
                    <div className="px-6 py-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Part Name</div>
                    <div className="px-6 py-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider text-right">Qty</div>
                    {/* <div className="px-6 py-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Notes</div> */}
                  </div>
                  {bomItems.map((item, idx) => {
                    const optionsList = bomOptionsMap[item.component_type] || [];
                    const matchedOption = optionsList.find(opt => String(opt.id) === String(item.component_id));
                    const partName = matchedOption ? matchedOption.name : `Unknown Part (ID: ${item.component_id})`;
                    
                    return (
                      <div key={idx} className="grid grid-cols-[150px_1fr_100px_1fr] border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-workspace)]/20 transition-colors">
                        <div className="px-6 py-4 text-[13px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
                          <span className="bg-[var(--bg-workspace)] px-2 py-1 rounded border border-[var(--border-color)]">{item.component_type}</span>
                        </div>
                        <div className="px-6 py-4 text-[14px] text-[var(--text-main)] font-bold flex items-center">{partName}</div>
                        <div className="px-6 py-4 text-[14px] text-[var(--accent)] font-black flex items-center justify-end">{item.quantity}</div>
                        {/* <div className="px-6 py-4 text-[13px] text-[var(--text-muted)] flex items-center">{item.notes || '—'}</div> */}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-[var(--bg-workspace)]/10 rounded-2xl border border-dashed border-[var(--border-color)]">
                  <p className="text-[var(--text-dim)] font-black uppercase tracking-widest text-[10px] opacity-40">No Bill of Materials associated with this product.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductProfilePage;
