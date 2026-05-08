const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const getElectricalParts = async (req, res, next) => {
    const { page, limit, offset } = parsePagination(req);
    const { search } = req.query;
  
    try {
      let queryText = `
        SELECT p.*, COUNT(*) OVER() as total_count 
        FROM electrical_part_master p
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

const getElectricalPartById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const masterResult = await db.query('SELECT * FROM electrical_part_master WHERE part_id = $1', [id]);
        if (masterResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Electrical part not found' } });
        }
        const master = masterResult.rows[0];

        const techResult = await db.query('SELECT * FROM electrical_tech_spec WHERE part_id = $1', [id]);
        const inventoryResult = await db.query('SELECT * FROM electrical_inventory WHERE part_id = $1', [id]);
        const procurementResult = await db.query('SELECT * FROM electrical_procurement WHERE part_id = $1', [id]);
        const catResult = await db.query('SELECT * FROM electrical_category_spec WHERE part_id = $1', [id]);
        const filesResult = await db.query('SELECT * FROM electrical_files WHERE part_id = $1', [id]);
        
        const imagesResult = await db.query('SELECT image_url FROM electrical_images WHERE part_id = $1', [id]);
        const part_images = imagesResult.rows.map(row => row.image_url);

        const category_spec = catResult.rows[0] || {};
        
        // Flatten params into main object for easier frontend consumption
        const params = category_spec.parameters || {};

        sendSuccess(res, {
            ...master,
            ...techResult.rows[0],
            ...inventoryResult.rows[0],
            ...procurementResult.rows[0],
            category_name: category_spec.category_name,
            ...params,
            files: filesResult.rows[0] || {},
            part_images
        });
    } catch (error) {
        next(error);
    }
};

const createElectricalPart = async (req, res, next) => {
    const body = req.body;
    try {
        await db.query('BEGIN');

        // 1. Insert Master
        const masterResult = await db.query(
            `INSERT INTO electrical_part_master (part_category, part_name, part_number, manufacturer, part_type, description, used_in_product, material, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING part_id`,
            [body.part_category, body.part_name, body.part_number, body.manufacturer, body.part_type, body.description, body.used_in_product, body.material, body.status || 'Active']
        );
        const part_id = masterResult.rows[0].part_id;

        // 2. Insert Tech Specs
        await db.query(
            `INSERT INTO electrical_tech_spec (part_id, rated_voltage, rated_current, power_rating, phase_type, frequency, input_type, output_type, connector_type, mounting_type, protection_rating, operating_temperature, dimensions, weight)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [part_id, body.rated_voltage, body.rated_current, body.power_rating, body.phase_type, body.frequency, body.input_type, body.output_type, body.connector_type, body.mounting_type, body.protection_rating, body.operating_temperature, body.dimensions, body.weight]
        );

        // 3. Insert Inventory
        await db.query(
            `INSERT INTO electrical_inventory (part_id, serial_number, batch_number, quantity_available, minimum_stock_level, unit_of_measurement, storage_location, condition, is_damaged, damage_description, is_assigned, assigned_device_id, last_inspection_date, next_inspection_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [part_id, body.serial_number, body.batch_number, parseInt(body.quantity_available)||0, parseInt(body.minimum_stock_level)||0, body.unit_of_measurement, body.storage_location, body.condition, body.is_damaged === 'true' || body.is_damaged === true, body.damage_description, body.is_assigned === 'true' || body.is_assigned === true, body.assigned_device_id, body.last_inspection_date || null, body.next_inspection_date || null]
        );

        // 4. Insert Procurement
        await db.query(
            `INSERT INTO electrical_procurement (part_id, supplier_name, supplier_contact, purchase_date, purchase_order_number, invoice_number, purchase_price, warranty_period, warranty_start_date, warranty_end_date, warranty_status, gst_number, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [part_id, body.supplier_name, body.supplier_contact, body.purchase_date || null, body.purchase_order_number, body.invoice_number, parseFloat(body.purchase_price)||0, body.warranty_period, body.warranty_start_date || null, body.warranty_end_date || null, body.warranty_status, body.gst_number, body.remarks]
        );

        // 5. Insert Category Specs
        if (body.category_name) {
            const allowedCategoryFields = [
                'pump_type', 'motor_type', 'flow_rate', 'max_pressure', 'suction_size', 'outlet_size', 'fluid_compatibility', 'pump_material', 'rpm', 'seal_type', 'noise_level', 'dry_run_protection', 'overload_protection',
                'nozzle_type', 'fuel_compatibility', 'flow_rate_range', 'inlet_size', 'outlet_diameter', 'spout_type', 'auto_cutoff_available', 'swivel_joint_available', 'trigger_lock_available', 'seal_material', 'operating_pressure', 'color_code', 'nozzle_weight',
                'valve_type', 'operation_type', 'coil_voltage', 'coil_power', 'port_size', 'number_of_ports', 'body_material', 'medium_compatibility', 'pressure_range', 'response_time', 'manual_override', 'coil_protection_class', 'duty_cycle',
                'relay_box_type', 'input_voltage', 'output_voltage', 'number_of_relays', 'relay_rating', 'relay_type', 'control_signal_type', 'terminal_type', 'enclosure_material', 'fuse_available', 'led_indicator_available', 'manual_override_available', 'communication_interface',
                'transformer_type', 'winding_material', 'core_type', 'insulation_class', 'cooling_type', 'short_circuit_protection', 'temperature_rise', 'efficiency',
                'rccb_type', 'sensitivity', 'breaking_capacity', 'trip_type', 'number_of_poles', 'test_button_available', 'standards', 'protection_purpose', 'trip_indicator_available',
                'spd_type', 'protection_mode', 'max_continuous_operating_voltage', 'nominal_discharge_current', 'max_discharge_current', 'voltage_protection_level', 'status_indicator_available', 'replaceable_cartridge', 'remote_signal_contact', 'standard_compliance'
            ];
            
            let paramsObj = {};
            Object.keys(body).forEach(key => {
                if (allowedCategoryFields.includes(key) && body[key] !== undefined) {
                    paramsObj[key] = body[key];
                }
            });

            await db.query(
                `INSERT INTO electrical_category_spec (part_id, category_name, parameters) VALUES ($1, $2, $3)`,
                [part_id, body.category_name, JSON.stringify(paramsObj)]
            );
        }

        // 6. Insert Files
        if (req.files && Object.keys(req.files).length > 0) {
            const files = req.files;
            await db.query(
                `INSERT INTO electrical_files (part_id, datasheet_url, wiring_diagram_url, installation_manual_url, test_report_url, calibration_cert_url, compliance_cert_url, warranty_doc_url, invoice_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    part_id,
                    files['file_datasheet'] ? `/uploads/inventory/${files['file_datasheet'][0].filename}` : null,
                    files['file_wiring'] ? `/uploads/inventory/${files['file_wiring'][0].filename}` : null,
                    files['file_manual'] ? `/uploads/inventory/${files['file_manual'][0].filename}` : null,
                    files['file_test_report'] ? `/uploads/inventory/${files['file_test_report'][0].filename}` : null,
                    files['file_calib_cert'] ? `/uploads/inventory/${files['file_calib_cert'][0].filename}` : null,
                    files['file_compliance'] ? `/uploads/inventory/${files['file_compliance'][0].filename}` : null,
                    files['file_warranty'] ? `/uploads/inventory/${files['file_warranty'][0].filename}` : null,
                    files['file_invoice'] ? `/uploads/inventory/${files['file_invoice'][0].filename}` : null
                ]
            );

            // Handle Images
            if (files['part_images'] && files['part_images'].length > 0) {
                const imageValues = files['part_images'].map(file => `(${part_id}, '/uploads/inventory/${file.filename}')`).join(', ');
                await db.query(`INSERT INTO electrical_images (part_id, image_url) VALUES ${imageValues}`);
            }
        }

        await db.query('COMMIT');
        sendSuccess(res, { part_id }, 'Electrical part created successfully', 201);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Create Error:', error);
        next(error);
    }
};

const updateElectricalPart = async (req, res, next) => {
    const { id } = req.params;
    const body = req.body;
    
    try {
        await db.query('BEGIN');

        // 1. Update Master
        await db.query(
            `UPDATE electrical_part_master 
             SET part_category=$1, part_name=$2, part_number=$3, manufacturer=$4, part_type=$5, description=$6, used_in_product=$7, material=$8, status=$9, updated_at=CURRENT_TIMESTAMP
             WHERE part_id=$10`,
            [body.part_category, body.part_name, body.part_number, body.manufacturer, body.part_type, body.description, body.used_in_product, body.material, body.status, id]
        );

        // 2. Update Tech Specs
        await db.query(
            `UPDATE electrical_tech_spec
             SET rated_voltage=$1, rated_current=$2, power_rating=$3, phase_type=$4, frequency=$5, input_type=$6, output_type=$7, connector_type=$8, mounting_type=$9, protection_rating=$10, operating_temperature=$11, dimensions=$12, weight=$13
             WHERE part_id=$14`,
            [body.rated_voltage, body.rated_current, body.power_rating, body.phase_type, body.frequency, body.input_type, body.output_type, body.connector_type, body.mounting_type, body.protection_rating, body.operating_temperature, body.dimensions, body.weight, id]
        );

        // 3. Update Inventory
        await db.query(
            `UPDATE electrical_inventory
             SET serial_number=$1, batch_number=$2, quantity_available=$3, minimum_stock_level=$4, unit_of_measurement=$5, storage_location=$6, condition=$7, is_damaged=$8, damage_description=$9, is_assigned=$10, assigned_device_id=$11, last_inspection_date=$12, next_inspection_date=$13
             WHERE part_id=$14`,
            [body.serial_number, body.batch_number, parseInt(body.quantity_available)||0, parseInt(body.minimum_stock_level)||0, body.unit_of_measurement, body.storage_location, body.condition, body.is_damaged === 'true' || body.is_damaged === true, body.damage_description, body.is_assigned === 'true' || body.is_assigned === true, body.assigned_device_id, body.last_inspection_date || null, body.next_inspection_date || null, id]
        );

        // 4. Update Procurement
        await db.query(
            `UPDATE electrical_procurement
             SET supplier_name=$1, supplier_contact=$2, purchase_date=$3, purchase_order_number=$4, invoice_number=$5, purchase_price=$6, warranty_period=$7, warranty_start_date=$8, warranty_end_date=$9, warranty_status=$10, gst_number=$11, remarks=$12
             WHERE part_id=$13`,
            [body.supplier_name, body.supplier_contact, body.purchase_date || null, body.purchase_order_number, body.invoice_number, parseFloat(body.purchase_price)||0, body.warranty_period, body.warranty_start_date || null, body.warranty_end_date || null, body.warranty_status, body.gst_number, body.remarks, id]
        );

        // 5. Update Category Specs
        if (body.category_name) {
            const allowedCategoryFields = [
                'pump_type', 'motor_type', 'flow_rate', 'max_pressure', 'suction_size', 'outlet_size', 'fluid_compatibility', 'pump_material', 'rpm', 'seal_type', 'noise_level', 'dry_run_protection', 'overload_protection',
                'nozzle_type', 'fuel_compatibility', 'flow_rate_range', 'inlet_size', 'outlet_diameter', 'spout_type', 'auto_cutoff_available', 'swivel_joint_available', 'trigger_lock_available', 'seal_material', 'operating_pressure', 'color_code', 'nozzle_weight',
                'valve_type', 'operation_type', 'coil_voltage', 'coil_power', 'port_size', 'number_of_ports', 'body_material', 'medium_compatibility', 'pressure_range', 'response_time', 'manual_override', 'coil_protection_class', 'duty_cycle',
                'relay_box_type', 'input_voltage', 'output_voltage', 'number_of_relays', 'relay_rating', 'relay_type', 'control_signal_type', 'terminal_type', 'enclosure_material', 'fuse_available', 'led_indicator_available', 'manual_override_available', 'communication_interface',
                'transformer_type', 'winding_material', 'core_type', 'insulation_class', 'cooling_type', 'short_circuit_protection', 'temperature_rise', 'efficiency',
                'rccb_type', 'sensitivity', 'breaking_capacity', 'trip_type', 'number_of_poles', 'test_button_available', 'standards', 'protection_purpose', 'trip_indicator_available',
                'spd_type', 'protection_mode', 'max_continuous_operating_voltage', 'nominal_discharge_current', 'max_discharge_current', 'voltage_protection_level', 'status_indicator_available', 'replaceable_cartridge', 'remote_signal_contact', 'standard_compliance'
            ];
            
            let paramsObj = {};
            Object.keys(body).forEach(key => {
                if (allowedCategoryFields.includes(key) && body[key] !== undefined) {
                    paramsObj[key] = body[key];
                }
            });

            const catExist = await db.query('SELECT 1 FROM electrical_category_spec WHERE part_id = $1', [id]);
            if (catExist.rows.length > 0) {
                await db.query(
                    `UPDATE electrical_category_spec SET category_name = $1, parameters = $2 WHERE part_id = $3`,
                    [body.category_name, JSON.stringify(paramsObj), id]
                );
            } else {
                await db.query(
                    `INSERT INTO electrical_category_spec (part_id, category_name, parameters) VALUES ($1, $2, $3)`,
                    [id, body.category_name, JSON.stringify(paramsObj)]
                );
            }
        }

        // 6. Handle Files
        if (req.files && Object.keys(req.files).length > 0) {
            const files = req.files;
            const existingFiles = await db.query('SELECT 1 FROM electrical_files WHERE part_id = $1', [id]);
            
            if (existingFiles.rows.length > 0) {
                let updateParts = [];
                let params = [id];
                let idx = 2;

                const mapping = {
                    file_datasheet: 'datasheet_url',
                    file_wiring: 'wiring_diagram_url',
                    file_manual: 'installation_manual_url',
                    file_test_report: 'test_report_url',
                    file_calib_cert: 'calibration_cert_url',
                    file_compliance: 'compliance_cert_url',
                    file_warranty: 'warranty_doc_url',
                    file_invoice: 'invoice_url'
                };

                Object.keys(mapping).forEach(field => {
                    if (files[field]) {
                        updateParts.push(`${mapping[field]} = $${idx++}`);
                        params.push(`/uploads/inventory/${files[field][0].filename}`);
                    }
                });

                if (updateParts.length > 0) {
                    await db.query(`UPDATE electrical_files SET ${updateParts.join(', ')} WHERE part_id = $1`, params);
                }
            } else {
                await db.query(
                    `INSERT INTO electrical_files (part_id, datasheet_url, wiring_diagram_url, installation_manual_url, test_report_url, calibration_cert_url, compliance_cert_url, warranty_doc_url, invoice_url)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        id,
                        files['file_datasheet'] ? `/uploads/inventory/${files['file_datasheet'][0].filename}` : null,
                        files['file_wiring'] ? `/uploads/inventory/${files['file_wiring'][0].filename}` : null,
                        files['file_manual'] ? `/uploads/inventory/${files['file_manual'][0].filename}` : null,
                        files['file_test_report'] ? `/uploads/inventory/${files['file_test_report'][0].filename}` : null,
                        files['file_calib_cert'] ? `/uploads/inventory/${files['file_calib_cert'][0].filename}` : null,
                        files['file_compliance'] ? `/uploads/inventory/${files['file_compliance'][0].filename}` : null,
                        files['file_warranty'] ? `/uploads/inventory/${files['file_warranty'][0].filename}` : null,
                        files['file_invoice'] ? `/uploads/inventory/${files['file_invoice'][0].filename}` : null
                    ]
                );
            }

            // Handle Images (append)
            if (files['part_images'] && files['part_images'].length > 0) {
                const imageValues = files['part_images'].map(file => `(${id}, '/uploads/inventory/${file.filename}')`).join(', ');
                await db.query(`INSERT INTO electrical_images (part_id, image_url) VALUES ${imageValues}`);
            }
        }

        await db.query('COMMIT');
        sendSuccess(res, null, 'Electrical part updated successfully');
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Update Error:', error);
        next(error);
    }
};

const deleteElectricalPart = async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE electrical_part_master SET is_active = FALSE WHERE part_id = $1', [id]);
        sendSuccess(res, null, 'Electrical part deleted successfully');
    } catch (error) {
        next(error);
    }
};

const deleteElectricalImage = async (req, res, next) => {
    const { id } = req.params;
    const { imageUrl } = req.body;
    try {
        await db.query('DELETE FROM electrical_images WHERE part_id = $1 AND image_url = $2', [id, imageUrl]);
        sendSuccess(res, null, 'Image removed successfully');
    } catch (error) {
        next(error);
    }
};

const deleteElectricalFile = async (req, res, next) => {
    const { id } = req.params;
    const { field } = req.body; // e.g., 'datasheet_url'
    try {
        const validFields = ['datasheet_url', 'wiring_diagram_url', 'installation_manual_url', 'test_report_url', 'calibration_cert_url', 'compliance_cert_url', 'warranty_doc_url', 'invoice_url'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid file field' } });
        }
        await db.query(`UPDATE electrical_files SET ${field} = NULL WHERE part_id = $1`, [id]);
        sendSuccess(res, null, 'File removed successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getElectricalParts,
    getElectricalPartById,
    createElectricalPart,
    updateElectricalPart,
    deleteElectricalPart,
    deleteElectricalImage,
    deleteElectricalFile
};
