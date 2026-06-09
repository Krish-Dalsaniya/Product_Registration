-- Finished Goods Schema

CREATE TABLE IF NOT EXISTS finished_goods (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    is_iot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finished_goods_hardware (
    id SERIAL PRIMARY KEY,
    finished_good_id INT REFERENCES finished_goods(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL, -- 'pcb', 'electrical', 'electronics', 'structural'
    component_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finished_goods_software (
    id SERIAL PRIMARY KEY,
    finished_good_id INT REFERENCES finished_goods(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finished_goods_serials (
    id SERIAL PRIMARY KEY,
    finished_good_id INT REFERENCES finished_goods(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_finished_goods_product_id ON finished_goods(product_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_hardware_fg_id ON finished_goods_hardware(finished_good_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_software_fg_id ON finished_goods_software(finished_good_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_serials_fg_id ON finished_goods_serials(finished_good_id);
