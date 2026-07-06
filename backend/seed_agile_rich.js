require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  try {
    // 1. Get a project
    const projRes = await pool.query('SELECT project_id FROM pms_projects LIMIT 1');
    if (projRes.rows.length === 0) {
      console.log('No projects found to seed data.');
      return;
    }
    const projectId = projRes.rows[0].project_id;

    // Get some users to assign
    const userRes = await pool.query('SELECT user_id as id, full_name as name FROM users LIMIT 2');
    const users = userRes.rows;
    const user1 = users.length > 0 ? users[0].id : null;
    const user2 = users.length > 1 ? users[1].id : user1;

    // Delete previously seeded dummy data to avoid clutter
    await pool.query(`DELETE FROM pms_sprints WHERE sprint_name LIKE 'Sprint %'`);
    await pool.query(`DELETE FROM pms_epics WHERE name = 'Q3 Payment Gateway Overhaul'`);
    await pool.query(`DELETE FROM pms_tasks WHERE task_title LIKE 'Past task for Sprint %'`);
    // NOTE: Tasks belonging to sprints will be cascade deleted if foreign keys are set up correctly.

    // 2. Create an Epic
    const epicRes = await pool.query(`
      INSERT INTO pms_epics (project_id, name, description, status)
      VALUES ($1, 'Q3 Payment Gateway Overhaul', 'Complete revamp of the payment processing system', 'In Progress')
      RETURNING epic_id
    `, [projectId]);
    const epicId = epicRes.rows[0].epic_id;

    // 3. Create Past Sprints for Velocity
    for (let i = 1; i <= 3; i++) {
      const sRes = await pool.query(`
        INSERT INTO pms_sprints (project_id, sprint_name, status, start_date, end_date)
        VALUES ($1, $2, 'Completed', CURRENT_DATE - ($3 || ' days')::interval, CURRENT_DATE - ($4 || ' days')::interval)
        RETURNING sprint_id
      `, [projectId, `Sprint ${i}`, 14 * (4-i), 14 * (4-i) - 14]);

      const pts = [5, 8, 13];
      for (const p of pts) {
        await pool.query(`
          INSERT INTO pms_tasks (project_id, task_title, sprint_id, story_points, status, task_type, priority)
          VALUES ($1, $2, $3, $4, 'Completed', 'Task', 'Medium')
        `, [projectId, `Past task for Sprint ${i}`, sRes.rows[0].sprint_id, p]);
      }
    }

    // 4. Create Current Active Sprint
    const activeSprintRes = await pool.query(`
      INSERT INTO pms_sprints (project_id, sprint_name, status, start_date, end_date)
      VALUES ($1, 'Sprint 4 - Payment API Integration', 'Active', CURRENT_DATE - interval '3 days', CURRENT_DATE + interval '11 days')
      RETURNING sprint_id
    `, [projectId]);
    const activeSprintId = activeSprintRes.rows[0].sprint_id;

    // 5. Create Rich Tasks in Active Sprint
    const tasks = [
      { title: 'Design Database Schema for Payments', pts: 8, status: 'Completed', type: 'Epic', priority: 'High', daysAgo: 2, assignee: user1 },
      { title: 'Fix Webhook Timeout Error', pts: 3, status: 'In Progress', type: 'Bug', priority: 'Urgent', daysAgo: null, assignee: user2 },
      { title: 'Implement Stripe Checkout Wrapper', pts: 13, status: 'Completed', type: 'Task', priority: 'Medium', daysAgo: 1, assignee: user1 },
      { title: 'Frontend UI for Payment Modal', pts: 8, status: 'In Progress', type: 'Task', priority: 'Low', daysAgo: null, assignee: user2 },
      { title: 'End-to-End Testing', pts: 13, status: 'Backlog', type: 'Task', priority: 'Medium', daysAgo: null, assignee: user1 },
      { title: 'Update API Documentation', pts: 2, status: 'To Do', type: 'Task', priority: 'Low', daysAgo: null, assignee: null }
    ];

    for (const t of tasks) {
      const tRes = await pool.query(`
        INSERT INTO pms_tasks (project_id, task_title, sprint_id, epic_id, story_points, status, task_type, priority, assignee_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING task_id
      `, [projectId, t.title, activeSprintId, epicId, t.pts, t.status, t.type, t.priority, t.assignee]);
      const tId = tRes.rows[0].task_id;

      // Add Subtasks
      await pool.query(`
        INSERT INTO pms_tasks (project_id, parent_task_id, task_title, status, task_type, priority)
        VALUES ($1, $2, $3, 'Completed', 'Task', 'Medium'),
               ($1, $2, $4, 'Backlog', 'Task', 'Medium')
      `, [projectId, tId, 'Subtask 1 for ' + t.title, 'Subtask 2 for ' + t.title]);

      // Burn-down log
      if (t.status === 'Completed' && t.daysAgo !== null) {
        await pool.query(`
          INSERT INTO pms_task_activity_logs (task_id, action, details, created_at)
          VALUES ($1, 'Updated Status', '{"old_status": "In Progress", "new_status": "Completed"}', CURRENT_DATE - ($2 || ' days')::interval)
        `, [tId, t.daysAgo]);
      }
    }

    console.log('Rich Data seeded successfully!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    pool.end();
  }
}

seed();
