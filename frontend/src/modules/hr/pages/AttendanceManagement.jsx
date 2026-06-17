import React, { useState, useEffect } from 'react';
import { fetchAttendanceRecordsApi, fetchAttendanceMetricsApi, updateAttendanceApi, createManualAttendanceApi } from '../../../api/attendance';
import { fetchHREmployeesApi, fetchHRMetadataApi } from '../../../api/hr';
import { Clock, Search, Filter, Calendar as CalendarIcon, UserCheck, UserX, AlertCircle, Edit, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../../components/shared/DataTable';
import AttendanceMuster from '../components/AttendanceMuster';

const AttendanceManagement = () => {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'muster'
  const [records, setRecords] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [metadata, setMetadata] = useState({ departments: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '',
    clock_out: '',
    status: 'Present',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMetadata();
    loadEmployees();
    loadMetrics();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [dateFilter, departmentFilter]);

  const loadMetadata = async () => {
    try {
      const res = await fetchHRMetadataApi();
      if (res.data?.success) setMetadata(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetchHREmployeesApi();
      if (res.data?.success) setEmployees(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetchAttendanceMetricsApi();
      if (res.data?.success) setMetrics(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      const res = await fetchAttendanceRecordsApi({
        start_date: dateFilter,
        end_date: dateFilter,
        department_id: departmentFilter
      });
      if (res.data?.success) setRecords(res.data.data);
    } catch (err) {
      toast.error('Failed to load attendance records');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    r.emp_code?.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (record = null) => {
    if (record) {
      const getLocalTime = (utcString) => {
        if (!utcString) return '';
        const d = new Date(utcString);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      };

      setEditingRecord(record);
      setFormData({
        employee_id: record.employee_id,
        date: new Date(record.date).toISOString().split('T')[0],
        clock_in: getLocalTime(record.clock_in),
        clock_out: getLocalTime(record.clock_out),
        status: record.status || 'Present',
        notes: record.notes || ''
      });
    } else {
      setEditingRecord(null);
      setFormData({
        employee_id: '',
        date: dateFilter || new Date().toISOString().split('T')[0],
        clock_in: '',
        clock_out: '',
        status: 'Present',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.employee_id || !formData.date || !formData.status) {
      toast.error('Please fill required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        ...formData,
        clock_in: formData.clock_in ? new Date(formData.clock_in).toISOString() : null,
        clock_out: formData.clock_out ? new Date(formData.clock_out).toISOString() : null,
      };

      if (editingRecord) {
        const res = await updateAttendanceApi(editingRecord.attendance_id, payload);
        if (res.data?.success) {
          toast.success('Attendance updated');
          setIsModalOpen(false);
          loadRecords();
          loadMetrics();
        }
      } else {
        const res = await createManualAttendanceApi(payload);
        if (res.data?.success) {
          toast.success('Attendance logged');
          setIsModalOpen(false);
          loadRecords();
          loadMetrics();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save attendance');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Present': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Absent': 'bg-rose-100 text-rose-700 border-rose-200',
      'Late': 'bg-amber-100 text-amber-700 border-amber-200',
      'Half Day': 'bg-purple-100 text-purple-700 border-purple-200',
      'On Leave': 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const style = styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${style}`}>
        {status}
      </span>
    );
  };

  const formatTime = (dateString) => {
    if (!dateString) return <span className="text-[11px] text-[var(--text-muted)] italic">--:--</span>;
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const columns = [
    { key: 'emp_code', label: 'Emp Code', render: (row) => <span className="font-bold text-[var(--text-secondary)]">{row.emp_code}</span> },
    { key: 'full_name', label: 'Employee', render: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg-workspace)] border border-[var(--border-color)]">
          {row.image_url ? (
            <img src={row.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)]">
              {row.full_name?.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="font-bold text-[var(--text-main)]">{row.full_name}</p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{row.department_name}</p>
        </div>
      </div>
    ) },
    { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.status) },
    { key: 'clock_in', label: 'Clock In', render: (row) => formatTime(row.clock_in) },
    { key: 'clock_out', label: 'Clock Out', render: (row) => formatTime(row.clock_out) },
    { key: 'work_hours', label: 'Work Hrs', render: (row) => (
      <span className="font-semibold text-[var(--text-main)]">
        {row.work_hours ? `${row.work_hours}h` : '--'}
      </span>
    ) }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6 mt-4 animate-entrance-down">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
              <Clock size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
                Attendance Records
              </h1>
              <p className="text-sm font-medium text-[var(--text-muted)] mt-1.5">Manage daily punch-ins, punch-outs, and shift tracking.</p>
            </div>
          </div>
          <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-1 rounded-xl shadow-sm w-fit">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${activeTab === 'daily' ? 'bg-[var(--accent)] shadow-md text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              Daily Log
            </button>
            <button
              onClick={() => setActiveTab('muster')}
              className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${activeTab === 'muster' ? 'bg-[var(--accent)] shadow-md text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              Muster Roll
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          <button 
            onClick={() => openModal()}
            className="btn-primary shadow-lg px-6 py-3 group flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="text-[12px] md:text-[14px] font-bold">Log Attendance</span>
          </button>
        </div>
      </div>

      {activeTab === 'muster' ? (
        <AttendanceMuster />
      ) : (
        <>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
            <Users size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{metrics?.total_records || 0}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Total Logs Today</p>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50">
            <UserCheck size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{metrics?.present_count || 0}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Present</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
            <AlertCircle size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{metrics?.late_count || 0}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Late Arrivals</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-50">
            <UserX size={20} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{metrics?.absent_count || 0}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Absent</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
            <CalendarIcon size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{metrics?.on_leave_count || 0}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">On Leave</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="workspace-card p-3.5 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)] mb-6">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-4 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
          />
        </div>

        <div className="relative min-w-[160px] md:w-auto w-full">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 px-4 outline-none focus:border-[var(--accent)] transition-all text-[12px] font-black tracking-wider text-[var(--text-main)] shadow-sm hover:border-[var(--accent)] uppercase"
          />
        </div>

        <div className="relative min-w-[160px] md:w-auto w-full">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black tracking-wider text-[var(--text-main)] uppercase cursor-pointer shadow-sm hover:border-[var(--accent)]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundSize: '1.2em', backgroundPosition: 'right 0.6rem center', backgroundRepeat: 'no-repeat',
            }}
          >
            <option value="">ALL DEPARTMENTS</option>
            {metadata.departments?.map(d => <option key={d.department_id} value={d.department_id}>{d.name.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRecords}
        loading={isLoading}
        onEdit={(row) => openModal(row)}
        totalCount={records.length}
        filteredCount={filteredRecords.length}
        currentPage={1}
        totalPages={1}
      />

      </>
      )}

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]">
              <h2 className="text-lg font-black text-[var(--text-main)]">
                {editingRecord ? 'Edit Attendance' : 'Log Attendance'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {!editingRecord && (
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Employee</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--accent)] text-[14px] text-[var(--text-main)] font-medium"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name} ({emp.emp_code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  disabled={!!editingRecord}
                  className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--accent)] text-[14px] text-[var(--text-main)] font-medium disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Clock In</label>
                  <input
                    type="datetime-local"
                    value={formData.clock_in}
                    onChange={(e) => setFormData({...formData, clock_in: e.target.value})}
                    className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--accent)] text-[13px] text-[var(--text-main)] font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Clock Out</label>
                  <input
                    type="datetime-local"
                    value={formData.clock_out}
                    onChange={(e) => setFormData({...formData, clock_out: e.target.value})}
                    className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--accent)] text-[13px] text-[var(--text-main)] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--accent)] text-[14px] text-[var(--text-main)] font-medium"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optional remarks..."
                  rows={2}
                  className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--accent)] text-[14px] text-[var(--text-main)] font-medium resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-workspace)] flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-[13px] text-[var(--text-main)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="btn-primary px-6 py-2.5 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <span className="font-bold text-[13px]">{editingRecord ? 'Save Changes' : 'Log Attendance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Also define Users icon if not available
function Users(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default AttendanceManagement;
