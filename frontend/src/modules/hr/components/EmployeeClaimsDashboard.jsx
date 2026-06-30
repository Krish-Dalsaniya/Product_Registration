import React, { useState } from 'react';
import { FileText, Plus, Loader2 } from 'lucide-react';
import Modal from '../../../components/shared/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClaimApi } from '../../../api/hr';
import toast from 'react-hot-toast';

const EmployeeClaimsDashboard = ({ claims, user }) => {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: createClaimApi,
    onSuccess: () => {
      queryClient.invalidateQueries(['hr_claims']);
      setIsClaimModalOpen(false);
      toast.success('Claim submitted successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to submit claim')
  });

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    // Auto-inject employee_id
    formData.append('employee_id', user.employee_id);
    claimMutation.mutate(formData);
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Approved': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'Rejected': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      'Paid': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles['Pending']}`}>
        {status}
      </span>
    );
  };

  // Summaries
  const pendingAmount = claims.filter(c => c.status === 'Pending').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  const approvedAmount = claims.filter(c => c.status === 'Approved' || c.status === 'Paid').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <FileText size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              My Claims
            </h1>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-1.5">View your expense claims and reimbursements</p>
          </div>
        </div>
        <button
          onClick={() => setIsClaimModalOpen(true)}
          className="btn-primary shadow-lg px-6 py-3 group flex items-center gap-2 rounded-xl h-fit w-full md:w-auto justify-center"
        >
          <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[13px] font-black uppercase tracking-widest">New Claim</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--accent)] transition-all">
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Pending Amount</p>
          <p className="text-3xl font-black text-amber-500">₹{pendingAmount.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--accent)] transition-all">
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Approved/Paid Amount</p>
          <p className="text-3xl font-black text-emerald-500">₹{approvedAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden">
        {claims.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">No claims found. Request a new claim.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-workspace)] border-b border-[var(--border-color)]">
                  <th className="px-6 py-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {claims.map((claim) => (
                  <tr key={claim.claim_id} className="hover:bg-[var(--bg-workspace)]/50 transition-colors">
                    <td className="px-6 py-4 text-[13px] font-medium text-[var(--text-main)]">
                      {new Date(claim.claim_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-[var(--text-secondary)]">
                      {claim.claim_type}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-[var(--text-main)]">
                      ₹{parseFloat(claim.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={claim.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} title="Submit Expense Claim" size="md">
        <form onSubmit={handleClaimSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Claim Type</label>
              <select 
                name="claim_type" 
                className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2.5 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium appearance-none"
                required
              >
                <option value="Travel">Travel</option>
                <option value="Food">Food</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Medical">Medical</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Amount</label>
                <input 
                  type="number" 
                  name="amount" 
                  step="0.01" 
                  required
                  placeholder="0.00"
                  className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2.5 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Date</label>
                <input 
                  type="date" 
                  name="claim_date" 
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2.5 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Description / Reason</label>
              <textarea 
                name="reason" 
                rows="3" 
                required
                className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium resize-none"
                placeholder="Briefly describe the expense..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Receipt Document (Optional)</label>
              <input 
                type="file" 
                name="document" 
                className="w-full text-[13px] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)] cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setIsClaimModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-xl text-[13px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={claimMutation.isLoading}
              className="flex-1 btn-primary py-3 px-4 rounded-xl text-[13px] flex items-center justify-center gap-2"
            >
              {claimMutation.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Submit Claim
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeClaimsDashboard;
