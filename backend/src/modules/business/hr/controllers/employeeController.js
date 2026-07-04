const db = require('../../../../config/db');
const { sendSuccess, sendError } = require('../../../../utils/response');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../../../../config/env');
const { sendEmail } = require('../../../../utils/email');
const cloudinary = require('../../../../config/cloudinary');

const getEmployees = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        e.employee_id, 
        e.emp_code, 
        e.date_of_joining, 
        e.employment_status, 
        e.work_location,
        e.manager_id,
        e.org_chart_parent_id,
        u.user_id,
        u.full_name,
        u.email,
        u.image_url,
        u.is_active,
        r.role_name,
        COALESCE(uca.has_custom_permissions, false) as has_custom_permissions,
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
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_custom_access uca ON u.user_id = uca.user_id
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
  if (!name) return null;
  
  let check;
  if (deptId) {
    check = await clientOrDb.query('SELECT designation_id FROM hr_designations WHERE name ILIKE $1 AND department_id = $2', [name, deptId]);
  } else {
    check = await clientOrDb.query('SELECT designation_id FROM hr_designations WHERE name ILIKE $1 AND department_id IS NULL', [name]);
  }
  
  if (check.rows.length > 0) return check.rows[0].designation_id;
  
  const res = await clientOrDb.query('INSERT INTO hr_designations (name, department_id) VALUES ($1, $2) RETURNING designation_id', [name, deptId || null]);
  return res.rows[0].designation_id;
};

const executeCreateEmployee = async (client, payload) => {
  const { 
    user_id, role_id,
    full_name, email, password,
    department_id, designation_id, designation_name,
    manager_id,
    date_of_joining, employment_status, base_salary, work_location,
    personal_info, job_info, pay_info, statutory_info, identities_info, address_info, education_info, emergency_contacts, face_embedding, image_url, company_code
  } = payload;

  let finalUserId = user_id;

  if (!finalUserId) {
    const userCheck = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      throw new Error('A user with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const plainPassword = password || 'Welcome@123';
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    let assignedRoleId = role_id;
    if (!assignedRoleId) {
      const roleRes = await client.query('SELECT role_id FROM roles WHERE role_name = $1 LIMIT 1', ['User']);
      if (roleRes.rows.length > 0) {
        assignedRoleId = roleRes.rows[0].role_id;
      } else {
        const insertRole = await client.query('INSERT INTO roles (role_name, description) VALUES ($1, $2) RETURNING role_id', ['User', 'Standard employee role']);
        assignedRoleId = insertRole.rows[0].role_id;
      }
    }

    const userRes = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role_id) 
      VALUES ($1, $2, $3, $4) RETURNING user_id
    `, [full_name, email, hashedPassword, assignedRoleId]);
    
    finalUserId = userRes.rows[0].user_id;

    let finalImageUrl = null;
    if (image_url && image_url.startsWith('data:image')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(image_url, {
          folder: 'users/avatars',
          public_id: `avatar_${finalUserId}_${Date.now()}`
        });
        finalImageUrl = uploadRes.secure_url;
      } catch (err) {
        console.error('Error saving profile image to Cloudinary in createEmployee:', err);
      }
    }

    if (finalImageUrl) {
      await client.query('UPDATE users SET image_url = $1 WHERE user_id = $2', [finalImageUrl, finalUserId]);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
    
    await client.query(
      'INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, finalUserId, expiresAt]
    );
    
    await client.query(
      'INSERT INTO user_email_verified (user_id, is_verified) VALUES ($1, false) ON CONFLICT (user_id) DO NOTHING',
      [finalUserId]
    );

    const frontendUrl = env.FRONTEND_URL;
    const loginLink = `${frontendUrl}/login`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome to Leon's Group Product Registration!</h2>
        <p>Hello ${full_name},</p>
        <p>An administrator has created an employee account for you.</p>
        <p><strong>Your email:</strong> ${email}</p>
        <p><strong>Your temporary password is:</strong> ${plainPassword}</p>
        <p>Please log in using these credentials. You will be asked to set a permanent password upon your first login.</p>
        <a href="${loginLink}" style="display: inline-block; padding: 10px 20px; background-color: #f06532; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Log In to Your Account</a>
      </div>
    `;
    
    sendEmail({
      to: email,
      subject: "Welcome to Leon's Group - Your Employee Account Details",
      html: emailHtml
    }).catch(err => console.error('Failed to send employee welcome email:', err));
  }

  // Generate Employee ID: CCYYYYMMXX
  // CC = company_code (e.g. 03)
  // YYYY = Year of joining
  // MM = Month of joining
  // XX = Serial number of employee onboarded in that month
  
  const compCode = (company_code && company_code.trim()) ? company_code.trim().padStart(2, '0').substring(0,2) : '00';
  
  const dojDate = new Date(date_of_joining);
  const dojYear = dojDate.getFullYear().toString();
  const dojMonth = (dojDate.getMonth() + 1).toString().padStart(2, '0');
  
  const countRes = await client.query(`
    SELECT COUNT(*) 
    FROM hr_employees 
    WHERE EXTRACT(YEAR FROM date_of_joining) = $1 
    AND EXTRACT(MONTH FROM date_of_joining) = $2
  `, [dojDate.getFullYear(), dojDate.getMonth() + 1]);
  
  let nextNum = parseInt(countRes.rows[0].count) + 1;
  let empCode = `${compCode}${dojYear}${dojMonth}${nextNum.toString().padStart(2, '0')}`;
  let isUnique = false;
  
  while (!isUnique) {
    const checkRes = await client.query('SELECT 1 FROM hr_employees WHERE emp_code = $1', [empCode]);
    if (checkRes.rows.length === 0) {
      isUnique = true;
    } else {
      nextNum++;
      empCode = `${compCode}${dojYear}${dojMonth}${nextNum.toString().padStart(2, '0')}`;
    }
  }

  if (!department_id) {
    throw new Error('Department is required.');
  }

  let finalDesignationId = designation_id;
  if (designation_name && !designation_id && designation_name.trim() !== '') {
    finalDesignationId = await getOrInsertDesignation(client, designation_name.trim(), department_id);
  }

  if (!finalDesignationId) {
    throw new Error('Designation is required.');
  }

  const empRes = await client.query(`
    INSERT INTO hr_employees (
      user_id, emp_code, department_id, designation_id, manager_id,
      date_of_joining, employment_status, base_salary, work_location,
      personal_info, address_info, education_info, emergency_contacts, 
      job_info, pay_info, statutory_info, identities_info, face_embedding
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING employee_id
  `, [
    finalUserId, empCode, department_id || null, finalDesignationId, manager_id || null,
    date_of_joining, employment_status, base_salary ? parseFloat(base_salary) : null, work_location,
    personal_info ? JSON.stringify(personal_info) : '{}',
    address_info ? JSON.stringify(address_info) : '{}',
    education_info ? JSON.stringify(education_info) : '[]',
    emergency_contacts ? JSON.stringify(emergency_contacts) : '[]',
    job_info ? JSON.stringify(job_info) : '{}',
    pay_info ? JSON.stringify(pay_info) : '{}',
    statutory_info ? JSON.stringify(statutory_info) : '{}',
    identities_info ? JSON.stringify(identities_info) : '{}',
    face_embedding ? JSON.stringify(face_embedding) : null
  ]);

  return empRes.rows[0].employee_id;
};

const createEmployee = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const employee_id = await executeCreateEmployee(client, req.body);
    await client.query('COMMIT');
    sendSuccess(res, { employee_id }, 'Employee created successfully', 201);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'A user with this email already exists.') {
       return res.status(400).json({ success: false, error: { message: error.message } });
    }
    next(error);
  } finally {
    client.release();
  }
};

const registerEmployee = async (req, res, next) => {
  try {
    const { full_name, email } = req.body;
    if (!full_name || !email) {
      return sendError(res, 'BAD_REQUEST', 'Full name and email are required', 400);
    }
    
    const hasDesignation = (req.body.designation_name && req.body.designation_name.trim() !== '') || req.body.designation_id;
    if (!hasDesignation || !req.body.department_id) {
      return sendError(res, 'BAD_REQUEST', 'Department and Designation are required', 400);
    }
    
    // Check if user already exists
    const userCheck = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return sendError(res, 'BAD_REQUEST', 'A user with this email already exists in the system.', 400);
    }

    const payload = JSON.stringify(req.body);
    await db.query(`
      INSERT INTO hr_pending_registrations (full_name, email, payload, status)
      VALUES ($1, $2, $3, 'pending')
    `, [full_name, email, payload]);

    sendSuccess(res, null, 'Registration submitted successfully. Waiting for admin approval.', 201);
  } catch (error) {
    next(error);
  }
};

const getPendingRegistrations = async (req, res, next) => {
  try {
    const query = `
      SELECT id, full_name, email, status, created_at, payload
      FROM hr_pending_registrations
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    sendSuccess(res, result.rows, 'Pending registrations fetched successfully');
  } catch (error) {
    next(error);
  }
};

const approveRegistration = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    const recordCheck = await client.query('SELECT * FROM hr_pending_registrations WHERE id = $1 AND status = $2 FOR UPDATE', [id, 'pending']);
    if (recordCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'NOT_FOUND', 'Pending registration not found or already processed.', 404);
    }

    const registration = recordCheck.rows[0];
    const payload = registration.payload;

    const employee_id = await executeCreateEmployee(client, payload);
    
    await client.query('UPDATE hr_pending_registrations SET status = $1 WHERE id = $2', ['approved', id]);
    
    await client.query('COMMIT');
    
    // Optionally send an approval email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Registration Approved!</h2>
        <p>Hello ${registration.full_name},</p>
        <p>Your registration for Leon's Group Product Registration has been approved.</p>
        <p>You can now log in using the email and password you provided during registration.</p>
        <a href="${env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #f06532; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Log In Now</a>
      </div>
    `;
    
    sendEmail({
      to: registration.email,
      subject: "Registration Approved - Welcome to Leon's Group",
      html: emailHtml
    }).catch(err => console.error('Failed to send approval email:', err));

    sendSuccess(res, { employee_id }, 'Registration approved and employee created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'A user with this email already exists.') {
       return res.status(400).json({ success: false, error: { message: error.message } });
    }
    next(error);
  } finally {
    client.release();
  }
};

const rejectRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('UPDATE hr_pending_registrations SET status = $1 WHERE id = $2 AND status = $3 RETURNING *', ['rejected', id, 'pending']);
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Pending registration not found or already processed.', 404);
    }
    
    const registration = result.rows[0];
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Registration Status Update</h2>
        <p>Hello ${registration.full_name},</p>
        <p>We regret to inform you that your registration request for Leon's Group Product Registration has been rejected by the administration.</p>
        <p>If you believe this was an error, please contact support.</p>
      </div>
    `;
    
    sendEmail({
      to: registration.email,
      subject: "Registration Update - Leon's Group",
      html: emailHtml
    }).catch(err => console.error('Failed to send rejection email:', err));
    
    sendSuccess(res, null, 'Registration rejected successfully.');
  } catch (error) {
    next(error);
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
      department_id, designation_id, designation_name, manager_id,
      date_of_joining, employment_status, base_salary, work_location,
      personal_info, address_info, education_info, emergency_contacts,
      job_info, pay_info, statutory_info, identities_info, image_url, face_embedding
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
        manager_id = $15,
        face_embedding = COALESCE($16, face_embedding),
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $17
      RETURNING *
    `;
    
    let finalDesignationId = designation_id;
    if (designation_name && !designation_id) {
      finalDesignationId = await getOrInsertDesignation(db, designation_name, department_id || null);
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
      manager_id || null,
      face_embedding ? JSON.stringify(face_embedding) : null,
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
        const uploadRes = await cloudinary.uploader.upload(image_url, {
          folder: 'users/avatars',
          public_id: `avatar_${id}_${Date.now()}`
        });
        finalImageUrl = uploadRes.secure_url;
      } catch (err) {
        console.error('Error saving profile image to Cloudinary in updateEmployee:', err);
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

const getEmployeeHierarchy = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        e.employee_id, 
        e.manager_id,
        e.emp_code,
        u.full_name as name,
        ds.name as designation_name,
        u.image_url
      FROM hr_employees e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN hr_designations ds ON e.designation_id = ds.designation_id
      WHERE e.employment_status != 'Terminated'
    `;
    const result = await db.query(query);
    sendSuccess(res, result.rows, 'Employee hierarchy fetched successfully');
  } catch (error) {
    next(error);
  }
};

const updateOrgChartPlacements = async (req, res, next) => {
  const { placements } = req.body;
  if (!placements || typeof placements !== 'object') {
    return sendError(res, 'Invalid placements data', 400);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // First, clear all org_chart_parent_id to avoid constraint issues and remove unassigned ones
    await client.query('UPDATE hr_employees SET org_chart_parent_id = NULL');

    // Update each placed employee
    for (const [employeeId, config] of Object.entries(placements)) {
      if (config.parentId) {
        await client.query(
          'UPDATE hr_employees SET org_chart_parent_id = $1 WHERE employee_id = $2',
          [config.parentId, employeeId]
        );
      }
    }

    await client.query('COMMIT');
    sendSuccess(res, null, 'Organization chart placements saved successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const getOrgProfiles = async (req, res, next) => {
  try {
    const query = `
      SELECT d.*, dept.name as department_name,
        (SELECT COUNT(*) FROM hr_employees e WHERE e.designation_id = d.designation_id) as employee_count
      FROM hr_designations d
      LEFT JOIN hr_departments dept ON d.department_id = dept.department_id
    `;
    const result = await db.query(query);
    sendSuccess(res, result.rows, 'Profiles fetched successfully');
  } catch (error) {
    next(error);
  }
};

const createOrgProfile = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { name, department_id, parent_id, child_id, job_description, perks } = req.body;
    if (!name) return sendError(res, 'Profile Name is required', 400);

    await client.query('BEGIN');
    
    // Create the new designation
    const insertRes = await client.query(
      `INSERT INTO hr_designations (name, department_id, parent_id, job_description, perks) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, department_id || null, parent_id || null, job_description, perks]
    );
    
    const newProfile = insertRes.rows[0];

    // If 'child_id' is provided (above which profile), update the child's parent_id
    if (child_id) {
      await client.query(
        'UPDATE hr_designations SET parent_id = $1 WHERE designation_id = $2',
        [newProfile.designation_id, child_id]
      );
    }

    await client.query('COMMIT');
    sendSuccess(res, newProfile, 'Profile created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateOrgProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, department_id, parent_id, job_description, perks,
      pre_requisites, training_requirements, eligibility_criteria, kpi, kra,
      rcd_base64 
    } = req.body;
    
    let rcd_document_url = undefined;
    if (rcd_base64 && rcd_base64.startsWith('data:')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(rcd_base64, {
          folder: 'hr/rcd',
          public_id: `rcd_${id}_${Date.now()}`,
          resource_type: 'auto'
        });
        rcd_document_url = uploadRes.secure_url;
      } catch (err) {
        console.error('Error saving RCD to Cloudinary in updateOrgProfile:', err);
      }
    }

    const query = `
      UPDATE hr_designations
      SET name = COALESCE($1, name),
          department_id = COALESCE($2, department_id),
          parent_id = CASE WHEN $13::boolean THEN $3 ELSE parent_id END,
          job_description = COALESCE($4, job_description),
          perks = COALESCE($5, perks),
          pre_requisites = COALESCE($6, pre_requisites),
          training_requirements = COALESCE($7, training_requirements),
          eligibility_criteria = COALESCE($8, eligibility_criteria),
          kpi = COALESCE($9, kpi),
          kra = COALESCE($10, kra),
          rcd_document_url = COALESCE($11, rcd_document_url)
      WHERE designation_id = $12
      RETURNING *
    `;
    
    const values = [
      name, department_id, parent_id, job_description, perks,
      pre_requisites, training_requirements, eligibility_criteria, kpi, kra,
      rcd_document_url, id, 'parent_id' in req.body
    ];
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) return sendError(res, 'Profile not found', 404);
    
    sendSuccess(res, result.rows[0], 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteOrgProfile = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');

    // To prevent breaking the tree, reassign children of the deleted node to its parent
    const nodeRes = await client.query('SELECT parent_id FROM hr_designations WHERE designation_id = $1', [id]);
    if (nodeRes.rows.length === 0) {
       await client.query('ROLLBACK');
       return sendError(res, 'Profile not found', 404);
    }
    
    const parentId = nodeRes.rows[0].parent_id;
    await client.query('UPDATE hr_designations SET parent_id = $1 WHERE parent_id = $2', [parentId, id]);

    // Finally delete the profile
    await client.query('DELETE FROM hr_designations WHERE designation_id = $1', [id]);
    
    await client.query('COMMIT');
    sendSuccess(res, null, 'Profile deleted successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartmentsAndDesignations,
  updateEmployeeRole,
  getEmployeeHierarchy,
  registerEmployee,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  updateOrgChartPlacements,
  getOrgProfiles,
  createOrgProfile,
  updateOrgProfile,
  deleteOrgProfile
};
