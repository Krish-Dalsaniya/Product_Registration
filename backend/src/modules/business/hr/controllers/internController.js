const db = require('../../../../config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../../../../config/env');
const { sendEmail } = require('../../../../utils/email');

// --- Intern Management ---

const createIntern = async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.user_id;
        const { 
            first_name, last_name, email, mobile, gender, date_of_birth, 
            joining_date, expected_completion_date, department_id, designation_id, mentor_employee_id, 
            training_batch, education, institute, specialization, status, remarks, image_url,
            password
        } = req.body;

        await client.query('BEGIN');

        // 1. Check if user exists
        const userCheck = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            throw new Error('A user with this email already exists.');
        }

        // 2. Create the User record
        const salt = await bcrypt.genSalt(10);
        const plainPassword = password || 'Welcome@123';
        const hashedPassword = await bcrypt.hash(plainPassword, salt);
        
        // Find Intern role, fallback to User
        let assignedRoleId;
        const internRoleRes = await client.query('SELECT role_id FROM roles WHERE role_name = $1 LIMIT 1', ['Intern']);
        if (internRoleRes.rows.length > 0) {
            assignedRoleId = internRoleRes.rows[0].role_id;
        } else {
            const userRoleRes = await client.query('SELECT role_id FROM roles WHERE role_name = $1 LIMIT 1', ['User']);
            if (userRoleRes.rows.length > 0) {
                assignedRoleId = userRoleRes.rows[0].role_id;
            } else {
                const anyRole = await client.query('SELECT role_id FROM roles ORDER BY role_id DESC LIMIT 1');
                assignedRoleId = anyRole.rows[0]?.role_id || null;
            }
        }

        const userRes = await client.query(`
            INSERT INTO users (full_name, email, password_hash, role_id) 
            VALUES ($1, $2, $3, $4) RETURNING user_id
        `, [`${first_name} ${last_name}`, email, hashedPassword, assignedRoleId]);
        
        const newUserId = userRes.rows[0].user_id;

        // Generate Intern ID similar to Employee ID: CCYYYYMMXX
        // CC = company_code (e.g. 03), defaulting to '00'
        const compCode = (req.body.company_code && req.body.company_code.trim()) 
            ? req.body.company_code.trim().padStart(2, '0').substring(0, 2) 
            : '00';
            
        // Use joining_date or fallback to current date
        const dojDate = joining_date ? new Date(joining_date) : new Date();
        const dojYear = dojDate.getFullYear().toString();
        const dojMonth = (dojDate.getMonth() + 1).toString().padStart(2, '0');
        
        const countRes = await client.query(`
            SELECT COUNT(*) 
            FROM hr_interns 
            WHERE EXTRACT(YEAR FROM joining_date) = $1 
            AND EXTRACT(MONTH FROM joining_date) = $2
        `, [dojDate.getFullYear(), dojDate.getMonth() + 1]);
        
        let nextNum = parseInt(countRes.rows[0].count) + 1;
        let intern_code = `${compCode}${dojYear}${dojMonth}${nextNum.toString().padStart(2, '0')}`;
        let isUnique = false;
        
        while (!isUnique) {
            const checkRes = await client.query('SELECT 1 FROM hr_interns WHERE intern_code = $1', [intern_code]);
            if (checkRes.rows.length === 0) {
                isUnique = true;
            } else {
                nextNum++;
                intern_code = `${compCode}${dojYear}${dojMonth}${nextNum.toString().padStart(2, '0')}`;
            }
        }

        const insertQuery = `
            INSERT INTO hr_interns 
            (intern_code, first_name, last_name, email, mobile, gender, date_of_birth, joining_date, expected_completion_date, department_id, designation_id, mentor_employee_id, training_batch, education, institute, specialization, status, remarks, created_by, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `;
        
        const values = [
            intern_code, first_name, last_name, email, mobile || null, gender || null, date_of_birth || null, 
            joining_date || null, expected_completion_date || null, department_id || null, designation_id || null, mentor_employee_id || null, 
            training_batch || null, education || null, institute || null, specialization || null, 
            status || 'Applied', remarks || null, userId, newUserId
        ];

        const result = await client.query(insertQuery, values);
        let newIntern = result.rows[0];

        // Handle Image Upload
        let finalImageUrl = image_url;
        if (image_url && image_url.startsWith('data:image')) {
            try {
                const matches = image_url.match(/^data:([A-Za-z-+\\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    const filename = `intern_${newIntern.intern_id}_${Date.now()}.jpg`;
                    const uploadDir = path.join(__dirname, '../../../../../uploads');
                    
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    
                    fs.writeFileSync(path.join(uploadDir, filename), buffer);
                    finalImageUrl = `/uploads/${filename}`;
                    
                    // Update db with new image
                    const updateRes = await client.query('UPDATE hr_interns SET image_url = $1 WHERE intern_id = $2 RETURNING *', [finalImageUrl, newIntern.intern_id]);
                    newIntern = updateRes.rows[0];
                }
            } catch (err) {
                console.error('Error saving profile image:', err);
            }
        }

        // Email Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await client.query(
            'INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
            [tokenHash, newUserId, expiresAt]
        );
        
        await client.query(
            'INSERT INTO user_email_verified (user_id, is_verified) VALUES ($1, false) ON CONFLICT (user_id) DO NOTHING',
            [newUserId]
        );

        // Send Welcome Email
        const frontendUrl = env.FRONTEND_URL;
        const loginLink = `${frontendUrl}/login`;
        
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Welcome to Leon's Group Product Registration!</h2>
                <p>Hello ${first_name} ${last_name},</p>
                <p>An administrator has created a Intern account for you.</p>
                <p><strong>Your email:</strong> ${email}</p>
                <p><strong>Your temporary password is:</strong> ${plainPassword}</p>
                <p>Please log in using these credentials. You will be asked to set a permanent password upon your first login.</p>
                <a href="${loginLink}" style="display: inline-block; padding: 10px 20px; background-color: #f06532; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Log In to Your Account</a>
            </div>
        `;
        
        sendEmail({
            to: email,
            subject: "Welcome to Leon's Group - Your Intern Account Details",
            html: emailHtml
        }).catch(err => console.error('Failed to send intern welcome email:', err));

        await client.query('COMMIT');
        
        res.status(201).json({ success: true, data: newIntern });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating intern:', error);
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to create intern', stack: error.stack } });
    } finally {
        client.release();
    }
};

const getInterns = async (req, res) => {
    try {
        const query = `
            SELECT t.*, 
                   d.name as department_name, desig.name as designation_name,
                   m.full_name as mentor_name, m_emp.emp_code as mentor_emp_code
            FROM hr_interns t
            LEFT JOIN hr_departments d ON t.department_id = d.department_id
            LEFT JOIN hr_designations desig ON t.designation_id = desig.designation_id
            LEFT JOIN hr_employees m_emp ON t.mentor_employee_id = m_emp.employee_id
            LEFT JOIN users m ON m_emp.user_id = m.user_id
            ORDER BY t.created_at DESC
        `;
        const result = await db.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching interns:', error);
        res.status(500).json({ success: false, error: { message: error.message, stack: error.stack } });
    }
};

const getInternById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch intern details
        const query = `
            SELECT t.*, 
                   d.name as department_name, desig.name as designation_name,
                   m.full_name as mentor_name, m_emp.emp_code as mentor_emp_code
            FROM hr_interns t
            LEFT JOIN hr_departments d ON t.department_id = d.department_id
            LEFT JOIN hr_designations desig ON t.designation_id = desig.designation_id
            LEFT JOIN hr_employees m_emp ON t.mentor_employee_id = m_emp.employee_id
            LEFT JOIN users m ON m_emp.user_id = m.user_id
            WHERE t.intern_id = $1
        `;
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Intern not found' } });
        }
        
        const intern = result.rows[0];
        
        // Fetch assigned LMS courses for this intern
        const lmsQuery = `
            SELECT a.assignment_id, a.status, a.progress_percentage, a.completed_at, a.due_date, a.retest_requested, a.retest_approved,
                   m.title as module_title, m.training_type, m.difficulty_level, m.duration_hours,
                   (SELECT score FROM hr_lms_assessments WHERE assignment_id = a.assignment_id ORDER BY created_at DESC LIMIT 1) as latest_score,
                   (SELECT COUNT(*) FROM hr_lms_assessments WHERE assignment_id = a.assignment_id) as attempt_count,
                   (SELECT json_agg(score ORDER BY created_at ASC) FROM hr_lms_assessments WHERE assignment_id = a.assignment_id) as scores_history
            FROM hr_lms_assignments a
            JOIN hr_lms_modules m ON a.module_id = m.module_id
            WHERE a.intern_id = $1
            ORDER BY a.created_at DESC
        `;
        const lmsResult = await db.query(lmsQuery, [id]);
        intern.lms_assignments = lmsResult.rows;

        res.json({ success: true, data: intern });
    } catch (error) {
        console.error('Error fetching intern details:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch intern details' } });
    }
};

const updateIntern = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            first_name, last_name, email, mobile, gender, date_of_birth, 
            joining_date, expected_completion_date, department_id, designation_id, mentor_employee_id, 
            training_batch, education, institute, specialization, status, remarks, image_url 
        } = req.body;

        // Handle Image Upload
        let finalImageUrl = image_url;
        if (image_url && image_url.startsWith('data:image')) {
            try {
                const matches = image_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    const filename = `intern_${id}_${Date.now()}.jpg`;
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

        const updateQuery = `
            UPDATE hr_interns 
            SET first_name = $1, last_name = $2, email = $3, mobile = $4, gender = $5, date_of_birth = $6, 
                joining_date = $7, expected_completion_date = $8, department_id = $9, designation_id = $10, mentor_employee_id = $11, 
                training_batch = $12, education = $13, institute = $14, specialization = $15, status = $16, remarks = $17,
                image_url = COALESCE($18, image_url), updated_at = CURRENT_TIMESTAMP
            WHERE intern_id = $19
            RETURNING *
        `;
        
        const values = [
            first_name, last_name, email, mobile || null, gender || null, date_of_birth || null, 
            joining_date || null, expected_completion_date || null, department_id || null, designation_id || null, mentor_employee_id || null, 
            training_batch || null, education || null, institute || null, specialization || null, 
            status || 'Applied', remarks || null, finalImageUrl !== image_url ? finalImageUrl : null, id
        ];

        const result = await db.query(updateQuery, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Intern not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating intern:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update intern' } });
    }
};

const deleteIntern = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteQuery = `DELETE FROM hr_interns WHERE intern_id = $1 RETURNING *`;
        const result = await db.query(deleteQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Intern not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting intern:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete intern' } });
    }
};

const convertToEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Fetch Intern
        const internRes = await db.query('SELECT * FROM hr_interns WHERE intern_id = $1', [id]);
        if (internRes.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Intern not found' } });
        const intern = internRes.rows[0];

        if (intern.status === 'Converted to Employee') {
            return res.status(400).json({ success: false, error: { message: 'Intern has already been converted to an employee.' } });
        }

        const defaultPassword = "Password123!";
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        const userQuery = `
            INSERT INTO users (full_name, email, password_hash, role_id, is_active)
            VALUES ($1, $2, $3, (SELECT role_id FROM roles WHERE role_name = 'Employee' LIMIT 1), true)
            ON CONFLICT (email) DO UPDATE SET is_active = true
            RETURNING user_id
        `;
        const userRes = await db.query(userQuery, [`${intern.first_name} ${intern.last_name}`, intern.email, hashedPassword]);
        const new_user_id = userRes.rows[0].user_id;

        // Generate Employee ID: CCYYYYMMXX for converted employee
        const compCode = '00';
        const dojDate = new Date();
        const dojYear = dojDate.getFullYear().toString();
        const dojMonth = (dojDate.getMonth() + 1).toString().padStart(2, '0');
        
        const countRes = await db.query(`
            SELECT COUNT(*) 
            FROM hr_employees 
            WHERE EXTRACT(YEAR FROM date_of_joining) = $1 
            AND EXTRACT(MONTH FROM date_of_joining) = $2
        `, [dojDate.getFullYear(), dojDate.getMonth() + 1]);
        
        let nextNum = parseInt(countRes.rows[0].count) + 1;
        let empCode = `${compCode}${dojYear}${dojMonth}${nextNum.toString().padStart(2, '0')}`;
        let isUnique = false;
        
        while (!isUnique) {
            const checkRes = await db.query('SELECT 1 FROM hr_employees WHERE emp_code = $1', [empCode]);
            if (checkRes.rows.length === 0) {
                isUnique = true;
            } else {
                nextNum++;
                empCode = `${compCode}${dojYear}${dojMonth}${nextNum.toString().padStart(2, '0')}`;
            }
        }

        // 2. Create hr_employees record
        const empQuery = `
            INSERT INTO hr_employees (user_id, emp_code, department_id, manager_id, date_of_joining, employment_status, base_salary)
            VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Full-Time', 0)
            RETURNING *
        `;
        const empRes = await db.query(empQuery, [
            new_user_id, 
            empCode, 
            intern.department_id, 
            intern.mentor_employee_id
        ]);

        const new_employee_id = empRes.rows[0].employee_id;

        // 3. Update Intern Status
        await db.query("UPDATE hr_interns SET status = 'Converted to Employee', updated_at = CURRENT_TIMESTAMP WHERE intern_id = $1", [id]);

        // 4. (Optional) Transfer LMS assignments from intern_id to employee_id
        await db.query("UPDATE hr_lms_assignments SET employee_id = $1 WHERE intern_id = $2", [new_employee_id, id]);

        res.json({ success: true, message: 'Intern converted to employee successfully', data: empRes.rows[0] });
    } catch (error) {
        console.error('Error converting intern:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to convert intern' } });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_interns,
                COUNT(*) FILTER (WHERE status IN ('Under Training', 'Joined', 'Selected')) as active_interns,
                COUNT(*) FILTER (WHERE status = 'Completed') as completed_training,
                COUNT(*) FILTER (WHERE status = 'Converted to Employee') as converted_to_employees
            FROM hr_interns
        `;
        const result = await db.query(statsQuery);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching intern stats:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch stats' } });
    }
};

// LMS Assignment wrapper for Interns
const assignTrainingToIntern = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { id } = req.params; // intern_id
        const { module_id, due_date } = req.body;

        const insertQuery = `
            INSERT INTO hr_lms_assignments 
            (intern_id, module_id, assigned_date, due_date, status, assigned_by)
            VALUES ($1, $2, CURRENT_DATE, $3, 'Assigned', $4)
            RETURNING *
        `;
        
        const values = [id, module_id, due_date || null, userId];
        const result = await db.query(insertQuery, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error assigning training to intern:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to assign training' } });
    }
};


const convertToTrainee = async (req, res) => {
    try {
        const { id } = req.params;
        const internRes = await client.query('SELECT * FROM hr_interns WHERE intern_id = $1', [id]);
        if (internRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Intern not found' } });
        }
        const intern = internRes.rows[0];

        // Generate trainee code
        const compCode = 'LIPL';
        const doj = new Date();
        const dojYear = doj.getFullYear().toString();
        const dojMonth = (doj.getMonth() + 1).toString().padStart(2, '0');
        const codePrefix = `${compCode}${dojYear}${dojMonth}`;
        
        let nextNum = 1;
        const codeRes = await client.query(
            "SELECT trainee_code FROM hr_trainees WHERE trainee_code LIKE $1 ORDER BY trainee_code DESC LIMIT 1",
            [`${codePrefix}%`]
        );
        if (codeRes.rows.length > 0) {
            const lastCode = codeRes.rows[0].trainee_code;
            const lastNumStr = lastCode.substring(codePrefix.length);
            const lastNum = parseInt(lastNumStr, 10);
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
        const trainee_code = `${codePrefix}${nextNum.toString().padStart(2, '0')}`;

        // Insert into hr_trainees
        const insertRes = await client.query(
            `INSERT INTO hr_trainees 
            (trainee_code, first_name, last_name, email, mobile, gender, date_of_birth, department_id, designation_id, mentor_employee_id, education, institute, specialization, image_url, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Applied')
            RETURNING *`,
            [trainee_code, intern.first_name, intern.last_name, intern.email, intern.mobile, intern.gender, intern.date_of_birth, intern.department_id, intern.designation_id, intern.mentor_employee_id, intern.education, intern.institute, intern.specialization, intern.image_url]
        );

        // Update intern status
        await client.query("UPDATE hr_interns SET status = 'Converted to Trainee' WHERE intern_id = $1", [id]);

        res.status(200).json({ success: true, data: insertRes.rows[0], message: 'Converted to Trainee successfully' });
    } catch (error) {
        console.error('Error converting intern to trainee:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to convert to trainee' } });
    }
};

module.exports = {
    convertToTrainee,
    createIntern,
    getInterns,
    getInternById,
    updateIntern,
    deleteIntern,
    convertToEmployee,
    getDashboardStats,
    assignTrainingToIntern
};
