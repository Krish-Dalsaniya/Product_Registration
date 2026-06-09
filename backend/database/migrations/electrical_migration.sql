-- Migration: Create Electrical Parts Module Tables

BEGIN;

-- 1. Master Table
CREATE TABLE IF NOT EXISTS electrical_part_master (
    part_id BIGSERIAL PRIMARY KEY,
    part_category VARCHAR(100),
    part_name VARCHAR(150) NOT NULL,
    part_number VARCHAR(100),
    manufacturer VARCHAR(150),
    part_type VARCHAR(100),
    description TEXT,
    used_in_product VARCHAR(150),
    material VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Technical Specification Table
CREATE TABLE IF NOT EXISTS electrical_tech_spec (
    tech_id BIGSERIAL PRIMARY KEY,
    part_id BIGINT REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
    rated_voltage VARCHAR(100),
    rated_current VARCHAR(100),
    power_rating VARCHAR(100),
    phase_type VARCHAR(100),
    frequency VARCHAR(100),
    input_type VARCHAR(100),
    output_type VARCHAR(100),
    connector_type VARCHAR(100),
    mounting_type VARCHAR(100),
    protection_rating VARCHAR(100),
    operating_temperature VARCHAR(100),
    dimensions VARCHAR(100),
    weight VARCHAR(100),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inventory Tab Fields
CREATE TABLE IF NOT EXISTS electrical_inventory (
    inventory_id BIGSERIAL PRIMARY KEY,
    part_id BIGINT REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
    serial_number VARCHAR(100),
    batch_number VARCHAR(100),
    quantity_available INT DEFAULT 0,
    minimum_stock_level INT DEFAULT 0,
    unit_of_measurement VARCHAR(50),
    storage_location VARCHAR(150),
    condition VARCHAR(100),
    is_damaged BOOLEAN DEFAULT FALSE,
    damage_description TEXT,
    is_assigned BOOLEAN DEFAULT FALSE,
    assigned_device_id VARCHAR(100),
    last_inspection_date DATE,
    next_inspection_date DATE
);

-- 4. Procurement Tab Fields
CREATE TABLE IF NOT EXISTS electrical_procurement (
    procurement_id BIGSERIAL PRIMARY KEY,
    part_id BIGINT REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
    supplier_name VARCHAR(150),
    supplier_contact VARCHAR(150),
    purchase_date DATE,
    purchase_order_number VARCHAR(100),
    invoice_number VARCHAR(100),
    purchase_price DECIMAL(15,2),
    warranty_period VARCHAR(100),
    warranty_start_date DATE,
    warranty_end_date DATE,
    warranty_status VARCHAR(100),
    gst_number VARCHAR(100),
    remarks TEXT
);

-- 5. Category Specification Table (Dynamic JSONB)
CREATE TABLE IF NOT EXISTS electrical_category_spec (
    spec_id BIGSERIAL PRIMARY KEY,
    part_id BIGINT REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
    category_name VARCHAR(100),
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 6. Files Master Table
CREATE TABLE IF NOT EXISTS electrical_files (
    file_id BIGSERIAL PRIMARY KEY,
    part_id BIGINT REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
    datasheet_url VARCHAR(255),
    wiring_diagram_url VARCHAR(255),
    installation_manual_url VARCHAR(255),
    test_report_url VARCHAR(255),
    calibration_cert_url VARCHAR(255),
    compliance_cert_url VARCHAR(255),
    warranty_doc_url VARCHAR(255),
    invoice_url VARCHAR(255)
);

-- 7. Images Gallery Table
CREATE TABLE IF NOT EXISTS electrical_images (
    image_id BIGSERIAL PRIMARY KEY,
    part_id BIGINT REFERENCES electrical_part_master(part_id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL
);

COMMIT;
