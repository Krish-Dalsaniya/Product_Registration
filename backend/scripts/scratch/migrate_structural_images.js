const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const sql = `
-- STRUCTURAL_IMAGES
CREATE TABLE IF NOT EXISTS STRUCTURAL_IMAGES (
    image_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function migrate() {
    try {
        console.log("Adding STRUCTURAL_IMAGES table...");
        await pool.query(sql);
        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
