import React from 'react';
import { Box, Eye, Package, Pencil, Trash2 } from 'lucide-react';

const InventoryCard = ({
  item,
  title,
  category,
  description,
  date,
  imageSrc,
  code,
  stockQuantity = 0,
  onView,
  onEdit,
  onDelete,
  getImageSrc,
}) => {
  const resolvedImageSrc = getImageSrc ? getImageSrc(imageSrc) : imageSrc;

  return (
    <div className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div onClick={() => onView?.(item)} className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] block cursor-zoom-in group/img">
        {resolvedImageSrc ? (
          <img
            src={resolvedImageSrc}
            alt={title}
            className="w-full h-full object-contain p-6 group-hover/img:scale-110 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-dim)] opacity-20">
            <Box size={64} strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView?.(item);
            }}
            className="w-12 h-12 bg-[var(--accent)] rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0"
            title="View Details"
          >
            <Eye size={22} />
          </button>
        </div>
        <div className="absolute top-4 left-4">
          <span className="bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg text-[var(--accent)] shadow-sm">
            {code || 'N/A'}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">{category}</span>
          </div>
          <h3 className="text-[15px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300">
            {title}
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed line-clamp-2 opacity-70">
            {description || 'No detailed technical specifications provided for this inventory record.'}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 mt-4 border-t border-[var(--border-color)]/60">
          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-1 bg-[var(--accent)]/10 rounded-md">
              <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider">
                Qty: {stockQuantity ?? 0}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 transition-opacity">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="w-7 h-7 flex items-center justify-center bg-[var(--bg-workspace)] hover:bg-[var(--accent)] text-[var(--text-dim)] hover:text-white rounded-md transition-all shadow-sm"
                title="Edit"
              >
                <Pencil size={12} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
                className="w-7 h-7 flex items-center justify-center bg-[var(--bg-workspace)] hover:bg-rose-500 text-[var(--text-dim)] hover:text-white rounded-md transition-all shadow-sm"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InventoryCard);
