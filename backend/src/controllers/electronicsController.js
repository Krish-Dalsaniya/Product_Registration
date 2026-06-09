const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const getElectronicsParts = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { search } = req.query;

  try {
    let queryText = `
      SELECT p.*, 
      (SELECT image_url FROM ELECTRONICS_IMAGES WHERE part_id = p.part_id LIMIT 1) as image_url,
      COUNT(*) OVER() as total_count 
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
        
        // Dynamic Category Fetching
        const catSpecResult = await db.query('SELECT * FROM ELECTRONICS_CATEGORY_SPEC WHERE part_id = $1', [id]);
        let categoryData = catSpecResult.rows[0] || {};
        const catName = categoryData.category_name;

        // Specialized Table Fetching Mapping
        const tableMap = {
            'Battery': 'battery_specs',
            'Flow Meter': 'flow_meter_specs',
            'SMPS': 'smps_specs',
            'Printer': 'printer_specs',
            'Speaker': 'speaker_specs',
            'Amplifier': 'amplifier_specs',
            'Temperature Sensor': 'temperature_sensor_specs',
            'Quality Sensor': 'quality_sensor_specs',
            'Pressure Sensor': 'pressure_sensor_specs',
            'EMI-EMC Filter': 'emi_emc_filter_specs',
            'DC Meter': 'dc_meter_specs'
        };

        if (catName && tableMap[catName]) {
            const specRes = await db.query(`SELECT * FROM ${tableMap[catName]} WHERE part_id = $1`, [id]);
            if (specRes.rows[0]) {
                categoryData.spec_data = specRes.rows[0];
            }
        }

        const filesResult = await db.query('SELECT * FROM ELECTRONICS_FILES WHERE part_id = $1', [id]);
        const imagesResult = await db.query('SELECT image_url FROM ELECTRONICS_IMAGES WHERE part_id = $1', [id]);

        sendSuccess(res, {
            ...part,
            techSpec: techSpecResult.rows[0] || {},
            categorySpec: categoryData,
            files: filesResult.rows[0] || {},
            part_images: imagesResult.rows.map(row => row.image_url),
            custom_params: part.custom_params || {}
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
        await db.withTransaction(async (client) => {
            // 1. Create Master
            const masterResult = await client.query(
                `INSERT INTO ELECTRONICS_PART_MASTER 
                (part_category, part_name, part_number, internal_sku, manufacturer, part_type, part_description, used_in_product, status, stock_quantity) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [part_category, part_name, part_number, internal_sku, manufacturer, part_type, part_description, used_in_product, status || 'Active', req.body.stock_quantity || 0]
            );
            const partId = masterResult.rows[0].part_id;

            // 2. Tech Spec
            await client.query(
                `INSERT INTO ELECTRONICS_TECH_SPEC 
                (part_id, rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [partId, rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight]
            );

            // 3. Category Spec & Specialized Routing
            if (category_name && spec_data) {
                const parsedData = typeof spec_data === 'string' ? JSON.parse(spec_data) : spec_data;
                
                await client.query(
                    `INSERT INTO ELECTRONICS_CATEGORY_SPEC (part_id, category_name, spec_data) VALUES ($1, $2, $3)`,
                    [partId, category_name, JSON.stringify(parsedData)]
                );

                // Mapping definitions for specialized tables
                const mapping = {
                    'Battery': { table: 'battery_specs', columns: ['battery_chemistry', 'battery_voltage', 'battery_capacity', 'cell_count', 'rechargeable', 'charging_voltage', 'max_charging_current', 'max_discharge_current', 'backup_time', 'battery_connector_type', 'cycle_life', 'bms_available'] },
                    'Flow Meter': { table: 'flow_meter_specs', columns: ['flow_meter_type', 'flow_range', 'accuracy', 'pulse_output', 'pulses_per_liter', 'k_factor', 'fluid_compatibility', 'inlet_size', 'outlet_size', 'max_pressure', 'calibration_required', 'calibration_cert_no'] },
                    'SMPS': { table: 'smps_specs', columns: ['input_voltage_range', 'output_voltage', 'output_current', 'output_power', 'efficiency', 'num_outputs', 'protection', 'cooling_type', 'smps_type', 'ripple_noise'] },
                    'Printer': { table: 'printer_specs', columns: ['printer_type', 'printer_model', 'print_width', 'paper_roll_size', 'print_speed', 'interface', 'baud_rate', 'cutter_available', 'paper_sensor_available', 'operating_voltage', 'supported_language'] },
                    'Speaker': { table: 'speaker_specs', columns: ['speaker_type', 'power_rating', 'impedance', 'frequency_range', 'sound_level', 'operating_voltage', 'connector_type', 'mounting_type'] },
                    'Amplifier': { table: 'amplifier_specs', columns: ['amplifier_type', 'ic_chipset', 'input_voltage', 'output_power', 'channel_type', 'speaker_impedance_support', 'input_signal_type', 'volume_control', 'protection'] },
                    'Temperature Sensor': { table: 'temperature_sensor_specs', columns: ['sensor_type', 'sensor_model', 'temperature_range', 'accuracy', 'output_signal', 'interface', 'probe_type', 'cable_length', 'calibration_required'] },
                    'Quality Sensor': { table: 'quality_sensor_specs', columns: ['sensor_type', 'measured_parameter', 'measuring_range', 'accuracy', 'output_signal', 'communication_protocol', 'fluid_compatibility', 'calibration_required', 'calibration_data'] },
                    'Pressure Sensor': { table: 'pressure_sensor_specs', columns: ['pressure_range', 'pressure_type', 'output_signal', 'accuracy', 'thread_size', 'overload_pressure', 'burst_pressure', 'medium_compatibility', 'operating_voltage'] },
                    'EMI-EMC Filter': { table: 'emi_emc_filter_specs', columns: ['filter_type', 'rated_voltage', 'rated_current', 'frequency_range', 'leakage_current', 'filter_stage', 'mounting_type', 'certification', 'application'] },
                    'DC Meter': { table: 'dc_meter_specs', columns: ['meter_type', 'voltage_range', 'current_range', 'display_type', 'accuracy_class', 'shunt_required', 'communication_interface', 'protocol', 'power_supply', 'mounting_type'] }
                };

                if (mapping[category_name]) {
                    const { table, columns } = mapping[category_name];
                    
                    // Extract file URLs for specialized tables
                    const datasheetUrl = req.files && req.files['file_datasheet'] ? `/uploads/inventory/${req.files['file_datasheet'][0].filename}` : null;
                    const warrantyUrl = req.files && req.files['file_warranty'] ? `/uploads/inventory/${req.files['file_warranty'][0].filename}` : null;
                    const imagesGallery = req.files && req.files['part_images'] ? JSON.stringify(req.files['part_images'].map(img => `/uploads/inventory/${img.filename}`)) : null;

                    const colNames = ['part_id', ...columns, 'datasheet_file', 'warranty_document', 'part_images_gallery'];
                    const placeholders = colNames.map((_, i) => `$${i + 1}`).join(', ');
                    const values = [partId, ...columns.map(col => parsedData[col]), datasheetUrl, warrantyUrl, imagesGallery];
                    await client.query(`INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`, values);
                }
            } else if (category_name) {
                // Custom category - store category_name only
                await client.query(
                    `INSERT INTO ELECTRONICS_CATEGORY_SPEC (part_id, category_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [partId, category_name]
                );
            }

            // Save custom_params for custom categories
            if (req.body.custom_params) {
                const parsedCustom = typeof req.body.custom_params === 'string' ? req.body.custom_params : JSON.stringify(req.body.custom_params);
                await client.query(`UPDATE ELECTRONICS_PART_MASTER SET custom_params = $1 WHERE part_id = $2`, [parsedCustom, partId]);
            }

            // 4. Files
            if (req.files) {
                const files = req.files;
                await client.query(
                    `INSERT INTO ELECTRONICS_FILES 
                    (part_id, datasheet_url, wiring_diagram_url, user_manual_url, test_report_url, calibration_cert_url, warranty_cert_url, invoice_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        partId,
                        files['file_datasheet'] ? `/uploads/inventory/${files['file_datasheet'][0].filename}` : null,
                        files['file_wiring'] ? `/uploads/inventory/${files['file_wiring'][0].filename}` : null,
                        files['file_manual'] ? `/uploads/inventory/${files['file_manual'][0].filename}` : null,
                        files['file_test_report'] ? `/uploads/inventory/${files['file_test_report'][0].filename}` : null,
                        files['file_calib_cert'] ? `/uploads/inventory/${files['file_calib_cert'][0].filename}` : null,
                        files['file_warranty'] ? `/uploads/inventory/${files['file_warranty'][0].filename}` : null,
                        files['file_invoice'] ? `/uploads/inventory/${files['file_invoice'][0].filename}` : null
                    ]
                );

                // Images
                if (files['part_images'] && files['part_images'].length > 0) {
                    for (const img of files['part_images']) {
                        await client.query(
                            `INSERT INTO ELECTRONICS_IMAGES (part_id, image_url) VALUES ($1, $2)`,
                            [partId, `/uploads/inventory/${img.filename}`]
                        );
                    }
                }
            } else {
                 // ensure record exists even without files
                 await client.query(`INSERT INTO ELECTRONICS_FILES (part_id) VALUES ($1)`, [partId]);
            }
        });
        // We do not have the part data directly except the partId, so we return a simple success.
        // Wait, original code sent `masterResult.rows[0]`.
        // To make it identical, we can define `let createdPart;` before `db.withTransaction`
        // But sendSuccess with null or { part_id } works. I'll just return { part_id } or null. Let's do a fetch or null.
        sendSuccess(res, null, 'Electronics Part registered successfully', 201);
    } catch (error) {
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
        await db.withTransaction(async (client) => {
            // 1. Update Master
            await client.query(
                `UPDATE ELECTRONICS_PART_MASTER SET
                part_category = $1, part_name = $2, part_number = $3, internal_sku = $4, manufacturer = $5, part_type = $6, part_description = $7, used_in_product = $8, status = $9, stock_quantity = $10, updated_at = NOW()
                WHERE part_id = $11`,
                [part_category, part_name, part_number, internal_sku, manufacturer, part_type, part_description, used_in_product, status, req.body.stock_quantity || 0, id]
            );

            // 2. Tech Spec
            const existingTechSpec = await client.query('SELECT spec_id FROM ELECTRONICS_TECH_SPEC WHERE part_id = $1', [id]);
            if (existingTechSpec.rows.length > 0) {
                await client.query(
                    `UPDATE ELECTRONICS_TECH_SPEC SET
                    rated_voltage = $1, rated_current = $2, power_rating = $3, input_type = $4, output_type = $5, connector_type = $6, communication_iface = $7, mounting_type = $8, operating_temp = $9, protection_rating = $10, dimensions = $11, weight = $12
                    WHERE part_id = $13`,
                    [rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight, id]
                );
            } else {
                 await client.query(
                    `INSERT INTO ELECTRONICS_TECH_SPEC 
                    (part_id, rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [id, rated_voltage, rated_current, power_rating, input_type, output_type, connector_type, communication_iface, mounting_type, operating_temp, protection_rating, dimensions, weight]
                );
            }

            // 3. Category Spec & Specialized Routing
            if (category_name && spec_data) {
                const parsedSpecData = typeof spec_data === 'string' ? JSON.parse(spec_data) : spec_data;
                const existingCatSpec = await client.query('SELECT cat_spec_id FROM ELECTRONICS_CATEGORY_SPEC WHERE part_id = $1', [id]);
                
                if (existingCatSpec.rows.length > 0) {
                    await client.query(
                        `UPDATE ELECTRONICS_CATEGORY_SPEC SET category_name = $1, spec_data = $2 WHERE part_id = $3`,
                        [category_name, JSON.stringify(parsedSpecData), id]
                    );
                } else {
                    await client.query(
                        `INSERT INTO ELECTRONICS_CATEGORY_SPEC (part_id, category_name, spec_data) VALUES ($1, $2, $3)`,
                        [id, category_name, JSON.stringify(parsedSpecData)]
                    );
                }

                // Mapping definitions for specialized tables
                const mapping = {
                    'Battery': { table: 'battery_specs', columns: ['battery_chemistry', 'battery_voltage', 'battery_capacity', 'cell_count', 'rechargeable', 'charging_voltage', 'max_charging_current', 'max_discharge_current', 'backup_time', 'battery_connector_type', 'cycle_life', 'bms_available'] },
                    'Flow Meter': { table: 'flow_meter_specs', columns: ['flow_meter_type', 'flow_range', 'accuracy', 'pulse_output', 'pulses_per_liter', 'k_factor', 'fluid_compatibility', 'inlet_size', 'outlet_size', 'max_pressure', 'calibration_required', 'calibration_cert_no'] },
                    'SMPS': { table: 'smps_specs', columns: ['input_voltage_range', 'output_voltage', 'output_current', 'output_power', 'efficiency', 'num_outputs', 'protection', 'cooling_type', 'smps_type', 'ripple_noise'] },
                    'Printer': { table: 'printer_specs', columns: ['printer_type', 'printer_model', 'print_width', 'paper_roll_size', 'print_speed', 'interface', 'baud_rate', 'cutter_available', 'paper_sensor_available', 'operating_voltage', 'supported_language'] },
                    'Speaker': { table: 'speaker_specs', columns: ['speaker_type', 'power_rating', 'impedance', 'frequency_range', 'sound_level', 'operating_voltage', 'connector_type', 'mounting_type'] },
                    'Amplifier': { table: 'amplifier_specs', columns: ['amplifier_type', 'ic_chipset', 'input_voltage', 'output_power', 'channel_type', 'speaker_impedance_support', 'input_signal_type', 'volume_control', 'protection'] },
                    'Temperature Sensor': { table: 'temperature_sensor_specs', columns: ['sensor_type', 'sensor_model', 'temperature_range', 'accuracy', 'output_signal', 'interface', 'probe_type', 'cable_length', 'calibration_required'] },
                    'Quality Sensor': { table: 'quality_sensor_specs', columns: ['sensor_type', 'measured_parameter', 'measuring_range', 'accuracy', 'output_signal', 'communication_protocol', 'fluid_compatibility', 'calibration_required', 'calibration_data'] },
                    'Pressure Sensor': { table: 'pressure_sensor_specs', columns: ['pressure_range', 'pressure_type', 'output_signal', 'accuracy', 'thread_size', 'overload_pressure', 'burst_pressure', 'medium_compatibility', 'operating_voltage'] },
                    'EMI-EMC Filter': { table: 'emi_emc_filter_specs', columns: ['filter_type', 'rated_voltage', 'rated_current', 'frequency_range', 'leakage_current', 'filter_stage', 'mounting_type', 'certification', 'application'] },
                    'DC Meter': { table: 'dc_meter_specs', columns: ['meter_type', 'voltage_range', 'current_range', 'display_type', 'accuracy_class', 'shunt_required', 'communication_interface', 'protocol', 'power_supply', 'mounting_type'] }
                };

                if (mapping[category_name]) {
                    const { table, columns } = mapping[category_name];
                    const exists = await client.query(`SELECT spec_id FROM ${table} WHERE part_id = $1`, [id]);
                    
                    // Extract file URLs for specialized tables
                    const datasheetUrl = req.files && req.files['file_datasheet'] ? `/uploads/inventory/${req.files['file_datasheet'][0].filename}` : null;
                    const warrantyUrl = req.files && req.files['file_warranty'] ? `/uploads/inventory/${req.files['file_warranty'][0].filename}` : null;
                    const imagesGallery = req.files && req.files['part_images'] ? JSON.stringify(req.files['part_images'].map(img => `/uploads/inventory/${img.filename}`)) : null;

                    if (exists.rows.length > 0) {
                        let updateCols = columns.map((col, i) => `${col} = $${i + 1}`);
                        let params = [...columns.map(col => parsedSpecData[col])];
                        let idx = columns.length + 1;

                        if (datasheetUrl) { updateCols.push(`datasheet_file = $${idx++}`); params.push(datasheetUrl); }
                        if (warrantyUrl) { updateCols.push(`warranty_document = $${idx++}`); params.push(warrantyUrl); }
                        if (imagesGallery) { updateCols.push(`part_images_gallery = $${idx++}`); params.push(imagesGallery); }

                        params.push(id);
                        await client.query(`UPDATE ${table} SET ${updateCols.join(', ')} WHERE part_id = $${idx}`, params);
                    } else {
                        const colNames = ['part_id', ...columns, 'datasheet_file', 'warranty_document', 'part_images_gallery'];
                        const placeholders = colNames.map((_, i) => `$${i + 1}`).join(', ');
                        const values = [id, ...columns.map(col => parsedSpecData[col]), datasheetUrl, warrantyUrl, imagesGallery];
                        await client.query(`INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`, values);
                    }
                }
            } else if (category_name) {
                // Custom category - just update category name
                const existingCatSpec = await client.query('SELECT cat_spec_id FROM ELECTRONICS_CATEGORY_SPEC WHERE part_id = $1', [id]);
                if (existingCatSpec.rows.length > 0) {
                    await client.query(`UPDATE ELECTRONICS_CATEGORY_SPEC SET category_name = $1 WHERE part_id = $2`, [category_name, id]);
                } else {
                    await client.query(`INSERT INTO ELECTRONICS_CATEGORY_SPEC (part_id, category_name) VALUES ($1, $2)`, [id, category_name]);
                }
            }

            // Update custom_params for custom categories
            if (req.body.custom_params !== undefined) {
                const parsedCustom = typeof req.body.custom_params === 'string' ? req.body.custom_params : JSON.stringify(req.body.custom_params || {});
                await client.query(`UPDATE ELECTRONICS_PART_MASTER SET custom_params = $1 WHERE part_id = $2`, [parsedCustom, id]);
            }

            // 4. Files
            if (req.files && Object.keys(req.files).length > 0) {
                const files = req.files;
                const existingFiles = await client.query('SELECT file_id FROM ELECTRONICS_FILES WHERE part_id = $1', [id]);
                
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
                            params.push(`/uploads/inventory/${files[field][0].filename}`);
                        }
                    });

                    if (updateParts.length > 0) {
                        await client.query(`UPDATE ELECTRONICS_FILES SET ${updateParts.join(', ')} WHERE part_id = $1`, params);
                    }
                } else {
                    await client.query(
                        `INSERT INTO ELECTRONICS_FILES 
                        (part_id, datasheet_url, wiring_diagram_url, user_manual_url, test_report_url, calibration_cert_url, warranty_cert_url, invoice_url)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            id,
                            files['file_datasheet'] ? `/uploads/inventory/${files['file_datasheet'][0].filename}` : null,
                            files['file_wiring'] ? `/uploads/inventory/${files['file_wiring'][0].filename}` : null,
                            files['file_manual'] ? `/uploads/inventory/${files['file_manual'][0].filename}` : null,
                            files['file_test_report'] ? `/uploads/inventory/${files['file_test_report'][0].filename}` : null,
                            files['file_calib_cert'] ? `/uploads/inventory/${files['file_calib_cert'][0].filename}` : null,
                            files['file_warranty'] ? `/uploads/inventory/${files['file_warranty'][0].filename}` : null,
                            files['file_invoice'] ? `/uploads/inventory/${files['file_invoice'][0].filename}` : null
                        ]
                    );
                }

                // Images
                if (files['part_images'] && files['part_images'].length > 0) {
                    for (const img of files['part_images']) {
                        await client.query(
                            `INSERT INTO ELECTRONICS_IMAGES (part_id, image_url) VALUES ($1, $2)`,
                            [id, `/uploads/inventory/${img.filename}`]
                        );
                    }
                }
            }
        });
        sendSuccess(res, null, 'Electronics Part updated successfully');
    } catch (error) {
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

const deleteElectronicsFile = async (req, res, next) => {
    const { id } = req.params;
    const { field } = req.body; 
    try {
        const validFields = ['datasheet_url', 'wiring_diagram_url', 'user_manual_url', 'test_report_url', 'calibration_cert_url', 'warranty_cert_url', 'invoice_url'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid file field' } });
        }
        await db.query(`UPDATE electronics_files SET ${field} = NULL WHERE part_id = $1`, [id]);
        sendSuccess(res, null, 'File removed successfully');
    } catch (error) {
        next(error);
    }
};

const deleteElectronicsImage = async (req, res, next) => {
    const { id } = req.params;
    const { image_url } = req.body;
    try {
        await db.query('DELETE FROM ELECTRONICS_IMAGES WHERE part_id = $1 AND image_url = $2', [id, image_url]);
        sendSuccess(res, null, 'Image deleted successfully');
    } catch (error) {
        next(error);
    }
};
const addElectronicsStock = async (req, res, next) => {
    const { id } = req.params;
    const { quantityToAdd } = req.body;

    try {
        const addedQty = parseInt(quantityToAdd);
        if (isNaN(addedQty) || addedQty <= 0) {
            return res.status(400).json({ success: false, error: { message: 'Quantity to add must be greater than zero.' } });
        }

        const partResult = await db.query('SELECT * FROM ELECTRONICS_PART_MASTER WHERE part_id = $1 AND is_active = TRUE', [id]);
        if (partResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Electronics Part not found' } });
        }

        await db.query(
            'UPDATE ELECTRONICS_PART_MASTER SET stock_quantity = COALESCE(stock_quantity, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2',
            [addedQty, id]
        );

        sendSuccess(res, null, `Successfully added ${addedQty} stock to the Electronics Part`);
    } catch (error) {
        console.error('Add Electronics Stock Error:', error);
        next(error);
    }
};

module.exports = {
  getElectronicsParts,
  getElectronicsPartById,
  createElectronicsPart,
  updateElectronicsPart,
  deleteElectronicsPart,
  deleteElectronicsFile,
  deleteElectronicsImage,
  addElectronicsStock
};
