import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  Search, Plus, Loader2, Plug, Zap, Info, Settings, 
  FileUp, ChevronRight, Eye, Download, Trash2, Box, Cpu,
  Activity, ArrowLeft, ImageIcon, CheckCircle2, Layers, Factory, ShieldAlert, FileText, BatteryCharging, Wrench, Package, Shield, Scale, Ruler, Banknote, ShoppingCart
} from 'lucide-react';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { getElectricalParts, createElectricalPart, updateElectricalPart, deleteElectricalPart, getElectricalPartById, deleteElectricalImage } from '../../api/inventory';
import { getProducts } from '../../api/products';

const FILE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const categoriesList = [
    'Pump',
    'Nozzle',
    'Solenoid Valve',
    'Relay Box',
    'Transformer',
    'RCCB',
    'SPD(Surge Protection Device)'
];

const ElectricalPartsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalTab, setModalTab] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
      defaultValues: { status: 'Active' }
  });

  const selectedCategory = watch('category_name');

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getElectricalParts({ page, limit: pagination.limit, search: searchTerm });
      setItems(res.data.data);
      setPagination(res.data.meta || { page: 1, limit: 10, total: res.data.data.length });
    } catch (error) {
      toast.error('Failed to load electrical parts');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
        const res = await getProducts();
        setProducts(res.data.data);
    } catch (error) {
        console.error('Failed to fetch products for dropdown');
    }
  };

  useEffect(() => {
    fetchItems(1);
  }, [searchTerm]);

  useEffect(() => {
      fetchProducts();
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      // Append all text fields
      Object.keys(data).forEach(key => {
          if (key !== 'file_datasheet' && key !== 'file_wiring' && key !== 'file_manual' && key !== 'file_test_report' && key !== 'file_calib_cert' && key !== 'file_compliance' && key !== 'file_warranty' && key !== 'file_invoice' && key !== 'part_images') {
              if (data[key] !== undefined && data[key] !== null) {
                  formData.append(key, data[key]);
              }
          }
      });

      // Append single files
      const singleFiles = [
          'file_datasheet', 'file_wiring', 'file_manual', 'file_test_report', 
          'file_calib_cert', 'file_compliance', 'file_warranty', 'file_invoice'
      ];
      
      singleFiles.forEach(fieldName => {
          if (data[fieldName] && data[fieldName].length > 0) {
              formData.append(fieldName, data[fieldName][0]);
          }
      });

      // Append multiple images
      if (data.part_images && data.part_images.length > 0) {
          for (let i = 0; i < data.part_images.length; i++) {
              formData.append('part_images', data.part_images[i]);
          }
      }

      if (modalMode === 'create') {
        await createElectricalPart(formData);
        toast.success('Electrical part registered successfully');
      } else {
        await updateElectricalPart(selectedItem.part_id, formData);
        toast.success('Electrical part updated successfully');
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
    reset({
        status: 'Active',
        part_category: '', part_name: '', part_number: '', manufacturer: '', part_type: '', description: '', used_in_product: '', material: '',
        rated_voltage: '', rated_current: '', power_rating: '', phase_type: '', frequency: '', input_type: '', output_type: '', connector_type: '', mounting_type: '', protection_rating: '', operating_temperature: '', dimensions: '', weight: '',
        serial_number: '', batch_number: '', quantity_available: 0, minimum_stock_level: 0, unit_of_measurement: '', storage_location: '', condition: '', is_damaged: false, damage_description: '', is_assigned: false, assigned_device_id: '', last_inspection_date: '', next_inspection_date: '',
        supplier_name: '', supplier_contact: '', purchase_date: '', purchase_order_number: '', invoice_number: '', purchase_price: 0, warranty_period: '', warranty_start_date: '', warranty_end_date: '', warranty_status: '', gst_number: '', remarks: '',
        category_name: ''
    });
    setIsModalOpen(true);
  };

  const loadPartDetails = async (id, mode) => {
      setModalMode(mode);
      setModalTab('general');
      setIsModalOpen(true);
      try {
          const res = await getElectricalPartById(id);
          const fullData = res.data.data;
          setSelectedItem(fullData);
          if (mode === 'edit') {
              // Convert dates for inputs
              const formattedData = { ...fullData };
              ['last_inspection_date', 'next_inspection_date', 'purchase_date', 'warranty_start_date', 'warranty_end_date'].forEach(dateField => {
                  if (formattedData[dateField]) {
                      formattedData[dateField] = new Date(formattedData[dateField]).toISOString().split('T')[0];
                  }
              });
              reset(formattedData);
          }
      } catch (error) {
          toast.error('Failed to load details');
      }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete ${item.part_name}?`)) {
      try {
        await deleteElectricalPart(item.part_id);
        toast.success('Part deleted successfully');
        fetchItems();
      } catch (error) {
        toast.error('Failed to delete part');
      }
    }
  };

  const handleRemoveImage = async (imageUrl) => {
    if (window.confirm('Are you sure you want to remove this image?')) {
        try {
            await deleteElectricalImage(selectedItem.part_id, imageUrl);
            toast.success('Image removed successfully');
            loadPartDetails(selectedItem.part_id, 'edit');
        } catch (error) {
            toast.error('Failed to remove image');
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
      toast.error('Download failed. Opening in new tab.');
      window.open(`${FILE_BASE_URL}/${url}`, '_blank');
    }
  };

  const FormField = ({ label, name, placeholder, type = "text", required = false }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {type === 'checkbox' ? (
          <input 
            type="checkbox"
            {...register(name)}
            className="w-5 h-5 accent-[var(--accent)] rounded border-[var(--border-color)]"
          />
      ) : (
          <input 
            type={type}
            {...register(name, { required: required ? `${label} is required` : false })}
            placeholder={placeholder}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all placeholder:text-[var(--text-dim)] font-bold"
          />
      )}
      {errors[name] && <p className="text-rose-500 text-[10px] font-black uppercase tracking-wider ml-1 mt-1">{errors[name].message}</p>}
    </div>
  );

  const SelectField = ({ label, name, options, required = false }) => (
    <div className="space-y-2">
        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
            {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative">
            <select
                {...register(name, { required: required ? `${label} is required` : false })}
                className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all font-bold appearance-none"
            >
                <option value="">Select Option...</option>
                {options.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                ))}
            </select>
            <ChevronRight size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none rotate-90" />
        </div>
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
                onClick={() => handleDownload(existingUrl)}
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

  const DataSheetEntry = ({ label, value, icon: Icon }) => (
    <div className="bg-[var(--bg-workspace)]/40 p-4 rounded-2xl border border-[var(--border-color)]/60 hover:border-[var(--accent)]/30 transition-all group">
      <div className="flex items-center gap-3 mb-1.5">
        {Icon && <Icon size={14} className="text-[var(--accent)]" />}
        <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">{label}</p>
      </div>
      <p className="text-[15px] font-bold text-[var(--text-main)] tracking-tight leading-snug">{value || 'Not Defined'}</p>
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

  const renderCategoryFields = () => {
    switch (selectedCategory) {
        case 'Pump': return (
            <>
                <FormField label="Pump Type" name="pump_type" placeholder="e.g. Centrifugal" />
                <FormField label="Motor Type" name="motor_type" placeholder="e.g. Induction" />
                <FormField label="Flow Rate" name="flow_rate" placeholder="e.g. 50 L/min" />
                <FormField label="Max Pressure" name="max_pressure" placeholder="e.g. 10 bar" />
                <FormField label="Suction Size" name="suction_size" placeholder="e.g. 1 inch" />
                <FormField label="Outlet Size" name="outlet_size" placeholder="e.g. 1 inch" />
                <FormField label="Fluid Compatibility" name="fluid_compatibility" placeholder="e.g. Water, Oil" />
                <FormField label="Pump Material" name="pump_material" placeholder="e.g. Stainless Steel" />
                <FormField label="RPM" name="rpm" placeholder="e.g. 1440" />
                <FormField label="Seal Type" name="seal_type" placeholder="e.g. Mechanical" />
                <FormField label="Noise Level" name="noise_level" placeholder="e.g. 60 dB" />
                <SelectField label="Dry Run Protection" name="dry_run_protection" options={['Yes', 'No']} />
                <SelectField label="Overload Protection" name="overload_protection" options={['Yes', 'No']} />
            </>
        );
        case 'Nozzle': return (
            <>
                <FormField label="Nozzle Type" name="nozzle_type" placeholder="e.g. Spray" />
                <FormField label="Fuel Compatibility" name="fuel_compatibility" placeholder="e.g. Diesel, Petrol" />
                <FormField label="Flow Rate Range" name="flow_rate_range" placeholder="e.g. 10-50 L/min" />
                <FormField label="Inlet Size" name="inlet_size" placeholder="e.g. 3/4 inch" />
                <FormField label="Outlet Diameter" name="outlet_diameter" placeholder="e.g. 10 mm" />
                <FormField label="Spout Type" name="spout_type" placeholder="e.g. Straight" />
                <SelectField label="Auto Cutoff" name="auto_cutoff_available" options={['Yes', 'No']} />
                <SelectField label="Swivel Joint" name="swivel_joint_available" options={['Yes', 'No']} />
                <SelectField label="Trigger Lock" name="trigger_lock_available" options={['Yes', 'No']} />
                <FormField label="Seal Material" name="seal_material" placeholder="e.g. Viton" />
                <FormField label="Operating Pressure" name="operating_pressure" placeholder="e.g. 3 bar" />
                <FormField label="Color Code" name="color_code" placeholder="e.g. Red" />
                <FormField label="Nozzle Weight" name="nozzle_weight" placeholder="e.g. 500g" />
            </>
        );
        case 'Solenoid Valve': return (
            <>
                <FormField label="Valve Type" name="valve_type" placeholder="e.g. Normally Closed" />
                <FormField label="Operation Type" name="operation_type" placeholder="e.g. Direct Acting" />
                <FormField label="Coil Voltage" name="coil_voltage" placeholder="e.g. 24V DC" />
                <FormField label="Coil Power" name="coil_power" placeholder="e.g. 10W" />
                <FormField label="Port Size" name="port_size" placeholder="e.g. 1/2 inch" />
                <FormField label="Number of Ports" name="number_of_ports" placeholder="e.g. 2/2 Way" />
                <FormField label="Body Material" name="body_material" placeholder="e.g. Brass" />
                <FormField label="Medium Compatibility" name="medium_compatibility" placeholder="e.g. Air, Water, Gas" />
                <FormField label="Pressure Range" name="pressure_range" placeholder="e.g. 0-10 bar" />
                <FormField label="Response Time" name="response_time" placeholder="e.g. 20 ms" />
                <SelectField label="Manual Override" name="manual_override" options={['Yes', 'No']} />
                <FormField label="Coil Protection Class" name="coil_protection_class" placeholder="e.g. IP65" />
                <FormField label="Duty Cycle" name="duty_cycle" placeholder="e.g. 100% ED" />
            </>
        );
        case 'Relay Box': return (
            <>
                <FormField label="Relay Box Type" name="relay_box_type" placeholder="e.g. Multi-channel" />
                <FormField label="Input Voltage" name="input_voltage" placeholder="e.g. 230V AC" />
                <FormField label="Output Voltage" name="output_voltage" placeholder="e.g. 24V DC" />
                <FormField label="Number of Relays" name="number_of_relays" placeholder="e.g. 8" />
                <FormField label="Relay Rating" name="relay_rating" placeholder="e.g. 10A" />
                <FormField label="Relay Type" name="relay_type" placeholder="e.g. SPDT" />
                <FormField label="Control Signal Type" name="control_signal_type" placeholder="e.g. 0-10V, 4-20mA" />
                <FormField label="Terminal Type" name="terminal_type" placeholder="e.g. Screw" />
                <FormField label="Enclosure Material" name="enclosure_material" placeholder="e.g. ABS Plastic" />
                <SelectField label="Fuse Available" name="fuse_available" options={['Yes', 'No']} />
                <SelectField label="LED Indicator" name="led_indicator_available" options={['Yes', 'No']} />
                <SelectField label="Manual Override" name="manual_override_available" options={['Yes', 'No']} />
                <FormField label="Communication Interface" name="communication_interface" placeholder="e.g. RS485" />
            </>
        );
        case 'Transformer': return (
            <>
                <FormField label="Transformer Type" name="transformer_type" placeholder="e.g. Step-down" />
                <FormField label="Winding Material" name="winding_material" placeholder="e.g. Copper" />
                <FormField label="Core Type" name="core_type" placeholder="e.g. Toroidal" />
                <FormField label="Insulation Class" name="insulation_class" placeholder="e.g. Class F" />
                <FormField label="Cooling Type" name="cooling_type" placeholder="e.g. Air Cooled" />
                <SelectField label="Short Circuit Protection" name="short_circuit_protection" options={['Yes', 'No']} />
                <FormField label="Temperature Rise" name="temperature_rise" placeholder="e.g. 50°C" />
                <FormField label="Efficiency" name="efficiency" placeholder="e.g. 95%" />
            </>
        );
        case 'RCCB': return (
            <>
                <FormField label="RCCB Type" name="rccb_type" placeholder="e.g. Type A" />
                <FormField label="Sensitivity" name="sensitivity" placeholder="e.g. 30mA" />
                <FormField label="Breaking Capacity" name="breaking_capacity" placeholder="e.g. 10kA" />
                <FormField label="Trip Type" name="trip_type" placeholder="e.g. Electromagnetic" />
                <FormField label="Number of Poles" name="number_of_poles" placeholder="e.g. 2P, 4P" />
                <SelectField label="Test Button" name="test_button_available" options={['Yes', 'No']} />
                <FormField label="Standards" name="standards" placeholder="e.g. IEC 61008-1" />
                <FormField label="Protection Purpose" name="protection_purpose" placeholder="e.g. Earth Leakage" />
                <SelectField label="Trip Indicator" name="trip_indicator_available" options={['Yes', 'No']} />
            </>
        );
        case 'SPD(Surge Protection Device)': return (
            <>
                <FormField label="SPD Type" name="spd_type" placeholder="e.g. Type 2" />
                <FormField label="Protection Mode" name="protection_mode" placeholder="e.g. L-N, N-PE" />
                <FormField label="Max Continuous Voltage" name="max_continuous_operating_voltage" placeholder="e.g. 275V" />
                <FormField label="Nominal Discharge Current" name="nominal_discharge_current" placeholder="e.g. 20kA" />
                <FormField label="Max Discharge Current" name="max_discharge_current" placeholder="e.g. 40kA" />
                <FormField label="Voltage Protection Level" name="voltage_protection_level" placeholder="e.g. < 1.5kV" />
                <SelectField label="Status Indicator" name="status_indicator_available" options={['Yes', 'No']} />
                <SelectField label="Replaceable Cartridge" name="replaceable_cartridge" options={['Yes', 'No']} />
                <SelectField label="Remote Signal Contact" name="remote_signal_contact" options={['Yes', 'No']} />
                <FormField label="Standard Compliance" name="standard_compliance" placeholder="e.g. IEC 61643-11" />
            </>
        );
        default: return null;
    }
  };

  const columns = [
    { key: 'part_name', label: 'Part Name' },
    { key: 'part_category', label: 'Category' },
    { key: 'part_number', label: 'Part Number' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Registered On', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <Plug size={24} className="text-[#f59e0b]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">
              Electrical Parts
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Electrical Inventory & Specifications Management
            </p>
          </div>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="btn-primary shadow-lg px-8 py-3 group"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] md:text-[14px]">Register Electrical Part</span>
        </button>
      </div>

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
          onView={(item) => loadPartDetails(item.part_id, 'view')}
          onEdit={(item) => loadPartDetails(item.part_id, 'edit')}
          onDelete={handleDelete}
        />
      </div>

      {/* Main Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? "Register Electrical Part" : modalMode === 'edit' ? "Edit Electrical Specifications" : "Technical Data Sheet"}
        maxWidth="max-w-6xl"
        headerActions={
          <div className="flex items-center gap-3">
             {modalMode !== 'view' && (
                <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className="btn-primary py-2.5 px-8 shadow-md flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save' : 'Update Specs')}
                </button>
             )}
          </div>
        }
      >
        {modalMode === 'view' ? (
          <div className="space-y-10 pb-10 max-h-[82vh] overflow-y-auto custom-scrollbar pr-4">
             {/* View Header */}
             <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-color)] relative overflow-hidden shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                   <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5 text-[12px] font-black text-[var(--text-dim)] uppercase tracking-widest">
                            <Plug size={14} className="text-[#f59e0b]" />
                            {selectedItem?.part_category || 'General Part'}
                        </div>
                      </div>
                      <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">{selectedItem?.part_name}</h2>
                      <div className="flex flex-wrap items-center gap-5 text-[12px] font-bold text-[var(--text-muted)]">
                        <div className="flex items-center gap-3 bg-[var(--bg-workspace)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                           <span className="uppercase text-[10px] opacity-60 font-black">Part No:</span>
                           <span className="text-[var(--text-main)] font-mono text-[14px]">{selectedItem?.part_number}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[var(--bg-workspace)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-sm">
                           <Factory size={14} className="text-[var(--accent)]" />
                           <span className="uppercase text-[10px] opacity-60 font-black">Manufacturer:</span>
                           <span className="text-[var(--text-main)] text-[14px]">{selectedItem?.manufacturer || 'N/A'}</span>
                        </div>
                      </div>
                   </div>
                   <div className="lg:max-w-[450px] w-full p-6 bg-[var(--bg-workspace)] rounded-2xl border border-[var(--border-color)] shadow-inner relative">
                      <div className="absolute -top-3 left-6 bg-[var(--bg-workspace)] px-3 py-1 border border-[var(--border-color)] rounded-lg">
                        <p className="text-[9px] font-black text-[#f59e0b] uppercase tracking-widest flex items-center gap-2">OVERVIEW</p>
                      </div>
                      <p className="text-[14px] text-[var(--text-main)] leading-relaxed font-bold opacity-90 mt-2">
                        {selectedItem?.description || 'No detailed technical description provided.'}
                      </p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                   <div className="flex items-center gap-4 mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-inner"><Zap size={22} /></div>
                      <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Technical Specs</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <DataSheetEntry label="Voltage" value={selectedItem?.rated_voltage} icon={BatteryCharging} />
                      <DataSheetEntry label="Current" value={selectedItem?.rated_current} icon={Zap} />
                      <DataSheetEntry label="Power Rating" value={selectedItem?.power_rating} />
                      <DataSheetEntry label="Phase Type" value={selectedItem?.phase_type} />
                      <DataSheetEntry label="Frequency" value={selectedItem?.frequency} />
                      <DataSheetEntry label="Protection" value={selectedItem?.protection_rating} icon={ShieldAlert} />
                   </div>
                </div>

                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                   <div className="flex items-center gap-4 mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-inner"><Box size={22} /></div>
                      <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Physical & Installation</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <DataSheetEntry label="Mounting Type" value={selectedItem?.mounting_type} icon={Wrench} />
                      <DataSheetEntry label="Connector Type" value={selectedItem?.connector_type} icon={Plug} />
                      <DataSheetEntry label="Operating Temp" value={selectedItem?.operating_temperature} icon={Activity} />
                      <DataSheetEntry label="Material" value={selectedItem?.material} />
                      <DataSheetEntry label="Dimensions" value={selectedItem?.dimensions} icon={Ruler} />
                      <DataSheetEntry label="Weight" value={selectedItem?.weight} icon={Scale} />
                   </div>
                </div>
             </div>

             {/* Category Params */}
             {selectedItem?.category_name && (
                <div className="workspace-card p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] shadow-sm">
                   <div className="flex items-center gap-4 mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-inner"><Layers size={22} /></div>
                      <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">{selectedItem.category_name} Parameters</h3>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {Object.entries(selectedItem).map(([key, value]) => {
                          const ignoreKeys = ['part_id', 'tech_id', 'inventory_id', 'procurement_id', 'spec_id', 'file_id', 'image_id', 'created_at', 'updated_at', 'part_images', 'files', 'parameters', 'is_active'];
                          if (ignoreKeys.includes(key) || !value || typeof value === 'object') return null;
                          if (Object.keys(selectedItem).indexOf(key) < 20) return null; // Very basic filter to only show extra params, could be better
                          return <DataSheetEntry key={key} label={key.replace(/_/g, ' ')} value={String(value)} />;
                      })}
                   </div>
                </div>
             )}

             {/* Files */}
             <div className="space-y-6">
                <div className="flex items-center gap-4 ml-4">
                   <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-sm"><FileUp size={20} /></div>
                   <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Documentation Library</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                   <FileCard label="Datasheet" url={selectedItem?.files?.datasheet_url} />
                   <FileCard label="Wiring Diagram" url={selectedItem?.files?.wiring_diagram_url} />
                   <FileCard label="Installation Manual" url={selectedItem?.files?.installation_manual_url} />
                   <FileCard label="Test Report" url={selectedItem?.files?.test_report_url} />
                   <FileCard label="Calibration Cert" url={selectedItem?.files?.calibration_cert_url} />
                   <FileCard label="Compliance Cert" url={selectedItem?.files?.compliance_cert_url} />
                   <FileCard label="Warranty Document" url={selectedItem?.files?.warranty_doc_url} />
                   <FileCard label="Invoice" url={selectedItem?.files?.invoice_url} />
                </div>
             </div>

             {selectedItem?.part_images && selectedItem.part_images.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 ml-4">
                        <div className="w-9 h-9 rounded-xl bg-[var(--nav-hover)] flex items-center justify-center text-[#f59e0b] shadow-sm"><ImageIcon size={20} /></div>
                        <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Visual Gallery</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {selectedItem.part_images.map((img, idx) => (
                           <div key={idx} className="aspect-square rounded-[24px] border-2 border-[var(--border-color)] overflow-hidden bg-[var(--bg-workspace)] group relative cursor-pointer shadow-md">
                                <img src={`${FILE_BASE_URL}/${img}`} alt="Part" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <a href={`${FILE_BASE_URL}/${img}`} target="_blank" rel="noreferrer" title="View" className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-[var(--accent)] transition-all shadow-lg"><Eye size={22} /></a>
                                    <button onClick={() => handleDownload(img)} title="Download" className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-[var(--accent)] transition-all shadow-lg"><Download size={22} /></button>
                                </div>
                           </div>
                        ))}
                    </div>
                </div>
             )}
          </div>
        ) : (
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Tabs */}
            <div className="flex bg-[var(--bg-workspace)]/50 p-1.5 rounded-2xl mb-8 border border-[var(--border-color)] flex-wrap gap-1">
                {[
                { id: 'general', label: 'General', icon: Info },
                { id: 'technical', label: 'Technical Spec', icon: Settings },
                { id: 'categories', label: 'Category Params', icon: Layers },
                { id: 'inventory', label: 'Inventory', icon: Package },
                { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
                { id: 'files', label: 'Files', icon: FileUp }
                ].map((tab) => {
                    if (tab.id === 'categories') {
                        return (
                            <div key={tab.id} className="relative group flex-1 min-w-[120px]">
                                <button
                                    type="button"
                                    onClick={() => setModalTab(tab.id)}
                                    className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-300 font-black text-[9px] uppercase tracking-widest ${modalTab === tab.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
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
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-300 font-black text-[9px] uppercase tracking-widest ${modalTab === tab.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                        >
                            <tab.icon size={14} strokeWidth={3} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-4">
                <form id="electrical-form" className="space-y-8">
                
                {modalTab === 'general' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormField label="Part Category" name="part_category" placeholder="e.g. Pump" required />
                            <FormField label="Part Name" name="part_name" placeholder="e.g. Water Circulation Pump" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FormField label="Part Number / Model Number" name="part_number" placeholder="e.g. WP-100" />
                            <FormField label="Manufacturer" name="manufacturer" placeholder="e.g. Grundfos" />
                            <FormField label="Part Type" name="part_type" placeholder="e.g. Centrifugal" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <SelectField label="Status" name="status" options={['Active', 'Inactive', 'Damaged', 'Deleted']} />
                            <SelectField label="Used in Product" name="used_in_product" options={products.map(p => p.product_name)} />
                            <FormField label="Material" name="material" placeholder="e.g. Cast Iron" />
                        </div>
                        <TextAreaField label="Description" name="description" placeholder="Technical overview..." />
                    </div>
                )}

                {modalTab === 'technical' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                            <FormField label="Rated Voltage" name="rated_voltage" />
                            <FormField label="Rated Current" name="rated_current" />
                            <FormField label="Power Rating" name="power_rating" />
                            <FormField label="Phase Type" name="phase_type" />
                            <FormField label="Frequency" name="frequency" />
                            <FormField label="Input Type" name="input_type" />
                            <FormField label="Output Type" name="output_type" />
                            <FormField label="Connector Type" name="connector_type" />
                            <FormField label="Mounting Type" name="mounting_type" />
                            <FormField label="Protection Rating" name="protection_rating" />
                            <FormField label="Operating Temperature" name="operating_temperature" />
                            <FormField label="Dimensions" name="dimensions" />
                            <FormField label="Weight" name="weight" />
                        </div>
                    </div>
                )}

                {modalTab === 'categories' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6">
                        <input type="hidden" {...register('category_name')} value={selectedCategory} />
                        
                        {selectedCategory && (
                            <div>
                                <h4 className="text-[14px] font-black uppercase tracking-widest text-[#f59e0b] mb-6 flex items-center gap-2">
                                    <Layers size={18} /> {selectedCategory} Parameters
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                                    {renderCategoryFields()}
                                </div>
                            </div>
                        )}
                        {!selectedCategory && (
                            <div className="p-12 text-center border border-dashed border-[var(--border-color)] rounded-3xl opacity-50 mt-2">
                                <Layers size={48} className="mx-auto mb-4 text-[var(--text-dim)]" />
                                <p className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)]">Hover over the 'Category Params' tab above to select a category</p>
                            </div>
                        )}
                    </div>
                )}

                {modalTab === 'inventory' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                            <FormField label="Serial Number" name="serial_number" />
                            <FormField label="Batch Number" name="batch_number" />
                            <FormField label="Quantity Available" name="quantity_available" type="number" />
                            <FormField label="Minimum Stock Level" name="minimum_stock_level" type="number" />
                            <FormField label="Unit of Measurement" name="unit_of_measurement" />
                            <FormField label="Storage Location" name="storage_location" />
                            <FormField label="Condition" name="condition" />
                            <div className="flex items-center h-full pt-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" {...register('is_damaged')} className="w-5 h-5 accent-[var(--accent)]" />
                                    <span className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-widest">Is Damaged</span>
                                </label>
                            </div>
                            <FormField label="Damage Description" name="damage_description" />
                            <div className="flex items-center h-full pt-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" {...register('is_assigned')} className="w-5 h-5 accent-[var(--accent)]" />
                                    <span className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-widest">Is Assigned</span>
                                </label>
                            </div>
                            <FormField label="Assigned Device ID" name="assigned_device_id" />
                            <FormField label="Last Inspection Date" name="last_inspection_date" type="date" />
                            <FormField label="Next Inspection Date" name="next_inspection_date" type="date" />
                        </div>
                    </div>
                )}

                {modalTab === 'procurement' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                            <FormField label="Supplier Name" name="supplier_name" />
                            <FormField label="Supplier Contact" name="supplier_contact" />
                            <FormField label="Purchase Date" name="purchase_date" type="date" />
                            <FormField label="Purchase Order Number" name="purchase_order_number" />
                            <FormField label="Invoice Number" name="invoice_number" />
                            <FormField label="Purchase Price" name="purchase_price" type="number" />
                            <FormField label="Warranty Period" name="warranty_period" />
                            <FormField label="Warranty Start Date" name="warranty_start_date" type="date" />
                            <FormField label="Warranty End Date" name="warranty_end_date" type="date" />
                            <SelectField label="Warranty Status" name="warranty_status" options={['Active', 'Expired', 'Void']} />
                            <FormField label="GST Number" name="gst_number" />
                            <div className="md:col-span-3">
                                <TextAreaField label="Remarks" name="remarks" />
                            </div>
                        </div>
                    </div>
                )}

                {modalTab === 'files' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <FileInput label="Datasheet" name="file_datasheet" existingUrl={selectedItem?.files?.datasheet_url} />
                            <FileInput label="Wiring Diagram" name="file_wiring" existingUrl={selectedItem?.files?.wiring_diagram_url} />
                            <FileInput label="Installation Manual" name="file_manual" existingUrl={selectedItem?.files?.installation_manual_url} />
                            <FileInput label="Test Report" name="file_test_report" existingUrl={selectedItem?.files?.test_report_url} />
                            <FileInput label="Calibration Certificate" name="file_calib_cert" existingUrl={selectedItem?.files?.calibration_cert_url} />
                            <FileInput label="Compliance Certificate" name="file_compliance" existingUrl={selectedItem?.files?.compliance_cert_url} />
                            <FileInput label="Warranty Document" name="file_warranty" existingUrl={selectedItem?.files?.warranty_doc_url} />
                            <FileInput label="Invoice / Purchase Bill" name="file_invoice" existingUrl={selectedItem?.files?.invoice_url} />
                            
                            <div className="md:col-span-2">
                            <div className="space-y-3 p-6 bg-[var(--nav-hover)]/30 border border-dashed border-[var(--border-color)] rounded-[24px]">
                                <div className="flex items-center gap-3 mb-4">
                                    <ImageIcon size={18} className="text-[#f59e0b]" />
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)]">Part Images Gallery</h4>
                                </div>
                                
                                {modalMode === 'edit' && selectedItem?.part_images && selectedItem.part_images.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-6">
                                        {selectedItem.part_images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-xl border border-[var(--border-color)] overflow-hidden group">
                                                <img src={`${FILE_BASE_URL}/${img}`} alt="Part" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                    <a href={`${FILE_BASE_URL}/${img}`} target="_blank" rel="noreferrer" className="text-white hover:text-[var(--accent)]"><Eye size={16} /></a>
                                                    <button type="button" onClick={() => handleRemoveImage(img)} className="text-rose-500 hover:text-white"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

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

export default ElectricalPartsPage;
