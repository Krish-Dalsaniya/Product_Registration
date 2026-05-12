const db = require('../src/config/db');

async function checkPCB() {
  try {
    const result = await db.query('SELECT * FROM PCB_MASTER WHERE pcb_id = $1', [12]);
    console.log('PCB Result:', result.rows);
    
    const allPCBs = await db.query('SELECT pcb_id, pcb_name FROM PCB_MASTER LIMIT 20');
    console.log('Recent PCBs:', allPCBs.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPCB();
