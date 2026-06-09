-- 1. PCB Type Master
CREATE TABLE IF NOT EXISTS PCB_TYPE_MASTER (
    pcb_type_id BIGSERIAL PRIMARY KEY,
    type_name VARCHAR UNIQUE NOT NULL,
    type_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. PCB Master
CREATE TABLE IF NOT EXISTS PCB_MASTER (
    pcb_id BIGSERIAL PRIMARY KEY,
    pcb_type_id BIGINT REFERENCES PCB_TYPE_MASTER(pcb_type_id),
    part_no VARCHAR UNIQUE NOT NULL,
    requires_firmware BOOLEAN DEFAULT FALSE,
    processor_count INT DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. PCB Files
CREATE TABLE IF NOT EXISTS PCB_FILE_MASTER (
    pcb_file_id BIGSERIAL PRIMARY KEY,
    pcb_id BIGINT REFERENCES PCB_MASTER(pcb_id),
    processor_file_url TEXT,
    brd_file_url TEXT,
    sch_file_url TEXT,
    bom_file_url TEXT,
    stencil_file_url TEXT,
    panel_gerber_file_url TEXT,
    layer_stacking_file_url TEXT,
    production_instruction_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Processor Master
CREATE TABLE IF NOT EXISTS PROCESSOR_MASTER (
    processor_id BIGSERIAL PRIMARY KEY,
    processor_type VARCHAR NOT NULL,
    part_no VARCHAR UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Firmware Branches
CREATE TABLE IF NOT EXISTS FIRMWARE_MASTER (
    firmware_master_id BIGSERIAL PRIMARY KEY,
    processor_id BIGINT REFERENCES PROCESSOR_MASTER(processor_id),
    firmware_branch_name VARCHAR NOT NULL,
    current_firmware_version VARCHAR,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Firmware Versions
CREATE TABLE IF NOT EXISTS FIRMWARE_VERSION_MASTER (
    firmware_version_id BIGSERIAL PRIMARY KEY,
    firmware_master_id BIGINT REFERENCES FIRMWARE_MASTER(firmware_master_id),
    firmware_version VARCHAR NOT NULL,
    release_date DATE,
    firmware_file_url TEXT,
    checksum VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Firmware Features
CREATE TABLE IF NOT EXISTS FIRMWARE_FEATURE_MASTER (
    firmware_feature_id BIGSERIAL PRIMARY KEY,
    firmware_master_id BIGINT REFERENCES FIRMWARE_MASTER(firmware_master_id),
    feature_name VARCHAR NOT NULL,
    feature_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. PCB to Firmware Mapping
CREATE TABLE IF NOT EXISTS PCB_FIRMWARE_MAPPING (
    pcb_firmware_mapping_id BIGSERIAL PRIMARY KEY,
    pcb_id BIGINT REFERENCES PCB_MASTER(pcb_id),
    processor_id BIGINT REFERENCES PROCESSOR_MASTER(processor_id),
    firmware_master_id BIGINT REFERENCES FIRMWARE_MASTER(firmware_master_id),
    firmware_version_id BIGINT REFERENCES FIRMWARE_VERSION_MASTER(firmware_version_id),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Product Versions
CREATE TABLE IF NOT EXISTS PRODUCT_VERSION_MASTER (
    product_version_id BIGSERIAL PRIMARY KEY,
    product_id INT REFERENCES PRODUCTS(product_id),
    version_no VARCHAR NOT NULL,
    version_name VARCHAR,
    version_description TEXT,
    release_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. PCB to Product Mapping
CREATE TABLE IF NOT EXISTS PCB_PRODUCT_MAPPING (
    pcb_product_mapping_id BIGSERIAL PRIMARY KEY,
    pcb_id BIGINT REFERENCES PCB_MASTER(pcb_id),
    product_id INT REFERENCES PRODUCTS(product_id),
    product_version_id BIGINT REFERENCES PRODUCT_VERSION_MASTER(product_version_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
