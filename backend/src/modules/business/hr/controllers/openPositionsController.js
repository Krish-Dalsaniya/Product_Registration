const db = require('../../../../config/db');
const cloudinary = require('../../../../config/cloudinary');
const fs = require('fs');

/**
 * Get all open positions
 */
const getPositions = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        op.id, op.name, 
        op.skills_form_id, op.knowledge_form_id, op.traits_form_id, op.self_image_form_id, op.motive_form_id,
        op.rcd_doc, op.prerequisite_doc, op.training_doc, op.eligibility_doc, op.kpi_doc, op.kra_doc, op.lms_training_ids,
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
      motive_form_id,
      lms_training_ids
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Position name is required' });
    }

    let parsedTrainingIds = [];
    if (lms_training_ids) {
      try {
        parsedTrainingIds = typeof lms_training_ids === 'string' ? JSON.parse(lms_training_ids) : lms_training_ids;
      } catch (e) {
        console.error("Error parsing lms_training_ids:", e);
      }
    }

    const uploadedDocs = {
      rcd_doc: null,
      prerequisite_doc: null,
      training_doc: null,
      eligibility_doc: null,
      kpi_doc: null,
      kra_doc: null
    };

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (Object.keys(uploadedDocs).includes(file.fieldname)) {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              resource_type: 'auto',
              folder: 'open_positions'
            });
            uploadedDocs[file.fieldname] = result.secure_url;
            
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch (e) {
            console.error("Cloudinary upload error:", e);
          }
        }
      }
    }

    const result = await db.query(
      `INSERT INTO open_positions 
       (name, skills_form_id, knowledge_form_id, traits_form_id, self_image_form_id, motive_form_id, created_by, rcd_doc, prerequisite_doc, training_doc, eligibility_doc, kpi_doc, kra_doc, lms_training_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        name, 
        skills_form_id || null, 
        knowledge_form_id || null, 
        traits_form_id || null, 
        self_image_form_id || null, 
        motive_form_id || null, 
        req.user?.id || null,
        uploadedDocs.rcd_doc,
        uploadedDocs.prerequisite_doc,
        uploadedDocs.training_doc,
        uploadedDocs.eligibility_doc,
        uploadedDocs.kpi_doc,
        uploadedDocs.kra_doc,
        JSON.stringify(parsedTrainingIds)
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
      motive_form_id,
      lms_training_ids
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Position name is required' });
    }

    const existing = await db.query('SELECT * FROM open_positions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }

    const existingRow = existing.rows[0];

    let parsedTrainingIds = existingRow.lms_training_ids || [];
    if (lms_training_ids !== undefined) {
      try {
        parsedTrainingIds = typeof lms_training_ids === 'string' ? JSON.parse(lms_training_ids) : lms_training_ids;
      } catch (e) {
        console.error("Error parsing lms_training_ids:", e);
      }
    }

    const uploadedDocs = {
      rcd_doc: existingRow.rcd_doc,
      prerequisite_doc: existingRow.prerequisite_doc,
      training_doc: existingRow.training_doc,
      eligibility_doc: existingRow.eligibility_doc,
      kpi_doc: existingRow.kpi_doc,
      kra_doc: existingRow.kra_doc
    };

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (Object.keys(uploadedDocs).includes(file.fieldname)) {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              resource_type: 'auto',
              folder: 'open_positions'
            });
            uploadedDocs[file.fieldname] = result.secure_url;
            
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch (e) {
            console.error("Cloudinary upload error:", e);
          }
        }
      }
    }

    const result = await db.query(
      `UPDATE open_positions
       SET name = $1, skills_form_id = $2, knowledge_form_id = $3, traits_form_id = $4, self_image_form_id = $5, motive_form_id = $6, 
           rcd_doc = $7, prerequisite_doc = $8, training_doc = $9, eligibility_doc = $10, kpi_doc = $11, kra_doc = $12, lms_training_ids = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        name, 
        skills_form_id || null, 
        knowledge_form_id || null, 
        traits_form_id || null, 
        self_image_form_id || null, 
        motive_form_id || null, 
        uploadedDocs.rcd_doc,
        uploadedDocs.prerequisite_doc,
        uploadedDocs.training_doc,
        uploadedDocs.eligibility_doc,
        uploadedDocs.kpi_doc,
        uploadedDocs.kra_doc,
        JSON.stringify(parsedTrainingIds),
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
