const db = require('../../../../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Get all forms (Enterprise)
 */
const getForms = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, title as label, category, status, is_public, public_url,
        created_at, updated_at, 'dynamic' as type, form_mode
      FROM forms
      ORDER BY created_at DESC
    `);
    
    // Group forms by category for frontend compatibility
    const formsByCategory = {
      caf: [], aptitude: [], knowledge: [], skill: [], trait: [], motive: [], self_image: []
    };
    
    result.rows.forEach(form => {
      form.date = new Date(form.created_at).toLocaleDateString();
      form.fileName = 'Digital Form';
      form.fileSize = 'N/A';
      if (formsByCategory[form.category]) {
        formsByCategory[form.category].push(form);
      } else {
        formsByCategory[form.category] = [form];
      }
    });

    res.json({ success: true, data: formsByCategory });
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ success: false, message: 'Server error fetching forms' });
  }
};

/**
 * Get full form schema
 */
const getFormSchema = async (req, res) => {
  try {
    const { id } = req.params;
    
    const formResult = await db.query('SELECT * FROM forms WHERE id = $1', [id]);
    if (formResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    const form = formResult.rows[0];

    const schemaResult = await db.query(`
      SELECT 
        fs.id as section_id, fs.title as section_title, fs.description as section_description, fs.order_index as section_order,
        fq.id as question_id, fq.type, fq.label, fq.is_required, fq.order_index as question_order, fq.placeholder, fq.help_text,
        qo.id as option_id, qo.label as option_label, qo.value as option_value, qo.score, qo.is_correct
      FROM form_sections fs
      LEFT JOIN form_questions fq ON fq.section_id = fs.id
      LEFT JOIN question_options qo ON qo.question_id = fq.id
      WHERE fs.form_id = $1
      ORDER BY fs.order_index, fq.order_index, qo.order_index
    `, [id]);

    // Build hierarchical JSON schema
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
          value: row.option_value,
          score: row.score,
          is_correct: row.is_correct
        });
      }
    });

    const formSchema = Array.from(sectionsMap.values()).map(sec => ({
      ...sec,
      questions: Array.from(sec.questions.values())
    }));

    res.json({ success: true, data: { ...form, form_schema: formSchema } });
  } catch (error) {
    console.error('Error fetching form schema:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Create or Update dynamic form from JSON schema
 */
const saveDynamicForm = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params; // If ID exists, update
    const { label, category, form_schema, status, form_mode = 'assessment' } = req.body;

    let formId = id;
    if (!formId || formId === 'new') {
      const formRes = await client.query(
        `INSERT INTO forms (title, category, status, created_by, form_mode) VALUES ($1, $2, $3, $4, $5) RETURNING id, public_url`,
        [label || 'Untitled Form', category, status || 'Draft', req.user?.id || null, form_mode]
      );
      formId = formRes.rows[0].id;
    } else {
      await client.query(
        `UPDATE forms SET title = $1, status = $2, updated_at = CURRENT_TIMESTAMP, form_mode = $3 WHERE id = $4`,
        [label || 'Untitled Form', status || 'Draft', form_mode, formId]
      );
      // Only delete/recreate sections if schema was provided
      if (Array.isArray(form_schema)) {
        await client.query(`DELETE FROM form_sections WHERE form_id = $1`, [formId]);
      }
    }

    // Insert sections and questions
    if (Array.isArray(form_schema)) {
      for (let sIndex = 0; sIndex < form_schema.length; sIndex++) {
        const section = form_schema[sIndex];
        const secRes = await client.query(
          `INSERT INTO form_sections (form_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING id`,
          [formId, section.title || 'Untitled Section', section.description || '', sIndex]
        );
        const sectionId = secRes.rows[0].id;

        if (Array.isArray(section.questions)) {
          for (let qIndex = 0; qIndex < section.questions.length; qIndex++) {
            const q = section.questions[qIndex];
            const qRes = await client.query(
              `INSERT INTO form_questions (form_id, section_id, type, label, is_required, order_index, placeholder, help_text) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
              [formId, sectionId, q.type, q.label, !!q.required, qIndex, q.placeholder || '', q.help_text || '']
            );
            const questionId = qRes.rows[0].id;

            if (Array.isArray(q.options)) {
              for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
                const opt = q.options[oIndex];
                await client.query(
                  `INSERT INTO question_options (question_id, label, value, order_index, score, is_correct)
                   VALUES ($1, $2, $3, $4, $5, $6)`,
                  [questionId, opt.label, opt.value || opt.label, oIndex, opt.score || 0, !!opt.is_correct]
                );
              }
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Form saved successfully', data: { id: formId } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving dynamic form:', error);
    res.status(500).json({ success: false, message: 'Server error saving form' });
  } finally {
    client.release();
  }
};

const deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM forms WHERE id = $1', [id]);
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ success: false, message: 'Server error deleting form' });
  }
};

const publishForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_public } = req.body;
    
    const formStatus = is_public ? 'Published' : 'Draft';
    const result = await db.query(
      'UPDATE forms SET status = $1, is_public = $2 WHERE id = $3 RETURNING public_url',
      [formStatus, is_public, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Form not found' });
    
    res.json({ success: true, message: 'Form published', public_url: result.rows[0].public_url });
  } catch (error) {
    console.error('Error publishing form:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get all responses for a form
 */
const getFormResponses = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify form belongs to the requester (or any authorized user)
    const formResult = await db.query('SELECT id, title FROM forms WHERE id = $1', [id]);
    if (formResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    const responsesResult = await db.query(`
      SELECT 
        fr.id, fr.respondent_email, fr.status, fr.started_at, fr.completed_at,
        fr.total_score, fr.is_passed, fr.ip_address
      FROM form_responses fr
      WHERE fr.form_id = $1
      ORDER BY fr.completed_at DESC NULLS LAST
    `, [id]);

    // For each response, load the answers
    const responses = [];
    for (const row of responsesResult.rows) {
      const answersResult = await db.query(`
        SELECT 
          ra.id as answer_id, ra.text_value, ra.number_value, ra.date_value,
          fq.id as question_id, fq.label as question_label, fq.type as question_type,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT('label', qo.label, 'value', qo.value)
            ) FILTER (WHERE qo.id IS NOT NULL),
            '[]'
          ) as selected_options
        FROM response_answers ra
        JOIN form_questions fq ON fq.id = ra.question_id
        LEFT JOIN response_options ro ON ro.answer_id = ra.id
        LEFT JOIN question_options qo ON qo.id = ro.option_id
        WHERE ra.response_id = $1
        GROUP BY ra.id, ra.text_value, ra.number_value, ra.date_value, fq.id, fq.label, fq.type
        ORDER BY fq.order_index
      `, [row.id]);

      responses.push({
        ...row,
        answers: answersResult.rows
      });
    }

    res.json({
      success: true,
      data: {
        form: formResult.rows[0],
        total: responses.length,
        responses
      }
    });
  } catch (error) {
    console.error('Error fetching form responses:', error);
    res.status(500).json({ success: false, message: 'Server error fetching responses' });
  }
};

module.exports = {
  getForms,
  getFormSchema,
  saveDynamicForm,
  deleteForm,
  publishForm,
  getFormResponses
};
