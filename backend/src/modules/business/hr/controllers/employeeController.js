const db = require('../../../../config/db');
const { sendSuccess, sendError } = require('../../../../utils/response');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const getEmployees = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        e.employee_id, 
        e.emp_code, 
        e.date_of_joining, 
        e.employment_status, 
        e.work_location,
        u.user_id,
        u.full_name,
        u.email,
        u.image_url,
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
    const result = await db.query(query);
    sendSuccess(res, result.rows, 'Employees fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getDepartmentsAndDesignations = async (req, res, next) => {
  try {
    const depts = await db.query('SELECT * FROM hr_departments ORDER BY name');
    const desigs = await db.query('SELECT * FROM hr_designations ORDER BY name');
    const availableUsers = await db.query(`
      SELECT user_id, full_name, email 
      FROM users 
      WHERE is_active = true AND user_id NOT IN (SELECT user_id FROM hr_employees WHERE user_id IS NOT NULL)
      ORDER BY full_name
    `);
    
    sendSuccess(res, { 
      departments: depts.rows, 
      designations: desigs.rows,
      available_users: availableUsers.rows 
    }, 'Fetched metadata successfully');
  } catch (error) {
    next(error);
  }
};

const getOrInsertDesignation = async (clientOrDb, name, deptId) => {
  if (!name || !deptId) return null;
  const check = await clientOrDb.query('SELECT designation_id FROM hr_designations WHERE name ILIKE $1 AND department_id = $2', [name, deptId]);
  if (check.rows.length > 0) return check.rows[0].designation_id;
  const res = await clientOrDb.query('INSERT INTO hr_designations (name, department_id) VALUES ($1, $2) RETURNING designation_id', [name, deptId]);
  return res.rows[0].designation_id;
};

const createEmployee = async (req, res, next) => {
  const client = await db.pool.connect(); // Assuming db exposes the pool
  try {
    const { 
      user_id, role_id, // New optional field to link existing user and assign role
      full_name, email,
      department_id, designation_id, designation_name,
      date_of_joining, employment_status, base_salary, work_location,
      personal_info, job_info, pay_info, statutory_info, identities_info
    } = req.body;

    // Start transaction
    await client.query('BEGIN');

    let finalUserId = user_id;

    // If no existing user selected, create a new one
    if (!finalUserId) {
      // 1. Check if user already exists
      const userCheck = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        throw new Error('A user with this email already exists.');
      }

      // 2. Create the User record (with default password)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Welcome@123', salt);
      
      let assignedRoleId = role_id;
      if (!assignedRoleId) {
        const roleRes = await client.query('SELECT role_id FROM roles WHERE role_name = $1 LIMIT 1', ['User']);
        assignedRoleId = roleRes.rows[0]?.role_id || null;
      }

      const userRes = await client.query(`
        INSERT INTO users (full_name, email, password_hash, role_id) 
        VALUES ($1, $2, $3, $4) RETURNING user_id
      `, [full_name, email, hashedPassword, assignedRoleId]);
      
      finalUserId = userRes.rows[0].user_id;
    }

    // 3. Generate EMP Code (e.g., EMP-001)
    const countRes = await client.query('SELECT COUNT(*) FROM hr_employees');
    const nextNum = parseInt(countRes.rows[0].count) + 1;
    const empCode = `EMP-${nextNum.toString().padStart(3, '0')}`;

    let finalDesignationId = designation_id;
    if (designation_name && department_id && !designation_id) {
      finalDesignationId = await getOrInsertDesignation(client, designation_name, department_id);
    }

    // 4. Create the HR Employee record
    const empRes = await client.query(`
      INSERT INTO hr_employees (
        user_id, emp_code, department_id, designation_id, 
        date_of_joining, employment_status, base_salary, work_location,
        personal_info, job_info, pay_info, statutory_info, identities_info
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING employee_id
    `, [
      finalUserId, empCode, department_id, finalDesignationId, 
      date_of_joining, employment_status, base_salary ? parseFloat(base_salary) : null, work_location,
      personal_info ? JSON.stringify(personal_info) : '{}',
      job_info ? JSON.stringify(job_info) : '{}',
      pay_info ? JSON.stringify(pay_info) : '{}',
      statutory_info ? JSON.stringify(statutory_info) : '{}',
      identities_info ? JSON.stringify(identities_info) : '{}'
    ]);

    await client.query('COMMIT');
    sendSuccess(res, { employee_id: empRes.rows[0].employee_id }, 'Employee created successfully', 201);
  } catch (error) {
    await client.query('ROLLBACK');
    // If it's our custom error, send standard error format
    if (error.message === 'A user with this email already exists.') {
       return res.status(400).json({ success: false, error: { message: error.message } });
    }
    next(error);
  } finally {
    client.release();
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        e.*,
        u.full_name,
        u.email,
        u.image_url,
        u.role_id,
        d.name as department_name,
        ds.name as designation_name
      FROM hr_employees e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN hr_departments d ON e.department_id = d.department_id
      LEFT JOIN hr_designations ds ON e.designation_id = ds.designation_id
      WHERE e.employee_id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Employee not found', 404);
    }
    sendSuccess(res, result.rows[0], 'Employee fetched successfully');
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      department_id, designation_id, designation_name,
      date_of_joining, employment_status, base_salary, work_location,
      personal_info, address_info, education_info, emergency_contacts,
      job_info, pay_info, statutory_info, identities_info, image_url
    } = req.body;

    const query = `
      UPDATE hr_employees
      SET 
        department_id = COALESCE($1, department_id),
        designation_id = COALESCE($2, designation_id),
        date_of_joining = COALESCE($3, date_of_joining),
        employment_status = COALESCE($4, employment_status),
        base_salary = COALESCE($5, base_salary),
        work_location = COALESCE($6, work_location),
        personal_info = COALESCE($7, personal_info),
        address_info = COALESCE($8, address_info),
        education_info = COALESCE($9, education_info),
        emergency_contacts = COALESCE($10, emergency_contacts),
        job_info = COALESCE($11, job_info),
        pay_info = COALESCE($12, pay_info),
        statutory_info = COALESCE($13, statutory_info),
        identities_info = COALESCE($14, identities_info),
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $15
      RETURNING *
    `;
    
    let finalDesignationId = designation_id;
    if (designation_name && department_id && !designation_id) {
      finalDesignationId = await getOrInsertDesignation(db, designation_name, department_id);
    }

    const values = [
      department_id,
      finalDesignationId,
      date_of_joining,
      employment_status,
      base_salary ? parseFloat(base_salary) : null,
      work_location,
      personal_info ? JSON.stringify(personal_info) : null,
      address_info ? JSON.stringify(address_info) : null,
      education_info ? JSON.stringify(education_info) : null,
      emergency_contacts ? JSON.stringify(emergency_contacts) : null,
      job_info ? JSON.stringify(job_info) : null,
      pay_info ? JSON.stringify(pay_info) : null,
      statutory_info ? JSON.stringify(statutory_info) : null,
      identities_info ? JSON.stringify(identities_info) : null,
      id
    ];

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Employee not found', 404);
    }
    
    // Handle Base64 image upload
    let finalImageUrl = image_url;
    if (image_url && image_url.startsWith('data:image')) {
      try {
        const matches = image_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `avatar_${id}_${Date.now()}.jpg`;
          // Go up 5 levels: hr/business/modules/src/backend -> /uploads
          const uploadDir = path.join(__dirname, '../../../../../uploads');
          
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          fs.writeFileSync(path.join(uploadDir, filename), buffer);
          finalImageUrl = `/uploads/${filename}`;
        }
      } catch (err) {
        console.error('Error saving profile image:', err);
      }
    }

    // If image_url is provided, update the users table since image_url belongs to the user
    if (finalImageUrl) {
      const userId = result.rows[0].user_id;
      await db.query(`UPDATE users SET image_url = $1 WHERE user_id = $2`, [finalImageUrl, userId]);
      
      // Add it to the result so the frontend gets the updated URL immediately
      result.rows[0].image_url = finalImageUrl;
    }

    sendSuccess(res, result.rows[0], 'Employee updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM hr_employees WHERE employee_id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateEmployeeRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;

    if (!role_id) {
      return sendError(res, 'BAD_REQUEST', 'role_id is required', 400);
    }

    // Find the user_id for this employee
    const empRes = await db.query('SELECT user_id FROM hr_employees WHERE employee_id = $1', [id]);
    if (empRes.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Employee not found', 404);
    }

    const userId = empRes.rows[0].user_id;
    if (!userId) {
      return sendError(res, 'BAD_REQUEST', 'This employee is not linked to a user account', 400);
    }

    // Update the role in the users table
    await db.query('UPDATE users SET role_id = $1 WHERE user_id = $2', [role_id, userId]);
    
    // Clear any custom access override so the user strictly inherits the new role's permissions
    await db.query('UPDATE user_custom_access SET has_custom_permissions = false WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);

    sendSuccess(res, null, 'Employee system role updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartmentsAndDesignations,
  updateEmployeeRole
};
