const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const getElectronicsParts = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { search } = req.query;

  try {
    let queryText = `
      SELECT p.*, COUNT(*) OVER() as total_count 
      FROM ELECTRONICS_PART_MASTER p
      WHERE p.is_active = TRUE
    `;
    const params = [limit, offset];

    if (search) {
      queryText += ` AND (p.part_name ILIKE $3 OR p.part_number ILIKE $3 OR p.part_category ILIKE $3)`;
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`;

    const result = await db.query(queryText, params);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    sendSuccess(res, result.rows.map(({ total_count, ...rest }) => rest), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getElectronicsPartById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const partResult = await db.query(`
            SELECT * FROM ELECTRONICS_PART_MASTER WHERE part_id = $1 AND is_active = TRUE
        `, [id]);

        if (partResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Electronics Part not found' } });
        }

        const part = partResult.rows[0];

        const techSpecResult = await db.query('SELECT * FROM ELECTRONICS_TECH_SPEC WHERE part_id = $1', [id]);
        const catSpecResult = await db.query('SELECT * FROM ELECTRONICS_CATEGORY_SPEC WHERE part_id = $1', [id]);
        const filesResult = await db.query('SELECT * FROM ELECTRONICS_FILES WHERE part_id = $1', [id]);
        const imagesResult = await db.query('SELECT image_url FROM ELECTRONICS_IMAGES WHERE part_id = $1', [id]);

        sendSuccess(res, {
            ...part,
            techSpec: techSpecResult.rows[0] || {},
            categorySpec: catSpecResult.rows[0] || {},
            files: filesResult.rows[0] || {},
            part_images: imagesResult.rows.map(row => row.image_url)
        });
    } catch (error) {
        next(error);
    }
};

const createElectronicsPart = async (req, res, next) => {
    const {
        // General
        part_category, part_name, part_number, internal_sku, manufacturer, part_type, part_description, used_in_product, status,
        // Tech Spec
        rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight,
        // Category Spec
        category_name, spec_data
    } = req.body;

    try {
        await db.query('BEGIN');

        // 1. Create Master
        const masterResult = await db.query(
            `INSERT INTO ELECTRONICS_PART_MASTER 
            (part_category, part_name, part_number, internal_sku, manufacturer, part_type, part_description, used_in_product, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [part_category, part_name, part_number, internal_sku, manufacturer, part_type, part_description, used_in_product, status || 'Active']
        );
        const partId = masterResult.rows[0].part_id;

        // 2. Tech Spec
        await db.query(
            `INSERT INTO ELECTRONICS_TECH_SPEC 
            (part_id, rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [partId, rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight]
        );

        // 3. Category Spec
        if (category_name && spec_data) {
            await db.query(
                `INSERT INTO ELECTRONICS_CATEGORY_SPEC (part_id, category_name, spec_data) VALUES ($1, $2, $3)`,
                [partId, category_name, typeof spec_data === 'string' ? spec_data : JSON.stringify(spec_data)]
            );
        }

        // 4. Files
        if (req.files) {
            const files = req.files;
            await db.query(
                `INSERT INTO ELECTRONICS_FILES 
                (part_id, datasheet_url, wiring_diagram_url, user_manual_url, test_report_url, calibration_cert_url, warranty_cert_url, invoice_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    partId,
                    files['file_datasheet'] ? files['file_datasheet'][0].path : null,
                    files['file_wiring'] ? files['file_wiring'][0].path : null,
                    files['file_manual'] ? files['file_manual'][0].path : null,
                    files['file_test_report'] ? files['file_test_report'][0].path : null,
                    files['file_calib_cert'] ? files['file_calib_cert'][0].path : null,
                    files['file_warranty'] ? files['file_warranty'][0].path : null,
                    files['file_invoice'] ? files['file_invoice'][0].path : null
                ]
            );

            // Images
            if (files['part_images'] && files['part_images'].length > 0) {
                for (const img of files['part_images']) {
                    await db.query(
                        `INSERT INTO ELECTRONICS_IMAGES (part_id, image_url) VALUES ($1, $2)`,
                        [partId, img.path]
                    );
                }
            }
        } else {
             // ensure record exists even without files
             await db.query(`INSERT INTO ELECTRONICS_FILES (part_id) VALUES ($1)`, [partId]);
        }

        await db.query('COMMIT');
        sendSuccess(res, masterResult.rows[0], 'Electronics Part registered successfully', 201);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Electronics Part Creation Error:', error);
        next(error);
    }
};

const updateElectronicsPart = async (req, res, next) => {
    const { id } = req.params;
    const {
        part_category, part_name, part_number, internal_sku, manufacturer, part_type, part_description, used_in_product, status,
        rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight,
        category_name, spec_data
    } = req.body;

    try {
        await db.query('BEGIN');

        // 1. Update Master
        await db.query(
            `UPDATE ELECTRONICS_PART_MASTER SET
            part_category = $1, part_name = $2, part_number = $3, internal_sku = $4, manufacturer = $5, part_type = $6, part_description = $7, used_in_product = $8, status = $9, updated_at = NOW()
            WHERE part_id = $10`,
            [part_category, part_name, part_number, internal_sku, manufacturer, part_type, part_description, used_in_product, status, id]
        );

        // 2. Tech Spec
        const existingTechSpec = await db.query('SELECT spec_id FROM ELECTRONICS_TECH_SPEC WHERE part_id = $1', [id]);
        if (existingTechSpec.rows.length > 0) {
            await db.query(
                `UPDATE ELECTRONICS_TECH_SPEC SET
                rated_voltage = $1, rated_current = $2, power_rating = $3, input_type = $4, output_type = $5, connector_type = $6, communication_iface = $7, mounting_type = $8, operating_temp = $9, protection_rating = $10, dimensions = $11, weight = $12
                WHERE part_id = $13`,
                [rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight, id]
            );
        } else {
             await db.query(
                `INSERT INTO ELECTRONICS_TECH_SPEC 
                (part_id, rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [id, rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight]
            );
        }

        // 3. Category Spec
        if (category_name && spec_data) {
            const parsedSpecData = typeof spec_data === 'string' ? spec_data : JSON.stringify(spec_data);
            const existingCatSpec = await db.query('SELECT cat_spec_id FROM ELECTRONICS_CATEGORY_SPEC WHERE part_id = $1', [id]);
            if (existingCatSpec.rows.length > 0) {
                await db.query(
                    `UPDATE ELECTRONICS_CATEGORY_SPEC SET category_name = $1, spec_data = $2 WHERE part_id = $3`,
                    [category_name, parsedSpecData, id]
                );
            } else {
                await db.query(
                    `INSERT INTO ELECTRONICS_CATEGORY_SPEC (part_id, category_name, spec_data) VALUES ($1, $2, $3)`,
                    [id, category_name, parsedSpecData]
                );
            }
        }

        // 4. Files
        if (req.files && Object.keys(req.files).length > 0) {
            const files = req.files;
            const existingFiles = await db.query('SELECT file_id FROM ELECTRONICS_FILES WHERE part_id = $1', [id]);
            
            if (existingFiles.rows.length > 0) {
                let updateParts = [];
                let params = [id];
                let idx = 2;

                const mapping = {
                    file_datasheet: 'datasheet_url',
                    file_wiring: 'wiring_diagram_url',
                    file_manual: 'user_manual_url',
                    file_test_report: 'test_report_url',
                    file_calib_cert: 'calibration_cert_url',
                    file_warranty: 'warranty_cert_url',
                    file_invoice: 'invoice_url'
                };

                Object.keys(mapping).forEach(field => {
                    if (files[field]) {
                        updateParts.push(`${mapping[field]} = $${idx++}`);
                        params.push(files[field][0].path);
                    }
                });

                if (updateParts.length > 0) {
                    await db.query(`UPDATE ELECTRONICS_FILES SET ${updateParts.join(', ')} WHERE part_id = $1`, params);
                }
            } else {
                await db.query(
                    `INSERT INTO ELECTRONICS_FILES 
                    (part_id, datasheet_url, wiring_diagram_url, user_manual_url, test_report_url, calibration_cert_url, warranty_cert_url, invoice_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        id,
                        files['file_datasheet'] ? files['file_datasheet'][0].path : null,
                        files['file_wiring'] ? files['file_wiring'][0].path : null,
                        files['file_manual'] ? files['file_manual'][0].path : null,
                        files['file_test_report'] ? files['file_test_report'][0].path : null,
                        files['file_calib_cert'] ? files['file_calib_cert'][0].path : null,
                        files['file_warranty'] ? files['file_warranty'][0].path : null,
                        files['file_invoice'] ? files['file_invoice'][0].path : null
                    ]
                );
            }

            // Images
            if (files['part_images'] && files['part_images'].length > 0) {
                // Delete existing images for simplicity, or just append
                // Let's just append for now
                for (const img of files['part_images']) {
                    await db.query(
                        `INSERT INTO ELECTRONICS_IMAGES (part_id, image_url) VALUES ($1, $2)`,
                        [id, img.path]
                    );
                }
            }
        }

        await db.query('COMMIT');
        sendSuccess(res, null, 'Electronics Part updated successfully');
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Electronics Part Update Error:', error);
        next(error);
    }
};

const deleteElectronicsPart = async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE ELECTRONICS_PART_MASTER SET is_active = FALSE WHERE part_id = $1', [id]);
        sendSuccess(res, null, 'Electronics Part deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
  getElectronicsParts,
  getElectronicsPartById,
  createElectronicsPart,
  updateElectronicsPart,
  deleteElectronicsPart
};
