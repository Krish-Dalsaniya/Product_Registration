const db = require('./src/config/db');

async function cleanup() {
    try {
        // Find test finished goods using the timestamp-based version pattern we used in test_git_integration.js
        const res = await db.query("SELECT id FROM finished_goods WHERE version LIKE '1.0.17%'");
        const ids = res.rows.map(row => row.id);
        
        if (ids.length > 0) {
            console.log(`Found ${ids.length} test finished goods to delete:`, ids);
            
            // Delete related records first
            await db.query('DELETE FROM finished_goods_hardware WHERE finished_good_id = ANY($1)', [ids]);
            await db.query('DELETE FROM finished_goods_serials WHERE finished_good_id = ANY($1)', [ids]);
            
            // Delete the finished goods
            await db.query('DELETE FROM finished_goods WHERE id = ANY($1)', [ids]);
            
            console.log('Successfully deleted test records!');
        } else {
            console.log('No test finished goods found to delete.');
        }
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        process.exit(0);
    }
}

cleanup();
