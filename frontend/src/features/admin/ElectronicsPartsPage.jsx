import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { getElectronicsParts, createElectronicsPart, getElectronicsPartById, deleteElectronicsPart, updateElectronicsPart } from '../../api/inventory';
import { getProducts } from '../../api/products';
import { 
  Search, Plus, Loader2, CircuitBoard, ChevronRight, FileText, Activity, ArrowLeft, Info, Settings, FileUp, Image as ImageIcon, Download, Eye, Zap, HardDrive, Binary, Code, Calendar, Fingerprint, Box, Tag, Thermometer, Battery, Speaker, Zap as AmpIcon, Radio
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';

const categoriesList = [
    'Battery', 'Flow Meter', 'SMPS', 'Printer', 'Speaker', 'Amplifier', 
    'Temperature Sensor', 'Quality Sensor', 'Pressure Sensor', 'EMI-EMC Filter', 'DC Meter'
];

const ElectronicsPartsPage = () => {
  const navigate = useNavigate();
  const FILE_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalTab, setModalTab] = useState('general');
  const [selectedCategory, setSelectedCategory] = useState('');

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm({
    mode: 'onChange'
  });

  const watchCategory = watch('category_name');

  useEffect(() => {
      setSelectedCategory(watchCategory || '');
  }, [watchCategory]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getElectronicsParts({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm
      });
      setItems(res.data.data);
      setPagination(prev => ({ ...prev, total: res.data.meta.total }));
    } catch (error) {
      toast.error('Failed to fetch Electronics records');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
      try {
          const res = await getProducts({ limit: 1000 });
          setProducts(res.data.data || []);
      } catch (err) {
          console.error("Failed to fetch products for dropdown");
      }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.page, searchTerm]);

  const onSubmit = async (data) => {
    if (modalMode === 'view') return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (!key.startsWith('file_') && key !== 'part_images' && key !== 'spec_data') {
           formData.append(key, data[key]);
        }
      });

      // Append spec_data separately as JSON
      if (data.category_name) {
          // Extract only fields that start with spec_
          const specFields = Object.keys(data).filter(k => k.startsWith('spec_'));
          const specDataObj = {};
          specFields.forEach(k => {
              specDataObj[k.replace('spec_', '')] = data[k];
          });
          formData.append('spec_data', JSON.stringify(specDataObj));
      }

      const fileFields = [
        'file_datasheet', 'file_wiring', 'file_manual', 'file_test_report', 
        'file_calib_cert', 'file_warranty', 'file_invoice'
      ];
      fileFields.forEach(field => {
        if (data[field] && data[field][0]) {
          formData.append(field, data[field][0]);
        }
      });

      if (data.part_images && data.part_images.length > 0) {
        Array.from(data.part_images).forEach(file => {
          formData.append('part_images', file);
        });
      }

      if (modalMode === 'create') {
          await createElectronicsPart(formData);
          toast.success('Electronics Part registered successfully!');
      } else if (modalMode === 'edit') {
          await updateElectronicsPart(selectedItem.part_id, formData);
          toast.success('Electronics Part updated!');
      }

      setIsModalOpen(false);
      reset();
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedItem(null);
    setModalTab('general');
    setSelectedCategory('');
    reset({
        status: 'Active'
    });
    setIsModalOpen(true);
  };

  const mapDataToForm = (fullData) => {
      let formData = { ...fullData, ...fullData.techSpec };
      if (fullData.categorySpec) {
          formData.category_name = fullData.categorySpec.category_name;
          setSelectedCategory(fullData.categorySpec.category_name);
          if (fullData.categorySpec.spec_data) {
              const specData = typeof fullData.categorySpec.spec_data === 'string' 
                ? JSON.parse(fullData.categorySpec.spec_data) 
                : fullData.categorySpec.spec_data;
              Object.keys(specData).forEach(k => {
                  formData[`spec_${k}`] = specData[k];
              });
          }
      }
      return formData;
  }

  const handleView = async (item) => {
    setModalMode('view');
    setIsModalOpen(true);
    try {
        const res = await getElectronicsPartById(item.part_id);
        const fullData = res.data.data;
        setSelectedItem(fullData);
        reset(mapDataToForm(fullData));
    } catch (error) {
        toast.error('Failed to load details');
    }
  };

  const handleEdit = async (item) => {
    setModalMode('edit');
    setModalTab('general');
    setIsModalOpen(true);
    try {
        const res = await getElectronicsPartById(item.part_id);
        const fullData = res.data.data;
        setSelectedItem(fullData);
        reset(mapDataToForm(fullData));
    } catch (error) {
        toast.error('Failed to load details');
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete Part: ${item.part_name}?`)) {
      try {
        await deleteElectronicsPart(item.part_id);
        toast.success('Part deleted successfully');
        fetchItems();
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const fullUrl = `${FILE_BASE_URL}/${url}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || url.split(/[\\/]/).pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error('Download failed. Opening in new tab instead.');
      window.open(`${FILE_BASE_URL}/${url}`, '_blank');
    }
  };

  const FileInput = ({ label, name, accept = "*", existingUrl }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <input 
          type="file" 
          {...register(name)} 
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        <div className="flex items-center gap-4 p-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl group-hover:border-[var(--accent)] transition-all">
          <div className="w-10 h-10 rounded-lg bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)]">
            <FileUp size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[var(--text-main)] truncate">
              {existingUrl ? existingUrl.split(/[\\/]/).pop() : 'Click or drag to upload'}
            </p>
            {existingUrl && (
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(existingUrl); }}
                className="text-[10px] text-[var(--accent)] font-black uppercase flex items-center gap-1 mt-1 hover:underline relative z-20"
              >
                <Download size={10} /> Download File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const FormField = ({ label, name, placeholder, type = "text", required = false }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input 
        type={type}
        {...register(name, { required: required ? `${label} is required` : false })}
        placeholder={placeholder}
        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all placeholder:text-[var(--text-dim)] font-bold"
      />
      {errors[name] && <p className="text-rose-500 text-[10px] font-black uppercase tracking-wider ml-1 mt-1">{errors[name].message}</p>}
    </div>
  );

  const TextAreaField = ({ label, name, placeholder }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{label}</label>
      <textarea 
        {...register(name)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-dim)] font-bold resize-none"
      />
    </div>
  );

  const SelectField = ({ label, name, options, required = false }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <select
        {...register(name, { required: required ? `${label} is required` : false })}
        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all font-bold appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em' }}
      >
        <option value="">Select {label}</option>
        {options.map(opt => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
      </select>
      {errors[name] && <p className="text-rose-500 text-[10px] font-black uppercase tracking-wider ml-1 mt-1">{errors[name].message}</p>}
    </div>
  );

  const DataSheetEntry = ({ label, value, icon: Icon }) => (
    <div className="bg-[var(--bg-workspace)]/40 p-4 rounded-2xl border border-[var(--border-color)]/60 hover:border-[var(--accent)]/30 transition-all group">
      <div className="flex items-center gap-3 mb-1.5">
        {Icon && <Icon size={14} className="text-[var(--accent)]" />}
        <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">{label}</p>
      </div>
      <p className="text-[15px] font-black text-[var(--text-main)] tracking-tight leading-snug">{value || 'Not Defined'}</p>
    </div>
  );

  const FileCard = ({ label, url }) => (
    <div className="flex items-center justify-between p-4.5 bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] rounded-2xl group hover:border-[var(--accent)] transition-all relative overflow-hidden">
       <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 bg-[var(--nav-hover)] rounded-xl text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{label}</p>
            <p className="text-[13px] font-bold text-[var(--text-main)] truncate max-w-[140px]">{url ? url.split(/[\\/]/).pop() : 'Not Available'}</p>
          </div>
       </div>
       <div className="flex items-center gap-2.5">
          {url && (
            <>
              <a 
                href={`${FILE_BASE_URL}/${url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                title="View File"
                className="p-3 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
              >
                <Eye size={16} />
              </a>
              <button 
                onClick={() => handleDownload(url)}
                title="Download File"
                className="p-3 bg-[var(--accent)] text-white rounded-xl shadow-md hover:scale-105 transition-transform"
              >
                <Download size={16} />
              </button>
            </>
          )}
       </div>
    </div>
  );

  const columns = [
    { key: 'part_name', label: 'Part Name' },
    { key: 'part_number', label: 'Part Number/Model' },
    { key: 'part_category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Registered On', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  // Dynamic Fields Component based on category
  const renderCategoryFields = () => {
    switch (selectedCategory) {
        case 'Battery': return (
            <>
                <FormField label="Battery Chemistry" name="spec_battery_chemistry" />
                <FormField label="Battery Voltage" name="spec_battery_voltage" />
                <FormField label="Battery Capacity" name="spec_battery_capacity" />
                <FormField label="Cell Count" name="spec_cell_count" type="number" />
                <SelectField label="Rechargeable" name="spec_rechargeable" options={['Yes', 'No']} />
                <FormField label="Charging Voltage" name="spec_charging_voltage" />
                <FormField label="Max Charging Current" name="spec_max_charging_current" />
                <FormField label="Max Discharge Current" name="spec_max_discharge_current" />
                <FormField label="Backup Time" name="spec_backup_time" />
                <FormField label="Battery Connector Type" name="spec_battery_connector_type" />
                <FormField label="Cycle Life" name="spec_cycle_life" />
                <SelectField label="BMS Available" name="spec_bms_available" options={['Yes', 'No']} />
            </>
        );
        case 'Flow Meter': return (
            <>
                <FormField label="Flow Meter Type" name="spec_flow_meter_type" />
                <FormField label="Flow Range" name="spec_flow_range" />
                <FormField label="Accuracy" name="spec_accuracy" />
                <SelectField label="Pulse Output" name="spec_pulse_output" options={['Yes', 'No']} />
                <FormField label="Pulses Per Liter" name="spec_pulses_per_liter" type="number" />
                <FormField label="K-Factor" name="spec_k_factor" />
                <FormField label="Fluid Compatibility" name="spec_fluid_compatibility" />
                <FormField label="Inlet Size" name="spec_inlet_size" />
                <FormField label="Outlet Size" name="spec_outlet_size" />
                <FormField label="Max Pressure" name="spec_max_pressure" />
                <SelectField label="Calibration Required" name="spec_calibration_required" options={['Yes', 'No']} />
                <FormField label="Calibration Certificate Number" name="spec_calibration_cert_no" />
            </>
        );
        case 'SMPS': return (
            <>
                <FormField label="Input Voltage Range" name="spec_input_voltage_range" />
                <FormField label="Output Voltage" name="spec_output_voltage" />
                <FormField label="Output Current" name="spec_output_current" />
                <FormField label="Output Power" name="spec_output_power" />
                <FormField label="Efficiency" name="spec_efficiency" />
                <FormField label="Number of Outputs" name="spec_num_outputs" type="number" />
                <FormField label="Protection" name="spec_protection" />
                <FormField label="Cooling Type" name="spec_cooling_type" />
                <FormField label="SMPS Type" name="spec_smps_type" />
                <FormField label="Ripple Noise" name="spec_ripple_noise" />
            </>
        );
        case 'Printer': return (
            <>
                <FormField label="Printer Type" name="spec_printer_type" />
                <FormField label="Printer Model" name="spec_printer_model" />
                <FormField label="Print Width" name="spec_print_width" />
                <FormField label="Paper Roll Size" name="spec_paper_roll_size" />
                <FormField label="Print Speed" name="spec_print_speed" />
                <FormField label="Interface" name="spec_interface" />
                <FormField label="Baud Rate" name="spec_baud_rate" />
                <SelectField label="Cutter Available" name="spec_cutter_available" options={['Yes', 'No']} />
                <SelectField label="Paper Sensor Available" name="spec_paper_sensor_available" options={['Yes', 'No']} />
                <FormField label="Operating Voltage" name="spec_operating_voltage" />
                <FormField label="Supported Language" name="spec_supported_language" />
            </>
        );
        case 'Speaker': return (
            <>
                <FormField label="Speaker Type" name="spec_speaker_type" />
                <FormField label="Power Rating" name="spec_power_rating" />
                <FormField label="Impedance" name="spec_impedance" />
                <FormField label="Frequency Range" name="spec_frequency_range" />
                <FormField label="Sound Level" name="spec_sound_level" />
                <FormField label="Operating Voltage" name="spec_operating_voltage" />
                <FormField label="Connector Type" name="spec_connector_type" />
                <FormField label="Mounting Type" name="spec_mounting_type" />
            </>
        );
        case 'Amplifier': return (
            <>
                <FormField label="Amplifier Type" name="spec_amplifier_type" />
                <FormField label="IC/Chipset" name="spec_ic_chipset" />
                <FormField label="Input Voltage" name="spec_input_voltage" />
                <FormField label="Output Power" name="spec_output_power" />
                <FormField label="Channel Type" name="spec_channel_type" />
                <FormField label="Speaker Impedance Support" name="spec_speaker_impedance_support" />
                <FormField label="Input Signal Type" name="spec_input_signal_type" />
                <FormField label="Volume Control" name="spec_volume_control" />
                <FormField label="Protection" name="spec_protection" />
            </>
        );
        case 'Temperature Sensor': return (
            <>
                <FormField label="Sensor Type" name="spec_sensor_type" />
                <FormField label="Sensor Model" name="spec_sensor_model" />
                <FormField label="Temperature Range" name="spec_temperature_range" />
                <FormField label="Accuracy" name="spec_accuracy" />
                <FormField label="Output Signal" name="spec_output_signal" />
                <FormField label="Interface" name="spec_interface" />
                <FormField label="Probe Type" name="spec_probe_type" />
                <FormField label="Cable Length" name="spec_cable_length" />
                <SelectField label="Calibration Required" name="spec_calibration_required" options={['Yes', 'No']} />
            </>
        );
        case 'Quality Sensor': return (
            <>
                <FormField label="Sensor Type" name="spec_sensor_type" />
                <FormField label="Measured Parameter" name="spec_measured_parameter" />
                <FormField label="Measuring Range" name="spec_measuring_range" />
                <FormField label="Accuracy" name="spec_accuracy" />
                <FormField label="Output Signal" name="spec_output_signal" />
                <FormField label="Communication Protocol" name="spec_communication_protocol" />
                <FormField label="Fluid Compatibility" name="spec_fluid_compatibility" />
                <SelectField label="Calibration Required" name="spec_calibration_required" options={['Yes', 'No']} />
                <FormField label="Calibration Data" name="spec_calibration_data" />
            </>
        );
        case 'Pressure Sensor': return (
            <>
                <FormField label="Pressure Range" name="spec_pressure_range" />
                <FormField label="Pressure Type" name="spec_pressure_type" />
                <FormField label="Output Signal" name="spec_output_signal" />
                <FormField label="Accuracy" name="spec_accuracy" />
                <FormField label="Thread Size" name="spec_thread_size" />
                <FormField label="Overload Pressure" name="spec_overload_pressure" />
                <FormField label="Burst Pressure" name="spec_burst_pressure" />
                <FormField label="Medium Compatibility" name="spec_medium_compatibility" />
                <FormField label="Operating Voltage" name="spec_operating_voltage" />
            </>
        );
        case 'EMI-EMC Filter': return (
            <>
                <FormField label="Filter Type" name="spec_filter_type" />
                <FormField label="Rated Voltage" name="spec_rated_voltage" />
                <FormField label="Rated Current" name="spec_rated_current" />
                <FormField label="Frequency Range" name="spec_frequency_range" />
                <FormField label="Leakage Current" name="spec_leakage_current" />
                <FormField label="Filter Stage" name="spec_filter_stage" />
                <FormField label="Mounting Type" name="spec_mounting_type" />
                <FormField label="Certification" name="spec_certification" />
                <FormField label="Application" name="spec_application" />
            </>
        );
        case 'DC Meter': return (
            <>
                <FormField label="Meter Type" name="spec_meter_type" />
                <FormField label="Voltage Range" name="spec_voltage_range" />
                <FormField label="Current Range" name="spec_current_range" />
                <FormField label="Display Type" name="spec_display_type" />
                <FormField label="Accuracy Class" name="spec_accuracy_class" />
                <SelectField label="Shunt Required" name="spec_shunt_required" options={['Yes', 'No']} />
                <FormField label="Communication Interface" name="spec_communication_interface" />
                <FormField label="Protocol" name="spec_protocol" />
                <FormField label="Power Supply" name="spec_power_supply" />
                <FormField label="Mounting Type" name="spec_mounting_type" />
            </>
        );
        default: return null;
    }
  }

  // Display fields for view mode
  const renderViewCategorySpecs = () => {
      if (!selectedItem?.categorySpec?.spec_data) return null;
      let specData = selectedItem.categorySpec.spec_data;
      if (typeof specData === 'string') {
          try { specData = JSON.parse(specData); } catch (e) {}
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.keys(specData).map(k => (
                <DataSheetEntry key={k} label={k.replace(/_/g, ' ')} value={specData[k]} icon={Settings} />
            ))}
        </div>
      )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => navigate('/admin/inventory')}
            className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <CircuitBoard size={24} className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">
              Electronics Parts
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Electronic Components & Assemblies Registry
            </p>
          </div>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="btn-primary shadow-lg px-8 py-3 group"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] md:text-[14px]">Add Electronics Part</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="workspace-card p-4 flex flex-col md:flex-row gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
            <input 
              type="text" 
              placeholder="Search by part name, number, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
            />
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={items}
          loading={loading}
          totalCount={pagination.total}
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Management Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? "Register Electronics Part" : modalMode === 'edit' ? "Edit Specifications" : "Component Data Sheet"}
        maxWidth="max-w-6xl"
        headerActions={
          <div className="flex items-center gap-3">
             {modalMode !== 'view' && (
                <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className="btn-primary py-2.5 px-8 shadow-md flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save' : 'Update Specs')}
                </button>
             )}
          </div>
        }
      >
        {modalMode === 'view' ? (
          /* View Mode (Data Sheet) */
          <div className="space-y-10 pb-10 max-h-[82vh] overflow-y-auto custom-scrollbar pr-4">
             {/* Header */}
             <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-color)] relative overflow-hidden shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                   <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5 text-[12px] font-black text-[var(--text-dim)] uppercase tracking-widest">
                            <Tag size={14} className="text-[var(--accent)]" />
                            {selectedItem?.part_category || 'Uncategorized'}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedItem?.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {selectedItem?.status}
                        </div>
                      </div>
                      <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">{selectedItem?.part_name}</h2>
                      <div className="flex flex-wrap items-center gap-5 text-[12px] font-bold text-[var(--text-muted)]">
                        <div className="flex items-center gap-3 bg-[var(--bg-workspace)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                           <Fingerprint size={14} className="text-[var(--accent)]" />
                           <span className="uppercase text-[10px] opacity-60 font-black">Part No/Model:</span>
                           <span className="text-[var(--text-main)] font-mono text-[14px]">{selectedItem?.part_number}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[var(--bg-workspace)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                           <Box size={14} className="text-[var(--accent)]" />
                           <span className="uppercase text-[10px] opacity-60 font-black">Internal SKU:</span>
                           <span className="text-[var(--text-main)] text-[14px]">{selectedItem?.internal_sku}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[var(--bg-workspace)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                           <Calendar size={14} className="text-[var(--accent)]" />
                           <span className="uppercase text-[10px] opacity-60 font-black">Registered:</span>
                           <span className="text-[var(--text-main)] text-[14px]">{new Date(selectedItem?.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                   </div>
                   
                   <div className="lg:max-w-[450px] w-full p-6 bg-[var(--bg-workspace)] rounded-2xl border border-[var(--border-color)] shadow-inner relative">
                      <div className="absolute -top-3 left-6 bg-[var(--bg-workspace)] px-3 py-1 border border-[var(--border-color)] rounded-lg">
                        <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                           PART OVERVIEW
                        </p>
                      </div>
                      <p className="text-[14px] text-[var(--text-main)] leading-relaxed font-bold opacity-90 mt-2">
                        {selectedItem?.part_description || 'No detailed description provided.'}
                      </p>
                      <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Used In Product: <span className="text-[var(--text-main)] ml-1">{selectedItem?.used_in_product || 'N/A'}</span></p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Technical Specs */}
             <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                <div className="flex items-center gap-4 mb-7">
                    <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-inner"><Settings size={22} /></div>
                    <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Technical Specifications</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <DataSheetEntry label="Rated Voltage" value={selectedItem?.techSpec?.rated_voltage} icon={Zap} />
                    <DataSheetEntry label="Rated Current" value={selectedItem?.techSpec?.rated_current} icon={Zap} />
                    <DataSheetEntry label="Power Rating" value={selectedItem?.techSpec?.power_rating} icon={Zap} />
                    <DataSheetEntry label="Input Type" value={selectedItem?.techSpec?.input_type} icon={Info} />
                    <DataSheetEntry label="Output Type" value={selectedItem?.techSpec?.output_type} icon={Info} />
                    <DataSheetEntry label="Connector Type" value={selectedItem?.techSpec?.connector_type} icon={Info} />
                    <DataSheetEntry label="Communication" value={selectedItem?.techSpec?.communication_iface} icon={Info} />
                    <DataSheetEntry label="Mounting Type" value={selectedItem?.techSpec?.mounting_type} icon={Info} />
                    <DataSheetEntry label="Operating Temp" value={selectedItem?.techSpec?.operating_temp} icon={Thermometer} />
                    <DataSheetEntry label="Protection Rating" value={selectedItem?.techSpec?.protection_rating} icon={Info} />
                    <DataSheetEntry label="Dimensions" value={selectedItem?.techSpec?.dimensions} icon={Box} />
                    <DataSheetEntry label="Weight" value={selectedItem?.techSpec?.weight} icon={Info} />
                </div>
             </div>

             {/* Category Specs */}
             {selectedItem?.categorySpec?.category_name && (
                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                    <div className="flex items-center gap-4 mb-7">
                        <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-inner"><CircuitBoard size={22} /></div>
                        <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">{selectedItem.categorySpec.category_name} Parameters</h3>
                    </div>
                    {renderViewCategorySpecs()}
                </div>
             )}

             {/* Documentation Library */}
             <div className="space-y-6">
                <div className="flex items-center gap-4 ml-4">
                   <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-sm"><FileUp size={20} /></div>
                   <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Documentation Library</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                   <FileCard label="Datasheet" url={selectedItem?.files?.datasheet_url} />
                   <FileCard label="Wiring Diagram" url={selectedItem?.files?.wiring_diagram_url} />
                   <FileCard label="User Manual" url={selectedItem?.files?.user_manual_url} />
                   <FileCard label="Test Report" url={selectedItem?.files?.test_report_url} />
                   <FileCard label="Calibration Certificate" url={selectedItem?.files?.calibration_cert_url} />
                   <FileCard label="Warranty Certificate" url={selectedItem?.files?.warranty_cert_url} />
                   <FileCard label="Invoice / Bill" url={selectedItem?.files?.invoice_url} />
                </div>
             </div>

             {/* Image Gallery */}
             {selectedItem?.part_images && selectedItem.part_images.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 ml-4">
                        <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[var(--accent)] shadow-sm"><ImageIcon size={20} /></div>
                        <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Part Visuals</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {selectedItem.part_images.map((img, idx) => (
                           <div key={idx} className="aspect-square rounded-[24px] border-2 border-[var(--border-color)] overflow-hidden bg-[var(--bg-workspace)] group relative cursor-pointer shadow-md">
                                <img src={`${FILE_BASE_URL}/${img}`} alt="Part Visual" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <a href={`${FILE_BASE_URL}/${img}`} target="_blank" rel="noreferrer" title="View Image" className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-[var(--accent)] hover:scale-110 transition-all border border-white/20 shadow-lg"><Eye size={22} /></a>
                                    <button onClick={() => handleDownload(img)} title="Download Image" className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-[var(--accent)] hover:scale-110 transition-all border border-white/20 shadow-lg"><Download size={22} /></button>
                                </div>
                           </div>
                        ))}
                    </div>
                </div>
             )}
          </div>
        ) : (
          /* Create / Edit Mode (Tabs) */
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Tab Navigation */}
            <div className="flex bg-[var(--bg-workspace)]/50 p-1.5 rounded-2xl mb-8 border border-[var(--border-color)] flex-wrap gap-1">
                {[
                { id: 'general', label: 'General', icon: Info },
                { id: 'technical', label: 'Technical Spec', icon: Settings },
                { id: 'categories', label: 'Category Params', icon: CircuitBoard },
                { id: 'files', label: 'Files & Media', icon: FileUp }
                ].map((tab) => {
                    if (tab.id === 'categories') {
                        return (
                            <div key={tab.id} className="relative group flex-1 min-w-[120px]">
                                <button
                                    type="button"
                                    onClick={() => setModalTab(tab.id)}
                                    className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest ${modalTab === tab.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                                >
                                    <tab.icon size={14} strokeWidth={3} />
                                    <span>{tab.label}</span>
                                </button>
                                <div className="absolute left-0 top-full mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 py-2 flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {categoriesList.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setValue('category_name', cat, { shouldValidate: true });
                                                setModalTab('categories');
                                            }}
                                            className={`w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-[var(--nav-hover)] hover:text-[var(--accent)] transition-colors ${selectedCategory === cat ? 'text-[var(--accent)] bg-[var(--nav-hover)]' : 'text-[var(--text-main)]'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setModalTab(tab.id)}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest ${modalTab === tab.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                        >
                            <tab.icon size={14} strokeWidth={3} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-4">
                <form id="electronics-form" className="space-y-8">
                
                {modalTab === 'general' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormField label="Part Category" name="part_category" placeholder="e.g. Sensors" required />
                            <FormField label="Part Name" name="part_name" placeholder="e.g. Laser Distance Sensor" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FormField label="Part Number / Model Number" name="part_number" placeholder="e.g. LDS-001" required />
                            <FormField label="Internal SKU / Code" name="internal_sku" placeholder="e.g. INT-LDS-001" />
                            <FormField label="Manufacturer" name="manufacturer" placeholder="e.g. SICK / Keyence" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FormField label="Part Type" name="part_type" placeholder="e.g. Optical" />
                            <SelectField 
                                label="Status" 
                                name="status" 
                                options={['Active', 'Inactive', 'Damaged', 'Deleted']} 
                            />
                            <SelectField 
                                label="Used in Product" 
                                name="used_in_product" 
                                options={products.map(p => p.product_name)} 
                            />
                        </div>
                        <TextAreaField label="Part Description" name="part_description" placeholder="Technical overview and purpose..." />
                    </div>
                )}

                {modalTab === 'technical' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                            <FormField label="Rated Voltage" name="rated_voltage" placeholder="e.g. 24V DC" />
                            <FormField label="Rated Current" name="rated_current" placeholder="e.g. 10A" />
                            <FormField label="Power Rating" name="power_rating" placeholder="e.g. 240W" />
                            <FormField label="Input Type" name="input_type" placeholder="e.g. Analog 4-20mA" />
                            <FormField label="Output Type" name="output_type" placeholder="e.g. Digital NPN" />
                            <FormField label="Connector Type" name="connector_type" placeholder="e.g. M12 4-pin" />
                            <FormField label="Communication Interface" name="communication_iface" placeholder="e.g. RS485 / IO-Link" />
                            <FormField label="Mounting Type" name="mounting_type" placeholder="e.g. DIN Rail" />
                            <FormField label="Operating Temperature" name="operating_temp" placeholder="e.g. -20 to 80 °C" />
                            <FormField label="Protection Rating" name="protection_rating" placeholder="e.g. IP67" />
                            <FormField label="Dimensions" name="dimensions" placeholder="e.g. 50x50x20 mm" />
                            <FormField label="Weight" name="weight" placeholder="e.g. 150g" />
                        </div>
                    </div>
                )}

                {modalTab === 'categories' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                        <input type="hidden" {...register('category_name', { required: 'Category is required' })} value={selectedCategory} />
                        {errors.category_name && <p className="text-rose-500 text-[10px] font-black uppercase tracking-wider ml-1 mt-1">{errors.category_name.message}</p>}
                        
                        {selectedCategory && (
                            <div>
                                <h4 className="text-[14px] font-black uppercase tracking-widest text-[var(--accent)] mb-6 flex items-center gap-2">
                                    <CircuitBoard size={18} /> {selectedCategory} Parameters
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                                    {renderCategoryFields()}
                                </div>
                            </div>
                        )}
                        {!selectedCategory && (
                            <div className="p-12 text-center border border-dashed border-[var(--border-color)] rounded-3xl opacity-50 mt-2">
                                <CircuitBoard size={48} className="mx-auto mb-4 text-[var(--text-dim)]" />
                                <p className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)]">Hover over the 'Category Params' tab above to select a category</p>
                            </div>
                        )}
                    </div>
                )}

                {modalTab === 'files' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <FileInput label="Datasheet (.pdf)" name="file_datasheet" existingUrl={selectedItem?.files?.datasheet_url} />
                            <FileInput label="Wiring Diagram (.pdf, .dwg)" name="file_wiring" existingUrl={selectedItem?.files?.wiring_diagram_url} />
                            <FileInput label="User Manual (.pdf)" name="file_manual" existingUrl={selectedItem?.files?.user_manual_url} />
                            <FileInput label="Test Report (.pdf)" name="file_test_report" existingUrl={selectedItem?.files?.test_report_url} />
                            <FileInput label="Calibration Certificate (.pdf)" name="file_calib_cert" existingUrl={selectedItem?.files?.calibration_cert_url} />
                            <FileInput label="Warranty Certificate (.pdf)" name="file_warranty" existingUrl={selectedItem?.files?.warranty_cert_url} />
                            <FileInput label="Invoice / Purchase Bill" name="file_invoice" existingUrl={selectedItem?.files?.invoice_url} />
                            
                            <div className="md:col-span-2">
                            <div className="space-y-3 p-6 bg-[var(--nav-hover)]/30 border border-dashed border-[var(--border-color)] rounded-[24px]">
                                <div className="flex items-center gap-3 mb-2">
                                <ImageIcon size={18} className="text-[var(--accent)]" />
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)]">Part Images Gallery</h4>
                                </div>
                                <div className="relative group">
                                <input type="file" multiple {...register('part_images')} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                <div className="w-full bg-[var(--bg-workspace)]/50 border border-dashed border-[var(--text-dim)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all">
                                    <div className="p-4 bg-[var(--bg-workspace)] rounded-2xl text-[var(--accent)] shadow-sm"><Plus size={24} /></div>
                                    <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest">Upload Multiple Part Photos</p>
                                </div>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                )}

                </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ElectronicsPartsPage;
