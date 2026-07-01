const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration' });
    await client.connect();

    try {
        const schema = await client.query(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_id'`);
        console.table(schema.rows);

        const res = await client.query(`
            SELECT u.user_id, u.full_name, u.email, r.role_name, ds.name as designation 
            FROM hr_employees e 
            JOIN users u ON e.user_id = u.user_id 
            LEFT JOIN roles r ON u.role_id = r.role_id 
            LEFT JOIN hr_designations ds ON e.designation_id = ds.designation_id
        `);

        for (const row of res.rows) {
            if (row.role_name === 'HR' && row.email !== 'hrm01@leons-group.com') {
                if (row.email.includes('design') || (row.designation && row.designation.toLowerCase().includes('design'))) {
                    await client.query(`UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'Designer') WHERE user_id = $1`, [row.user_id]);
                    console.log(`Updated ${row.email} to Designer`);
                } else if (row.designation && row.designation.toLowerCase().includes('accountant')) {
                    await client.query(`UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'Accountant') WHERE user_id = $1`, [row.user_id]);
                    console.log(`Updated ${row.email} to Accountant`);
                } else if (row.designation && row.designation.toLowerCase().includes('maintainance')) {
                    await client.query(`UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'Maintenance') WHERE user_id = $1`, [row.user_id]);
                    console.log(`Updated ${row.email} to Maintenance`);
                } else {
                    console.log(`Leaving ${row.email} as HR (designation: ${row.designation})`);
                    // We'll see if it's nullable, and set them to null later if appropriate.
                }
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
