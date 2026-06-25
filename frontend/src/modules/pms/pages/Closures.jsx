import React, { useState, useEffect } from 'react';
import { Plus, Clock, Users, Calendar as CalendarIcon, CheckCircle, FileText, Loader2, X, Trash2, Edit2, Search } from 'lucide-react';
import { getClosures, createClosure, updateClosure, deleteClosure, getClosureMetrics, getProjects } from '../../../api/pms';
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
  const { user } = useAuth();
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

  const columns = [
    { label: 'Closure Date', key: 'closure_date', render: (row) => new Date(row.closure_date).toLocaleDateString() },
    { label: 'Employee Name', key: 'employee_name' },
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pt-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
            Closure Management
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
            Daily work reporting and closure tracking system for employees
          </p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-[12px] font-bold shadow-sm hover:bg-[var(--nav-hover)] transition-colors">
            Export CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary shadow-lg px-6 py-2.5 group flex items-center gap-2 rounded-xl"
          >
            <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] font-black uppercase tracking-widest">Add Closure</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MiniStatCard 
          title="Today's Closures" 
          count={metrics?.todaysClosures || 0} 
          icon={CalendarIcon} 
          iconBg="bg-blue-50" 
          iconColor="text-blue-500" 
        />
        <MiniStatCard 
          title="Total Closures" 
          count={metrics?.totalClosures || 0} 
          icon={FileText} 
          iconBg="bg-purple-50" 
          iconColor="text-purple-500" 
        />
        <MiniStatCard 
          title="Pending Review" 
          count={metrics?.pendingReview || 0} 
          icon={Clock} 
          iconBg="bg-orange-50" 
          iconColor="text-orange-500" 
        />
        <MiniStatCard 
          title="Approved" 
          count={metrics?.approved || 0} 
          icon={CheckCircle} 
          iconBg="bg-emerald-50" 
          iconColor="text-emerald-500" 
        />
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
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
        <div className="flex gap-4 flex-wrap">
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
        onDelete={handleDelete}
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
          maxWidth="max-w-3xl"
        >
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Employee</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedClosure.employee_name}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Closure Date</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{new Date(selectedClosure.closure_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Status</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedClosure.status}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Total Hours</p>
                <p className="text-[14px] font-medium text-[var(--text-main)]">{selectedClosure.total_hours}</p>
              </div>
            </div>

            {selectedClosure.remarks && (
              <div className="mb-6">
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Remarks</p>
                <p className="text-[13px] text-[var(--text-main)] bg-[var(--bg-workspace)] p-3 rounded-xl border border-[var(--border-color)] mt-1">{selectedClosure.remarks}</p>
              </div>
            )}

            <h4 className="text-[14px] font-black text-[var(--text-main)] mb-3 border-b border-[var(--border-color)] pb-2">Closure Items</h4>
            <div className="space-y-3">
              {selectedClosure.items?.map((item, idx) => (
                <div key={idx} className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-4 flex justify-between items-start">
                  <div>
                    <h5 className="text-[13px] font-bold text-[var(--text-main)]">{item.task_description}</h5>
                    {item.project_name ? <p className="text-[11px] text-[var(--text-muted)] mt-1">Project: {item.project_name}</p> : item.project_id ? <p className="text-[11px] text-[var(--text-muted)] mt-1">Project ID: {item.project_id}</p> : null}
                  </div>
                  <span className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg text-[12px] font-bold">
                    {item.hours_spent} hrs
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Actions for Admin/Manager */}
            {(user?.role_name === 'Admin' || user?.role_name === 'HR Manager') && selectedClosure.status !== 'Approved' && (
              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  onClick={() => {
                    handleEditStatus(selectedClosure.closure_id, 'Approved');
                    setIsViewModalOpen(false);
                  }}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[12px] font-bold hover:bg-emerald-600 transition-colors"
                >
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
    { project_id: '', task_description: '', hours_spent: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const fetchProjects = async () => {
        try {
          const res = await getProjects({ limit: 100 });
          if (res.data?.success) setProjects(res.data.data || []);
        } catch (error) {
          console.error('Failed to fetch projects', error);
        }
      };
      fetchProjects();
    }
  }, [isOpen]);

  const handleAddItem = () => {
    setItems([...items, { project_id: '', task_description: '', hours_spent: '' }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
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
        setItems([{ project_id: '', task_description: '', hours_spent: '' }]);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error?.message || 'Failed to submit closure');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Closure" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Closure Date</label>
            <input 
              type="date" 
              value={formData.closure_date}
              onChange={e => setFormData({ ...formData, closure_date: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Remarks</label>
            <textarea 
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
              rows="2"
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-color)] pb-2">
          <h4 className="text-[14px] font-black text-[var(--text-main)]">Closure Items</h4>
          <span className="text-[12px] font-bold text-[var(--accent)]">Total: {calculateTotalHours()} hrs</span>
        </div>

        <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-start bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
              <div className="flex-1 space-y-3">
                <select
                  value={item.project_id}
                  onChange={e => handleItemChange(idx, 'project_id', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select Project (Optional)</option>
                  {projects.map(p => (
                    <option key={p.project_id} value={p.project_id}>{p.project_code} - {p.project_name}</option>
                  ))}
                </select>
                <textarea 
                  required
                  placeholder="Task Description"
                  value={item.task_description}
                  onChange={e => handleItemChange(idx, 'task_description', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] min-h-[60px]"
                />
              </div>
              <div className="w-[100px]">
                <input 
                  type="number" 
                  step="0.5"
                  required
                  placeholder="Hours"
                  value={item.hours_spent}
                  onChange={e => handleItemChange(idx, 'hours_spent', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              {items.length > 1 && (
                <button 
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mt-1"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button 
          type="button"
          onClick={handleAddItem}
          className="w-full py-2.5 border-2 border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] rounded-xl text-[12px] font-bold flex justify-center items-center gap-2 transition-colors mb-8"
        >
          <Plus size={16} /> Add Row
        </button>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-[12px] font-bold text-[var(--text-main)] hover:bg-[var(--bg-workspace)] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary px-8 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Closure'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Closures;
