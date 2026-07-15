const db = require('../../../../config/db');
const path = require('path');
const fs = require('fs');
const https = require('https');
const cloudinary = require('../../../../config/cloudinary');

/**
 * Get all candidate evaluation forms
 */
const getForms = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id::text, category, label, file_name as "fileName", file_size as "fileSize", 
        file_path, type, form_schema, uploaded_by, created_at, updated_at, NULL as public_url,
        'Draft' as status, false as is_public, form_mode
      FROM candidate_evaluation_forms
      UNION ALL
      SELECT 
        id::text, category, title as label, 'Digital Form' as "fileName", 'N/A' as "fileSize", 
        NULL as file_path, 'dynamic' as type, '{}'::jsonb as form_schema, created_by as uploaded_by, created_at, updated_at, public_url,
        status, is_public, form_mode
      FROM forms
      ORDER BY created_at DESC
    `);
    
    // Group forms by category
    const formsByCategory = {
      caf: [], aptitude: [], knowledge: [], skill: [], trait: [], motive: [], self_image: []
    };
    
    result.rows.forEach(form => {
      // Format date for frontend
      form.date = new Date(form.created_at).toLocaleDateString();
      if (formsByCategory[form.category]) {
        formsByCategory[form.category].push(form);
      } else {
        formsByCategory[form.category] = [form];
      }
    });

    res.json({ success: true, data: formsByCategory });
  } catch (error) {
    console.error('Error fetching CEF forms:', error);
    res.status(500).json({ success: false, message: 'Server error fetching forms' });
  }
};

/**
 * Upload a new candidate evaluation form
 */
const uploadForm = async (req, res) => {
  try {
    const { category, label, form_schema, type, form_mode = 'assessment' } = req.body;
    
    if (!category || !label) {
      // delete the file if validation fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Category and label are required' });
    }

    if (type === 'dynamic') {
      const parsedSchema = typeof form_schema === 'string' ? form_schema : JSON.stringify(form_schema);
      const result = await db.query(
        `INSERT INTO candidate_evaluation_forms 
         (category, label, type, form_schema, uploaded_by, file_name, file_path, form_mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, category, label, type, form_schema, created_at, form_mode`,
        [category, label, 'dynamic', parsedSchema, req.user?.id || null, 'digital_form', 'N/A', form_mode]
      );
      const newForm = result.rows[0];
      newForm.date = new Date(newForm.created_at).toLocaleDateString();
      return res.status(201).json({ success: true, data: newForm, message: 'Dynamic form created successfully' });
    }

    // Default File form behavior
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileSize = (req.file.size / 1024).toFixed(2) + ' KB';
    
    let fileUrl = '';
    try {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: 'hr/cef-forms',
        resource_type: 'auto'
      });
      fileUrl = uploadRes.secure_url;
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (e) {
      console.error("Cloudinary upload failed", e);
      fileUrl = path.relative(path.join(__dirname, '../../../../../../'), req.file.path);
    }

    const result = await db.query(
      `INSERT INTO candidate_evaluation_forms 
       (category, label, file_name, file_size, file_path, type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, category, label, file_name as "fileName", file_size as "fileSize", type, created_at, file_path`,
      [category, label, req.file.originalname, fileSize, fileUrl, 'file', req.user?.id || null]
    );

    const newForm = result.rows[0];
    newForm.date = new Date(newForm.created_at).toLocaleDateString();

    res.status(201).json({ success: true, data: newForm, message: 'Form uploaded successfully' });
  } catch (error) {
    console.error('Error uploading CEF form:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Server error uploading form' });
  }
};

/**
 * Update an existing form (label or file)
 */
const updateForm = async (req, res) => {
  const { id } = req.params;
  const { label, category, form_schema, form_mode = 'assessment' } = req.body;
  try {
    // Check if form exists
    const existing = await db.query('SELECT * FROM candidate_evaluation_forms WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    let query;
    let params;

    if (req.body.type === 'dynamic') {
      const parsedSchema = typeof form_schema === 'string' ? form_schema : JSON.stringify(form_schema);
      
      query = `
        UPDATE candidate_evaluation_forms
        SET label = $1, category = $2, form_schema = $3, form_mode = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, category, label, type, form_schema, created_at, form_mode
      `;
      params = [label, category, parsedSchema, form_mode, id];
    } else if (req.file) {
      // Delete old file
      const oldFilePathStr = existing.rows[0].file_path;
      if (oldFilePathStr && oldFilePathStr.includes('cloudinary.com')) {
        // Simple deletion attempt, won't block on error
      } else if (oldFilePathStr) {
        const oldFilePath = path.join(__dirname, '../../../../../../', oldFilePathStr);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }

      const fileSize = (req.file.size / 1024).toFixed(2) + ' KB';
      
      let fileUrl = '';
      try {
        const uploadRes = await cloudinary.uploader.upload(req.file.path, {
          folder: 'hr/cef-forms',
          resource_type: 'auto'
        });
        fileUrl = uploadRes.secure_url;
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Cloudinary upload failed", e);
        fileUrl = path.relative(path.join(__dirname, '../../../../../../'), req.file.path);
      }

      query = `
        UPDATE candidate_evaluation_forms
        SET label = $1, file_name = $2, file_size = $3, file_path = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, category, label, file_name as "fileName", file_size as "fileSize", type, created_at, file_path
      `;
      params = [label, req.file.originalname, fileSize, fileUrl, id];
    } else {
      query = `
        UPDATE candidate_evaluation_forms
        SET label = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, category, label, file_name as "fileName", file_size as "fileSize", type, form_schema, created_at, file_path
      `;
      params = [label, id];
    }

    const result = await db.query(query, params);
    const updatedForm = result.rows[0];
    updatedForm.date = new Date(updatedForm.created_at).toLocaleDateString();

    res.json({ success: true, data: updatedForm, message: 'Form updated successfully' });
  } catch (error) {
    console.error('Error updating CEF form:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Server error updating form' });
  }
};

/**
 * Delete a form
 */
const deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    const isUUID = isNaN(id);

    if (isUUID) {
      const existing = await db.query('SELECT * FROM forms WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Form not found' });
      }
      await db.query('DELETE FROM forms WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Form deleted successfully' });
    }

    const existing = await db.query('SELECT * FROM candidate_evaluation_forms WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    // Delete file
    const oldFilePathStr = existing.rows[0].file_path;
    if (oldFilePathStr && !oldFilePathStr.includes('cloudinary.com') && oldFilePathStr !== 'N/A') {
      const filePath = path.join(__dirname, '../../../../../../', oldFilePathStr);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete record from DB
    await db.query('DELETE FROM candidate_evaluation_forms WHERE id = $1', [id]);

    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting CEF form:', error);
    res.status(500).json({ success: false, message: 'Server error deleting form' });
  }
};

/**
 * Download a form file
 */
const downloadForm = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM candidate_evaluation_forms WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    const form = existing.rows[0];
    
    if (form.type === 'dynamic') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      res.setHeader('Content-Disposition', `attachment; filename="${(form.label || 'form').replace(/\s+/g, '_')}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');

      doc.pipe(res);
      
      doc.fontSize(20).font('Helvetica-Bold').text(form.label || 'Dynamic Form', { align: 'center' });
      doc.moveDown(2);

      const schema = typeof form.form_schema === 'string' ? JSON.parse(form.form_schema) : form.form_schema;
      
      if (schema && Array.isArray(schema)) {
        const startX = doc.page.margins.left;
        schema.forEach((q, index) => {
          doc.x = startX;
          doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${q.label}${q.required ? ' *' : ''}`);
          doc.moveDown(0.5);
          
          doc.fontSize(10).font('Helvetica');
          const currentY = doc.y;
          
          if (q.type === 'short_text') {
            doc.rect(startX, currentY, 400, 20).stroke();
            doc.y = currentY + 30;
          } else if (q.type === 'long_text') {
            doc.rect(startX, currentY, 400, 60).stroke();
            doc.y = currentY + 70;
          } else if (q.type === 'number') {
            doc.rect(startX, currentY, 200, 20).stroke();
            doc.y = currentY + 30;
          } else if (q.type === 'dropdown') {
            doc.rect(startX, currentY, 200, 20).stroke();
            doc.text('Select an option...', startX + 5, currentY + 6);
            doc.y = currentY + 30;
            doc.x = startX;
          } else if (q.type === 'radio' || q.type === 'checkbox') {
            if (q.options && Array.isArray(q.options)) {
              q.options.forEach(opt => {
                const optY = doc.y;
                if (q.type === 'radio') {
                  doc.circle(startX + 5, optY + 5, 5).stroke();
                } else {
                  doc.rect(startX, optY + 2, 10, 10).stroke();
                }
                doc.text(opt, startX + 20, optY + 2);
                doc.x = startX;
                doc.moveDown(0.2);
              });
            }
            doc.moveDown(0.5);
          } else {
            doc.moveDown(1);
          }
        });
      } else {
        doc.fontSize(12).font('Helvetica').text('This form has no questions.');
      }
      
      doc.end();
      return;
    }

    if (form.file_path && form.file_path.includes('cloudinary.com')) {
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      res.setHeader('Content-Disposition', `attachment; filename="${form.file_name}"`);
      https.get(form.file_path, (stream) => {
        stream.pipe(res);
      }).on('error', (e) => {
        console.error('Error downloading from Cloudinary:', e);
        res.status(500).json({ success: false, message: 'Error downloading form' });
      });
      return;
    }

    const filePath = path.join(__dirname, '../../../../../../', form.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.download(filePath, form.file_name);
  } catch (error) {
    console.error('Error downloading CEF form:', error);
    res.status(500).json({ success: false, message: 'Server error downloading form' });
  }
};

/**
 * View a form file in browser
 */
const viewForm = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM candidate_evaluation_forms WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    const form = existing.rows[0];
    
    if (form.file_path && form.file_path.includes('cloudinary.com')) {
      return res.redirect(form.file_path);
    }

    const filePath = path.join(__dirname, '../../../../../../', form.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error viewing CEF form:', error);
    res.status(500).json({ success: false, message: 'Server error viewing form' });
  }
};

module.exports = {
  getForms,
  uploadForm,
  updateForm,
  deleteForm,
  downloadForm,
  viewForm
};
