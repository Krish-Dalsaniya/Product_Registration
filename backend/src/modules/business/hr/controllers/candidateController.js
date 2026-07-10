const { query } = require('../../../../config/db');
const path = require('path');
const fs = require('fs');
const { extractCandidateInfo } = require('../../../../utils/documentExtractor');
const cloudinary = require('../../../../config/cloudinary');

/**
 * Helper to safely parse numeric values
 */
const safeParseFloat = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
};

/**
 * Handle POST /candidates/extract-live
 * Extracts AI info from a single document synchronously
 */
exports.extractLiveCandidateInfo = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No document uploaded for extraction' });
        }
        
        // Pass to the extractor
        const documents = {
            [req.file.fieldname]: `uploads/candidates/${req.file.filename}`
        };
        console.log("Documents object for extraction:", documents);
        console.log("Absolute path will be:", require('path').join(process.cwd(), documents[req.file.fieldname]));
        
        const extractedInfo = await extractCandidateInfo(documents, process.cwd());
        console.log("Extracted Info:", extractedInfo);
        
        res.status(200).json({
            success: true,
            data: extractedInfo
        });
        
    } catch (error) {
        console.error("Error in live AI extraction:", error);
        res.status(500).json({ success: false, message: 'Failed to extract document details' });
    }
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
            date_of_birth,
            experience_details,
            technical_details,
            education_details
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

        // education_details may be sent as a JSON string
        let eduDetails = education_details;
        if (typeof education_details === 'string') {
            try {
                eduDetails = JSON.parse(education_details);
            } catch (e) {
                console.error("Failed to parse education_details:", e);
                eduDetails = {};
            }
        }

        // Gather uploaded documents
        const localDocuments = {};
        const cloudinaryDocuments = {};
        
        if (req.files) {
            let filesToProcess = [];
            if (Array.isArray(req.files)) {
                filesToProcess = req.files;
            } else {
                for (const [fieldname, files] of Object.entries(req.files)) {
                    if (files && files.length > 0) {
                        filesToProcess.push(files[0]);
                    }
                }
            }

            for (const file of filesToProcess) {
                const localPath = `/uploads/candidates/${file.filename}`;
                localDocuments[file.fieldname] = localPath;
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: "candidates/documents",
                        resource_type: "auto"
                    });
                    cloudinaryDocuments[file.fieldname] = result.secure_url;
                } catch(e) {
                    console.error("Cloudinary upload error:", e);
                    cloudinaryDocuments[file.fieldname] = localPath;
                }
            }
        }

        const sql = `
            INSERT INTO hr_candidates (
                position, name, experience_type, email, whatsapp, mobile,
                current_location, relocate, education_route, date_of_birth,
                total_years, designation, current_company, past_experiences,
                documents, status, technical_details, education_details
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, 'Applied', $16, $17
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
            date_of_birth || null,
            expDetails?.total_years ? safeParseFloat(expDetails.total_years) : null,
            expDetails?.designation || null,
            expDetails?.current_company || null,
            JSON.stringify(expDetails?.past_experiences || []),
            JSON.stringify(cloudinaryDocuments),
            JSON.stringify(techDetails || {}),
            JSON.stringify(eduDetails || {})
        ];

        const result = await query(sql, values);
        const newCandidateId = result.rows[0].id;

        // Asynchronously process OCR and AI extraction so we don't block the API response
        extractCandidateInfo(localDocuments, process.cwd()).then(async (extractedInfo) => {
            if (extractedInfo && Object.keys(extractedInfo).length > 0) {
                try {
                    await query('UPDATE hr_candidates SET extracted_info = $1 WHERE id = $2', [JSON.stringify(extractedInfo), newCandidateId]);
                    console.log(`Successfully updated AI insights for candidate ${newCandidateId}`);
                } catch (e) {
                    console.error("Failed to update candidate extracted_info:", e);
                }
            }
        }).catch(err => {
            console.error("Background AI Extraction Error:", err);
        });

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
        const sql = `SELECT *, TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth FROM hr_candidates ORDER BY created_at DESC`;
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

        if (result.rows.length > 0) {
            // Log status change activity
            await query(`
                INSERT INTO hr_candidate_activity_log (candidate_id, actor_id, action_type, details)
                VALUES ($1, $2, $3, $4)
            `, [id, req.user?.user_id || req.user?.id || null, 'status_changed', JSON.stringify({ to: status })]);
        }

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
        const sql = `SELECT *, TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth FROM hr_candidates WHERE id = $1`;
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
            date_of_birth,
            experience_details,
            technical_details,
            education_details
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
        let eduDetails = education_details;
        if (typeof education_details === 'string') {
            try { eduDetails = JSON.parse(education_details); } catch (e) { eduDetails = {}; }
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

        let localDocuments = {};
        if (req.files) {
            let filesToProcess = [];
            if (Array.isArray(req.files)) {
                filesToProcess = req.files;
            } else {
                for (const [fieldname, files] of Object.entries(req.files)) {
                    if (files && files.length > 0) {
                        filesToProcess.push(files[0]);
                    }
                }
            }

            for (const file of filesToProcess) {
                const localPath = `/uploads/candidates/${file.filename}`;
                localDocuments[file.fieldname] = localPath;
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: "candidates/documents",
                        resource_type: "auto"
                    });
                    documents[file.fieldname] = result.secure_url;
                } catch(e) {
                    console.error("Cloudinary upload error:", e);
                    documents[file.fieldname] = localPath;
                }
            }
        }

        const sql = `
            UPDATE hr_candidates SET
                position = $1, name = $2, experience_type = $3, email = $4, whatsapp = $5, mobile = $6,
                current_location = $7, relocate = $8, education_route = $9, date_of_birth = $10,
                total_years = $11, designation = $12, current_company = $13, past_experiences = $14,
                documents = $15, technical_details = $16, education_details = $17, updated_at = CURRENT_TIMESTAMP
            WHERE id = $18
            RETURNING *
        `;

        const values = [
            position, name, experienceType || 'FRESHER', email, whatsapp, mobile,
            currentLocation, relocate === 'YES' || relocate === true, educationRoute || 'REGULAR',
            date_of_birth || null,
            expDetails?.total_years ? safeParseFloat(expDetails.total_years) : null,
            expDetails?.designation || null,
            expDetails?.current_company || null,
            JSON.stringify(expDetails?.past_experiences || []),
            JSON.stringify(documents), JSON.stringify(techDetails || {}), JSON.stringify(eduDetails || {}), id
        ];

        const result = await query(sql, values);

        if (Object.keys(localDocuments).length > 0) {
            extractCandidateInfo(localDocuments, process.cwd()).then(async (extractedInfo) => {
                if (extractedInfo && Object.keys(extractedInfo).length > 0) {
                    try {
                        const currentInfoSql = `SELECT extracted_info FROM hr_candidates WHERE id = $1`;
                        const currentInfoResult = await query(currentInfoSql, [id]);
                        let currentExtractedInfo = {};
                        try {
                            if (currentInfoResult.rows[0].extracted_info) {
                                currentExtractedInfo = typeof currentInfoResult.rows[0].extracted_info === 'string'
                                    ? JSON.parse(currentInfoResult.rows[0].extracted_info)
                                    : currentInfoResult.rows[0].extracted_info;
                            }
                        } catch (e) {}

                        const mergedInfo = { ...currentExtractedInfo, ...extractedInfo };
                        await query('UPDATE hr_candidates SET extracted_info = $1 WHERE id = $2', [JSON.stringify(mergedInfo), id]);
                        console.log(`Successfully updated AI insights for candidate ${id} after update`);
                    } catch (e) {
                        console.error("Failed to update candidate extracted_info:", e);
                    }
                }
            }).catch(err => {
                console.error("Background AI Extraction Error in update:", err);
            });
        }

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
        const client = await query('BEGIN'); 
        for (const update of updates) {
            await query('UPDATE hr_candidates SET status = $1, kanban_order = $2 WHERE id = $3', [
                update.status, update.kanban_order, update.id
            ]);
        }
        await query('COMMIT');

        res.status(200).json({ success: true, message: 'Kanban order updated' });
    } catch (error) {
        console.error('Error reordering candidates:', error);
        res.status(500).json({ success: false, message: 'Failed to reorder' });
    }
};

exports.updateCandidateTrelloMetadata = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { trello_metadata } = req.body;
        
        if (!trello_metadata) {
            return res.status(400).json({ success: false, message: 'trello_metadata is required' });
        }

        const sql = `
            UPDATE hr_candidates 
            SET trello_metadata = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        
        const result = await query(sql, [JSON.stringify(trello_metadata), id]);

        if (result.rows.length > 0) {
            await query(`
                INSERT INTO hr_candidate_activity_log (candidate_id, actor_id, action_type, details)
                VALUES ($1, $2, $3, $4)
            `, [id, req.user?.user_id || req.user?.id || null, 'metadata_updated', JSON.stringify({ updated: true })]);
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Trello metadata updated',
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating candidate trello metadata:", error);
        res.status(500).json({ success: false, message: 'Failed to update metadata' });
    }
};

exports.addCandidateComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { body } = req.body;
        const actorId = req.user?.user_id || req.user?.id || null;

        if (!body) return res.status(400).json({ success: false, message: 'Comment body is required' });

        const sql = `INSERT INTO hr_candidate_comments (candidate_id, author_id, body) VALUES ($1, $2, $3) RETURNING *`;
        const result = await query(sql, [id, actorId, body]);
        
        // Log activity for comment
        await query(`
            INSERT INTO hr_candidate_activity_log (candidate_id, actor_id, action_type, details)
            VALUES ($1, $2, $3, $4)
        `, [id, actorId, 'commented', JSON.stringify({ comment_id: result.rows[0].id })]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

exports.getCandidateComments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT c.*, u.full_name as author_name 
            FROM hr_candidate_comments c
            LEFT JOIN users u ON c.author_id = u.user_id
            WHERE c.candidate_id = $1
            ORDER BY c.created_at DESC
        `;
        const result = await query(sql, [id]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch comments' });
    }
};

exports.getCandidateActivity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT a.*, u.full_name as actor_name 
            FROM hr_candidate_activity_log a
            LEFT JOIN users u ON a.actor_id = u.user_id
            WHERE a.candidate_id = $1
            ORDER BY a.created_at DESC
        `;
        const result = await query(sql, [id]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch activity' });
    }
};
