const db = require('../../../../config/db');
const html_to_pdf = require('html-pdf-node');
const fs = require('fs');
const path = require('path');
const { getCertificateHtml } = require('../../../../utils/certificateTemplate');
const bcrypt = require('bcryptjs');

const getPendingConversions = async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   COALESCE(i.first_name, t.first_name) as first_name,
                   COALESCE(i.last_name, t.last_name) as last_name,
                   COALESCE(i.email, t.email) as email,
                   COALESCE(i.intern_code, t.trainee_code) as code,
                   u.full_name as requested_by_name
            FROM hr_conversion_requests c
            LEFT JOIN hr_interns i ON c.intern_id = i.intern_id
            LEFT JOIN hr_trainees t ON c.trainee_id = t.trainee_id
            LEFT JOIN users u ON c.requested_by = u.user_id
            WHERE c.status = 'Pending'
            ORDER BY c.created_at DESC
        `;
        const result = await db.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching pending conversions:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch pending conversions' } });
    }
};

const generateCertificate = async (name, prevRole, targetRole, requestId) => {
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const htmlContent = getCertificateHtml(name, prevRole, targetRole, dateStr);
    
    const options = { format: 'A4', landscape: true, printBackground: true };
    const file = { content: htmlContent };
    
    const uploadDir = path.join(__dirname, '../../../../../../uploads/certificates');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filename = `certificate_${requestId}_${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, filename);
    
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);
    fs.writeFileSync(filePath, pdfBuffer);
    
    return `/uploads/certificates/${filename}`;
};

const approveConversion = async (req, res) => {
    try {
        const { id } = req.params; // request_id
        const userId = req.user.user_id;

        const requestRes = await db.query('SELECT * FROM hr_conversion_requests WHERE request_id = $1', [id]);
        if (requestRes.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Request not found' } });
        const request = requestRes.rows[0];

        if (request.status !== 'Pending') {
            return res.status(400).json({ success: false, error: { message: `Request is already ${request.status}` } });
        }

        let name = '';
        let prevRole = '';
        let certificateUrl = '';

        // Handle Intern -> Trainee
        if (request.intern_id && request.target_role === 'Trainee') {
            const internRes = await db.query('SELECT * FROM hr_interns WHERE intern_id = $1', [request.intern_id]);
            const intern = internRes.rows[0];
            name = `${intern.first_name} ${intern.last_name}`;
            prevRole = 'Intern';

            // Generate trainee code
            const compCode = 'LIPL';
            const doj = new Date();
            const dojYear = doj.getFullYear().toString();
            const dojMonth = (doj.getMonth() + 1).toString().padStart(2, '0');
            const codePrefix = `${compCode}${dojYear}${dojMonth}`;
            
            let nextNum = 1;
            const codeRes = await db.query(
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
            await db.query(
                `INSERT INTO hr_trainees 
                (trainee_code, first_name, last_name, email, mobile, gender, date_of_birth, department_id, designation_id, mentor_employee_id, education, institute, specialization, image_url, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Applied')
                RETURNING *`,
                [trainee_code, intern.first_name, intern.last_name, intern.email, intern.mobile, intern.gender, intern.date_of_birth, intern.department_id, intern.designation_id, intern.mentor_employee_id, intern.education, intern.institute, intern.specialization, intern.image_url]
            );

            // Update intern status
            await db.query("UPDATE hr_interns SET status = 'Converted to Trainee' WHERE intern_id = $1", [request.intern_id]);
            
            certificateUrl = await generateCertificate(name, prevRole, request.target_role, id);
        } 
        // Handle Intern -> Employee OR Trainee -> Employee
        else if (request.target_role === 'Employee') {
            let sourceTable = request.intern_id ? 'hr_interns' : 'hr_trainees';
            let idColumn = request.intern_id ? 'intern_id' : 'trainee_id';
            let sourceId = request.intern_id || request.trainee_id;
            
            const sourceRes = await db.query(`SELECT * FROM ${sourceTable} WHERE ${idColumn} = $1`, [sourceId]);
            const sourceRecord = sourceRes.rows[0];
            name = `${sourceRecord.first_name} ${sourceRecord.last_name}`;
            prevRole = request.intern_id ? 'Intern' : 'Trainee';

            const payload = request.payload || {};
            const defaultPassword = "Password123!";
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            
            const userQuery = `
                INSERT INTO users (full_name, email, password_hash, role_id, is_active)
                VALUES ($1, $2, $3, (SELECT role_id FROM roles WHERE role_name = 'Employee' LIMIT 1), true)
                ON CONFLICT (email) DO UPDATE SET is_active = true
                RETURNING user_id
            `;
            const userRes = await db.query(userQuery, [name, sourceRecord.email, hashedPassword]);
            const new_user_id = userRes.rows[0].user_id;

            // Generate Employee ID: CCYYYYMMXX if not provided
            let empCode = payload.emp_code;
            if (!empCode) {
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
                empCode = `${compCode}${dojYear}${dojMonth}${nextNum.toString().padStart(2, '0')}`;
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
            }

            // 2. Create hr_employees record
            const empQuery = `
                INSERT INTO hr_employees (user_id, emp_code, department_id, designation_id, manager_id, date_of_joining, employment_status, base_salary)
                VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'Full-Time', $6)
                RETURNING *
            `;
            const empRes = await db.query(empQuery, [
                new_user_id, 
                empCode, 
                sourceRecord.department_id, 
                payload.designation_id || sourceRecord.designation_id || null, 
                sourceRecord.mentor_employee_id,
                payload.base_salary || 0
            ]);

            const new_employee_id = empRes.rows[0].employee_id;

            // 3. Update Status
            await db.query(`UPDATE ${sourceTable} SET status = 'Converted to Employee', updated_at = CURRENT_TIMESTAMP WHERE ${idColumn} = $1`, [sourceId]);

            // 4. (Optional) Transfer LMS assignments
            if (request.trainee_id) {
                await db.query("UPDATE hr_lms_assignments SET employee_id = $1 WHERE trainee_id = $2", [new_employee_id, sourceId]);
            } else if (request.intern_id) {
                await db.query("UPDATE hr_lms_assignments SET employee_id = $1 WHERE intern_id = $2", [new_employee_id, sourceId]);
            }
            
            certificateUrl = await generateCertificate(name, prevRole, request.target_role, id);
        }

        // Update Request
        await db.query(
            "UPDATE hr_conversion_requests SET status = 'Approved', approved_by = $1, certificate_url = $2, updated_at = CURRENT_TIMESTAMP WHERE request_id = $3", 
            [userId, certificateUrl, id]
        );

        res.json({ success: true, message: 'Conversion approved successfully.' });
    } catch (error) {
        console.error('Error approving conversion:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to approve conversion' } });
    }
};

const rejectConversion = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        const requestRes = await db.query('SELECT * FROM hr_conversion_requests WHERE request_id = $1', [id]);
        if (requestRes.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Request not found' } });
        const request = requestRes.rows[0];

        if (request.status !== 'Pending') {
            return res.status(400).json({ success: false, error: { message: `Request is already ${request.status}` } });
        }

        // Revert status
        if (request.intern_id) {
            await db.query("UPDATE hr_interns SET status = 'Completed' WHERE intern_id = $1", [request.intern_id]);
        } else if (request.trainee_id) {
            await db.query("UPDATE hr_trainees SET status = 'Completed' WHERE trainee_id = $1", [request.trainee_id]);
        }

        // Update Request
        await db.query(
            "UPDATE hr_conversion_requests SET status = 'Rejected', approved_by = $1, updated_at = CURRENT_TIMESTAMP WHERE request_id = $2", 
            [userId, id]
        );

        res.json({ success: true, message: 'Conversion request rejected.' });
    } catch (error) {
        console.error('Error rejecting conversion:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to reject conversion' } });
    }
};

const getCertificate = async (req, res) => {
    try {
        const { type, id } = req.params;
        let query = '';
        if (type === 'intern') {
            query = "SELECT certificate_url FROM hr_conversion_requests WHERE intern_id = $1 AND status = 'Approved' ORDER BY created_at DESC LIMIT 1";
        } else if (type === 'trainee') {
            query = "SELECT certificate_url FROM hr_conversion_requests WHERE trainee_id = $1 AND status = 'Approved' ORDER BY created_at DESC LIMIT 1";
        } else {
            return res.status(400).json({ success: false, error: { message: 'Invalid type' } });
        }

        const result = await db.query(query, [id]);
        if (result.rows.length === 0 || !result.rows[0].certificate_url) {
            return res.status(404).json({ success: false, error: { message: 'Certificate not found' } });
        }

        res.json({ success: true, data: { certificate_url: result.rows[0].certificate_url } });
    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch certificate' } });
    }
};

module.exports = {
    getPendingConversions,
    approveConversion,
    rejectConversion,
    getCertificate
};
