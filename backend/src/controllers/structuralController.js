const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const sanitizeValue = (v) => {
    if (v === 'null' || v === 'undefined' || v === '' || v === undefined) return null;
    return v;
};

// Ensure structural images table exists
const ensureImageTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS STRUCTURAL_IMAGES (
                id SERIAL PRIMARY KEY,
                part_id INTEGER REFERENCES STRUCTURAL_PART_MASTER(part_id),
                image_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (err) {
        console.error('--- ERROR ENSURING STRUCTURAL_IMAGES TABLE ---', err);
    }
};
ensureImageTable();

const getStructuralParts = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { search } = req.query;

  try {
    console.log('--- GET STRUCTURAL PARTS: SEARCH =', search, '---');
    
    // We use to_regclass to check if the table exists before querying it to avoid 500 errors
    let queryText = `
      SELECT p.*, 
      (
        CASE 
          WHEN to_regclass('structural_images') IS NOT NULL THEN 
            (SELECT image_url FROM structural_images WHERE part_id = p.part_id LIMIT 1)
          ELSE NULL 
        END
      ) as image_url,
      COUNT(*) OVER() as total_count 
      FROM structural_part_master p
      WHERE p.is_active = TRUE
    `;
    const params = [limit, offset];

    if (search) {
      queryText += ` AND (p.part_name ILIKE $3 OR p.part_number ILIKE $3 OR p.part_category ILIKE $3 OR p.internal_part_code ILIKE $3)`;
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`;

    const result = await db.query(queryText, params);
    console.log('--- GET STRUCTURAL PARTS: FOUND =', result.rows.length, '---');
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    sendSuccess(res, result.rows.map(({ total_count, ...rest }) => rest), { page, limit, total });
  } catch (error) {
    console.error('--- GET STRUCTURAL PARTS ERROR ---', error);
    next(error);
  }
};

const getStructuralPartById = async (req, res, next) => {
    const { id } = req.params;
    console.log(`--- FETCHING STRUCTURAL PART BY ID: ${id} ---`);
    try {
        const partResult = await db.query(`
            SELECT * FROM STRUCTURAL_PART_MASTER WHERE part_id = $1 AND is_active = TRUE
        `, [id]);

        if (partResult.rows.length === 0) {
            console.warn(`--- STRUCTURAL PART ${id} NOT FOUND IN MASTER ---`);
            return res.status(404).json({ success: false, error: { message: 'Structural Part not found' } });
        }

        const part = partResult.rows[0];
        let techSpec = {};
        let categorySpec = null;
        let categoryData = {};
        let images = [];

        // Isolated Tech Spec Fetch
        try {
            const techSpecResult = await db.query('SELECT * FROM STRUCTURAL_TECH_SPEC WHERE part_id = $1', [id]);
            techSpec = techSpecResult.rows[0] || {};
        } catch (e) { console.error('--- ERROR FETCHING STRUCTURAL_TECH_SPEC ---', e); }

        // Isolated Category Spec Fetch
        try {
            const categorySpecResult = await db.query('SELECT category_name, spec_data FROM STRUCTURAL_CATEGORY_SPEC WHERE part_id = $1', [id]);
            categorySpec = categorySpecResult.rows[0];
        } catch (e) { console.error('--- ERROR FETCHING STRUCTURAL_CATEGORY_SPEC ---', e); }

        // Isolated Specialized Data Fetch
        if (categorySpec) {
            const tableMap = {
                'Cabinet Body': 'cabinet_body_specs',
                'Front Door': 'front_door_specs',
                'Side Panel': 'side_panel_specs',
                'Top Cover': 'top_cover_specs',
                'Base Frame': 'base_frame_specs',
                'Internal Mounting Plate': 'internal_mounting_plate_specs',
                'Nozzle Holder': 'nozzle_holder_specs',
                'Hose Entry Plate': 'hose_entry_plate_specs',
                'Display': 'display_specs',
                'Lock': 'lock_specs'
            };

            const tableName = tableMap[categorySpec.category_name];
            if (tableName) {
                try {
                    const specRes = await db.query(`SELECT * FROM ${tableName} WHERE part_id = $1`, [id]);
                    if (specRes.rows.length > 0) {
                        categoryData = specRes.rows[0];
                    }
                } catch (specErr) {
                    console.error(`--- ERROR FETCHING SPECIALIZED DATA FROM ${tableName} ---`, specErr);
                }
            }
        }

        // Isolated Images Fetch
        try {
            const imagesResult = await db.query(`
                SELECT image_url 
                FROM structural_images 
                WHERE part_id = $1 
                AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'structural_images')
            `, [id]);
            images = imagesResult.rows.map(r => r.image_url);
            console.log(`--- FETCHED ${images.length} IMAGES FOR PART ${id} ---`, images);
        } catch (e) { console.error('--- ERROR FETCHING STRUCTURAL_IMAGES ---', e); }

        console.log(`--- STRUCTURAL PART ${id} DATA ASSEMBLED SUCCESSFULLY ---`);
        sendSuccess(res, {
            ...part,
            techSpec,
            categorySpec,
            categoryData,
            images,
            custom_params: part.custom_params || {}
        });
    } catch (error) {
        console.error(`--- CRITICAL ERROR IN getStructuralPartById FOR ID ${id} ---`, error);
        next(error);
    }
};

const createStructuralPart = async (req, res, next) => {
    const body = req.body;
    let partId;
    const { category_name, spec_data, ...masterData } = body;

    try {
        await db.query('BEGIN');

        // Ensure part_category is populated from category_name if missing
        if (!body.part_category && body.category_name) {
            body.part_category = body.category_name;
        }

        // 1. Insert Master
        const masterFields = ['part_category', 'part_name', 'part_number', 'internal_part_code', 'compatible_dispenser_model', 'assembly_group', 'part_position', 'part_description', 'manufacturer_fabricator', 'brand', 'status', 'stock_quantity'];
        const masterValues = masterFields.map(f => sanitizeValue(body[f]));
        const masterPlaceholders = masterFields.map((_, i) => `$${i + 1}`).join(', ');
        
        try {
            const masterResult = await db.query(
                `INSERT INTO STRUCTURAL_PART_MASTER (${masterFields.join(', ')}) VALUES (${masterPlaceholders}) RETURNING part_id`,
                masterValues
            );
            partId = masterResult.rows[0].part_id;

            // 2. Insert Tech Spec
            const techFields = ['material_type', 'material_grade', 'sheet_thickness', 'surface_finish', 'paint_coating_color', 'coating_thickness', 'corrosion_protection', 'rust_proof_treatment', 'welding_required', 'bending_required', 'laser_cutting_required', 'cnc_cutting_required', 'edge_finish', 'waterproof_sealing_required', 'rubber_gasket_required', 'length', 'width', 'height', 'thickness', 'weight', 'tolerance', 'hole_count', 'hole_diameter', 'cutout_available', 'cutout_type', 'cutout_size', 'bend_angle', 'bend_count', 'mounting_hole_pattern'];
            const techValues = techFields.map(f => sanitizeValue(body[f]));
            const techPlaceholders = techFields.map((_, i) => `$${i + 2}`).join(', ');

            try {
                await db.query(
                    `INSERT INTO STRUCTURAL_TECH_SPEC (part_id, ${techFields.join(', ')}) VALUES ($1, ${techPlaceholders})`,
                    [partId, ...techValues]
                );
            } catch (err) {
                console.error('--- ERROR INSERTING TECH SPEC ---', err);
                throw err;
            }

            // 3. Category Spec & Specialized Routing
            if (category_name) {
            const parsedData = typeof spec_data === 'string' ? JSON.parse(spec_data) : spec_data;
            
            try {
                await db.query(
                    `INSERT INTO STRUCTURAL_CATEGORY_SPEC (part_id, category_name, spec_data) VALUES ($1, $2, $3)`,
                    [partId, category_name, JSON.stringify(parsedData || {})]
                );
            } catch (err) {
                console.error('--- ERROR INSERTING CATEGORY SPEC ---', err);
                throw err;
            }

            // Mapping for specialized tables
            const mapping = {
                'Cabinet Body': { table: 'cabinet_body_specs', columns: ['cabinet_type', 'cabinet_material', 'cabinet_height', 'cabinet_width', 'cabinet_depth', 'door_opening_side', 'ventilation_available', 'number_of_vents', 'ip_protection_target', 'internal_mounting_plate_available', 'base_stand_available', 'locking_arrangement', 'cable_entry_holes', 'hose_entry_hole', 'earthing_point_available'] },
                'Front Door': { table: 'front_door_specs', columns: ['door_type', 'door_material', 'door_opening_direction', 'lock_type', 'lock_count', 'hinge_type', 'hinge_count', 'rubber_gasket_available', 'display_cutout_available', 'printer_cutout_available', 'keypad_cutout_available', 'sticker_area_available', 'door_stopper_available'] },
                'Side Panel': { table: 'side_panel_specs', columns: ['panel_side', 'panel_type', 'ventilation_slot_available', 'number_of_vent_slots', 'access_opening_available', 'hose_pipe_opening_available', 'nozzle_holder_mounting_available', 'fastner_type', 'panel_reinforcement_available'] },
                'Top Cover': { table: 'top_cover_specs', columns: ['cover_type', 'rain_protection_design', 'overhang_available', 'mounting_type', 'sealing_gasket_available', 'cable_entry_available', 'ventilation_available', 'branding_area_available'] },
                'Base Frame': { table: 'base_frame_specs', columns: ['base_type', 'base_material', 'load_capacity', 'foot_stand_count', 'floor_mounting_hole_available', 'anchor_bolt_size', 'anti_vibration_pad_available', 'leveling_foot_available', 'bottom_clearance', 'drain_hole_available'] },
                'Internal Mounting Plate': { table: 'internal_mounting_plate_specs', columns: ['plate_usage', 'plate_material', 'mounting_hole_pattern', 'component_mounting_slots', 'cable_routing_holes', 'din_rail_mounting_available', 'earthing_stud_available', 'removable_plate'] },
                'Nozzle Holder': { table: 'nozzle_holder_specs', columns: ['holder_type', 'nozzle_compatibility', 'holder_material', 'mounting_side', 'nozzle_sensor_mount_available', 'drain_hole_available', 'locking_support_available', 'rubber_padding_available', 'cutout_size'] },
                'Hose Entry Plate': { table: 'hose_entry_plate_specs', columns: ['hose_entry_type', 'hose_diameter_support', 'grommet_available', 'pipe_clamp_mount_available', 'swivel_mount_support', 'hole_diameter', 'reinforcement_plate_available', 'leak_drain_path_available'] },
                'Display': { table: 'display_specs', columns: ['panel_usage', 'display_cutout_size', 'keypad_cutout_available', 'printer_cutout_available', 'acrylic_window_available', 'window_material', 'window_thickness', 'sticker_branding_area', 'button_hole_count', 'indicator_hole_count'] },
                'Lock': { table: 'lock_specs', columns: ['hardware_type', 'material', 'size', 'load_capacity', 'opening_angle', 'fastener_size', 'finish', 'quantity_per_dispenser', 'replacement_required'] }
            };

            const target = mapping[category_name];
            if (target) {
                const files = req.files || {};
                const fileFields = ['file_2d_drawing', 'file_3d_model', 'file_fabrication_drawing', 'file_assembly_drawing', 'file_cutting'];
                
                const colNames = ['part_id', ...target.columns, ...fileFields, 'part_images_gallery'];
                const values = [
                    partId,
                    ...target.columns.map(c => parsedData[c]),
                    ...fileFields.map(f => files[f] ? `/uploads/inventory/${files[f][0].filename}` : null),
                    JSON.stringify(files['part_images'] ? files['part_images'].map(f => `/uploads/inventory/${f.filename}`) : [])
                ];
                const placeholders = colNames.map((_, i) => `$${i + 1}`).join(', ');

                try {
                    await db.query(
                        `INSERT INTO ${target.table} (${colNames.join(', ')}) VALUES (${placeholders})`,
                        values.map(v => sanitizeValue(v))
                    );
                } catch (err) {
                    console.error(`--- ERROR INSERTING INTO ${target.table} ---`, err);
                    throw err;
                }
            }
        } else if (category_name) {
            // Custom category — just record the category name
            try {
                await db.query(
                    `INSERT INTO STRUCTURAL_CATEGORY_SPEC (part_id, category_name, spec_data) VALUES ($1, $2, $3)`,
                    [partId, category_name, '{}']
                );
            } catch (err) { console.error('--- ERROR INSERTING CUSTOM CATEGORY SPEC ---', err); }
        }

        // Save custom_params for custom categories
        if (body.custom_params) {
            try {
                const parsedCustom = typeof body.custom_params === 'string' ? body.custom_params : JSON.stringify(body.custom_params);
                await db.query(`UPDATE STRUCTURAL_PART_MASTER SET custom_params = $1 WHERE part_id = $2`, [parsedCustom, partId]);
            } catch (err) { console.error('--- ERROR SAVING CUSTOM PARAMS ---', err); }
        }

    } catch (err) {
        console.error('--- ERROR IN MASTER TRANSACTION ---', err);
        throw err;
    }

        // 4. Handle Images for Master Gallery
        if (req.files && req.files['part_images']) {
            try {
                for (const f of req.files['part_images']) {
                    await db.query(
                        `INSERT INTO STRUCTURAL_IMAGES (part_id, image_url) VALUES ($1, $2)`,
                        [partId, `/uploads/inventory/${f.filename}`]
                    );
                }
            } catch (err) {
                console.error('--- ERROR INSERTING IMAGES ---', err);
            }
        }

        await db.query('COMMIT');
        sendSuccess(res, { part_id: partId }, 'Structural Part registered successfully', 201);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Create Error:', error);
        next(error);
    }
};

const updateStructuralPart = async (req, res, next) => {
    const { id } = req.params;
    const body = req.body;
    const { category_name, spec_data } = body;

    try {
        await db.query('BEGIN');

        // Ensure part_category is populated from category_name if missing
        if (!body.part_category && body.category_name) {
            body.part_category = body.category_name;
        }

        // 1. Update Master
        const masterFields = ['part_category', 'part_name', 'part_number', 'internal_part_code', 'compatible_dispenser_model', 'assembly_group', 'part_position', 'part_description', 'manufacturer_fabricator', 'brand', 'status', 'stock_quantity'];
        let masterSetParts = masterFields.map((f, i) => `${f}=$${i+1}`);
        let masterValues = masterFields.map(f => sanitizeValue(body[f]));
        masterValues.push(id);

        try {
            await db.query(
                `UPDATE STRUCTURAL_PART_MASTER SET ${masterSetParts.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE part_id=$${masterValues.length}`,
                masterValues
            );
        } catch (err) {
            console.error('--- ERROR UPDATING MASTER RECORD ---', err);
            throw err;
        }

        // 2. Update Tech Spec
        const techFields = ['material_type', 'material_grade', 'sheet_thickness', 'surface_finish', 'paint_coating_color', 'coating_thickness', 'corrosion_protection', 'rust_proof_treatment', 'welding_required', 'bending_required', 'laser_cutting_required', 'cnc_cutting_required', 'edge_finish', 'waterproof_sealing_required', 'rubber_gasket_required', 'length', 'width', 'height', 'thickness', 'weight', 'tolerance', 'hole_count', 'hole_diameter', 'cutout_available', 'cutout_type', 'cutout_size', 'bend_angle', 'bend_count', 'mounting_hole_pattern'];
        let techSetParts = techFields.map((f, i) => `${f}=$${i+2}`);
        let techValues = techFields.map(f => sanitizeValue(body[f]));
        
        try {
            await db.query(
                `UPDATE STRUCTURAL_TECH_SPEC SET ${techSetParts.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE part_id=$1`,
                [id, ...techValues]
            );
        } catch (err) {
            console.error('--- ERROR UPDATING TECH SPEC ---', err);
            throw err;
        }

        // 3. Update Category Spec & Specialized Table
        if (category_name) {
            const parsedData = typeof spec_data === 'string' ? JSON.parse(spec_data) : spec_data;
            try {
                await db.query(
                    `UPDATE STRUCTURAL_CATEGORY_SPEC SET spec_data=$1 WHERE part_id=$2`,
                    [JSON.stringify(parsedData || {}), id]
                );
            } catch (err) {
                console.error('--- ERROR UPDATING CATEGORY SPEC ---', err);
                throw err;
            }

            const mapping = {
                'Cabinet Body': { table: 'cabinet_body_specs', columns: ['cabinet_type', 'cabinet_material', 'cabinet_height', 'cabinet_width', 'cabinet_depth', 'door_opening_side', 'ventilation_available', 'number_of_vents', 'ip_protection_target', 'internal_mounting_plate_available', 'base_stand_available', 'locking_arrangement', 'cable_entry_holes', 'hose_entry_hole', 'earthing_point_available'] },
                'Front Door': { table: 'front_door_specs', columns: ['door_type', 'door_material', 'door_opening_direction', 'lock_type', 'lock_count', 'hinge_type', 'hinge_count', 'rubber_gasket_available', 'display_cutout_available', 'printer_cutout_available', 'keypad_cutout_available', 'sticker_area_available', 'door_stopper_available'] },
                'Side Panel': { table: 'side_panel_specs', columns: ['panel_side', 'panel_type', 'ventilation_slot_available', 'number_of_vent_slots', 'access_opening_available', 'hose_pipe_opening_available', 'nozzle_holder_mounting_available', 'fastner_type', 'panel_reinforcement_available'] },
                'Top Cover': { table: 'top_cover_specs', columns: ['cover_type', 'rain_protection_design', 'overhang_available', 'mounting_type', 'sealing_gasket_available', 'cable_entry_available', 'ventilation_available', 'branding_area_available'] },
                'Base Frame': { table: 'base_frame_specs', columns: ['base_type', 'base_material', 'load_capacity', 'foot_stand_count', 'floor_mounting_hole_available', 'anchor_bolt_size', 'anti_vibration_pad_available', 'leveling_foot_available', 'bottom_clearance', 'drain_hole_available'] },
                'Internal Mounting Plate': { table: 'internal_mounting_plate_specs', columns: ['plate_usage', 'plate_material', 'mounting_hole_pattern', 'component_mounting_slots', 'cable_routing_holes', 'din_rail_mounting_available', 'earthing_stud_available', 'removable_plate'] },
                'Nozzle Holder': { table: 'nozzle_holder_specs', columns: ['holder_type', 'nozzle_compatibility', 'holder_material', 'mounting_side', 'nozzle_sensor_mount_available', 'drain_hole_available', 'locking_support_available', 'rubber_padding_available', 'cutout_size'] },
                'Hose Entry Plate': { table: 'hose_entry_plate_specs', columns: ['hose_entry_type', 'hose_diameter_support', 'grommet_available', 'pipe_clamp_mount_available', 'swivel_mount_support', 'hole_diameter', 'reinforcement_plate_available', 'leak_drain_path_available'] },
                'Display': { table: 'display_specs', columns: ['panel_usage', 'display_cutout_size', 'keypad_cutout_available', 'printer_cutout_available', 'acrylic_window_available', 'window_material', 'window_thickness', 'sticker_branding_area', 'button_hole_count', 'indicator_hole_count'] },
                'Lock': { table: 'lock_specs', columns: ['hardware_type', 'material', 'size', 'load_capacity', 'opening_angle', 'fastener_size', 'finish', 'quantity_per_dispenser', 'replacement_required'] }
            };

            const target = mapping[category_name];
            if (target) {
                const files = req.files || {};
                const fileFields = ['file_2d_drawing', 'file_3d_model', 'file_fabrication_drawing', 'file_assembly_drawing', 'file_cutting'];
                
                let setParts = target.columns.map((c, i) => `${c}=$${i+2}`);
                let values = target.columns.map(c => sanitizeValue(parsedData[c]));

                // Handle Files in update
                fileFields.forEach(f => {
                    if (files[f]) {
                        setParts.push(`${f}=$${values.length + 2}`);
                        values.push(`/uploads/inventory/${files[f][0].filename}`);
                    }
                });

                if (files['part_images']) {
                    setParts.push(`part_images_gallery=$${values.length + 2}`);
                    values.push(JSON.stringify(files['part_images'].map(f => `/uploads/inventory/${f.filename}`)));
                }

                try {
                    await db.query(
                        `UPDATE ${target.table} SET ${setParts.join(', ')} WHERE part_id=$1`,
                        [id, ...values]
                    );
                } catch (err) {
                    console.error(`--- ERROR UPDATING SPECIALIZED TABLE ${target.table} ---`, err);
                    throw err;
                }
            }
        }

        // Update custom_params for custom categories
        if (body.custom_params !== undefined) {
            try {
                const parsedCustom = typeof body.custom_params === 'string' ? body.custom_params : JSON.stringify(body.custom_params || {});
                await db.query(`UPDATE STRUCTURAL_PART_MASTER SET custom_params = $1 WHERE part_id = $2`, [parsedCustom, id]);
            } catch (err) { console.error('--- ERROR UPDATING CUSTOM PARAMS ---', err); }
        }

        // 4. Handle Images for Master Gallery (New Images)
        if (req.files && req.files['part_images']) {
            try {
                for (const f of req.files['part_images']) {
                    await db.query(
                        `INSERT INTO STRUCTURAL_IMAGES (part_id, image_url) VALUES ($1, $2)`,
                        [id, `/uploads/inventory/${f.filename}`]
                    );
                }
            } catch (err) {
                console.error('--- ERROR INSERTING NEW IMAGES ---', err);
            }
        }

        await db.query('COMMIT');
        sendSuccess(res, null, 'Structural Part updated successfully');
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Update Error:', error);
        next(error);
    }
};

const deleteStructuralPart = async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE STRUCTURAL_PART_MASTER SET is_active=FALSE WHERE part_id=$1', [id]);
        sendSuccess(res, null, 'Structural Part deleted successfully');
    } catch (error) {
        next(error);
    }
};

const deleteStructuralImage = async (req, res, next) => {
    const { id } = req.params;
    const { imageUrl } = req.body;
    try {
        await db.query('DELETE FROM structural_images WHERE part_id = $1 AND image_url = $2', [id, imageUrl]);
        sendSuccess(res, null, 'Image removed successfully');
    } catch (error) {
        next(error);
    }
};

const deleteStructuralFile = async (req, res, next) => {
    const { id } = req.params;
    const { field } = req.body;
    try {
        const validFields = ['file_2d_drawing', 'file_3d_model', 'file_fabrication_drawing', 'file_assembly_drawing', 'file_cutting'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid file field' } });
        }

        // We need to find which specialized table to update
        const catResult = await db.query('SELECT category_name FROM structural_category_spec WHERE part_id = $1', [id]);
        if (catResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Category not found for this part' } });
        }

        const tableMap = {
            'Cabinet Body': 'cabinet_body_specs',
            'Front Door': 'front_door_specs',
            'Side Panel': 'side_panel_specs',
            'Top Cover': 'top_cover_specs',
            'Base Frame': 'base_frame_specs',
            'Internal Mounting Plate': 'internal_mounting_plate_specs',
            'Nozzle Holder': 'nozzle_holder_specs',
            'Hose Entry Plate': 'hose_entry_plate_specs',
            'Display': 'display_specs',
            'Lock': 'lock_specs'
        };

        const tableName = tableMap[catResult.rows[0].category_name];
        if (!tableName) {
            return res.status(400).json({ success: false, error: { message: 'Specialized table not found' } });
        }

        await db.query(`UPDATE ${tableName} SET ${field} = NULL WHERE part_id = $1`, [id]);
        sendSuccess(res, null, 'File removed successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getStructuralParts,
    getStructuralPartById,
    createStructuralPart,
    updateStructuralPart,
    deleteStructuralPart,
    deleteStructuralImage,
    deleteStructuralFile
};
