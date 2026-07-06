import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { generateFaceEmbedding } from '../../../utils/faceRecognition';
import { Loader2, ArrowLeft, Save, User, Briefcase, IndianRupee, FileText, ChevronRight, Check, CreditCard, ClipboardCheck, UploadCloud, Camera, MapPin, PhoneCall, Trash2 } from 'lucide-react';
import { fetchHRMetadataApi, createHREmployeeApi, fetchHREmployeesApi, createOnboardingRecordApi, extractOnboardingZipApi, registerEmployeeApi, fetchCandidatesApi, updateCandidateStatusApi } from '../../../api/hr';
import { getRoles } from '../../../api/roles';
import ImageCropperModal from '../../../components/shared/ImageCropperModal';

const STEPS = [
  { id: 1, label: 'Personal', icon: User },
  { id: 2, label: 'Job', icon: Briefcase },
  { id: 3, label: 'Pay & Benefits', icon: IndianRupee },
  { id: 4, label: 'Statutory', icon: FileText },
  { id: 5, label: 'Identities', icon: CreditCard },
  { id: 6, label: 'Review', icon: ClipboardCheck }
];

const INITIAL_FORM_DATA = {
  user_id: '', role_id: '', full_name: '', email: '', phone_number: '', image_url: '', password: '', confirmPassword: '', company_code: '',
  department_id: '', designation_id: '', designation_name: '', manager_id: '',
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
  address_info: {
    current_address: '', current_city: '', current_state: '', current_zip: '', current_country: 'India',
    permanent_address: '', permanent_city: '', permanent_state: '', permanent_zip: '', permanent_country: 'India',
    same_as_current: false
  },
  emergency_contacts: [
    { name: '', relation: '', phone: '', email: '' }
  ],
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
    aadhaar_doc_no: '', aadhaar_name: '',
    education_type: 'Degree'
  }
};

const DocumentDropzone = ({ label, id, isUploaded, setUploadMock, onUpload }) => (
  <div className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent)] transition-colors rounded-xl p-6 flex flex-col items-center justify-center bg-[var(--bg-card)] cursor-pointer relative group h-[140px]">
     {isUploaded ? (
       <>
        <Check size={32} className="text-green-500 mb-3" />
        <p className="text-[13px] font-bold text-[var(--text-main)]">{label} Uploaded</p>
       </>
     ) : (
       <>
        <UploadCloud size={32} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-3" />
        <p className="text-[13px] font-bold text-[var(--text-main)]">Drop {label} here or click to browse</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">PDF, JPG, PNG up to 5MB</p>
       </>
     )}
     <input 
       type="file" 
       className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
       accept=".pdf,image/*" 
       onChange={(e) => {
         if(e.target.files?.length) {
           const file = e.target.files[0];
           setUploadMock(prev => ({...prev, [id]: true}));
           toast.success(`${label} attached`);
           if (onUpload) {
             const reader = new FileReader();
             reader.onloadend = () => {
               onUpload(reader.result);
             };
             reader.readAsDataURL(file);
           }
         }
       }}
     />
  </div>
);

const AddEmployeeWizard = ({ isPublicRegistration = false }) => {
  useEffect(() => {
    console.log("AddEmployeeWizard MOUNTED", new Date().toISOString());
    return () => console.log("AddEmployeeWizard UNMOUNTED", new Date().toISOString());
  }, []);
  console.log("AddEmployeeWizard RENDERED", new Date().toISOString());
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const candidateId = searchParams.get('candidateId');
  
  const [formData, setFormData] = useState(() => {
    const draft = localStorage.getItem('employee_wizard_draft');
    if (draft) {
      try { return JSON.parse(draft).formData; } catch(e){}
    }
    return INITIAL_FORM_DATA;
  });

  const [currentStep, setCurrentStep] = useState(() => {
    const draft = localStorage.getItem('employee_wizard_draft');
    if (draft) {
      try { return JSON.parse(draft).currentStep || 1; } catch(e){}
    }
    return 1;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [metadata, setMetadata] = useState({ departments: [], designations: [], available_users: [] });
  const [employees, setEmployees] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
  const [uploadMock, setUploadMock] = useState({ 
    avatar: false, pan: false, aadhaar: false,
    marksheet_10th: false, marksheet_12th: false,
    sem_1: false, sem_2: false, sem_3: false, sem_4: false,
    sem_5: false, sem_6: false, sem_7: false, sem_8: false
  });
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);

  useEffect(() => {
    if (!isPublicRegistration) {
      loadMetadata();
      loadRoles();
      loadEmployees();
    }
  }, [isPublicRegistration]);

  useEffect(() => {
    if (candidateId) {
      loadCandidateData(candidateId);
    }
  }, [candidateId]);

  const loadCandidateData = async (id) => {
    try {
      const res = await fetchCandidatesApi();
      if (res.data?.success) {
        const candidate = res.data.data.find(c => c.id === parseInt(id) || c.id === id);
        if (candidate) {
          setFormData(prev => ({
            ...prev,
            full_name: candidate.name || prev.full_name,
            email: candidate.email || prev.email,
            phone_number: candidate.phone || prev.phone_number,
            designation_name: candidate.applied_for || prev.designation_name,
            address_info: {
              ...prev.address_info,
              current_city: candidate.location || prev.address_info.current_city
            }
          }));
          // Pre-fill resume document URL if applicable
          if (candidate.document_url) {
            // we can simulate setting the uploaded mock if we want it to visually reflect
            // For now, we'll just keep it in formData or rely on the HR admin verifying it.
          }
          toast.success('Pre-filled data from Candidate profile');
        }
      }
    } catch (err) {
      console.error('Failed to load candidate data', err);
    }
  };

  // Auto-save draft (debounced to prevent UI lag on selections)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('employee_wizard_draft', JSON.stringify({ formData, currentStep }));
    }, 500);
    return () => clearTimeout(timer);
  }, [formData, currentStep]);

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

  const loadEmployees = async () => {
    try {
      const res = await fetchHREmployeesApi();
      if (res.data?.success) setEmployees(res.data.data);
    } catch (e) {
      console.warn('Could not fetch employees');
    }
  };

  const handleAvatarSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageSrc(reader.result);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input so same file can be selected again
    }
  };

  const handleCropComplete = async (croppedFile) => {
    setIsCropperOpen(false);
    if (!croppedFile) {
      toast.error("Failed to crop image.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setCroppedImageUrl(reader.result);
      setUploadMock(prev => ({...prev, avatar: true}));
      setFormData(prev => ({...prev, image_url: reader.result}));
    };
    reader.readAsDataURL(croppedFile);
  };

  const handleClearDraft = () => {
    localStorage.removeItem('employee_wizard_draft');
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    toast.success('Draft cleared');
  };

  const handleZipUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const uploadFormData = new FormData();
      uploadFormData.append('zipFile', file);
      
      setIsExtracting(true);
      toast.loading('Analyzing ZIP contents using AI...', { id: 'zip-upload' });
      try {
        const res = await extractOnboardingZipApi(uploadFormData);
        if (res.data?.success && res.data?.data) {
          const extracted = res.data.data;
          const extractedDocs = res.data.documents;
          
          setFormData(prev => ({
            ...prev,
            full_name: extracted.full_name || prev.full_name,
            email: extracted.email || prev.email,
            phone_number: extracted.phone_number || prev.phone_number,
            personal_info: {
              ...prev.personal_info,
              dob: extracted.dob || prev.personal_info.dob,
              gender: extracted.gender || prev.personal_info.gender,
              fathers_name: extracted.fathers_name || prev.personal_info.fathers_name,
              marital_status: extracted.marital_status || prev.personal_info.marital_status,
              blood_group: extracted.blood_group || prev.personal_info.blood_group,
              spouse_name: extracted.spouse_name || prev.personal_info.spouse_name,
              marriage_date: extracted.marriage_date || prev.personal_info.marriage_date
            },
            address_info: {
              ...prev.address_info,
              current_address: extracted.current_address || prev.address_info.current_address,
              current_city: extracted.current_city || prev.address_info.current_city,
              current_state: extracted.current_state || prev.address_info.current_state,
              current_zip: extracted.current_zip || prev.address_info.current_zip,
              permanent_address: extracted.current_address || prev.address_info.permanent_address,
              permanent_city: extracted.current_city || prev.address_info.permanent_city,
              permanent_state: extracted.current_state || prev.address_info.permanent_state,
              permanent_zip: extracted.current_zip || prev.address_info.permanent_zip,
              same_as_current: true
            },
            pay_info: {
              ...prev.pay_info,
              bank_name: extracted.bank_name || prev.pay_info.bank_name,
              bank_account_no: extracted.bank_account_no || prev.pay_info.bank_account_no,
              ifsc_code: extracted.ifsc_code || prev.pay_info.ifsc_code,
              name_on_account: extracted.full_name || prev.pay_info.name_on_account
            },
            statutory_info: {
              ...prev.statutory_info,
              esi_covered: extracted.esi_number ? 'Yes' : prev.statutory_info.esi_covered,
              esi_number: extracted.esi_number || prev.statutory_info.esi_number,
              pf_covered: extracted.pf_no ? 'Yes' : prev.statutory_info.pf_covered,
              pf_no: extracted.pf_no || prev.statutory_info.pf_no,
              uan: extracted.uan || prev.statutory_info.uan
            },
            identities_info: {
              ...prev.identities_info,
              pan_doc_no: extracted.pan_doc_no || prev.identities_info.pan_doc_no,
              pan_name: extracted.pan_name || prev.identities_info.pan_name,
              aadhaar_doc_no: extracted.aadhaar_doc_no || prev.identities_info.aadhaar_doc_no,
              aadhaar_name: extracted.aadhaar_name || prev.identities_info.aadhaar_name,
              bank_doc_no: extracted.bank_account_no || prev.identities_info.bank_doc_no,
              bank_name_on_doc: extracted.full_name || prev.identities_info.bank_name_on_doc,
              ...(extractedDocs || {})
            }
          }));

          if (extractedDocs && Object.keys(extractedDocs).length > 0) {
            setUploadMock(prev => {
              const newMock = { ...prev };
              Object.keys(extractedDocs).forEach(key => newMock[key] = true);
              return newMock;
            });
          }
          
          toast.success('Successfully extracted and filled data!', { id: 'zip-upload' });
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to extract data from ZIP file.', { id: 'zip-upload' });
      } finally {
        setIsExtracting(false);
        e.target.value = '';
      }
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.full_name || !formData.email) {
        toast.error('Please fill out all mandatory fields in the Personal step (Name, Email).');
        return;
      }
      if (!formData.user_id) {
        if (!formData.password || formData.password.length < 6) {
          toast.error('Please provide a temporary password with at least 6 characters.');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match.');
          return;
        }
      }
    } else if (currentStep === 2) {
      const hasDesignation = (formData.designation_name && formData.designation_name.trim() !== '') || formData.designation_id;
      if (!hasDesignation || !formData.date_of_joining || !formData.department_id) {
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
    if (e) e.preventDefault();
    if (currentStep < STEPS.length) {
      handleNext();
      return;
    }
    const hasDesignation = (formData.designation_name && formData.designation_name.trim() !== '') || formData.designation_id;
    if (!formData.full_name?.trim() || !formData.email?.trim() || !hasDesignation || !formData.date_of_joining || !formData.department_id) {
      toast.error('Please ensure all mandatory Personal and Job fields are filled before submitting.');
      return;
    }
    
    if (!formData.user_id && (!formData.password || formData.password.length < 6 || formData.password !== formData.confirmPassword)) {
      toast.error('Please provide a valid temporary password in Step 1.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      let face_embedding = null;
      if (formData.image_url && formData.image_url.startsWith('data:image')) {
        const embedding = await generateFaceEmbedding(formData.image_url);
        if (embedding) {
          face_embedding = embedding;
        } else {
          toast.warning("Could not detect a clear face in the profile picture. Attendance verification might fail for this employee.");
        }
      }
      
      const payload = { ...formData, face_embedding };
      
      if (isPublicRegistration) {
        const res = await registerEmployeeApi(payload);
        if (res.data?.success) {
          toast.success('Registration submitted! Please wait for admin approval.');
          localStorage.removeItem('employee_wizard_draft');
          navigate('/login');
        }
      } else {
        const res = await createHREmployeeApi(payload);
        if (res.data?.success) {
          if (candidateId) {
            try {
              await updateCandidateStatusApi(candidateId, 'Hired');
            } catch(e) {
              console.warn('Failed to update candidate status to Hired', e);
            }
          }
          if (isOnboarding) {
              // Automatically create onboarding record
              await createOnboardingRecordApi({
                  employee_id: res.data.employee_id,
                  offer_acceptance_date: formData.date_of_joining // Assume DOJ or today
              });
              toast.success('Onboarding initiated successfully');
              localStorage.removeItem('employee_wizard_draft');
              navigate('/hr/onboarding');
          } else {
              toast.success('Employee created successfully');
              localStorage.removeItem('employee_wizard_draft');
              navigate(candidateId ? '/hr/onboarding' : '/hr/employees');
          }
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePANChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 10) val = val.slice(0, 10);
    setFormData(prev => ({...prev, identities_info: {...prev.identities_info, pan_doc_no: val}}));
  };

  const handleAadhaarChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 12) val = val.slice(0, 12);
    let formatted = val.match(/.{1,4}/g)?.join('-') || val;
    setFormData(prev => ({...prev, identities_info: {...prev.identities_info, aadhaar_doc_no: formatted}}));
  };



  const inputClass = "w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2.5 px-4 outline-none focus:border-[var(--accent)] hover:border-[var(--border-hover)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all duration-300 text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md";
  const labelClass = "block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2";
  const sectionTitleClass = "text-[14px] font-black uppercase tracking-widest text-[var(--text-main)] border-b border-[var(--border-color)] pb-2 mb-5 flex items-center gap-2";

  return (
    <div className="max-w-[1600px] mx-auto pb-6 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 mt-2">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(isPublicRegistration ? '/login' : isOnboarding ? '/hr/onboarding' : '/hr/employees')} className="p-2.5 hover:bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-colors bg-[var(--bg-workspace)] shadow-sm">
            <ArrowLeft size={20} className="text-[var(--text-main)]" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">{isPublicRegistration ? 'Register Account' : isOnboarding ? 'Onboard New Employee' : 'Add Employee'}</h1>
            <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
              {isPublicRegistration ? 'Create your new employee account' : isOnboarding ? 'Initialize a new hire and add them to the onboarding track' : 'Add a new team member to the workspace'}
            </p>
          </div>
        </div>
        <button onClick={handleClearDraft} className="text-[12px] font-bold text-[var(--text-muted)] hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-2">
          <Trash2 size={14} /> Clear Draft
        </button>
      </div>

      {/* Stepper */}
      <div className="workspace-card p-5 mb-6 relative z-10">
        <div className="flex items-center justify-between relative max-w-[900px] mx-auto">
          {/* For 6 steps, each item gets 1/6 (16.66%). The center of the first is 8.33%, center of last is 91.66%, width = 83.33% */}
          <div className="absolute top-6 left-[8.33%] w-[83.33%] h-1 bg-[var(--bg-workspace)] -z-10 -translate-y-1/2 rounded-full overflow-hidden border border-[var(--border-color)]">
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
            <div className="space-y-8 max-w-6xl mx-auto">
              
              {/* Smart ZIP Upload Dropzone */}
              <div className="workspace-card p-6 border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/5 flex flex-col items-center justify-center relative group min-h-[140px]">
                {isExtracting ? (
                  <div className="flex flex-col items-center">
                    <Loader2 size={32} className="text-[var(--accent)] animate-spin mb-3" />
                    <p className="text-[14px] font-bold text-[var(--text-main)]">Extracting Document Data...</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-1">Please wait while AI analyzes the contents.</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={32} className="text-[var(--accent)] mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-[15px] font-bold text-[var(--text-main)]">Smart Upload (ZIP / RAR)</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-1 mb-2 text-center max-w-[400px]">
                      Upload an archive containing Resume, Marksheets, Aadhar, and PAN. AI will auto-fill the forms.
                    </p>
                    <button type="button" className="px-4 py-1.5 bg-[var(--accent)] text-white font-bold text-xs rounded-lg uppercase tracking-wider shadow-md cursor-pointer pointer-events-none">
                      Browse Archive
                    </button>
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                      accept=".zip,application/zip,.rar,application/vnd.rar,application/x-rar-compressed" 
                      onChange={handleZipUpload}
                      disabled={isExtracting}
                    />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Account Details & Avatar */}
                <div className="workspace-card p-6 border-none shadow-none bg-transparent">
                  <h3 className={sectionTitleClass}>
                    <User size={18} className="text-[var(--accent)]" /> Account Details
                  </h3>
                  
                  <div className="flex items-start gap-6 mb-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                        {uploadMock.avatar && croppedImageUrl ? (
                          <img src={croppedImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={24} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                        )}
                      </div>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarSelect} />
                    </div>
                    <div className="flex-1">
                      <label className={labelClass}>Link Existing System User (Optional)</label>
                      <select 
                        value={formData.user_id} 
                        onChange={e => {
                          const uid = e.target.value;
                          const user = metadata.available_users.find(u => u.user_id === uid);
                          if (user) setFormData(prev => ({...prev, user_id: uid, full_name: user.full_name, email: user.email}));
                          else setFormData(prev => ({...prev, user_id: '', full_name: '', email: ''}));
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
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className={labelClass}>System Role *</label>
                      <select value={formData.role_id} onChange={e => setFormData(prev => ({...prev, role_id: e.target.value}))} className={inputClass} disabled={!!formData.user_id}>
                        <option value="">Default (User)</option>
                        {systemRoles.map(role => (
                          <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Company</label>
                      <select 
                        value={formData.company_code || ''} 
                        onChange={e => setFormData(prev => ({...prev, company_code: e.target.value}))} 
                        className={inputClass}
                      >
                        <option value="">Select Company</option>
                        <option value="01">SmarTec</option>
                        <option value="02">Illuminated Minds</option>
                        <option value="03">Leons Integration</option>
                        <option value="04">NAF Media</option>
                        <option value="05">Peg-IT Healthcare</option>
                        <option value="06">Crudex Controls</option>
                      </select>
                      <p className="text-[11px] text-[var(--text-dim)] mt-2 italic">Used to set the Company prefix (CC) for auto-generated Employee IDs.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Full Name *</label>
                        <input disabled={!!formData.user_id} type="text" value={formData.full_name} onChange={e => setFormData(prev => ({...prev, full_name: e.target.value}))} className={inputClass} />
                      </div>
                      
                      <div>
                        <label className={labelClass}>Email Address *</label>
                        <input disabled={!!formData.user_id} type="email" value={formData.email} onChange={e => setFormData(prev => ({...prev, email: e.target.value}))} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="text" value={formData.phone_number} onChange={e => setFormData(prev => ({...prev, phone_number: e.target.value}))} className={inputClass} />
                    </div>
                    
                    {!formData.user_id && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}>Password *</label>
                          <input type="password" value={formData.password} onChange={e => setFormData(prev => ({...prev, password: e.target.value}))} className={inputClass} placeholder="Enter a temporary password" />
                        </div>
                        <div>
                          <label className={labelClass}>Confirm Password *</label>
                          <input type="password" value={formData.confirmPassword} onChange={e => setFormData(prev => ({...prev, confirmPassword: e.target.value}))} className={inputClass} placeholder="Re-enter password" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Profile */}
                <div className="workspace-card p-6 border-none shadow-none bg-transparent">
                  <h3 className={sectionTitleClass}>
                    <User size={18} className="text-[var(--accent)]" /> Personal Profile
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Gender</label>
                      <select value={formData.personal_info.gender} onChange={e => setFormData(prev => ({...prev, personal_info: {...prev.personal_info, gender: e.target.value}}))} className={inputClass}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Date of Birth</label>
                      <input type="date" value={formData.personal_info.dob} onChange={e => setFormData(prev => ({...prev, personal_info: {...prev.personal_info, dob: e.target.value}}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Blood Group</label>
                      <select value={formData.personal_info.blood_group} onChange={e => setFormData(prev => ({...prev, personal_info: {...prev.personal_info, blood_group: e.target.value}}))} className={inputClass}>
                        <option value="">Select</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Father's Name</label>
                      <input type="text" value={formData.personal_info.fathers_name} onChange={e => setFormData(prev => ({...prev, personal_info: {...prev.personal_info, fathers_name: e.target.value}}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Religion & Caste</label>
                      <input type="text" value={formData.personal_info.religion_caste} onChange={e => setFormData(prev => ({...prev, personal_info: {...prev.personal_info, religion_caste: e.target.value}}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Marital Status</label>
                      <select value={formData.personal_info.marital_status} onChange={e => setFormData(prev => ({...prev, personal_info: {...prev.personal_info, marital_status: e.target.value}}))} className={inputClass}>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>
                  </div>
                  
                  {formData.personal_info.marital_status === 'Married' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                      <div>
                        <label className={labelClass}>Spouse Name</label>
                        <input type="text" value={formData.personal_info.spouse_name} onChange={e => setFormData(prev => ({...prev, personal_info: {...prev.personal_info, spouse_name: e.target.value}}))} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Date of Marriage</label>
                        <input type="date" value={formData.personal_info.marriage_date} onChange={e => setFormData(prev => ({...prev, personal_info: {...prev.personal_info, marriage_date: e.target.value}}))} className={inputClass} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Address Info */}
                <div className="workspace-card p-6 border-none shadow-none bg-transparent lg:col-span-2">
                  <h3 className={sectionTitleClass}>
                    <MapPin size={18} className="text-[var(--accent)]" /> Address Details
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[12px] font-bold text-[var(--text-main)] mb-2">Current Address</h4>
                      <input type="text" placeholder="Street Address" value={formData.address_info.current_address} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, current_address: e.target.value}}))} className={inputClass} />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="City" value={formData.address_info.current_city} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, current_city: e.target.value}}))} className={inputClass} />
                        <input type="text" placeholder="State" value={formData.address_info.current_state} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, current_state: e.target.value}}))} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Zip / Postal Code" value={formData.address_info.current_zip} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, current_zip: e.target.value}}))} className={inputClass} />
                        <input type="text" placeholder="Country" value={formData.address_info.current_country} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, current_country: e.target.value}}))} className={inputClass} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[12px] font-bold text-[var(--text-main)]">Permanent Address</h4>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="accent-[var(--accent)]" checked={formData.address_info.same_as_current} onChange={e => {
                            const isChecked = e.target.checked;
                            setFormData(prev => ({...prev, address_info: {...prev.address_info, same_as_current: isChecked, 
                              permanent_address: isChecked ? formData.address_info.current_address : formData.address_info.permanent_address,
                              permanent_city: isChecked ? formData.address_info.current_city : formData.address_info.permanent_city,
                              permanent_state: isChecked ? formData.address_info.current_state : formData.address_info.permanent_state,
                              permanent_zip: isChecked ? formData.address_info.current_zip : formData.address_info.permanent_zip,
                              permanent_country: isChecked ? formData.address_info.current_country : formData.address_info.permanent_country,
                            }}));
                          }} />
                          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Same as Current</span>
                        </label>
                      </div>
                      <input disabled={formData.address_info.same_as_current} type="text" placeholder="Street Address" value={formData.address_info.permanent_address} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, permanent_address: e.target.value}}))} className={inputClass} />
                      <div className="grid grid-cols-2 gap-4">
                        <input disabled={formData.address_info.same_as_current} type="text" placeholder="City" value={formData.address_info.permanent_city} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, permanent_city: e.target.value}}))} className={inputClass} />
                        <input disabled={formData.address_info.same_as_current} type="text" placeholder="State" value={formData.address_info.permanent_state} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, permanent_state: e.target.value}}))} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input disabled={formData.address_info.same_as_current} type="text" placeholder="Zip / Postal Code" value={formData.address_info.permanent_zip} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, permanent_zip: e.target.value}}))} className={inputClass} />
                        <input disabled={formData.address_info.same_as_current} type="text" placeholder="Country" value={formData.address_info.permanent_country} onChange={e => setFormData(prev => ({...prev, address_info: {...prev.address_info, permanent_country: e.target.value}}))} className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contacts */}
                <div className="workspace-card p-6 border-none shadow-none bg-transparent lg:col-span-2">
                  <h3 className={sectionTitleClass}>
                    <PhoneCall size={18} className="text-[var(--accent)]" /> Emergency Contacts
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className={labelClass}>Contact Name</label>
                      <input type="text" value={formData.emergency_contacts[0].name} onChange={e => {
                        const newContacts = [...formData.emergency_contacts];
                        newContacts[0].name = e.target.value;
                        setFormData(prev => ({...prev, emergency_contacts: newContacts}));
                      }} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Relation</label>
                      <input type="text" placeholder="e.g. Spouse, Father" value={formData.emergency_contacts[0].relation} onChange={e => {
                        const newContacts = [...formData.emergency_contacts];
                        newContacts[0].relation = e.target.value;
                        setFormData(prev => ({...prev, emergency_contacts: newContacts}));
                      }} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="text" value={formData.emergency_contacts[0].phone} onChange={e => {
                        const newContacts = [...formData.emergency_contacts];
                        newContacts[0].phone = e.target.value;
                        setFormData(prev => ({...prev, emergency_contacts: newContacts}));
                      }} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Email (Optional)</label>
                      <input type="email" value={formData.emergency_contacts[0].email} onChange={e => {
                        const newContacts = [...formData.emergency_contacts];
                        newContacts[0].email = e.target.value;
                        setFormData(prev => ({...prev, emergency_contacts: newContacts}));
                      }} className={inputClass} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 2: Job Info */}
          {currentStep === 2 && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <h3 className={sectionTitleClass}>
                <Briefcase size={18} className="text-[var(--accent)]" /> Core Job Info
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Department *</label>
                  <select value={formData.department_id} onChange={e => setFormData(prev => ({...prev, department_id: e.target.value, designation_id: null, designation_name: ''}))} className={inputClass}>
                    <option value="">Select Department</option>
                    {metadata.departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Designation *</label>
                  <select 
                    value={formData.designation_id || ''} 
                    onChange={e => {
                      const id = e.target.value;
                      const name = metadata.designations?.find(d => String(d.designation_id) === String(id))?.name || '';
                      setFormData(prev => ({...prev, designation_id: id, designation_name: name}));
                    }} 
                    className={inputClass}
                  >
                    <option value="">Select Designation</option>
                    {metadata.designations?.map(d => (
                      <option key={d.designation_id} value={d.designation_id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Date of Joining *</label>
                  <input type="date" value={formData.date_of_joining} onChange={e => setFormData(prev => ({...prev, date_of_joining: e.target.value}))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Reporting Manager</label>
                  <select value={formData.manager_id} onChange={e => setFormData(prev => ({...prev, manager_id: e.target.value}))} className={inputClass}>
                    <option value="">None (Top Level)</option>
                    {employees.filter(emp => emp.employment_status !== 'Terminated').map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.full_name} ({emp.emp_code}))
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Employment Status</label>
                  <select value={formData.employment_status} onChange={e => setFormData(prev => ({...prev, employment_status: e.target.value}))} className={inputClass}>
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Trainee">Trainee</option>
                  </select>
                </div>
                <div className="col-span-full">
                  <label className={labelClass}>Work Location</label>
                  <input type="text" placeholder="e.g. New York, Remote" value={formData.work_location} onChange={e => setFormData(prev => ({...prev, work_location: e.target.value}))} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Pay & Benefits */}
          {currentStep === 3 && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <h3 className={sectionTitleClass}>
                <IndianRupee size={18} className="text-[var(--accent)]" /> Salary & Bank Details
              </h3>
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Base Salary (Annual)</label>
                  <input type="number" placeholder="e.g. 75000" value={formData.base_salary} onChange={e => setFormData(prev => ({...prev, base_salary: e.target.value}))} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Bank Name</label>
                    <input type="text" value={formData.pay_info.bank_name} onChange={e => setFormData(prev => ({...prev, pay_info: {...prev.pay_info, bank_name: e.target.value}}))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Account No.</label>
                    <input type="text" value={formData.pay_info.bank_account_no} onChange={e => setFormData(prev => ({...prev, pay_info: {...prev.pay_info, bank_account_no: e.target.value}}))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>IFSC Code</label>
                    <input type="text" value={formData.pay_info.ifsc_code} onChange={e => setFormData(prev => ({...prev, pay_info: {...prev.pay_info, ifsc_code: e.target.value}}))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Payment Type</label>
                    <select value={formData.pay_info.payment_type} onChange={e => setFormData(prev => ({...prev, pay_info: {...prev.pay_info, payment_type: e.target.value}}))} className={inputClass}>
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
            <div className="space-y-8 max-w-5xl mx-auto">
              <h3 className={sectionTitleClass}>Statutory Declarations</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="workspace-card p-6 bg-[var(--bg-card)] space-y-5">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <span className="font-black text-[var(--text-main)] uppercase tracking-wider text-sm">Provident Fund (PF)</span>
                    <select value={formData.statutory_info.pf_covered} onChange={e => setFormData(prev => ({...prev, statutory_info: {...prev.statutory_info, pf_covered: e.target.value}}))} className="px-3 py-1.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] outline-none">
                      <option value="No">Not Covered</option>
                      <option value="Yes">Covered</option>
                    </select>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 transition-opacity duration-300 ${formData.statutory_info.pf_covered === 'No' ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div>
                      <label className={labelClass}>UAN</label>
                      <input type="text" value={formData.statutory_info.uan} onChange={e => setFormData(prev => ({...prev, statutory_info: {...prev.statutory_info, uan: e.target.value}}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>PF No.</label>
                      <input type="text" value={formData.statutory_info.pf_no} onChange={e => setFormData(prev => ({...prev, statutory_info: {...prev.statutory_info, pf_no: e.target.value}}))} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div className="workspace-card p-6 bg-[var(--bg-card)] space-y-5">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <span className="font-black text-[var(--text-main)] uppercase tracking-wider text-sm">ESIC Account</span>
                    <select value={formData.statutory_info.esi_covered} onChange={e => setFormData(prev => ({...prev, statutory_info: {...prev.statutory_info, esi_covered: e.target.value}}))} className="px-3 py-1.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] outline-none">
                      <option value="No">Not Covered</option>
                      <option value="Yes">Covered</option>
                    </select>
                  </div>
                  <div className={`transition-opacity duration-300 ${formData.statutory_info.esi_covered === 'No' ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className={labelClass}>ESI Number</label>
                    <input type="text" value={formData.statutory_info.esi_number} onChange={e => setFormData(prev => ({...prev, statutory_info: {...prev.statutory_info, esi_number: e.target.value}}))} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Identities */}
          {currentStep === 5 && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <h3 className={sectionTitleClass}>
                <CreditCard size={18} className="text-[var(--accent)]" /> Identity Documents
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[var(--bg-workspace)] p-5 rounded-xl border border-[var(--border-color)] flex flex-col h-full">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] mb-4 uppercase tracking-wider">PAN Details</h4>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className={labelClass}>PAN Number</label>
                      <input type="text" placeholder="ABCDE1234F" value={formData.identities_info.pan_doc_no} onChange={handlePANChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Name As Per PAN</label>
                      <input type="text" value={formData.identities_info.pan_name} onChange={e => setFormData(prev => ({...prev, identities_info: {...prev.identities_info, pan_name: e.target.value}}))} className={inputClass} />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <DocumentDropzone label="PAN Card" id="pan" isUploaded={uploadMock.pan} setUploadMock={setUploadMock} onUpload={(base64) => setFormData(prev => ({...prev, identities_info: {...prev.identities_info, pan_document: base64}}))} />
                  </div>
                </div>

                <div className="bg-[var(--bg-workspace)] p-5 rounded-xl border border-[var(--border-color)] flex flex-col h-full">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] mb-4 uppercase tracking-wider">Aadhaar Details</h4>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className={labelClass}>Aadhaar Number</label>
                      <input type="text" placeholder="1234-5678-9012" value={formData.identities_info.aadhaar_doc_no} onChange={handleAadhaarChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Name As Per Aadhaar</label>
                      <input type="text" value={formData.identities_info.aadhaar_name} onChange={e => setFormData(prev => ({...prev, identities_info: {...prev.identities_info, aadhaar_name: e.target.value}}))} className={inputClass} />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <DocumentDropzone label="Aadhaar Card" id="aadhaar" isUploaded={uploadMock.aadhaar} setUploadMock={setUploadMock} onUpload={(base64) => setFormData(prev => ({...prev, identities_info: {...prev.identities_info, aadhaar_document: base64}}))} />
                  </div>
                </div>
              </div>

              <h3 className={`${sectionTitleClass} mt-10`}>
                <FileText size={18} className="text-[var(--accent)]" /> Education Documents
              </h3>
              
              <div className="bg-[var(--bg-workspace)] p-6 rounded-xl border border-[var(--border-color)]">
                <div className="mb-6 max-w-sm">
                  <label className={labelClass}>Higher Education Type</label>
                  <select 
                    value={formData.identities_info.education_type} 
                    onChange={e => setFormData(prev => ({...prev, identities_info: {...prev.identities_info, education_type: e.target.value}}))} 
                    className={inputClass}
                  >
                    <option value="Degree">Degree (8 Semesters)</option>
                    <option value="Diploma">Diploma (6 Semesters)</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <DocumentDropzone 
                    label="10th Marksheet" 
                    id="marksheet_10th" 
                    isUploaded={uploadMock.marksheet_10th} 
                    setUploadMock={setUploadMock}
                    onUpload={(base64) => setFormData(prev => ({...prev, identities_info: {...prev.identities_info, marksheet_10th: base64}}))}
                  />
                  
                  <DocumentDropzone 
                    label="12th Marksheet" 
                    id="marksheet_12th" 
                    isUploaded={uploadMock.marksheet_12th} 
                    setUploadMock={setUploadMock}
                    onUpload={(base64) => setFormData(prev => ({...prev, identities_info: {...prev.identities_info, marksheet_12th: base64}}))}
                  />
                  
                  {[...Array(formData.identities_info.education_type === 'Diploma' ? 6 : 8)].map((_, i) => (
                    <DocumentDropzone 
                      key={`sem_${i+1}`}
                      label={`Sem ${i+1} Marksheet`} 
                      id={`sem_${i+1}`} 
                      isUploaded={uploadMock[`sem_${i+1}`]} 
                      setUploadMock={setUploadMock} 
                      onUpload={(base64) => setFormData(prev => ({...prev, identities_info: {...prev.identities_info, [`sem_${i+1}`]: base64}}))}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
              <h3 className={sectionTitleClass}>
                <ClipboardCheck size={18} className="text-[var(--accent)]" /> Review & Confirm
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div className="workspace-card p-6 bg-[var(--bg-card)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Personal & Contact</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Full Name:</span> <span className="font-medium text-[var(--text-main)]">{formData.full_name || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Email:</span> <span className="font-medium text-[var(--text-main)]">{formData.email || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Phone:</span> <span className="font-medium text-[var(--text-main)]">{formData.phone_number || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">City:</span> <span className="font-medium text-[var(--text-main)]">{formData.address_info.current_city || '-'}</span></li>
                  </ul>
                </div>

                <div className="workspace-card p-6 bg-[var(--bg-card)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Job Assignment</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Department:</span> <span className="font-medium text-[var(--text-main)]">{metadata.departments.find(d => d.department_id === formData.department_id)?.name || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Designation:</span> <span className="font-medium text-[var(--text-main)]">{formData.designation_name || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Joining Date:</span> <span className="font-medium text-[var(--text-main)]">{formData.date_of_joining || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Status:</span> <span className="font-medium text-[var(--text-main)]">{formData.employment_status || '-'}</span></li>
                  </ul>
                </div>

                <div className="workspace-card p-6 bg-[var(--bg-card)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Pay & Statutory</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Base Salary:</span> <span className="font-medium text-[var(--text-main)]">{formData.base_salary ? `₹${formData.base_salary}` : '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Payment Type:</span> <span className="font-medium text-[var(--text-main)]">{formData.pay_info.payment_type || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">PF Covered:</span> <span className="font-medium text-[var(--text-main)]">{formData.statutory_info.pf_covered}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">ESI Covered:</span> <span className="font-medium text-[var(--text-main)]">{formData.statutory_info.esi_covered}</span></li>
                  </ul>
                </div>

                <div className="workspace-card p-6 bg-[var(--bg-card)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Identities</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">PAN Number:</span> <span className="font-medium text-[var(--text-main)]">{formData.identities_info.pan_doc_no || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">PAN Uploaded:</span> <span className="font-medium text-[var(--text-main)]">{uploadMock.pan ? 'Yes' : 'No'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Aadhaar Number:</span> <span className="font-medium text-[var(--text-main)]">{formData.identities_info.aadhaar_doc_no || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Aadhaar Uploaded:</span> <span className="font-medium text-[var(--text-main)]">{uploadMock.aadhaar ? 'Yes' : 'No'}</span></li>
                  </ul>
                </div>

                <div className="workspace-card p-6 bg-[var(--bg-card)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Education Documents</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Education Type:</span> <span className="font-medium text-[var(--text-main)]">{formData.identities_info.education_type}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">10th Marksheet:</span> <span className="font-medium text-[var(--text-main)]">{uploadMock.marksheet_10th ? 'Uploaded' : 'Pending'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">12th Marksheet:</span> <span className="font-medium text-[var(--text-main)]">{uploadMock.marksheet_12th ? 'Uploaded' : 'Pending'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Semester Marksheets:</span> <span className="font-medium text-[var(--text-main)]">
                      {[...Array(formData.identities_info.education_type === 'Diploma' ? 6 : 8)]
                        .filter((_, i) => uploadMock[`sem_${i+1}`]).length} / {formData.identities_info.education_type === 'Diploma' ? 6 : 8} Uploaded
                    </span></li>
                  </ul>
                </div>

              </div>
              
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-center text-center mt-6">
                 <p className="text-[13px] font-bold text-[var(--text-muted)]">Please ensure all details are accurate before proceeding. The system will create the employee profile and automatically map permissions based on the selected role.</p>
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
      
      {isCropperOpen && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export default AddEmployeeWizard;
