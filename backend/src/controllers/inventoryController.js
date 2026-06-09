const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const getPCBs = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { search } = req.query;

  try {
    let queryText = `
      SELECT p.*, pt.type_name as pcb_type, 
      (SELECT image_url FROM pcb_images WHERE pcb_id = p.pcb_id LIMIT 1) as image_url,
      COUNT(*) OVER() as total_count 
      FROM PCB_MASTER p
      LEFT JOIN PCB_TYPE_MASTER pt ON p.pcb_type_id = pt.pcb_type_id
      WHERE p.is_active = TRUE
    `;
    const params = [limit, offset];

    if (search) {
      queryText += ` AND (p.pcb_name ILIKE $3 OR p.part_no ILIKE $3)`;
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

const getPCBById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const pcbResult = await db.query(`
            SELECT p.*, pt.type_name as pcb_type, pt.type_description as pcb_type_desc
            FROM PCB_MASTER p
            LEFT JOIN PCB_TYPE_MASTER pt ON p.pcb_type_id = pt.pcb_type_id
            WHERE p.pcb_id = $1
        `, [id]);

        if (pcbResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'PCB not found' } });
        }

        const pcb = pcbResult.rows[0];

        // Fetch Files
        const filesResult = await db.query('SELECT * FROM PCB_FILE_MASTER WHERE pcb_id = $1', [id]);
        
        // Fetch Images
        const imagesResult = await db.query('SELECT image_url FROM pcb_images WHERE pcb_id = $1', [id]);
        const pcb_images = imagesResult.rows.map(row => row.image_url);
        
        // Fetch Firmware Mapping
        const mappingResult = await db.query(`
            SELECT 
                pfm.*, 
                pm.processor_type, pm.part_no as processor_part_no, pm.description as processor_desc,
                fm.firmware_branch_name as firmware_branch, fm.description as firmware_feature_desc,
                fvm.firmware_version,
                ffm.feature_name as firmware_feature
            FROM PCB_FIRMWARE_MAPPING pfm
            LEFT JOIN PROCESSOR_MASTER pm ON pfm.processor_id = pm.processor_id
            LEFT JOIN FIRMWARE_MASTER fm ON pfm.firmware_master_id = fm.firmware_master_id
            LEFT JOIN FIRMWARE_VERSION_MASTER fvm ON pfm.firmware_version_id = fvm.firmware_version_id
            LEFT JOIN FIRMWARE_FEATURE_MASTER ffm ON fm.firmware_master_id = ffm.firmware_master_id
            WHERE pfm.pcb_id = $1
            LIMIT 1
        `, [id]);

        const mapping = mappingResult.rows[0] || {};

        sendSuccess(res, {
            ...pcb,
            ...mapping,
            files: filesResult.rows[0] || {},
            pcb_images
        });
    } catch (error) {
        next(error);
    }
};

const createPCB = async (req, res, next) => {
  const { 
    pcb_name, 
    part_number, 
    pcb_description, 
    pcb_type, 
    pcb_type_desc,
    processor_type,
    processor_part_no,
    processor_count,
    processor_desc,
    firmware_branch,
    firmware_version,
    firmware_feature,
    firmware_feature_desc
  } = req.body;

  try {
    await db.withTransaction(async (client) => {
      // 1. Handle PCB Type
      let typeId = null;
      if (pcb_type) {
          const typeResult = await client.query(
              'INSERT INTO PCB_TYPE_MASTER (type_name, type_description) VALUES ($1, $2) ON CONFLICT (type_name) DO UPDATE SET type_description = $2 RETURNING pcb_type_id',
              [pcb_type, pcb_type_desc || '']
          );
          typeId = typeResult.rows[0].pcb_type_id;
      }

      // 2. Create PCB
      const pcbResult = await client.query(
        `INSERT INTO PCB_MASTER (pcb_name, pcb_type_id, part_no, description, processor_count, stock_quantity) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [pcb_name, typeId, part_number, pcb_description || '', parseInt(processor_count) || 0, parseInt(req.body.stock_quantity) || 0]
      );
      const pcb = pcbResult.rows[0];

      // 3. Handle Processor
      let processorId = null;
      if (processor_part_no) {
          const procResult = await client.query(
              'INSERT INTO PROCESSOR_MASTER (processor_type, part_no, description) VALUES ($1, $2, $3) ON CONFLICT (part_no) DO UPDATE SET processor_type = $1 RETURNING processor_id',
              [processor_type || 'Unknown', processor_part_no, processor_desc || '']
          );
          processorId = procResult.rows[0].processor_id;
      }

      // 4. Handle Firmware
      let firmwareMasterId = null;
      let firmwareVersionId = null;

      const hasFirmware = firmware_branch || firmware_version || firmware_feature || firmware_feature_desc;
      if (hasFirmware) {
          const branchName = firmware_branch || 'Unknown Branch';
          const firmwareResult = await client.query(
              'INSERT INTO FIRMWARE_MASTER (processor_id, firmware_branch_name, description) VALUES ($1, $2, $3) RETURNING firmware_master_id',
              [processorId, branchName, firmware_feature_desc || '']
          );
          firmwareMasterId = firmwareResult.rows[0].firmware_master_id;

          if (firmware_version) {
              const versionResult = await client.query(
                  'INSERT INTO FIRMWARE_VERSION_MASTER (firmware_master_id, firmware_version) VALUES ($1, $2) RETURNING firmware_version_id',
                  [firmwareMasterId, firmware_version]
              );
              firmwareVersionId = versionResult.rows[0].firmware_version_id;
          }

          if (firmware_feature) {
              await client.query(
                  'INSERT INTO FIRMWARE_FEATURE_MASTER (firmware_master_id, feature_name, feature_description) VALUES ($1, $2, $3)',
                  [firmwareMasterId, firmware_feature, firmware_feature_desc || '']
              );
          }
      }

      // 5. Create Mapping
      if (processorId || firmwareMasterId) {
          await client.query(
              'INSERT INTO PCB_FIRMWARE_MAPPING (pcb_id, processor_id, firmware_master_id, firmware_version_id, is_default) VALUES ($1, $2, $3, $4, $5)',
              [pcb.pcb_id, processorId, firmwareMasterId, firmwareVersionId, true]
          );
      }

      // 6. Handle Files
      if (req.files) {
          const files = req.files;
          await client.query(
              `INSERT INTO PCB_FILE_MASTER (
                  pcb_id, 
                  processor_file_url, 
                  brd_file_url, 
                  sch_file_url, 
                  bom_file_url, 
                  stencil_file_url, 
                  panel_gerber_file_url, 
                  layer_stacking_file_url, 
                  production_instruction_url
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                  pcb.pcb_id,
                  files['file_gerber'] ? `/uploads/inventory/${files['file_gerber'][0].filename}` : null,
                  files['file_board'] ? `/uploads/inventory/${files['file_board'][0].filename}` : null,
                  files['file_schematic'] ? `/uploads/inventory/${files['file_schematic'][0].filename}` : null,
                  files['file_bom'] ? `/uploads/inventory/${files['file_bom'][0].filename}` : null,
                  files['file_stencile'] ? `/uploads/inventory/${files['file_stencile'][0].filename}` : null,
                  files['file_panel_gerber'] ? `/uploads/inventory/${files['file_panel_gerber'][0].filename}` : null,
                  files['file_layer_stack'] ? `/uploads/inventory/${files['file_layer_stack'][0].filename}` : null,
                  files['file_production_note'] ? `/uploads/inventory/${files['file_production_note'][0].filename}` : null
              ]
          );

          // Handle PCB Images securely
          if (files['pcb_images'] && files['pcb_images'].length > 0) {
              const values = [];
              const queryParts = [];
              let paramIndex = 1;
              files['pcb_images'].forEach(file => {
                  queryParts.push(`($1, $${paramIndex + 1})`);
                  values.push(`/uploads/inventory/${file.filename}`);
                  paramIndex += 1;
              });
              await client.query(`INSERT INTO pcb_images (pcb_id, image_url) VALUES ${queryParts.join(', ')}`, [pcb.pcb_id, ...values]);
          }
      }
    });

    // Need to fetch pcb again? Or just return the one we created.
    // We didn't save `pcb` outside the block but `req.body` has most info.
    // Wait, let's just return success without the full PCB object or fetch it if necessary.
    // The original code did `sendSuccess(res, pcb, ...)`
    sendSuccess(res, null, 'PCB registered successfully', 201);
  } catch (error) {
    console.error('PCB Creation Error:', error);
    next(error);
  }
};

const updatePCB = async (req, res, next) => {
    const { id } = req.params;
    const { 
      pcb_name, 
      part_number, 
      pcb_description, 
      pcb_type, 
      pcb_type_desc,
      processor_type,
      processor_part_no,
      processor_count,
      processor_desc,
      firmware_branch,
      firmware_version,
      firmware_feature,
      firmware_feature_desc
    } = req.body;
  
    try {
      await db.withTransaction(async (client) => {
        // 1. Handle PCB Type
        let typeId = null;
        if (pcb_type) {
            const typeResult = await client.query(
                'INSERT INTO PCB_TYPE_MASTER (type_name, type_description) VALUES ($1, $2) ON CONFLICT (type_name) DO UPDATE SET type_description = $2 RETURNING pcb_type_id',
                [pcb_type, pcb_type_desc || '']
            );
            typeId = typeResult.rows[0].pcb_type_id;
        }
    
        // 2. Update PCB
        await client.query(
          `UPDATE PCB_MASTER 
           SET pcb_name = $1, pcb_type_id = $2, part_no = $3, description = $4, processor_count = $5, stock_quantity = $6, updated_at = CURRENT_TIMESTAMP
           WHERE pcb_id = $7`,
          [pcb_name, typeId, part_number, pcb_description || '', parseInt(processor_count) || 0, parseInt(req.body.stock_quantity) || 0, id]
        );
    
        // 3. Handle Processor
        let processorId = null;
        if (processor_part_no) {
            const procResult = await client.query(
                'INSERT INTO PROCESSOR_MASTER (processor_type, part_no, description) VALUES ($1, $2, $3) ON CONFLICT (part_no) DO UPDATE SET processor_type = $1, description = $3 RETURNING processor_id',
                [processor_type || 'Unknown', processor_part_no, processor_desc || '']
            );
            processorId = procResult.rows[0].processor_id;
        }
    
        // 4. Handle Firmware & Mapping
        let firmwareMasterId = null;
        let firmwareVersionId = null;

        const hasFirmware = firmware_branch || firmware_version || firmware_feature || firmware_feature_desc;
        if (hasFirmware) {
            const branchName = firmware_branch || 'Unknown Branch';
            // Check if firmware master exists, if not create
            let fmResult;
            if (processorId) {
                fmResult = await client.query(
                    'SELECT firmware_master_id FROM FIRMWARE_MASTER WHERE processor_id = $1 AND firmware_branch_name = $2',
                    [processorId, branchName]
                );
            } else {
                fmResult = await client.query(
                    'SELECT firmware_master_id FROM FIRMWARE_MASTER WHERE processor_id IS NULL AND firmware_branch_name = $1',
                    [branchName]
                );
            }
            
            if (fmResult.rows.length > 0) {
                firmwareMasterId = fmResult.rows[0].firmware_master_id;
                await client.query(
                    'UPDATE FIRMWARE_MASTER SET description = $1 WHERE firmware_master_id = $2',
                    [firmware_feature_desc || '', firmwareMasterId]
                );
            } else {
                const insertFmResult = await client.query(
                    'INSERT INTO FIRMWARE_MASTER (processor_id, firmware_branch_name, description) VALUES ($1, $2, $3) RETURNING firmware_master_id',
                    [processorId, branchName, firmware_feature_desc || '']
                );
                firmwareMasterId = insertFmResult.rows[0].firmware_master_id;
            }

            if (firmware_version) {
                const fvResult = await client.query(
                    'SELECT firmware_version_id FROM FIRMWARE_VERSION_MASTER WHERE firmware_master_id = $1 AND firmware_version = $2',
                    [firmwareMasterId, firmware_version]
                );
                if (fvResult.rows.length > 0) {
                    firmwareVersionId = fvResult.rows[0].firmware_version_id;
                } else {
                    const insertFvResult = await client.query(
                        'INSERT INTO FIRMWARE_VERSION_MASTER (firmware_master_id, firmware_version) VALUES ($1, $2) RETURNING firmware_version_id',
                        [firmwareMasterId, firmware_version]
                    );
                    firmwareVersionId = insertFvResult.rows[0].firmware_version_id;
                }
            }

            if (firmware_feature) {
                const ffResult = await client.query(
                    'SELECT firmware_feature_id FROM FIRMWARE_FEATURE_MASTER WHERE firmware_master_id = $1 AND feature_name = $2',
                    [firmwareMasterId, firmware_feature]
                );
                if (ffResult.rows.length > 0) {
                    await client.query(
                        'UPDATE FIRMWARE_FEATURE_MASTER SET feature_description = $1 WHERE firmware_master_id = $2 AND feature_name = $3',
                        [firmware_feature_desc || '', firmwareMasterId, firmware_feature]
                    );
                } else {
                    await client.query(
                        'INSERT INTO FIRMWARE_FEATURE_MASTER (firmware_master_id, feature_name, feature_description) VALUES ($1, $2, $3)',
                        [firmwareMasterId, firmware_feature, firmware_feature_desc || '']
                    );
                }
            }
        }

        if (processorId || firmwareMasterId) {
            const existingMapping = await client.query('SELECT * FROM PCB_FIRMWARE_MAPPING WHERE pcb_id = $1', [id]);
            if (existingMapping.rows.length > 0) {
                await client.query(
                    'UPDATE PCB_FIRMWARE_MAPPING SET processor_id = $1, firmware_master_id = $2, firmware_version_id = $3 WHERE pcb_id = $4',
                    [processorId, firmwareMasterId, firmwareVersionId, id]
                );
            } else {
                await client.query(
                  'INSERT INTO PCB_FIRMWARE_MAPPING (pcb_id, processor_id, firmware_master_id, firmware_version_id, is_default) VALUES ($1, $2, $3, $4, $5)',
                  [id, processorId, firmwareMasterId, firmwareVersionId, true]
                );
            }
        }
    
        // 5. Handle Files (Update only if new files provided)
        if (req.files && Object.keys(req.files).length > 0) {
            const files = req.files;
            const existingFiles = await client.query('SELECT * FROM PCB_FILE_MASTER WHERE pcb_id = $1', [id]);
            
            if (existingFiles.rows.length > 0) {
                // Build dynamic update
                let updateParts = [];
                let params = [id];
                let idx = 2;

                const mapping = {
                    file_gerber: 'processor_file_url',
                    file_board: 'brd_file_url',
                    file_schematic: 'sch_file_url',
                    file_bom: 'bom_file_url',
                    file_stencile: 'stencil_file_url',
                    file_panel_gerber: 'panel_gerber_file_url',
                    file_layer_stack: 'layer_stacking_file_url',
                    file_production_note: 'production_instruction_url'
                };

                  Object.keys(mapping).forEach(field => {
                      if (files[field]) {
                          updateParts.push(`${mapping[field]} = $${idx++}`);
                          params.push(`/uploads/inventory/${files[field][0].filename}`);
                      }
                  });

                if (updateParts.length > 0) {
                    await client.query(`UPDATE PCB_FILE_MASTER SET ${updateParts.join(', ')} WHERE pcb_id = $1`, params);
                }
            } else {
                // Insert new
                await client.query(
                  `INSERT INTO PCB_FILE_MASTER (
                      pcb_id, 
                      processor_file_url, brd_file_url, sch_file_url, bom_file_url, 
                      stencil_file_url, panel_gerber_file_url, layer_stacking_file_url, production_instruction_url
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                  [
                      id,
                      files['file_gerber'] ? `/uploads/inventory/${files['file_gerber'][0].filename}` : null,
                      files['file_board'] ? `/uploads/inventory/${files['file_board'][0].filename}` : null,
                      files['file_schematic'] ? `/uploads/inventory/${files['file_schematic'][0].filename}` : null,
                      files['file_bom'] ? `/uploads/inventory/${files['file_bom'][0].filename}` : null,
                      files['file_stencile'] ? `/uploads/inventory/${files['file_stencile'][0].filename}` : null,
                      files['file_panel_gerber'] ? `/uploads/inventory/${files['file_panel_gerber'][0].filename}` : null,
                      files['file_layer_stack'] ? `/uploads/inventory/${files['file_layer_stack'][0].filename}` : null,
                      files['file_production_note'] ? `/uploads/inventory/${files['file_production_note'][0].filename}` : null
                  ]
                );
            }

            // Handle PCB Images securely
            if (files['pcb_images'] && files['pcb_images'].length > 0) {
                const values = [];
                const queryParts = [];
                let paramIndex = 1;
                files['pcb_images'].forEach(file => {
                    queryParts.push(`($1, $${paramIndex + 1})`);
                    values.push(`/uploads/inventory/${file.filename}`);
                    paramIndex += 1;
                });
                await client.query(`INSERT INTO pcb_images (pcb_id, image_url) VALUES ${queryParts.join(', ')}`, [id, ...values]);
            }
        }
      });
      sendSuccess(res, null, 'PCB updated successfully');
    } catch (error) {
      console.error('PCB Update Error:', error);
      next(error);
    }
};

const deletePCB = async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE PCB_MASTER SET is_active = FALSE WHERE pcb_id = $1', [id]);
        sendSuccess(res, null, 'PCB deleted successfully');
    } catch (error) {
        next(error);
    }
};

const deletePCBImage = async (req, res, next) => {
    const { id } = req.params;
    const { imageUrl } = req.body;
    try {
        await db.query('DELETE FROM pcb_images WHERE pcb_id = $1 AND image_url = $2', [id, imageUrl]);
        sendSuccess(res, null, 'Image removed successfully');
    } catch (error) {
        next(error);
    }
};

const deletePCBFile = async (req, res, next) => {
    const { id } = req.params;
    const { field } = req.body; // e.g., 'processor_file_url'
    try {
        const validFields = ['processor_file_url', 'brd_file_url', 'sch_file_url', 'bom_file_url', 'stencil_file_url', 'panel_gerber_file_url', 'layer_stacking_file_url', 'production_instruction_url'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid file field' } });
        }
        await db.query(`UPDATE PCB_FILE_MASTER SET ${field} = NULL WHERE pcb_id = $1`, [id]);
        sendSuccess(res, null, 'File removed successfully');
    } catch (error) {
        next(error);
    }
};
const addPCBStock = async (req, res, next) => {
    const { id } = req.params;
    const { quantityToAdd } = req.body;

    try {
        const addedQty = parseInt(quantityToAdd);
        if (isNaN(addedQty) || addedQty <= 0) {
            return res.status(400).json({ success: false, error: { message: 'Quantity to add must be greater than zero.' } });
        }

        const partResult = await db.query('SELECT * FROM PCB_MASTER WHERE pcb_id = $1 AND is_active = TRUE', [id]);
        if (partResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'PCB not found' } });
        }

        await db.query(
            'UPDATE PCB_MASTER SET stock_quantity = COALESCE(stock_quantity, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE pcb_id = $2',
            [addedQty, id]
        );

        sendSuccess(res, null, `Successfully added ${addedQty} stock to the PCB`);
    } catch (error) {
        console.error('Add PCB Stock Error:', error);
        next(error);
    }
};

module.exports = {
  getPCBs,
  getPCBById,
  createPCB,
  updatePCB,
  deletePCB,
  deletePCBImage,
  deletePCBFile,
  addPCBStock
};
