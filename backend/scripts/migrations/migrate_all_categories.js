const db = require('./src/config/db');

async function migrate() {
    const sql = `
    -- Printer Specs
    CREATE TABLE IF NOT EXISTS printer_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        print_method VARCHAR(255),
        print_speed VARCHAR(255),
        paper_size VARCHAR(255),
        interface VARCHAR(255),
        resolution VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Speaker Specs
    CREATE TABLE IF NOT EXISTS speaker_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        speaker_type VARCHAR(255),
        impedance VARCHAR(255),
        power_output VARCHAR(255),
        frequency_response VARCHAR(255),
        sensitivity VARCHAR(255),
        dimensions VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Amplifier Specs
    CREATE TABLE IF NOT EXISTS amplifier_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        amplifier_type VARCHAR(255),
        ic_chipset VARCHAR(255),
        input_voltage VARCHAR(255),
        output_power VARCHAR(255),
        channel_type VARCHAR(255),
        speaker_impedance_support VARCHAR(255),
        input_signal_type VARCHAR(255),
        volume_control VARCHAR(255),
        protection VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Temperature Sensor Specs
    CREATE TABLE IF NOT EXISTS temperature_sensor_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        sensor_type VARCHAR(255),
        sensor_model VARCHAR(255),
        temperature_range VARCHAR(255),
        accuracy VARCHAR(255),
        output_signal VARCHAR(255),
        interface VARCHAR(255),
        probe_type VARCHAR(255),
        cable_length VARCHAR(255),
        calibration_required VARCHAR(50),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Quality Sensor Specs
    CREATE TABLE IF NOT EXISTS quality_sensor_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        sensor_type VARCHAR(255),
        measured_parameter VARCHAR(255),
        measuring_range VARCHAR(255),
        accuracy VARCHAR(255),
        output_signal VARCHAR(255),
        communication_protocol VARCHAR(255),
        fluid_compatibility VARCHAR(255),
        calibration_required VARCHAR(50),
        calibration_data TEXT,
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Pressure Sensor Specs
    CREATE TABLE IF NOT EXISTS pressure_sensor_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        pressure_range VARCHAR(255),
        pressure_type VARCHAR(255),
        output_signal VARCHAR(255),
        accuracy VARCHAR(255),
        thread_size VARCHAR(255),
        overload_pressure VARCHAR(255),
        burst_pressure VARCHAR(255),
        medium_compatibility VARCHAR(255),
        operating_voltage VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- EMI-EMC Filter Specs
    CREATE TABLE IF NOT EXISTS emi_emc_filter_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        filter_type VARCHAR(255),
        rated_voltage VARCHAR(255),
        rated_current VARCHAR(255),
        frequency_range VARCHAR(255),
        leakage_current VARCHAR(255),
        filter_stage VARCHAR(255),
        mounting_type VARCHAR(255),
        certification VARCHAR(255),
        application VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- DC Meter Specs
    CREATE TABLE IF NOT EXISTS dc_meter_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        meter_type VARCHAR(255),
        voltage_range VARCHAR(255),
        current_range VARCHAR(255),
        display_type VARCHAR(255),
        accuracy_class VARCHAR(255),
        shunt_required VARCHAR(50),
        communication_interface VARCHAR(255),
        protocol VARCHAR(255),
        power_supply VARCHAR(255),
        mounting_type VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    try {
        await db.query(sql);
        console.log("SUCCESS: All category specialized tables created.");
    } catch (err) {
        console.error("MIGRATION ERROR:", err);
    } finally {
        process.exit();
    }
}

migrate();
