const db = require('../../config/db');
const { sendSuccess } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');

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
        
        // Fetch Firmware Mapping (All Processors)
        const mappingResult = await db.query(`
            SELECT 
                pfm.*, 
                pm.processor_type, pm.part_no as processor_part_no, pm.description as processor_desc,
                fm.repository_name, fm.firmware_branch_name as firmware_branch, fm.description as firmware_feature_desc,
                fvm.firmware_version,
                ffm.feature_name as firmware_feature
            FROM PCB_FIRMWARE_MAPPING pfm
            LEFT JOIN PROCESSOR_MASTER pm ON pfm.processor_id = pm.processor_id
            LEFT JOIN FIRMWARE_MASTER fm ON pfm.firmware_master_id = fm.firmware_master_id
            LEFT JOIN FIRMWARE_VERSION_MASTER fvm ON pfm.firmware_version_id = fvm.firmware_version_id
            LEFT JOIN FIRMWARE_FEATURE_MASTER ffm ON fm.firmware_master_id = ffm.firmware_master_id
            WHERE pfm.pcb_id = $1
            ORDER BY pfm.pcb_firmware_mapping_id ASC
        `, [id]);

        const processors = mappingResult.rows.map(row => ({
            processor_type: row.processor_type || '',
            processor_part_no: row.processor_part_no || '',
            processor_desc: row.processor_desc || '',
            has_embedded_firmware: !!row.firmware_master_id,
            repository_name: row.repository_name || '',
            firmware_branch: row.firmware_branch || '',
            firmware_version: row.firmware_version || ''
        }));

        sendSuccess(res, {
            ...pcb,
            processor_count: processors.length > 0 ? processors.length : (pcb.processor_count || 1),
            processors: processors,
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
    processor_count,
    processors_data,
    stock_quantity
  } = req.body;

  try {
    let processors = [];
    if (processors_data) {
        try {
            processors = JSON.parse(processors_data);
        } catch(e) {
            console.error("Failed to parse processors_data", e);
        }
    }

    await db.withTransaction(async (client) => {
      // 1. Handle PCB Type
      let typeId = null;
      if (pcb_type) {
          const typeResult = await client.query(
              'INSERT INTO PCB_TYPE_MASTER (type_name, type_description) VALUES ($1, $2) ON CONFLICT (type_name) DO UPDATE SET type_description = $2 RETURNING pcb_type_id',
              [pcb_type, '']
          );
          typeId = typeResult.rows[0].pcb_type_id;
      }

      // 2. Create PCB
      const pcbResult = await client.query(
        `INSERT INTO PCB_MASTER (pcb_name, pcb_type_id, part_no, description, processor_count, stock_quantity) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [pcb_name, typeId, part_number, pcb_description || '', parseInt(processor_count) || processors.length || 0, parseInt(stock_quantity) || 0]
      );
      const pcb = pcbResult.rows[0];

      // 3 & 4 & 5. Handle Processors & Firmware Mapping Loop
      if (processors && processors.length > 0) {
          for (let i = 0; i < processors.length; i++) {
              const proc = processors[i];
              let processorId = null;
              
              if (proc.processor_part_no) {
                  const procResult = await client.query(
                      'INSERT INTO PROCESSOR_MASTER (processor_type, part_no, description) VALUES ($1, $2, $3) ON CONFLICT (part_no) DO UPDATE SET processor_type = $1 RETURNING processor_id',
                      [proc.processor_type || 'Unknown', proc.processor_part_no, proc.processor_desc || '']
                  );
                  processorId = procResult.rows[0].processor_id;
              }

              let firmwareMasterId = null;
              let firmwareVersionId = null;

              if (proc.has_embedded_firmware && (proc.firmware_branch || proc.firmware_version || proc.repository_name)) {
                  const branchName = proc.firmware_branch || 'Unknown Branch';
                  const repoName = proc.repository_name || 'Unknown Repository';
                  const firmwareResult = await client.query(
                      'INSERT INTO FIRMWARE_MASTER (processor_id, repository_name, firmware_branch_name, description) VALUES ($1, $2, $3, $4) RETURNING firmware_master_id',
                      [processorId, repoName, branchName, '']
                  );
                  firmwareMasterId = firmwareResult.rows[0].firmware_master_id;

                  if (proc.firmware_version) {
                      const versionResult = await client.query(
                          'INSERT INTO FIRMWARE_VERSION_MASTER (firmware_master_id, firmware_version) VALUES ($1, $2) RETURNING firmware_version_id',
                          [firmwareMasterId, proc.firmware_version]
                      );
                      firmwareVersionId = versionResult.rows[0].firmware_version_id;
                  }
              }

              if (processorId || firmwareMasterId) {
                  await client.query(
                      'INSERT INTO PCB_FIRMWARE_MAPPING (pcb_id, processor_id, firmware_master_id, firmware_version_id, is_default) VALUES ($1, $2, $3, $4, $5)',
                      [pcb.pcb_id, processorId, firmwareMasterId, firmwareVersionId, i === 0] // Make the first one default
                  );
              }
          }
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
      processor_count,
      processors_data,
      stock_quantity
    } = req.body;
  
    try {
      let processors = [];
      if (processors_data) {
          try {
              processors = JSON.parse(processors_data);
          } catch(e) {
              console.error("Failed to parse processors_data", e);
          }
      }

      await db.withTransaction(async (client) => {
        // 1. Handle PCB Type
        let typeId = null;
        if (pcb_type) {
            const typeResult = await client.query(
                'INSERT INTO PCB_TYPE_MASTER (type_name, type_description) VALUES ($1, $2) ON CONFLICT (type_name) DO UPDATE SET type_description = $2 RETURNING pcb_type_id',
                [pcb_type, '']
            );
            typeId = typeResult.rows[0].pcb_type_id;
        }
    
        // 2. Update PCB
        await client.query(
          `UPDATE PCB_MASTER 
           SET pcb_name = $1, pcb_type_id = $2, part_no = $3, description = $4, processor_count = $5, stock_quantity = $6, updated_at = CURRENT_TIMESTAMP
           WHERE pcb_id = $7`,
          [pcb_name, typeId, part_number, pcb_description || '', parseInt(processor_count) || processors.length || 0, parseInt(stock_quantity) || 0, id]
        );
    
        // Clear old firmware mappings for this PCB to easily replace them
        await client.query('DELETE FROM PCB_FIRMWARE_MAPPING WHERE pcb_id = $1', [id]);

        // 3 & 4. Handle Processors & Firmware Mapping
        if (processors && processors.length > 0) {
            for (let i = 0; i < processors.length; i++) {
                const proc = processors[i];
                let processorId = null;
                
                if (proc.processor_part_no) {
                    const procResult = await client.query(
                        'INSERT INTO PROCESSOR_MASTER (processor_type, part_no, description) VALUES ($1, $2, $3) ON CONFLICT (part_no) DO UPDATE SET processor_type = $1, description = $3 RETURNING processor_id',
                        [proc.processor_type || 'Unknown', proc.processor_part_no, proc.processor_desc || '']
                    );
                    processorId = procResult.rows[0].processor_id;
                }
            
                let firmwareMasterId = null;
                let firmwareVersionId = null;

                if (proc.has_embedded_firmware && (proc.firmware_branch || proc.firmware_version || proc.repository_name)) {
                    const branchName = proc.firmware_branch || 'Unknown Branch';
                    const repoName = proc.repository_name || 'Unknown Repository';
                    
                    // Check if firmware master exists, if not create
                    let fmResult;
                    if (processorId) {
                        fmResult = await client.query(
                            'SELECT firmware_master_id FROM FIRMWARE_MASTER WHERE processor_id = $1 AND repository_name = $2 AND firmware_branch_name = $3',
                            [processorId, repoName, branchName]
                        );
                    } else {
                        fmResult = await client.query(
                            'SELECT firmware_master_id FROM FIRMWARE_MASTER WHERE processor_id IS NULL AND repository_name = $1 AND firmware_branch_name = $2',
                            [repoName, branchName]
                        );
                    }
                    
                    if (fmResult.rows.length > 0) {
                        firmwareMasterId = fmResult.rows[0].firmware_master_id;
                    } else {
                        const insertFmResult = await client.query(
                            'INSERT INTO FIRMWARE_MASTER (processor_id, repository_name, firmware_branch_name, description) VALUES ($1, $2, $3, $4) RETURNING firmware_master_id',
                            [processorId, repoName, branchName, '']
                        );
                        firmwareMasterId = insertFmResult.rows[0].firmware_master_id;
                    }

                    if (proc.firmware_version) {
                        const versionResult = await client.query(
                            'INSERT INTO FIRMWARE_VERSION_MASTER (firmware_master_id, firmware_version) VALUES ($1, $2) RETURNING firmware_version_id',
                            [firmwareMasterId, proc.firmware_version]
                        );
                        firmwareVersionId = versionResult.rows[0].firmware_version_id;
                    }
                }

                if (processorId || firmwareMasterId) {
                    await client.query(
                        'INSERT INTO PCB_FIRMWARE_MAPPING (pcb_id, processor_id, firmware_master_id, firmware_version_id, is_default) VALUES ($1, $2, $3, $4, $5)',
                        [id, processorId, firmwareMasterId, firmwareVersionId, i === 0]
                    );
                }
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

const getFirmwareTraceabilityMap = async (req, res, next) => {
    try {
        const queryText = `
            SELECT 
                fm.firmware_master_id,
                fm.firmware_branch_name,
                fm.description,
                pfm.pcb_firmware_mapping_id,
                fvm.firmware_version as assigned_version,
                pcb.pcb_id,
                pcb.pcb_name,
                pcb.part_no as pcb_part_no,
                pm.processor_id,
                pm.processor_type as processor_name,
                fg.id as finished_good_id,
                prod.product_name,
                fg.version as fg_version,
                fg.quantity as fg_quantity
            FROM FIRMWARE_MASTER fm
            LEFT JOIN PCB_FIRMWARE_MAPPING pfm ON fm.firmware_master_id = pfm.firmware_master_id
            LEFT JOIN FIRMWARE_VERSION_MASTER fvm ON pfm.firmware_version_id = fvm.firmware_version_id
            LEFT JOIN PCB_MASTER pcb ON pfm.pcb_id = pcb.pcb_id
            LEFT JOIN PROCESSOR_MASTER pm ON pfm.processor_id = pm.processor_id
            LEFT JOIN finished_goods fg ON (fg.motherboard_id = pcb.pcb_id AND fg.is_iot = true)
            LEFT JOIN products prod ON fg.product_id = prod.product_id
            ORDER BY fm.firmware_branch_name, pcb.pcb_name, pm.processor_type;
        `;
        
        const result = await db.query(queryText);
        
        const map = {};
        
        result.rows.forEach(row => {
            const repoId = row.firmware_master_id;
            
            if (!map[repoId]) {
                map[repoId] = {
                    firmware_master_id: repoId,
                    firmware_branch_name: row.firmware_branch_name,
                    description: row.description,
                    deployments: []
                };
            }
            
            if (row.pcb_id) {
                map[repoId].deployments.push({
                    pcb_id: row.pcb_id,
                    pcb_name: row.pcb_name,
                    pcb_part_no: row.pcb_part_no,
                    assigned_version: row.assigned_version,
                    processor_id: row.processor_id,
                    processor_name: row.processor_name,
                    finished_good: row.finished_good_id ? {
                        id: row.finished_good_id,
                        product_name: row.product_name,
                        version: row.fg_version,
                        quantity: row.fg_quantity
                    } : null
                });
            }
        });
        
        return res.status(200).json({
            success: true,
            data: Object.values(map)
        });

    } catch (error) {
        console.error('Traceability Map Error:', error);
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
  addPCBStock,
  getFirmwareTraceabilityMap
};
