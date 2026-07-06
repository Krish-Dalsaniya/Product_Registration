const db = require('./src/config/db');

async function createTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS open_positions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        skills_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
        knowledge_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
        traits_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
        self_image_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
        motive_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table open_positions created successfully.');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    process.exit();
  }
}

createTable();
