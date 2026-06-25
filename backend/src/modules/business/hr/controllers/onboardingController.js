const db = require('../../../../config/db');

exports.getOnboardingRecords = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT o.*, 
                   e.emp_code, e.department_id, e.designation_id,
                   u.full_name, u.email, u.image_url
            FROM hr_onboarding o
            JOIN hr_employees e ON o.employee_id = e.employee_id
            JOIN users u ON e.user_id = u.user_id
            ORDER BY o.created_at DESC
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching onboarding records:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch onboarding records' } });
    }
};

exports.updateOnboardingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await db.query(
            'UPDATE hr_onboarding SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Onboarding record not found' } });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating onboarding status:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update onboarding status' } });
    }
};

exports.updateChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const { document_checklist, asset_checklist, training_checklist } = req.body;
        
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (document_checklist !== undefined) {
            updates.push(`document_checklist = $${paramIndex++}`);
            values.push(JSON.stringify(document_checklist));
        }
        if (asset_checklist !== undefined) {
            updates.push(`asset_checklist = $${paramIndex++}`);
            values.push(JSON.stringify(asset_checklist));
        }
        if (training_checklist !== undefined) {
            updates.push(`training_checklist = $${paramIndex++}`);
            values.push(JSON.stringify(training_checklist));
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'No checklists provided for update' } });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `UPDATE hr_onboarding SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Onboarding record not found' } });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating checklist:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update checklist' } });
    }
};

exports.createOnboardingRecord = async (req, res) => {
    try {
        const { employee_id, offer_acceptance_date } = req.body;
        const result = await db.query(
            `INSERT INTO hr_onboarding (employee_id, offer_acceptance_date) VALUES ($1, $2) RETURNING *`,
            [employee_id, offer_acceptance_date || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating onboarding record:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create onboarding record' } });
    }
};
