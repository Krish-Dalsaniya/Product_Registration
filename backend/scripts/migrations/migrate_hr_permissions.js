const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

const permissionsToInsert = [
  // Dashboard & Organogram
  { key: 'hr.dashboard.view', desc: 'View HR Dashboard' },
  { key: 'hr.organogram.view', desc: 'View HR Organogram' },
  
  // Base HR
  { key: 'hr.recruitment.view', desc: 'View Recruitment' },
  { key: 'hr.recruitment.create', desc: 'Create Recruitment' },
  { key: 'hr.recruitment.edit', desc: 'Edit Recruitment' },
  { key: 'hr.recruitment.delete', desc: 'Delete Recruitment' },

  { key: 'hr.onboarding.view', desc: 'View Onboarding' },
  { key: 'hr.onboarding.create', desc: 'Create Onboarding' },
  { key: 'hr.onboarding.edit', desc: 'Edit Onboarding' },
  { key: 'hr.onboarding.delete', desc: 'Delete Onboarding' },

  { key: 'hr.offboarding.view', desc: 'View Offboarding' },
  { key: 'hr.offboarding.create', desc: 'Create Offboarding' },
  { key: 'hr.offboarding.edit', desc: 'Edit Offboarding' },
  { key: 'hr.offboarding.delete', desc: 'Delete Offboarding' },

  { key: 'hr.trainee.view', desc: 'View Trainees' },
  { key: 'hr.trainee.create', desc: 'Create Trainees' },
  { key: 'hr.trainee.edit', desc: 'Edit Trainees' },
  { key: 'hr.trainee.delete', desc: 'Delete Trainees' },

  { key: 'hr.employees.view', desc: 'View Employees' },
  { key: 'hr.employees.create', desc: 'Create Employees' },
  { key: 'hr.employees.edit', desc: 'Edit Employees' },
  { key: 'hr.employees.delete', desc: 'Delete Employees' },

  // Payrolls
  { key: 'hr.payrolls_leaves.view', desc: 'View Leaves' },
  { key: 'hr.payrolls_leaves.create', desc: 'Create Leaves' },
  { key: 'hr.payrolls_leaves.edit', desc: 'Edit Leaves' },
  { key: 'hr.payrolls_leaves.delete', desc: 'Delete Leaves' },

  { key: 'hr.payrolls_holiday.view', desc: 'View Holidays (Roaster)' },
  { key: 'hr.payrolls_holiday.create', desc: 'Create Holidays (Roaster)' },
  { key: 'hr.payrolls_holiday.edit', desc: 'Edit Holidays (Roaster)' },
  { key: 'hr.payrolls_holiday.delete', desc: 'Delete Holidays (Roaster)' },

  { key: 'hr.payrolls_attendance.view', desc: 'View Attendance' },
  { key: 'hr.payrolls_attendance.create', desc: 'Create Attendance' },
  { key: 'hr.payrolls_attendance.edit', desc: 'Edit Attendance' },
  { key: 'hr.payrolls_attendance.delete', desc: 'Delete Attendance' },

  // PMS
  { key: 'hr.pms_closure.view', desc: 'View PMS Closure' },
  { key: 'hr.pms_closure.create', desc: 'Create PMS Closure' },
  { key: 'hr.pms_closure.edit', desc: 'Edit PMS Closure' },
  { key: 'hr.pms_closure.delete', desc: 'Delete PMS Closure' },

  { key: 'hr.pms_projects.view', desc: 'View PMS Projects' },
  { key: 'hr.pms_projects.create', desc: 'Create PMS Projects' },
  { key: 'hr.pms_projects.edit', desc: 'Edit PMS Projects' },
  { key: 'hr.pms_projects.delete', desc: 'Delete PMS Projects' },

  { key: 'hr.pms_teams.view', desc: 'View PMS Teams' },
  { key: 'hr.pms_teams.create', desc: 'Create PMS Teams' },
  { key: 'hr.pms_teams.edit', desc: 'Edit PMS Teams' },
  { key: 'hr.pms_teams.delete', desc: 'Delete PMS Teams' },

  { key: 'hr.pms_tasks.view', desc: 'View PMS Tasks' },
  { key: 'hr.pms_tasks.create', desc: 'Create PMS Tasks' },
  { key: 'hr.pms_tasks.edit', desc: 'Edit PMS Tasks' },
  { key: 'hr.pms_tasks.delete', desc: 'Delete PMS Tasks' },

  { key: 'hr.pms_scrums.view', desc: 'View PMS Scrums' },
  { key: 'hr.pms_scrums.create', desc: 'Create PMS Scrums' },
  { key: 'hr.pms_scrums.edit', desc: 'Edit PMS Scrums' },
  { key: 'hr.pms_scrums.delete', desc: 'Delete PMS Scrums' },

  // LMS
  { key: 'hr.lms.view', desc: 'View LMS' },
  { key: 'hr.lms.create', desc: 'Create LMS' },
  { key: 'hr.lms.edit', desc: 'Edit LMS' },
  { key: 'hr.lms.delete', desc: 'Delete LMS' }
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const perm of permissionsToInsert) {
      await client.query(`
        INSERT INTO permissions (permission_key, description) 
        VALUES ($1, $2)
        ON CONFLICT (permission_key) DO UPDATE SET description = EXCLUDED.description
      `, [perm.key, perm.desc]);
    }

    await client.query('COMMIT');
    console.log('Successfully inserted HR permissions!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
