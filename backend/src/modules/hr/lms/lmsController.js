const pool = require('../../../config/db');

// --- Training Modules ---
const createModule = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { 
            title, description, category, department_id, training_type, 
            difficulty_level, duration_hours, training_url, attachment_url, status 
        } = req.body;

        const insertQuery = `
            INSERT INTO hr_lms_modules 
            (title, description, category, department_id, training_type, difficulty_level, duration_hours, training_url, attachment_url, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        const values = [
            title, description || null, category || null, department_id || null, 
            training_type || null, difficulty_level || null, duration_hours || null, 
            training_url || null, attachment_url || null, status || 'Active', userId
        ];

        const result = await pool.query(insertQuery, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating LMS module:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create module' } });
    }
};

const getAllModules = async (req, res) => {
    try {
        const query = `
            SELECT m.*, d.name as department_name
            FROM hr_lms_modules m
            LEFT JOIN hr_departments d ON m.department_id = d.department_id
            ORDER BY m.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch modules' } });
    }
};

const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, description, category, department_id, training_type, 
            difficulty_level, duration_hours, training_url, attachment_url, status 
        } = req.body;

        const updateQuery = `
            UPDATE hr_lms_modules 
            SET title = $1, description = $2, category = $3, department_id = $4, training_type = $5, 
                difficulty_level = $6, duration_hours = $7, training_url = $8, attachment_url = $9, status = $10, updated_at = CURRENT_TIMESTAMP
            WHERE module_id = $11
            RETURNING *
        `;
        
        const values = [
            title, description || null, category || null, department_id || null, 
            training_type || null, difficulty_level || null, duration_hours || null, 
            training_url || null, attachment_url || null, status || 'Active', id
        ];

        const result = await pool.query(updateQuery, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Module not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating LMS module:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update module' } });
    }
};

const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteQuery = `DELETE FROM hr_lms_modules WHERE module_id = $1 RETURNING *`;
        const result = await pool.query(deleteQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Module not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting LMS module:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete module' } });
    }
};

// --- Employee Training Assignments ---
const assignTraining = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { employee_id, module_id, due_date } = req.body;

        const insertQuery = `
            INSERT INTO hr_lms_assignments 
            (employee_id, module_id, assigned_date, due_date, status, assigned_by)
            VALUES ($1, $2, CURRENT_DATE, $3, 'Assigned', $4)
            RETURNING *
        `;
        
        const values = [employee_id, module_id, due_date || null, userId];
        const result = await pool.query(insertQuery, values);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error assigning training:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to assign training' } });
    }
};

const getAllAssignments = async (req, res) => {
    try {
        const query = `
            SELECT a.*, 
                   m.title as module_title, m.training_type, m.training_url, m.attachment_url,
                   e.emp_code, u.full_name as employee_name
            FROM hr_lms_assignments a
            JOIN hr_lms_modules m ON a.module_id = m.module_id
            JOIN hr_employees e ON a.employee_id = e.employee_id
            JOIN users u ON e.user_id = u.user_id
            ORDER BY a.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching employee trainings:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch assignments' } });
    }
};

const updateAssignmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        let updateQuery = `
            UPDATE hr_lms_assignments 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
        `;
        let values = [status];

        if (status === 'Completed') {
            updateQuery += `, completed_at = CURRENT_TIMESTAMP`;
        }

        updateQuery += ` WHERE assignment_id = $2 RETURNING *`;
        values.push(id);

        const result = await pool.query(updateQuery, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating assignment status:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update assignment' } });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM hr_lms_modules) as total_modules,
                (SELECT COUNT(DISTINCT employee_id) FROM hr_lms_assignments WHERE status != 'Completed') as active_trainees,
                (SELECT COUNT(*) FROM hr_lms_assignments WHERE status = 'Completed') as completed_courses
        `;
        const result = await pool.query(statsQuery);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching LMS stats:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch LMS stats' } });
    }
};

module.exports = {
    createModule,
    getAllModules,
    updateModule,
    deleteModule,
    assignTraining,
    getAllAssignments,
    updateAssignmentStatus,
    getDashboardStats
};
