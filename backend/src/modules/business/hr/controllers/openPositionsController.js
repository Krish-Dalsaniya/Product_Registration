const db = require('../../../../config/db');

/**
 * Get all open positions
 */
const getPositions = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        op.id, op.name, 
        op.skills_form_id, op.knowledge_form_id, op.traits_form_id, op.self_image_form_id, op.motive_form_id,
        sf.label as skills_form_label,
        kf.label as knowledge_form_label,
        tf.label as traits_form_label,
        sif.label as self_image_form_label,
        mf.label as motive_form_label,
        op.created_at, op.updated_at
      FROM open_positions op
      LEFT JOIN candidate_evaluation_forms sf ON op.skills_form_id = sf.id
      LEFT JOIN candidate_evaluation_forms kf ON op.knowledge_form_id = kf.id
      LEFT JOIN candidate_evaluation_forms tf ON op.traits_form_id = tf.id
      LEFT JOIN candidate_evaluation_forms sif ON op.self_image_form_id = sif.id
      LEFT JOIN candidate_evaluation_forms mf ON op.motive_form_id = mf.id
      ORDER BY op.created_at DESC
    `);
    
    // Format dates and structure
    const formatted = result.rows.map(pos => ({
      ...pos,
      date: new Date(pos.created_at).toLocaleDateString()
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching open positions:', error);
    res.status(500).json({ success: false, message: 'Server error fetching positions' });
  }
};

/**
 * Create a new position
 */
const createPosition = async (req, res) => {
  try {
    const { 
      name, 
      skills_form_id, 
      knowledge_form_id, 
      traits_form_id, 
      self_image_form_id, 
      motive_form_id 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Position name is required' });
    }

    const result = await db.query(
      `INSERT INTO open_positions 
       (name, skills_form_id, knowledge_form_id, traits_form_id, self_image_form_id, motive_form_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name, 
        skills_form_id || null, 
        knowledge_form_id || null, 
        traits_form_id || null, 
        self_image_form_id || null, 
        motive_form_id || null, 
        req.user?.id || null
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Position created successfully' });
  } catch (error) {
    console.error('Error creating open position:', error);
    res.status(500).json({ success: false, message: 'Server error creating position' });
  }
};

/**
 * Update an existing position
 */
const updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      skills_form_id, 
      knowledge_form_id, 
      traits_form_id, 
      self_image_form_id, 
      motive_form_id 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Position name is required' });
    }

    const existing = await db.query('SELECT * FROM open_positions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }

    const result = await db.query(
      `UPDATE open_positions
       SET name = $1, skills_form_id = $2, knowledge_form_id = $3, traits_form_id = $4, self_image_form_id = $5, motive_form_id = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        name, 
        skills_form_id || null, 
        knowledge_form_id || null, 
        traits_form_id || null, 
        self_image_form_id || null, 
        motive_form_id || null, 
        id
      ]
    );

    res.json({ success: true, data: result.rows[0], message: 'Position updated successfully' });
  } catch (error) {
    console.error('Error updating open position:', error);
    res.status(500).json({ success: false, message: 'Server error updating position' });
  }
};

/**
 * Delete a position
 */
const deletePosition = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM open_positions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }

    await db.query('DELETE FROM open_positions WHERE id = $1', [id]);

    res.json({ success: true, message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ success: false, message: 'Server error deleting position' });
  }
};

module.exports = {
  getPositions,
  createPosition,
  updatePosition,
  deletePosition
};
