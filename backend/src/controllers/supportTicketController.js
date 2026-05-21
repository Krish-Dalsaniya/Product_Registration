const db = require('../config/db');
const { sendError, sendSuccess } = require('../utils/response');

const getTickets = async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT * FROM support_tickets 
            ORDER BY created_at DESC
        `);
        return sendSuccess(res, result.rows, 'Support tickets retrieved successfully');
    } catch (error) {
        next(error);
    }
};

const getTicketById = async (req, res, next) => {
    const { id } = req.params;
    try {
        // Find by either numeric ID or TCK-XXX ticket_id
        let result;
        if (isNaN(id)) {
            result = await db.query('SELECT * FROM support_tickets WHERE ticket_id = $1', [id]);
        } else {
            result = await db.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
        }

        if (result.rows.length === 0) {
            return sendError(res, 'NOT_FOUND', 'Support ticket not found', 404);
        }

        return sendSuccess(res, result.rows[0], 'Support ticket retrieved successfully');
    } catch (error) {
        next(error);
    }
};

const createTicket = async (req, res, next) => {
    try {
        const { 
            creator_name, query_date, last_date, resolved_date, 
            query_type, query_description, troubleshooting_steps, 
            steps_followed, priority, status, assigned_to 
        } = req.body;

        const creator_id = req.user.user_id;
        const final_creator_name = creator_name || req.user.full_name || 'Unknown';

        // Ensure array of attachments
        let attachments = [];
        if (req.files && req.files.attachments) {
            attachments = req.files.attachments.map(file => file.path);
        }

        // Generate Ticket ID
        const maxIdResult = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM support_tickets');
        const nextId = maxIdResult.rows[0].next_id;
        const ticket_id = `TCK-${String(nextId).padStart(3, '0')}`;

        const query = `
            INSERT INTO support_tickets (
                ticket_id, creator_id, creator_name, query_date, last_date, resolved_date,
                query_type, query_description, troubleshooting_steps, steps_followed,
                priority, status, assigned_to, attachments
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        const values = [
            ticket_id, creator_id, final_creator_name, query_date || new Date(), last_date || null, resolved_date || null,
            query_type, query_description, troubleshooting_steps, steps_followed === 'true' || steps_followed === true,
            priority || 'Normal', status || 'Pending', assigned_to || 'Unassigned', JSON.stringify(attachments)
        ];

        const result = await db.query(query, values);
        return sendSuccess(res, result.rows[0], 'Support ticket created successfully', 201);
    } catch (error) {
        next(error);
    }
};

const updateTicket = async (req, res, next) => {
    const { id } = req.params;
    console.log(`[updateTicket] Request to update ticket id: ${id}`, req.body);
    try {
        const { 
            query_date, last_date, resolved_date, 
            query_type, query_description, troubleshooting_steps, 
            steps_followed, priority, status, assigned_to 
        } = req.body;

        const existingRes = await db.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) {
            console.log(`[updateTicket] Ticket id ${id} not found.`);
            return sendError(res, 'NOT_FOUND', 'Support ticket not found', 404);
        }

        const existing = existingRes.rows[0];
        let attachments = existing.attachments || [];

        if (req.files && req.files.attachments) {
            const newAttachments = req.files.attachments.map(file => file.path);
            attachments = [...attachments, ...newAttachments];
        }

        const query = `
            UPDATE support_tickets SET
                query_date = COALESCE($1, query_date),
                last_date = $2,
                resolved_date = $3,
                query_type = COALESCE($4, query_type),
                query_description = COALESCE($5, query_description),
                troubleshooting_steps = COALESCE($6, troubleshooting_steps),
                steps_followed = COALESCE($7, steps_followed),
                priority = COALESCE($8, priority),
                status = COALESCE($9, status),
                assigned_to = COALESCE($10, assigned_to),
                attachments = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *
        `;
        const values = [
            query_date || null, last_date || null, resolved_date || null,
            query_type, query_description, troubleshooting_steps, 
            steps_followed !== undefined ? (steps_followed === 'true' || steps_followed === true) : existing.steps_followed,
            priority, status, assigned_to, JSON.stringify(attachments), id
        ];

        const result = await db.query(query, values);
        return sendSuccess(res, result.rows[0], 'Support ticket updated successfully');
    } catch (error) {
        console.error(`[updateTicket] ERROR:`, error);
        next(error);
    }
};

const deleteTicket = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM support_tickets WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return sendError(res, 'NOT_FOUND', 'Support ticket not found', 404);
        }
        return sendSuccess(res, result.rows[0], 'Support ticket deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket
};
