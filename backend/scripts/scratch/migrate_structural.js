const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const sql = `
-- STRUCTURAL_PART_MASTER
CREATE TABLE IF NOT EXISTS STRUCTURAL_PART_MASTER (
    part_id SERIAL PRIMARY KEY,
    part_category VARCHAR(100) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    internal_part_code VARCHAR(100), -- SKU
    compatible_dispenser_model VARCHAR(100),
    assembly_group VARCHAR(100),
    part_position VARCHAR(100),
    part_description TEXT,
    manufacturer_fabricator VARCHAR(255),
    brand VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STRUCTURAL_TECH_SPEC
CREATE TABLE IF NOT EXISTS STRUCTURAL_TECH_SPEC (
    tech_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    material_type VARCHAR(100),
    material_grade VARCHAR(100),
    sheet_thickness VARCHAR(50),
    surface_finish VARCHAR(100),
    paint_coating_color VARCHAR(100),
    coating_thickness VARCHAR(50),
    corrosion_protection VARCHAR(50),
    rust_proof_treatment VARCHAR(100),
    welding_required VARCHAR(50),
    bending_required VARCHAR(50),
    laser_cutting_required VARCHAR(50),
    cnc_cutting_required VARCHAR(50),
    edge_finish VARCHAR(100),
    waterproof_sealing_required VARCHAR(50),
    rubber_gasket_required VARCHAR(50),
    length VARCHAR(50),
    width VARCHAR(50),
    height VARCHAR(50),
    thickness VARCHAR(50),
    weight VARCHAR(50),
    tolerance VARCHAR(50),
    hole_count INTEGER,
    hole_diameter VARCHAR(50),
    cutout_available VARCHAR(50),
    cutout_type VARCHAR(100),
    cutout_size VARCHAR(100),
    bend_angle VARCHAR(50),
    bend_count INTEGER,
    mounting_hole_pattern VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STRUCTURAL_CATEGORY_SPEC
CREATE TABLE IF NOT EXISTS STRUCTURAL_CATEGORY_SPEC (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    spec_data JSONB
);

-- Specialized Tables
CREATE TABLE IF NOT EXISTS cabinet_body_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    cabinet_type VARCHAR(100), cabinet_material VARCHAR(100), cabinet_height VARCHAR(50), cabinet_width VARCHAR(50), cabinet_depth VARCHAR(50), door_opening_side VARCHAR(50), ventilation_available VARCHAR(50), number_of_vents INTEGER, ip_protection_target VARCHAR(100), internal_mounting_plate_available VARCHAR(50), base_stand_available VARCHAR(50), locking_arrangement VARCHAR(100), cable_entry_holes VARCHAR(50), hose_entry_hole VARCHAR(50), earthing_point_available VARCHAR(50),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS front_door_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    door_type VARCHAR(100), door_material VARCHAR(100), door_opening_direction VARCHAR(50), lock_type VARCHAR(100), look_count INTEGER, hinge_type VARCHAR(100), hinge_count INTEGER, rubber_gasket_available VARCHAR(50), display_cutout_available VARCHAR(50), printer_cutout_available VARCHAR(50), keypad_cutout_available VARCHAR(50), sticker_area_available VARCHAR(50), door_stopper_available VARCHAR(50),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS side_panel_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    panel_side VARCHAR(50), panel_type VARCHAR(100), ventilation_slot_available VARCHAR(50), number_of_vent_slots INTEGER, access_opening_available VARCHAR(50), hose_pipe_opening_available VARCHAR(50), nozzle_holder_mounting_available VARCHAR(50), fastner_type VARCHAR(100), panel_reinforcement_available VARCHAR(50),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS top_cover_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    cover_type VARCHAR(100), rain_protection_design VARCHAR(50), overhang_available VARCHAR(50), mounting_type VARCHAR(100), sealing_gasket_available VARCHAR(50), cable_entry_available VARCHAR(50), ventilation_available VARCHAR(50), branding_area_available VARCHAR(50),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS base_frame_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    base_type VARCHAR(100), base_material VARCHAR(100), load_capacity VARCHAR(100), foot_stand_count INTEGER, floor_mounting_hole_available VARCHAR(50), anchor_bolt_size VARCHAR(50), anti_vibration_pad_available VARCHAR(50), leveling_foot_available VARCHAR(50), bottom_clearance VARCHAR(50), drain_hole_available VARCHAR(50),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS internal_mounting_plate_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    plate_usage VARCHAR(100), plate_material VARCHAR(100), mounting_hole_pattern VARCHAR(100), component_mounting_slots VARCHAR(50), cable_routing_holes VARCHAR(50), din_rail_mounting_available VARCHAR(50), earthing_stud_available VARCHAR(50), removable_plate VARCHAR(50),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nozzle_holder_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    holder_type VARCHAR(100), nozzle_compatibility VARCHAR(100), holder_material VARCHAR(100), mounting_side VARCHAR(50), nozzle_sensor_mount_available VARCHAR(50), drain_hole_available VARCHAR(50), locking_support_available VARCHAR(50), rubber_padding_available VARCHAR(50), cutout_size VARCHAR(100),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hose_entry_plate_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    hose_entry_type VARCHAR(100), hose_diameter_support VARCHAR(100), grommet_available VARCHAR(50), pipe_clamp_mount_available VARCHAR(50), swivel_mount_support VARCHAR(50), hole_diameter VARCHAR(50), reinforcement_plate_available VARCHAR(50), leak_drain_path_available VARCHAR(50),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS display_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    panel_usage VARCHAR(100), display_cutout_size VARCHAR(100), keypad_cutout_available VARCHAR(50), printer_cutout_available VARCHAR(50), acrylic_window_available VARCHAR(50), window_material VARCHAR(100), window_thickness VARCHAR(50), sticker_branding_area VARCHAR(50), button_hole_count INTEGER, indicator_hole_count INTEGER,
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lock_specs (
    spec_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    hardware_type VARCHAR(100), material VARCHAR(100), size VARCHAR(50), load_capacity VARCHAR(50), opening_angle VARCHAR(50), fastener_size VARCHAR(50), finish VARCHAR(100), quantity_per_dispenser INTEGER, replacement_required VARCHAR(50),
    file_2d_drawing TEXT, file_3d_model TEXT, file_fabrication_drawing TEXT, file_assembly_drawing TEXT, file_cutting TEXT, file_bend_drawing TEXT, file_paint_spec TEXT, file_qc_report TEXT, file_invoice TEXT, part_images_gallery JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function migrate() {
    try {
        console.log("Starting migration...");
        await pool.query(sql);
        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
