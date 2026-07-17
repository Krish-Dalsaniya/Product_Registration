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
        s.id AS section_id, s.title AS section_title, s.description AS section_description, s.order_index AS section_order, s.section_type, s.config AS section_config,
        q.id AS question_id, q.type, q.label, q.is_required, q.order_index AS question_order, 
        q.placeholder, q.help_text, q.config,
        o.id AS option_id, o.label AS option_label, o.value AS option_value, o.score, o.is_correct,
        r.id AS row_id, r.label AS row_label, r.order_index AS row_order
      FROM form_sections s
      LEFT JOIN form_questions q ON q.section_id = s.id AND q.is_archived = false
      LEFT JOIN question_options o ON o.question_id = q.id AND o.is_archived = false
      LEFT JOIN question_rows r ON r.question_id = q.id
      WHERE s.form_id = $1 AND s.is_archived = false
      ORDER BY s.order_index, q.order_index, o.order_index, r.order_index
    `, [id]);

    // Build hierarchical JSON schema
    const sectionsMap = new Map();
    schemaResult.rows.forEach(row => {
      if (!sectionsMap.has(row.section_id)) {
        const secConfig = row.section_config || {};
        sectionsMap.set(row.section_id, {
          id: row.section_id,
          title: row.section_title,
          description: row.section_description,
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
          options: [],
          rows: []
        });
      }

      if (row.question_id && row.option_id) {
        const qOptions = section.questions.get(row.question_id).options;
        if (!qOptions.some(opt => opt.id === row.option_id)) {
          qOptions.push({
            id: row.option_id,
            label: row.option_label,
            value: row.option_value,
            score: row.score,
            is_correct: row.is_correct
          });
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
    const { id } = req.params; 
    const { label, category, form_schema, status, form_mode = 'assessment' } = req.body;

    let formId = id;
    let isNewVersion = false;

    if (!formId || formId === 'new') {
      const formRes = await client.query(
        `INSERT INTO forms (title, category, status, created_by, form_mode) VALUES ($1, $2, $3, $4, $5) RETURNING id, public_url`,
        [label || 'Untitled Form', category, status || 'Draft', req.user?.id || null, form_mode]
      );
      formId = formRes.rows[0].id;
    } else {
      // Check if existing form is published
      const currentForm = await client.query(`SELECT status FROM forms WHERE id = $1`, [formId]);
      
      if (currentForm.rows.length > 0 && currentForm.rows[0].status === 'Published') {
        // Form is immutable. Create a new version as Draft.
        const formRes = await client.query(
          `INSERT INTO forms (title, category, status, created_by, form_mode) VALUES ($1, $2, 'Draft', $3, $4) RETURNING id, public_url`,
          [`${label || 'Untitled Form'} (Draft Version)`, category, req.user?.id || null, form_mode]
        );
        formId = formRes.rows[0].id;
        isNewVersion = true;
      } else {
        await client.query(
          `UPDATE forms SET title = $1, status = $2, updated_at = CURRENT_TIMESTAMP, form_mode = $3 WHERE id = $4`,
          [label || 'Untitled Form', status || 'Draft', form_mode, formId]
        );
      }
    }

    // Insert sections and questions using UPSERT
    if (Array.isArray(form_schema)) {
      const activeSectionIds = [];
      const activeQuestionIds = [];
      const activeOptionIds = [];

      for (let sIndex = 0; sIndex < form_schema.length; sIndex++) {
        const section = form_schema[sIndex];
        let sectionId = section.id;

        // If new version, generate new UUIDs for everything by omitting the old ones
        if (isNewVersion || !sectionId || sectionId.startsWith('sec_')) {
          const secRes = await client.query(
            `INSERT INTO form_sections (form_id, title, description, order_index, is_archived, section_type, config) VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING id`,
            [formId, section.title || 'Untitled Section', section.description || '', sIndex, section.section_type || 'mixed', section.layout ? { layout: section.layout } : {}]
          );
          sectionId = secRes.rows[0].id;
        } else {
          await client.query(
            `INSERT INTO form_sections (id, form_id, title, description, order_index, is_archived, section_type, config) 
             VALUES ($1, $2, $3, $4, $5, false, $6, $7) 
             ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, order_index = EXCLUDED.order_index, section_type = EXCLUDED.section_type, config = EXCLUDED.config, is_archived = false`,
            [sectionId, formId, section.title || 'Untitled Section', section.description || '', sIndex, section.section_type || 'mixed', section.layout ? { layout: section.layout } : {}]
          );
        }
        activeSectionIds.push(sectionId);

        if (Array.isArray(section.questions)) {
          for (let qIndex = 0; qIndex < section.questions.length; qIndex++) {
            const q = section.questions[qIndex];
            let questionId = q.id;
            const qConfig = q.config || {};
            if (q.layout) qConfig.layout = q.layout;

            if (isNewVersion || !questionId || questionId.startsWith('q_')) {
              const qRes = await client.query(
                `INSERT INTO form_questions (form_id, section_id, type, label, is_required, order_index, placeholder, help_text, config, is_archived) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false) RETURNING id`,
                [formId, sectionId, q.type, q.label, !!q.required, qIndex, q.placeholder || '', q.help_text || '', qConfig]
              );
              questionId = qRes.rows[0].id;
            } else {
              await client.query(
                `INSERT INTO form_questions (id, form_id, section_id, type, label, is_required, order_index, placeholder, help_text, config, is_archived) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false) 
                 ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, label = EXCLUDED.label, is_required = EXCLUDED.is_required, order_index = EXCLUDED.order_index, help_text = EXCLUDED.help_text, config = EXCLUDED.config, is_archived = false`,
                [questionId, formId, sectionId, q.type, q.label, !!q.required, qIndex, q.placeholder || '', q.help_text || '', qConfig]
              );
            }
            activeQuestionIds.push(questionId);

            if (Array.isArray(q.options)) {
              for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
                const opt = q.options[oIndex];
                let optionId = opt.id;

                if (isNewVersion || !optionId) {
                  const oRes = await client.query(
                    `INSERT INTO question_options (question_id, label, value, order_index, score, is_correct, is_archived)
                     VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING id`,
                    [questionId, opt.label, opt.value || opt.label, oIndex, opt.score || 0, !!opt.is_correct]
                  );
                  optionId = oRes.rows[0].id;
                } else {
                  await client.query(
                    `INSERT INTO question_options (id, question_id, label, value, order_index, score, is_correct, is_archived)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, false)
                     ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, value = EXCLUDED.value, order_index = EXCLUDED.order_index, score = EXCLUDED.score, is_correct = EXCLUDED.is_correct, is_archived = false`,
                    [optionId, questionId, opt.label, opt.value || opt.label, oIndex, opt.score || 0, !!opt.is_correct]
                  );
                }
                activeOptionIds.push(optionId);
              }
            }

            if (Array.isArray(q.rows)) {
              for (let rIndex = 0; rIndex < q.rows.length; rIndex++) {
                const row = q.rows[rIndex];
                let rowId = row.id;

                if (isNewVersion || !rowId) {
                  const rRes = await client.query(
                    `INSERT INTO question_rows (question_id, label, order_index, is_archived)
                     VALUES ($1, $2, $3, false) RETURNING id`,
                    [questionId, row.label, rIndex]
                  );
                  rowId = rRes.rows[0].id;
                } else {
                  await client.query(
                    `INSERT INTO question_rows (id, question_id, label, order_index, is_archived)
                     VALUES ($1, $2, $3, $4, false)
                     ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, order_index = EXCLUDED.order_index, is_archived = false`,
                    [rowId, questionId, row.label, rIndex]
                  );
                }
                // No activeRowIds tracking yet, assuming rows aren't fully deleted but archived in a similar manner in future
              }
            }
          }
        }
      }

      // Archive missing items instead of deleting
      if (!isNewVersion) {
        if (activeOptionIds.length > 0) {
          await client.query(`UPDATE question_options SET is_archived = true WHERE question_id IN (SELECT id FROM form_questions WHERE form_id = $1) AND id != ALL($2::uuid[])`, [formId, activeOptionIds]);
        } else {
          await client.query(`UPDATE question_options SET is_archived = true WHERE question_id IN (SELECT id FROM form_questions WHERE form_id = $1)`, [formId]);
        }
        
        if (activeQuestionIds.length > 0) {
          await client.query(`UPDATE form_questions SET is_archived = true WHERE form_id = $1 AND id != ALL($2::uuid[])`, [formId, activeQuestionIds]);
        } else {
          await client.query(`UPDATE form_questions SET is_archived = true WHERE form_id = $1`, [formId]);
        }
        
        if (activeSectionIds.length > 0) {
          await client.query(`UPDATE form_sections SET is_archived = true WHERE form_id = $1 AND id != ALL($2::uuid[])`, [formId, activeSectionIds]);
        } else {
          await client.query(`UPDATE form_sections SET is_archived = true WHERE form_id = $1`, [formId]);
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: isNewVersion ? 'New draft version created' : 'Form saved successfully', data: { id: formId } });
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

      // Fetch file uploads and grid answers
      for (const ans of answersResult.rows) {
        if (ans.question_type === 'file_upload') {
          const files = await db.query(`SELECT file_url, original_name, file_size, mime_type FROM response_files WHERE answer_id = $1`, [ans.answer_id]);
          ans.files = files.rows;
        } else if (ans.question_type === 'grid_radio' || ans.question_type === 'grid_checkbox') {
          const grids = await db.query(`
            SELECT qr.label as row_label, qo.label as option_label
            FROM response_grid_answers rga
            JOIN question_rows qr ON rga.row_id = qr.id
            JOIN question_options qo ON rga.option_id = qo.id
            WHERE rga.answer_id = $1
          `, [ans.answer_id]);
          ans.grid_answers = grids.rows;
        }
      }

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
