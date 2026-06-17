const db = require('./src/config/db');

const createTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS hr_attendance (
        attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
        date DATE NOT NULL,
        clock_in TIMESTAMP,
        clock_out TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Present',
        work_hours NUMERIC(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      );
    `);
    console.log('Table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
};

createTable();
