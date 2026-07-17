const db = require('./src/config/db');

async function test() {
  // Get a form that has questions with layout config
  const r = await db.query(`
    SELECT f.id, f.public_url FROM forms f
    JOIN form_questions q ON q.form_id = f.id
    WHERE q.config ? 'layout'
    LIMIT 1
  `);
  
  if (r.rows.length === 0) {
    console.log('No forms with layout data found');
    return;
  }
  
  const form = r.rows[0];
  console.log('Testing form:', form.id, 'public_url:', form.public_url);
  
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
  });

  const formSchema = Array.from(sectionsMap.values()).map(sec => ({
    ...sec,
    questions: Array.from(sec.questions.values())
  }));

  console.log('\nFORM SCHEMA:');
  formSchema.forEach(sec => {
    console.log('Section:', sec.id, 'layout:', sec.layout, 'section_type:', sec.section_type);
    sec.questions.forEach(q => {
      console.log('  Question:', q.id, 'type:', q.type, 'layout:', q.layout, 'config:', q.config);
    });
  });
}

test().catch(console.error).finally(() => db.pool.end());
