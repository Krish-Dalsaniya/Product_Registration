const db = require('../config/db');
const { sendError, sendSuccess } = require('../utils/response');

const getTickets = async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT st.*, p.product_name 
            FROM support_tickets st
            LEFT JOIN products p ON st.product_id = p.product_id
            ORDER BY st.created_at DESC
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
            result = await db.query(`
                SELECT st.*, p.product_name 
                FROM support_tickets st
                LEFT JOIN products p ON st.product_id = p.product_id
                WHERE st.ticket_id = $1
            `, [id]);
        } else {
            result = await db.query(`
                SELECT st.*, p.product_name 
                FROM support_tickets st
                LEFT JOIN products p ON st.product_id = p.product_id
                WHERE st.id = $1
            `, [id]);
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
            steps_followed, priority, status, assigned_to, product_id 
        } = req.body;

        const creator_id = req.user.user_id;
        const final_creator_name = creator_name || req.user.full_name || 'Unknown';

        // Ensure array of attachments
        let attachments = [];
        if (req.files && req.files.attachments) {
            attachments = req.files.attachments.map(file => file.path);
        }

        // Generate Ticket ID
        const maxIdResult = await db.query(`
            SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM 5) AS INTEGER)), 0) + 1 AS next_id
            FROM support_tickets
            WHERE ticket_id ~ '^TCK-[0-9]+$'
        `);
        const nextId = maxIdResult.rows[0].next_id;
        const ticket_id = `TCK-${String(nextId).padStart(3, '0')}`;

        const query = `
            INSERT INTO support_tickets (
                ticket_id, creator_id, creator_name, query_date, last_date, resolved_date,
                query_type, query_description, troubleshooting_steps, steps_followed,
                priority, status, assigned_to, attachments, product_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;
        const values = [
            ticket_id, creator_id, final_creator_name, query_date || new Date(), last_date || null, resolved_date || null,
            query_type, query_description, troubleshooting_steps, steps_followed === 'true' || steps_followed === true,
            priority || 'Normal', status || 'Pending', assigned_to || 'Unassigned', JSON.stringify(attachments),
            product_id || null
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
            steps_followed, priority, status, assigned_to, product_id 
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
                product_id = COALESCE($12, product_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *
        `;
        const values = [
            query_date || null, last_date || null, resolved_date || null,
            query_type, query_description, troubleshooting_steps, 
            steps_followed !== undefined ? (steps_followed === 'true' || steps_followed === true) : existing.steps_followed,
            priority, status, assigned_to, JSON.stringify(attachments), product_id || null, id
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

const getTicketMessages = async (req, res, next) => {
    const { id } = req.params;
    try {
        // Fetch messages for a specific ticket, joining with users and roles
        // We handle id being either numeric or string ticket_id
        let ticketId = id;
        if (isNaN(id)) {
             const ticketRes = await db.query('SELECT id FROM support_tickets WHERE ticket_id = $1', [id]);
             if (ticketRes.rows.length === 0) {
                 return sendError(res, 'NOT_FOUND', 'Support ticket not found', 404);
             }
             ticketId = ticketRes.rows[0].id;
        }

        const query = `
            SELECT 
                stm.id as message_id,
                stm.message,
                stm.created_at,
                u.user_id as sender_id,
                u.full_name as sender_name,
                r.role_name as sender_role
            FROM support_ticket_messages stm
            JOIN users u ON stm.sender_id = u.user_id
            JOIN roles r ON u.role_id = r.role_id
            WHERE stm.ticket_id = $1
            ORDER BY stm.created_at ASC
        `;
        const result = await db.query(query, [ticketId]);
        
        return sendSuccess(res, result.rows, 'Ticket messages retrieved successfully');
    } catch (error) {
        next(error);
    }
};

const addTicketMessage = async (req, res, next) => {
    const { id } = req.params;
    const { message } = req.body;
    const sender_id = req.user.user_id;

    if (!message || !message.trim()) {
        return sendError(res, 'BAD_REQUEST', 'Message content is required', 400);
    }

    try {
        let ticketId = id;
        if (isNaN(id)) {
             const ticketRes = await db.query('SELECT id FROM support_tickets WHERE ticket_id = $1', [id]);
             if (ticketRes.rows.length === 0) {
                 return sendError(res, 'NOT_FOUND', 'Support ticket not found', 404);
             }
             ticketId = ticketRes.rows[0].id;
        }

        const query = `
            INSERT INTO support_ticket_messages (ticket_id, sender_id, message)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await db.query(query, [ticketId, sender_id, message.trim()]);
        
        // Also fetch the sender info to return a complete message object
        const completeMessageQuery = `
            SELECT 
                stm.id as message_id,
                stm.message,
                stm.created_at,
                u.user_id as sender_id,
                u.full_name as sender_name,
                r.role_name as sender_role
            FROM support_ticket_messages stm
            JOIN users u ON stm.sender_id = u.user_id
            JOIN roles r ON u.role_id = r.role_id
            WHERE stm.id = $1
        `;
        const completeMessageResult = await db.query(completeMessageQuery, [result.rows[0].id]);

        return sendSuccess(res, completeMessageResult.rows[0], 'Message added successfully', 201);
    } catch (error) {
        next(error);
    }
};

const deleteTicketMessage = async (req, res, next) => {
    const { id, messageId } = req.params;
    const currentUserId = req.user.user_id;

    try {
        let ticketId = id;
        if (isNaN(id)) {
             const ticketRes = await db.query('SELECT id FROM support_tickets WHERE ticket_id = $1', [id]);
             if (ticketRes.rows.length === 0) {
                 return sendError(res, 'NOT_FOUND', 'Support ticket not found', 404);
             }
             ticketId = ticketRes.rows[0].id;
        }

        const query = `
            DELETE FROM support_ticket_messages 
            WHERE id = $1 AND ticket_id = $2 AND sender_id = $3
            RETURNING id
        `;
        const result = await db.query(query, [messageId, ticketId, currentUserId]);

        if (result.rows.length === 0) {
            return sendError(res, 'NOT_FOUND', 'Message not found or unauthorized', 404);
        }

        return sendSuccess(res, null, 'Message deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketMessages,
    addTicketMessage,
    deleteTicketMessage
};
