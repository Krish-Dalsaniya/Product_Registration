import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Banknote, Calculator, Save, User, FileText, CheckCircle, Trash2, Download, Mail, Search, AlertTriangle } from 'lucide-react';
import DataTable from '../../../components/shared/DataTable';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';

const PayrollManagement = () => {
  const [activeTab, setActiveTab] = useState('structures'); // 'structures', 'run', 'history'
  
  // Structures state
  const [structures, setStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [editStructure, setEditStructure] = useState(null);

  // Run payroll state
  const [payrolls, setPayrolls] = useState([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeTab === 'structures') fetchStructures();
    if (activeTab === 'run' || activeTab === 'history') fetchPayrolls(runMonth, runYear);
  }, [activeTab, runMonth, runYear]);

  const fetchStructures = async () => {
    try {
      setLoadingStructures(true);
      const res = await api.get('/hr/payrolls/salary-structures');
      setStructures(res.data.data);
    } catch (err) {
      toast.error('Failed to load salary structures');
    } finally {
      setLoadingStructures(false);
    }
  };

  const fetchPayrolls = async (month, year) => {
    try {
      setLoadingPayrolls(true);
      const res = await api.get(`/hr/payrolls?month=${month}&year=${year}`);
      setPayrolls(res.data.data);
    } catch (err) {
      toast.error('Failed to load payrolls');
    } finally {
      setLoadingPayrolls(false);
    }
  };

  const handleUpdateStructure = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/hr/payrolls/salary-structures/${editStructure.employee_id}`, editStructure);
      toast.success('Salary structure updated');
      setEditStructure(null);
      fetchStructures();
    } catch (err) {
      toast.error('Failed to update salary structure');
    }
  };

  const handleBasicChange = (val) => {
    const basic = parseFloat(val) || 0;
    setEditStructure(prev => ({
      ...prev,
      basic_salary: val,
      hra: (basic * 0.40).toFixed(2),
      pf_deduction: (basic * 0.12).toFixed(2),
      professional_tax: 200
    }));
  };

  const handleGeneratePayroll = async () => {
    try {
      await api.post('/hr/payrolls/generate', { month: runMonth, year: runYear });
      toast.success('Payroll generated successfully');
      fetchPayrolls(runMonth, runYear);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate payroll');
    }
  };

  const handleDeleteDraft = async () => {
    Swal.fire({
      title: 'Delete Draft?',
      text: 'Are you sure you want to delete the un-processed drafts for this month?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Send delete request in body (axios specific)
          await api.delete('/hr/payrolls/generate', { data: { month: runMonth, year: runYear } });
          toast.success('Drafts deleted successfully');
          fetchPayrolls(runMonth, runYear);
        } catch (err) {
          toast.error('Failed to delete drafts');
        }
      }
    });
  };

  const handleProcessPayroll = async () => {
    const drafts = payrolls.filter(p => p.status === 'Draft');
    if (!drafts.length) return toast.error('No draft payrolls to process');

    const zeros = drafts.filter(p => parseFloat(p.net_salary) === 0);
    
    if (zeros.length > 0) {
      const confirm = await Swal.fire({
        title: 'Warning: ₹0.00 Salaries Detected',
        html: `The following employees have a net salary of ₹0.00:<br/><br/>
               <div style="max-height: 150px; overflow-y: auto; text-align: left; background: #1e1e1e; padding: 10px; border-radius: 8px;">
                 ${zeros.map(z => `<b>${z.employee_name}</b> (${z.emp_code})`).join('<br/>')}
               </div><br/>
               Do you want to process anyway?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Process Anyway',
        cancelButtonText: 'No, Cancel',
        confirmButtonColor: 'var(--accent)'
      });
      if (!confirm.isConfirmed) return;
    }

    Swal.fire({
      title: 'Process Payroll?',
      text: `Are you sure you want to finalize ${drafts.length} payslip(s)? This cannot be undone.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Finalize',
      confirmButtonColor: '#10b981'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.post('/hr/payrolls/process', { payroll_ids: drafts.map(d => d.payroll_id) });
          toast.success('Payrolls processed successfully');
          fetchPayrolls(runMonth, runYear);
        } catch (err) {
          toast.error('Failed to process payrolls');
        }
      }
    });
  };

  const handleDownloadPDF = (payslip) => {
    import('../../../utils/pdfTemplate').then(({ getPdfHtml }) => {
        const element = document.createElement('div');
        element.innerHTML = getPdfHtml(payslip);
        html2pdf().from(element).set({
            margin: 0,
            filename: `Payslip_${payslip.employee_name.replace(/\s+/g, '_')}_${payslip.month}_${payslip.year}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        }).save();
    });
  };

  const handleEmailPayslip = async (payslip) => {
    Swal.fire({
      title: 'Email Payslip?',
      text: `Send payslip to ${payslip.employee_name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Send',
      confirmButtonColor: 'var(--accent)'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Sending Email...',
          text: 'Please wait while the payslip is being emailed.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        try {
          await api.post('/hr/payrolls/email', { payroll_id: payslip.payroll_id });
          Swal.fire({
            title: 'Success!',
            text: 'Email sent successfully to ' + payslip.employee_name,
            icon: 'success',
            confirmButtonColor: 'var(--accent)'
          });
        } catch (err) {
          Swal.fire({
            title: 'Error!',
            text: err.response?.data?.message || 'Failed to send email',
            icon: 'error',
            confirmButtonColor: 'var(--accent)'
          });
        }
      }
    });
  };

  // Calculations
  const calcGross = (row) => parseFloat(row.basic_salary || 0) + parseFloat(row.hra || 0) + parseFloat(row.special_allowance || 0) + parseFloat(row.travel_allowance || 0) + parseFloat(row.medical_allowance || 0);
  const calcDeductions = (row) => parseFloat(row.pf_deduction || 0) + parseFloat(row.professional_tax || 0) + parseFloat(row.tds || 0);
  const calcNet = (row) => calcGross(row) - calcDeductions(row);

  const structureCols = [
    { key: 'employee', label: 'Employee', render: row => <div className="font-bold">{row.employee_name} <br/><span className="text-[10px] text-[var(--text-muted)] font-normal">{row.emp_code}</span></div> },
    { key: 'basic_salary', label: 'Basic Salary', render: row => `₹${parseFloat(row.basic_salary || 0).toFixed(2)}` },
    { key: 'gross', label: 'Gross Pay', render: row => <span className="text-emerald-500 font-bold">`₹${calcGross(row).toFixed(2)}`</span> },
    { key: 'deductions', label: 'Deductions', render: row => <span className="text-rose-500 font-bold">`₹${calcDeductions(row).toFixed(2)}`</span> },
    { key: 'net_total', label: 'Net Total', render: row => {
        const net = calcNet(row);
        return (
          <div className="flex items-center gap-2">
            <span className={`font-black text-[14px] ${net === 0 ? 'text-rose-500' : 'text-[var(--accent)]'}`}>₹{net.toFixed(2)}</span>
            {net === 0 && <AlertTriangle size={14} className="text-rose-500" title="Net Salary is zero" />}
          </div>
        );
      } 
    }
  ];

  const payrollCols = [
    { key: 'employee', label: 'Employee', render: row => <div className="font-bold">{row.employee_name} <br/><span className="text-[10px] text-[var(--text-muted)] font-normal">{row.emp_code}</span></div> },
    { key: 'month_year', label: 'Month/Year', render: row => `${row.month}/${row.year}` },
    { key: 'gross', label: 'Gross', render: row => <span className="text-emerald-500 font-bold">₹{calcGross(row).toFixed(2)}</span> },
    { key: 'deductions', label: 'Deductions', render: row => {
        const gross = calcGross(row);
        const ded = calcDeductions(row);
        const isHigh = gross > 0 && (ded / gross) > 0.4;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isHigh ? 'text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded' : 'text-rose-500'}`} title={isHigh ? "Deductions exceed 40% of Gross" : ""}>
              ₹{ded.toFixed(2)}
            </span>
            {isHigh && <AlertTriangle size={14} className="text-rose-500" />}
          </div>
        );
      } 
    },
    { key: 'net_salary', label: 'Net Salary', render: row => <span className="font-black text-[var(--text-main)] text-[15px]">₹{parseFloat(row.net_salary || 0).toFixed(2)}</span> },
    { 
      key: 'status',
      label: 'Status', 
      render: row => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${row.status === 'Processed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
          {row.status}
        </span>
      )
    }
  ];

  // Actions for history tab
  const historyCols = [
    ...payrollCols,
    {
      key: 'actions',
      label: 'Actions',
      render: row => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => handleDownloadPDF(row)} className="p-2 bg-[var(--bg-workspace)] hover:bg-[var(--accent)] hover:text-white rounded-lg text-[var(--text-main)] transition-all border border-[var(--border-color)] hover:border-[var(--accent)]" title="Download PDF">
            <Download size={16} />
          </button>
          <button onClick={() => handleEmailPayslip(row)} className="p-2 bg-[var(--bg-workspace)] hover:bg-[var(--accent)] hover:text-white rounded-lg text-[var(--text-main)] transition-all border border-[var(--border-color)] hover:border-[var(--accent)]" title="Email Payslip">
            <Mail size={16} />
          </button>
        </div>
      )
    }
  ];

  // History filtering
  const processedPayrolls = payrolls.filter(p => p.status === 'Processed');
  const filteredHistory = processedPayrolls.filter(p => p.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.emp_code.toLowerCase().includes(searchQuery.toLowerCase()));

  // Summary logic
  const totalGross = processedPayrolls.reduce((sum, p) => sum + calcGross(p), 0);
  const totalDed = processedPayrolls.reduce((sum, p) => sum + calcDeductions(p), 0);
  const totalNet = processedPayrolls.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
            <Banknote className="text-[var(--accent)]" size={28} strokeWidth={2.5} />
            Payroll Management
          </h1>
          <p className="text-[var(--text-muted)] text-[12px] uppercase tracking-widest font-bold mt-1">
            Manage employee salaries and generate payslips
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl w-fit">
        {[
          { id: 'structures', label: 'Salary Structures', icon: Calculator },
          { id: 'run', label: 'Run Payroll', icon: Save },
          { id: 'history', label: 'Payslips & History', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id 
                ? 'bg-[var(--accent)] text-white shadow-lg' 
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] hover:text-[var(--text-main)]'
            }`}
          >
            <tab.icon size={16} strokeWidth={2.5} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm">
        {activeTab === 'structures' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-widest">Employee Salary Structures</h2>
            </div>
            {loadingStructures ? (
              <div className="py-10 text-center text-[var(--text-muted)] text-sm font-bold animate-pulse">Loading structures...</div>
            ) : (
              <DataTable columns={structureCols} data={structures} rowKey="employee_id" onEdit={setEditStructure} />
            )}
          </div>
        )}

        {activeTab === 'run' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
              <div className="flex gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Month</label>
                  <select value={runMonth} onChange={e => setRunMonth(e.target.value)} className="w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[12px] font-bold text-[var(--text-main)] outline-none">
                    {Array.from({length: 12}).map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Year</label>
                  <select value={runYear} onChange={e => setRunYear(e.target.value)} className="w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[12px] font-bold text-[var(--text-main)] outline-none">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDeleteDraft} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--bg-card)] border border-rose-500/30 hover:border-rose-500 text-[12px] font-bold text-rose-500 uppercase tracking-widest transition-all">
                  <Trash2 size={16} />
                  Delete Draft
                </button>
                <button onClick={handleGeneratePayroll} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[12px] font-bold text-[var(--text-main)] uppercase tracking-widest transition-all">
                  <Calculator size={16} className="text-[var(--accent)]" />
                  Generate Draft
                </button>
                <button onClick={handleProcessPayroll} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 text-[12px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-[var(--accent)]/20">
                  <CheckCircle size={16} />
                  Process Payroll
                </button>
              </div>
            </div>

            {loadingPayrolls ? (
              <div className="py-10 text-center text-[var(--text-muted)] text-sm font-bold animate-pulse">Loading payrolls...</div>
            ) : (
              <DataTable columns={payrollCols} data={payrolls.filter(p => p.status === 'Draft')} rowKey="payroll_id" onView={() => {}} />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            
            {/* Payroll Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Processed Employees</p>
                <p className="text-2xl font-black text-[var(--text-main)]">{processedPayrolls.length}</p>
              </div>
              <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Gross Payout</p>
                <p className="text-2xl font-black text-emerald-500">₹{totalGross.toFixed(2)}</p>
              </div>
              <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Deductions</p>
                <p className="text-2xl font-black text-rose-500">₹{totalDed.toFixed(2)}</p>
              </div>
              <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] shadow-[0_4px_15px_-3px_rgba(var(--accent-rgb),0.1)] border-[var(--accent)]">
                <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mb-1">Total Net Payout</p>
                <p className="text-2xl font-black text-[var(--text-main)]">₹{totalNet.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] gap-4">
              <div className="flex gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Month</label>
                  <select value={runMonth} onChange={e => setRunMonth(e.target.value)} className="w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[12px] font-bold text-[var(--text-main)] outline-none">
                    {Array.from({length: 12}).map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Year</label>
                  <select value={runYear} onChange={e => setRunYear(e.target.value)} className="w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[12px] font-bold text-[var(--text-main)] outline-none">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input 
                  type="text" 
                  placeholder="Search employee..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>
            
            {loadingPayrolls ? (
              <div className="py-10 text-center text-[var(--text-muted)] text-sm font-bold animate-pulse">Loading payrolls...</div>
            ) : (
              // We pass the full columns definition, since historyCols has custom actions
              <DataTable columns={historyCols} data={filteredHistory} rowKey="payroll_id" />
            )}
          </div>
        )}
      </div>

      {editStructure && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditStructure(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-3xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-[var(--border-color)] pb-4">
              <User size={20} className="text-[var(--accent)]" />
              Detailed Salary Structure: {editStructure.employee_name}
            </h2>
            
            <form onSubmit={handleUpdateStructure} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Earnings Column */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-[var(--border-color)] pb-2">Earnings</h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Basic Salary</label>
                    <input type="number" step="0.01" value={editStructure.basic_salary} onChange={e => handleBasicChange(e.target.value)} className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">HRA (Auto 40% of Basic)</label>
                    <input type="number" step="0.01" value={editStructure.hra} onChange={e => setEditStructure({...editStructure, hra: e.target.value})} className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Special Allowance</label>
                    <input type="number" step="0.01" value={editStructure.special_allowance} onChange={e => setEditStructure({...editStructure, special_allowance: e.target.value})} className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Travel Allowance</label>
                    <input type="number" step="0.01" value={editStructure.travel_allowance} onChange={e => setEditStructure({...editStructure, travel_allowance: e.target.value})} className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Medical Allowance</label>
                    <input type="number" step="0.01" value={editStructure.medical_allowance} onChange={e => setEditStructure({...editStructure, medical_allowance: e.target.value})} className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" />
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-rose-500 uppercase tracking-widest border-b border-[var(--border-color)] pb-2">Deductions</h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">PF Deduction (Auto 12% of Basic)</label>
                    <input type="number" step="0.01" value={editStructure.pf_deduction} onChange={e => setEditStructure({...editStructure, pf_deduction: e.target.value})} className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Professional Tax (Fixed)</label>
                    <input type="number" step="0.01" value={editStructure.professional_tax} onChange={e => setEditStructure({...editStructure, professional_tax: e.target.value})} className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">TDS</label>
                    <input type="number" step="0.01" value={editStructure.tds} onChange={e => setEditStructure({...editStructure, tds: e.target.value})} className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[12px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)]" />
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] mt-6">
                <div className="flex justify-between items-center font-black">
                  <span className="text-[12px] text-[var(--text-muted)] uppercase tracking-widest">Net Salary</span>
                  <span className={`text-[20px] ${calcNet(editStructure) === 0 ? 'text-rose-500' : 'text-[var(--accent)]'}`}>
                    ₹{calcNet(editStructure).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setEditStructure(null)} className="px-6 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[var(--accent)] text-white hover:opacity-90 shadow-lg shadow-[var(--accent)]/20 transition-all">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;
