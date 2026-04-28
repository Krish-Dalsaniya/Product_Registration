const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting seeding...');
    await client.query('BEGIN');

    // 1. Roles & Permissions are already in the schema, but let's ensure we have role IDs
    const rolesRes = await client.query('SELECT role_id, role_name FROM roles');
    const roles = {};
    rolesRes.rows.forEach(r => roles[r.role_name] = r.role_id);

    const passwordHash = await bcrypt.hash('password123', 12);

    // 2. Sample Users
    const users = [
      { name: 'Admin User', email: 'admin@example.com', role: 'Admin' },
      { name: 'Alice Designer', email: 'alice@example.com', role: 'Designer' },
      { name: 'Bob Designer', email: 'bob@example.com', role: 'Designer' },
      { name: 'Charlie Sales', email: 'charlie@example.com', role: 'Sales' },
      { name: 'David Sales', email: 'david@example.com', role: 'Sales' },
      { name: 'Eve Maintenance', email: 'eve@example.com', role: 'Maintenance' },
      { name: 'Frank Maintenance', email: 'frank@example.com', role: 'Maintenance' },
    ];

    const userIds = {};

    for (const u of users) {
      const res = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role_id) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            password_hash = EXCLUDED.password_hash
         RETURNING user_id`,
        [u.name, u.email, passwordHash, roles[u.role]]
      );
      userIds[u.email] = res.rows[0].user_id;
    }

    // 3. Profiles
    // Designer Profiles
    await client.query(
      `INSERT INTO designer_profiles (designer_id, specialty, portfolio_url) VALUES 
       ($1, 'UI/UX Design', 'https://portfolio.com/alice'),
       ($2, 'Industrial Design', 'https://portfolio.com/bob')
       ON CONFLICT (designer_id) DO NOTHING`,
      [userIds['alice@example.com'], userIds['bob@example.com']]
    );

    // Sales Profiles
    await client.query(
      `INSERT INTO sales_profiles (sales_id, region, target_revenue, hire_date) VALUES 
       ($1, 'North America', 1000000, '2023-01-01'),
       ($2, 'Europe', 800000, '2023-02-01')
       ON CONFLICT (sales_id) DO NOTHING`,
      [userIds['charlie@example.com'], userIds['david@example.com']]
    );

    // Maintenance Profiles
    await client.query(
      `INSERT INTO maintenance_profiles (maintenance_id, certification, hire_date) VALUES 
       ($1, 'Certified Hardware Technician', '2023-03-01'),
       ($2, 'Electrical Systems Expert', '2023-04-01')
       ON CONFLICT (maintenance_id) DO NOTHING`,
      [userIds['eve@example.com'], userIds['frank@example.com']]
    );

    // 4. Teams
    const teamRes = await client.query(
      `INSERT INTO teams (team_name, description) VALUES 
       ('Creative Team', 'Focuses on user interface and experience'),
       ('Hardware Team', 'Focuses on industrial design and physical components')
       ON CONFLICT (team_name) DO UPDATE SET description = EXCLUDED.description
       RETURNING team_id, team_name`
    );
    const teamIds = {};
    teamRes.rows.forEach(t => teamIds[t.team_name] = t.team_id);

    // 5. Team Members
    await client.query(
      `INSERT INTO team_members (team_id, user_id, is_lead) VALUES 
       ($1, $2, true),
       ($3, $4, true)
       ON CONFLICT DO NOTHING`,
      [teamIds['Creative Team'], userIds['alice@example.com'], teamIds['Hardware Team'], userIds['bob@example.com']]
    );

    // 6. Products
    const productRes = await client.query(
      `INSERT INTO products (product_name, product_code, unit_price) VALUES 
       ('Smart Sensor X1', 'SS-X1', 299.99),
       ('Industrial Gateway G2', 'IG-G2', 599.99)
       ON CONFLICT (product_code) DO UPDATE SET product_name = EXCLUDED.product_name
       RETURNING product_id, product_name`
    );
    const productIds = {};
    productRes.rows.forEach(p => productIds[p.product_name] = p.product_id);

    // 7. Projects
    const projectRes = await client.query(
      `INSERT INTO projects (team_id, product_id, project_name, status) VALUES 
       ($1, $2, 'Sensor Redesign', 'Active'),
       ($3, $4, 'Gateway Firmware v2', 'Active')
       RETURNING project_id, project_name`,
      [teamIds['Creative Team'], productIds['Smart Sensor X1'], teamIds['Hardware Team'], productIds['Industrial Gateway G2']]
    );
    const projectIds = {};
    projectRes.rows.forEach(p => projectIds[p.project_name] = p.project_id);

    // 8. Designer Projects
    await client.query(
      `INSERT INTO designer_projects (designer_id, project_id, role_in_project) VALUES 
       ($1, $2, 'Lead UI Designer'),
       ($3, $4, 'Primary Industrial Designer')
       ON CONFLICT DO NOTHING`,
      [userIds['alice@example.com'], projectIds['Sensor Redesign'], userIds['bob@example.com'], projectIds['Gateway Firmware v2']]
    );

    // 9. Sales Products & Opportunities
    await client.query(
      `INSERT INTO sales_products (sales_id, product_id, is_primary) VALUES 
       ($1, $2, true),
       ($3, $4, true)
       ON CONFLICT DO NOTHING`,
      [userIds['charlie@example.com'], productIds['Smart Sensor X1'], userIds['david@example.com'], productIds['Industrial Gateway G2']]
    );

    await client.query(
      `INSERT INTO sales_opportunities (sales_id, product_id, client_name, deal_value, stage) VALUES 
       ($1, $2, 'TechCorp Inc.', 15000, 'Proposal'),
       ($3, $4, 'Global Logistics', 45000, 'Negotiation')`,
      [userIds['charlie@example.com'], productIds['Smart Sensor X1'], userIds['david@example.com'], productIds['Industrial Gateway G2']]
    );

    // 10. Maintenance Records & Tasks
    const recordRes = await client.query(
      `INSERT INTO maintenance_records (product_id, record_title, scheduled_date) VALUES 
       ($1, 'Annual Sensor Calibration', '2026-05-15'),
       ($2, 'Gateway Security Audit', '2026-06-01')
       RETURNING record_id, record_title`,
      [productIds['Smart Sensor X1'], productIds['Industrial Gateway G2']]
    );
    const recordIds = {};
    recordRes.rows.forEach(r => recordIds[r.record_title] = r.record_id);

    await client.query(
      `INSERT INTO maintenance_tasks (record_id, maintenance_id, task_title, priority, status, due_date) VALUES 
       ($1, $2, 'Calibrate high-precision sensors', 'High', 'Open', '2026-05-10'),
       ($3, $4, 'Check firewall logs', 'Critical', 'In Progress', '2026-05-20')`,
      [recordIds['Annual Sensor Calibration'], userIds['eve@example.com'], recordIds['Gateway Security Audit'], userIds['frank@example.com']]
    );

    await client.query('COMMIT');
    console.log('Seed complete!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during seeding:', error);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
