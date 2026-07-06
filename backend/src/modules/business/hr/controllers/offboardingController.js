const db = require('../../../../config/db');

exports.getOffboardingRecords = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT o.*, 
                   e.emp_code, e.department_id, e.designation_id,
                   u.full_name, u.email, u.image_url
            FROM hr_offboarding o
            JOIN hr_employees e ON o.employee_id = e.employee_id
            JOIN users u ON e.user_id = u.user_id
            ORDER BY o.created_at DESC
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching offboarding records:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch offboarding records' } });
    }
};

exports.updateOffboardingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await db.query(
            'UPDATE hr_offboarding SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Offboarding record not found' } });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating offboarding status:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update offboarding status' } });
    }
};

exports.updateChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const { clearance_checklist, asset_recovery_checklist, exit_interview_notes } = req.body;
        
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (clearance_checklist !== undefined) {
            updates.push(`clearance_checklist = $${paramIndex++}`);
            values.push(JSON.stringify(clearance_checklist));
        }
        if (asset_recovery_checklist !== undefined) {
            updates.push(`asset_recovery_checklist = $${paramIndex++}`);
            values.push(JSON.stringify(asset_recovery_checklist));
        }
        if (exit_interview_notes !== undefined) {
            updates.push(`exit_interview_notes = $${paramIndex++}`);
            values.push(exit_interview_notes);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'No fields provided for update' } });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `UPDATE hr_offboarding SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Offboarding record not found' } });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating offboarding checklist:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update offboarding checklist' } });
    }
};

exports.createOffboardingRecord = async (req, res) => {
    try {
        const { employee_id, resignation_date, last_working_day, offboarding_method } = req.body;
        const result = await db.query(
            `INSERT INTO hr_offboarding (employee_id, resignation_date, last_working_day, offboarding_method) VALUES ($1, $2, $3, $4) RETURNING *`,
            [employee_id, resignation_date || null, last_working_day || null, offboarding_method || 'Resigned']
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating offboarding record:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create offboarding record' } });
    }
};
