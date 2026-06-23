import React, { useState } from 'react';
import { X, Calendar, FileText, Loader2, UploadCloud, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { applyForLeaveApi } from '../../../api/leaves';

const ApplyLeaveModal = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'Paid Leave',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: 'First Half',
    attachmentUrl: ''
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'isHalfDay') {
      setFormData({
        ...formData,
        isHalfDay: checked,
        endDate: checked ? formData.startDate : formData.endDate
      });
    } else if (name === 'startDate' && formData.isHalfDay) {
      setFormData({ ...formData, startDate: value, endDate: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadingDoc(true);
      // Simulate file upload
      setTimeout(() => {
        setFormData({ ...formData, attachmentUrl: 'mock_medical_certificate.pdf' });
        setUploadingDoc(false);
      }, 1000);
    }
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

    if (formData.leaveType !== 'Emergency Leave') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(formData.startDate);
      start.setHours(0, 0, 0, 0);
      
      const diffTime = start.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 3) {
        toast.error('Leaves (except Emergency) must be applied at least 3 days in advance');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await applyForLeaveApi(formData);
      if (res.data?.success) {
        toast.success('Leave request submitted successfully');
        onSuccess();
        onClose();
        setFormData({ leaveType: 'Paid Leave', startDate: '', endDate: '', reason: '', isHalfDay: false, halfDayType: 'First Half', attachmentUrl: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to submit leave request');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/10 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
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
              <option value="Paid Leave">Paid Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Complementary Leave">Complementary Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="LOP (Loss Of Pay)">LOP (Loss Of Pay)</option>
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
                  disabled={formData.isHalfDay}
                  className="w-full bg-[var(--input-bg)] border-[0.5px] border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[var(--accent)] transition-all text-[13px] text-[var(--text-main)] disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[var(--bg-workspace)] p-3 rounded-xl border border-[var(--border-color)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isHalfDay"
                checked={formData.isHalfDay}
                onChange={handleChange}
                className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] border-[var(--border-color)]"
              />
              <span className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-widest">Half Day Leave</span>
            </label>
            {formData.isHalfDay && (
              <select
                name="halfDayType"
                value={formData.halfDayType}
                onChange={handleChange}
                className="flex-1 bg-transparent border-none outline-none text-[13px] font-bold text-[var(--accent)]"
              >
                <option value="First Half">First Half (AM)</option>
                <option value="Second Half">Second Half (PM)</option>
              </select>
            )}
          </div>

          {formData.leaveType === 'Sick Leave' && (
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1">Medical Certificate</label>
              <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-4 text-center relative hover:bg-[var(--bg-workspace)] transition-colors cursor-pointer group">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,image/*" onChange={handleFileUpload} />
                {uploadingDoc ? (
                  <Loader2 className="animate-spin text-[var(--accent)] w-6 h-6 mx-auto mb-2" />
                ) : formData.attachmentUrl ? (
                  <CheckCircle2 className="text-emerald-500 w-6 h-6 mx-auto mb-2" />
                ) : (
                  <UploadCloud className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors w-6 h-6 mx-auto mb-2" />
                )}
                <p className="text-[12px] font-bold text-[var(--text-main)]">
                  {formData.attachmentUrl ? 'Certificate Uploaded' : 'Drop your medical certificate here'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">PDF, JPG or PNG. Max 5MB.</p>
              </div>
            </div>
          )}

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
