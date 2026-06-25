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

const updateAssignmentProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { progress_percentage } = req.body;
        
        let status = 'Assigned';
        if (progress_percentage > 0 && progress_percentage < 100) {
            status = 'In Progress';
        } else if (progress_percentage >= 100) {
            status = 'Completed';
        }

        let updateQuery = `
            UPDATE hr_lms_assignments 
            SET progress_percentage = $1, status = $2, updated_at = CURRENT_TIMESTAMP
        `;
        
        if (status === 'Completed') {
            updateQuery += `, completed_at = CURRENT_TIMESTAMP`;
        } else {
            updateQuery += `, completed_at = NULL`;
        }

        updateQuery += ` WHERE assignment_id = $3 RETURNING *`;
        
        const result = await pool.query(updateQuery, [progress_percentage, status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update progress' } });
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

const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM hr_lms_assignments WHERE assignment_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        }
        res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete assignment' } });
    }
};

const logAssessment = async (req, res) => {
    try {
        const { assignment_id, score, remarks } = req.body;
        const assessed_by = req.user.user_id;
        
        // Auto pass/fail based on 70% threshold
        const status = score >= 70 ? 'Passed' : 'Failed';
        
        const query = `
            INSERT INTO hr_lms_assessments (assignment_id, score, status, remarks, assessed_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [assignment_id, score, status, remarks, assessed_by]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Assessment logged successfully' });
    } catch (error) {
        console.error('Error logging assessment:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to log assessment' } });
    }
};

const getAllAssessments = async (req, res) => {
    try {
        const query = `
            SELECT a.*, 
                   assign.assigned_date, assign.completed_at,
                   m.title as module_title, m.training_type, m.difficulty_level,
                   e.emp_code, u.full_name as employee_name,
                   assessor.full_name as assessor_name
            FROM hr_lms_assessments a
            JOIN hr_lms_assignments assign ON a.assignment_id = assign.assignment_id
            JOIN hr_lms_modules m ON assign.module_id = m.module_id
            JOIN hr_employees e ON assign.employee_id = e.employee_id
            JOIN users u ON e.user_id = u.user_id
            LEFT JOIN users assessor ON a.assessed_by = assessor.user_id
            ORDER BY a.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching assessments:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch assessments' } });
    }
};

const addQuizQuestion = async (req, res) => {
    try {
        const { id } = req.params; // module_id
        const { question_text, options, correct_answer } = req.body;
        
        const query = `
            INSERT INTO hr_lms_questions (module_id, question_text, options, correct_answer)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [id, question_text, JSON.stringify(options), correct_answer]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Question added successfully' });
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to add question' } });
    }
};

const getQuizQuestions = async (req, res) => {
    try {
        const { id } = req.params; // module_id
        
        const query = `
            SELECT * FROM hr_lms_questions
            WHERE module_id = $1
            ORDER BY created_at ASC
        `;
        const result = await pool.query(query, [id]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch questions' } });
    }
};

const submitQuiz = async (req, res) => {
    try {
        const { assignment_id, answers } = req.body;
        const assessed_by = req.user.user_id;
        
        // Fetch assignment to get module_id
        const assignmentRes = await pool.query('SELECT module_id FROM hr_lms_assignments WHERE assignment_id = $1', [assignment_id]);
        if (assignmentRes.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        
        const module_id = assignmentRes.rows[0].module_id;
        
        // Fetch all questions for this module
        const questionsRes = await pool.query('SELECT * FROM hr_lms_questions WHERE module_id = $1', [module_id]);
        const questions = questionsRes.rows;
        
        if (questions.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'No questions found for this module' } });
        }
        
        // Calculate score
        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.question_id] === q.correct_answer) {
                correctCount++;
            }
        });
        
        const score = Math.round((correctCount / questions.length) * 100);
        // Auto pass/fail based on 75% threshold (as requested by user)
        const status = score >= 75 ? 'Passed' : 'Failed';
        const remarks = `Automated Quiz Score: ${correctCount}/${questions.length} correct.`;
        
        const query = `
            INSERT INTO hr_lms_assessments (assignment_id, score, status, remarks, assessed_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [assignment_id, score, status, remarks, assessed_by]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Quiz submitted successfully' });
    } catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to submit quiz' } });
    }
};

const deleteQuizQuestion = async (req, res) => {
    try {
        const { id } = req.params; // question_id
        
        const result = await pool.query('DELETE FROM hr_lms_questions WHERE question_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Question not found' } });
        }
        
        res.json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete question' } });
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
    updateAssignmentProgress,
    deleteAssignment,
    getDashboardStats,
    logAssessment,
    getAllAssessments,
    addQuizQuestion,
    getQuizQuestions,
    submitQuiz,
    deleteQuizQuestion
};
