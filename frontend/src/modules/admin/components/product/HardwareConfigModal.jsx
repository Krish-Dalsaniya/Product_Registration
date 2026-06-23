import React from 'react';
import { Fuel, Droplets, Flame, Droplet, LayoutGrid, Box, Activity, Check, Tag } from 'lucide-react';
import Modal from '../../../../components/shared/Modal';

const HardwareConfigModal = ({ 
  isOpen, 
  onClose, 
  watchedSubCategory, 
  modalMode, 
  register, 
  watch 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hardware Configuration"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-8 p-2">
        <div className="flex items-center gap-4 p-5 bg-[var(--nav-hover)] rounded-2xl border border-[var(--border-color)]">
           <div className="w-12 h-12 bg-[var(--accent)] rounded-xl flex items-center justify-center text-white shadow-lg">
              <Fuel size={24} strokeWidth={2.5} />
           </div>
           <div>
              <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight uppercase leading-none">Dispenser Specifications</h3>
              <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1.5 uppercase tracking-[0.2em] opacity-70">
                Select hardware options for {watchedSubCategory || 'Dispenser'}
              </p>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Fuel Variant */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Tag size={14} strokeWidth={3} />
              <label className="text-[11px] font-black uppercase tracking-widest">Fuel Variant</label>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'Def', label: 'DEF', icon: <Droplets size={16} /> },
                { id: 'Petrol', label: 'Petrol', icon: <Flame size={16} /> },
                { id: 'Diesel', label: 'Diesel', icon: <Fuel size={16} /> },
                { id: 'Oil', label: 'Oil', icon: <Droplet size={16} /> }
              ].map(type => (
                <label key={type.id} className="relative cursor-pointer group">
                  <input type="checkbox" value={type.id} {...register('fuel_types')} disabled={modalMode === 'view'} className="peer sr-only" />
                  <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all peer-checked:border-[var(--accent)] peer-checked:bg-[var(--nav-hover)] group-hover:border-[var(--accent)]/50 peer-checked:[&_svg]:scale-100 peer-checked:[&_.check-box]:bg-[var(--accent)] peer-checked:[&_.check-box]:border-[var(--accent)]">
                    <div className="text-[var(--text-dim)] peer-checked:text-[var(--accent)] transition-colors">{type.icon}</div>
                    <span className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-tighter">{type.label}</span>
                    <div className="check-box ml-auto w-6 h-6 rounded-md border-2 border-[var(--border-color)] bg-[var(--bg-workspace)] transition-all flex items-center justify-center">
                      <Check size={14} className="text-white scale-0 transition-transform" strokeWidth={4.5} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dispenser Type */}
          <div className="space-y-4 border-l border-[var(--border-color)] pl-6">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <LayoutGrid size={14} strokeWidth={3} />
              <label className="text-[11px] font-black uppercase tracking-widest">Dispenser Type</label>
            </div>
            <div className="space-y-3">
              {['Mini', 'Tower', 'Storage', 'MultiProduct'].map(type => (
                <label key={type} className="relative cursor-pointer block group">
                  <input type="radio" value={type} {...register('dispenser_type')} disabled={modalMode === 'view'} className="peer sr-only" />
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all peer-checked:border-[var(--accent)] peer-checked:bg-[var(--nav-hover)] group-hover:border-[var(--accent)]/50 peer-checked:[&_.dot]:scale-100">
                    <span className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-tight">{type}</span>
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] peer-checked:border-[var(--accent)] flex items-center justify-center transition-all">
                      <div className="dot w-2.5 h-2.5 rounded-full bg-[var(--accent)] scale-0 transition-transform" />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Nozzle Count */}
          <div className="space-y-4 border-l border-[var(--border-color)] pl-6">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Box size={14} strokeWidth={3} />
              <label className="text-[11px] font-black uppercase tracking-widest">Nozzle Count</label>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].filter(num => {
                const fuelCount = watch('fuel_types')?.length || 0;
                if (fuelCount > 1 && num === 1) return false;
                if (fuelCount > 2 && num === 2) return false;
                return true;
              }).map(num => (
                <label key={num} className="relative cursor-pointer block group">
                  <input type="radio" value={`${num} Nozzle`} {...register('nozzles')} disabled={modalMode === 'view'} className="peer sr-only" />
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all peer-checked:border-[var(--accent)] peer-checked:bg-[var(--nav-hover)] group-hover:border-[var(--accent)]/50 peer-checked:[&_.dot]:scale-100">
                    <span className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-tight">{num} Nozzle</span>
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] peer-checked:border-[var(--accent)] flex items-center justify-center transition-all">
                      <div className="dot w-2.5 h-2.5 rounded-full bg-[var(--accent)] scale-0 transition-transform" />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dispensing Flow */}
          <div className="space-y-4 border-l border-[var(--border-color)] pl-6">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Activity size={14} strokeWidth={3} />
              <label className="text-[11px] font-black uppercase tracking-widest">Dispensing Flow</label>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].filter(num => {
                const nozzleValue = watch('nozzles');
                if (!nozzleValue) return true; // Show all if no nozzle selected yet
                const nozzleCount = parseInt(nozzleValue) || 0;
                return num <= nozzleCount;
              }).map(num => (
                <label key={num} className="relative cursor-pointer block group">
                  <input type="radio" value={`${num} dispensing`} {...register('dispensing')} disabled={modalMode === 'view'} className="peer sr-only" />
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-all peer-checked:border-[var(--accent)] peer-checked:bg-[var(--nav-hover)] group-hover:border-[var(--accent)]/50 peer-checked:[&_.dot]:scale-100">
                    <span className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-tight">{num} dispensing</span>
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] peer-checked:border-[var(--accent)] flex items-center justify-center transition-all">
                      <div className="dot w-2.5 h-2.5 rounded-full bg-[var(--accent)] scale-0 transition-transform" />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button type="button" onClick={onClose} className="btn-primary w-full py-4 shadow-lg uppercase tracking-widest text-[12px]">
            {modalMode === 'view' ? 'Close Specifications' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default HardwareConfigModal;
