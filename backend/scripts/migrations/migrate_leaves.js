const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Starting leaves migration...');
    
    // Leave Balances Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL, -- e.g., 'PTO', 'Sick Leave', 'Personal'
        total_days NUMERIC(5,2) DEFAULT 0,
        used_days NUMERIC(5,2) DEFAULT 0,
        year INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, leave_type, year)
      )
    `);

    // Leave Requests Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default balances for existing users for the current year
    const currentYear = new Date().getFullYear();
    const usersRes = await pool.query('SELECT user_id FROM users');
    let seededCount = 0;

    for (const user of usersRes.rows) {
      // Default PTO: 19 days
      await pool.query(`
        INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, year)
        VALUES ($1, 'PTO', 19, 0, $2)
        ON CONFLICT (user_id, leave_type, year) DO NOTHING
      `, [user.user_id, currentYear]);

      // Default Sick Leave: 10 days
      await pool.query(`
        INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, year)
        VALUES ($1, 'Sick Leave', 10, 0, $2)
        ON CONFLICT (user_id, leave_type, year) DO NOTHING
      `, [user.user_id, currentYear]);

      // Default Personal: 3 days
      await pool.query(`
        INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, year)
        VALUES ($1, 'Personal', 3, 0, $2)
        ON CONFLICT (user_id, leave_type, year) DO NOTHING
      `, [user.user_id, currentYear]);

      seededCount++;
    }

    console.log(`Seeded default leave balances for ${seededCount} users for year ${currentYear}.`);
    console.log('Leaves migration completed successfully.');
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('Immediate migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
