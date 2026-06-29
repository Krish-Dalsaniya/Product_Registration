const db = require('../../../../config/db');

exports.getClaims = async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   u.full_name as employee_name, 
                   e.emp_code
            FROM hr_claims c
            JOIN hr_employees e ON c.employee_id = e.employee_id
            JOIN users u ON e.user_id = u.user_id
            ORDER BY c.submitted_date DESC
        `;
        const result = await db.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching claims:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch claims' });
    }
};

exports.createClaim = async (req, res) => {
    try {
        const { employee_id, claim_type, amount, description } = req.body;
        
        let receipt_url = null;
        if (req.file) {
            // Wait, upload.js stores the file locally, and the Cloudinary upload is managed by the upload queue.
            // Let's use the same approach used in products.js or structuralController.js if needed.
            // For now, if we just store locally in the uploads folder and serve it statically, it's easier.
            // The file is saved by `upload.js` which puts it in `../../uploads`.
            receipt_url = `/uploads/${req.file.filename}`;
        }
        
        const query = `
            INSERT INTO hr_claims (employee_id, claim_type, amount, description, receipt_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [employee_id, claim_type, amount, description, receipt_url];
        const result = await db.query(query, values);
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating claim:', error);
        res.status(500).json({ success: false, error: 'Failed to create claim' });
    }
};

exports.updateClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const approved_by = req.user?.user_id;

        const query = `
            UPDATE hr_claims 
            SET status = $1, remarks = $2, approved_by = $3, approved_date = CURRENT_TIMESTAMP
            WHERE claim_id = $4
            RETURNING *
        `;
        const result = await db.query(query, [status, remarks, approved_by, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Claim not found' });
        }
        
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating claim status:', error);
        res.status(500).json({ success: false, error: 'Failed to update claim status' });
    }
};

exports.getAdvances = async (req, res) => {
    try {
        const query = `
            SELECT a.*, 
                   u.full_name as employee_name, 
                   e.emp_code
            FROM hr_advances a
            JOIN hr_employees e ON a.employee_id = e.employee_id
            JOIN users u ON e.user_id = u.user_id
            ORDER BY a.submitted_date DESC
        `;
        const result = await db.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching advances:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch advances' });
    }
};

exports.createAdvance = async (req, res) => {
    try {
        const { employee_id, amount, reason, repayment_term_months, monthly_deduction } = req.body;
        
        const query = `
            INSERT INTO hr_advances (employee_id, amount, reason, repayment_term_months, monthly_deduction)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [employee_id, amount, reason, repayment_term_months, monthly_deduction];
        const result = await db.query(query, values);
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating advance:', error);
        res.status(500).json({ success: false, error: 'Failed to create advance' });
    }
};

exports.updateAdvanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const approved_by = req.user?.user_id;

        const query = `
            UPDATE hr_advances 
            SET status = $1, remarks = $2, approved_by = $3, approved_date = CURRENT_TIMESTAMP
            WHERE advance_id = $4
            RETURNING *
        `;
        const result = await db.query(query, [status, remarks, approved_by, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Advance not found' });
        }
        
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating advance status:', error);
        res.status(500).json({ success: false, error: 'Failed to update advance status' });
    }
};
