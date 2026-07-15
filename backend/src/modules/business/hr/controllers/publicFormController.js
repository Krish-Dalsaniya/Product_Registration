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
      'SELECT id, title, description, status, is_public FROM forms WHERE public_url = $1', 
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
        fs.id as section_id, fs.title as section_title, fs.description as section_description, fs.order_index as section_order,
        fq.id as question_id, fq.type, fq.label, fq.is_required, fq.order_index as question_order, fq.placeholder, fq.help_text,
        qo.id as option_id, qo.label as option_label, qo.value as option_value
      FROM form_sections fs
      LEFT JOIN form_questions fq ON fq.section_id = fs.id
      LEFT JOIN question_options qo ON qo.question_id = fq.id
      WHERE fs.form_id = $1
      ORDER BY fs.order_index, fq.order_index, qo.order_index
    `, [form.id]);

    const sectionsMap = new Map();
    schemaResult.rows.forEach(row => {
      if (!sectionsMap.has(row.section_id)) {
        sectionsMap.set(row.section_id, {
          id: row.section_id,
          title: row.section_title,
          description: row.section_description,
          questions: new Map()
        });
      }
      
      const section = sectionsMap.get(row.section_id);
      
      if (row.question_id && !section.questions.has(row.question_id)) {
        section.questions.set(row.question_id, {
          id: row.question_id,
          type: row.type,
          label: row.label,
          required: row.is_required,
          placeholder: row.placeholder,
          help_text: row.help_text,
          options: []
        });
      }

      if (row.question_id && row.option_id) {
        section.questions.get(row.question_id).options.push({
          id: row.option_id,
          label: row.option_label,
          value: row.option_value
        });
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
        title: form.title, 
        description: form.description,
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

    // answers format: { "question_id_uuid": { text_value: "", options: ["option_id_uuid"] } }
    for (const [qId, ans] of Object.entries(answers)) {
      const qRes = await client.query(
        `INSERT INTO response_answers (response_id, question_id, text_value) 
         VALUES ($1, $2, $3) RETURNING id`,
        [responseId, qId, ans.text_value || null]
      );
      const answerId = qRes.rows[0].id;

      if (ans.options && Array.isArray(ans.options)) {
        for (const optId of ans.options) {
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
