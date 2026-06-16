import React, { useState } from 'react';
import { X, Calendar, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { applyForLeaveApi } from '../../../api/leaves';

const ApplyLeaveModal = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'PTO',
    startDate: '',
    endDate: '',
    reason: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await applyForLeaveApi(formData);
      if (res.data?.success) {
        toast.success('Leave request submitted successfully');
        onSuccess();
        onClose();
        setFormData({ leaveType: 'PTO', startDate: '', endDate: '', reason: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to submit leave request');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] bg-[var(--nav-hover)] rounded-t-2xl">
          <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wider">Apply for Leave</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Leave Type</label>
            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] font-bold text-[var(--text-main)]"
            >
              <option value="PTO">PTO</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Personal">Personal</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="date" 
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)]" 
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                  type="date" 
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)]" 
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Reason (Optional)</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-[var(--text-muted)] w-4 h-4" />
              <textarea 
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows="3"
                className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] resize-none"
                placeholder="Brief reason for your leave..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-[12px] text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-2.5 px-6 shadow-md flex items-center gap-2 text-[12px] font-black uppercase tracking-widest"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeaveModal;
