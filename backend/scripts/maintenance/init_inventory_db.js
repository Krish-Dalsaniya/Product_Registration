const db = require('./src/config/db');
const fs = require('fs');
const path = require('path');

const runSchema = async () => {
    try {
        console.log('Reading pcb_schema.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'database/pcb_schema.sql'), 'utf8');
        console.log('Executing schema...');
        await db.query(sql);
        console.log('PCB Schema applied successfully.');

        console.log('Creating additional inventory tables...');
        const extraSql = `
            CREATE TABLE IF NOT EXISTS ELECTRONIC_PART_DETAIL (
                electronic_part_id BIGSERIAL PRIMARY KEY,
                part_no VARCHAR UNIQUE NOT NULL,
                item_name VARCHAR NOT NULL,
                manufacturer VARCHAR,
                stock_qty INT DEFAULT 0,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ELECTRICAL_PART_DETAIL (
                electrical_part_id BIGSERIAL PRIMARY KEY,
                part_no VARCHAR UNIQUE NOT NULL,
                item_name VARCHAR NOT NULL,
                manufacturer VARCHAR,
                stock_qty INT DEFAULT 0,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS STRUCTURAL_COMPONENT_DETAIL (
                structural_component_id BIGSERIAL PRIMARY KEY,
                part_no VARCHAR UNIQUE NOT NULL,
                item_name VARCHAR NOT NULL,
                manufacturer VARCHAR,
                stock_qty INT DEFAULT 0,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- Ensure pcb_name column exists
            ALTER TABLE PCB_MASTER ADD COLUMN IF NOT EXISTS pcb_name VARCHAR;
        `;
        await db.query(extraSql);
        console.log('All inventory tables created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Database Init Failed:', error);
        process.exit(1);
    }
};

runSchema();
