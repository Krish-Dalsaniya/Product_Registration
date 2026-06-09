const db = require('./src/config/db');

const frontendFields = {
  "Battery": [
    "battery_chemistry", "battery_voltage", "battery_capacity", "cell_count", "rechargeable",
    "charging_voltage", "max_charging_current", "max_discharge_current", "backup_time",
    "battery_connector_type", "cycle_life", "bms_available"
  ],
  "Flow Meter": [
    "flow_meter_type", "flow_range", "accuracy", "pulse_output", "pulses_per_liter",
    "k_factor", "fluid_compatibility", "inlet_size", "outlet_size", "max_pressure",
    "calibration_required", "calibration_cert_no"
  ],
  "SMPS": [
    "input_voltage_range", "output_voltage", "output_current", "output_power", "efficiency",
    "num_outputs", "protection", "cooling_type", "smps_type", "ripple_noise"
  ],
  "Printer": [
    "printer_type", "printer_model", "print_width", "paper_roll_size", "print_speed",
    "interface", "baud_rate", "cutter_available", "paper_sensor_available",
    "operating_voltage", "supported_language"
  ],
  "Speaker": [
    "speaker_type", "power_rating", "impedance", "frequency_range", "sound_level",
    "operating_voltage", "connector_type", "mounting_type"
  ],
  "Amplifier": [
    "amplifier_type", "ic_chipset", "input_voltage", "output_power", "channel_type",
    "speaker_impedance_support", "input_signal_type", "volume_control", "protection"
  ],
  "Temperature Sensor": [
    "sensor_type", "sensor_model", "temperature_range", "accuracy", "output_signal",
    "interface", "probe_type", "cable_length", "calibration_required"
  ],
  "Quality Sensor": [
    "sensor_type", "measured_parameter", "measuring_range", "accuracy", "output_signal",
    "communication_protocol", "fluid_compatibility", "calibration_required", "calibration_data"
  ],
  "Pressure Sensor": [
    "pressure_range", "pressure_type", "output_signal", "accuracy", "thread_size",
    "overload_pressure", "burst_pressure", "medium_compatibility", "operating_voltage"
  ],
  "EMI-EMC Filter": [
    "filter_type", "rated_voltage", "rated_current", "frequency_range", "leakage_current",
    "filter_stage", "mounting_type", "certification", "application"
  ],
  "DC Meter": [
    "meter_type", "voltage_range", "current_range", "display_type", "accuracy_class",
    "shunt_required", "communication_interface", "protocol", "power_supply", "mounting_type"
  ]
};

const tables = {
    'Battery': 'battery_specs',
    'Flow Meter': 'flow_meter_specs',
    'SMPS': 'smps_specs',
    'Printer': 'printer_specs',
    'Speaker': 'speaker_specs',
    'Amplifier': 'amplifier_specs',
    'Temperature Sensor': 'temperature_sensor_specs',
    'Quality Sensor': 'quality_sensor_specs',
    'Pressure Sensor': 'pressure_sensor_specs',
    'EMI-EMC Filter': 'emi_emc_filter_specs',
    'DC Meter': 'dc_meter_specs'
};

async function fixSchemas() {
    try {
        for (const [cat, fields] of Object.entries(frontendFields)) {
            const table = tables[cat];
            
            for (const field of fields) {
                try {
                    await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${field} VARCHAR(255)`);
                    console.log(`Added ${field} to ${table}`);
                } catch (e) {
                    console.error(`Error adding ${field} to ${table}:`, e.message);
                }
            }
        }
        console.log('Schema update complete.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

fixSchemas();
