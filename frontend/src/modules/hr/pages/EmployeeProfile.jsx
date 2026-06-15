import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchHREmployeeByIdApi, updateHREmployeeApi } from '../../../api/hr';
import { ArrowLeft, Loader2, Save, User, Briefcase, IndianRupee, ShieldCheck, Fingerprint, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';


const FormField = ({ label, value, isEditing, type = 'text', options = [], onChange, disabled = false, readOnlyText = null, isCustomView = false, customView = null }) => {
  return (
    <div>
      <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wide">{label}</label>
      {isEditing ? (
        type === 'select' ? (
          <select disabled={disabled} value={value || ''} onChange={onChange} className="w-full px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-70">
            {options.map((o, i) => typeof o === 'string' ? <option key={i} value={o}>{o}</option> : <option key={i} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input type={type} disabled={disabled} value={value || ''} onChange={onChange} className="w-full px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-70" />
        )
      ) : (
        isCustomView ? customView : <div className="text-[14px] font-semibold text-[var(--text-main)] mt-1.5">{readOnlyText !== null ? readOnlyText : (value || '-')}</div>
      )}
    </div>
  );
};

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(queryParams.get('edit') === 'true');
  const [activeTab, setActiveTab] = useState('Personal');

  // Info States
  const [personalInfo, setPersonalInfo] = useState({
    nickname: '', gender: 'Male', dob: '', blood_group: '', fathers_name: '',
    residential_status: '', place_of_birth: '', country_of_origin: '',
    religion_caste: '', physically_challenged: 'No', disability_type: '',
    international_employee: 'No', is_director: 'No', hobby: '',
    height: '', weight: '', identification_mark: '',
    marital_status: 'Single', spouse_name: '', marriage_date: '',
    mobile_number: ''
  });

  const [jobInfo, setJobInfo] = useState({
    date_of_hiring: '', probation_period: '', notice_period: '',
    confirmation_date: '', current_company_experience: '', referred_by: '',
    reporting_manager: ''
  });

  const [payInfo, setPayInfo] = useState({
    name_on_account: '', bank_name: '', bank_branch: '',
    bank_account_no: '', ifsc_code: '', account_type: '',
    payment_type: 'Bank Transfer', dd_payable_at: ''
  });

  const [statutoryInfo, setStatutoryInfo] = useState({
    esi_covered: 'No', esi_number: '',
    pf_covered: 'No', uan: '', pf_no: '', pf_join_date: '',
    family_pf_no: '', eps_member: 'No', excess_epf: 'No', excess_eps: 'No', pf_note: '',
    lwf_covered: 'No'
  });

  const [identitiesInfo, setIdentitiesInfo] = useState({
    pan_doc_no: '', pan_name: '',
    bank_doc_no: '', bank_name_on_doc: '',
    aadhaar_doc_no: '', aadhaar_name: ''
  });

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    try {
      setIsLoading(true);
      const res = await fetchHREmployeeByIdApi(id);
      if (res.data?.success) {
        const emp = res.data.data;
        setEmployee(emp);
        if (emp.personal_info) setPersonalInfo({ ...personalInfo, ...emp.personal_info });
        if (emp.job_info) setJobInfo({ ...jobInfo, ...emp.job_info });
        if (emp.pay_info) setPayInfo({ ...payInfo, ...emp.pay_info });
        if (emp.statutory_info) setStatutoryInfo({ ...statutoryInfo, ...emp.statutory_info });
        if (emp.identities_info) setIdentitiesInfo({ ...identitiesInfo, ...emp.identities_info });
      }
    } catch (error) {
      toast.error('Failed to load employee profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        personal_info: personalInfo,
        job_info: jobInfo,
        pay_info: payInfo,
        statutory_info: statutoryInfo,
        identities_info: identitiesInfo
      };
      const res = await updateHREmployeeApi(id, payload);
      if (res.data?.success) {
        toast.success('Profile updated successfully!');
        setIsEditing(false); // return to view mode
      }
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
      </div>
    );
  }

  if (!employee) return <div>Employee not found</div>;

  const tabs = [
    { id: 'Personal', icon: User },
    { id: 'Job', icon: Briefcase },
    { id: 'Pay and Benefits', icon: IndianRupee },
    { id: 'Statutory', icon: ShieldCheck },
    { id: 'Identities', icon: Fingerprint }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/hr/employees')} className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-colors border border-[var(--border-color)]">
            <ArrowLeft size={20} className="text-[var(--text-main)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">Employee Profile</h1>
            <p className="text-[13px] text-[var(--text-muted)] mt-1 font-medium">{employee.full_name} • {employee.emp_code}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px] transition-colors border ${
            isEditing 
              ? 'bg-[var(--bg-workspace)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-card)]'
              : 'bg-[var(--accent)] border-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent)]/20'
          }`}
        >
          {isEditing ? <X size={16} /> : <Edit size={16} />}
          <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
        </button>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 mb-6 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[var(--bg-workspace)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden flex-shrink-0">
          {employee.image_url ? (
            <img src={employee.image_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-black text-[var(--accent)]">
              {employee.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[var(--text-main)]">{employee.full_name}</h2>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-md">Active</span>
          </div>
          <p className="text-[14px] font-medium text-[var(--text-secondary)] mt-1">ID: {employee.emp_code}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] mb-8 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 font-bold text-[14px] transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            <tab.icon size={18} />
            {tab.id}
          </button>
        ))}
      </div>

      <div className={!isEditing ? 'read-only-profile' : ''}>
          {/* Tab Content: Personal */}
      {activeTab === 'Personal' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><User size={20} /></span>
              Personal Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Email Address" type="email" disabled={true} value={employee.email || ''} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Mobile Number" type="text" disabled={!isEditing} value={personalInfo.mobile_number} onChange={e => setPersonalInfo({...personalInfo, mobile_number: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Nickname" type="text" disabled={!isEditing} value={personalInfo.nickname} onChange={e => setPersonalInfo({...personalInfo, nickname: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Gender" type="select" disabled={!isEditing} value={personalInfo.gender} onChange={e => setPersonalInfo({...personalInfo, gender: e.target.value})} isEditing={isEditing} options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }]} />
              </div>
              <div>
                <FormField label="Date of Birth" type="date" disabled={!isEditing} value={personalInfo.dob} onChange={e => setPersonalInfo({...personalInfo, dob: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Blood Group" type="text" disabled={!isEditing} value={personalInfo.blood_group} onChange={e => setPersonalInfo({...personalInfo, blood_group: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Father's Name" type="text" disabled={!isEditing} value={personalInfo.fathers_name} onChange={e => setPersonalInfo({...personalInfo, fathers_name: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Residential Status" type="text" disabled={!isEditing} value={personalInfo.residential_status} onChange={e => setPersonalInfo({...personalInfo, residential_status: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Place of Birth" type="text" disabled={!isEditing} value={personalInfo.place_of_birth} onChange={e => setPersonalInfo({...personalInfo, place_of_birth: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Country of Origin" type="text" disabled={!isEditing} value={personalInfo.country_of_origin} onChange={e => setPersonalInfo({...personalInfo, country_of_origin: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Religion & Caste" type="text" disabled={!isEditing} value={personalInfo.religion_caste} onChange={e => setPersonalInfo({...personalInfo, religion_caste: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Physically Challenged?" type="select" disabled={!isEditing} value={personalInfo.physically_challenged} onChange={e => setPersonalInfo({...personalInfo, physically_challenged: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
              <div>
                <FormField label="Disability Type" type="text" disabled={!isEditing || personalInfo.physically_challenged === 'No'} value={personalInfo.disability_type} onChange={e => setPersonalInfo({...personalInfo, disability_type: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="International Employee?" type="select" disabled={!isEditing} value={personalInfo.international_employee} onChange={e => setPersonalInfo({...personalInfo, international_employee: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
              <div>
                <FormField label="Is Director?" type="select" disabled={!isEditing} value={personalInfo.is_director} onChange={e => setPersonalInfo({...personalInfo, is_director: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
              <div>
                <FormField label="Hobby" type="text" disabled={!isEditing} value={personalInfo.hobby} onChange={e => setPersonalInfo({...personalInfo, hobby: e.target.value})} isEditing={isEditing} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><Fingerprint size={20} /></span>
              Biometric Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Height (cm)" type="number" disabled={!isEditing} value={personalInfo.height} onChange={e => setPersonalInfo({...personalInfo, height: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Weight (kg)" type="number" disabled={!isEditing} value={personalInfo.weight} onChange={e => setPersonalInfo({...personalInfo, weight: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Identification Mark" type="text" disabled={!isEditing} value={personalInfo.identification_mark} onChange={e => setPersonalInfo({...personalInfo, identification_mark: e.target.value})} isEditing={isEditing} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><User size={20} /></span>
              Marital Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Marital Status" type="select" disabled={!isEditing} value={personalInfo.marital_status} onChange={e => setPersonalInfo({...personalInfo, marital_status: e.target.value})} isEditing={isEditing} options={[{ value: "Single", label: "Single" }, { value: "Married", label: "Married" }, { value: "Divorced", label: "Divorced" }, { value: "Widowed", label: "Widowed" }]} />
              </div>
              <div>
                <FormField label="Spouse Name" type="text" disabled={!isEditing || personalInfo.marital_status !== 'Married'} value={personalInfo.spouse_name} onChange={e => setPersonalInfo({...personalInfo, spouse_name: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Marriage Date" type="date" disabled={!isEditing || personalInfo.marital_status !== 'Married'} value={personalInfo.marriage_date} onChange={e => setPersonalInfo({...personalInfo, marriage_date: e.target.value})} isEditing={isEditing} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Job */}
      {activeTab === 'Job' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><Briefcase size={20} /></span>
              Employment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Date of Hiring" type="date" disabled={!isEditing} value={jobInfo.date_of_hiring} onChange={e => setJobInfo({...jobInfo, date_of_hiring: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Confirmation Date" type="date" disabled={!isEditing} value={jobInfo.confirmation_date} onChange={e => setJobInfo({...jobInfo, confirmation_date: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Probation Period" type="text" disabled={!isEditing} value={jobInfo.probation_period} onChange={e => setJobInfo({...jobInfo, probation_period: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Notice Period" type="text" disabled={!isEditing} value={jobInfo.notice_period} onChange={e => setJobInfo({...jobInfo, notice_period: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Current Company Experience" type="text" disabled={!isEditing} value={jobInfo.current_company_experience} onChange={e => setJobInfo({...jobInfo, current_company_experience: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Referred By" type="text" disabled={!isEditing} value={jobInfo.referred_by} onChange={e => setJobInfo({...jobInfo, referred_by: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Reporting Manager" type="text" disabled={!isEditing} value={jobInfo.reporting_manager} onChange={e => setJobInfo({...jobInfo, reporting_manager: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Core Department" isCustomView={true} customView={<div className="px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] font-medium text-[var(--text-main)] opacity-70">{employee.department_name || 'N/A'}</div>} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Core Designation" isCustomView={true} customView={<div className="px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] font-medium text-[var(--text-main)] opacity-70">{employee.designation_name || 'N/A'}</div>} isEditing={isEditing} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><Briefcase size={20} /></span>
              Contract Details & Previous Employment
            </h3>
            <div className="h-[150px] border-2 border-dashed border-[var(--border-color)] rounded-xl flex items-center justify-center text-[var(--text-muted)] font-bold text-[13px] bg-[var(--bg-workspace)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer">
              + Add Contract Details
            </div>
            <div className="h-[150px] border-2 border-dashed border-[var(--border-color)] rounded-xl flex items-center justify-center text-[var(--text-muted)] font-bold text-[13px] bg-[var(--bg-workspace)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer mt-6">
              + Add Previous Employment
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Pay and Benefits */}
      {activeTab === 'Pay and Benefits' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><IndianRupee size={20} /></span>
              Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Name As Per Bank" type="text" disabled={!isEditing} value={payInfo.name_on_account} onChange={e => setPayInfo({...payInfo, name_on_account: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Bank Name" type="text" disabled={!isEditing} value={payInfo.bank_name} onChange={e => setPayInfo({...payInfo, bank_name: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Bank Branch" type="text" disabled={!isEditing} value={payInfo.bank_branch} onChange={e => setPayInfo({...payInfo, bank_branch: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Bank Account No." type="text" disabled={!isEditing} value={payInfo.bank_account_no} onChange={e => setPayInfo({...payInfo, bank_account_no: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="IFSC Code" type="text" disabled={!isEditing} value={payInfo.ifsc_code} onChange={e => setPayInfo({...payInfo, ifsc_code: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Account Type" type="select" disabled={!isEditing} value={payInfo.account_type} onChange={e => setPayInfo({...payInfo, account_type: e.target.value})} isEditing={isEditing} options={[{ value: "Savings", label: "Savings" }, { value: "Current", label: "Current" }]} />
              </div>
              <div>
                <FormField label="Payment Type" type="select" disabled={!isEditing} value={payInfo.payment_type} onChange={e => setPayInfo({...payInfo, payment_type: e.target.value})} isEditing={isEditing} options={[{ value: "Bank Transfer", label: "Bank Transfer" }, { value: "Cheque", label: "Cheque" }, { value: "Cash", label: "Cash" }]} />
              </div>
              <div>
                <FormField label="DD Payable At" type="text" disabled={!isEditing} value={payInfo.dd_payable_at} onChange={e => setPayInfo({...payInfo, dd_payable_at: e.target.value})} isEditing={isEditing} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Statutory */}
      {activeTab === 'Statutory' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><ShieldCheck size={20} /></span>
              ESI Account
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Covered Under ESI?" type="select" disabled={!isEditing} value={statutoryInfo.esi_covered} onChange={e => setStatutoryInfo({...statutoryInfo, esi_covered: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
              <div>
                <FormField label="ESI Number" type="text" disabled={!isEditing || statutoryInfo.esi_covered === 'No'} value={statutoryInfo.esi_number} onChange={e => setStatutoryInfo({...statutoryInfo, esi_number: e.target.value})} isEditing={isEditing} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><ShieldCheck size={20} /></span>
              PF Account
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Covered Under PF?" type="select" disabled={!isEditing} value={statutoryInfo.pf_covered} onChange={e => setStatutoryInfo({...statutoryInfo, pf_covered: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
              <div>
                <FormField label="UAN" type="text" disabled={!isEditing || statutoryInfo.pf_covered === 'No'} value={statutoryInfo.uan} onChange={e => setStatutoryInfo({...statutoryInfo, uan: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="PF No." type="text" disabled={!isEditing || statutoryInfo.pf_covered === 'No'} value={statutoryInfo.pf_no} onChange={e => setStatutoryInfo({...statutoryInfo, pf_no: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="PF Join Date" type="date" disabled={!isEditing || statutoryInfo.pf_covered === 'No'} value={statutoryInfo.pf_join_date} onChange={e => setStatutoryInfo({...statutoryInfo, pf_join_date: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Family PF No." type="text" disabled={!isEditing || statutoryInfo.pf_covered === 'No'} value={statutoryInfo.family_pf_no} onChange={e => setStatutoryInfo({...statutoryInfo, family_pf_no: e.target.value})} isEditing={isEditing} />
              </div>
              <div>
                <FormField label="Existing Member of EPS?" type="select" disabled={!isEditing || statutoryInfo.pf_covered === 'No'} value={statutoryInfo.eps_member} onChange={e => setStatutoryInfo({...statutoryInfo, eps_member: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
              <div>
                <FormField label="Allow Excess EPF Contribution?" type="select" disabled={!isEditing || statutoryInfo.pf_covered === 'No'} value={statutoryInfo.excess_epf} onChange={e => setStatutoryInfo({...statutoryInfo, excess_epf: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
              <div>
                <FormField label="Allow Excess EPS Contribution?" type="select" disabled={!isEditing || statutoryInfo.pf_covered === 'No'} value={statutoryInfo.excess_eps} onChange={e => setStatutoryInfo({...statutoryInfo, excess_eps: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
              <div>
                <FormField label="Note" type="text" disabled={!isEditing || statutoryInfo.pf_covered === 'No'} value={statutoryInfo.pf_note} onChange={e => setStatutoryInfo({...statutoryInfo, pf_note: e.target.value})} isEditing={isEditing} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><ShieldCheck size={20} /></span>
              LWF (Labour Welfare Fund)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Covered Under LWF?" type="select" disabled={!isEditing} value={statutoryInfo.lwf_covered} onChange={e => setStatutoryInfo({...statutoryInfo, lwf_covered: e.target.value})} isEditing={isEditing} options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab Content: Identities */}
      {activeTab === 'Identities' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><Fingerprint size={20} /></span>
                Employee Identity
              </h3>
              {isEditing && <button className="text-[13px] font-bold text-[var(--accent)] hover:text-[var(--accent-hover)]">+ Add Document</button>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="border border-[var(--border-color)] rounded-xl p-5 bg-[var(--bg-workspace)]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-[var(--text-main)] border-l-4 border-emerald-500 pl-3">Permanent Account Number</h4>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><ArrowLeft className="rotate-180" size={16}/></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <FormField label="Document No." type="text" disabled={!isEditing} value={identitiesInfo.pan_doc_no} onChange={e => setIdentitiesInfo({...identitiesInfo, pan_doc_no: e.target.value})} isEditing={isEditing} />
                  </div>
                  <div>
                    <FormField label="Name As Per Document" type="text" disabled={!isEditing} value={identitiesInfo.pan_name} onChange={e => setIdentitiesInfo({...identitiesInfo, pan_name: e.target.value})} isEditing={isEditing} />
                  </div>
                </div>
              </div>

              <div className="border border-[var(--border-color)] rounded-xl p-5 bg-[var(--bg-workspace)]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-[var(--text-main)] border-l-4 border-emerald-500 pl-3">Bank Details for Identification</h4>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><ArrowLeft className="rotate-180" size={16}/></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <FormField label="Document No." type="text" disabled={!isEditing} value={identitiesInfo.bank_doc_no} onChange={e => setIdentitiesInfo({...identitiesInfo, bank_doc_no: e.target.value})} isEditing={isEditing} />
                  </div>
                  <div>
                    <FormField label="Name As Per Document" type="text" disabled={!isEditing} value={identitiesInfo.bank_name_on_doc} onChange={e => setIdentitiesInfo({...identitiesInfo, bank_name_on_doc: e.target.value})} isEditing={isEditing} />
                  </div>
                </div>
              </div>

              <div className="border border-[var(--border-color)] rounded-xl p-5 bg-[var(--bg-workspace)]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-[var(--text-main)] border-l-4 border-emerald-500 pl-3">AADHAAR</h4>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><ArrowLeft className="rotate-180" size={16}/></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <FormField label="Document No." type="text" disabled={!isEditing} value={identitiesInfo.aadhaar_doc_no} onChange={e => setIdentitiesInfo({...identitiesInfo, aadhaar_doc_no: e.target.value})} isEditing={isEditing} />
                  </div>
                  <div>
                    <FormField label="Name As Per Document" type="text" disabled={!isEditing} value={identitiesInfo.aadhaar_name} onChange={e => setIdentitiesInfo({...identitiesInfo, aadhaar_name: e.target.value})} isEditing={isEditing} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      </div>

      {/* Floating Save Button */}
      {isEditing && (
        <div className="flex justify-end sticky bottom-6 z-10 mt-8">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-[var(--accent)] text-white font-bold rounded-xl hover:bg-[var(--accent-hover)] transition-all shadow-xl shadow-[var(--accent)]/30 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            <span>{isSaving ? 'Saving Profile...' : `Save ${activeTab} Info`}</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default EmployeeProfile;
