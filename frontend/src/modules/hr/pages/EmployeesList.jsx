import React, { useEffect, useState } from 'react';
import { fetchHREmployeesApi, fetchHRMetadataApi, createHREmployeeApi, deleteHREmployeeApi } from '../../../api/hr';
import { Search, Plus, Loader2, MoreVertical, Briefcase, Mail, Phone, Calendar, X, Users, ChevronRight, Save, Edit, Trash2, Eye, Building, Download, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import ViewToggle from '../../../components/shared/ViewToggle';
import DataTable from '../../../components/shared/DataTable';
import { getImageUrl } from '../../../utils/imageUtils';

const EmployeesList = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Dashboard & Metadata
  const [metadata, setMetadata] = useState({ departments: [], designations: [], available_users: [] });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, designationFilter]);

  useEffect(() => {
    loadEmployees();
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const res = await fetchHRMetadataApi();
      if (res.data?.success) {
        setMetadata(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const res = await fetchHREmployeesApi();
      if (res.data?.success) {
        setEmployees(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load employees');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.emp_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter ? String(emp.department_id) === String(departmentFilter) : true;
    const matchesDesig = designationFilter ? String(emp.designation_id) === String(designationFilter) : true;
    const notTrainee = emp.employment_status !== 'Trainee' && emp.employment_status !== 'Intern';
    
    return matchesSearch && matchesDept && matchesDesig && notTrainee;
  });

  const handleExportCSV = () => {
    if (employees.length === 0) return;
    
    const headers = [
      'Emp Code', 'Full Name', 'Email', 'Department', 'Designation', 'Status', 'Date of Joining', 'Work Location',
      'Gender', 'Date of Birth', 'Marital Status',
      'Current City', 'Permanent City', 
      'Base Salary', 'Payment Type', 'Bank Name', 'Account No', 'IFSC Code',
      'PAN Number', 'Aadhaar Number',
      'PF Covered', 'UAN', 'ESI Covered',
      'Emergency Contact Name', 'Emergency Contact Phone'
    ];
    
    const rows = filteredEmployees.map(emp => {
      const pInfo = typeof emp.personal_info === 'string' ? JSON.parse(emp.personal_info) : (emp.personal_info || {});
      const aInfo = typeof emp.address_info === 'string' ? JSON.parse(emp.address_info) : (emp.address_info || {});
      const payInfo = typeof emp.pay_info === 'string' ? JSON.parse(emp.pay_info) : (emp.pay_info || {});
      const iInfo = typeof emp.identities_info === 'string' ? JSON.parse(emp.identities_info) : (emp.identities_info || {});
      const sInfo = typeof emp.statutory_info === 'string' ? JSON.parse(emp.statutory_info) : (emp.statutory_info || {});
      
      let eContact = {};
      try {
        const eContacts = typeof emp.emergency_contacts === 'string' ? JSON.parse(emp.emergency_contacts) : (emp.emergency_contacts || []);
        if (eContacts.length > 0) eContact = eContacts[0];
      } catch(e) {}

      return [
        emp.emp_code || '',
        emp.full_name || '',
        emp.email || '',
        emp.department_name || 'N/A',
        emp.designation_name || 'N/A',
        emp.employment_status || '',
        emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : 'N/A',
        emp.work_location || 'N/A',
        
        pInfo.gender || '',
        pInfo.dob || '',
        pInfo.marital_status || '',
        
        aInfo.current_city || '',
        aInfo.permanent_city || '',
        
        emp.base_salary || '',
        payInfo.payment_type || '',
        payInfo.bank_name || '',
        payInfo.bank_account_no || '',
        payInfo.ifsc_code || '',
        
        iInfo.pan_doc_no || '',
        iInfo.aadhaar_doc_no || '',
        
        sInfo.pf_covered || 'No',
        sInfo.uan || '',
        sInfo.esi_covered || 'No',
        
        eContact.name || '',
        eContact.phone || ''
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dashboard Metrics
  const activeCount = employees.filter(e => e.employment_status !== 'Terminated').length;
  const recentCount = employees.filter(e => {
    if (!e.date_of_joining) return false;
    const joinDate = new Date(e.date_of_joining);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return joinDate >= thirtyDaysAgo;
  }).length;
  const deptCount = metadata.departments.length || 0;

  const columns = [
    { key: 'emp_code', label: 'Emp Code', render: (row) => <span className="font-bold text-[var(--accent)]">{row.emp_code}</span> },
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email Address' },
    { key: 'department_name', label: 'Department', render: (row) => row.department_name || <span className="text-[11px] text-[var(--text-muted)] italic">N/A</span> },
    { key: 'designation_name', label: 'Designation', render: (row) => row.designation_name || <span className="text-[11px] text-[var(--text-muted)] italic">N/A</span> },
    { key: 'employment_status', label: 'Status', render: (row) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
        row.employment_status === 'Full-Time' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}>
        {row.employment_status || 'Full-Time'}
      </span>
    ) }
  ];

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to completely delete this employee? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
      const res = await deleteHREmployeeApi(id);
      if (res.data?.success) {
        toast.success('Employee deleted successfully');
        loadEmployees();
      }
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Users size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mr-2">
              Employees
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <button 
              onClick={handleExportCSV}
              className="px-6 py-3 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-workspace)] transition-colors flex items-center gap-2 group shadow-sm bg-[var(--bg-card)]"
            >
              <Download size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
              <span className="text-[12px] md:text-[14px] font-bold text-[var(--text-main)]">Export CSV</span>
            </button>
          
          {hasPermission('hr', 'create', 'employees') && (
          <button 
            onClick={() => navigate('/hr/employees/new')}
            className="btn-primary shadow-lg px-8 py-3 group flex items-center gap-2"
            style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] md:text-[14px] font-bold">Add Employee</span>
          </button>
          )}
        </div>
      </div>

      {/* Admin Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
            <Users size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{employees.length}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Total Headcount</p>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50">
            <CheckCircle size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{activeCount}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Active Employees</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
            <Building size={20} className="text-purple-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{deptCount}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Departments</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50">
            <Clock size={20} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight">{recentCount}</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">New Hires (30d)</p>
          </div>
        </div>
      </div>

      <div className="workspace-card p-3.5 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)] mb-6">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search personnel by name, email or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
            {filteredEmployees.length} EMPLOYEES FOUND
          </div>
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

        <div className="relative min-w-[160px] md:w-auto w-full">
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="w-full appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[11px] font-black tracking-wider text-[var(--text-main)] uppercase cursor-pointer shadow-sm hover:border-[var(--accent)]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238888aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundSize: '1.2em', backgroundPosition: 'right 0.6rem center', backgroundRepeat: 'no-repeat',
            }}
          >
            <option value="">ALL DESIGNATIONS</option>
            {metadata.designations?.filter(d => !departmentFilter || String(d.department_id) === String(departmentFilter)).map(d => <option key={d.designation_id} value={d.designation_id}>{d.name.toUpperCase()}</option>)}
          </select>
        </div>

        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
        </div>
      ) : viewMode === 'table' ? (
        <DataTable striped={true}
          columns={columns}
          data={paginatedEmployees}
          loading={isLoading}
          onView={(emp) => navigate(`/hr/employees/${emp.employee_id}`)}
          onEdit={hasPermission('hr', 'edit', 'employees') ? (emp) => navigate(`/hr/employees/${emp.employee_id}?edit=true`) : undefined}
          onDelete={hasPermission('hr', 'delete', 'employees') ? (emp) => handleDelete(emp.employee_id) : undefined}
          totalCount={employees.length}
          filteredCount={filteredEmployees.length}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            {paginatedEmployees.length > 0 ? paginatedEmployees.map((emp, index) => {
            const defaultAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.full_name || 'User')}&backgroundColor=3d6a7d,0f172a&textColor=ffffff`;
            const avatarUrl = emp.image_url ? getImageUrl(emp.image_url) : defaultAvatarUrl;
            
            return (
            <div 
              key={emp.employee_id} 
              className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl animate-entrance-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div onClick={() => navigate(`/hr/employees/${emp.employee_id}`)} className="relative py-6 w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] flex flex-col items-center justify-center cursor-pointer group/img">
                <div className="w-24 h-24 rounded-full border-4 border-[var(--bg-card)] shadow-md overflow-hidden group-hover/img:scale-110 transition-transform duration-500">
                  <img 
                    src={avatarUrl} 
                    alt={emp.full_name} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/hr/employees/${emp.employee_id}`); }} 
                    className="w-12 h-12 bg-[var(--accent)] rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0" 
                    title="View Profile"
                  >
                    <Eye size={22} />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1 space-y-2">
                  <h3 className="text-[15px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300 text-center truncate">
                    {emp.full_name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {(emp.personal_info?.mobile_number || emp.phone_number) && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                      <Phone size={12} className="shrink-0" />
                      <span className="truncate">{emp.personal_info?.mobile_number || emp.phone_number}</span>
                    </div>
                  )}
                  {emp.department_name && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                      <Building size={12} className="shrink-0" />
                      <span className="truncate">{emp.department_name}</span>
                    </div>
                  )}
                  {emp.designation_name && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] justify-center truncate">
                      <Briefcase size={12} className="shrink-0" />
                      <span className="truncate">{emp.designation_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]">
                  <div className="flex items-center">
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase border border-[var(--border-color)] bg-[var(--bg-workspace)] text-[var(--text-secondary)]">
                      {emp.department_name || 'EMPLOYEE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasPermission('hr', 'edit', 'employees') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/hr/employees/${emp.employee_id}?edit=true`); }} 
                      className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg transition-all" 
                      title="Edit Employee"
                    >
                      <Edit size={14} />
                    </button>
                    )}
                    {hasPermission('hr', 'delete', 'employees') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(emp.employee_id); }} 
                      className="p-2 text-rose-500/40 hover:text-rose-500 rounded-lg transition-all" 
                      title="Delete Employee"
                    >
                      <Trash2 size={14} />
                    </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          }) : (
            <div className="col-span-full py-16 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl border-dashed">
              <Users size={48} className="mx-auto text-[var(--border-color)] mb-4" />
              <h3 className="text-lg font-bold text-[var(--text-main)]">No employees found</h3>
              <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Add an employee to get started.</p>
            </div>
          )}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--nav-hover)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-[12px] font-bold text-[var(--text-muted)]">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--nav-hover)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeesList;
