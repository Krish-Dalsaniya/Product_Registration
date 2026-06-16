import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Save, User, Briefcase, IndianRupee, FileText, ChevronRight, Check, CreditCard } from 'lucide-react';
import { fetchHRMetadataApi, createHREmployeeApi } from '../../../api/hr';
import { getRoles } from '../../../api/roles';

const STEPS = [
  { id: 1, label: 'Personal', icon: User },
  { id: 2, label: 'Job', icon: Briefcase },
  { id: 3, label: 'Pay & Benefits', icon: IndianRupee },
  { id: 4, label: 'Statutory', icon: FileText },
  { id: 5, label: 'Identities', icon: CreditCard }
];

const AddEmployeeWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState({ departments: [], designations: [], available_users: [] });
  const [systemRoles, setSystemRoles] = useState([]);

  const [formData, setFormData] = useState({
    user_id: '', role_id: '', full_name: '', email: '', phone_number: '', 
    department_id: '', designation_id: '', designation_name: '',
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
    loadMetadata();
    loadRoles();
  }, []);

  const loadMetadata = async () => {
    try {
      const res = await fetchHRMetadataApi();
      if (res.data?.success) setMetadata(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRoles = async () => {
    try {
      const rolesRes = await getRoles();
      if (rolesRes.data?.success) setSystemRoles(rolesRes.data.data);
    } catch (e) {
      console.warn('Could not fetch roles');
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.full_name || !formData.email) {
        toast.error('Please fill out all mandatory fields in the Personal step (Name, Email).');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.department_id || !(formData.designation_name || formData.designation_id) || !formData.date_of_joining) {
        toast.error('Please fill out all mandatory fields in the Job step (Department, Designation, DOJ).');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.department_id || !(formData.designation_name || formData.designation_id) || !formData.date_of_joining) {
      toast.error('Please ensure all mandatory Personal and Job fields are filled before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createHREmployeeApi(formData);
      if (res.data?.success) {
        toast.success('Employee created successfully');
        navigate('/hr/employees');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reverting to balanced styling classes (normal font sizes/padding, but tight layout margins)
  const inputClass = "w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 px-4 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1.5";
  const sectionTitleClass = "text-[14px] font-black uppercase tracking-widest text-[var(--text-main)] border-b border-[var(--border-color)] pb-2 mb-5 flex items-center gap-2";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 mt-2 animate-entrance-down">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/hr/employees')} className="p-2.5 hover:bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-colors bg-[var(--bg-workspace)] shadow-sm">
            <ArrowLeft size={20} className="text-[var(--text-main)]" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Onboard Employee</h1>
            <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
              Add a new team member to the workspace
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="workspace-card p-5 mb-6 relative z-10">
        <div className="flex items-center justify-between relative max-w-[800px] mx-auto">
          <div className="absolute top-6 left-[10%] w-[80%] h-1 bg-[var(--bg-workspace)] -z-10 -translate-y-1/2 rounded-full overflow-hidden border border-[var(--border-color)]">
            <div 
              className="h-full transition-all duration-500 ease-out"
              style={{ 
                width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                background: 'var(--grad-button)'
              }}
            />
          </div>
          
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex-1 flex flex-col items-center gap-3 relative">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 border-[3px] shadow-sm ${
                    isActive ? 'border-[var(--accent)] text-white scale-110 shadow-[0_0_15px_var(--border-glow)]' : 
                    isCompleted ? 'border-[var(--accent)] text-white' : 
                    'bg-[var(--bg-workspace)] text-[var(--text-muted)] border-[var(--border-color)]'
                  }`}
                  style={{ background: (isActive || isCompleted) ? 'var(--grad-button)' : '' }}
                >
                  {isCompleted ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest hidden md:block w-max text-center ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-dim)]'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Area */}
      <div className="workspace-card overflow-hidden flex flex-col min-h-[400px]">
        <form id="wizard-form" onSubmit={handleSubmit} className="p-6 lg:p-8 flex-1 bg-[var(--bg-workspace)]">
          
          {/* STEP 1: Personal */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="workspace-card p-6 border-none shadow-none bg-transparent">
                  <h3 className={sectionTitleClass}>
                    <User size={18} className="text-[var(--accent)]" /> Account Details
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className={labelClass}>Link Existing System User (Optional)</label>
                      <select 
                        value={formData.user_id} 
                        onChange={e => {
                          const uid = e.target.value;
                          const user = metadata.available_users.find(u => u.user_id === uid);
                          if (user) setFormData({...formData, user_id: uid, full_name: user.full_name, email: user.email});
                          else setFormData({...formData, user_id: '', full_name: '', email: ''});
                        }}
                        className={inputClass}
                      >
                        <option value="">-- Create a New User --</option>
                        {metadata.available_users?.map(u => (
                          <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.email})</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-[var(--text-dim)] mt-2 italic">Select an existing account, or leave blank to create a new one.</p>
                    </div>

                    <div>
                      <label className={labelClass}>System Role *</label>
                      <select value={formData.role_id} onChange={e => setFormData({...formData, role_id: e.target.value})} className={inputClass} disabled={!!formData.user_id}>
                        <option value="">Default (User)</option>
                        {systemRoles.map(role => (
                          <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Full Name *</label>
                        <input disabled={!!formData.user_id} type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className={inputClass} />
                      </div>
                      
                      <div>
                        <label className={labelClass}>Email Address *</label>
                        <input disabled={!!formData.user_id} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="text" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div className="workspace-card p-6 border-none shadow-none bg-transparent">
                  <h3 className={sectionTitleClass}>
                    <User size={18} className="text-[var(--accent)]" /> Personal Profile
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Gender</label>
                      <select value={formData.personal_info.gender} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, gender: e.target.value}})} className={inputClass}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Date of Birth</label>
                      <input type="date" value={formData.personal_info.dob} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, dob: e.target.value}})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Blood Group</label>
                      <select value={formData.personal_info.blood_group} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, blood_group: e.target.value}})} className={inputClass}>
                        <option value="">Select</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Father's Name</label>
                      <input type="text" value={formData.personal_info.fathers_name} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, fathers_name: e.target.value}})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Religion & Caste</label>
                      <input type="text" value={formData.personal_info.religion_caste} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, religion_caste: e.target.value}})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Marital Status</label>
                      <select value={formData.personal_info.marital_status} onChange={e => setFormData({...formData, personal_info: {...formData.personal_info, marital_status: e.target.value}})} className={inputClass}>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Job */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
              <h3 className={sectionTitleClass}>
                <Briefcase size={18} className="text-[var(--accent)]" /> Core Job Info
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Department *</label>
                  <select value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value, designation_id: null, designation_name: ''})} className={inputClass}>
                    <option value="">Select Department</option>
                    {metadata.departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Designation *</label>
                  <input type="text" value={formData.designation_name || ''} onChange={e => setFormData({...formData, designation_name: e.target.value, designation_id: null})} placeholder="e.g. Software Engineer" className={inputClass} disabled={!formData.department_id} />
                </div>
                <div>
                  <label className={labelClass}>Date of Joining *</label>
                  <input type="date" value={formData.date_of_joining} onChange={e => setFormData({...formData, date_of_joining: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Employment Status</label>
                  <select value={formData.employment_status} onChange={e => setFormData({...formData, employment_status: e.target.value})} className={inputClass}>
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
                <div className="col-span-full">
                  <label className={labelClass}>Work Location</label>
                  <input type="text" placeholder="e.g. New York, Remote" value={formData.work_location} onChange={e => setFormData({...formData, work_location: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Pay & Benefits */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
              <h3 className={sectionTitleClass}>
                <IndianRupee size={18} className="text-[var(--accent)]" /> Salary & Bank Details
              </h3>
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Base Salary (Annual)</label>
                  <input type="number" placeholder="e.g. 75000" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Bank Name</label>
                    <input type="text" value={formData.pay_info.bank_name} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, bank_name: e.target.value}})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Account No.</label>
                    <input type="text" value={formData.pay_info.bank_account_no} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, bank_account_no: e.target.value}})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>IFSC Code</label>
                    <input type="text" value={formData.pay_info.ifsc_code} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, ifsc_code: e.target.value}})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Payment Type</label>
                    <select value={formData.pay_info.payment_type} onChange={e => setFormData({...formData, pay_info: {...formData.pay_info, payment_type: e.target.value}})} className={inputClass}>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Statutory */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
              <h3 className={sectionTitleClass}>Statutory Declarations</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="workspace-card p-6 bg-[var(--bg-card)] space-y-5">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <span className="font-black text-[var(--text-main)] uppercase tracking-wider text-sm">Provident Fund (PF)</span>
                    <select value={formData.statutory_info.pf_covered} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, pf_covered: e.target.value}})} className="px-3 py-1.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] outline-none">
                      <option value="No">Not Covered</option>
                      <option value="Yes">Covered</option>
                    </select>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 transition-opacity duration-300 ${formData.statutory_info.pf_covered === 'No' ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div>
                      <label className={labelClass}>UAN</label>
                      <input type="text" value={formData.statutory_info.uan} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, uan: e.target.value}})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>PF No.</label>
                      <input type="text" value={formData.statutory_info.pf_no} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, pf_no: e.target.value}})} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div className="workspace-card p-6 bg-[var(--bg-card)] space-y-5">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <span className="font-black text-[var(--text-main)] uppercase tracking-wider text-sm">ESIC Account</span>
                    <select value={formData.statutory_info.esi_covered} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, esi_covered: e.target.value}})} className="px-3 py-1.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] outline-none">
                      <option value="No">Not Covered</option>
                      <option value="Yes">Covered</option>
                    </select>
                  </div>
                  <div className={`transition-opacity duration-300 ${formData.statutory_info.esi_covered === 'No' ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className={labelClass}>ESI Number</label>
                    <input type="text" value={formData.statutory_info.esi_number} onChange={e => setFormData({...formData, statutory_info: {...formData.statutory_info, esi_number: e.target.value}})} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Identities */}
          {currentStep === 5 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
              <h3 className={sectionTitleClass}>
                <CreditCard size={18} className="text-[var(--accent)]" /> Identity Documents
              </h3>
              <div className="space-y-6">
                <div className="bg-[var(--bg-workspace)] p-5 rounded-xl border border-[var(--border-color)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] mb-4 uppercase tracking-wider">PAN Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Document No.</label>
                      <input type="text" value={formData.identities_info.pan_doc_no} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, pan_doc_no: e.target.value}})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Name As Per PAN</label>
                      <input type="text" value={formData.identities_info.pan_name} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, pan_name: e.target.value}})} className={inputClass} />
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--bg-workspace)] p-5 rounded-xl border border-[var(--border-color)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] mb-4 uppercase tracking-wider">Aadhaar Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Document No.</label>
                      <input type="text" value={formData.identities_info.aadhaar_doc_no} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, aadhaar_doc_no: e.target.value}})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Name As Per Aadhaar</label>
                      <input type="text" value={formData.identities_info.aadhaar_name} onChange={e => setFormData({...formData, identities_info: {...formData.identities_info, aadhaar_name: e.target.value}})} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="bg-[var(--bg-card)] border-t border-[var(--border-color)] p-5 px-8 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.1)] relative z-10">
          <div className="text-[13px] font-black text-[var(--text-muted)] uppercase tracking-widest">
            Step {currentStep} of {STEPS.length}
          </div>
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={handlePrev} 
              disabled={currentStep === 1 || isSubmitting}
              className="px-6 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-[14px] font-bold rounded-xl hover:border-[var(--text-muted)] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm"
            >
              Back
            </button>
            
            {currentStep < STEPS.length ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="btn-primary"
              >
                <span>Continue</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>Create Employee</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeWizard;
