import React, { useState } from 'react';
import { Banknote, Plus, Loader2 } from 'lucide-react';
import Modal from '../../../components/shared/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAdvanceApi } from '../../../api/hr';
import toast from 'react-hot-toast';

const EmployeeAdvancesDashboard = ({ advances, user }) => {
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const advanceMutation = useMutation({
    mutationFn: createAdvanceApi,
    onSuccess: () => {
      queryClient.invalidateQueries(['hr_advances']);
      setIsAdvanceModalOpen(false);
      toast.success('Advance request submitted successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to submit advance request')
  });

  const handleAdvanceSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    advanceMutation.mutate({
      employee_id: user.employee_id,
      amount: formData.get('amount'),
      reason: formData.get('reason'),
      repayment_term_months: formData.get('repayment_term_months'),
      monthly_deduction: formData.get('monthly_deduction')
    });
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Approved': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'Rejected': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      'Disbursed': 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles['Pending']}`}>
        {status}
      </span>
    );
  };

  const calculateMonthly = (e) => {
    const amount = parseFloat(document.getElementById('emp_advance_amount')?.value || 0);
    const months = parseInt(e.target.value || 1);
    const deduction = document.getElementById('emp_advance_deduction');
    if (amount && months && deduction) {
      deduction.value = (amount / months).toFixed(2);
    }
  };

  const pendingAmount = advances.filter(a => a.status === 'Pending').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  const approvedAmount = advances.filter(a => a.status === 'Approved' || a.status === 'Disbursed').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <Banknote size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              Salary Advances
            </h1>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-1.5">View and request salary advances</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdvanceModalOpen(true)}
          className="btn-primary shadow-lg px-6 py-3 group flex items-center gap-2 rounded-xl h-fit w-full md:w-auto justify-center"
        >
          <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[13px] font-black uppercase tracking-widest">Request Advance</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--accent)] transition-all">
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Pending Requests</p>
          <p className="text-3xl font-black text-amber-500">₹{pendingAmount.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--accent)] transition-all">
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Approved/Disbursed</p>
          <p className="text-3xl font-black text-emerald-500">₹{approvedAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden">
        {advances.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">No advance requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-workspace)] border-b border-[var(--border-color)]">
                  <th className="px-3 py-1.5 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                  <th className="px-3 py-1.5 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Reason</th>
                  <th className="px-3 py-1.5 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-1.5 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Terms</th>
                  <th className="px-3 py-1.5 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {advances.map((advance, index) => (
                  <tr key={advance.advance_id} className={`transition-colors ${index % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700/50' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                    <td className="px-3 py-1 text-[13px] font-medium text-[var(--text-main)]">
                      {new Date(advance.request_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-1 text-[13px] font-medium text-[var(--text-secondary)] max-w-xs truncate">
                      {advance.reason}
                    </td>
                    <td className="px-3 py-1 text-[13px] font-bold text-[var(--text-main)]">
                      ₹{parseFloat(advance.amount).toLocaleString()}
                    </td>
                    <td className="px-3 py-1">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[12px] font-bold text-[var(--text-main)]">{advance.repayment_term_months} Months</span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">₹{parseFloat(advance.monthly_deduction).toLocaleString()}/mo</span>
                      </div>
                    </td>
                    <td className="px-3 py-1">
                      <StatusBadge status={advance.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)} title="Request Salary Advance" size="md">
        <form onSubmit={handleAdvanceSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Requested Amount</label>
              <input 
                type="number" 
                id="emp_advance_amount"
                name="amount" 
                step="1" 
                required
                placeholder="₹0"
                onChange={() => calculateMonthly({ target: { value: document.getElementById('emp_advance_term')?.value || 1 } })}
                className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2.5 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Repayment Term (Months)</label>
                <input 
                  type="number" 
                  id="emp_advance_term"
                  name="repayment_term_months" 
                  min="1"
                  max="12"
                  required
                  defaultValue="1"
                  onChange={calculateMonthly}
                  className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2.5 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Monthly Deduction</label>
                <input 
                  type="number" 
                  id="emp_advance_deduction"
                  name="monthly_deduction" 
                  readOnly
                  className="w-full bg-slate-50 border border-[var(--border-color)] rounded-xl py-2.5 px-4 outline-none text-[13px] font-bold text-[var(--text-secondary)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Reason for Advance</label>
              <textarea 
                name="reason" 
                rows="3" 
                required
                className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium resize-none"
                placeholder="Explain why you need this advance..."
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setIsAdvanceModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-xl text-[13px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={advanceMutation.isLoading}
              className="flex-1 btn-primary py-3 px-4 rounded-xl text-[13px] flex items-center justify-center gap-2"
            >
              {advanceMutation.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeAdvancesDashboard;
