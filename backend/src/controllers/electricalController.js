const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const getElectricalParts = async (req, res, next) => {
    const { page, limit, offset } = parsePagination(req);
    const { search } = req.query;
  
    try {
      let queryText = `
        SELECT p.*, 
        CASE 
          WHEN p.part_category ILIKE 'Pump' THEN (SELECT part_images_gallery::jsonb->>0 FROM pump_specs WHERE part_id = p.part_id)
          WHEN p.part_category ILIKE 'Nozzle' THEN (SELECT part_images_gallery::jsonb->>0 FROM nozzle_specs WHERE part_id = p.part_id)
          WHEN p.part_category ILIKE 'Solenoid Valve' THEN (SELECT part_images_gallery::jsonb->>0 FROM solenoid_valve_specs WHERE part_id = p.part_id)
          WHEN p.part_category ILIKE 'Relay Box' THEN (SELECT part_images_gallery::jsonb->>0 FROM relay_box_specs WHERE part_id = p.part_id)
          WHEN p.part_category ILIKE 'Transformer' THEN (SELECT part_images_gallery::jsonb->>0 FROM transformer_specs WHERE part_id = p.part_id)
          WHEN p.part_category ILIKE 'RCCB' THEN (SELECT part_images_gallery::jsonb->>0 FROM rccb_specs WHERE part_id = p.part_id)
          WHEN p.part_category ILIKE 'SPD%' THEN (SELECT part_images_gallery::jsonb->>0 FROM spd_specs WHERE part_id = p.part_id)
          ELSE NULL
        END as image_url,
        COUNT(*) OVER() as total_count 
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

const tableMap = {
    'Pump': 'pump_specs',
    'Nozzle': 'nozzle_specs',
    'Solenoid Valve': 'solenoid_valve_specs',
    'Relay Box': 'relay_box_specs',
    'Transformer': 'transformer_specs',
    'RCCB': 'rccb_specs',
    'SPD(Surge Protection Device)': 'spd_specs'
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
        
        // Fetch from specialized category table
        const categoryResult = await db.query('SELECT category_name FROM electrical_category_spec WHERE part_id = $1', [id]);
        const category_name = categoryResult.rows[0]?.category_name;
        
        let category_spec = { category_name };
        if (category_name && tableMap[category_name]) {
            const specRes = await db.query(`SELECT * FROM ${tableMap[category_name]} WHERE part_id = $1`, [id]);
            if (specRes.rows[0]) {
                const { spec_id, part_id: pid, created_at, datasheet_file, warranty_document, part_images_gallery, ...rest } = specRes.rows[0];
                category_spec = { 
                    ...category_spec, 
                    ...rest,
                    files: {
                        datasheet_url: datasheet_file,
                        warranty_doc_url: warranty_document
                    },
                    part_images: part_images_gallery
                };
            }
        }

        sendSuccess(res, {
            ...master,
            ...techResult.rows[0],
            ...category_spec
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


        // 5. Insert Category Record
        if (body.category_name) {
            await db.query(`INSERT INTO electrical_category_spec (part_id, category_name) VALUES ($1, $2)`, [part_id, body.category_name]);
        }

        // 6. Specialized Table & Files
        if (body.category_name && tableMap[body.category_name]) {
            const files = req.files || {};
            const datasheet_file = files['file_datasheet'] ? `/uploads/inventory/${files['file_datasheet'][0].filename}` : null;
            const warranty_document = files['file_warranty'] ? `/uploads/inventory/${files['file_warranty'][0].filename}` : null;
            const part_images_gallery = files['part_images'] ? files['part_images'].map(f => `/uploads/inventory/${f.filename}`) : [];

            const categoryFields = {
                'Pump': ['pump_type', 'motor_type', 'flow_rate', 'max_pressure', 'suction_size', 'outlet_size', 'fluid_compatibility', 'pump_material', 'rpm', 'seal_type', 'noise_level', 'dry_run_protection', 'overload_protection'],
                'Nozzle': ['nozzle_type', 'fuel_compatibility', 'flow_rate_range', 'inlet_size', 'outlet_diameter', 'spout_type', 'auto_cutoff_available', 'swivel_joint_available', 'trigger_lock_available', 'seal_material', 'operating_pressure', 'color_code', 'nozzle_weight'],
                'Solenoid Valve': ['valve_type', 'operation_type', 'coil_voltage', 'coil_power', 'port_size', 'number_of_ports', 'body_material', 'medium_compatibility', 'pressure_range', 'response_time', 'manual_override', 'coil_protection_class', 'duty_cycle'],
                'Relay Box': ['relay_box_type', 'input_voltage', 'output_voltage', 'number_of_relays', 'relay_rating', 'relay_type', 'control_signal_type', 'terminal_type', 'enclosure_material', 'fuse_available', 'led_indicator_available', 'manual_override_available', 'communication_interface'],
                'Transformer': ['transformer_type', 'winding_material', 'core_type', 'insulation_class', 'cooling_type', 'short_circuit_protection', 'temperature_rise', 'efficiency'],
                'RCCB': ['rccb_type', 'sensitivity', 'breaking_capacity', 'trip_type', 'number_of_poles', 'test_button_available', 'standards', 'protection_purpose', 'trip_indicator_available'],
                'SPD(Surge Protection Device)': ['spd_type', 'protection_mode', 'max_continuous_operating_voltage', 'nominal_discharge_current', 'max_discharge_current', 'voltage_protection_level', 'status_indicator_available', 'replaceable_cartridge', 'remote_signal_contact', 'standard_compliance']
            };

            const fields = ['part_id', ...categoryFields[body.category_name], 'datasheet_file', 'warranty_document', 'part_images_gallery'];
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
            const values = [part_id];
            
            categoryFields[body.category_name].forEach(f => values.push(body[f] || null));
            values.push(datasheet_file, warranty_document, JSON.stringify(part_images_gallery));

            await db.query(`INSERT INTO ${tableMap[body.category_name]} (${fields.join(', ')}) VALUES (${placeholders})`, values);
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

        // 4. Update Tech Specs
        await db.query(
            `UPDATE electrical_tech_spec SET
            rated_voltage = $1, rated_current = $2, power_rating = $3, phase_type = $4, frequency = $5, input_type = $6, output_type = $7, connector_type = $8, mounting_type = $9, protection_rating = $10, operating_temperature = $11, dimensions = $12, weight = $13, updated_at = NOW()
            WHERE part_id = $14`,
            [body.rated_voltage, body.rated_current, body.power_rating, body.phase_type, body.frequency, body.input_type, body.output_type, body.connector_type, body.mounting_type, body.protection_rating, body.operating_temperature, body.dimensions, body.weight, id]
        );

        // 4.5 Update Category name in electrical_category_spec if provided
        if (body.category_name) {
            await db.query(
                `UPDATE electrical_category_spec SET category_name = $1 WHERE part_id = $2`,
                [body.category_name, id]
            );
        }

        // 5. Update Category specialized table
        if (body.category_name && tableMap[body.category_name]) {
            const categoryFields = {
                'Pump': ['pump_type', 'motor_type', 'flow_rate', 'max_pressure', 'suction_size', 'outlet_size', 'fluid_compatibility', 'pump_material', 'rpm', 'seal_type', 'noise_level', 'dry_run_protection', 'overload_protection'],
                'Nozzle': ['nozzle_type', 'fuel_compatibility', 'flow_rate_range', 'inlet_size', 'outlet_diameter', 'spout_type', 'auto_cutoff_available', 'swivel_joint_available', 'trigger_lock_available', 'seal_material', 'operating_pressure', 'color_code', 'nozzle_weight'],
                'Solenoid Valve': ['valve_type', 'operation_type', 'coil_voltage', 'coil_power', 'port_size', 'number_of_ports', 'body_material', 'medium_compatibility', 'pressure_range', 'response_time', 'manual_override', 'coil_protection_class', 'duty_cycle'],
                'Relay Box': ['relay_box_type', 'input_voltage', 'output_voltage', 'number_of_relays', 'relay_rating', 'relay_type', 'control_signal_type', 'terminal_type', 'enclosure_material', 'fuse_available', 'led_indicator_available', 'manual_override_available', 'communication_interface'],
                'Transformer': ['transformer_type', 'winding_material', 'core_type', 'insulation_class', 'cooling_type', 'short_circuit_protection', 'temperature_rise', 'efficiency'],
                'RCCB': ['rccb_type', 'sensitivity', 'breaking_capacity', 'trip_type', 'number_of_poles', 'test_button_available', 'standards', 'protection_purpose', 'trip_indicator_available'],
                'SPD(Surge Protection Device)': ['spd_type', 'protection_mode', 'max_continuous_operating_voltage', 'nominal_discharge_current', 'max_discharge_current', 'voltage_protection_level', 'status_indicator_available', 'replaceable_cartridge', 'remote_signal_contact', 'standard_compliance']
            };

            const files = req.files || {};
            const setClause = [];
            const values = [id];
            let idx = 2;

            categoryFields[body.category_name].forEach(f => {
                setClause.push(`${f} = $${idx++}`);
                values.push(body[f] || null);
            });

            if (files['file_datasheet']) {
                setClause.push(`datasheet_file = $${idx++}`);
                values.push(`/uploads/inventory/${files['file_datasheet'][0].filename}`);
            }
            if (files['file_warranty']) {
                setClause.push(`warranty_document = $${idx++}`);
                values.push(`/uploads/inventory/${files['file_warranty'][0].filename}`);
            }
            if (files['part_images']) {
                // For images, we might want to append or replace. The user didn't specify.
                // Assuming replacement for simplicity, or we can handle gallery separately.
                const newImages = files['part_images'].map(f => `/uploads/inventory/${f.filename}`);
                setClause.push(`part_images_gallery = $${idx++}`);
                values.push(JSON.stringify(newImages));
            }

            const exist = await db.query(`SELECT 1 FROM ${tableMap[body.category_name]} WHERE part_id = $1`, [id]);
            if (exist.rows.length > 0) {
                await db.query(`UPDATE ${tableMap[body.category_name]} SET ${setClause.join(', ')} WHERE part_id = $1`, values);
            } else {
                const fields = ['part_id', ...categoryFields[body.category_name], 'datasheet_file', 'warranty_document', 'part_images_gallery'];
                const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
                const insertValues = [id];
                categoryFields[body.category_name].forEach(f => insertValues.push(body[f] || null));
                insertValues.push(
                    files['file_datasheet'] ? `/uploads/inventory/${files['file_datasheet'][0].filename}` : null,
                    files['file_warranty'] ? `/uploads/inventory/${files['file_warranty'][0].filename}` : null,
                    JSON.stringify(files['part_images'] ? files['part_images'].map(f => `/uploads/inventory/${f.filename}`) : [])
                );
                await db.query(`INSERT INTO ${tableMap[body.category_name]} (${fields.join(', ')}) VALUES (${placeholders})`, insertValues);
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
        // Need to identify which specialized table this part belongs to
        const catRes = await db.query('SELECT category_name FROM electrical_category_spec WHERE part_id = $1', [id]);
        const catName = catRes.rows[0]?.category_name;
        if (catName && tableMap[catName]) {
            const specRes = await db.query(`SELECT part_images_gallery FROM ${tableMap[catName]} WHERE part_id = $1`, [id]);
            let gallery = specRes.rows[0]?.part_images_gallery || [];
            gallery = gallery.filter(url => url !== imageUrl);
            await db.query(`UPDATE ${tableMap[catName]} SET part_images_gallery = $1 WHERE part_id = $2`, [JSON.stringify(gallery), id]);
        }
        sendSuccess(res, null, 'Image removed successfully');
    } catch (error) {
        next(error);
    }
};

const deleteElectricalFile = async (req, res, next) => {
    const { id } = req.params;
    const { field } = req.body; // e.g., 'datasheet_url'
    try {
        const catRes = await db.query('SELECT category_name FROM electrical_category_spec WHERE part_id = $1', [id]);
        const catName = catRes.rows[0]?.category_name;
        if (catName && tableMap[catName]) {
            const dbField = field === 'datasheet_url' ? 'datasheet_file' : field === 'warranty_doc_url' ? 'warranty_document' : null;
            if (dbField) {
                await db.query(`UPDATE ${tableMap[catName]} SET ${dbField} = NULL WHERE part_id = $1`, [id]);
            }
        }
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
