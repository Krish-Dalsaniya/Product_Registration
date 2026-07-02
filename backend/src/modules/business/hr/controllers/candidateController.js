const { query } = require('../../../../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Helper to safely parse numeric values
 */
const safeParseFloat = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
};

/**
 * Handle POST /candidates
 * We expect multipart/form-data containing fields and files
 */
exports.createCandidate = async (req, res, next) => {
    try {
        const {
            position,
            name,
            experienceType,
            email,
            whatsapp,
            mobile,
            currentLocation,
            relocate,
            educationRoute,
            experience_details,
            technical_details
        } = req.body;

        // experience_details may be sent as a JSON string if using FormData
        let expDetails = experience_details;
        if (typeof experience_details === 'string') {
            try {
                expDetails = JSON.parse(experience_details);
            } catch (e) {
                console.error("Failed to parse experience_details:", e);
                expDetails = {};
            }
        }

        // technical_details may be sent as a JSON string
        let techDetails = technical_details;
        if (typeof technical_details === 'string') {
            try {
                techDetails = JSON.parse(technical_details);
            } catch (e) {
                console.error("Failed to parse technical_details:", e);
                techDetails = {};
            }
        }

        // Gather uploaded documents
        const documents = {};
        if (req.files) {
            if (Array.isArray(req.files)) {
                req.files.forEach(file => {
                    documents[file.fieldname] = `/uploads/candidates/${file.filename}`;
                });
            } else {
                for (const [fieldname, files] of Object.entries(req.files)) {
                    if (files && files.length > 0) {
                        documents[fieldname] = `/uploads/candidates/${files[0].filename}`;
                    }
                }
            }
        }

        const sql = `
            INSERT INTO hr_candidates (
                position, name, experience_type, email, whatsapp, mobile,
                current_location, relocate, education_route,
                total_years, designation, current_company, monthly_taken_home, expected_monthly,
                documents, status, technical_details
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9,
                $10, $11, $12, $13, $14,
                $15, 'Applied', $16
            ) RETURNING *
        `;

        const values = [
            position,
            name,
            experienceType || 'FRESHER',
            email,
            whatsapp,
            mobile,
            currentLocation,
            relocate === 'YES' || relocate === true,
            educationRoute || 'REGULAR',
            expDetails?.total_years ? safeParseFloat(expDetails.total_years) : null,
            expDetails?.designation || null,
            expDetails?.current_company || null,
            expDetails?.monthly_taken_home ? safeParseFloat(expDetails.monthly_taken_home) : null,
            expDetails?.expected_monthly ? safeParseFloat(expDetails.expected_monthly) : null,
            JSON.stringify(documents),
            JSON.stringify(techDetails || {})
        ];

        const result = await query(sql, values);

        res.status(201).json({
            success: true,
            message: 'Candidate created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error creating candidate:", error);
        res.status(500).json({ success: false, message: 'Failed to create candidate' });
    }
};

/**
 * Handle GET /candidates
 */
exports.getCandidates = async (req, res, next) => {
    try {
        const sql = `SELECT * FROM hr_candidates ORDER BY created_at DESC`;
        const result = await query(sql);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error("Error fetching candidates:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch candidates' });
    }
};

/**
 * Handle PUT /candidates/:id/status
 */
exports.updateCandidateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const sql = `
            UPDATE hr_candidates 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 
            RETURNING *
        `;
        const result = await query(sql, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Status updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating candidate status:", error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

/**
 * Handle GET /candidates/:id
 */
exports.getCandidateById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `SELECT * FROM hr_candidates WHERE id = $1`;
        const result = await query(sql, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error fetching candidate by id:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch candidate' });
    }
};

/**
 * Handle DELETE /candidates/:id
 */
exports.deleteCandidate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `DELETE FROM hr_candidates WHERE id = $1 RETURNING *`;
        const result = await query(sql, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Candidate deleted successfully'
        });
    } catch (error) {
        console.error("Error deleting candidate:", error);
        res.status(500).json({ success: false, message: 'Failed to delete candidate' });
    }
};

/**
 * Handle PUT /candidates/:id
 */
exports.updateCandidate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            position,
            name,
            experienceType,
            email,
            whatsapp,
            mobile,
            currentLocation,
            relocate,
            educationRoute,
            experience_details,
            technical_details
        } = req.body;

        // Parse JSON strings if necessary
        let expDetails = experience_details;
        if (typeof experience_details === 'string') {
            try { expDetails = JSON.parse(experience_details); } catch (e) { expDetails = {}; }
        }
        let techDetails = technical_details;
        if (typeof technical_details === 'string') {
            try { techDetails = JSON.parse(technical_details); } catch (e) { techDetails = {}; }
        }

        // Fetch existing candidate to merge documents if files aren't updated
        const existingSql = `SELECT documents FROM hr_candidates WHERE id = $1`;
        const existingResult = await query(existingSql, [id]);
        if (existingResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }
        
        let documents = {};
        try {
            documents = typeof existingResult.rows[0].documents === 'string' 
                ? JSON.parse(existingResult.rows[0].documents) 
                : existingResult.rows[0].documents;
        } catch(e) {}

        if (req.files) {
            if (Array.isArray(req.files)) {
                req.files.forEach(file => {
                    documents[file.fieldname] = `/uploads/candidates/${file.filename}`;
                });
            } else {
                for (const [fieldname, files] of Object.entries(req.files)) {
                    if (files && files.length > 0) {
                        documents[fieldname] = `/uploads/candidates/${files[0].filename}`;
                    }
                }
            }
        }

        const sql = `
            UPDATE hr_candidates SET
                position = $1, name = $2, experience_type = $3, email = $4, whatsapp = $5, mobile = $6,
                current_location = $7, relocate = $8, education_route = $9,
                total_years = $10, designation = $11, current_company = $12, monthly_taken_home = $13, expected_monthly = $14,
                documents = $15, technical_details = $16, updated_at = CURRENT_TIMESTAMP
            WHERE id = $17
            RETURNING *
        `;

        const values = [
            position, name, experienceType || 'FRESHER', email, whatsapp, mobile,
            currentLocation, relocate === 'YES' || relocate === true, educationRoute || 'REGULAR',
            expDetails?.total_years ? safeParseFloat(expDetails.total_years) : null,
            expDetails?.designation || null,
            expDetails?.current_company || null,
            expDetails?.monthly_taken_home ? safeParseFloat(expDetails.monthly_taken_home) : null,
            expDetails?.expected_monthly ? safeParseFloat(expDetails.expected_monthly) : null,
            JSON.stringify(documents), JSON.stringify(techDetails || {}), id
        ];

        const result = await query(sql, values);

        res.status(200).json({
            success: true,
            message: 'Candidate updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating candidate:", error);
        res.status(500).json({ success: false, message: 'Failed to update candidate' });
    }
};

exports.reorderCandidates = async (req, res, next) => {
    try {
        const { updates } = req.body;
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ success: false, message: 'Invalid updates format' });
        }

        // Bulk update query
        // We'll update the status and kanban_order for each candidate
        const client = await query('BEGIN'); // We'll just run individual queries for simplicity, but in transaction it's better
        // Wait, query is a helper, we might not be able to call BEGIN easily if query opens/closes pool.
        // Let's just map over and await query() for each.
        for (const update of updates) {
            await query('UPDATE hr_candidates SET status = , kanban_order =  WHERE id = ', [
                update.status, update.kanban_order, update.id
            ]);
        }

        res.status(200).json({ success: true, message: 'Kanban order updated' });
    } catch (error) {
        console.error('Error reordering candidates:', error);
        res.status(500).json({ success: false, message: 'Failed to reorder' });
    }
};
