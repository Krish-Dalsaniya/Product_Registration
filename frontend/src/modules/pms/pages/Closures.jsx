import React, { useState, useEffect } from 'react';
import { Plus, Clock, Users, Calendar as CalendarIcon, CheckCircle, FileText, Loader2, X, Trash2, Edit2, Search, CheckSquare, Download } from 'lucide-react';
import { getClosures, createClosure, updateClosure, deleteClosure, getClosureMetrics, getProjects, getTasks } from '../../../api/pms';
import DataTable from '../../../components/shared/DataTable';
import Modal from '../../../components/shared/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

const MiniStatCard = ({ title, count, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
      <Icon size={24} className={iconColor} />
    </div>
    <div>
      <h3 className="text-2xl font-black text-[var(--text-main)] leading-tight">{count}</h3>
      <p className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider mt-0.5">{title}</p>
    </div>
  </div>
);

const Closures = () => {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role_name?.toLowerCase() === 'admin';
  const [closures, setClosures] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [filters, setFilters] = useState({
    employee: '',
    startDate: '',
    endDate: '',
    status: ''
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [closuresRes, metricsRes] = await Promise.all([
        getClosures(filters),
        getClosureMetrics()
      ]);

      if (closuresRes.data?.success) setClosures(closuresRes.data.data);
      if (metricsRes.data?.success) setMetrics(metricsRes.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load closures data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Are you sure you want to delete this closure?')) return;
    try {
      const res = await deleteClosure(row.closure_id);
      if (res.data?.success) {
        toast.success('Closure deleted successfully');
        loadData();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete closure');
    }
  };

  const handleView = (row) => {
    setSelectedClosure(row);
    setIsViewModalOpen(true);
  };

  const handleEditStatus = async (id, status) => {
    try {
      const res = await updateClosure(id, { status });
      if (res.data?.success) {
        toast.success('Closure status updated');
        loadData();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const handleExportCSV = () => {
    if (!closures || closures.length === 0) {
      toast.error('No closures to export');
      return;
    }
    const headers = ['Closure Date', 'Employee Name', 'Total Hours', 'Status', 'Submitted On'];
    const rows = closures.map(c => [
      new Date(c.closure_date).toLocaleDateString(),
      c.employee_name || 'N/A',
      c.total_hours || 0,
      c.status || '',
      new Date(c.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `closures_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { label: 'Closure Date', key: 'closure_date', render: (row) => new Date(row.closure_date).toLocaleDateString() },
    ...(isAdmin ? [{ label: 'Employee Name', key: 'employee_name' }] : []),
    { label: 'Total Hours', key: 'total_hours' },
    { 
      label: 'Status', 
      key: 'status',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
          row.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
          row.status === 'Pending' || row.status === 'Submitted' ? 'bg-orange-50 text-orange-600 border-orange-200' :
          'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
          {row.status}
        </span>
      )
    },
    { label: 'Submitted On', key: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pt-4">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <CheckSquare size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              Closure Management
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
              Daily work reporting and closure tracking system for employees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-6 py-2.5 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-workspace)] transition-colors flex items-center gap-2 group shadow-sm bg-[var(--bg-card)]"
          >
            <Download size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
            <span className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-widest">Export CSV</span>
          </button>
          {hasPermission('hr', 'create', 'pms_closure') && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary shadow-lg px-6 py-2.5 group flex items-center gap-2 rounded-xl"
          >
            <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] font-black uppercase tracking-widest">Add Closure</span>
          </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MiniStatCard 
          title={isAdmin ? "Today's Closures" : "My Today's Closures"} 
          count={metrics?.todaysClosures || 0} 
          icon={CalendarIcon} 
          iconBg="bg-blue-50" 
          iconColor="text-blue-500" 
        />
        <MiniStatCard 
          title={isAdmin ? "Total Closures" : "My Total Closures"} 
          count={metrics?.totalClosures || 0} 
          icon={FileText} 
          iconBg="bg-purple-50" 
          iconColor="text-purple-500" 
        />
        <MiniStatCard 
          title={isAdmin ? "Pending Review" : "My Pending Review"} 
          count={metrics?.pendingReview || 0} 
          icon={Clock} 
          iconBg="bg-orange-50" 
          iconColor="text-orange-500" 
        />
        <MiniStatCard 
          title={isAdmin ? "Approved" : "My Approved"} 
          count={metrics?.approved || 0} 
          icon={CheckCircle} 
          iconBg="bg-emerald-50" 
          iconColor="text-emerald-500" 
        />
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
        {isAdmin && (
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              name="employee"
              value={filters.employee}
              onChange={handleFilterChange}
              placeholder="Search Employee..." 
              className="w-full pl-9 pr-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] focus:border-[var(--accent)] outline-none"
            />
          </div>
        )}
        <div className={`flex gap-4 flex-wrap ${!isAdmin ? 'flex-1' : ''}`}>
          <input 
            type="date" 
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none"
          />
          <input 
            type="date" 
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none"
          />
          <select 
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable 
        columns={columns}
        data={closures}
        loading={isLoading}
        onView={handleView}
        onDelete={hasPermission('hr', 'delete', 'pms_closure') ? handleDelete : undefined}
        rowKey="closure_id"
        totalCount={closures.length}
      />

      <AddClosureModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={loadData}
        user={user}
      />

      {isViewModalOpen && selectedClosure && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Closure Details"
          maxWidth="max-w-xl"
        >
          <div className="p-2">
            {/* Top Status & Summary Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl p-5 mb-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-full bg-[var(--nav-hover)] flex items-center justify-center border border-[var(--border-color)] shadow-inner">
                  <FileText size={24} className="text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">Closure Summary</h2>
                  <p className="text-[12px] font-bold text-[var(--text-muted)] tracking-widest uppercase mt-1">{new Date(selectedClosure.closure_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              
              <div className="flex gap-6 mt-4 md:mt-0 relative z-10">
                <div className="text-right">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Time</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{selectedClosure.total_hours} <span className="text-[12px] text-[var(--text-muted)]">hrs</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-sm border ${
                    selectedClosure.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    selectedClosure.status === 'Pending' || selectedClosure.status === 'Submitted' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {selectedClosure.status === 'Approved' && <CheckCircle size={12} className="mr-1.5" />}
                    {selectedClosure.status === 'Pending' || selectedClosure.status === 'Submitted' ? <Clock size={12} className="mr-1.5" /> : null}
                    {selectedClosure.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Employee info (only show if admin) */}
            {isAdmin && (
              <div className="mb-8">
                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Users size={12} /> Personnel Information</h4>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--nav-hover)] flex items-center justify-center text-[12px] font-black text-[var(--accent)] border border-[var(--border-color)]">
                    {selectedClosure.employee_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14px] font-black text-[var(--text-main)]">{selectedClosure.employee_name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">Employee</p>
                  </div>
                </div>
              </div>
            )}

            {selectedClosure.remarks && (
              <div className="mb-8">
                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><FileText size={12} /> Additional Remarks</h4>
                <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] shadow-inner">
                  <p className="text-[13px] text-[var(--text-main)] leading-relaxed">{selectedClosure.remarks}</p>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><CheckSquare size={12} /> Task Breakdown</h4>
              <div className="space-y-3">
                {selectedClosure.items?.map((item, idx) => (
                  <div key={idx} className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-colors duration-300 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm group">
                    <div className="flex-1 pr-4">
                      <h5 className="text-[14px] font-bold text-[var(--text-main)] leading-tight mb-2">{item.task_title || item.task_description}</h5>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(item.project_name || item.project_id) && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-muted)]">
                            Project: {item.project_name || item.project_id}
                          </span>
                        )}
                        {item.task_id && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)]">
                            Agile Task Linked
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-3 bg-[var(--nav-hover)] px-4 py-2 rounded-lg border border-[var(--border-color)]">
                      <Clock size={14} className="text-[var(--accent)]" />
                      <span className="text-[14px] font-black text-[var(--accent)]">
                        {item.hours_spent} <span className="text-[10px] opacity-70">hrs</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions for Admin/Manager */}
            {hasPermission('hr', 'edit', 'pms_closure') && selectedClosure.status !== 'Approved' && (
              <div className="mt-10 flex justify-end gap-4 pt-6 border-t border-[var(--border-color)]">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-[12px] font-black uppercase tracking-widest shadow-sm hover:bg-[var(--nav-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleEditStatus(selectedClosure.closure_id, 'Approved');
                    setIsViewModalOpen(false);
                  }}
                  className="btn-primary shadow-lg px-8 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2"
                  style={{ boxShadow: '0 8px 16px -4px var(--border-glow)' }}
                >
                  <CheckCircle size={16} />
                  Approve Closure
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

const AddClosureModal = ({ isOpen, onClose, onSuccess, user }) => {
  const [formData, setFormData] = useState({
    closure_date: new Date().toISOString().split('T')[0],
    remarks: '',
    status: 'Submitted'
  });
  const [items, setItems] = useState([
    { project_id: '', task_id: '', task_description: '', hours_spent: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [pRes, tRes] = await Promise.all([
            getProjects({ limit: 100 }),
            getTasks({ limit: 500 }) // fetch open tasks
          ]);
          if (pRes.data?.success) setProjects(pRes.data.data || []);
          if (tRes.data?.success) setTasks(tRes.data.data || []);
        } catch (error) {
          console.error('Failed to fetch data', error);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  const handleAddItem = () => {
    setItems([...items, { project_id: '', task_id: '', task_description: '', hours_spent: '' }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-fill description if a task is selected
    if (field === 'task_id' && value) {
      const selectedTask = tasks.find(t => t.task_id === value);
      if (selectedTask) {
        newItems[index].task_description = `Worked on: ${selectedTask.task_title}`;
        if (selectedTask.project_id) {
          newItems[index].project_id = selectedTask.project_id;
        }
      }
    }
    
    setItems(newItems);
  };

  const calculateTotalHours = () => {
    return items.reduce((sum, item) => sum + (Number(item.hours_spent) || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      const payload = {
        closure_date: formData.closure_date,
        remarks: formData.remarks,
        status: formData.status,
        items
      };
      
      const res = await createClosure(payload);
      if (res.data?.success) {
        toast.success('Closure submitted successfully');
        onSuccess();
        onClose();
        // Reset
        setFormData({ closure_date: new Date().toISOString().split('T')[0], remarks: '', status: 'Submitted' });
        setItems([{ project_id: '', task_id: '', task_description: '', hours_spent: '' }]);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error?.message || 'Failed to submit closure');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Closure" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="p-4 md:p-6">
        {/* Header Section */}
        <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl p-5 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-2"><CalendarIcon size={12}/> Date</label>
              <input 
                type="date" 
                value={formData.closure_date}
                onChange={e => setFormData({ ...formData, closure_date: e.target.value })}
                required
                className="w-full px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-[13px] font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors shadow-inner"
              />
            </div>
            <div className="col-span-1 md:col-span-3">
              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={12}/> Overall Remarks</label>
              <input 
                type="text"
                value={formData.remarks}
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Any general notes for today?"
                className="w-full px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors shadow-inner"
              />
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-[0.2em] flex items-center gap-2"><CheckSquare size={14} /> Task Breakdown</h4>
          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-lg border border-[var(--accent)]/20 shadow-sm">
            Total: {calculateTotalHours()} hrs
          </span>
        </div>

        <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {items.map((item, idx) => (
            <div key={idx} className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] shadow-sm hover:border-[var(--accent)]/50 transition-colors group relative">
              {items.length > 1 && (
                <button 
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="absolute -top-2 -right-2 bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white rounded-full p-1.5 transition-all shadow-sm z-10"
                >
                  <X size={12} strokeWidth={4} />
                </button>
              )}
              
              <div className="flex gap-3 mb-3">
                <div className="flex-1 space-y-2">
                  <select
                    value={item.project_id}
                    onChange={e => handleItemChange(idx, 'project_id', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="">Select Project (Optional)</option>
                    {projects.map(p => (
                      <option key={p.project_id} value={p.project_id}>{p.project_code} - {p.project_name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={item.task_id}
                    onChange={e => handleItemChange(idx, 'task_id', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[13px] font-medium text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="">Link to an Agile Task (Optional)</option>
                    {tasks
                      .filter(t => !item.project_id || t.project_id === item.project_id)
                      .map(t => (
                      <option key={t.task_id} value={t.task_id}>#{t.task_id.split('-')[0]} - {t.task_title}</option>
                    ))}
                  </select>
                </div>
                <div className="w-[100px] relative">
                  <input 
                    type="number" 
                    step="0.5"
                    required
                    placeholder="0.0"
                    value={item.hours_spent}
                    onChange={e => handleItemChange(idx, 'hours_spent', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[14px] font-black text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-muted)] pointer-events-none">hrs</span>
                </div>
              </div>
              
              <textarea 
                required
                placeholder="What did you work on?"
                value={item.task_description}
                onChange={e => handleItemChange(idx, 'task_description', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] min-h-[60px] transition-colors"
              />
            </div>
          ))}
        </div>

        <button 
          type="button"
          onClick={handleAddItem}
          className="w-full py-3 bg-[var(--bg-workspace)] border-2 border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-xl text-[12px] font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-all duration-300 mb-8"
        >
          <Plus size={16} /> Add Task Entry
        </button>

        <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-color)] mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-[12px] font-black uppercase tracking-widest shadow-sm hover:bg-[var(--nav-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary shadow-lg px-8 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2"
            style={{ boxShadow: '0 8px 16px -4px var(--border-glow)' }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Submit Closure</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Closures;
