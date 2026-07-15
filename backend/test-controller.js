const db = require('./src/config/db');
const { createPCB } = require('./src/modules/inventory/inventoryController');

async function test() {
    const req = {
        body: {
            pcb_name: 'test-api',
            part_number: 'test-api-part',
            pcb_description: 'test',
            pcb_type: 'test-type',
            processor_type: 'test-proc',
            processor_part_no: 'test-proc-part',
            processor_count: 1,
            has_embedded_firmware: true,
            has_application_software: false,
            repository_owner: 'mihir',
            repository_name: 'automation-service',
            firmware_stage: 'dev',
            firmware_branch: 'main',
            firmware_version: 'v1.0.0',
            firmware_feature: 'test-feat',
            stock_quantity: 10
        }
    };
    const res = {
        status: function(code) {
            console.log('Status:', code);
            return this;
        },
        json: function(data) {
            console.log('JSON:', data);
            return this;
        }
    };
    const next = (err) => console.log('Next:', err);
    
    await createPCB(req, res, next);
    process.exit(0);
}

test();
