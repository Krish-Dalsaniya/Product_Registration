import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClaimsApi, createClaimApi, updateClaimStatusApi, fetchHREmployeesApi } from '../../../api/hr';
import { useAuth } from '../../../context/AuthContext';
import { FileText, Plus, Search, Check, X, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../components/shared/Modal';
import EmployeeClaimsDashboard from '../components/EmployeeClaimsDashboard';

const Claims = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  
  const canManage = hasPermission('hr', 'edit', 'payrolls_claims');

  const { data: claimsRes, isLoading: isLoadingClaims } = useQuery({
    queryKey: ['hr_claims'],
    queryFn: () => fetchClaimsApi().then(res => res.data.data),
  });
  const claims = claimsRes || [];

  const { data: employeesRes } = useQuery({
    queryKey: ['hr_employees_list'],
    queryFn: () => fetchHREmployeesApi().then(res => res.data.data),
  });
  const employees = employeesRes || [];

  const claimMutation = useMutation({
    mutationFn: createClaimApi,
    onSuccess: () => {
      queryClient.invalidateQueries(['hr_claims']);
      setIsClaimModalOpen(false);
      toast.success('Claim submitted successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to submit claim')
  });

  const updateClaimStatus = async (id, status) => {
    try {
      await updateClaimStatusApi(id, { status, remarks: '' });
      toast.success(`Claim ${status.toLowerCase()}`);
      queryClient.invalidateQueries(['hr_claims']);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    claimMutation.mutate(formData);
  };

  const filteredClaims = claims.filter(c => 
    c.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.claim_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (!canManage) {
    const myClaims = claims.filter(c => c.employee_id === user?.employee_id);
    return <EmployeeClaimsDashboard claims={myClaims} user={user} />;
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)]">
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 mt-2 px-2">
          <div className="flex-1">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
                <FileText size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
                  Expense Claims
                </h1>
                <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
                  Manage employee expense reimbursements
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" size={16} />
              <input
                type="text"
                placeholder="Search by employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-[12px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all font-bold placeholder-[var(--text-dim)]"
              />
            </div>
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="btn-primary shadow-lg px-6 py-2.5 group flex items-center gap-2 rounded-xl h-fit whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-[12px] font-black uppercase tracking-widest hidden sm:inline">New Claim</span>
            </button>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-workspace)]">
                <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Date</th>
                <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Employee</th>
                <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Claim Type</th>
                <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Amount</th>
                <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Status</th>
                {canManage && <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {isLoadingClaims ? (
                <tr><td colSpan="6" className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[var(--accent)]" /></td></tr>
              ) : filteredClaims.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-sm font-bold text-[var(--text-muted)]">No claims found.</td></tr>
              ) : (
                filteredClaims.map((claim, index) => (
                  <tr key={claim.claim_id} className={`group transition-colors ${index % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700/50' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                    <td className="px-3 py-1 text-[12px] font-medium text-[var(--text-muted)]">
                      {new Date(claim.submitted_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-1">
                      <div className="text-[13px] font-bold text-[var(--text-main)]">{claim.employee_name}</div>
                      <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">{claim.emp_code}</div>
                    </td>
                    <td className="px-3 py-1">
                      <div className="text-[12px] font-bold text-[var(--text-main)]">{claim.claim_type}</div>
                      {claim.receipt_url && (
                        <a href={claim.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1 mt-1 font-bold">
                          <ExternalLink size={10} /> View Receipt
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-1 text-[13px] font-black text-[var(--text-main)]">
                      ₹{parseFloat(claim.amount).toLocaleString()}
                    </td>
                    <td className="px-3 py-1 text-center">
                      <StatusBadge status={claim.status} />
                    </td>
                    {canManage && (
                      <td className="px-3 py-1 text-right">
                        {claim.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => updateClaimStatus(claim.claim_id, 'Approved')} className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded transition-colors" title="Approve">
                              <Check size={16} />
                            </button>
                            <button onClick={() => updateClaimStatus(claim.claim_id, 'Rejected')} className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded transition-colors" title="Reject">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest font-bold">Processed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} title="Submit Expense Claim">
        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 ml-1">Employee</label>
            <select name="employee_id" required className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]">
              <option value="">Select Employee</option>
              {employees.map(e => (
                <option key={e.employee_id} value={e.employee_id}>{e.full_name} ({e.emp_code})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 ml-1">Claim Type</label>
              <select name="claim_type" required className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]">
                <option value="Travel">Travel</option>
                <option value="Medical">Medical</option>
                <option value="Meals">Meals</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 ml-1">Amount (₹)</label>
              <input type="number" step="0.01" name="amount" required className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 ml-1">Description</label>
            <textarea name="description" rows="3" required className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)] resize-none" placeholder="Provide details about the expense..."></textarea>
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 ml-1">Receipt Attachment</label>
            <input type="file" name="receipt_file" accept=".jpg,.jpeg,.png,.pdf" className="w-full text-[12px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:uppercase file:tracking-widest file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent)]/90" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsClaimModalOpen(false)} className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)]">Cancel</button>
            <button type="submit" disabled={claimMutation.isLoading} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-[var(--accent)]/20 disabled:opacity-70">
              {claimMutation.isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Submit Claim'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Claims;
