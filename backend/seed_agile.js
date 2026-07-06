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

    // 2. Create an Epic
    const epicRes = await pool.query(`
      INSERT INTO pms_epics (project_id, name, description, status)
      VALUES ($1, 'Q3 Payment Gateway Overhaul', 'Complete revamp of the payment processing system', 'In Progress')
      RETURNING epic_id
    `, [projectId]);
    const epicId = epicRes.rows[0].epic_id;

    // 3. Create Past Sprints for Velocity (Last 5 Sprints)
    const pastSprints = [];
    for (let i = 1; i <= 3; i++) {
      const sRes = await pool.query(`
        INSERT INTO pms_sprints (project_id, sprint_name, status, start_date, end_date)
        VALUES ($1, $2, 'Completed', CURRENT_DATE - ($3 || ' days')::interval, CURRENT_DATE - ($4 || ' days')::interval)
        RETURNING sprint_id
      `, [projectId, `Sprint ${i}`, 14 * (4-i), 14 * (4-i) - 14]);
      pastSprints.push(sRes.rows[0].sprint_id);

      // Add dummy tasks for velocity
      const pts = [5, 8, 13];
      for (const p of pts) {
        await pool.query(`
          INSERT INTO pms_tasks (project_id, task_title, sprint_id, story_points, status)
          VALUES ($1, $2, $3, $4, 'Completed')
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

    // 5. Create Tasks in Active Sprint & Epic
    const tasks = [
      { title: 'Design Database Schema for Payments', pts: 8, status: 'Completed', daysAgo: 2 },
      { title: 'Implement Stripe Checkout Wrapper', pts: 13, status: 'Completed', daysAgo: 1 },
      { title: 'Write Unit Tests for Webhooks', pts: 5, status: 'In Progress', daysAgo: null },
      { title: 'Frontend UI for Payment Modal', pts: 8, status: 'In Progress', daysAgo: null },
      { title: 'End-to-End Testing', pts: 13, status: 'Backlog', daysAgo: null }
    ];

    for (const t of tasks) {
      const tRes = await pool.query(`
        INSERT INTO pms_tasks (project_id, task_title, sprint_id, epic_id, story_points, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING task_id
      `, [projectId, t.title, activeSprintId, epicId, t.pts, t.status]);
      const tId = tRes.rows[0].task_id;

      // Add Subtasks
      await pool.query(`
        INSERT INTO pms_tasks (project_id, parent_task_id, task_title, status)
        VALUES ($1, $2, $3, 'Completed'),
               ($1, $2, $4, 'Backlog')
      `, [projectId, tId, 'Subtask 1 for ' + t.title, 'Subtask 2 for ' + t.title]);

      // If completed, add activity log on the specific day for burn-down chart
      if (t.status === 'Completed' && t.daysAgo !== null) {
        await pool.query(`
          INSERT INTO pms_task_activity_logs (task_id, action, details, created_at)
          VALUES ($1, 'Updated Status', '{"old_status": "In Progress", "new_status": "Completed"}', CURRENT_DATE - ($2 || ' days')::interval)
        `, [tId, t.daysAgo]);
      }
    }

    console.log('Data seeded successfully!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    pool.end();
  }
}

seed();
