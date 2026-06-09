const db = require('./src/config/db');

async function migrate() {
    const sql = `
    -- Pump Specs
    CREATE TABLE IF NOT EXISTS pump_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
        pump_type VARCHAR(255),
        motor_type VARCHAR(255),
        flow_rate VARCHAR(255),
        max_pressure VARCHAR(255),
        suction_size VARCHAR(255),
        outlet_size VARCHAR(255),
        fluid_compatibility VARCHAR(255),
        pump_material VARCHAR(255),
        rpm VARCHAR(255),
        seal_type VARCHAR(255),
        noise_level VARCHAR(255),
        dry_run_protection VARCHAR(50),
        overload_protection VARCHAR(50),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Nozzle Specs
    CREATE TABLE IF NOT EXISTS nozzle_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
        nozzle_type VARCHAR(255),
        fuel_compatibility VARCHAR(255),
        flow_rate_range VARCHAR(255),
        inlet_size VARCHAR(255),
        outlet_diameter VARCHAR(255),
        spout_type VARCHAR(255),
        auto_cutoff_available VARCHAR(50),
        swivel_joint_available VARCHAR(50),
        trigger_lock_available VARCHAR(50),
        seal_material VARCHAR(255),
        operating_pressure VARCHAR(255),
        color_code VARCHAR(255),
        nozzle_weight VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Solenoid Valve Specs
    CREATE TABLE IF NOT EXISTS solenoid_valve_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
        valve_type VARCHAR(255),
        operation_type VARCHAR(255),
        coil_voltage VARCHAR(255),
        coil_power VARCHAR(255),
        port_size VARCHAR(255),
        number_of_ports VARCHAR(255),
        body_material VARCHAR(255),
        medium_compatibility VARCHAR(255),
        pressure_range VARCHAR(255),
        response_time VARCHAR(255),
        manual_override VARCHAR(50),
        coil_protection_class VARCHAR(255),
        duty_cycle VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Relay Box Specs
    CREATE TABLE IF NOT EXISTS relay_box_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
        relay_box_type VARCHAR(255),
        input_voltage VARCHAR(255),
        output_voltage VARCHAR(255),
        number_of_relays VARCHAR(255),
        relay_rating VARCHAR(255),
        relay_type VARCHAR(255),
        control_signal_type VARCHAR(255),
        terminal_type VARCHAR(255),
        enclosure_material VARCHAR(255),
        fuse_available VARCHAR(50),
        led_indicator_available VARCHAR(50),
        manual_override_available VARCHAR(50),
        communication_interface VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Transformer Specs
    CREATE TABLE IF NOT EXISTS transformer_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
        transformer_type VARCHAR(255),
        winding_material VARCHAR(255),
        core_type VARCHAR(255),
        insulation_class VARCHAR(255),
        cooling_type VARCHAR(255),
        short_circuit_protection VARCHAR(50),
        temperature_rise VARCHAR(255),
        efficiency VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- RCCB Specs
    CREATE TABLE IF NOT EXISTS rccb_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
        rccb_type VARCHAR(255),
        sensitivity VARCHAR(255),
        breaking_capacity VARCHAR(255),
        trip_type VARCHAR(255),
        number_of_poles VARCHAR(255),
        test_button_available VARCHAR(50),
        standards VARCHAR(255),
        protection_purpose VARCHAR(255),
        trip_indicator_available VARCHAR(50),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- SPD Specs
    CREATE TABLE IF NOT EXISTS spd_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
        spd_type VARCHAR(255),
        protection_mode VARCHAR(255),
        max_continuous_operating_voltage VARCHAR(255),
        nominal_discharge_current VARCHAR(255),
        max_discharge_current VARCHAR(255),
        voltage_protection_level VARCHAR(255),
        status_indicator_available VARCHAR(50),
        replaceable_cartridge VARCHAR(50),
        remote_signal_contact VARCHAR(50),
        standard_compliance VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    try {
        await db.query(sql);
        console.log("SUCCESS: All electrical category specialized tables created.");
    } catch (err) {
        console.error("MIGRATION ERROR:", err);
    } finally {
        process.exit();
    }
}

migrate();
