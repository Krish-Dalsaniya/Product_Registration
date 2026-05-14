
import { 
  Container, DoorOpen, Layout, Layers, Frame, BoxSelect, Move, Maximize2, Radio, Shield,
  Battery, Gauge, Zap, Printer, Volume2, Speaker, Thermometer, FlaskConical, ShieldCheck, Binary,
  Activity, Wrench, Settings, Box, Plug, ShieldAlert
} from 'lucide-react';

export const STRUCTURAL_CATEGORY_CONFIG = {
  'Cabinet Body': { icon: Container, color: '#3b82f6' },
  'Front Door': { icon: DoorOpen, color: '#10b981' },
  'Side Panel': { icon: Layout, color: '#f59e0b' },
  'Top Cover': { icon: Layers, color: '#ec4899' },
  'Base Frame': { icon: Frame, color: '#8b5cf6' },
  'Internal Mounting Plate': { icon: BoxSelect, color: '#06b6d4' },
  'Nozzle Holder': { icon: Move, color: '#ef4444' },
  'Hose Entry Plate': { icon: Maximize2, color: '#f97316' },
  'Display': { icon: Radio, color: '#0ea5e9' },
  'Lock': { icon: Shield, color: '#64748b' }
};

export const STRUCTURAL_SPEC_FIELDS = {
  "Cabinet Body": [
    { label: "Cabinet Type", key: "cabinet_type" },
    { label: "Cabinet Material", key: "cabinet_material" },
    { label: "Cabinet Height", key: "cabinet_height" },
    { label: "Cabinet Width", key: "cabinet_width" },
    { label: "Cabinet Depth", key: "cabinet_depth" },
    { label: "Door Opening Side", key: "door_opening_side" },
    { label: "Ventilation Available", key: "ventilation_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Number of Vents", key: "number_of_vents", type: 'number' },
    { label: "IP Protection Target", key: "ip_protection_target" },
    { label: "Internal Mounting Plate Available", key: "internal_mounting_plate_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Base Stand Available", key: "base_stand_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Locking Arrangement", key: "locking_arrangement" },
    { label: "Cable Entry Holes", key: "cable_entry_holes", isSelect: true, options: ['Yes', 'No'] },
    { label: "Hose Entry Hole", key: "hose_entry_hole", isSelect: true, options: ['Yes', 'No'] },
    { label: "Earthing Point Available", key: "earthing_point_available", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Front Door": [
    { label: "Door Type", key: "door_type" },
    { label: "Door Material", key: "door_material" },
    { label: "Door Opening Direction", key: "door_opening_direction" },
    { label: "Lock Type", key: "lock_type" },
    { label: "Lock Count", key: "lock_count", type: 'number' },
    { label: "Hinge Type", key: "hinge_type" },
    { label: "Hinge Count", key: "hinge_count", type: 'number' },
    { label: "Rubber Gasket Available", key: "rubber_gasket_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Display Cutout Available", key: "display_cutout_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Printer Cutout Available", key: "printer_cutout_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Keypad Cutout Available", key: "keypad_cutout_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Sticker Area Available", key: "sticker_area_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Door Stopper Available", key: "door_stopper_available", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Side Panel": [
    { label: "Panel Side", key: "panel_side", isSelect: true, options: ['Left', 'Right'] },
    { label: "Panel Type", key: "panel_type", isSelect: true, options: ['Fixed', 'Removable'] },
    { label: "Ventilation Slot Available", key: "ventilation_slot_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Number of Vent Slots", key: "number_of_vent_slots", type: 'number' },
    { label: "Access Opening Available", key: "access_opening_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Hose Pipe Opening Available", key: "hose_pipe_opening_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Nozzle Holder Mounting Available", key: "nozzle_holder_mounting_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Fastner Type", key: "fastner_type", isSelect: true, options: ['Screw', 'Rivet', 'Welded'] },
    { label: "Panel Reinforcement Available", key: "panel_reinforcement_available", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Top Cover": [
    { label: "Cover Type", key: "cover_type", isSelect: true, options: ['Flat', 'Sloped', 'Removable'] },
    { label: "Rain Protection Design", key: "rain_protection_design", isSelect: true, options: ['Yes', 'No'] },
    { label: "Overhang Available", key: "overhang_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Mounting Type", key: "mounting_type", isSelect: true, options: ['Screw Mounted', 'Welded'] },
    { label: "Sealing Gasket Available", key: "sealing_gasket_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Cable Entry Available", key: "cable_entry_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Ventilation Available", key: "ventilation_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Branding Area Available", key: "branding_area_available", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Base Frame": [
    { label: "Base Type", key: "base_type", isSelect: true, options: ['Fixed Stand', 'Skid Base', 'Cabinet Base'] },
    { label: "Base Material", key: "base_material", isSelect: true, options: ['MS Channel', 'MS Sheet', 'SS'] },
    { label: "Load Capacity", key: "load_capacity" },
    { label: "Foot Stand Count", key: "foot_stand_count", type: 'number' },
    { label: "Floor Mounting Hole Available", key: "floor_mounting_hole_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Anchor Bolt Size", key: "anchor_bolt_size" },
    { label: "Anti-vibration Pad Available", key: "anti_vibration_pad_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Leveling Foot Available", key: "leveling_foot_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Bottom Clearance", key: "bottom_clearance" },
    { label: "Drain Hole Available", key: "drain_hole_available", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Internal Mounting Plate": [
    { label: "Plate Usage", key: "plate_usage", isSelect: true, options: ['PCB Mounting', 'Relay Box', 'SMPS', 'Wiring'] },
    { label: "Plate Material", key: "plate_material", isSelect: true, options: ['MS', 'Aluminum', 'Acrylic'] },
    { label: "Mounting Hole Pattern", key: "mounting_hole_pattern", isSelect: true, options: ['Custom', 'M4', 'M6'] },
    { label: "Component Mounting Slots", key: "component_mounting_slots", isSelect: true, options: ['Yes', 'No'] },
    { label: "Cable Routing Holes", key: "cable_routing_holes", isSelect: true, options: ['Yes', 'No'] },
    { label: "DIN Rail Mounting Available", key: "din_rail_mounting_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Earthing Stud Available", key: "earthing_stud_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Removable Plate", key: "removable_plate", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Nozzle Holder": [
    { label: "Holder Type", key: "holder_type", isSelect: true, options: ['External Holder', 'Recessed Pocket'] },
    { label: "Nozzle Compatibility", key: "nozzle_compatibility", isSelect: true, options: ['Manual', 'Auto Nozzle'] },
    { label: "Holder Material", key: "holder_material", isSelect: true, options: ['Plastic', 'MS', 'Aluminum'] },
    { label: "Mounting Side", key: "mounting_side", isSelect: true, options: ['Left', 'Right', 'Front'] },
    { label: "Nozzle Sensor Mount Available", key: "nozzle_sensor_mount_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Drain Hole Available", key: "drain_hole_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Locking Support Available", key: "locking_support_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Rubber Padding Available", key: "rubber_padding_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Cutout Size", key: "cutout_size" }
  ],
  "Hose Entry Plate": [
    { label: "Hose Entry Type", key: "hose_entry_type", isSelect: true, options: ['Side Entry', 'Bottom Entry', 'Front Entry'] },
    { label: "Hose Diameter Support", key: "hose_diameter_support", isSelect: true, options: ['3/4 inch', '1 inch'] },
    { label: "Grommet Available", key: "grommet_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Pipe Clamp Mount Available", key: "pipe_clamp_mount_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Swivel Mount Support", key: "swivel_mount_support", isSelect: true, options: ['Yes', 'No'] },
    { label: "Hole Diameter", key: "hole_diameter" },
    { label: "Reinforcement Plate Available", key: "reinforcement_plate_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Leak Drain Path Available", key: "leak_drain_path_available", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Display": [
    { label: "Panel Usage", key: "panel_usage", isSelect: true, options: ['Display', 'Keypad', 'Printer', 'Indicator'] },
    { label: "Display Cutout Size", key: "display_cutout_size" },
    { label: "Keypad Cutout Available", key: "keypad_cutout_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Printer Cutout Available", key: "printer_cutout_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Acrylic Window Available", key: "acrylic_window_available", isSelect: true, options: ['Yes', 'No'] },
    { label: "Window Material", key: "window_material", isSelect: true, options: ['Acrylic', 'Polycarbonate', 'Glass'] },
    { label: "Window Thickness", key: "window_thickness", isSelect: true, options: ['2 mm', '3 mm'] },
    { label: "Sticker / Branding Area", key: "sticker_branding_area", isSelect: true, options: ['Yes', 'No'] },
    { label: "Button Hole Count", key: "button_hole_count", type: 'number' },
    { label: "Indicator Hole Count", key: "indicator_hole_count", type: 'number' }
  ],
  "Lock": [
    { label: "Hardware Type", key: "hardware_type", isSelect: true, options: ['Lock', 'Hinge', 'Handle', 'Bracket'] },
    { label: "Material", key: "material", isSelect: true, options: ['SS', 'MS', 'Zinc Alloy'] },
    { label: "Size", key: "size", isSelect: true, options: ['50 mm', '100 mm'] },
    { label: "Load Capacity", key: "load_capacity", isSelect: true, options: ['20 kg'] },
    { label: "Opening Angle", key: "opening_angle", isSelect: true, options: ['90°', '120°', '180°'] },
    { label: "Fastener Size", key: "fastener_size", isSelect: true, options: ['M4', 'M5', 'M6'] },
    { label: "Finish", key: "finish", isSelect: true, options: ['Chrome', 'Black', 'Powder Coated'] },
    { label: "Quantity Per Dispenser", key: "quantity_per_dispenser", type: 'number' },
    { label: "Replacement Required", key: "replacement_required", isSelect: true, options: ['Yes', 'No'] }
  ]
};

export const ELECTRONICS_SPEC_FIELDS = {
  "Battery": [
    { "label": "Battery Chemistry", "key": "battery_chemistry" },
    { "label": "Battery Voltage", "key": "battery_voltage" },
    { "label": "Battery Capacity", "key": "battery_capacity" },
    { "label": "Cell Count", "key": "cell_count" },
    { "label": "Rechargeable", "key": "rechargeable", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Charging Voltage", "key": "charging_voltage" },
    { "label": "Max Charging Current", "key": "max_charging_current" },
    { "label": "Max Discharge Current", "key": "max_discharge_current" },
    { "label": "Backup Time", "key": "backup_time" },
    { "label": "Battery Connector Type", "key": "battery_connector_type" },
    { "label": "Cycle Life", "key": "cycle_life" },
    { "label": "BMS Available", "key": "bms_available", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Flow Meter": [
    { "label": "Flow Meter Type", "key": "flow_meter_type" },
    { "label": "Flow Range", "key": "flow_range" },
    { "label": "Accuracy", "key": "accuracy" },
    { "label": "Pulse Output", "key": "pulse_output", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Pulses Per Liter", "key": "pulses_per_liter", type: 'number' },
    { "label": "K-Factor", "key": "k_factor" },
    { "label": "Fluid Compatibility", "key": "fluid_compatibility" },
    { "label": "Inlet Size", "key": "inlet_size" },
    { "label": "Outlet Size", "key": "outlet_size" },
    { "label": "Max Pressure", "key": "max_pressure" },
    { "label": "Calibration Required", "key": "calibration_required", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Calibration Certificate Number", "key": "calibration_cert_no" }
  ],
  "SMPS": [
    { "label": "Input Voltage Range", "key": "input_voltage_range" },
    { "label": "Output Voltage", "key": "output_voltage" },
    { "label": "Output Current", "key": "output_current" },
    { "label": "Output Power", "key": "output_power" },
    { "label": "Efficiency", "key": "efficiency" },
    { "label": "Number of Outputs", "key": "num_outputs", type: 'number' },
    { "label": "Protection", "key": "protection" },
    { "label": "Cooling Type", "key": "cooling_type" },
    { "label": "SMPS Type", "key": "smps_type" },
    { "label": "Ripple Noise", "key": "ripple_noise" }
  ],
  "Printer": [
    { "label": "Printer Type", "key": "printer_type" },
    { "label": "Printer Model", "key": "printer_model" },
    { "label": "Print Width", "key": "print_width" },
    { "label": "Paper Roll Size", "key": "paper_roll_size" },
    { "label": "Print Speed", "key": "print_speed" },
    { "label": "Interface", "key": "interface" },
    { "label": "Baud Rate", "key": "baud_rate" },
    { "label": "Cutter Available", "key": "cutter_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Paper Sensor Available", "key": "paper_sensor_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Operating Voltage", "key": "operating_voltage" },
    { "label": "Supported Language", "key": "supported_language" }
  ],
  "Speaker": [
    { "label": "Speaker Type", "key": "speaker_type" },
    { "label": "Power Rating", "key": "power_rating" },
    { "label": "Impedance", "key": "impedance" },
    { "label": "Frequency Range", "key": "frequency_range" },
    { "label": "Sound Level", "key": "sound_level" },
    { "label": "Operating Voltage", "key": "operating_voltage" },
    { "label": "Connector Type", "key": "connector_type" },
    { "label": "Mounting Type", "key": "mounting_type" }
  ],
  "Amplifier": [
    { "label": "Amplifier Type", "key": "amplifier_type" },
    { "label": "IC/Chipset", "key": "ic_chipset" },
    { "label": "Input Voltage", "key": "input_voltage" },
    { "label": "Output Power", "key": "output_power" },
    { "label": "Channel Type", "key": "channel_type" },
    { "label": "Speaker Impedance Support", "key": "speaker_impedance_support" },
    { "label": "Input Signal Type", "key": "input_signal_type" },
    { "label": "Volume Control", "key": "volume_control" },
    { "label": "Protection", "key": "protection" }
  ],
  "Temperature Sensor": [
    { "label": "Sensor Type", "key": "sensor_type" },
    { "label": "Sensor Model", "key": "sensor_model" },
    { "label": "Temperature Range", "key": "temperature_range" },
    { "label": "Accuracy", "key": "accuracy" },
    { "label": "Output Signal", "key": "output_signal" },
    { "label": "Interface", "key": "interface" },
    { "label": "Probe Type", "key": "probe_type" },
    { "label": "Cable Length", "key": "cable_length" },
    { "label": "Calibration Required", "key": "calibration_required", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Quality Sensor": [
    { "label": "Sensor Type", "key": "sensor_type" },
    { "label": "Measured Parameter", "key": "measured_parameter" },
    { "label": "Measuring Range", "key": "measuring_range" },
    { "label": "Accuracy", "key": "accuracy" },
    { "label": "Output Signal", "key": "output_signal" },
    { "label": "Communication Protocol", "key": "communication_protocol" },
    { "label": "Fluid Compatibility", "key": "fluid_compatibility" },
    { "label": "Calibration Required", "key": "calibration_required", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Calibration Data", "key": "calibration_data" }
  ],
  "Pressure Sensor": [
    { "label": "Pressure Range", "key": "pressure_range" },
    { "label": "Pressure Type", "key": "pressure_type" },
    { "label": "Output Signal", "key": "output_signal" },
    { "label": "Accuracy", "key": "accuracy" },
    { "label": "Thread Size", "key": "thread_size" },
    { "label": "Overload Pressure", "key": "overload_pressure" },
    { "label": "Burst Pressure", "key": "burst_pressure" },
    { "label": "Medium Compatibility", "key": "medium_compatibility" },
    { "label": "Operating Voltage", "key": "operating_voltage" }
  ],
  "EMI-EMC Filter": [
    { "label": "Filter Type", "key": "filter_type" },
    { "label": "Frequency Range", "key": "frequency_range" },
    { "label": "Leakage Current", "key": "leakage_current" },
    { "label": "Filter Stage", "key": "filter_stage" },
    { "label": "Certification", "key": "certification" },
    { "label": "Application", "key": "application" }
  ],
  "DC Meter": [
    { "label": "Meter Type", "key": "meter_type" },
    { "label": "Voltage Range", "key": "voltage_range" },
    { "label": "Current Range", "key": "current_range" },
    { "label": "Display Type", "key": "display_type" },
    { "label": "Accuracy Class", "key": "accuracy_class" },
    { "label": "Shunt Required", "key": "shunt_required" },
    { "label": "Communication Interface", "key": "communication_interface" },
    { "label": "Protocol", "key": "protocol" },
    { "label": "Power Supply", "key": "power_supply" }
  ]
};

export const ELECTRICAL_SPEC_FIELDS = {
  "Pump": [
    { "label": "Pump Type", "key": "pump_type" },
    { "label": "Motor Type", "key": "motor_type" },
    { "label": "Flow Rate", "key": "flow_rate" },
    { "label": "Max Pressure", "key": "max_pressure" },
    { "label": "Suction Size", "key": "suction_size" },
    { "label": "Outlet Size", "key": "outlet_size" },
    { "label": "Fluid Compatibility", "key": "fluid_compatibility" },
    { "label": "RPM", "key": "rpm" },
    { "label": "Seal Type", "key": "seal_type" },
    { "label": "Noise Level", "key": "noise_level" },
    { "label": "Dry Run Protection", "key": "dry_run_protection", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Overload Protection", "key": "overload_protection", isSelect: true, options: ['Yes', 'No'] }
  ],
  "Nozzle": [
    { "label": "Nozzle Type", "key": "nozzle_type" },
    { "label": "Fuel Compatibility", "key": "fuel_compatibility" },
    { "label": "Flow Rate Range", "key": "flow_rate_range" },
    { "label": "Inlet Size", "key": "inlet_size" },
    { "label": "Outlet Diameter", "key": "outlet_diameter" },
    { "label": "Spout Type", "key": "spout_type" },
    { "label": "Auto Cutoff", "key": "auto_cutoff_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Swivel Joint", "key": "swivel_joint_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Trigger Lock", "key": "trigger_lock_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Seal Material", "key": "seal_material" },
    { "label": "Operating Pressure", "key": "operating_pressure" },
    { "label": "Color Code", "key": "color_code" }
  ],
  "Solenoid Valve": [
    { "label": "Valve Type", "key": "valve_type" },
    { "label": "Operation Type", "key": "operation_type" },
    { "label": "Coil Power", "key": "coil_power" },
    { "label": "Port Size", "key": "port_size" },
    { "label": "Number of Ports", "key": "number_of_ports" },
    { "label": "Medium Compatibility", "key": "medium_compatibility" },
    { "label": "Pressure Range", "key": "pressure_range" },
    { "label": "Response Time", "key": "response_time" },
    { "label": "Manual Override", "key": "manual_override", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Coil Protection Class", "key": "coil_protection_class" },
    { "label": "Duty Cycle", "key": "duty_cycle" }
  ],
  "Relay Box": [
    { "label": "Relay Box Type", "key": "relay_box_type" },
    { "label": "Output Voltage", "key": "output_voltage" },
    { "label": "Number of Relays", "key": "number_of_relays" },
    { "label": "Relay Rating", "key": "relay_rating" },
    { "label": "Relay Type", "key": "relay_type" },
    { "label": "Control Signal Type", "key": "control_signal_type" },
    { "label": "Terminal Type", "key": "terminal_type" },
    { "label": "Enclosure Material", "key": "enclosure_material" },
    { "label": "Fuse Available", "key": "fuse_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "LED Indicator", "key": "led_indicator_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Manual Override", "key": "manual_override_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Communication Interface", "key": "communication_interface" }
  ],
  "Transformer": [
    { "label": "Transformer Type", "key": "transformer_type" },
    { "label": "Winding Material", "key": "winding_material" },
    { "label": "Core Type", "key": "core_type" },
    { "label": "Insulation Class", "key": "insulation_class" },
    { "label": "Cooling Type", "key": "cooling_type" },
    { "label": "Short Circuit Protection", "key": "short_circuit_protection", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Temperature Rise", "key": "temperature_rise" },
    { "label": "Efficiency", "key": "efficiency" }
  ],
  "RCCB": [
    { "label": "RCCB Type", "key": "rccb_type" },
    { "label": "Sensitivity", "key": "sensitivity" },
    { "label": "Breaking Capacity", "key": "breaking_capacity" },
    { "label": "Trip Type", "key": "trip_type" },
    { "label": "Number of Poles", "key": "number_of_poles" },
    { "label": "Test Button", "key": "test_button_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Standards", "key": "standards" },
    { "label": "Protection Purpose", "key": "protection_purpose" },
    { "label": "Trip Indicator", "key": "trip_indicator_available", isSelect: true, options: ['Yes', 'No'] }
  ],
  "SPD(Surge Protection Device)": [
    { "label": "SPD Type", "key": "spd_type" },
    { "label": "Protection Mode", "key": "protection_mode" },
    { "label": "Max Continuous Voltage", "key": "max_continuous_operating_voltage" },
    { "label": "Nominal Discharge Current", "key": "nominal_discharge_current" },
    { "label": "Max Discharge Current", "key": "max_discharge_current" },
    { "label": "Voltage Protection Level", "key": "voltage_protection_level" },
    { "label": "Status Indicator", "key": "status_indicator_available", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Replaceable Cartridge", "key": "replaceable_cartridge", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Remote Signal Contact", "key": "remote_signal_contact", isSelect: true, options: ['Yes', 'No'] },
    { "label": "Standard Compliance", "key": "standard_compliance" }
  ]
};

export const ELECTRONICS_CATEGORY_CONFIG = {
    'Battery': { icon: Battery, color: '#10b981' },
    'Flow Meter': { icon: Gauge, color: '#3b82f6' },
    'SMPS': { icon: Zap, color: '#f59e0b' },
    'Printer': { icon: Printer, color: '#ec4899' },
    'Speaker': { icon: Volume2, color: '#8b5cf6' },
    'Amplifier': { icon: Speaker, color: '#06b6d4' },
    'Temperature Sensor': { icon: Thermometer, color: '#f97316' },
    'Quality Sensor': { icon: FlaskConical, color: '#0ea5e9' },
    'Pressure Sensor': { icon: Gauge, color: '#ef4444' },
    'EMI-EMC Filter': { icon: ShieldCheck, color: '#64748b' },
    'DC Meter': { icon: Binary, color: '#3b82f6' }
};

export const ELECTRICAL_CATEGORY_CONFIG = {
    'Pump': { icon: Activity, color: '#f59e0b' },
    'Nozzle': { icon: Wrench, color: '#3b82f6' },
    'Solenoid Valve': { icon: Settings, color: '#10b981' },
    'Relay Box': { icon: Box, color: '#ec4899' },
    'Transformer': { icon: Zap, color: '#8b5cf6' },
    'RCCB': { icon: Shield, color: '#06b6d4' },
    'SPD(Surge Protection Device)': { icon: ShieldAlert, color: '#ef4444' }
};
