const db = require('../../../../config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../../../../config/env');
const { sendEmail } = require('../../../../utils/email');

// --- Trainee Management ---

const createTrainee = async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.user_id;
        const { 
            first_name, last_name, email, mobile, gender, date_of_birth, 
            joining_date, expected_completion_date, department_id, mentor_employee_id, 
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
        
        // Find Trainee role, fallback to User
        let assignedRoleId;
        const traineeRoleRes = await client.query('SELECT role_id FROM roles WHERE role_name = $1 LIMIT 1', ['Trainee']);
        if (traineeRoleRes.rows.length > 0) {
            assignedRoleId = traineeRoleRes.rows[0].role_id;
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

        // Generate unique trainee code (e.g., TRN-0001)
        const codeResult = await client.query("SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(trainee_code, '\\D', '', 'g'), '') AS INTEGER)), 0) + 1 AS next_code FROM hr_trainees");
        const nextCode = codeResult.rows[0].next_code;
        const trainee_code = `TRN-${String(nextCode).padStart(4, '0')}`;

        const insertQuery = `
            INSERT INTO hr_trainees 
            (trainee_code, first_name, last_name, email, mobile, gender, date_of_birth, joining_date, expected_completion_date, department_id, mentor_employee_id, training_batch, education, institute, specialization, status, remarks, created_by, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;
        
        const values = [
            trainee_code, first_name, last_name, email, mobile || null, gender || null, date_of_birth || null, 
            joining_date || null, expected_completion_date || null, department_id || null, mentor_employee_id || null, 
            training_batch || null, education || null, institute || null, specialization || null, 
            status || 'Applied', remarks || null, userId, newUserId
        ];

        const result = await client.query(insertQuery, values);
        let newTrainee = result.rows[0];

        // Handle Image Upload
        let finalImageUrl = image_url;
        if (image_url && image_url.startsWith('data:image')) {
            try {
                const matches = image_url.match(/^data:([A-Za-z-+\\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    const filename = `trainee_${newTrainee.trainee_id}_${Date.now()}.jpg`;
                    const uploadDir = path.join(__dirname, '../../../../../uploads');
                    
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    
                    fs.writeFileSync(path.join(uploadDir, filename), buffer);
                    finalImageUrl = `/uploads/${filename}`;
                    
                    // Update db with new image
                    const updateRes = await client.query('UPDATE hr_trainees SET image_url = $1 WHERE trainee_id = $2 RETURNING *', [finalImageUrl, newTrainee.trainee_id]);
                    newTrainee = updateRes.rows[0];
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
                <p>An administrator has created a Trainee account for you.</p>
                <p><strong>Your email:</strong> ${email}</p>
                <p><strong>Your temporary password is:</strong> ${plainPassword}</p>
                <p>Please log in using these credentials. You will be asked to set a permanent password upon your first login.</p>
                <a href="${loginLink}" style="display: inline-block; padding: 10px 20px; background-color: #f06532; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Log In to Your Account</a>
            </div>
        `;
        
        sendEmail({
            to: email,
            subject: "Welcome to Leon's Group - Your Trainee Account Details",
            html: emailHtml
        }).catch(err => console.error('Failed to send trainee welcome email:', err));

        await client.query('COMMIT');
        
        res.status(201).json({ success: true, data: newTrainee });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating trainee:', error);
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to create trainee', stack: error.stack } });
    } finally {
        client.release();
    }
};

const getTrainees = async (req, res) => {
    try {
        const query = `
            SELECT t.*, 
                   d.name as department_name,
                   m.full_name as mentor_name, m_emp.emp_code as mentor_emp_code
            FROM hr_trainees t
            LEFT JOIN hr_departments d ON t.department_id = d.department_id
            LEFT JOIN hr_employees m_emp ON t.mentor_employee_id = m_emp.employee_id
            LEFT JOIN users m ON m_emp.user_id = m.user_id
            ORDER BY t.created_at DESC
        `;
        const result = await db.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching trainees:', error);
        res.status(500).json({ success: false, error: { message: error.message, stack: error.stack } });
    }
};

const getTraineeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch trainee details
        const query = `
            SELECT t.*, 
                   d.name as department_name,
                   m.full_name as mentor_name, m_emp.emp_code as mentor_emp_code
            FROM hr_trainees t
            LEFT JOIN hr_departments d ON t.department_id = d.department_id
            LEFT JOIN hr_employees m_emp ON t.mentor_employee_id = m_emp.employee_id
            LEFT JOIN users m ON m_emp.user_id = m.user_id
            WHERE t.trainee_id = $1
        `;
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Trainee not found' } });
        }
        
        const trainee = result.rows[0];
        
        // Fetch assigned LMS courses for this trainee
        const lmsQuery = `
            SELECT a.assignment_id, a.status, a.progress_percentage, a.completed_at, a.due_date,
                   m.title as module_title, m.training_type, m.difficulty_level, m.duration_hours,
                   (SELECT score FROM hr_lms_assessments WHERE assignment_id = a.assignment_id ORDER BY created_at DESC LIMIT 1) as latest_score
            FROM hr_lms_assignments a
            JOIN hr_lms_modules m ON a.module_id = m.module_id
            WHERE a.trainee_id = $1
            ORDER BY a.created_at DESC
        `;
        const lmsResult = await db.query(lmsQuery, [id]);
        trainee.lms_assignments = lmsResult.rows;

        res.json({ success: true, data: trainee });
    } catch (error) {
        console.error('Error fetching trainee details:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch trainee details' } });
    }
};

const updateTrainee = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            first_name, last_name, email, mobile, gender, date_of_birth, 
            joining_date, expected_completion_date, department_id, mentor_employee_id, 
            training_batch, education, institute, specialization, status, remarks, image_url 
        } = req.body;

        // Handle Image Upload
        let finalImageUrl = image_url;
        if (image_url && image_url.startsWith('data:image')) {
            try {
                const matches = image_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    const filename = `trainee_${id}_${Date.now()}.jpg`;
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
            UPDATE hr_trainees 
            SET first_name = $1, last_name = $2, email = $3, mobile = $4, gender = $5, date_of_birth = $6, 
                joining_date = $7, expected_completion_date = $8, department_id = $9, mentor_employee_id = $10, 
                training_batch = $11, education = $12, institute = $13, specialization = $14, status = $15, remarks = $16,
                image_url = COALESCE($17, image_url), updated_at = CURRENT_TIMESTAMP
            WHERE trainee_id = $18
            RETURNING *
        `;
        
        const values = [
            first_name, last_name, email, mobile || null, gender || null, date_of_birth || null, 
            joining_date || null, expected_completion_date || null, department_id || null, mentor_employee_id || null, 
            training_batch || null, education || null, institute || null, specialization || null, 
            status || 'Applied', remarks || null, finalImageUrl !== image_url ? finalImageUrl : null, id
        ];

        const result = await db.query(updateQuery, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Trainee not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating trainee:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update trainee' } });
    }
};

const deleteTrainee = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteQuery = `DELETE FROM hr_trainees WHERE trainee_id = $1 RETURNING *`;
        const result = await db.query(deleteQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Trainee not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting trainee:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete trainee' } });
    }
};

const convertToEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Fetch Trainee
        const traineeRes = await db.query('SELECT * FROM hr_trainees WHERE trainee_id = $1', [id]);
        if (traineeRes.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Trainee not found' } });
        const trainee = traineeRes.rows[0];

        if (trainee.status === 'Converted to Employee') {
            return res.status(400).json({ success: false, error: { message: 'Trainee has already been converted to an employee.' } });
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
        const userRes = await db.query(userQuery, [`${trainee.first_name} ${trainee.last_name}`, trainee.email, hashedPassword]);
        const new_user_id = userRes.rows[0].user_id;

        // 2. Create hr_employees record
        const empQuery = `
            INSERT INTO hr_employees (user_id, emp_code, department_id, manager_id, date_of_joining, employment_status, base_salary)
            VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Full-Time', 0)
            RETURNING *
        `;
        const empRes = await db.query(empQuery, [
            new_user_id, 
            `EMP-${Math.floor(1000 + Math.random() * 9000)}`, 
            trainee.department_id, 
            trainee.mentor_employee_id
        ]);

        const new_employee_id = empRes.rows[0].employee_id;

        // 3. Update Trainee Status
        await db.query("UPDATE hr_trainees SET status = 'Converted to Employee', updated_at = CURRENT_TIMESTAMP WHERE trainee_id = $1", [id]);

        // 4. (Optional) Transfer LMS assignments from trainee_id to employee_id
        await db.query("UPDATE hr_lms_assignments SET employee_id = $1 WHERE trainee_id = $2", [new_employee_id, id]);

        res.json({ success: true, message: 'Trainee converted to employee successfully', data: empRes.rows[0] });
    } catch (error) {
        console.error('Error converting trainee:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to convert trainee' } });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_trainees,
                COUNT(*) FILTER (WHERE status IN ('Under Training', 'Joined', 'Selected')) as active_trainees,
                COUNT(*) FILTER (WHERE status = 'Completed') as completed_training,
                COUNT(*) FILTER (WHERE status = 'Converted to Employee') as converted_to_employees
            FROM hr_trainees
        `;
        const result = await db.query(statsQuery);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching trainee stats:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch stats' } });
    }
};

// LMS Assignment wrapper for Trainees
const assignTrainingToTrainee = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { id } = req.params; // trainee_id
        const { module_id, due_date } = req.body;

        const insertQuery = `
            INSERT INTO hr_lms_assignments 
            (trainee_id, module_id, assigned_date, due_date, status, assigned_by)
            VALUES ($1, $2, CURRENT_DATE, $3, 'Assigned', $4)
            RETURNING *
        `;
        
        const values = [id, module_id, due_date || null, userId];
        const result = await db.query(insertQuery, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error assigning training to trainee:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to assign training' } });
    }
};

module.exports = {
    createTrainee,
    getTrainees,
    getTraineeById,
    updateTrainee,
    deleteTrainee,
    convertToEmployee,
    getDashboardStats,
    assignTrainingToTrainee
};
