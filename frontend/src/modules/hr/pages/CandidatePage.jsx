import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Briefcase, User, Check, UploadCloud, FileText, PhoneCall, IndianRupee, UserPlus, Plus, X } from 'lucide-react';
import { useNavigate, useParams, useLocation, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createCandidateApi, fetchCandidateByIdApi, updateCandidateApi, extractCandidateLiveApi, extractCandidateZipApi } from '../../../api/hr';
import CandidateTimeline from '../components/CandidateTimeline';
import SGPABarChart from '../components/SGPABarChart';
import Breadcrumbs from '../../../components/shared/Breadcrumbs';

const DocumentDropzone = ({ label, id, isUploaded, setUploadMock, onUpload, onFileSelected, isParsing }) => (
  <div className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent)] transition-colors rounded-xl p-4 flex flex-col items-center justify-center bg-[var(--bg-workspace)] cursor-pointer relative group h-[120px] text-center">
     {isParsing ? (
       <>
         <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-2"></div>
         <p className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider">Parsing...</p>
       </>
     ) : isUploaded ? (
       <>
        <Check size={28} className="text-green-500 mb-2" />
        <p className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-green-500 font-bold mt-1">Uploaded</p>
       </>
     ) : (
       <>
        <UploadCloud size={24} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-2" />
        <p className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1 font-semibold">Click to upload</p>
       </>
     )}
     <input 
       type="file" 
       className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
       accept=".pdf,image/*" 
       onChange={(e) => {
         if(e.target.files?.length) {
           const file = e.target.files[0];
           setUploadMock(prev => ({...prev, [id]: file}));
           toast.success(`${label} attached`);
           
           if (onFileSelected) {
               onFileSelected(id, file);
           }
           
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

const RatingRow = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-1.5 hover:bg-[var(--bg-workspace)]/50 px-2 rounded transition-colors">
    <span className="text-[12px] font-bold text-[var(--text-main)] w-[140px] truncate" title={label}>{label}</span>
    <div className="flex items-center gap-3 flex-1 justify-end">
      {['Nill', 'NOOB', 'MOD', 'ADV', 'ACE'].map(level => (
        <label key={level} className="flex items-center gap-1 cursor-pointer group">
          <input type="radio" checked={value === level} onChange={() => onChange(level)} className="accent-[var(--accent)] w-3 h-3" />
          <span className="text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] uppercase">{level}</span>
        </label>
      ))}
    </div>
  </div>
);

const CandidatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { updateTabLabel } = useOutletContext() || {};
  
  const [activeTab, setActiveTab] = useState('Basic Information');
  const [liveExtractedInfo, setLiveExtractedInfo] = useState({});
  const [selectInputs, setSelectInputs] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [formData, setFormData] = useState({
    appliedAt: [],
    shortlistedFor: [],
    name: '',
    experienceType: 'EXPERIENCE', // FRESHER or EXPERIENCE
    email: '',
    whatsapp: '',
    mobile: '',
    currentLocation: '',
    relocate: 'YES',
    educationRoute: 'REGULAR',
    date_of_birth: '',
    experience_details: {
      total_years: '0',
      designation: 'N/A',
      current_company: 'N/A',
      past_experiences: [
        {
          company_name: '',
          designation: '',
          reason_for_leaving: '',
          year_of_leaving: ''
        }
      ]
    },
    education_details: {
      tenth_percentage: '',
      tenth_passing_year: '',
      twelfth_percentage: '',
      twelfth_passing_year: '',
      
      diploma_sgpa_1: '', diploma_sgpa_2: '', diploma_sgpa_3: '', diploma_sgpa_4: '', diploma_sgpa_5: '', diploma_sgpa_6: '',
      diploma_cgpa: '',
      diploma_passing_year: '',
      
      degree_sgpa_1: '', degree_sgpa_2: '', degree_sgpa_3: '', degree_sgpa_4: '', degree_sgpa_5: '', degree_sgpa_6: '', degree_sgpa_7: '', degree_sgpa_8: '',
      degree_cgpa: '',
      degree_passing_year: '',
      
      has_masters: false,
      masters_cgpa: '',
      masters_passing_year: ''
    }
  });

  const [pythonDetails, setPythonDetails] = useState({
    rate_python_developer: 'Nill',
    field_projects_count: '0',
    mass_production_projects_count: '0',
    success_ratio_field_projects: '0.00',
    os_experience: 'WINDOWS',
    database_known: 'SQL',
    sdlc_experience: 'NO',
    languages_known: [],
    frameworks_worked_on: [],
    frontend_worked_on: [],
    technologies_experience: [],
    vcs_worked_on: []
  });

  const [embeddedDetails, setEmbeddedDetails] = useState({
    // Skills
    c_skills: {
      'C-Programming': 'Nill', 'Embedded C': 'Nill', 'Binary Tree': 'Nill', 'LinkList': 'Nill', 'LIFO & FIFO': 'Nill', 'Malloc & Calloc': 'Nill', 'Graphics in C': 'Nill'
    },
    cpp_java_skills: {
      'Proficiency in C++': 'Nill', 'Inheritance in C++': 'Nill', 'OOPS': 'Nill', 'Object handling in C++': 'Nill', 'Proficiency in Java': 'Nill'
    },
    // MCUs
    mcu_platforms: {
      'STM32': 'Nill', 'Nuvoton': 'Nill', 'LPC2148/LPC2129(ARM7)': 'Nill', 'RL78XXX': 'Nill', 'Renesas': 'Nill', '8051 MCU': 'Nill', 'ATMega32': 'Nill'
    },
    mcu_other_checked: false,
    mcu_other_value: '',
    // Compilers
    compilers: {
      'Keil': 'Nill', 'IAR': 'Nill', 'STCUBE': 'Nill', 'MPLABX+C105': 'Nill', 'JLINK': 'Nill', 'STLINK': 'Nill', 'RVCT_EAT': 'Nill', 'Bluesuite': 'Nill', 'Segger Embedded Studio': 'Nill',
      'GCC': 'Nill', 'Eclipse': 'Nill', 'AVR Studio': 'Nill', 'Arduino IDE': 'Nill', 'ULINK': 'Nill', 'IAR_2': 'Nill', 'XTENSA': 'Nill', 'SDCC': 'Nill'
    },
    compiler_other_checked: false,
    compiler_other_value: '',
    // Checkbox Arrays
    internal_peripherals: [],
    external_peripherals: [],
    lab_equipment: [],
    // Projects Metrics
    projects_completed: {
      during_engineering: '0',
      after_engineering: '0',
      mass_production: '0',
      max_duration_mass_production: '0'
    },
    // Best Projects
    best_projects: [
      { name: '', team_size: '0', role: '', duration: '0.00', duration_unit: 'MONTHS', compiler: '', in_production: 'NO', certifications: '', description: '' },
      { name: '', team_size: '0', role: '', duration: '0.00', duration_unit: 'MONTHS', compiler: '', in_production: 'NO', certifications: '', description: '' }
    ]
  });

  const [hardwareDetails, setHardwareDetails] = useState({
    hw_design_experience: 'NO',
    hw_design_years: '0',
    basic_electronic_knowledge: 'NO',
    components_worked: [],
    software_worked: [],
    power_supply_design: 'NO',
    high_freq_transformer: 'NO',
    motor_driver_circuits: {
      bldc: { rating: 'Nill', max_rating_watt: '0', type: 'N/A', construction: 'N/A', mode: 'N/A' },
      servo: { rating: 'Nill', max_rating_watt: '0' },
      pmsm: { rating: 'Nill', max_rating_watt: '0' },
      stepper: { rating: 'Nill', max_rating_watt: '0', permanent_motor: false, variable_reluctance: false, hybrid_syncronous: false, construction: 'N/A', modes: 'N/A', other: false }
    },
    communication_interface: [],
    wireless_circuit: [],
    mixed_signal_boards: '',
    high_speed_comm_boards: [],
    equipment_rating: [],
    pcb_designing: 'NO',
    high_speed_board_design: 'NO',
    emi_emc_clearance: 'NO',
    certification_standard: 'NO',
    on_field_projects: 'NO'
  });

  const [salesDetails, setSalesDetails] = useState({
    rating: 'Nill',
    lead_generation: 'NO',
    willing_to_travel: 'NO',
    lead_to_close_ratio: 'NO',
    international_customer: 'NO',
    technical_projects: 'NO',
    inter_department_comm: 'NO',
    sales_document: 'NO',
    presentational_skills: 'Nill'
  });

  const [purchaseDetails, setPurchaseDetails] = useState({
    rating: 'Nill',
    finding_vendors: 'NO',
    electronic_purchase: 'NO',
    international_purchase: 'NO',
    import_experience: 'NO',
    custom_clearance: 'NO',
    inter_department_comm: 'NO',
    negotiation_skills: '0'
  });

  const [productionDetails, setProductionDetails] = useState({
    rating: 'Nill',
    daily_report: 'NO',
    inventory_maintenance: 'NO',
    inter_department_comm: 'NO',
    equipment: [],
    soldering: []
  });

  const [qcDetails, setQcDetails] = useState({
    rating: 'Nill',
    test_case_generation: 'NO',
    inter_department_comm: 'NO',
    equipment: [],
    soldering: []
  });

  const [pcbDetails, setPcbDetails] = useState({
    has_experience: 'NO',
    years_experience: '0',
    software: [],
    proficiency: {
      'Schematic design': 'Nill',
      'Single layer Routing': 'Nill',
      '2 layer Routing': 'Nill',
      '4 layers Routing': 'Nill',
      'Multiple Layer Routing': 'Nill',
      'Library & new package design': 'Nill',
      'Garber creation & verification': 'Nill'
    },
    test_procedures: 'N/A',
    emi_emc: 'NO',
    impedance_matching: 'NO',
    high_freq_data_bus: 'NO',
    what_is_1_mil: '1/1000 Inch',
    rf_impedance: 'NO',
    electronics_equipments: 'NO',
    equipment_worked_on: [],
    pcbs_in_product: '0',
    pcb_material: 'NO',
    high_speed_routing: 'NO',
    basic_components: 'NO',
    pcb_design_flow: {
      'Library creation': '',
      'Board outline and mechanicals': '',
      'Importing netlist': '',
      'Design Rule settings': '',
      'Component Placement': '',
      'Rounting': '',
      'Split plans': '',
      'Gerber Settings': '',
      'Silkscreen and Assembly settings': ''
    },
    footprint_flow: {
      'Padstack creation': '',
      'Pin placement': '',
      'Assembly outline': '',
      'Silkscreen outline': '',
      'Place bound top': '',
      'Dfa bound top': '',
      'No probe top': '',
      'Silk and assembly reference designator': ''
    },
    netlist_errors: [],
    starting_thickness: '0.00',
    buried_blind_via_same: 'NO'
  });

  const toggleArrayCheckbox = (stateSetter, field, value) => {
    stateSetter(prev => {
      const currentList = prev[field];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentList, value] };
      }
    });
  };

  const toggleCheckbox = (field, value) => {
    setPythonDetails(prev => {
      const currentList = prev[field];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentList, value] };
      }
    });
  };

  const toggleEmbeddedCheckbox = (field, value) => {
    setEmbeddedDetails(prev => {
      const currentList = prev[field];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentList, value] };
      }
    });
  };

  const updateEmbeddedNested = (section, key, value) => {
    setEmbeddedDetails(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateBestProject = (index, field, value) => {
    setEmbeddedDetails(prev => {
      const updatedProjects = [...prev.best_projects];
      updatedProjects[index] = { ...updatedProjects[index], [field]: value };
      return { ...prev, best_projects: updatedProjects };
    });
  };

  const toggleHardwareCheckbox = (field, value) => {
    setHardwareDetails(prev => {
      const currentList = prev[field];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentList, value] };
      }
    });
  };

  const updateHardwareNested = (section, key, value) => {
    setHardwareDetails(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateHardwareMotor = (motor, key, value) => {
    setHardwareDetails(prev => ({
      ...prev,
      motor_driver_circuits: {
        ...prev.motor_driver_circuits,
        [motor]: {
          ...prev.motor_driver_circuits[motor],
          [key]: value
        }
      }
    }));
  };

  const updatePcbProficiency = (key, value) => {
    setPcbDetails(prev => ({
      ...prev,
      proficiency: { ...prev.proficiency, [key]: value }
    }));
  };

  const updatePcbFlow = (flowType, key, value) => {
    setPcbDetails(prev => ({
      ...prev,
      [flowType]: { ...prev[flowType], [key]: value }
    }));
  };

  const [uploadMock, setUploadMock] = useState({
    applicationForm: false,
    resume: false,
    aadharCard: false,
    panCard: false,
    passport: false,
    marksheet_10th: false,
    marksheet_12th: false,
    deg_sem_1: false, deg_sem_2: false, deg_sem_3: false, deg_sem_4: false,
    deg_sem_5: false, deg_sem_6: false, deg_sem_7: false, deg_sem_8: false,
    dip_sem_1: false, dip_sem_2: false, dip_sem_3: false, dip_sem_4: false,
    dip_sem_5: false, dip_sem_6: false,
  });

  const [parsingFiles, setParsingFiles] = useState({});

  const handleDocumentExtract = async (fileId, file) => {
    if (!file) return;
    setParsingFiles(prev => ({...prev, [fileId]: true}));
    
    try {
      const form = new FormData();
      form.append('document', file);
      form.append('fileId', fileId);
      
      const res = await extractCandidateLiveApi(form);
      if (res.data?.success && res.data.data) {
        const info = res.data.data;
        let extractedFields = [];
        
        if (info.name) {
          if (!formData.name) {
            extractedFields.push('Name');
          } else {
            // Security check: verify if the document's name matches the candidate's existing name
            const c1 = info.name.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
            const c2 = formData.name.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
            if (c1.length > 0 && c2.length > 0) {
              const hasMatch = c1.some(w => c2.includes(w));
              if (!hasMatch) {
                toast.error(`Warning: Document name "${info.name}" does not match candidate name "${formData.name}". Please verify the document.`, { duration: 6000 });
              }
            }
          }
        }
        if (fileId === 'marksheet_10th') {
            if (info.tenth_percentage) extractedFields.push('10th Percentage');
            if (info.tenth_subjects?.length) extractedFields.push('10th Subjects');
        }
        if (fileId === 'marksheet_12th') {
            if (info.twelfth_percentage) extractedFields.push('12th Percentage');
            if (info.twelfth_subjects?.length) extractedFields.push('12th Subjects');
        }
        if (fileId === 'marksheet_diploma' || fileId === 'diplomaCertificate') {
            if (info.college_cgpa) extractedFields.push('CGPA');
            if (info.diploma_subjects?.length) extractedFields.push('Diploma Subjects');
        }
        if (fileId === 'degreeCertificate') {
            if (info.college_cgpa) extractedFields.push('CGPA');
            if (info.degree_subjects?.length) extractedFields.push('Degree Subjects');
        }
        
        if (info.email && !formData.email) extractedFields.push('Email');
        if (info.mobile && !formData.mobile) extractedFields.push('Mobile');
        if (info.current_location && !formData.currentLocation) extractedFields.push('Location');
        if (info.total_years_experience) extractedFields.push('Experience');
        
        if (fileId.startsWith('deg_sem_')) {
            const sem = fileId.replace('deg_sem_', '');
            if (info.college_sgpa || info.semester_details?.[sem]?.sgpa) extractedFields.push('SGPA');
            if (info.semester_details?.[sem]?.subjects?.length) extractedFields.push('Subjects');
        }
        if (fileId.startsWith('dip_sem_')) {
            const sem = fileId.replace('dip_sem_', '');
            if (info.college_sgpa || info.semester_details?.[sem]?.sgpa) extractedFields.push('SGPA');
            if (info.semester_details?.[sem]?.subjects?.length) extractedFields.push('Subjects');
        }

        if (extractedFields.length > 0) {
            toast.success(`Information is extracted: ${extractedFields.join(', ')}`);
        } else {
            toast.error(`No information could be extracted from this document.`);
        }
        setLiveExtractedInfo(prev => ({
          ...prev,
          ...info,
          semester_details: {
            ...(prev.semester_details || {}),
            ...(info.semester_details || {})
          }
        }));
        setFormData(prev => {
          const newData = { ...prev };
          if (info.name && !newData.name) newData.name = info.name;
          if (info.email && !newData.email) newData.email = info.email;
          if (info.mobile && !newData.mobile) newData.mobile = info.mobile;
          if (info.current_location && !newData.currentLocation) newData.currentLocation = info.current_location;
          
          if (info.total_years_experience || info.current_company || info.designation) {
            newData.experienceType = (info.total_years_experience > 0 || info.total_years_experience === '1+') ? 'EXPERIENCE' : 'FRESHER';
            newData.experience_details = {
              ...newData.experience_details,
              total_years: info.total_years_experience || newData.experience_details.total_years,
              current_company: info.current_company || newData.experience_details.current_company,
              designation: info.designation || newData.experience_details.designation
            };
          }

          if (fileId === 'marksheet_10th' && info.tenth_percentage) {
            newData.education_details = { ...newData.education_details };
            newData.education_details.tenth_percentage = info.tenth_percentage;
          }
          if (fileId === 'marksheet_12th' && info.twelfth_percentage) {
            newData.education_details = { ...newData.education_details };
            newData.education_details.twelfth_percentage = info.twelfth_percentage;
          }

          if (fileId.startsWith('deg_sem_')) {
            const sem = fileId.replace('deg_sem_', '');
            const sgpa = info.college_sgpa || info.semester_details?.[sem]?.sgpa;
            const passDate = info.semester_details?.[sem]?.passing_date;
            
            newData.education_details = { ...newData.education_details };
            if (sgpa) newData.education_details[`degree_sgpa_${sem}`] = sgpa;
            if (passDate) newData.education_details[`degree_pass_date_${sem}`] = passDate;
          }

          if (fileId.startsWith('dip_sem_')) {
            const sem = fileId.replace('dip_sem_', '');
            const sgpa = info.college_sgpa || info.semester_details?.[sem]?.sgpa;
            const passDate = info.semester_details?.[sem]?.passing_date;
            
            newData.education_details = { ...newData.education_details };
            if (sgpa) newData.education_details[`diploma_sgpa_${sem}`] = sgpa;
            if (passDate) newData.education_details[`diploma_pass_date_${sem}`] = passDate;
          }

          return newData;
        });
      } else {
          toast.error("Server failed to extract data from document.");
      }
    } catch (err) {
      console.error("Extraction failed", err);
      toast.error(`Extraction Error: ${err.message || 'Unknown error'}`);
    } finally {
      setParsingFiles(prev => ({...prev, [fileId]: false}));
    }
  };

  const inputClass = "w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 px-4 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1.5";
  const sectionTitleClass = "text-[14px] font-black uppercase tracking-widest text-[var(--text-main)] border-b border-[var(--border-color)] pb-2 mb-5 flex items-center gap-2";

  const handleCheckboxChange = (pos) => {
    setFormData(prev => {
      const isSelected = prev.position.includes(pos);
      let newPositions;
      if (isSelected) {
        newPositions = prev.position.filter(p => p !== pos);
      } else {
        newPositions = [...prev.position, pos];
      }
      return { ...prev, position: newPositions };
    });
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchCandidateByIdApi(id).then(res => {
        if (res.data?.success) {
          const candidate = res.data.data;
          
          let parsedAppliedAt = [];
          if (candidate.applied_at) {
              parsedAppliedAt = typeof candidate.applied_at === 'string' ? JSON.parse(candidate.applied_at) : candidate.applied_at;
          } else if (candidate.position) {
              parsedAppliedAt = candidate.position.split(',').map(p => p.trim()).filter(Boolean);
          }
          
          let parsedShortlistedFor = [];
          if (candidate.shortlisted_for) {
              parsedShortlistedFor = typeof candidate.shortlisted_for === 'string' ? JSON.parse(candidate.shortlisted_for) : candidate.shortlisted_for;
          }

          setFormData({
            appliedAt: parsedAppliedAt,
            shortlistedFor: parsedShortlistedFor,
            name: candidate.name || '',
            experienceType: candidate.experience_type || 'FRESHER',
            email: candidate.email || '',
            whatsapp: candidate.whatsapp || '',
            mobile: candidate.mobile || '',
            currentLocation: candidate.current_location || '',
            relocate: candidate.relocate ? 'YES' : 'NO',
            educationRoute: candidate.education_route || 'REGULAR',
            date_of_birth: candidate.date_of_birth || '',
            experience_details: {
              total_years: candidate.total_years || '0',
              designation: candidate.designation || 'N/A',
              current_company: candidate.current_company || 'N/A',
              past_experiences: (typeof candidate.past_experiences === 'string' ? JSON.parse(candidate.past_experiences) : candidate.past_experiences) || [
                { company_name: '', designation: '', reason_for_leaving: '', year_of_leaving: '' }
              ]
            },
            education_details: typeof candidate.education_details === 'string' 
              ? JSON.parse(candidate.education_details) 
              : (candidate.education_details || {
                  tenth_percentage: '', tenth_passing_year: '',
                  twelfth_percentage: '', twelfth_passing_year: '',
                  diploma_sgpa_1: '', diploma_sgpa_2: '', diploma_sgpa_3: '', diploma_sgpa_4: '', diploma_sgpa_5: '', diploma_sgpa_6: '',
                  diploma_cgpa: '', diploma_passing_year: '',
                  degree_sgpa_1: '', degree_sgpa_2: '', degree_sgpa_3: '', degree_sgpa_4: '', degree_sgpa_5: '', degree_sgpa_6: '', degree_sgpa_7: '', degree_sgpa_8: '',
                  degree_cgpa: '', degree_passing_year: ''
              })
          });

          const docs = typeof candidate.documents === 'string' ? JSON.parse(candidate.documents || '{}') : (candidate.documents || {});
          const mock = {};
          Object.keys(docs).forEach(k => mock[k] = true);
          setUploadMock(prev => ({...prev, ...mock}));

          const tech = typeof candidate.technical_details === 'string' ? JSON.parse(candidate.technical_details || '{}') : (candidate.technical_details || {});
          if (tech.python_developer) setPythonDetails(prev => ({...prev, ...tech.python_developer}));
          if (tech.embedded_software) setEmbeddedDetails(prev => ({...prev, ...tech.embedded_software}));
          if (tech.embedded_hardware) setHardwareDetails(prev => ({...prev, ...tech.embedded_hardware}));
          if (tech.sales_executive) setSalesDetails(prev => ({...prev, ...tech.sales_executive}));
          if (tech.purchase_executive) setPurchaseDetails(prev => ({...prev, ...tech.purchase_executive}));
          if (tech.production_engineer) setProductionDetails(prev => ({...prev, ...tech.production_engineer}));
          if (tech.qc_engineer) setQcDetails(prev => ({...prev, ...tech.qc_engineer}));
          if (tech.pcb_designer) setPcbDetails(prev => ({...prev, ...tech.pcb_designer}));
          
          if (updateTabLabel) {
            updateTabLabel(location.pathname, candidate.name);
          }
        }
      }).catch(err => {
        toast.error('Failed to load candidate details');
      }).finally(() => setLoading(false));
    }
  }, [id, location.pathname, updateTabLabel]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtractingZip, setIsExtractingZip] = useState(false);

  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleZipUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const uploadFormData = new FormData();
      uploadFormData.append('zipFile', file);
      
      setIsExtractingZip(true);
      toast.loading('Analyzing ZIP contents using AI...', { id: 'zip-upload' });
      
      try {
        const res = await extractCandidateZipApi(uploadFormData);
        if (res.data?.success && res.data?.data) {
          const extracted = res.data.data;
          const extractedDocs = res.data.documents;
          
          setLiveExtractedInfo(prev => ({
            ...prev,
            ...extracted,
            semester_details: {
              ...(prev.semester_details || {}),
              ...(extracted.semester_details || {})
            }
          }));

          setFormData(prev => {
            const newData = { ...prev };
            if (extracted.name && !newData.name) newData.name = extracted.name;
            if (extracted.email && !newData.email) newData.email = extracted.email;
            if (extracted.mobile && !newData.mobile) newData.mobile = extracted.mobile;
            if (extracted.current_location && !newData.currentLocation) newData.currentLocation = extracted.current_location;
            if (extracted.whatsapp && !newData.whatsapp) newData.whatsapp = extracted.whatsapp;
            if (extracted.date_of_birth && !newData.date_of_birth) newData.date_of_birth = extracted.date_of_birth;
            
            if (extracted.total_years_experience || extracted.current_company || extracted.designation) {
              newData.experienceType = (extracted.total_years_experience > 0 || extracted.total_years_experience === '1+') ? 'EXPERIENCE' : 'FRESHER';
              newData.experience_details = {
                ...newData.experience_details,
                total_years: extracted.total_years_experience || newData.experience_details.total_years,
                current_company: extracted.current_company || newData.experience_details.current_company,
                designation: extracted.designation || newData.experience_details.designation
              };
            }

            newData.education_details = { ...newData.education_details };
            if (extracted.tenth_percentage) newData.education_details.tenth_percentage = extracted.tenth_percentage;
            if (extracted.twelfth_percentage) newData.education_details.twelfth_percentage = extracted.twelfth_percentage;
            if (extracted.college_cgpa) newData.education_details.degree_cgpa = extracted.college_cgpa;
            
            // Loop for SGPAs if they exist in semester_details
            if (extracted.semester_details) {
              Object.keys(extracted.semester_details).forEach(sem => {
                const semData = extracted.semester_details[sem];
                if (semData.sgpa) {
                  // By default mapped to degree_sgpa since zip doesn't strongly differentiate diploma/degree here easily
                  newData.education_details[`degree_sgpa_${sem}`] = semData.sgpa;
                }
              });
            }
            return newData;
          });

          if (extractedDocs && Object.keys(extractedDocs).length > 0) {
            setUploadMock(prev => {
              const newMock = { ...prev };
              Object.keys(extractedDocs).forEach(key => {
                const base64Str = extractedDocs[key];
                const ext = base64Str.includes('application/pdf') ? 'pdf' : (base64Str.includes('image/png') ? 'png' : 'jpg');
                newMock[key] = dataURLtoFile(base64Str, `${key}.${ext}`);
              });
              return newMock;
            });
          }
          
          toast.success('Successfully extracted and filled data!', { id: 'zip-upload' });
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to extract data from ZIP file.', { id: 'zip-upload' });
      } finally {
        setIsExtractingZip(false);
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter the candidate\'s name');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Please enter the candidate\'s email');
      return;
    }

    // Document Validations removed as per user request
    

    try {
      setIsSubmitting(true);
      const submitData = new FormData();
      submitData.append('appliedAt', JSON.stringify(formData.appliedAt));
      submitData.append('shortlistedFor', JSON.stringify(formData.shortlistedFor));
      submitData.append('name', formData.name);
      submitData.append('experienceType', formData.experienceType);
      submitData.append('email', formData.email);
      submitData.append('whatsapp', formData.whatsapp);
      submitData.append('mobile', formData.mobile);
      submitData.append('currentLocation', formData.currentLocation);
      submitData.append('relocate', formData.relocate);
      submitData.append('educationRoute', formData.educationRoute);
      if (formData.date_of_birth) {
        submitData.append('date_of_birth', formData.date_of_birth);
      }
      const experience_details_payload = { ...formData.experience_details };
      if (experience_details_payload.past_experiences && experience_details_payload.past_experiences.length > 0) {
        experience_details_payload.designation = experience_details_payload.past_experiences[0].designation;
        experience_details_payload.current_company = experience_details_payload.past_experiences[0].company_name;
      }
      submitData.append('experience_details', JSON.stringify(experience_details_payload));
      submitData.append('education_details', JSON.stringify(formData.education_details));

      const combinedTechDetails = {};
      const allPositions = [...formData.appliedAt, ...formData.shortlistedFor];
      
      if (allPositions.includes('Python Developer')) {
        combinedTechDetails.python_developer = pythonDetails;
      }
      if (allPositions.includes('Embedded Software')) {
        combinedTechDetails.embedded_software = embeddedDetails;
      }
      if (allPositions.includes('Embedded Hardware')) {
        combinedTechDetails.embedded_hardware = hardwareDetails;
      }
      if (allPositions.includes('Sales Executive')) {
        combinedTechDetails.sales_executive = salesDetails;
      }
      if (allPositions.includes('Purchase Executive')) {
        combinedTechDetails.purchase_executive = purchaseDetails;
      }
      if (allPositions.includes('Production Engineer')) {
        combinedTechDetails.production_engineer = productionDetails;
      }
      if (allPositions.includes('QC Engineer')) {
        combinedTechDetails.qc_engineer = qcDetails;
      }
      if (allPositions.includes('PCB Designer')) {
        combinedTechDetails.pcb_designer = pcbDetails;
      }
      
      if (Object.keys(combinedTechDetails).length > 0) {
        submitData.append('technical_details', JSON.stringify(combinedTechDetails));
      }

      // Append files
      Object.keys(uploadMock).forEach(key => {
        if (uploadMock[key] instanceof File) {
          submitData.append(key, uploadMock[key]);
        }
      });

      const res = id 
        ? await updateCandidateApi(id, submitData)
        : await createCandidateApi(submitData);
        
      if (res.data?.success) {
        toast.success(`Candidate Application ${id ? 'updated' : 'submitted'} successfully!`);
        navigate('/hr/recruitment/candidate');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const POSITIONS = [
    'Embedded Software', 'Embedded Hardware', 'Purchase Executive', 'PCB Designer',
    'Python Developer', 'Sales Executive', 'Production Engineer', 'QC Engineer'
  ];

  const renderCreatableSelect = (label, key) => {
    const options = POSITIONS.filter(o => !(formData[key] || []).includes(o));
    const currentInput = selectInputs[key] || '';
    const filteredOptions = options.filter(o => o.toLowerCase().includes(currentInput.toLowerCase()));

    const handleAdd = (val) => {
      if (!val.trim()) return;
      if (!(formData[key] || []).includes(val.trim())) {
        setFormData(prev => ({
          ...prev,
          [key]: [...(prev[key] || []), val.trim()]
        }));
      }
      setSelectInputs(prev => ({ ...prev, [key]: '' }));
      setDropdownOpen(prev => ({ ...prev, [key]: false }));
    };

    const handleRemove = (valToRemove) => {
      setFormData(prev => ({
        ...prev,
        [key]: (prev[key] || []).filter(v => v !== valToRemove)
      }));
    };

    return (
      <div className="flex flex-col space-y-2 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] h-[250px]">
        <label className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center justify-between">
          {label}
          <span className="bg-[var(--bg-workspace)] text-[var(--text-muted)] px-1.5 py-0.5 rounded text-[9px]">
            {(formData[key] || []).length}
          </span>
        </label>
        
        <div className="relative">
          <div className="flex relative items-center">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => {
                setSelectInputs(prev => ({ ...prev, [key]: e.target.value }));
                setDropdownOpen(prev => ({ ...prev, [key]: true }));
              }}
              onFocus={() => setDropdownOpen(prev => ({ ...prev, [key]: true }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd(currentInput);
                }
              }}
              placeholder={`Add ${label.toLowerCase()}...`}
              className="w-full px-3 py-1.5 text-[12px] rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors pr-8"
            />
            <button
              type="button"
              onClick={() => handleAdd(currentInput)}
              className="absolute right-1.5 p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {dropdownOpen[key] && (filteredOptions.length > 0 || currentInput.trim()) && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(prev => ({ ...prev, [key]: false }))} 
              />
              <div className="absolute z-50 w-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden">
                <div className="max-h-32 overflow-y-auto custom-scrollbar relative z-50 bg-[var(--bg-card)]">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt, i) => (
                      <div
                        key={i}
                        onClick={() => handleAdd(opt)}
                        className="px-3 py-1.5 text-[11px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-workspace)] hover:text-[var(--accent)] cursor-pointer transition-colors relative z-50"
                      >
                        {opt}
                      </div>
                    ))
                  ) : currentInput.trim() ? (
                    <div
                      onClick={() => handleAdd(currentInput)}
                      className="px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--bg-workspace)] cursor-pointer transition-colors flex items-center gap-1.5 relative z-50"
                    >
                      <Plus size={12} /> Add "{currentInput}"
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5 mt-2">
          {(formData[key] || []).length === 0 ? (
            <div className="h-full flex items-center justify-center text-[10px] text-[var(--text-dim)] italic border-2 border-dashed border-[var(--border-color)] rounded-lg">
              No entries added
            </div>
          ) : (
            (formData[key] || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[var(--bg-workspace)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] group hover:border-[var(--accent)] transition-all">
                <span className="text-[11px] font-semibold text-[var(--text-main)] break-all pr-2">{item}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="text-[var(--text-dim)] hover:text-red-500 opacity-50 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Remove"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const breadcrumbItems = [
    { label: 'HR', path: '/hr' },
    { label: 'Recruitment', path: '/hr/recruitment' },
    { label: 'Candidate', path: '/hr/recruitment/candidate' },
    { label: id ? (formData.name || 'Edit Candidate') : 'Add Candidate', path: '' }
  ];

  return (
    <div className="max-w-[1400px] mx-auto pb-6 relative">
      
      <div className="mb-2 flex justify-end">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/hr/recruitment/candidate')} className="p-2 hover:bg-[var(--bg-card)] rounded-full transition-colors border border-transparent hover:border-[var(--border-color)] text-[var(--text-muted)]">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{id ? 'Edit Candidate' : 'Add Candidate'}</h1>
            <p className="text-sm font-bold text-[var(--text-muted)] mt-1 tracking-wide">{id ? 'Modify candidate application details' : 'Fill up the application details below'}</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={isSubmitting || loading} className="px-8 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-xl shadow-lg shadow-[var(--accent)]/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[12px] disabled:opacity-50">
          <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save Candidate'}
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-[var(--text-muted)] font-semibold animate-pulse">Loading candidate data...</div>
      ) : (
        <div className="workspace-card p-0 overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl">
        
        {/* Tabs */}
        <div className="flex items-center border-b border-[var(--border-color)] px-6 pt-4 gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('Basic Information')}
            className={`px-6 py-3 font-bold text-[12px] uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'Basic Information'
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-workspace)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
            }`}
          >
            Basic Information
          </button>
          {[...new Set([...(formData.appliedAt || []), ...(formData.shortlistedFor || [])])].map(pos => (
            <button
              key={pos}
              onClick={() => setActiveTab(pos)}
              className={`px-6 py-3 font-bold text-[12px] uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${
                activeTab === pos
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-workspace)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'Basic Information' && (
            <div className="space-y-8">
              
              {/* Position Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div>
                  {renderCreatableSelect('Applied At', 'appliedAt')}
                </div>
                <div>
                  {renderCreatableSelect('Shortlisted For', 'shortlistedFor')}
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
                  <div>
                    <label className={labelClass}>Name*</label>
                    <input type="text" value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} className={inputClass} placeholder="Full Name" />
                  </div>
                  <div className="flex items-center gap-6 mt-6 md:mt-0">
                    <div onClick={() => setFormData(prev => ({...prev, experienceType: 'FRESHER'}))} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formData.experienceType === 'FRESHER' ? 'border-[var(--accent)]' : 'border-[var(--border-color)] group-hover:border-[var(--accent)]'}`}>
                        {formData.experienceType === 'FRESHER' && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                      </div>
                      <span className={`text-[12px] font-bold uppercase tracking-widest ${formData.experienceType === 'FRESHER' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>Fresher</span>
                    </div>
                    <div onClick={() => setFormData(prev => ({...prev, experienceType: 'EXPERIENCE'}))} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formData.experienceType === 'EXPERIENCE' ? 'border-[var(--accent)]' : 'border-[var(--border-color)] group-hover:border-[var(--accent)]'}`}>
                        {formData.experienceType === 'EXPERIENCE' && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                      </div>
                      <span className={`text-[12px] font-bold uppercase tracking-widest ${formData.experienceType === 'EXPERIENCE' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>Experience</span>
                    </div>
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Basic Information Fields */}
                <div>
                  <h3 className={sectionTitleClass}>
                    <User size={18} className="text-[var(--accent)]" /> Basic Information
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Email Id*</label>
                      <input type="email" value={formData.email} onChange={e => setFormData(prev => ({...prev, email: e.target.value}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>WhatsApp No.</label>
                      <input type="text" value={formData.whatsapp} onChange={e => setFormData(prev => ({...prev, whatsapp: e.target.value}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Mobile No.</label>
                      <input type="text" value={formData.mobile} onChange={e => setFormData(prev => ({...prev, mobile: e.target.value}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Current Location*</label>
                      <input type="text" value={formData.currentLocation} onChange={e => setFormData(prev => ({...prev, currentLocation: e.target.value}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Date of Birth</label>
                      <input type="date" value={formData.date_of_birth} onChange={e => setFormData(prev => ({...prev, date_of_birth: e.target.value}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Ready to relocate to Vadodara?</label>
                      <div className="flex items-center gap-6 mt-3">
                        <div onClick={() => setFormData(prev => ({...prev, relocate: 'NO'}))} className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formData.relocate === 'NO' ? 'border-[var(--accent)]' : 'border-[var(--border-color)] group-hover:border-[var(--accent)]'}`}>
                            {formData.relocate === 'NO' && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                          </div>
                          <span className={`text-[12px] font-bold uppercase tracking-widest ${formData.relocate === 'NO' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>NO</span>
                        </div>
                        <div onClick={() => setFormData(prev => ({...prev, relocate: 'YES'}))} className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formData.relocate === 'YES' ? 'border-[var(--accent)]' : 'border-[var(--border-color)] group-hover:border-[var(--accent)]'}`}>
                            {formData.relocate === 'YES' && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                          </div>
                          <span className={`text-[12px] font-bold uppercase tracking-widest ${formData.relocate === 'YES' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>YES</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Experience Details Fields */}
                {formData.experienceType === 'EXPERIENCE' && (
                  <div className="transition-opacity duration-300">
                    <div className="flex items-center justify-between mb-5 border-b border-[var(--border-color)] pb-2">
                      <h3 className="text-[14px] font-black uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2 m-0">
                        <Briefcase size={18} className="text-[var(--accent)]" /> Experience Details
                      </h3>
                      <button type="button" onClick={() => setFormData(prev => ({...prev, experience_details: {...prev.experience_details, past_experiences: [...prev.experience_details.past_experiences, { company_name: '', designation: '', reason_for_leaving: '' }]}}))} className="text-[12px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 uppercase tracking-widest">
                        <UserPlus size={14} /> Add Company
                      </button>
                    </div>
                    <div className="space-y-6">
                      <div className="grid grid-cols-[1.5fr_1fr] items-center gap-4">
                        <label className={`${labelClass} mb-0`}>Total Experience (in years)*</label>
                        <input type="number" value={formData.experience_details.total_years} onChange={e => setFormData(prev => ({...prev, experience_details: {...prev.experience_details, total_years: e.target.value}}))} className={inputClass} />
                      </div>

                      {formData.experience_details.past_experiences.map((exp, idx) => (
                        <div key={`exp_${idx}`} className="p-4 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl relative space-y-4">
                          {idx > 0 && (
                            <button type="button" onClick={() => setFormData(prev => ({...prev, experience_details: {...prev.experience_details, past_experiences: prev.experience_details.past_experiences.filter((_, i) => i !== idx)}}))} className="absolute top-4 right-4 text-red-500 text-[10px] font-bold uppercase hover:underline">Remove</button>
                          )}
                          <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2">Company {idx + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className={labelClass}>Company Name*</label>
                              <input type="text" value={exp.company_name} onChange={e => { const newExp = [...formData.experience_details.past_experiences]; newExp[idx].company_name = e.target.value; setFormData(prev => ({...prev, experience_details: {...prev.experience_details, past_experiences: newExp}}))}} className={inputClass} />
                            </div>
                            <div>
                              <label className={labelClass}>Designation*</label>
                              <input type="text" value={exp.designation} onChange={e => { const newExp = [...formData.experience_details.past_experiences]; newExp[idx].designation = e.target.value; setFormData(prev => ({...prev, experience_details: {...prev.experience_details, past_experiences: newExp}}))}} className={inputClass} />
                            </div>
                            <div className="md:col-span-2">
                              <label className={labelClass}>Reason for Leaving*</label>
                              <input type="text" value={exp.reason_for_leaving} onChange={e => { const newExp = [...formData.experience_details.past_experiences]; newExp[idx].reason_for_leaving = e.target.value; setFormData(prev => ({...prev, experience_details: {...prev.experience_details, past_experiences: newExp}}))}} className={inputClass} />
                            </div>
                            <div>
                              <label className={labelClass}>Year of Leaving*</label>
                              <input type="text" value={exp.year_of_leaving || ''} onChange={e => { const newExp = [...formData.experience_details.past_experiences]; newExp[idx].year_of_leaving = e.target.value; setFormData(prev => ({...prev, experience_details: {...prev.experience_details, past_experiences: newExp}}))}} className={inputClass} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SGPABarChart for Fresher */}
                {formData.experienceType === 'FRESHER' && (
                  <div className="transition-opacity duration-300 h-full min-h-[300px]">
                    <SGPABarChart eduDetails={formData.education_details} educationRoute={formData.educationRoute} />
                  </div>
                )}
              </div>

              {/* Education Details Fields */}
              <div className="pt-8 border-t border-[var(--border-color)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className={`${sectionTitleClass} !mb-0`}>
                    <FileText size={18} className="text-[var(--accent)]" /> Education Details
                  </h3>
                  <div className="flex items-center gap-6">
                    <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Education Route:</label>
                    <div onClick={() => setFormData(prev => ({...prev, educationRoute: 'REGULAR'}))} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formData.educationRoute === 'REGULAR' ? 'border-[var(--accent)]' : 'border-[var(--border-color)] group-hover:border-[var(--accent)]'}`}>
                        {formData.educationRoute === 'REGULAR' && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                      </div>
                      <span className={`text-[12px] font-bold uppercase tracking-widest ${formData.educationRoute === 'REGULAR' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>12th + Degree</span>
                    </div>
                    <div onClick={() => setFormData(prev => ({...prev, educationRoute: 'DIPLOMA'}))} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formData.educationRoute === 'DIPLOMA' ? 'border-[var(--accent)]' : 'border-[var(--border-color)] group-hover:border-[var(--accent)]'}`}>
                        {formData.educationRoute === 'DIPLOMA' && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                      </div>
                      <span className={`text-[12px] font-bold uppercase tracking-widest ${formData.educationRoute === 'DIPLOMA' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>Diploma + Degree</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* 10th Standard */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className={labelClass}>10th Percentage*</label>
                      <input type="number" step="0.01" value={formData.education_details.tenth_percentage} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, tenth_percentage: e.target.value}}))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>10th Passing Year*</label>
                      <input type="text" value={formData.education_details.tenth_passing_year} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, tenth_passing_year: e.target.value}}))} className={inputClass} />
                    </div>
                  </div>

                  {/* 12th Standard - Conditional based on Route */}
                  {formData.educationRoute === 'REGULAR' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[var(--border-color)] pt-6">
                      <div>
                        <label className={labelClass}>12th Percentage*</label>
                        <input type="number" step="0.01" value={formData.education_details.twelfth_percentage} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, twelfth_percentage: e.target.value}}))} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>12th Passing Year*</label>
                        <input type="text" value={formData.education_details.twelfth_passing_year} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, twelfth_passing_year: e.target.value}}))} className={inputClass} />
                      </div>
                    </div>
                  )}

                  {/* Diploma - Conditional based on Route */}
                  {formData.educationRoute === 'DIPLOMA' && (
                    <div className="border-t border-[var(--border-color)] pt-6">
                      <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-widest mb-4">Diploma (6 Semesters)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {[1, 2, 3, 4, 5, 6].map(sem => (
                          <div key={`dip_sem_${sem}`} className="flex flex-col gap-2 p-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl">
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Sem {sem}</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">SGPA</label>
                                <input type="number" step="0.01" value={formData.education_details[`diploma_sgpa_${sem}`] || ''} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, [`diploma_sgpa_${sem}`]: e.target.value}}))} className={inputClass} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Pass Month</label>
                                <input type="month" value={formData.education_details[`diploma_pass_date_${sem}`] || ''} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, [`diploma_pass_date_${sem}`]: e.target.value}}))} className={inputClass} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}>Diploma CGPA*</label>
                          <input type="number" step="0.01" value={formData.education_details.diploma_cgpa} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, diploma_cgpa: e.target.value}}))} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Diploma Passing Year*</label>
                          <input type="text" value={formData.education_details.diploma_passing_year} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, diploma_passing_year: e.target.value}}))} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bachelor Degree */}
                  {formData.experienceType !== 'EXPERIENCE' && (
                    <div className="border-t border-[var(--border-color)] pt-6">
                      <h4 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-widest mb-4">Degree ({formData.educationRoute === 'REGULAR' ? '8' : '6'} Semesters)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {(formData.educationRoute === 'REGULAR' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6]).map(sem => (
                          <div key={`deg_sem_${sem}`} className="flex flex-col gap-2 p-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl">
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Sem {sem}</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">SGPA</label>
                                <input type="number" step="0.01" value={formData.education_details[`degree_sgpa_${sem}`] || ''} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, [`degree_sgpa_${sem}`]: e.target.value}}))} className={inputClass} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Pass Month</label>
                                <input type="month" value={formData.education_details[`degree_pass_date_${sem}`] || ''} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, [`degree_pass_date_${sem}`]: e.target.value}}))} className={inputClass} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}>Degree CGPA*</label>
                          <input type="number" step="0.01" value={formData.education_details.degree_cgpa} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, degree_cgpa: e.target.value}}))} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Degree Passing Year*</label>
                          <input type="text" value={formData.education_details.degree_passing_year} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, degree_passing_year: e.target.value}}))} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Master's Degree */}
                  <div className="border-t border-[var(--border-color)] pt-6">
                    <label className="flex items-center gap-2 cursor-pointer w-max group mb-4">
                      <input 
                        type="checkbox" 
                        checked={formData.education_details.has_masters} 
                        onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, has_masters: e.target.checked}}))} 
                        className="accent-[var(--accent)] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-widest group-hover:text-[var(--accent)] transition-colors">Candidate has Master's Degree?</span>
                    </label>

                    {formData.education_details.has_masters && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl animate-in slide-in-from-top-2">
                        <div>
                          <label className={labelClass}>Master's CGPA*</label>
                          <input type="number" step="0.01" value={formData.education_details.masters_cgpa} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, masters_cgpa: e.target.value}}))} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Master's Passing Year*</label>
                          <input type="text" value={formData.education_details.masters_passing_year} onChange={e => setFormData(prev => ({...prev, education_details: {...prev.education_details, masters_passing_year: e.target.value}}))} className={inputClass} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[var(--border-color)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className={`${sectionTitleClass} !mb-0`}>
                    <FileText size={18} className="text-[var(--accent)]" /> Documents & Attachments
                  </h3>
                  <a href="#" className="text-[12px] font-bold text-[var(--accent)] hover:underline flex items-center gap-2 uppercase tracking-widest">
                    <UploadCloud size={16} /> 
                    Download Candidate Application Form
                  </a>
                </div>

                <div className="mb-8 p-6 bg-gradient-to-r from-[var(--bg-workspace)] to-white border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent)] rounded-xl transition-all relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[var(--accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <input type="file" accept=".zip,.rar" onChange={handleZipUpload} disabled={isExtractingZip} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="flex items-center justify-center gap-4 relative z-0">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                      <UploadCloud size={24} className={isExtractingZip ? "text-[var(--text-muted)]" : "text-[var(--accent)]"} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-widest mb-1">
                        {isExtractingZip ? 'Analyzing Archive using AI...' : 'Smart Upload (ZIP / RAR)'}
                      </h4>
                      <p className="text-[12px] font-semibold text-[var(--text-muted)]">
                        Drop a ZIP containing candidate documents (Resume, Marksheets, ID proofs, etc.). The system will extract and auto-fill the form.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">General Documents</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <DocumentDropzone label="Application Form" id="applicationForm" isUploaded={uploadMock.applicationForm} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.applicationForm} />
                      <DocumentDropzone label="Resume" id="resume" isUploaded={uploadMock.resume} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.resume} />
                      <DocumentDropzone label="10th Marksheet*" id="marksheet_10th" isUploaded={uploadMock.marksheet_10th} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.marksheet_10th} />
                      <DocumentDropzone label="Aadhar Card*" id="aadharCard" isUploaded={uploadMock.aadharCard} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.aadharCard} />
                      <DocumentDropzone label="PAN Card*" id="panCard" isUploaded={uploadMock.panCard} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.panCard} />
                      <DocumentDropzone label="Indian Passport" id="passport" isUploaded={uploadMock.passport} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.passport} />
                      {formData.educationRoute === 'REGULAR' && (
                        <DocumentDropzone label="12th Marksheet*" id="marksheet_12th" isUploaded={uploadMock.marksheet_12th} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.marksheet_12th} />
                      )}
                      {formData.experienceType === 'EXPERIENCE' && (
                        <DocumentDropzone label="Degree Certificate*" id="degreeCertificate" isUploaded={uploadMock.degreeCertificate} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.degreeCertificate} />
                      )}
                      {formData.education_details.has_masters && (
                        <DocumentDropzone label="Master's Certificate*" id="mastersCertificate" isUploaded={uploadMock.mastersCertificate} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles.mastersCertificate} />
                      )}
                    </div>
                  </div>

                  {formData.experienceType === 'EXPERIENCE' && formData.experience_details.past_experiences.map((exp, idx) => (
                    <div key={`exp_docs_${idx}`}>
                      <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">{exp.company_name ? `${exp.company_name} Documents` : `Company ${idx + 1} Documents`}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <DocumentDropzone label="Salary Slip 1" id={`salary_slip_1_${idx}`} isUploaded={uploadMock[`salary_slip_1_${idx}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`salary_slip_1_${idx}`]} />
                        <DocumentDropzone label="Salary Slip 2" id={`salary_slip_2_${idx}`} isUploaded={uploadMock[`salary_slip_2_${idx}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`salary_slip_2_${idx}`]} />
                        <DocumentDropzone label="Salary Slip 3" id={`salary_slip_3_${idx}`} isUploaded={uploadMock[`salary_slip_3_${idx}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`salary_slip_3_${idx}`]} />
                        <DocumentDropzone label="Experience Letter" id={`experience_letter_${idx}`} isUploaded={uploadMock[`experience_letter_${idx}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`experience_letter_${idx}`]} />
                        <DocumentDropzone label="Relieving Letter" id={`relieving_letter_${idx}`} isUploaded={uploadMock[`relieving_letter_${idx}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`relieving_letter_${idx}`]} />
                        <DocumentDropzone label="Offer Letter" id={`offer_letter_${idx}`} isUploaded={uploadMock[`offer_letter_${idx}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`offer_letter_${idx}`]} />
                      </div>
                    </div>
                  ))}

                  {formData.educationRoute === 'DIPLOMA' && (
                    <div>
                      <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Diploma Marksheets</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(sem => (
                          <DocumentDropzone key={`dip_sem_${sem}`} label={`Sem ${sem} Marksheet*`} id={`dip_sem_${sem}`} isUploaded={uploadMock[`dip_sem_${sem}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`dip_sem_${sem}`]} />
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.experienceType !== 'EXPERIENCE' && (
                    <div>
                      <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Degree Marksheets</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {formData.educationRoute === 'REGULAR' ? (
                          [1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                            <DocumentDropzone key={`deg_sem_${sem}`} label={`Sem ${sem} Marksheet${sem <= 6 ? '*' : ''}`} id={`deg_sem_${sem}`} isUploaded={uploadMock[`deg_sem_${sem}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`deg_sem_${sem}`]} />
                          ))
                        ) : (
                          [3, 4, 5, 6, 7, 8].map(sem => (
                            <DocumentDropzone key={`deg_sem_${sem}`} label={`Sem ${sem} Marksheet${sem <= 6 ? '*' : ''}`} id={`deg_sem_${sem}`} isUploaded={uploadMock[`deg_sem_${sem}`]} setUploadMock={setUploadMock} onFileSelected={handleDocumentExtract} isParsing={parsingFiles[`deg_sem_${sem}`]} />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-[11px] uppercase tracking-wider leading-relaxed text-center">
                  NOTE: PRINT THE DOWNLOADED PDF ON A4 SIZE PAPER AND FILL IT WITH BLUE INK. AFTER COMPLETING TO FILL THE FORM UPLOAD THE FILLED FORM IN PDF FORMATE USING THE UPLOAD LINK.
                </div> */}
              </div>

              <CandidateTimeline 
                experienceType={formData.experienceType}
                pastExperiences={formData.experience_details.past_experiences}
                educationRoute={formData.educationRoute} 
                documents={uploadMock} 
                extractedInfo={liveExtractedInfo} 
                eduDetails={formData.education_details} 
                dateOfBirth={formData.date_of_birth}
              />

            </div>
          )}
          
          {activeTab === 'Python Developer' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <h3 className={sectionTitleClass}>
                <Briefcase size={18} className="text-[var(--accent)]" /> Python Developer Assessment
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                
                {/* Left Column */}
                <div className="space-y-6">
                  <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                    <label className={`${labelClass} mb-0`}>Rate yourself as Python Developer</label>
                    <select value={pythonDetails.rate_python_developer} onChange={e => setPythonDetails(prev => ({...prev, rate_python_developer: e.target.value}))} className={inputClass}>
                      <option value="Nill">Nill</option>
                      <option value="Noob">Noob</option>
                      <option value="Mod">Mod</option>
                      <option value="Adv">Adv</option>
                      <option value="Ace">Ace</option>
                    </select>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                      <label className={`${labelClass} mb-0`}>No. of on field Project*</label>
                      <input type="number" value={pythonDetails.field_projects_count} onChange={e => setPythonDetails(prev => ({...prev, field_projects_count: e.target.value}))} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                      <label className={`${labelClass} mb-0`}>No. of Mass Production Projects*</label>
                      <input type="number" value={pythonDetails.mass_production_projects_count} onChange={e => setPythonDetails(prev => ({...prev, mass_production_projects_count: e.target.value}))} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                      <label className={`${labelClass} mb-0`}>Success ratio for on field Projects*</label>
                      <input type="number" step="0.01" value={pythonDetails.success_ratio_field_projects} onChange={e => setPythonDetails(prev => ({...prev, success_ratio_field_projects: e.target.value}))} className={inputClass} />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                    <label className={`${labelClass} mb-0`}>OS Experience</label>
                    <select value={pythonDetails.os_experience} onChange={e => setPythonDetails(prev => ({...prev, os_experience: e.target.value}))} className={inputClass}>
                      <option value="WINDOWS">WINDOWS</option>
                      <option value="LINUX">LINUX</option>
                      <option value="MAC OS">MAC OS</option>
                      <option value="UBUNTU">UBUNTU</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                    <label className={`${labelClass} mb-0`}>Database Known</label>
                    <select value={pythonDetails.database_known} onChange={e => setPythonDetails(prev => ({...prev, database_known: e.target.value}))} className={inputClass}>
                      <option value="SQL">SQL</option>
                      <option value="MYSQL">MYSQL</option>
                      <option value="POSTGRESQL">POSTGRESQL</option>
                      <option value="MONGODB">MONGODB</option>
                      <option value="ORACLE">ORACLE</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                    <label className={`${labelClass} mb-0`}>SDLC Experience</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="sdlc" checked={pythonDetails.sdlc_experience === 'NO'} onChange={() => setPythonDetails(prev => ({...prev, sdlc_experience: 'NO'}))} className="accent-[var(--accent)]" />
                        <span className="text-[12px] font-bold text-[var(--text-main)] uppercase">NO</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="sdlc" checked={pythonDetails.sdlc_experience === 'YES'} onChange={() => setPythonDetails(prev => ({...prev, sdlc_experience: 'YES'}))} className="accent-[var(--accent)]" />
                        <span className="text-[12px] font-bold text-[var(--text-main)] uppercase">YES</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox Grids */}
              <div className="space-y-6 pt-6 border-t border-[var(--border-color)]">
                
                <div>
                  <label className={labelClass}>Languages Known</label>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    {['C', 'C++', 'Python', 'Java', 'N/A', 'Other'].map(lang => (
                      <label key={lang} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={pythonDetails.languages_known.includes(lang)} onChange={() => toggleCheckbox('languages_known', lang)} className="accent-[var(--accent)] w-3.5 h-3.5" />
                        <span className="text-[13px] font-semibold text-[var(--text-main)]">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Framework Worked on</label>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    {['Django', 'Odoo', 'Flask', 'N/A', 'Other'].map(fw => (
                      <label key={fw} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={pythonDetails.frameworks_worked_on.includes(fw)} onChange={() => toggleCheckbox('frameworks_worked_on', fw)} className="accent-[var(--accent)] w-3.5 h-3.5" />
                        <span className="text-[13px] font-semibold text-[var(--text-main)]">{fw}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Frontend Worked on</label>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    {['CSS', 'JS', 'HTML', 'Angular JS', 'React', 'N/A', 'Other'].map(fe => (
                      <label key={fe} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={pythonDetails.frontend_worked_on.includes(fe)} onChange={() => toggleCheckbox('frontend_worked_on', fe)} className="accent-[var(--accent)] w-3.5 h-3.5" />
                        <span className="text-[13px] font-semibold text-[var(--text-main)]">{fe}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Any Experience on this technologies</label>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    {['Flutter', 'React Native', 'N/A'].map(tech => (
                      <label key={tech} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={pythonDetails.technologies_experience.includes(tech)} onChange={() => toggleCheckbox('technologies_experience', tech)} className="accent-[var(--accent)] w-3.5 h-3.5" />
                        <span className="text-[13px] font-semibold text-[var(--text-main)]">{tech}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Version Control System Worked on</label>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    {['GIT', 'SVN', 'N/A', 'Other'].map(vcs => (
                      <label key={vcs} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={pythonDetails.vcs_worked_on.includes(vcs)} onChange={() => toggleCheckbox('vcs_worked_on', vcs)} className="accent-[var(--accent)] w-3.5 h-3.5" />
                        <span className="text-[13px] font-semibold text-[var(--text-main)]">{vcs}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
          
          {activeTab === 'Embedded Software' && (
            <div className="space-y-10 max-w-6xl mx-auto">
              
              {/* Graph Image */}
              <div className="flex flex-col items-center justify-center py-6 bg-white rounded-xl border border-[var(--border-color)]">
                <img src="/proficiency-graph.jpg" alt="Select proficiency according to graph" className="max-w-full h-auto max-h-[300px] object-contain" />
              </div>

              {/* Skills Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h4 className="text-[14px] font-black text-[var(--accent)] mb-4">Please Rate your skills of C & Embedded C</h4>
                  <div className="space-y-1">
                    {Object.keys(embeddedDetails.c_skills).map(skill => (
                      <RatingRow key={skill} label={skill} value={embeddedDetails.c_skills[skill]} onChange={(val) => updateEmbeddedNested('c_skills', skill, val)} />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-[var(--accent)] mb-4">Rate your proficiency in C++ & Java</h4>
                  <div className="space-y-1">
                    {Object.keys(embeddedDetails.cpp_java_skills).map(skill => (
                      <RatingRow key={skill} label={skill} value={embeddedDetails.cpp_java_skills[skill]} onChange={(val) => updateEmbeddedNested('cpp_java_skills', skill, val)} />
                    ))}
                  </div>
                </div>
              </div>

              {/* MCU Platforms */}
              <div>
                <h4 className="text-[14px] font-black text-[var(--accent)] mb-4">Rate your proficiency in the following MCU platforms</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                  {Object.keys(embeddedDetails.mcu_platforms).map(mcu => (
                    <RatingRow key={mcu} label={mcu} value={embeddedDetails.mcu_platforms[mcu]} onChange={(val) => updateEmbeddedNested('mcu_platforms', mcu, val)} />
                  ))}
                  <div className="flex items-center justify-between py-1.5 px-2">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-[140px]">Other</span>
                    <div className="flex items-center gap-3 flex-1">
                      <input type="checkbox" checked={embeddedDetails.mcu_other_checked} onChange={(e) => setEmbeddedDetails(prev => ({...prev, mcu_other_checked: e.target.checked}))} className="accent-[var(--accent)] w-4 h-4" />
                      {embeddedDetails.mcu_other_checked && (
                        <input type="text" value={embeddedDetails.mcu_other_value} onChange={e => setEmbeddedDetails(prev => ({...prev, mcu_other_value: e.target.value}))} className={`${inputClass} !py-1 !text-[12px]`} placeholder="Specify..." />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compilers */}
              <div>
                <h4 className="text-[14px] font-black text-[var(--accent)] mb-4">Rate your proficiency on Compilers, Debuggers and IDEs</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                  {Object.keys(embeddedDetails.compilers).map(comp => (
                    <RatingRow key={comp} label={comp === 'IAR_2' ? 'IAR' : comp} value={embeddedDetails.compilers[comp]} onChange={(val) => updateEmbeddedNested('compilers', comp, val)} />
                  ))}
                  <div className="flex items-center justify-between py-1.5 px-2">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-[140px]">Other</span>
                    <div className="flex items-center gap-3 flex-1">
                      <input type="checkbox" checked={embeddedDetails.compiler_other_checked} onChange={(e) => setEmbeddedDetails(prev => ({...prev, compiler_other_checked: e.target.checked}))} className="accent-[var(--accent)] w-4 h-4" />
                      {embeddedDetails.compiler_other_checked && (
                        <input type="text" value={embeddedDetails.compiler_other_value} onChange={e => setEmbeddedDetails(prev => ({...prev, compiler_other_value: e.target.value}))} className={`${inputClass} !py-1 !text-[12px]`} placeholder="Specify..." />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Peripherals */}
              <div className="space-y-8">
                <div>
                  <h4 className="text-[14px] font-black text-[var(--accent)] mb-4">Select the internal peripherals that you have worked on</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['TIMER', 'UART', 'SPI', 'I2C', 'DMA', 'ADC', 'DAC', 'SDIO', 'USB', 'PWM', 'ETHERNET', 'SLEEP MODE', 'INTERNAL RTC', 'BIT BANDING', 'N/A'].map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={embeddedDetails.internal_peripherals.includes(p)} onChange={() => toggleEmbeddedCheckbox('internal_peripherals', p)} className="accent-[var(--accent)] w-4 h-4" />
                        <span className="text-[11px] font-bold text-[var(--text-main)]">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[14px] font-black text-[var(--accent)] mb-4">Select the external peripherals that you have worked on</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      'DC Motor', 'Stepper Motor', 'TFT Display', 'Monochrome GLCD', 'RGB TFT', 'RFID', 'other',
                      'Sig-Mesh', 'EEPROM', 'Parallel EEPROM', 'MOSFET Drivers', 'Relay Drivers', 'Segment Display',
                      'Matrix Keypad', 'SPI Flash', 'External RTC', 'Linear Actuators', '4-20 mA Sensing', '4-20 mA Actuators',
                      'CAP-Touch Screen', 'Capsense Keyboard', '2G/3G/4G modems', 'Bluetooth', 'Wi-Fi', 'LoRa WAN',
                      'AC current measurement', 'DC current measurement', 'TRIAC/DAIC Based Switching'
                    ].map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={embeddedDetails.external_peripherals.includes(p)} onChange={() => toggleEmbeddedCheckbox('external_peripherals', p)} className="accent-[var(--accent)] w-4 h-4" />
                        <span className="text-[11px] font-bold text-[var(--text-main)]">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[14px] font-black text-[var(--accent)] mb-4">Select the LAB equipment worked on</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      'DSO', 'Network Analyser', 'Spectrum Analyser', 'Multi-meter', 'Can Bus Simulators', 'Data Aquisition System',
                      'Low current meters', 'Function Generator', 'Harmonics Analyser', 'Logic Analyser', 'LC Meters', 'Surge Testers',
                      'Modbus Testers', 'Clamp Meter', 'Other'
                    ].map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={embeddedDetails.lab_equipment.includes(p)} onChange={() => toggleEmbeddedCheckbox('lab_equipment', p)} className="accent-[var(--accent)] w-4 h-4" />
                        <span className="text-[11px] font-bold text-[var(--text-main)]">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Projects Metrics */}
              <div>
                <h4 className="text-[14px] font-black text-[var(--accent)] mb-4">Project completed so far</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-1/2 leading-tight">During Engineering</span>
                    <input type="number" value={embeddedDetails.projects_completed.during_engineering} onChange={e => updateEmbeddedNested('projects_completed', 'during_engineering', e.target.value)} className={`${inputClass} flex-1`} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-1/2 leading-tight">After Engineering during your career</span>
                    <input type="number" value={embeddedDetails.projects_completed.after_engineering} onChange={e => updateEmbeddedNested('projects_completed', 'after_engineering', e.target.value)} className={`${inputClass} flex-1`} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-1/2 leading-tight">No. of product that entered mass-production</span>
                    <input type="number" value={embeddedDetails.projects_completed.mass_production} onChange={e => updateEmbeddedNested('projects_completed', 'mass_production', e.target.value)} className={`${inputClass} flex-1`} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-1/2 leading-tight">MAX. duration for which a product is into mass-production</span>
                    <input type="number" value={embeddedDetails.projects_completed.max_duration_mass_production} onChange={e => updateEmbeddedNested('projects_completed', 'max_duration_mass_production', e.target.value)} className={`${inputClass} flex-1`} />
                  </div>
                </div>
              </div>

              {/* Best Projects */}
              <div>
                <h4 className="text-[18px] font-black text-[var(--text-main)] mb-6">Enlist your best 2 project here</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {[0, 1].map(index => (
                    <div key={index} className="space-y-4">
                      <h5 className="text-[16px] font-black text-[var(--accent)]">Project {index + 1}</h5>
                      <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                        <label className={`${labelClass} mb-0 !text-[12px]`}>Project Name.</label>
                        <input type="text" value={embeddedDetails.best_projects[index].name} onChange={e => updateBestProject(index, 'name', e.target.value)} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                        <label className={`${labelClass} mb-0 !text-[12px]`}>Size of team?</label>
                        <input type="number" value={embeddedDetails.best_projects[index].team_size} onChange={e => updateBestProject(index, 'team_size', e.target.value)} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                        <label className={`${labelClass} mb-0 !text-[12px]`}>Your role in the team?</label>
                        <input type="text" value={embeddedDetails.best_projects[index].role} onChange={e => updateBestProject(index, 'role', e.target.value)} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                        <label className={`${labelClass} mb-0 !text-[12px] leading-tight`}>Duration of project development.</label>
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.01" value={embeddedDetails.best_projects[index].duration} onChange={e => updateBestProject(index, 'duration', e.target.value)} className={`${inputClass} w-24`} />
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={embeddedDetails.best_projects[index].duration_unit === 'MONTHS'} onChange={() => updateBestProject(index, 'duration_unit', 'MONTHS')} className="accent-[var(--accent)]" />
                            <span className="text-[10px] font-bold">MONTHS</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={embeddedDetails.best_projects[index].duration_unit === 'YEARS'} onChange={() => updateBestProject(index, 'duration_unit', 'YEARS')} className="accent-[var(--accent)]" />
                            <span className="text-[10px] font-bold">YEARS</span>
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                        <label className={`${labelClass} mb-0 !text-[12px] leading-tight`}>Compiler used in project</label>
                        <input type="text" value={embeddedDetails.best_projects[index].compiler} onChange={e => updateBestProject(index, 'compiler', e.target.value)} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                        <label className={`${labelClass} mb-0 !text-[12px] leading-tight`}>Did this Project go into production?</label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={embeddedDetails.best_projects[index].in_production === 'NO'} onChange={() => updateBestProject(index, 'in_production', 'NO')} className="accent-[var(--accent)]" />
                            <span className="text-[12px] font-bold">NO</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={embeddedDetails.best_projects[index].in_production === 'YES'} onChange={() => updateBestProject(index, 'in_production', 'YES')} className="accent-[var(--accent)]" />
                            <span className="text-[12px] font-bold">YES</span>
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
                        <label className={`${labelClass} mb-0 !text-[12px] leading-tight`}>Certifications taken for project.</label>
                        <input type="text" value={embeddedDetails.best_projects[index].certifications} onChange={e => updateBestProject(index, 'certifications', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={`${labelClass} !text-[12px] mb-2`}>Describe You Project {index + 1} in brief</label>
                        <textarea 
                          value={embeddedDetails.best_projects[index].description} 
                          onChange={e => updateBestProject(index, 'description', e.target.value)} 
                          className={`${inputClass} min-h-[150px] resize-y leading-relaxed`} 
                          placeholder="Type your project description here..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'Embedded Hardware' && (
            <div className="space-y-10 max-w-6xl mx-auto">
              
              {/* Graph Image */}
              <div className="flex flex-col items-center justify-center py-6 bg-white rounded-xl border border-[var(--border-color)]">
                <img src="/proficiency-graph.jpg" alt="Select proficiency according to graph" className="max-w-full h-auto max-h-[300px] object-contain" />
              </div>

              {/* HW Design Experience */}
              <div className="flex items-center gap-12">
                <div className="flex items-center gap-6">
                  <label className={`${labelClass} mb-0 !text-[12px]`}>Do You Have Experience In HW Design?</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={hardwareDetails.hw_design_experience === 'NO'} onChange={() => setHardwareDetails(prev => ({...prev, hw_design_experience: 'NO'}))} className="accent-[var(--accent)]" />
                      <span className="text-[12px] font-bold">NO</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={hardwareDetails.hw_design_experience === 'YES'} onChange={() => setHardwareDetails(prev => ({...prev, hw_design_experience: 'YES'}))} className="accent-[var(--accent)]" />
                      <span className="text-[12px] font-bold">YES</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className={`${labelClass} mb-0 !text-[12px]`}>How Many Years?</label>
                  <input type="number" value={hardwareDetails.hw_design_years} onChange={e => setHardwareDetails(prev => ({...prev, hw_design_years: e.target.value}))} disabled={hardwareDetails.hw_design_experience === 'NO'} className={`${inputClass} w-32`} />
                </div>
              </div>

              {/* Basic Electronic Components */}
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <label className={`${labelClass} mb-0 !text-[12px]`}>Do you have basic knowledge of electronic components?</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={hardwareDetails.basic_electronic_knowledge === 'NO'} onChange={() => setHardwareDetails(prev => ({...prev, basic_electronic_knowledge: 'NO'}))} className="accent-[var(--accent)]" />
                      <span className="text-[12px] font-bold">NO</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={hardwareDetails.basic_electronic_knowledge === 'YES'} onChange={() => setHardwareDetails(prev => ({...prev, basic_electronic_knowledge: 'YES'}))} className="accent-[var(--accent)]" />
                      <span className="text-[12px] font-bold">YES</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Resistor', 'Capacitor', 'Inductor', 'Diode', 'Transistor', 'Mosfet', 'Triac', 'IGBT', 'Transformer Design', 'Op-Amp'].map(comp => (
                    <label key={comp} className="flex items-center justify-between px-4 py-2 border border-[var(--border-color)] rounded bg-white cursor-pointer hover:border-[var(--accent)] transition-colors">
                      <span className="text-[12px] font-semibold text-[var(--text-main)]">{comp}</span>
                      <input type="checkbox" checked={hardwareDetails.components_worked.includes(comp)} onChange={() => toggleHardwareCheckbox('components_worked', comp)} className="accent-[var(--accent)] w-4 h-4" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Software Worked Upon */}
              <div className="space-y-4">
                <h4 className="text-[16px] font-black text-[var(--accent)]">Which software you have worked upon?</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Multisim', 'Matlab', 'Orcad', 'Eagle', 'Altium', 'Ki-kad', 'Pads', 'Other'].map(soft => (
                    <label key={soft} className="flex items-center justify-between px-4 py-2 border border-[var(--border-color)] rounded bg-white cursor-pointer hover:border-[var(--accent)] transition-colors">
                      <span className="text-[12px] font-semibold text-[var(--text-main)]">{soft}</span>
                      <input type="checkbox" checked={hardwareDetails.software_worked.includes(soft)} onChange={() => toggleHardwareCheckbox('software_worked', soft)} className="accent-[var(--accent)] w-4 h-4" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Power Supply & Transformers */}
              <div className="space-y-2">
                <div className="flex items-center gap-6">
                  <label className={`${labelClass} mb-0 !text-[12px]`}>Do you have any experience on power supply design?</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={hardwareDetails.power_supply_design === 'NO'} onChange={() => setHardwareDetails(prev => ({...prev, power_supply_design: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={hardwareDetails.power_supply_design === 'YES'} onChange={() => setHardwareDetails(prev => ({...prev, power_supply_design: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className={`${labelClass} mb-0 !text-[12px]`}>Do You Have Design Any Switching High Frequency Transformer?</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={hardwareDetails.high_freq_transformer === 'NO'} onChange={() => setHardwareDetails(prev => ({...prev, high_freq_transformer: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={hardwareDetails.high_freq_transformer === 'YES'} onChange={() => setHardwareDetails(prev => ({...prev, high_freq_transformer: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                  </div>
                </div>
              </div>

              {/* Motor Driver Circuits */}
              <div className="space-y-6">
                <h4 className="text-[18px] font-black text-[var(--accent)] border-b pb-2">Do you have any experience to design motor driver circuits?</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {/* BLDC Motor */}
                  <div className="space-y-3">
                    <RatingRow label="BLDC Motor" value={hardwareDetails.motor_driver_circuits.bldc.rating} onChange={(val) => updateHardwareMotor('bldc', 'rating', val)} />
                    <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Define Max Rating(In Watt)</span><input type="number" value={hardwareDetails.motor_driver_circuits.bldc.max_rating_watt} onChange={e => updateHardwareMotor('bldc', 'max_rating_watt', e.target.value)} className={`${inputClass} w-1/2`} /></div>
                    <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Types</span><div className="flex gap-3">{['Single Phase', 'Three Phase', 'BOTH', 'N/A'].map(opt => (<label key={opt} className="flex gap-1 items-center cursor-pointer"><input type="radio" checked={hardwareDetails.motor_driver_circuits.bldc.type === opt} onChange={() => updateHardwareMotor('bldc', 'type', opt)} className="accent-[var(--accent)]"/><span className="text-[10px] font-bold uppercase">{opt}</span></label>))}</div></div>
                    <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Construction</span><div className="flex gap-3">{['With Sensor', 'Sensorless', 'BOTH', 'N/A'].map(opt => (<label key={opt} className="flex gap-1 items-center cursor-pointer"><input type="radio" checked={hardwareDetails.motor_driver_circuits.bldc.construction === opt} onChange={() => updateHardwareMotor('bldc', 'construction', opt)} className="accent-[var(--accent)]"/><span className="text-[10px] font-bold uppercase">{opt}</span></label>))}</div></div>
                    <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Mode</span><div className="flex gap-3">{['Low Voltage', 'High Voltage', 'BOTH', 'N/A'].map(opt => (<label key={opt} className="flex gap-1 items-center cursor-pointer"><input type="radio" checked={hardwareDetails.motor_driver_circuits.bldc.mode === opt} onChange={() => updateHardwareMotor('bldc', 'mode', opt)} className="accent-[var(--accent)]"/><span className="text-[10px] font-bold uppercase">{opt}</span></label>))}</div></div>
                  </div>

                  <div className="space-y-8">
                    {/* Servo Motor */}
                    <div className="space-y-3">
                      <RatingRow label="Servo Motor" value={hardwareDetails.motor_driver_circuits.servo.rating} onChange={(val) => updateHardwareMotor('servo', 'rating', val)} />
                      <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Define Max Rating(In Watt)</span><input type="number" value={hardwareDetails.motor_driver_circuits.servo.max_rating_watt} onChange={e => updateHardwareMotor('servo', 'max_rating_watt', e.target.value)} className={`${inputClass} w-2/3`} /></div>
                    </div>
                    {/* PMSM Motor */}
                    <div className="space-y-3">
                      <RatingRow label="PMSM Motor" value={hardwareDetails.motor_driver_circuits.pmsm.rating} onChange={(val) => updateHardwareMotor('pmsm', 'rating', val)} />
                      <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Define Max Rating(In Watt)</span><input type="number" value={hardwareDetails.motor_driver_circuits.pmsm.max_rating_watt} onChange={e => updateHardwareMotor('pmsm', 'max_rating_watt', e.target.value)} className={`${inputClass} w-2/3`} /></div>
                    </div>
                  </div>

                  {/* Stepper Motor */}
                  <div className="space-y-3 md:col-span-2 md:w-1/2 md:pr-6">
                    <RatingRow label="Stepper Motor" value={hardwareDetails.motor_driver_circuits.stepper.rating} onChange={(val) => updateHardwareMotor('stepper', 'rating', val)} />
                    <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Define Max Rating(In Watt)</span><input type="number" value={hardwareDetails.motor_driver_circuits.stepper.max_rating_watt} onChange={e => updateHardwareMotor('stepper', 'max_rating_watt', e.target.value)} className={`${inputClass} w-1/2`} /></div>
                    {['Parmanent Motor', 'Variable Reluctance', 'Hybrid Syncronous'].map(opt => (
                      <label key={opt} className="flex items-center justify-between py-1.5 px-2 cursor-pointer hover:bg-gray-50">
                        <span className="text-[12px] font-bold">{opt}</span>
                        <input type="checkbox" checked={hardwareDetails.motor_driver_circuits.stepper[opt.toLowerCase().replace(' ', '_')]} onChange={(e) => updateHardwareMotor('stepper', opt.toLowerCase().replace(' ', '_'), e.target.checked)} className="accent-[var(--accent)] w-4 h-4"/>
                      </label>
                    ))}
                    <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Construction</span><div className="flex gap-3">{['UNIPOLAR', 'BIPOLAR', 'BOTH', 'N/A'].map(opt => (<label key={opt} className="flex gap-1 items-center cursor-pointer"><input type="radio" checked={hardwareDetails.motor_driver_circuits.stepper.construction === opt} onChange={() => updateHardwareMotor('stepper', 'construction', opt)} className="accent-[var(--accent)]"/><span className="text-[10px] font-bold uppercase">{opt}</span></label>))}</div></div>
                    <div className="flex items-center justify-between py-1 px-2"><span className="text-[12px] font-bold">Modes</span><div className="flex gap-3">{['Full Step', 'Half Step', 'Micro Step', 'Wave'].map(opt => (<label key={opt} className="flex gap-1 items-center cursor-pointer"><input type="radio" checked={hardwareDetails.motor_driver_circuits.stepper.modes === opt} onChange={() => updateHardwareMotor('stepper', 'modes', opt)} className="accent-[var(--accent)]"/><span className="text-[10px] font-bold uppercase">{opt}</span></label>))}</div></div>
                    <label className="flex items-center justify-between py-1.5 px-2 cursor-pointer hover:bg-gray-50">
                      <span className="text-[12px] font-bold">Other</span>
                      <input type="checkbox" checked={hardwareDetails.motor_driver_circuits.stepper.other} onChange={(e) => updateHardwareMotor('stepper', 'other', e.target.checked)} className="accent-[var(--accent)] w-4 h-4"/>
                    </label>
                  </div>
                </div>
              </div>

              {/* Communication Interfaces */}
              <div className="space-y-4">
                <h4 className="text-[16px] font-black text-[var(--accent)]">Communication interface you have worked upon?</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[
                    'SPI', 'I2C', 'CAN', 'Ethernet', 'ADC', 'RFID', 'USB', 'UART', 'TIMER', 'DMA',
                    'DAC', 'SDIO', 'PWM', 'SLEEP MODE', 'INTERNAL RTC', 'BIT BANDING', 'DC Motor', 'Monochrome GLCD', '2G/3G/4G modems', 'Bluetooth',
                    'WI-FI', 'LoRa WAN', 'Sig-Mesh', 'RS232', 'RS485', 'Segment Display', 'EEPROM', 'Parallel EEPROM', 'MOSFET Drivers', 'Relay Drivers',
                    'Stepper Motor', 'RGB TFT', 'Matrix Keypad', 'SPI Flash', 'External RTC', 'Linear Actuators', '4-20 mA Sensing', '4-20 mA Actuators', 'TFT Display', 'CAP-Touch Screen',
                    'Capsense Keyboard', 'DC current measurement', 'AC current measurement', 'TRIAC/DAIC Based Switching', 'Other'
                  ].map(p => (
                    <label key={p} className="flex items-center justify-between px-3 py-1.5 border border-[var(--border-color)] rounded bg-white cursor-pointer hover:border-[var(--accent)] transition-colors">
                      <span className="text-[10px] font-bold text-[var(--text-main)] truncate" title={p}>{p}</span>
                      <input type="checkbox" checked={hardwareDetails.communication_interface.includes(p)} onChange={() => toggleHardwareCheckbox('communication_interface', p)} className="accent-[var(--accent)] w-4 h-4" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Wireless Circuits */}
              <div className="space-y-4">
                <h4 className="text-[16px] font-black text-[var(--accent)]">Have you design any wireless circuit?</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
                  {['Bluetooth', 'WI-FI', 'GSM', 'GPS', 'Sub-Ghz', 'Zig-bee'].map(p => (
                    <label key={p} className="flex items-center justify-between px-4 py-2 border border-[var(--border-color)] rounded bg-white cursor-pointer hover:border-[var(--accent)] transition-colors">
                      <span className="text-[12px] font-bold text-[var(--text-main)]">{p}</span>
                      <input type="checkbox" checked={hardwareDetails.wireless_circuit.includes(p)} onChange={() => toggleHardwareCheckbox('wireless_circuit', p)} className="accent-[var(--accent)] w-4 h-4" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Mixed Signal Boards */}
              <div className="space-y-4">
                <h4 className="text-[16px] font-black text-[var(--accent)]">Have you design any mixed signal embedded boards?</h4>
                <div className="flex items-center gap-4 bg-white border border-[var(--border-color)] p-4 rounded">
                  <span className="text-[12px] font-bold text-[var(--text-main)] w-32">Name the product types</span>
                  <input type="text" value={hardwareDetails.mixed_signal_boards} onChange={e => setHardwareDetails(prev => ({...prev, mixed_signal_boards: e.target.value}))} className={`${inputClass} flex-1`} placeholder="N/A" />
                </div>
              </div>

              {/* High Speed Comm Boards */}
              <div className="space-y-4">
                <h4 className="text-[16px] font-black text-[var(--accent)]">Have you designed any high speed communication boards?</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
                  {['USB', 'ETHERNET', 'SD Card Interface', 'RAM - Processor Interface'].map(p => (
                    <label key={p} className="flex items-center justify-between px-4 py-2 border border-[var(--border-color)] rounded bg-white cursor-pointer hover:border-[var(--accent)] transition-colors">
                      <span className="text-[12px] font-bold text-[var(--text-main)]">{p}</span>
                      <input type="checkbox" checked={hardwareDetails.high_speed_comm_boards.includes(p)} onChange={() => toggleHardwareCheckbox('high_speed_comm_boards', p)} className="accent-[var(--accent)] w-4 h-4" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Equipment Rating */}
              <div className="space-y-4">
                <h4 className="text-[16px] font-black text-[var(--accent)]">Rate yourself for equipment you have worked on?</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    'Multi-meter', 'Oscilloscope', 'Clamp Meter',
                    'Lux Meter', 'LCR Meter', 'Network Analyser',
                    'Spectrum Analyser', 'Power Analyzer', 'Surge Tester',
                    'Function Generators', 'Variac', 'Other'
                  ].map(p => (
                    <label key={p} className="flex items-center justify-between px-4 py-2 border border-[var(--border-color)] rounded bg-white cursor-pointer hover:border-[var(--accent)] transition-colors">
                      <span className="text-[12px] font-bold text-[var(--text-main)] truncate" title={p}>{p}</span>
                      <input type="checkbox" checked={hardwareDetails.equipment_rating.includes(p)} onChange={() => toggleHardwareCheckbox('equipment_rating', p)} className="accent-[var(--accent)] w-4 h-4" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Misc Experience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 py-4 border-t border-[var(--border-color)]">
                {[
                  { label: 'Do You Have any experience on PCB designing?', state: 'pcb_designing' },
                  { label: 'Do you have any experience in high speed board design?', state: 'high_speed_board_design' },
                  { label: 'Do you have any experience on EMI/EMC clearance design?', state: 'emi_emc_clearance' },
                  { label: 'Have you worked on any certification standard?', state: 'certification_standard' },
                  { label: 'Do you have experience on on-field projects?', state: 'on_field_projects' },
                ].map(item => (
                  <div key={item.state} className="flex items-center justify-between bg-white px-4 py-3 border border-[var(--border-color)] rounded">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-3/4">{item.label}</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={hardwareDetails[item.state] === 'NO'} onChange={() => setHardwareDetails(prev => ({...prev, [item.state]: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={hardwareDetails[item.state] === 'YES'} onChange={() => setHardwareDetails(prev => ({...prev, [item.state]: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Sales Executive' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <div className="flex items-center gap-12 bg-white p-4 rounded border border-[var(--border-color)]">
                <span className="text-[14px] font-bold text-[var(--text-main)] w-[200px]">Rate yourself as Sales Executive</span>
                <select value={salesDetails.rating} onChange={e => setSalesDetails(prev => ({...prev, rating: e.target.value}))} className={`${inputClass} w-64`}>
                  <option value="Nill">Nill</option><option value="NOOB">NOOB</option><option value="MOD">MOD</option><option value="ADV">ADV</option><option value="ACE">ACE</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {[
                  { label: 'Lead Generation', state: 'lead_generation' },
                  { label: 'Willing to Travel', state: 'willing_to_travel' },
                  { label: 'Lead to Close ratio', state: 'lead_to_close_ratio' },
                  { label: 'Deal with International Customer', state: 'international_customer' },
                  { label: 'Interaction for Technical Projects', state: 'technical_projects' },
                  { label: 'Inter Department Communication', state: 'inter_department_comm' },
                  { label: 'Sales Document Generation', state: 'sales_document' }
                ].map(item => (
                  <div key={item.state} className="flex items-center justify-between py-2 border-b border-[var(--border-color)]/50 last:border-0">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-2/3 pr-4">{item.label}</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={salesDetails[item.state] === 'NO'} onChange={() => setSalesDetails(prev => ({...prev, [item.state]: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={salesDetails[item.state] === 'YES'} onChange={() => setSalesDetails(prev => ({...prev, [item.state]: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]/50">
                  <span className="text-[12px] font-bold text-[var(--text-main)] w-2/3 pr-4">Presentational Skills</span>
                  <select value={salesDetails.presentational_skills} onChange={e => setSalesDetails(prev => ({...prev, presentational_skills: e.target.value}))} className={`${inputClass} w-32`}>
                    <option value="Nill">Nill</option><option value="NOOB">NOOB</option><option value="MOD">MOD</option><option value="ADV">ADV</option><option value="ACE">ACE</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Purchase Executive' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <div className="flex items-center gap-12 bg-white p-4 rounded border border-[var(--border-color)]">
                <span className="text-[14px] font-bold text-[var(--text-main)] w-[200px]">Rate yourself as Purchase Executive</span>
                <select value={purchaseDetails.rating} onChange={e => setPurchaseDetails(prev => ({...prev, rating: e.target.value}))} className={`${inputClass} w-64`}>
                  <option value="Nill">Nill</option><option value="NOOB">NOOB</option><option value="MOD">MOD</option><option value="ADV">ADV</option><option value="ACE">ACE</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {[
                  { label: 'Finding New Vendors', state: 'finding_vendors' },
                  { label: 'Electronic component purchase experience', state: 'electronic_purchase' },
                  { label: 'International Purchase Experience', state: 'international_purchase' },
                  { label: 'Import Experience', state: 'import_experience' },
                  { label: 'Custom Clearance Experience', state: 'custom_clearance' },
                  { label: 'Inter Department Communication', state: 'inter_department_comm' }
                ].map(item => (
                  <div key={item.state} className="flex items-center justify-between py-2 border-b border-[var(--border-color)]/50 last:border-0">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-2/3 pr-4">{item.label}</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={purchaseDetails[item.state] === 'NO'} onChange={() => setPurchaseDetails(prev => ({...prev, [item.state]: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={purchaseDetails[item.state] === 'YES'} onChange={() => setPurchaseDetails(prev => ({...prev, [item.state]: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]/50">
                  <span className="text-[12px] font-bold text-[var(--text-main)] w-2/3 pr-4">Negotiation Skills</span>
                  <select value={purchaseDetails.negotiation_skills} onChange={e => setPurchaseDetails(prev => ({...prev, negotiation_skills: e.target.value}))} className={`${inputClass} w-32`}>
                    {[...Array(11).keys()].map(num => <option key={num} value={num}>{num}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Production Engineer' && (
            <div className="space-y-10 max-w-6xl mx-auto">
              <div className="flex items-center gap-12 bg-white p-4 rounded border border-[var(--border-color)]">
                <span className="text-[14px] font-bold text-[var(--text-main)] w-[250px]">Rate yourself in Production Engineer</span>
                <select value={productionDetails.rating} onChange={e => setProductionDetails(prev => ({...prev, rating: e.target.value}))} className={`${inputClass} w-64`}>
                  <option value="Nill">Nill</option><option value="NOOB">NOOB</option><option value="MOD">MOD</option><option value="ADV">ADV</option><option value="ACE">ACE</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {[
                  { label: 'Daily report generation', state: 'daily_report' },
                  { label: 'Inventory Maintenance', state: 'inventory_maintenance' },
                  { label: 'Inter Department Communication', state: 'inter_department_comm' }
                ].map(item => (
                  <div key={item.state} className="flex items-center justify-between py-2">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-2/3 pr-4">{item.label}</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={productionDetails[item.state] === 'NO'} onChange={() => setProductionDetails(prev => ({...prev, [item.state]: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={productionDetails[item.state] === 'YES'} onChange={() => setProductionDetails(prev => ({...prev, [item.state]: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-[14px] font-black text-[var(--text-main)]">Equipment Worked on</h4>
                <div className="flex flex-wrap gap-4">
                  {['Multi-meter', 'Oscilloscope', 'Network Analyser', 'Spectrum Analyser', 'Clamp Meter', 'Lux Meter', 'LCR Meter', 'N/A', 'Other'].map(eq => (
                    <label key={eq} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={productionDetails.equipment.includes(eq)} onChange={() => toggleArrayCheckbox(setProductionDetails, 'equipment', eq)} className="accent-[var(--accent)] w-4 h-4" />
                      <span className="text-[12px] font-semibold">{eq}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[14px] font-black text-[var(--text-main)]">Soldering Experience</h4>
                <div className="flex flex-wrap gap-4">
                  {['SMD (0201)', 'SMD (0402)', 'SMD (0603)', 'SMD (0805)', 'SMD (1206)', 'TH', 'N/A'].map(sol => (
                    <label key={sol} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={productionDetails.soldering.includes(sol)} onChange={() => toggleArrayCheckbox(setProductionDetails, 'soldering', sol)} className="accent-[var(--accent)] w-4 h-4" />
                      <span className="text-[12px] font-semibold">{sol}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'QC Engineer' && (
            <div className="space-y-10 max-w-6xl mx-auto">
              <div className="flex items-center gap-12 bg-white p-4 rounded border border-[var(--border-color)]">
                <span className="text-[14px] font-bold text-[var(--text-main)] w-[200px]">Rate yourself as QC Engineer</span>
                <select value={qcDetails.rating} onChange={e => setQcDetails(prev => ({...prev, rating: e.target.value}))} className={`${inputClass} w-64`}>
                  <option value="Nill">Nill</option><option value="NOOB">NOOB</option><option value="MOD">MOD</option><option value="ADV">ADV</option><option value="ACE">ACE</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {[
                  { label: 'Test Case Generation', state: 'test_case_generation' },
                  { label: 'Inter Department Communication', state: 'inter_department_comm' }
                ].map(item => (
                  <div key={item.state} className="flex items-center justify-between py-2">
                    <span className="text-[12px] font-bold text-[var(--text-main)] w-2/3 pr-4">{item.label}</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={qcDetails[item.state] === 'NO'} onChange={() => setQcDetails(prev => ({...prev, [item.state]: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={qcDetails[item.state] === 'YES'} onChange={() => setQcDetails(prev => ({...prev, [item.state]: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-[14px] font-black text-[var(--text-main)]">Equipment Worked on</h4>
                <div className="flex flex-wrap gap-4">
                  {['Multi-meter', 'Oscilloscope', 'Network Analyser', 'Spectrum Analyser', 'Clamp Meter', 'Lux Meter', 'LCR Meter', 'N/A', 'Other'].map(eq => (
                    <label key={eq} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={qcDetails.equipment.includes(eq)} onChange={() => toggleArrayCheckbox(setQcDetails, 'equipment', eq)} className="accent-[var(--accent)] w-4 h-4" />
                      <span className="text-[12px] font-semibold">{eq}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[14px] font-black text-[var(--text-main)]">Soldering Experience</h4>
                <div className="flex flex-wrap gap-4">
                  {['SMD (0201)', 'SMD (0402)', 'SMD (0603)', 'SMD (0805)', 'SMD (1206)', 'TH', 'N/A'].map(sol => (
                    <label key={sol} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={qcDetails.soldering.includes(sol)} onChange={() => toggleArrayCheckbox(setQcDetails, 'soldering', sol)} className="accent-[var(--accent)] w-4 h-4" />
                      <span className="text-[12px] font-semibold">{sol}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PCB Designer' && (
            <div className="space-y-10 max-w-6xl mx-auto">
              {/* Graph Image */}
              <div className="flex flex-col items-center justify-center py-6 bg-white rounded-xl border border-[var(--border-color)]">
                <img src="/proficiency-graph.jpg" alt="Select proficiency according to graph" className="max-w-full h-auto max-h-[300px] object-contain" />
              </div>

              {/* Basic Experience */}
              <div className="flex items-center gap-12">
                <div className="flex items-center gap-6">
                  <label className={`${labelClass} mb-0 !text-[12px]`}>Do You Have Experience In PCB design?</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={pcbDetails.has_experience === 'NO'} onChange={() => setPcbDetails(prev => ({...prev, has_experience: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={pcbDetails.has_experience === 'YES'} onChange={() => setPcbDetails(prev => ({...prev, has_experience: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className={`${labelClass} mb-0 !text-[12px]`}>How many years?</label>
                  <input type="number" value={pcbDetails.years_experience} onChange={e => setPcbDetails(prev => ({...prev, years_experience: e.target.value}))} disabled={pcbDetails.has_experience === 'NO'} className={`${inputClass} w-32`} />
                </div>
              </div>

              {/* Software */}
              <div className="space-y-4">
                <h4 className="text-[18px] font-bold text-[var(--accent)]">Which PCB design softwares have you used</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Eagle', 'Pads', 'Altium', 'Ki-Cad', 'Cam 350', 'Other'].map(soft => (
                    <label key={soft} className="flex items-center gap-4 cursor-pointer">
                      <span className="text-[12px] font-semibold w-20">{soft}</span>
                      <input type="checkbox" checked={pcbDetails.software.includes(soft)} onChange={() => toggleArrayCheckbox(setPcbDetails, 'software', soft)} className="accent-[var(--accent)] w-5 h-5 border-gray-400" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Proficiency */}
              <div className="space-y-4">
                <h4 className="text-[18px] font-bold text-[var(--accent)]">Define you proficiency in the following</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  {[
                    'Schematic design', 'Single layer Routing', '2 layer Routing',
                    '4 layers Routing', 'Multiple Layer Routing', 'Library & new package design',
                    'Garber creation & verification'
                  ].map(skill => (
                    <div key={skill} className="flex items-center justify-between border-l-4 border-gray-200 pl-4 py-1">
                      <span className="text-[12px] font-semibold text-[var(--text-main)] w-1/2">{skill}</span>
                      <div className="flex gap-4">
                        {['Nill', 'NOOB', 'MOD', 'ADV', 'ACE'].map(level => (
                          <label key={level} className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={pcbDetails.proficiency[skill] === level} onChange={() => updatePcbProficiency(skill, level)} className="accent-[var(--accent)]" />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase">{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Procedures */}
              <div className="space-y-2">
                <label className={`${labelClass} !text-[12px] text-[var(--text-main)]`}>What test procedures have you done for your designed PCBs?</label>
                <textarea value={pcbDetails.test_procedures} onChange={e => setPcbDetails(prev => ({...prev, test_procedures: e.target.value}))} className={`${inputClass} w-full min-h-[60px]`} />
              </div>

              {/* Toggles Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {[
                  { label: 'Have you designed PCB for EMI/EMC?', state: 'emi_emc' },
                  { label: 'Have you designed PCB for Impedance matching?', state: 'impedance_matching' },
                  { label: 'Have you designed PCB for high frequency data bus?', state: 'high_freq_data_bus' },
                  { label: 'Have you ever designed PCB for RF Impedance matching?', state: 'rf_impedance' },
                  { label: "Have you worked on electronics equipment's?", state: 'electronics_equipments' },
                  { label: 'Do you have any knowledge about PCB material?', state: 'pcb_material' },
                  { label: 'Do you have any experience a high speed device routing?', state: 'high_speed_routing' },
                  { label: 'Do you have any knowledge of basic electronics components?', state: 'basic_components' }
                ].map(item => (
                  <div key={item.state} className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[var(--text-main)]">{item.label}</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={pcbDetails[item.state] === 'NO'} onChange={() => setPcbDetails(prev => ({...prev, [item.state]: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">NO</span></label>
                      <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={pcbDetails[item.state] === 'YES'} onChange={() => setPcbDetails(prev => ({...prev, [item.state]: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold">YES</span></label>
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[var(--text-main)]">What is 1 mill?</span>
                  <div className="flex gap-3">
                    {['1/1000 Inch', '1/100 Inch', '1/1000 mm', '1/10 Inch'].map(opt => (
                      <label key={opt} className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={pcbDetails.what_is_1_mil === opt} onChange={() => setPcbDetails(prev => ({...prev, what_is_1_mil: opt}))} className="accent-[var(--accent)]" /><span className="text-[10px] font-semibold">{opt}</span></label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[12px] font-semibold text-[var(--text-main)]">How many number of design PCB were used in product?</span>
                  <input type="number" value={pcbDetails.pcbs_in_product} onChange={e => setPcbDetails(prev => ({...prev, pcbs_in_product: e.target.value}))} className={`${inputClass} w-24`} />
                </div>
              </div>

              {/* Equipment */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-4 gap-x-2">
                {[
                  'Multi-meter', 'Clamp Meter', 'Spectrum Analyser', 'Surge Tester', 'Transformer winding machine',
                  'Oscilloscope', 'Network Analyser', 'Power Analyzer', 'Function Generators', 'Other'
                ].map(eq => (
                  <label key={eq} className="flex items-center gap-3 cursor-pointer">
                    <span className="text-[11px] font-semibold text-[var(--text-main)] w-24 leading-tight">{eq}</span>
                    <input type="checkbox" checked={pcbDetails.equipment_worked_on.includes(eq)} onChange={() => toggleArrayCheckbox(setPcbDetails, 'equipment_worked_on', eq)} className="accent-[var(--accent)] w-4 h-4 border-gray-400" />
                  </label>
                ))}
              </div>

              {/* Flows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                <div className="space-y-4">
                  <h4 className="text-[18px] font-bold text-[var(--accent)]">Arrange Flow of Complete PCB design</h4>
                  <div className="space-y-2">
                    {Object.keys(pcbDetails.pcb_design_flow).map(flow => (
                      <div key={flow} className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[var(--text-main)] w-1/2">{flow}</span>
                        <select value={pcbDetails.pcb_design_flow[flow]} onChange={e => updatePcbFlow('pcb_design_flow', flow, e.target.value)} className={`${inputClass} w-1/2`}>
                          <option value="">--</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => <option key={num} value={num}>{num}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[18px] font-bold text-[var(--accent)]">Arrange Footprint Flow</h4>
                  <div className="space-y-2">
                    {Object.keys(pcbDetails.footprint_flow).map(flow => (
                      <div key={flow} className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[var(--text-main)] w-1/2">{flow}</span>
                        <select value={pcbDetails.footprint_flow[flow]} onChange={e => updatePcbFlow('footprint_flow', flow, e.target.value)} className={`${inputClass} w-1/2`}>
                          <option value="">--</option>
                          {[1,2,3,4,5,6,7,8].map(num => <option key={num} value={num}>{num}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Final Questions */}
              <div className="space-y-4">
                <h4 className="text-[18px] font-bold text-[var(--accent)]">What are the errors you got while importing netlist?</h4>
                <div className="flex gap-12">
                  {['Pcb footprint not found', 'Pins mismatch between symbol and footprint etc.'].map(err => (
                    <label key={err} className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[12px] font-bold text-[var(--text-main)]">{err}</span>
                      <input type="checkbox" checked={pcbDetails.netlist_errors.includes(err)} onChange={() => toggleArrayCheckbox(setPcbDetails, 'netlist_errors', err)} className="accent-[var(--accent)] w-4 h-4" />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                <div className="flex items-center gap-4">
                  <span className="text-[12px] font-bold text-[var(--text-main)]">What is the starting thickness of rigid PCB?</span>
                  <input type="number" step="0.01" value={pcbDetails.starting_thickness} onChange={e => setPcbDetails(prev => ({...prev, starting_thickness: e.target.value}))} className={`${inputClass} w-24`} />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[12px] font-bold text-[var(--text-main)]">Are Buried and Blind Via Same?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={pcbDetails.buried_blind_via_same === 'NO'} onChange={() => setPcbDetails(prev => ({...prev, buried_blind_via_same: 'NO'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold text-gray-500">NO</span></label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={pcbDetails.buried_blind_via_same === 'YES'} onChange={() => setPcbDetails(prev => ({...prev, buried_blind_via_same: 'YES'}))} className="accent-[var(--accent)]" /><span className="text-[12px] font-bold text-gray-500">YES</span></label>
                  </div>
                </div>
              </div>

            </div>
          )}

          {!['Basic Information', 'Python Developer', 'Embedded Software', 'Embedded Hardware', 'Sales Executive', 'Purchase Executive', 'Production Engineer', 'QC Engineer', 'PCB Designer'].includes(activeTab) && (
            <div className="py-20 text-center">
              <h2 className="text-2xl font-black text-[var(--text-main)] mb-2 uppercase tracking-widest">{activeTab} Details</h2>
              <p className="text-[var(--text-muted)] font-bold text-[14px]">Specific details and assessments for the {activeTab} position will be configured here.</p>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
};

export default CandidatePage;
