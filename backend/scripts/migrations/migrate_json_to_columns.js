const db = require('./src/config/db');

const mapping = {
  "Battery": { "table": "battery_specs", "columns": [ "battery_chemistry", "battery_voltage", "battery_capacity", "cell_count", "rechargeable", "charging_voltage", "max_charging_current", "max_discharge_current", "backup_time", "battery_connector_type", "cycle_life", "bms_available" ] },
  "Flow Meter": { "table": "flow_meter_specs", "columns": [ "flow_meter_type", "flow_range", "accuracy", "pulse_output", "pulses_per_liter", "k_factor", "fluid_compatibility", "inlet_size", "outlet_size", "max_pressure", "calibration_required", "calibration_cert_no" ] },
  "SMPS": { "table": "smps_specs", "columns": [ "input_voltage_range", "output_voltage", "output_current", "output_power", "efficiency", "num_outputs", "protection", "cooling_type", "smps_type", "ripple_noise" ] },
  "Printer": { "table": "printer_specs", "columns": [ "printer_type", "printer_model", "print_width", "paper_roll_size", "print_speed", "interface", "baud_rate", "cutter_available", "paper_sensor_available", "operating_voltage", "supported_language" ] },
  "Speaker": { "table": "speaker_specs", "columns": [ "speaker_type", "power_rating", "impedance", "frequency_range", "sound_level", "operating_voltage", "connector_type", "mounting_type" ] },
  "Amplifier": { "table": "amplifier_specs", "columns": [ "amplifier_type", "ic_chipset", "input_voltage", "output_power", "channel_type", "speaker_impedance_support", "input_signal_type", "volume_control", "protection" ] },
  "Temperature Sensor": { "table": "temperature_sensor_specs", "columns": [ "sensor_type", "sensor_model", "temperature_range", "accuracy", "output_signal", "interface", "probe_type", "cable_length", "calibration_required" ] },
  "Quality Sensor": { "table": "quality_sensor_specs", "columns": [ "sensor_type", "measured_parameter", "measuring_range", "accuracy", "output_signal", "communication_protocol", "fluid_compatibility", "calibration_required", "calibration_data" ] },
  "Pressure Sensor": { "table": "pressure_sensor_specs", "columns": [ "pressure_range", "pressure_type", "output_signal", "accuracy", "thread_size", "overload_pressure", "burst_pressure", "medium_compatibility", "operating_voltage" ] },
  "EMI-EMC Filter": { "table": "emi_emc_filter_specs", "columns": [ "filter_type", "rated_voltage", "rated_current", "frequency_range", "leakage_current", "filter_stage", "mounting_type", "certification", "application" ] },
  "DC Meter": { "table": "dc_meter_specs", "columns": [ "meter_type", "voltage_range", "current_range", "display_type", "accuracy_class", "shunt_required", "communication_interface", "protocol", "power_supply", "mounting_type" ] }
};

async function migrate() {
    try {
        const catSpecs = await db.query('SELECT * FROM ELECTRONICS_CATEGORY_SPEC');
        for (const row of catSpecs.rows) {
            const cat = row.category_name;
            if (!mapping[cat]) continue;
            
            const specDataStr = row.spec_data;
            if (!specDataStr) continue;
            
            let parsed = {};
            try { parsed = JSON.parse(specDataStr); } catch (e) { continue; }
            
            const { table, columns } = mapping[cat];
            let setClause = [];
            let values = [];
            let idx = 1;
            
            for (const col of columns) {
                if (parsed[col] !== undefined) {
                    setClause.push(`${col} = $${idx++}`);
                    values.push(parsed[col]);
                }
            }
            
            if (setClause.length > 0) {
                values.push(row.part_id);
                const query = `UPDATE ${table} SET ${setClause.join(', ')} WHERE part_id = $${idx}`;
                await db.query(query, values);
                console.log(`Migrated part ${row.part_id} in ${table}`);
            }
        }
        console.log('Data migration complete.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

migrate();
