const { pool } = require('./src/config/db');
(async () => {
  try {
    const sectionId = 'd80a1c97-6a45-423b-a912-32a514d3f23a';
    const formId = '6051f11f-51cc-42b6-ab77-c2b9d84adc2a';
    
    await pool.query('DELETE FROM form_sections WHERE id = $1', [sectionId]);
    
    await pool.query(
      `INSERT INTO form_sections (id, form_id, title, description, order_index, is_archived, section_type, config) 
       VALUES ($1, $2, $3, $4, $5, false, $6, $7) 
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, order_index = EXCLUDED.order_index, section_type = EXCLUDED.section_type, config = EXCLUDED.config, is_archived = false`,
      [sectionId, formId, 'Test Upsert', 'Desc', 0, 'mixed', { layout: { w: 2 } }]
    );
    console.log('UPSERT SUCCESSFUL!');
  } catch (err) {
    console.error('UPSERT FAILED:', err.message);
  } finally {
    pool.end();
  }
})();
