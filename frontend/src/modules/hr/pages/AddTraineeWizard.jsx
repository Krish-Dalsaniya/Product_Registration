import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Save, User, Briefcase, FileText, ChevronRight, Check, ClipboardCheck, Camera, GraduationCap, Trash2 } from 'lucide-react';
import { fetchHRMetadataApi, fetchHREmployeesApi } from '../../../api/hr';
import { createTraineeApi } from '../../../api/trainee';
import ImageCropperModal from '../../../components/shared/ImageCropperModal';

const STEPS = [
  { id: 1, label: 'Personal', icon: User },
  { id: 2, label: 'Training Info', icon: Briefcase },
  { id: 3, label: 'Education', icon: GraduationCap },
  { id: 4, label: 'Review', icon: ClipboardCheck }
];

const INITIAL_FORM_DATA = {
  first_name: '', last_name: '', email: '', mobile: '', gender: 'Male', date_of_birth: '',
  joining_date: '', expected_completion_date: '', department_id: '', mentor_employee_id: '',
  training_batch: '', education: '', institute: '', specialization: '', status: 'Applied', remarks: '',
  image_url: ''
};

const AddTraineeWizard = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState(() => {
    const draft = localStorage.getItem('trainee_wizard_draft');
    if (draft) {
      try { return JSON.parse(draft).formData; } catch(e){}
    }
    return INITIAL_FORM_DATA;
  });

  const [currentStep, setCurrentStep] = useState(() => {
    const draft = localStorage.getItem('trainee_wizard_draft');
    if (draft) {
      try { return JSON.parse(draft).currentStep || 1; } catch(e){}
    }
    return 1;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState({ departments: [] });
  const [employees, setEmployees] = useState([]);
  
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(formData.image_url || null);

  useEffect(() => {
    loadMetadata();
    loadEmployees();
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      const draftData = { ...formData, image_url: '' }; // Exclude image from draft to save localStorage space
      localStorage.setItem('trainee_wizard_draft', JSON.stringify({ formData: draftData, currentStep }));
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
      e.target.value = '';
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
      setFormData(prev => ({...prev, image_url: reader.result}));
    };
    reader.readAsDataURL(croppedFile);
  };

  const handleClearDraft = () => {
    localStorage.removeItem('trainee_wizard_draft');
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setCroppedImageUrl(null);
    toast.success('Draft cleared');
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.first_name || !formData.last_name || !formData.email) {
        toast.error('Please fill out all mandatory fields in the Personal step (First Name, Last Name, Email).');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.department_id) {
        toast.error('Please fill out mandatory fields in the Training Info step (Department).');
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
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.department_id) {
      toast.error('Please ensure all mandatory Personal and Training fields are filled before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createTraineeApi(formData);
      if (res.data?.success) {
        toast.success('Trainee created successfully');
        localStorage.removeItem('trainee_wizard_draft');
        navigate('/hr/trainee');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create trainee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 px-4 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1.5";
  const sectionTitleClass = "text-[14px] font-black uppercase tracking-widest text-[var(--text-main)] border-b border-[var(--border-color)] pb-2 mb-5 flex items-center gap-2";

  return (
    <div className="max-w-[1600px] mx-auto pb-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 mt-2">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/hr/trainee')} className="p-2.5 hover:bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl transition-colors bg-[var(--bg-workspace)] shadow-sm">
            <ArrowLeft size={20} className="text-[var(--text-main)]" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Add Trainee</h1>
            <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
              Add a new trainee to the workspace
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
          <div className="absolute top-6 left-[12.5%] w-[75%] h-1 bg-[var(--bg-workspace)] -z-10 -translate-y-1/2 rounded-full overflow-hidden border border-[var(--border-color)]">
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
            <div className="space-y-8 max-w-4xl mx-auto">
              <div className="workspace-card p-6 border-none shadow-none bg-transparent">
                <h3 className={sectionTitleClass}>
                  <User size={18} className="text-[var(--accent)]" /> Personal Details
                </h3>
                
                <div className="flex items-start gap-6 mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                      {croppedImageUrl ? (
                        <img src={croppedImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={24} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                      )}
                    </div>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarSelect} />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-[13px] font-bold text-[var(--text-main)]">Profile Image</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">Upload a clear photo. Best 1:1 ratio. Max 5MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input type="text" value={formData.first_name} onChange={e => setFormData(prev => ({...prev, first_name: e.target.value}))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input type="text" value={formData.last_name} onChange={e => setFormData(prev => ({...prev, last_name: e.target.value}))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address *</label>
                    <input type="email" value={formData.email} onChange={e => setFormData(prev => ({...prev, email: e.target.value}))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile Number</label>
                    <input type="text" value={formData.mobile} onChange={e => setFormData(prev => ({...prev, mobile: e.target.value}))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Gender</label>
                    <select value={formData.gender} onChange={e => setFormData(prev => ({...prev, gender: e.target.value}))} className={inputClass}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input type="date" value={formData.date_of_birth} onChange={e => setFormData(prev => ({...prev, date_of_birth: e.target.value}))} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Training Info */}
          {currentStep === 2 && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <h3 className={sectionTitleClass}>
                <Briefcase size={18} className="text-[var(--accent)]" /> Training Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Department *</label>
                  <select value={formData.department_id} onChange={e => setFormData(prev => ({...prev, department_id: e.target.value}))} className={inputClass}>
                    <option value="">Select Department</option>
                    {metadata.departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Mentor / Reporting Manager</label>
                  <select value={formData.mentor_employee_id} onChange={e => setFormData(prev => ({...prev, mentor_employee_id: e.target.value}))} className={inputClass}>
                    <option value="">None (Unassigned)</option>
                    {employees.filter(emp => emp.employment_status !== 'Terminated').map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.full_name} ({emp.emp_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input type="date" value={formData.joining_date} onChange={e => setFormData(prev => ({...prev, joining_date: e.target.value}))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Expected Completion Date</label>
                  <input type="date" value={formData.expected_completion_date} onChange={e => setFormData(prev => ({...prev, expected_completion_date: e.target.value}))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Training Batch</label>
                  <input type="text" placeholder="e.g. 2026-A" value={formData.training_batch} onChange={e => setFormData(prev => ({...prev, training_batch: e.target.value}))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={formData.status} onChange={e => setFormData(prev => ({...prev, status: e.target.value}))} className={inputClass}>
                    <option value="Applied">Applied</option>
                    <option value="Selected">Selected</option>
                    <option value="Joined">Joined</option>
                    <option value="Under Training">Under Training</option>
                    <option value="Completed">Completed</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Education */}
          {currentStep === 3 && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <h3 className={sectionTitleClass}>
                <GraduationCap size={18} className="text-[var(--accent)]" /> Education & Background
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Qualification</label>
                  <input type="text" placeholder="e.g. B.Tech, M.Sc" value={formData.education} onChange={e => setFormData(prev => ({...prev, education: e.target.value}))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Specialization</label>
                  <input type="text" placeholder="e.g. Computer Science" value={formData.specialization} onChange={e => setFormData(prev => ({...prev, specialization: e.target.value}))} className={inputClass} />
                </div>
                <div className="col-span-full">
                  <label className={labelClass}>Institute / University</label>
                  <input type="text" placeholder="e.g. MIT, Stanford" value={formData.institute} onChange={e => setFormData(prev => ({...prev, institute: e.target.value}))} className={inputClass} />
                </div>
                <div className="col-span-full">
                  <label className={labelClass}>Remarks / Notes</label>
                  <textarea rows="4" placeholder="Any additional comments..." value={formData.remarks} onChange={e => setFormData(prev => ({...prev, remarks: e.target.value}))} className={`${inputClass} resize-none`} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
              <h3 className={sectionTitleClass}>
                <ClipboardCheck size={18} className="text-[var(--accent)]" /> Review & Confirm
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div className="workspace-card p-6 bg-[var(--bg-card)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Personal & Contact</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">First Name:</span> <span className="font-medium text-[var(--text-main)]">{formData.first_name || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Last Name:</span> <span className="font-medium text-[var(--text-main)]">{formData.last_name || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Email:</span> <span className="font-medium text-[var(--text-main)]">{formData.email || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Mobile:</span> <span className="font-medium text-[var(--text-main)]">{formData.mobile || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Gender:</span> <span className="font-medium text-[var(--text-main)]">{formData.gender || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Date of Birth:</span> <span className="font-medium text-[var(--text-main)]">{formData.date_of_birth || '-'}</span></li>
                  </ul>
                </div>

                <div className="workspace-card p-6 bg-[var(--bg-card)]">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Training Info</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Department:</span> <span className="font-medium text-[var(--text-main)]">{metadata.departments.find(d => String(d.department_id) === String(formData.department_id))?.name || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Mentor:</span> <span className="font-medium text-[var(--text-main)]">{employees.find(e => String(e.employee_id) === String(formData.mentor_employee_id))?.full_name || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Joining Date:</span> <span className="font-medium text-[var(--text-main)]">{formData.joining_date || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Expected Completion:</span> <span className="font-medium text-[var(--text-main)]">{formData.expected_completion_date || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Training Batch:</span> <span className="font-medium text-[var(--text-main)]">{formData.training_batch || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Status:</span> <span className="font-medium text-[var(--text-main)]">{formData.status || '-'}</span></li>
                  </ul>
                </div>

                <div className="workspace-card p-6 bg-[var(--bg-card)] md:col-span-2">
                  <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Education & Remarks</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Qualification:</span> <span className="font-medium text-[var(--text-main)]">{formData.education || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Specialization:</span> <span className="font-medium text-[var(--text-main)]">{formData.specialization || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Institute:</span> <span className="font-medium text-[var(--text-main)]">{formData.institute || '-'}</span></li>
                    <li className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)] font-bold">Remarks:</span> <span className="font-medium text-[var(--text-main)]">{formData.remarks || '-'}</span></li>
                  </ul>
                </div>

              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="mt-10 pt-6 border-t border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => { handleClearDraft(); navigate('/hr/trainee'); }}
                className="px-6 py-2.5 font-bold text-[13px] uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handlePrev} 
                disabled={currentStep === 1}
                className="px-6 py-2.5 font-bold text-[13px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back
              </button>
            </div>

            {currentStep < STEPS.length ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="btn-primary px-8 py-2.5 flex items-center gap-2"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-primary px-8 py-2.5 flex items-center gap-2"
                style={{ background: 'var(--grad-button)' }}
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSubmitting ? 'Creating Trainee...' : 'Confirm & Create Trainee'}
              </button>
            )}
          </div>
        </form>
      </div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => { setIsCropperOpen(false); setRawImageSrc(null); }}
        imageSrc={rawImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default AddTraineeWizard;
