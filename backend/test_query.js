const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const query = `
      SELECT 
        e.employee_id, 
        e.emp_code, 
        e.date_of_joining, 
        e.employment_status, 
        e.work_location,
        e.manager_id,
        u.user_id,
        u.full_name,
        u.email,
        u.image_url,
        e.department_id,
        e.designation_id,
        d.name as department_name,
        ds.name as designation_name,
        e.personal_info,
        e.address_info,
        e.education_info,
        e.emergency_contacts,
        e.job_info,
        e.pay_info,
        e.statutory_info,
        e.identities_info
      FROM hr_employees e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN hr_departments d ON e.department_id = d.department_id
      LEFT JOIN hr_designations ds ON e.designation_id = ds.designation_id
      ORDER BY e.created_at DESC
`;
pool.query(query)
  .then(res => { console.log('Success, rows:', res.rows.length); process.exit(0); })
  .catch(err => { console.error('Error:', err.message); process.exit(1); });
