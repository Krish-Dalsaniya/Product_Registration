const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const hardwareInventoryConfig = {
    pcb: {
        table: 'PCB_MASTER',
        idColumn: 'pcb_id',
        nameExpression: "COALESCE(NULLIF(TRIM(pcb_name), ''), NULLIF(TRIM(part_no), ''), 'Unnamed PCB')"
    },
    electrical: {
        table: 'electrical_part_master',
        idColumn: 'part_id',
        nameExpression: "TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != '' THEN ' (' || TRIM(part_number) || ')' ELSE '' END"
    },
    electronics: {
        table: 'electronics_part_master',
        idColumn: 'part_id',
        nameExpression: "TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != '' THEN ' (' || TRIM(part_number) || ')' ELSE '' END"
    },
    structural: {
        table: 'structural_part_master',
        idColumn: 'part_id',
        nameExpression: "TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != '' THEN ' (' || TRIM(part_number) || ')' ELSE '' END"
    }
};

const parseQuantity = (value) => Number.parseInt(value, 10) || 0;

const getHardwareInventoryState = async (hardwareFeatures = []) => {
    const rows = await Promise.all(hardwareFeatures.map(async (feature) => {
        const config = hardwareInventoryConfig[feature.type];
        if (!config) {
            return {
                ...feature,
                name: feature.name || `ID: ${feature.id}`,
                stockQuantity: 0
            };
        }

        const result = await db.query(
            `SELECT ${config.nameExpression} AS name, COALESCE(stock_quantity, 0) AS stock_quantity
             FROM ${config.table}
             WHERE ${config.idColumn} = $1`,
            [feature.id]
        );

        const row = result.rows[0];
        return {
            ...feature,
            name: row?.name || feature.name || `ID: ${feature.id}`,
            stockQuantity: parseQuantity(row?.stock_quantity)
        };
    }));

    return rows;
};

const validateHardwareInventory = async (hardwareFeatures = [], quantity = 1) => {
    const requestedQuantity = Math.max(parseQuantity(quantity), 1);
    if (!Array.isArray(hardwareFeatures) || hardwareFeatures.length === 0) {
        return null;
    }

    const inventoryState = await getHardwareInventoryState(hardwareFeatures);
    const shortage = inventoryState.find((feature) => feature.stockQuantity < requestedQuantity);

    if (!shortage) {
        return null;
    }

    return {
        message: `${shortage.name} quantity is not enough in the inventory. Required ${requestedQuantity}, available ${shortage.stockQuantity}.`,
        feature: shortage
    };
};

const getFinishedGoods = async (req, res, next) => {
    const { page, limit, offset } = parsePagination(req);
    const { search, product_id } = req.query;

    try {
        let queryText = `
            WITH PaginatedGoods AS (
                SELECT fg.*, p.product_name, p.product_code, p.image_url,
                COUNT(*) OVER() as total_count 
                FROM finished_goods fg
                JOIN products p ON fg.product_id = p.product_id
                WHERE 1=1
        `;
        const params = [limit, offset];

        if (search) {
            queryText += ` AND (p.product_name ILIKE $${params.length + 1} OR p.product_code ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }
        
        if (product_id) {
            queryText += ` AND fg.product_id = $${params.length + 1}`;
            params.push(product_id);
        }

        queryText += ` 
                ORDER BY fg.created_at DESC LIMIT $1 OFFSET $2
            )
            SELECT pg.*,
                COALESCE((
                    SELECT JSON_AGG(h)
                    FROM finished_goods_hardware h
                    WHERE h.finished_good_id = pg.id
                ), '[]'::json) as hardware_features,
                COALESCE((
                    SELECT JSON_AGG(s.serial_number)
                    FROM finished_goods_serials s
                    WHERE s.finished_good_id = pg.id
                ), '[]'::json) as serial_numbers
            FROM PaginatedGoods pg
            ORDER BY pg.created_at DESC;
        `;

        const result = await db.query(queryText, params);
        
        const finishedGoods = result.rows;
        const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        sendSuccess(res, finishedGoods, { page, limit, total });
    } catch (error) {
        next(error);
    }
};

const updateHardwareInventory = async (client, hardwareFeatures, qty, isRefund = false) => {
    const amount = parseQuantity(qty);
    if (amount <= 0 || !Array.isArray(hardwareFeatures)) return;
    
    for (const feature of hardwareFeatures) {
        const type = feature.type || feature.component_type;
        const id = feature.id || feature.component_id;
        
        const config = hardwareInventoryConfig[type];
        if (config) {
            if (isRefund) {
                await client.query(`UPDATE ${config.table} SET stock_quantity = COALESCE(stock_quantity, 0) + $1 WHERE ${config.idColumn} = $2`, [amount, id]);
            } else {
                await client.query(`UPDATE ${config.table} SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - $1, 0) WHERE ${config.idColumn} = $2`, [amount, id]);
            }
        }
    }
};

const createFinishedGood = async (req, res, next) => {
    const { product_id, quantity, hardware_features, communication_details, power_controller, motherboard_id, is_iot, version } = req.body;
    
    try {
        const isIotEnabled = is_iot === true || is_iot === 'true';
        let finished_good_id;
        let serialNumbers = [];

        const inventoryError = await validateHardwareInventory(hardware_features, quantity);
        if (inventoryError) {
            return res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_INVENTORY', message: inventoryError.message, details: inventoryError.feature } });
        }

        const versionToCheck = version || '1.0';
        const duplicateCheck = await db.query('SELECT id FROM finished_goods WHERE product_id = $1 AND version = $2', [product_id, versionToCheck]);
        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: { code: 'DUPLICATE_VERSION', message: `A finished good with version '${versionToCheck}' already exists for this product.` } });
        }

        await db.withTransaction(async (client) => {
            const fgResult = await client.query(
                `INSERT INTO finished_goods 
                (product_id, quantity, is_iot, communication_details, power_controller, motherboard_id, version) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [
                    product_id, 
                    quantity || 1, 
                    isIotEnabled,
                    isIotEnabled ? JSON.stringify(communication_details || []) : '[]',
                    isIotEnabled ? !!power_controller : false,
                    isIotEnabled ? (motherboard_id || null) : null,
                    version || '1.0'
                ]
            );
            finished_good_id = fgResult.rows[0].id;

            // Insert hardware features
            if (hardware_features && Array.isArray(hardware_features)) {
                for (const feature of hardware_features) {
                    await client.query(
                        'INSERT INTO finished_goods_hardware (finished_good_id, component_type, component_id) VALUES ($1, $2, $3)',
                        [finished_good_id, feature.type, feature.id]
                    );
                }
                await updateHardwareInventory(client, hardware_features, quantity, false);
            }

            if (isIotEnabled && motherboard_id) {
                await updateHardwareInventory(client, [{ type: 'pcb', id: motherboard_id }], quantity, false);
            }

            // Generate serial numbers based on quantity
            const qty = parseInt(quantity) || 1;
            for (let i = 0; i < qty; i++) {
                const serialNumber = `FG-${product_id}-${Date.now()}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
                serialNumbers.push(serialNumber);
                await client.query(
                    'INSERT INTO finished_goods_serials (finished_good_id, serial_number) VALUES ($1, $2)',
                    [finished_good_id, serialNumber]
                );
            }
        });

        sendSuccess(res, { id: finished_good_id, serial_numbers: serialNumbers }, 'Finished Good created successfully');
    } catch (error) {
        next(error);
    }
};

const getComponentOptions = async (req, res, next) => {
    try {
        const [products, pcbs, electrical, electronics, structural] = await Promise.all([
            db.query('SELECT product_id as id, product_name as name FROM products WHERE is_active = TRUE ORDER BY product_name'),
            db.query(`
                SELECT DISTINCT ON (LOWER(TRIM(pcb_name))) pcb_id as id, TRIM(pcb_name) as name, COALESCE(stock_quantity, 0) AS stock_quantity 
                FROM PCB_MASTER 
                WHERE is_active = TRUE AND pcb_name IS NOT NULL AND TRIM(pcb_name) != ''
                ORDER BY LOWER(TRIM(pcb_name))
            `),
            db.query(`
                SELECT DISTINCT ON (LOWER(TRIM(part_name)), LOWER(TRIM(COALESCE(part_number, '')))) 
                       part_id as id, 
                       TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != '' THEN ' (' || TRIM(part_number) || ')' ELSE '' END as name,
                       COALESCE(stock_quantity, 0) AS stock_quantity
                FROM electrical_part_master 
                WHERE is_active = TRUE AND part_name IS NOT NULL AND TRIM(part_name) != ''
                ORDER BY LOWER(TRIM(part_name)), LOWER(TRIM(COALESCE(part_number, '')))
            `),
            db.query(`
                SELECT DISTINCT ON (LOWER(TRIM(part_name)), LOWER(TRIM(COALESCE(part_number, '')))) 
                       part_id as id, 
                       TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != '' THEN ' (' || TRIM(part_number) || ')' ELSE '' END as name,
                       COALESCE(stock_quantity, 0) AS stock_quantity
                FROM electronics_part_master 
                WHERE is_active = TRUE AND part_name IS NOT NULL AND TRIM(part_name) != ''
                ORDER BY LOWER(TRIM(part_name)), LOWER(TRIM(COALESCE(part_number, '')))
            `),
            db.query(`
                SELECT DISTINCT ON (LOWER(TRIM(part_name)), LOWER(TRIM(COALESCE(part_number, '')))) 
                       part_id as id, 
                       TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != '' THEN ' (' || TRIM(part_number) || ')' ELSE '' END as name,
                       COALESCE(stock_quantity, 0) AS stock_quantity
                FROM structural_part_master 
                WHERE is_active = TRUE AND part_name IS NOT NULL AND TRIM(part_name) != ''
                ORDER BY LOWER(TRIM(part_name)), LOWER(TRIM(COALESCE(part_number, '')))
            `)
        ]);

        sendSuccess(res, {
            products: products.rows,
            pcb: pcbs.rows,
            electrical: electrical.rows,
            electronics: electronics.rows,
            structural: structural.rows
        });
    } catch (error) {
        next(error);
    }
};

const deleteFinishedGood = async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.withTransaction(async (client) => {
            // Check if referenced by book_a_sale
            const saleCheck = await client.query('SELECT 1 FROM book_a_sale WHERE finished_good_id = $1 LIMIT 1', [id]);
            if (saleCheck.rows.length > 0) {
                throw new Error('FOREIGN_KEY_VIOLATION');
            }

            const existing = await client.query('SELECT quantity, motherboard_id, is_iot FROM finished_goods WHERE id = $1', [id]);
            if (existing.rows.length > 0) {
                const oldQty = existing.rows[0].quantity;
                const oldFeaturesRes = await client.query('SELECT component_type as type, component_id as id FROM finished_goods_hardware WHERE finished_good_id = $1', [id]);
                await updateHardwareInventory(client, oldFeaturesRes.rows, oldQty, true);
                
                if (existing.rows[0].is_iot && existing.rows[0].motherboard_id) {
                    await updateHardwareInventory(client, [{ type: 'pcb', id: existing.rows[0].motherboard_id }], oldQty, true);
                }
            }

            // Remove serials and hardware entries
            await client.query('DELETE FROM finished_goods_serials WHERE finished_good_id = $1', [id]);
            await client.query('DELETE FROM finished_goods_hardware WHERE finished_good_id = $1', [id]);

            // Remove the finished good record
            await client.query('DELETE FROM finished_goods WHERE id = $1', [id]);
        });

        sendSuccess(res, { id }, 'Finished Good deleted successfully');
    } catch (err) {
        if (err.message === 'FOREIGN_KEY_VIOLATION') {
            return sendError(res, 'FOREIGN_KEY_VIOLATION', 'Cannot delete this Finished Good because it has already been sold (referenced in Book a Sale).', 400);
        }
        next(err);
    }
};

const updateFinishedGood = async (req, res, next) => {
    const { id } = req.params;
    const { product_id, quantity, hardware_features, communication_details, power_controller, motherboard_id, is_iot, version } = req.body;

    try {
        const isIotEnabled = is_iot === true || is_iot === 'true';
        let serialNumbers = [];

        const currentFgQuery = await db.query('SELECT * FROM finished_goods WHERE id = $1', [id]);
        if (currentFgQuery.rows.length === 0) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Finished Good not found' } });
        }
        const currentFg = currentFgQuery.rows[0];

        const oldHardwareQuery = await db.query('SELECT * FROM finished_goods_hardware WHERE finished_good_id = $1', [id]);
        const oldHardware = oldHardwareQuery.rows;

        const versionToCheck = version || '1.0';
        const duplicateCheck = await db.query('SELECT id FROM finished_goods WHERE product_id = $1 AND version = $2 AND id != $3', [product_id, versionToCheck, id]);
        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: { code: 'DUPLICATE_VERSION', message: `A finished good with version '${versionToCheck}' already exists for this product.` } });
        }

        await db.withTransaction(async (client) => {
            // Restore old inventory
            await updateHardwareInventory(client, oldHardware.map(h => ({ type: h.component_type, id: h.component_id })), currentFg.quantity, true);
            if (currentFg.is_iot && currentFg.motherboard_id) {
                await updateHardwareInventory(client, [{ type: 'pcb', id: currentFg.motherboard_id }], currentFg.quantity, true);
            }

            // Validate new inventory
            const inventoryError = await validateHardwareInventory(hardware_features, quantity);
            if (inventoryError) {
                throw new Error(inventoryError.message);
            }

            await client.query(
                `UPDATE finished_goods 
                 SET product_id = $1, quantity = $2, is_iot = $3, communication_details = $4, power_controller = $5, motherboard_id = $6, updated_at = CURRENT_TIMESTAMP, version = $7
                 WHERE id = $8`,
                [
                    product_id, 
                    quantity || 1, 
                    isIotEnabled,
                    isIotEnabled ? JSON.stringify(communication_details || []) : '[]',
                    isIotEnabled ? !!power_controller : false,
                    isIotEnabled ? (motherboard_id || null) : null,
                    version || '1.0',
                    id
                ]
            );

            // Update hardware features
            await client.query('DELETE FROM finished_goods_hardware WHERE finished_good_id = $1', [id]);
            if (hardware_features && Array.isArray(hardware_features)) {
                for (const feature of hardware_features) {
                    await client.query(
                        'INSERT INTO finished_goods_hardware (finished_good_id, component_type, component_id) VALUES ($1, $2, $3)',
                        [id, feature.type, feature.id]
                    );
                }
                await updateHardwareInventory(client, hardware_features, quantity, false);
            }

            if (isIotEnabled && motherboard_id) {
                await updateHardwareInventory(client, [{ type: 'pcb', id: motherboard_id }], quantity, false);
            }

            // Handle serial numbers
            if (parseInt(currentFg.quantity) !== parseInt(quantity) || parseInt(currentFg.product_id) !== parseInt(product_id)) {
                await client.query('DELETE FROM finished_goods_serials WHERE finished_good_id = $1', [id]);
                const serialNumbers = [];
                const qty = parseInt(quantity) || 1;
                for (let i = 0; i < qty; i++) {
                    const serialNumber = `FG-${product_id}-${Date.now()}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
                    serialNumbers.push(serialNumber);
                    await client.query(
                        'INSERT INTO finished_goods_serials (finished_good_id, serial_number) VALUES ($1, $2)',
                        [id, serialNumber]
                    );
                }
            }
        });

        sendSuccess(res, null, 'Finished Good updated successfully');
    } catch (error) {
        if (error.message === 'NOT_FOUND') {
            return sendError(res, 'NOT_FOUND', 'Finished Good not found', 404);
        }
        next(error);
    }
};

const addFinishedGoodStock = async (req, res, next) => {
    const { id } = req.params;
    const { quantityToAdd } = req.body;

    try {
        const addedQty = parseInt(quantityToAdd);
        if (isNaN(addedQty) || addedQty <= 0) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_QUANTITY', message: 'Quantity to add must be greater than zero.' } });
        }

        const currentFgQuery = await db.query('SELECT * FROM finished_goods WHERE id = $1', [id]);
        if (currentFgQuery.rows.length === 0) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Finished Good not found' } });
        }
        const currentFg = currentFgQuery.rows[0];

        const hardwareQuery = await db.query('SELECT component_type as type, component_id as id FROM finished_goods_hardware WHERE finished_good_id = $1', [id]);
        const hardwareFeatures = hardwareQuery.rows;

        // Check if we need motherboard for inventory check
        const featuresToCheck = [...hardwareFeatures];
        if (currentFg.is_iot && currentFg.motherboard_id) {
            featuresToCheck.push({ type: 'pcb', id: currentFg.motherboard_id });
        }

        // Validate inventory for the *new* amount only
        const inventoryError = await validateHardwareInventory(featuresToCheck, addedQty);
        if (inventoryError) {
            return res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_INVENTORY', message: inventoryError.message, details: inventoryError.feature } });
        }

        let newSerials = [];

        await db.withTransaction(async (client) => {
            // Update the quantity in finished_goods table
            await client.query(
                'UPDATE finished_goods SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [addedQty, id]
            );

            // Deduct from hardware inventory
            await updateHardwareInventory(client, featuresToCheck, addedQty, false);

            // Fetch current quantity to correctly start numbering the serials
            const existingSerialsCountRes = await client.query('SELECT COUNT(*) as count FROM finished_goods_serials WHERE finished_good_id = $1', [id]);
            const startIdx = parseInt(existingSerialsCountRes.rows[0].count) || 0;

            // Generate and insert new serials
            for (let i = 0; i < addedQty; i++) {
                const serialNumber = `FG-${currentFg.product_id}-${Date.now()}-${startIdx + i + 1}-${Math.floor(Math.random() * 1000)}`;
                newSerials.push(serialNumber);
                await client.query(
                    'INSERT INTO finished_goods_serials (finished_good_id, serial_number) VALUES ($1, $2)',
                    [id, serialNumber]
                );
            }
        });

        sendSuccess(res, { added_serials: newSerials }, `Successfully added ${addedQty} stock to the finished good`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFinishedGoods,
    createFinishedGood,
    getComponentOptions,
    deleteFinishedGood,
    updateFinishedGood,
    addFinishedGoodStock
};

