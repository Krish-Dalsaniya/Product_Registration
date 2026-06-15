import React, { useEffect, useState } from 'react';
import { fetchHREmployeesApi, fetchHRMetadataApi, createHREmployeeApi, deleteHREmployeeApi } from '../../../api/hr';
import { Search, Plus, Loader2, MoreVertical, Briefcase, Mail, Phone, Calendar, X, Users, ChevronRight, Save, Edit, Trash2, Eye, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import ViewToggle from '../../../components/shared/ViewToggle';
import DataTable from '../../../components/shared/DataTable';

const EmployeesList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeAddTab, setActiveAddTab] = useState('Personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState({ departments: [], designations: [], available_users: [] });
  const [formData, setFormData] = useState({
    user_id: '', full_name: '', email: '', phone_number: '', 
    department_id: '', designation_id: '',
    date_of_joining: '', employment_status: 'Full-Time', 
    base_salary: '', work_location: '',
    personal_info: {
      nickname: '', gender: 'Male', dob: '', blood_group: '', fathers_name: '',
      residential_status: '', place_of_birth: '', country_of_origin: '',
      religion_caste: '', physically_challenged: 'No', disability_type: '',
      international_employee: 'No', is_director: 'No', hobby: '',
      height: '', weight: '', identification_mark: '',
      marital_status: 'Single', spouse_name: '', marriage_date: ''
    },
    job_info: {
      date_of_hiring: '', probation_period: '', notice_period: '',
      confirmation_date: '', current_company_experience: '', referred_by: '',
      reporting_manager: ''
    },
    pay_info: {
      name_on_account: '', bank_name: '', bank_branch: '',
      bank_account_no: '', ifsc_code: '', account_type: '',
      payment_type: 'Bank Transfer', dd_payable_at: ''
    },
    statutory_info: {
      esi_covered: 'No', esi_number: '',
      pf_covered: 'No', uan: '', pf_no: '', pf_join_date: '',
      family_pf_no: '', eps_member: 'No', excess_epf: 'No', excess_eps: 'No', pf_note: '',
      lwf_covered: 'No'
    },
    identities_info: {
      pan_doc_no: '', pan_name: '',
      bank_doc_no: '', bank_name_on_doc: '',
      aadhaar_doc_no: '', aadhaar_name: ''
    }
  });

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
    const matchesDept = departmentFilter ? emp.department_id === parseInt(departmentFilter) : true;
    const matchesDesig = designationFilter ? String(emp.designation_id) === String(designationFilter) : true;
    
    return matchesSearch && matchesDept && matchesDesig;
  });

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

  const handleNextTab = (e) => {
    e.preventDefault();
    const tabOrder = ['Personal', 'Job', 'Pay & Benefits', 'Statutory', 'Identities'];
    const currentIndex = tabOrder.indexOf(activeAddTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveAddTab(tabOrder[currentIndex + 1]);
    } else {
      handleAddEmployee(e);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    // Manual validation since HTML5 'required' fails on hidden tabs
    if (!formData.full_name || !formData.email || !formData.department_id || !formData.designation_id || !formData.date_of_joining) {
      toast.error('Please fill out all mandatory fields: Name, Email, Department, Designation, and DOJ.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createHREmployeeApi(formData);
      if (res.data?.success) {
        toast.success('Employee created successfully');
        setIsAddModalOpen(false);
        setFormData({
          user_id: '',
          emp_code: '',
          department_id: '',
          designation_id: '',
          date_of_joining: '',
          employment_status: 'Full-Time',
          base_salary: '',
          work_location: '',
          full_name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone_number: '',
          personal_info: {
            nickname: '', gender: 'Male', dob: '', blood_group: '', fathers_name: '',
            residential_status: '', place_of_birth: '', country_of_origin: '',
            religion_caste: '', physically_challenged: 'No', disability_type: '',
            international_employee: 'No', is_director: 'No', hobby: '',
            height: '', weight: '', identification_mark: '',
            marital_status: 'Single', spouse_name: '', marriage_date: ''
          },
          job_info: {
            date_of_hiring: '', probation_period: '', notice_period: '',
            confirmation_date: '', current_company_experience: '', referred_by: '',
            reporting_manager: ''
          },
          pay_info: {
            name_on_account: '', bank_name: '', bank_branch: '',
            bank_account_no: '', ifsc_code: '', account_type: '',
            payment_type: 'Bank Transfer', dd_payable_at: ''
          },
          statutory_info: {
            esi_covered: 'No', esi_number: '',
            pf_covered: 'No', uan: '', pf_no: '', pf_join_date: '',
            family_pf_no: '', eps_member: 'No', excess_epf: 'No', excess_eps: 'No', pf_note: '',
            lwf_covered: 'No'
          },
          identities_info: {
            pan_doc_no: '', pan_name: '',
            bank_doc_no: '', bank_name_on_doc: '',
            aadhaar_doc_no: '', aadhaar_name: ''
          }
        });
        loadEmployees(); // refresh list
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const filteredDesignations = metadata.designations.filter(d => d.department_id === formData.department_id);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Users size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              Employee Directory
            </h1>
          </div>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary shadow-lg px-8 py-3 group"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] md:text-[14px] font-bold">Add Employee</span>
        </button>
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
            {metadata.designations?.filter(d => !departmentFilter || d.department_id === parseInt(departmentFilter)).map(d => <option key={d.designation_id} value={d.designation_id}>{d.name.toUpperCase()}</option>)}
          </select>
        </div>

        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredEmployees}
          loading={isLoading}
          onView={(emp) => navigate(`/hr/employees/${emp.employee_id}`)}
          onEdit={(emp) => navigate(`/hr/employees/${emp.employee_id}?edit=true`)}
          onDelete={(emp) => handleDelete(emp.employee_id)}
          totalCount={employees.length}
          filteredCount={filteredEmployees.length}
          currentPage={1}
          totalPages={1}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
          {filteredEmployees.length > 0 ? filteredEmployees.map((emp, index) => {
            const defaultAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.full_name || 'User')}&backgroundColor=3d6a7d,0f172a&textColor=ffffff`;
            const avatarUrl = emp.image_url || defaultAvatarUrl;
            
            return (
            <div 
              key={emp.employee_id} 
              className="workspace-card group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl animate-entrance-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div onClick={() => navigate(`/hr/employees/${emp.employee_id}`)} className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-workspace)] border-b border-[var(--border-color)] flex flex-col items-center justify-center cursor-pointer group/img">
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
                <div className="flex-1 space-y-3">
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
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/hr/employees/${emp.employee_id}?edit=true`); }} 
                      className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg transition-all" 
                      title="Edit Employee"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(emp.employee_id); }} 
                      className="p-2 text-rose-500/40 hover:text-rose-500 rounded-lg transition-all" 
                      title="Delete Employee"
                    >
                      <Trash2 size={14} />
                    </button>
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
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-main)]">Add New Employee</h2>
                <p className="text-[13px] text-[var(--text-muted)] mt-1 font-medium">Fill out the employee's profile sections below.</p>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={handleAddEmployee} disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2 bg-[var(--accent)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-[13px] shadow-md">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Create Employee</span>
                </button>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-[var(--bg-workspace)] rounded-lg transition-colors border border-[var(--border-color)]">
                  <X size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
            
            {/* Modal Tabs */}
            <div className="flex border-b border-[var(--border-color)] px-6 bg-[var(--bg-card)] overflow-x-auto custom-scrollbar">
              {['Personal', 'Job', 'Pay & Benefits', 'Statutory', 'Identities'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveAddTab(tab)}
                  className={`py-3 px-4 font-bold text-[13px] whitespace-nowrap border-b-2 transition-colors ${
                    activeAddTab === tab ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-6 bg-[var(--bg-workspace)]">
              <form id="add-emp-form" onSubmit={handleAddEmployee} className="h-full">
                
                {/* 1. PERSONAL TAB */}
                <div className={activeAddTab === 'Personal' ? 'block space-y-6' : 'hidden'}>
                  {/* Account Info */}
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Account Details</h3>
                    
                    <div className="mb-4">
                      <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Link Existing System User (Optional)</label>
                      <select 
                        value={formData.user_id} 
                        onChange={e => {
                          const uid = e.target.value;
                          const user = metadata.available_users.find(u => u.user_id === uid);
                          if (user) {
                            setFormData({...formData, user_id: uid, full_name: user.full_name, email: user.email});
                          } else {
                            setFormData({...formData, user_id: '', full_name: '', email: ''});
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]"
                      >
                        <option value="">-- Create a New User --</option>
                        {metadata.available_users?.map(u => (
                          <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.email})</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">Select an existing account, or leave blank to create a new one.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Full Name *</label>
                        <input disabled={!!formData.user_id} type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Email Address *</label>
                        <input disabled={!!formData.user_id} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Phone Number</label>
                        <input type="text" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                    </div>
                  </div>

                  {/* Additional Personal Details */}
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Personal Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Gender</label>
                        <select value={formData.personal_info.gender} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, gender: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Date of Birth</label>
                        <input type="date" value={formData.personal_info.dob} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, dob: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Blood Group</label>
                        <input type="text" value={formData.personal_info.blood_group} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, blood_group: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Father's Name</label>
                        <input type="text" value={formData.personal_info.fathers_name} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, fathers_name: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Religion & Caste</label>
                        <input type="text" value={formData.personal_info.religion_caste} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, religion_caste: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Marital Status</label>
                        <select value={formData.personal_info.marital_status} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, marital_status: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. JOB TAB */}
                <div className={activeAddTab === 'Job' ? 'block space-y-6' : 'hidden'}>
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Core Job Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Department *</label>
                        <select value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value, designation_id: ''})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="">Select Department</option>
                          {metadata.departments.map(d => (
                            <option key={d.department_id} value={d.department_id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Designation *</label>
                        <select value={formData.designation_id} onChange={e => setFormData({...formData, designation_id: e.target.value})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" disabled={!formData.department_id}>
                          <option value="">Select Designation</option>
                          {metadata.designations.filter(d => String(d.department_id) === String(formData.department_id)).map(d => (
                            <option key={d.designation_id} value={d.designation_id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Date of Joining *</label>
                        <input type="date" value={formData.date_of_joining} onChange={e => setFormData({...formData, date_of_joining: e.target.value})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Employment Status</label>
                        <select value={formData.employment_status} onChange={e => setFormData({...formData, employment_status: e.target.value})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="Contract">Contract</option>
                          <option value="Intern">Intern</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Work Location</label>
                        <input type="text" placeholder="e.g. New York, Remote" value={formData.work_location} onChange={e => setFormData({...formData, work_location: e.target.value})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Reporting Manager</label>
                        <input type="text" value={formData.job_info.reporting_manager} onChange={e => setFormData({...formData, job_info: {...formData.job_info, reporting_manager: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Extended Employment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Date Of Hiring</label>
                        <input type="date" value={formData.job_info.date_of_hiring} onChange={e => setFormData({...formData, job_info: {...formData.job_info, date_of_hiring: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Confirmation Date</label>
                        <input type="date" value={formData.job_info.confirmation_date} onChange={e => setFormData({...formData, job_info: {...formData.job_info, confirmation_date: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Probation Period</label>
                        <input type="text" value={formData.job_info.probation_period} onChange={e => setFormData({...formData, job_info: {...formData.job_info, probation_period: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Notice Period</label>
                        <input type="text" value={formData.job_info.notice_period} onChange={e => setFormData({...formData, job_info: {...formData.job_info, notice_period: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Current Company Exp.</label>
                        <input type="text" value={formData.job_info.current_company_experience} onChange={e => setFormData({...formData, job_info: {...formData.job_info, current_company_experience: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Referred By</label>
                        <input type="text" value={formData.job_info.referred_by} onChange={e => setFormData({...formData, job_info: {...formData.job_info, referred_by: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PAY & BENEFITS TAB */}
                <div className={activeAddTab === 'Pay & Benefits' ? 'block space-y-6' : 'hidden'}>
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Salary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Base Salary (Annual)</label>
                        <input type="number" placeholder="e.g. 75000" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Name As Per Bank</label>
                        <input type="text" value={formData.pay_info.name_on_account} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, name_on_account: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Bank Name</label>
                        <input type="text" value={formData.pay_info.bank_name} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, bank_name: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Bank Branch</label>
                        <input type="text" value={formData.pay_info.bank_branch} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, bank_branch: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Bank Account No.</label>
                        <input type="text" value={formData.pay_info.bank_account_no} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, bank_account_no: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">IFSC Code</label>
                        <input type="text" value={formData.pay_info.ifsc_code} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, ifsc_code: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Account Type</label>
                        <select value={formData.pay_info.account_type} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, account_type: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="">Select Type</option>
                          <option value="Savings">Savings</option>
                          <option value="Current">Current</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Payment Type</label>
                        <select value={formData.pay_info.payment_type} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, payment_type: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">DD Payable At</label>
                        <input type="text" value={formData.pay_info.dd_payable_at} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, dd_payable_at: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. STATUTORY TAB */}
                <div className={activeAddTab === 'Statutory' ? 'block space-y-6' : 'hidden'}>
                  {/* ESI */}
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">ESI Account</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Covered Under ESI?</label>
                        <select value={formData.statutory_info.esi_covered} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, esi_covered: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">ESI Number</label>
                        <input type="text" disabled={formData.statutory_info.esi_covered === 'No'} value={formData.statutory_info.esi_number} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, esi_number: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" />
                      </div>
                    </div>
                  </div>
                  
                  {/* PF */}
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">PF Account</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Covered Under PF?</label>
                        <select value={formData.statutory_info.pf_covered} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, pf_covered: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">UAN</label>
                        <input type="text" disabled={formData.statutory_info.pf_covered === 'No'} value={formData.statutory_info.uan} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, uan: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">PF No.</label>
                        <input type="text" disabled={formData.statutory_info.pf_covered === 'No'} value={formData.statutory_info.pf_no} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, pf_no: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">PF Join Date</label>
                        <input type="date" disabled={formData.statutory_info.pf_covered === 'No'} value={formData.statutory_info.pf_join_date} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, pf_join_date: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Family PF No.</label>
                        <input type="text" disabled={formData.statutory_info.pf_covered === 'No'} value={formData.statutory_info.family_pf_no} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, family_pf_no: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Existing EPS Member?</label>
                        <select disabled={formData.statutory_info.pf_covered === 'No'} value={formData.statutory_info.eps_member} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, eps_member: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50">
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* LWF */}
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">LWF Account</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[var(--text-main)] mb-1">Covered Under LWF?</label>
                        <select value={formData.statutory_info.lwf_covered} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, lwf_covered: e.target.value}})} className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]">
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. IDENTITIES TAB */}
                <div className={activeAddTab === 'Identities' ? 'block space-y-6' : 'hidden'}>
                  <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Employee Identity Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                      {/* PAN */}
                      <div className="p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)]">
                        <h4 className="text-[13px] font-bold text-[var(--text-main)] mb-3">Permanent Account Number (PAN)</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1">Document No.</label>
                            <input type="text" value={formData.identities_info.pan_doc_no} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, pan_doc_no: e.target.value}})} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--accent)]" />
                          </div>
                          <div>
                            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1">Name As Per Document</label>
                            <input type="text" value={formData.identities_info.pan_name} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, pan_name: e.target.value}})} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--accent)]" />
                          </div>
                        </div>
                      </div>

                      {/* AADHAAR */}
                      <div className="p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)]">
                        <h4 className="text-[13px] font-bold text-[var(--text-main)] mb-3">AADHAAR</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1">Document No.</label>
                            <input type="text" value={formData.identities_info.aadhaar_doc_no} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, aadhaar_doc_no: e.target.value}})} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--accent)]" />
                          </div>
                          <div>
                            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1">Name As Per Document</label>
                            <input type="text" value={formData.identities_info.aadhaar_name} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, aadhaar_name: e.target.value}})} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--accent)]" />
                          </div>
                        </div>
                      </div>

                      {/* Bank ID */}
                      <div className="p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)]">
                        <h4 className="text-[13px] font-bold text-[var(--text-main)] mb-3">Bank Details for Identification</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1">Document No. (Passbook/Cheque)</label>
                            <input type="text" value={formData.identities_info.bank_doc_no} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, bank_doc_no: e.target.value}})} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--accent)]" />
                          </div>
                          <div>
                            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1">Name As Per Document</label>
                            <input type="text" value={formData.identities_info.bank_name_on_doc} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, bank_name_on_doc: e.target.value}})} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[13px] focus:outline-none focus:border-[var(--accent)]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]">
              <div className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-2">
                Creating: <span className="text-[var(--text-main)] font-bold">{formData.full_name || 'New Employee'}</span>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleNextTab} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-md">
                  <span>{activeAddTab === 'Identities' ? 'Submit' : 'Save & Next'}</span>
                  {activeAddTab !== 'Identities' && <ChevronRight size={16} />}
                </button>
              </div>
            </div>  
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesList;
