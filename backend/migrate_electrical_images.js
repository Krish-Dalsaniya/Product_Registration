const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_ELq1vlaIKU8c@ep-autumn-dawn-angk81z5-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function migrate() {
    await client.connect();
    try {
        const tables = ['pump_specs', 'nozzle_specs', 'solenoid_valve_specs', 'relay_box_specs', 'transformer_specs', 'rccb_specs', 'spd_specs'];
        for (const table of tables) {
            const res = await client.query(`SELECT part_id, part_images_gallery FROM ${table} WHERE part_images_gallery IS NOT NULL`);
            for (const row of res.rows) {
                try {
                    const images = typeof row.part_images_gallery === 'string' ? JSON.parse(row.part_images_gallery) : row.part_images_gallery;
                    if (Array.isArray(images) && images.length > 0) {
                        const check = await client.query('SELECT 1 FROM electrical_images WHERE part_id = $1 AND image_url = $2', [row.part_id, images[0]]);
                        if (check.rows.length === 0) {
                            await client.query('INSERT INTO electrical_images (part_id, image_url) VALUES ($1, $2)', [row.part_id, images[0]]);
                            console.log('Inserted missing image for part', row.part_id, 'from', table);
                        }
                    }
                } catch (e) {
                    // Ignore json parse errors for empty/invalid
                }
            }
        }
    } catch(e) {
        console.error(e);
    }
    await client.end();
}
migrate();
