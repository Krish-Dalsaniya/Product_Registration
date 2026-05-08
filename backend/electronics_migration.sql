-- Core table
CREATE TABLE IF NOT EXISTS ELECTRONICS_PART_MASTER (
  part_id          SERIAL PRIMARY KEY,
  part_category    VARCHAR(100),
  part_name        VARCHAR(200) NOT NULL,
  part_number      VARCHAR(100),
  internal_sku     VARCHAR(100),
  manufacturer     VARCHAR(200),
  part_type        VARCHAR(100),
  part_description TEXT,
  used_in_product  VARCHAR(300),
  status           VARCHAR(50) DEFAULT 'Active',
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Technical specs
CREATE TABLE IF NOT EXISTS ELECTRONICS_TECH_SPEC (
  spec_id              SERIAL PRIMARY KEY,
  part_id              INT REFERENCES ELECTRONICS_PART_MASTER(part_id) ON DELETE CASCADE,
  rated_voltage        VARCHAR(100),
  rated_current        VARCHAR(100),
  power_rating         VARCHAR(100),
  input_type           VARCHAR(100),
  output_type          VARCHAR(100),
  connector_type       VARCHAR(100),
  communication_iface  VARCHAR(100),
  mounting_type        VARCHAR(100),
  operating_temp       VARCHAR(100),
  protection_rating    VARCHAR(100),
  dimensions           VARCHAR(100),
  weight               VARCHAR(100)
);

-- Category-specific specs (JSONB for flexibility across 11 categories)
CREATE TABLE IF NOT EXISTS ELECTRONICS_CATEGORY_SPEC (
  cat_spec_id   SERIAL PRIMARY KEY,
  part_id       INT REFERENCES ELECTRONICS_PART_MASTER(part_id) ON DELETE CASCADE,
  category_name VARCHAR(100),
  spec_data     JSONB
);

-- Files
CREATE TABLE IF NOT EXISTS ELECTRONICS_FILES (
  file_id                   SERIAL PRIMARY KEY,
  part_id                   INT REFERENCES ELECTRONICS_PART_MASTER(part_id) ON DELETE CASCADE,
  datasheet_url             VARCHAR(500),
  wiring_diagram_url        VARCHAR(500),
  user_manual_url           VARCHAR(500),
  test_report_url           VARCHAR(500),
  calibration_cert_url      VARCHAR(500),
  warranty_cert_url         VARCHAR(500),
  invoice_url               VARCHAR(500)
);

-- Images (separate table for multi-image gallery)
CREATE TABLE IF NOT EXISTS ELECTRONICS_IMAGES (
  image_id    SERIAL PRIMARY KEY,
  part_id     INT REFERENCES ELECTRONICS_PART_MASTER(part_id) ON DELETE CASCADE,
  image_url   VARCHAR(500)
);
