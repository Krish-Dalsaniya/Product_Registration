const db = require('../../../../config/db');

/**
 * Get public form schema via UUID
 */
const getPublicForm = async (req, res) => {
  try {
    const { uuid } = req.params;
    
    // Validate UUID format securely
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      return res.status(400).json({ success: false, message: 'Invalid form link' });
    }

    const formResult = await db.query(
      'SELECT id, title, description, status, is_public, form_mode FROM forms WHERE public_url = $1', 
      [uuid]
    );
    
    if (formResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    
    const form = formResult.rows[0];
    
    if (form.status !== 'Published' || !form.is_public) {
      return res.status(403).json({ success: false, message: 'Form is no longer accepting responses.' });
    }

    // Get the sections and questions without exposing correct answers or scores
    const schemaResult = await db.query(`
      SELECT 
        s.id AS section_id, s.title AS section_title, s.description AS section_desc, s.order_index AS section_order, s.section_type, s.config AS section_config,
        q.id AS question_id, q.type, q.label, q.is_required, q.order_index AS question_order, 
        q.placeholder, q.help_text, q.config,
        o.id AS option_id, o.label AS option_label, o.value AS option_value, o.order_index AS option_order,
        o.score AS option_score, o.is_correct AS option_is_correct,
        r.id AS row_id, r.label AS row_label, r.order_index AS row_order
      FROM form_sections s
      LEFT JOIN form_questions q ON s.id = q.section_id AND q.is_archived = false
      LEFT JOIN question_options o ON q.id = o.question_id AND o.is_archived = false
      LEFT JOIN question_rows r ON q.id = r.question_id AND r.is_archived = false
      WHERE s.form_id = $1 AND s.is_archived = false
      ORDER BY s.order_index, q.order_index, o.order_index, r.order_index
    `, [form.id]);

    const sectionsMap = new Map();
    schemaResult.rows.forEach(row => {
      if (!sectionsMap.has(row.section_id)) {
        const secConfig = row.section_config || {};
        sectionsMap.set(row.section_id, {
          id: row.section_id,
          title: row.section_title,
          description: row.section_desc,
          section_type: row.section_type || 'mixed',
          layout: secConfig.layout,
          questions: new Map()
        });
      }
      
      const section = sectionsMap.get(row.section_id);
      
      if (row.question_id && !section.questions.has(row.question_id)) {
        const qConfig = row.config || {};
        const qLayout = qConfig.layout;
        delete qConfig.layout;
        section.questions.set(row.question_id, {
          id: row.question_id,
          type: row.type,
          label: row.label,
          required: row.is_required,
          placeholder: row.placeholder,
          help_text: row.help_text,
          config: qConfig,
          layout: qLayout,
          points: 0,
          options: [],
          rows: []
        });
      }

      if (row.question_id && row.option_id) {
        const question = section.questions.get(row.question_id);
        const qOptions = question.options;
        if (!qOptions.some(opt => opt.id === row.option_id)) {
          qOptions.push({
            id: row.option_id,
            label: row.option_label,
            value: row.option_value
          });
          if (row.option_is_correct) {
            question.points += parseFloat(row.option_score || 0);
          }
        }
      }

      if (row.question_id && row.row_id) {
        const qRows = section.questions.get(row.question_id).rows;
        if (!qRows.some(r => r.id === row.row_id)) {
          qRows.push({
            id: row.row_id,
            label: row.row_label,
            order_index: row.row_order
          });
        }
      }
    });

    const formSchema = Array.from(sectionsMap.values()).map(sec => ({
      ...sec,
      questions: Array.from(sec.questions.values())
    }));

    res.json({ 
      success: true, 
      data: { 
        id: uuid, // Use public UUID, hide internal DB ID 
        internal_id: form.id, // Needed for Edit button mapping
        title: form.title, 
        description: form.description,
        form_mode: form.form_mode,
        form_schema: formSchema 
      } 
    });
  } catch (error) {
    console.error('Error fetching public form:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Submit public form response
 */
const submitResponse = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { uuid } = req.params;
    const { answers, email } = req.body;

    const formResult = await client.query(
      'SELECT id, status, is_public FROM forms WHERE public_url = $1', 
      [uuid]
    );
    
    if (formResult.rows.length === 0 || formResult.rows[0].status !== 'Published') {
      return res.status(403).json({ success: false, message: 'Form is not active.' });
    }
    
    const formId = formResult.rows[0].id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const responseRes = await client.query(
      `INSERT INTO form_responses (form_id, respondent_email, status, completed_at, ip_address) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4) RETURNING id`,
      [formId, email || null, 'Submitted', ipAddress]
    );
    const responseId = responseRes.rows[0].id;

    // Optional: Calculate score if Aptitude
    let totalScore = 0;

    // Fetch question types to properly route answers
    const qInfoRes = await client.query(`SELECT id, type, is_required, config FROM form_questions WHERE form_id = $1`, [formId]);
    const qTypes = {};
    const qRequired = {};
    const qConfig = {};
    qInfoRes.rows.forEach(r => {
      qTypes[r.id] = r.type;
      qRequired[r.id] = r.is_required;
      qConfig[r.id] = r.config || {};
    });

    // Validate Required Fields
    for (const q of qInfoRes.rows) {
      if (q.is_required) {
        const ans = answers[q.id];
        const isEmptyOptions = ['radio', 'checkbox', 'dropdown'].includes(q.type) && (!ans?.options || ans.options.length === 0);
        const isEmptyGrid = ['grid_radio', 'grid_checkbox'].includes(q.type) && (!ans?.text_value || ans.text_value === '{}');
        const isEmptyFiles = q.type === 'file_upload' && (!ans?.text_value || ans.text_value === '[]');
        const isEmptyText = !['radio', 'checkbox', 'dropdown', 'grid_radio', 'grid_checkbox', 'file_upload'].includes(q.type) && (!ans?.text_value || ans.text_value.trim() === '');
        
        if (!ans || isEmptyOptions || isEmptyGrid || isEmptyFiles || isEmptyText) {
          throw new Error(`Required question missing answer: ${q.id}`);
        }
      }
    }

    // answers format: { "question_id_uuid": { text_value: "", options: ["option_id_uuid"] } }
    for (const [qId, ans] of Object.entries(answers)) {
      const qType = qTypes[qId];
      const config = qConfig[qId] || {};
      if (!qType) continue; // Skip unknown questions

      const qRes = await client.query(
        `INSERT INTO response_answers (response_id, question_id, text_value) 
         VALUES ($1, $2, $3) RETURNING id`,
        [responseId, qId, ans.text_value || null]
      );
      const answerId = qRes.rows[0].id;

      if (qType === 'file_upload') {
        try {
          const files = JSON.parse(ans.text_value || '[]');
          if (files.length > (config.max_files || 1)) {
            throw new Error(`Exceeded max files for question ${qId}`);
          }
          for (const f of files) {
            await client.query(
              `INSERT INTO response_files (answer_id, file_url, original_name, file_size, mime_type) VALUES ($1, $2, $3, $4, $5)`,
              [answerId, f.url, f.original_name, f.file_size, f.mime_type]
            );
          }
        } catch(e) { if (e.message.includes('Exceeded')) throw e; console.error('Failed to parse files for', qId); }
      } else if (qType === 'rating' || qType === 'toggle') {
        const val = parseInt(ans.text_value || '0');
        if (val < 1 || val > 5) {
           throw new Error(`Invalid range for question ${qId}`);
        }
      } else if (qType === 'grid_radio' || qType === 'grid_checkbox') {
        try {
          const gridAns = JSON.parse(ans.text_value || '{}');
          for (const [rowId, optIds] of Object.entries(gridAns)) {
            for (const optId of optIds) {
              await client.query(
                `INSERT INTO response_grid_answers (answer_id, row_id, option_id) VALUES ($1, $2, $3)`,
                [answerId, rowId, optId]
              );
            }
          }
        } catch(e) { console.error('Failed to parse grid ans for', qId); }
      } else {
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (ans.options && Array.isArray(ans.options)) {
          for (const optId of ans.options) {
            if (!uuidRegex.test(optId)) {
              throw new Error(`Invalid Option ID format: ${optId}. Ensure the frontend is passing the option UUID, not its label.`);
            }
            await client.query(
              `INSERT INTO response_options (answer_id, option_id) VALUES ($1, $2)`,
              [answerId, optId]
            );

            // Scoring logic
            const optRes = await client.query(`SELECT score, is_correct, negative_score FROM question_options WHERE id = $1`, [optId]);
            if (optRes.rows.length > 0) {
              const o = optRes.rows[0];
              if (o.is_correct) totalScore += parseFloat(o.score || 0);
              else totalScore -= parseFloat(o.negative_score || 0);
            }
          }
        }
      }
    }

    // Update final score
    await client.query(`UPDATE form_responses SET total_score = $1 WHERE id = $2`, [totalScore, responseId]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Response submitted successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting response:', error);
    res.status(500).json({ success: false, message: 'Server error saving response.' });
  } finally {
    client.release();
  }
};

module.exports = {
  getPublicForm,
  submitResponse
};
