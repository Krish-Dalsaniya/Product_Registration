const db = require('./src/config/db');

async function migrate() {
    const sql = `
    -- Battery Specific Table
    CREATE TABLE IF NOT EXISTS battery_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        chemistry VARCHAR(255),
        cycle_life VARCHAR(255),
        nominal_voltage VARCHAR(255),
        capacity VARCHAR(255),
        internal_resistance VARCHAR(255),
        charge_temp VARCHAR(255),
        discharge_temp VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Flow Meter Specific Table
    CREATE TABLE IF NOT EXISTS flow_meter_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        flow_range VARCHAR(255),
        pipe_diameter VARCHAR(255),
        pulse_rate VARCHAR(255),
        max_pressure VARCHAR(255),
        fluid_type VARCHAR(255),
        output_protocol VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- SMPS Specific Table
    CREATE TABLE IF NOT EXISTS smps_specs (
        spec_id SERIAL PRIMARY KEY,
        part_id INTEGER REFERENCES electronics_part_master(part_id) ON DELETE CASCADE,
        input_voltage VARCHAR(255),
        output_voltage VARCHAR(255),
        output_current VARCHAR(255),
        efficiency VARCHAR(255),
        ripple_noise VARCHAR(255),
        cooling_method VARCHAR(255),
        datasheet_file VARCHAR(500),
        warranty_document VARCHAR(500),
        part_images_gallery JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    try {
        await db.query(sql);
        console.log("SUCCESS: Category-specific tables created.");
    } catch (err) {
        console.error("MIGRATION ERROR:", err);
    } finally {
        process.exit();
    }
}

migrate();
