import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchHREmployeeByIdApi, updateHREmployeeApi, fetchHRMetadataApi, updateHREmployeeRoleApi, fetchHREmployeesApi } from '../../../api/hr';
import { fetchEmployeeLeavesApi } from '../../../api/leaves';
import { getRoles } from '../../../api/roles';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Loader2, Save, User, Briefcase, IndianRupee, ShieldCheck, Fingerprint, Edit, Camera, X, Lock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import ImageCropperModal from '../../../components/shared/ImageCropperModal';
import Breadcrumbs from '../../../components/shared/Breadcrumbs';
import { getImageUrl } from '../../../utils/imageUtils';

import { generateFaceEmbedding } from '../../../utils/faceRecognition';


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
  const { hasPermission } = useAuth();
  const [isEditing, setIsEditing] = useState(queryParams.get('edit') === 'true' && hasPermission('hr', 'edit', 'employees'));
  const [activeTab, setActiveTab] = useState('Personal');
  const [metadata, setMetadata] = useState({ departments: [], designations: [] });
  const [employees, setEmployees] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // Avatar Upload States
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageUploadSrc, setImageUploadSrc] = useState(null);

  // Empty State Fallbacks for View Mode
  useEffect(() => {
    if (!isEditing) {
      const inputs = document.querySelectorAll('.read-only-profile input');
      inputs.forEach(el => {
        if (!el.value) {
          el.placeholder = "—";
        }
      });
      const selects = document.querySelectorAll('.read-only-profile select');
      selects.forEach(el => {
        if (!el.value || el.value === "") {
          const defaultOpt = el.querySelector('option[value=""]');
          if (defaultOpt) defaultOpt.text = "—";
        }
      });
    }
  }, [isEditing, activeTab]);

  const [employeeLeaves, setEmployeeLeaves] = useState({ balances: [], history: [] });
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);

  useEffect(() => {
    if (activeTab === 'Time Off') {
      loadLeaves();
    }
  }, [activeTab]);

  const loadLeaves = async () => {
    try {
      setIsLoadingLeaves(true);
      const res = await fetchEmployeeLeavesApi(id);
      if (res.data?.success) {
        setEmployeeLeaves(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load employee leaves');
    } finally {
      setIsLoadingLeaves(false);
    }
  };

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
    reporting_manager: '',
    contract_details: [],
    previous_employment: []
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
      const [empRes, metaRes, empsRes] = await Promise.all([
        fetchHREmployeeByIdApi(id),
        fetchHRMetadataApi(),
        fetchHREmployeesApi()
      ]);
      
      if (empRes.data?.success) {
        const emp = empRes.data.data;
        setEmployee(emp);
        if (emp.role_id) setSelectedRoleId(emp.role_id.toString());
        if (emp.personal_info) setPersonalInfo({ ...personalInfo, ...emp.personal_info });
        if (emp.job_info) setJobInfo({ ...jobInfo, ...emp.job_info });
        if (emp.pay_info) setPayInfo({ ...payInfo, ...emp.pay_info });
        if (emp.statutory_info) setStatutoryInfo({ ...statutoryInfo, ...emp.statutory_info });
        if (emp.identities_info) setIdentitiesInfo({ ...identitiesInfo, ...emp.identities_info });
      }
      
      if (metaRes.data?.success) {
        setMetadata(metaRes.data.data);
      }
      
      if (empsRes.data?.success) {
        setEmployees(empsRes.data.data);
      }
      
      // Try fetching roles (might fail if not admin, which is fine)
      try {
        const rolesRes = await getRoles();
        if (rolesRes.data?.success) {
          setSystemRoles(rolesRes.data.data);
        }
      } catch (e) {
        console.warn('Could not fetch roles, user may not have permission');
      }

    } catch (error) {
      toast.error('Failed to load employee profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRoleId) return toast.error('Please select a role first');
    try {
      setIsSaving(true);
      const res = await updateHREmployeeRoleApi(id, selectedRoleId);
      if (res.data?.success) {
        toast.success('System role updated successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update system role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContractDetail = () => {
    if (!isEditing) return toast.error('Enable edit mode to add details');
    setJobInfo({ ...jobInfo, contract_details: [...(jobInfo.contract_details || []), { contract_type: '', start_date: '', end_date: '' }] });
  };

  const handleRemoveContractDetail = (index) => {
    const newDetails = [...jobInfo.contract_details];
    newDetails.splice(index, 1);
    setJobInfo({ ...jobInfo, contract_details: newDetails });
  };

  const handleAddPreviousEmployment = () => {
    if (!isEditing) return toast.error('Enable edit mode to add employment');
    setJobInfo({ ...jobInfo, previous_employment: [...(jobInfo.previous_employment || []), { company_name: '', designation: '', start_date: '', end_date: '' }] });
  };

  const handleRemovePreviousEmployment = (index) => {
    const newEmployment = [...jobInfo.previous_employment];
    newEmployment.splice(index, 1);
    setJobInfo({ ...jobInfo, previous_employment: newEmployment });
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUploadSrc(reader.result);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    // reset input
    e.target.value = null;
  };

  const handleCropComplete = async (croppedFile) => {
    setIsCropperOpen(false);
    
    if (!croppedFile) {
      toast.error("Failed to crop image.");
      return;
    }

    // Convert blob to base64 for immediate frontend preview and mock save
    const reader = new FileReader();
    reader.onloadend = () => {
      setEmployee(prev => ({ ...prev, image_url: reader.result }));
      toast.success('Profile picture updated!');
    };
    reader.readAsDataURL(croppedFile);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      let face_embedding = employee.face_embedding || null;
      if (employee.image_url && employee.image_url.startsWith('data:image')) {
        const embedding = await generateFaceEmbedding(employee.image_url);
        if (embedding) {
          face_embedding = embedding;
        } else {
          toast.warning("Could not detect a clear face in the profile picture. Attendance verification might fail for this employee.");
        }
      }

      const payload = {
        personal_info: personalInfo,
        job_info: jobInfo,
        pay_info: payInfo,
        statutory_info: statutoryInfo,
        identities_info: identitiesInfo,
        image_url: employee.image_url,
        face_embedding,
        department_id: employee.department_id || null,
        designation_id: employee.designation_id || null,
        designation_name: employee.designation_name || null,
        manager_id: employee.manager_id || null
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
    { id: 'Identities', icon: Fingerprint },
    { id: 'Time Off', icon: Calendar },
    { id: 'Admin Data', icon: Lock }
  ];

  const breadcrumbItems = [
    { label: 'Employees', path: '/hr/employees' },
    { label: employee.full_name, path: '' }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto pb-12">
      {/* Breadcrumbs Row */}
      <div className="mb-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

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
        {hasPermission('hr', 'edit', 'employees') && (
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
        )}
      </div>

      {/* Profile Summary Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 mb-6 shadow-sm flex items-center gap-6">
        <div className="relative w-20 h-20 rounded-full bg-[var(--bg-workspace)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden flex-shrink-0 group">
          {employee.image_url ? (
            <img src={getImageUrl(employee.image_url)} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-black text-[var(--accent)]">
              {employee.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          )}
          
          {/* Avatar Upload Overlay */}
          {isEditing && (
            <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all">
              <Camera size={24} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </label>
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
                <FormField label="Blood Group" type="select" disabled={!isEditing} value={personalInfo.blood_group} onChange={e => setPersonalInfo({...personalInfo, blood_group: e.target.value})} isEditing={isEditing} options={[{ value: "", label: "Select" }, { value: "A+", label: "A+" }, { value: "A-", label: "A-" }, { value: "B+", label: "B+" }, { value: "B-", label: "B-" }, { value: "AB+", label: "AB+" }, { value: "AB-", label: "AB-" }, { value: "O+", label: "O+" }, { value: "O-", label: "O-" }]} />
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
                <FormField 
                  label="Reporting Manager" 
                  type="select" 
                  disabled={!isEditing} 
                  value={employee.manager_id || ''} 
                  onChange={e => setEmployee({...employee, manager_id: e.target.value})} 
                  isEditing={isEditing}
                  readOnlyText={employee.manager_id ? employees.find(emp => emp.employee_id === employee.manager_id)?.full_name || 'Unknown' : 'None (Top Level)'}
                  options={[
                    { value: '', label: 'None (Top Level)' },
                    ...employees.filter(emp => emp.employment_status !== 'Terminated' && emp.employee_id !== employee.employee_id).map(emp => ({ value: emp.employee_id, label: `${emp.full_name} (${emp.emp_code})` }))
                  ]}
                />
              </div>
              <div>
                <FormField 
                  label="Core Department" 
                  type="select" 
                  disabled={!isEditing} 
                  value={employee.department_id || ''} 
                  onChange={e => setEmployee({...employee, department_id: e.target.value, designation_id: ''})} 
                  isEditing={isEditing} 
                  readOnlyText={employee.department_name}
                  options={[
                    { value: '', label: 'Select Department' },
                    ...(metadata.departments || []).map(d => ({ value: d.department_id, label: d.name }))
                  ]} 
                />
              </div>
              <div>
                <FormField 
                  label="Core Designation" 
                  type="text" 
                  disabled={!isEditing} 
                  value={employee.designation_name || ''} 
                  onChange={e => setEmployee({...employee, designation_name: e.target.value, designation_id: null})} 
                  isEditing={isEditing} 
                  readOnlyText={employee.designation_name}
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-[var(--accent)]"><Briefcase size={20} /></span>
              Contract Details & Previous Employment
            </h3>
            
            <div className="mb-6">
              <h4 className="text-md font-bold text-[var(--text-main)] mb-4">Contract Details</h4>
              {jobInfo.contract_details?.map((contract, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 pt-8 border border-[var(--border-color)] rounded-xl relative">
                  {isEditing && (
                    <button onClick={() => handleRemoveContractDetail(index)} className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-red-50 p-1 rounded-md">
                      <X size={16} />
                    </button>
                  )}
                  <FormField label="Contract Type" value={contract.contract_type} onChange={e => {
                    const newDetails = [...jobInfo.contract_details];
                    newDetails[index].contract_type = e.target.value;
                    setJobInfo({...jobInfo, contract_details: newDetails});
                  }} isEditing={isEditing} />
                  <FormField label="Start Date" type="date" value={contract.start_date} onChange={e => {
                    const newDetails = [...jobInfo.contract_details];
                    newDetails[index].start_date = e.target.value;
                    setJobInfo({...jobInfo, contract_details: newDetails});
                  }} isEditing={isEditing} />
                  <FormField label="End Date" type="date" value={contract.end_date} onChange={e => {
                    const newDetails = [...jobInfo.contract_details];
                    newDetails[index].end_date = e.target.value;
                    setJobInfo({...jobInfo, contract_details: newDetails});
                  }} isEditing={isEditing} />
                </div>
              ))}
              {isEditing && (
                <div onClick={handleAddContractDetail} className="h-[60px] border-2 border-dashed border-[var(--border-color)] rounded-xl flex items-center justify-center text-[var(--text-muted)] font-bold text-[13px] bg-[var(--bg-workspace)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer">
                  + Add Contract Details
                </div>
              )}
              {!isEditing && (!jobInfo.contract_details || jobInfo.contract_details.length === 0) && (
                <p className="text-[13px] text-[var(--text-muted)] italic">No contract details added.</p>
              )}
            </div>

            <div>
              <h4 className="text-md font-bold text-[var(--text-main)] mb-4">Previous Employment</h4>
              {jobInfo.previous_employment?.map((emp, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 pt-8 border border-[var(--border-color)] rounded-xl relative">
                  {isEditing && (
                    <button onClick={() => handleRemovePreviousEmployment(index)} className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-red-50 p-1 rounded-md">
                      <X size={16} />
                    </button>
                  )}
                  <FormField label="Company Name" value={emp.company_name} onChange={e => {
                    const newEmp = [...jobInfo.previous_employment];
                    newEmp[index].company_name = e.target.value;
                    setJobInfo({...jobInfo, previous_employment: newEmp});
                  }} isEditing={isEditing} />
                  <FormField label="Designation" value={emp.designation} onChange={e => {
                    const newEmp = [...jobInfo.previous_employment];
                    newEmp[index].designation = e.target.value;
                    setJobInfo({...jobInfo, previous_employment: newEmp});
                  }} isEditing={isEditing} />
                  <FormField label="Start Date" type="date" value={emp.start_date} onChange={e => {
                    const newEmp = [...jobInfo.previous_employment];
                    newEmp[index].start_date = e.target.value;
                    setJobInfo({...jobInfo, previous_employment: newEmp});
                  }} isEditing={isEditing} />
                  <FormField label="End Date" type="date" value={emp.end_date} onChange={e => {
                    const newEmp = [...jobInfo.previous_employment];
                    newEmp[index].end_date = e.target.value;
                    setJobInfo({...jobInfo, previous_employment: newEmp});
                  }} isEditing={isEditing} />
                </div>
              ))}
              {isEditing && (
                <div onClick={handleAddPreviousEmployment} className="h-[60px] border-2 border-dashed border-[var(--border-color)] rounded-xl flex items-center justify-center text-[var(--text-muted)] font-bold text-[13px] bg-[var(--bg-workspace)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer">
                  + Add Previous Employment
                </div>
              )}
              {!isEditing && (!jobInfo.previous_employment || jobInfo.previous_employment.length === 0) && (
                <p className="text-[13px] text-[var(--text-muted)] italic">No previous employment details added.</p>
              )}
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

      {/* Tab Content: Admin Data */}
      {activeTab === 'Admin Data' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-rose-500"><IndianRupee size={20} /></span>
              Compensation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
              <div>
                <FormField label="Base Salary (LPA / Annual)" type="number" disabled={!isEditing} value={employee.base_salary} onChange={e => setEmployee({...employee, base_salary: e.target.value})} isEditing={isEditing} />
              </div>
            </div>
            {!isEditing && (
              <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-3">
                <Lock className="text-rose-500 mt-0.5" size={16} />
                <p className="text-[12px] text-rose-700 font-medium">This section contains highly sensitive compensation data. It is only visible to administrators and HR managers.</p>
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="p-2 bg-[var(--bg-workspace)] rounded-lg text-purple-500"><Lock size={20} /></span>
              System Access Control
            </h3>
            <div className="max-w-md">
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Assign System Role</label>
              <div className="flex gap-3 items-center">
                <select 
                  className="flex-1 px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] focus:outline-none focus:border-[var(--accent)]"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                >
                  <option value="">Select a Role...</option>
                  {systemRoles.map(role => (
                    <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                  ))}
                </select>
                <button 
                  onClick={handleUpdateRole}
                  disabled={!selectedRoleId || isSaving}
                  className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  Apply Role
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">Changing the role will immediately update the user's permissions and access level across the entire platform.</p>
            </div>
          </div>
        </div>
      )}

      {/* Time Off Tab */}
      {activeTab === 'Time Off' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-6">Leave Balances</h2>
            {isLoadingLeaves ? (
              <div className="flex justify-center p-6"><Loader2 className="animate-spin text-[var(--accent)]" /></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(() => {
                  const defaultBalances = { 
                    'Paid Leave': {total:12,used:0}, 
                    'Sick Leave': {total:6,used:0}, 
                    'Complementary Leave': {total:0,used:0},
                    'Emergency Leave': {total:3,used:0},
                    'LOP (Loss Of Pay)': {total:0,used:0}
                  };
                  let formattedBalances = { ...defaultBalances };
                  employeeLeaves.balances.forEach(b => {
                    formattedBalances[b.leave_type] = { total: parseFloat(b.total_days), used: parseFloat(b.used_days) };
                  });
                  
                  return Object.entries(formattedBalances).map(([type, bal], idx) => (
                    <div key={idx} className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-black text-[var(--accent)]">{bal.total - bal.used}</span>
                      <span className="text-[11px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-wider">{type}</span>
                      <span className="text-[10px] text-[var(--text-dim)] mt-0.5">Used: {bal.used}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-6">Leave History</h2>
            {isLoadingLeaves ? (
              <div className="flex justify-center p-6"><Loader2 className="animate-spin text-[var(--accent)]" /></div>
            ) : (
              <div className="space-y-4">
                {employeeLeaves.history.map(req => (
                  <div key={req.id} className="flex justify-between items-center bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--text-main)]">{req.leave_type}</h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">
                        {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()} 
                        {req.is_half_day && ` (${req.half_day_type})`}
                      </p>
                      {req.reason && <p className="text-[11px] text-[var(--text-dim)] mt-1 italic">"{req.reason}"</p>}
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                      req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                      'bg-orange-50 text-orange-600 border border-orange-200'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
                {employeeLeaves.history.length === 0 && (
                  <div className="text-[13px] text-[var(--text-muted)] text-center py-4">No leave history found.</div>
                )}
              </div>
            )}
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

      {/* Image Cropper Modal */}
      {isCropperOpen && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          imageSrc={imageUploadSrc}
          onCropComplete={handleCropComplete}
        />
      )}

    </div>
  );
};

export default EmployeeProfile;
