-- Product Bill of Material (BOM) Table
-- Run this migration to enable BOM feature on products

CREATE TABLE IF NOT EXISTS product_bom (
    bom_id        SERIAL PRIMARY KEY,
    product_id    INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('pcb', 'electrical', 'electronics', 'structural')),
    component_id  INTEGER NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 1,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_bom_product_id ON product_bom(product_id);
