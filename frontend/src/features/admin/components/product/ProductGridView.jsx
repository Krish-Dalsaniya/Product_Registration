import React from 'react';
import { Box, Eye, Pencil, Trash2 } from 'lucide-react';

const ProductGridView = ({ products, onView, onEdit, onDelete, getFullUrl, setLightboxData }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
      {products.map((product) => (
        <div key={product.product_id} className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl">
          <div onClick={() => onView(product)} className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] block cursor-zoom-in group/img">
            {product.image_url ? (
              <img 
                src={getFullUrl(product.image_url)} 
                alt={product.product_name} 
                className="w-full h-full object-contain p-6 group-hover/img:scale-110 transition-transform duration-700 ease-out cursor-pointer hover:scale-105" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setLightboxData({ 
                    isOpen: true, 
                    images: product.images && product.images.length > 0 ? product.images : [product.image_url], 
                    initialIndex: 0 
                  }); 
                }} 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-dim)] opacity-20">
                <Box size={64} strokeWidth={1} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onView(product); }} 
                className="w-12 h-12 bg-[var(--accent)] rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0" 
                title="View Product"
              >
                <Eye size={22} />
              </button>
            </div>
            <div className="absolute top-4 left-4">
              <span className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-color)] text-[10px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-full text-[var(--accent)] shadow-sm">
                {product.category || 'Standard'}
              </span>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex-1 space-y-3">
              <h3 className="text-[15px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300">
                {product.product_name}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed line-clamp-2">
                {(product.description || 'No detailed description available.').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')}
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1.5 rounded-full">
                <Box size={14} className="text-[var(--accent)]" />
                <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">
                  {product.stock_quantity || 0} UNITS
                </span>
              </div>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(product); }} 
                    className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg transition-all" 
                    title="Edit Product"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(product); }} 
                    className="p-2 text-rose-500/40 hover:text-rose-500 rounded-lg transition-all" 
                    title="Delete Product"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGridView;
