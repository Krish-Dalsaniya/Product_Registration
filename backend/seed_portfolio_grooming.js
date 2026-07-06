require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  try {
    console.log('Seeding Portfolio & Backlog Grooming Data...');

    // 1. Get a team and user
    const teamRes = await pool.query('SELECT team_id FROM teams LIMIT 1');
    const teamId = teamRes.rows.length > 0 ? teamRes.rows[0].team_id : null;

    const userRes = await pool.query('SELECT user_id as id, full_name as name FROM users LIMIT 1');
    const userId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

    // 2. Create Projects
    const projects = [
      { code: 'ERP2', name: 'ERP System Upgrade', status: 'In Progress', priority: 'Critical', startOffset: -10, endOffset: 60, progress: 45 },
      { code: 'MOBILE', name: 'Mobile App Redesign', status: 'Planned', priority: 'High', startOffset: 5, endOffset: 90, progress: 0 },
      { code: 'CRM', name: 'CRM Integration', status: 'On Hold', priority: 'Medium', startOffset: -30, endOffset: 30, progress: 20 }
    ];

    const projectIds = [];
    for (const p of projects) {
      const res = await pool.query(`
        INSERT INTO pms_projects (project_code, project_name, description, team_id, start_date, end_date, status, priority, progress_percentage)
        VALUES ($1, $2, $3, $4, CURRENT_DATE + ($5 || ' days')::interval, CURRENT_DATE + ($6 || ' days')::interval, $7, $8, $9)
        ON CONFLICT (project_code) DO NOTHING
        RETURNING project_id
      `, [p.code, p.name, `Dummy data for ${p.name}`, teamId, p.startOffset, p.endOffset, p.status, p.priority, p.progress]);
      
      if (res.rows.length > 0) {
        projectIds.push({ id: res.rows[0].project_id, ...p });
      } else {
        // Fetch existing
        const existing = await pool.query(`SELECT project_id FROM pms_projects WHERE project_code = $1`, [p.code]);
        if(existing.rows.length > 0) projectIds.push({ id: existing.rows[0].project_id, ...p });
      }
    }

    if (projectIds.length === 0) {
      console.log('No projects created or found.');
      return;
    }

    // 3. Create Epics & Sprints for these projects
    const epicsAndSprints = [];
    for (const proj of projectIds) {
      // Epics
      const eRes = await pool.query(`
        INSERT INTO pms_epics (project_id, name, description, start_date, target_date, status)
        VALUES ($1, $2, 'Epic description', CURRENT_DATE + ($3 || ' days')::interval, CURRENT_DATE + ($4 || ' days')::interval, 'In Progress')
        RETURNING epic_id
      `, [proj.id, `Core Infrastructure - ${proj.code}`, proj.startOffset, proj.startOffset + 20]);

      // Sprints
      const s1Res = await pool.query(`
        INSERT INTO pms_sprints (project_id, sprint_name, status, start_date, end_date)
        VALUES ($1, $2, 'Active', CURRENT_DATE + ($3 || ' days')::interval, CURRENT_DATE + ($4 || ' days')::interval)
        RETURNING sprint_id
      `, [proj.id, `${proj.code} Sprint 1`, proj.startOffset, proj.startOffset + 14]);

      const s2Res = await pool.query(`
        INSERT INTO pms_sprints (project_id, sprint_name, status, start_date, end_date)
        VALUES ($1, $2, 'Planned', CURRENT_DATE + ($3 || ' days')::interval, CURRENT_DATE + ($4 || ' days')::interval)
        RETURNING sprint_id
      `, [proj.id, `${proj.code} Sprint 2`, proj.startOffset + 15, proj.startOffset + 29]);

      epicsAndSprints.push({
        projectId: proj.id,
        epicId: eRes.rows[0].epic_id,
        sprints: [s1Res.rows[0].sprint_id, s2Res.rows[0].sprint_id]
      });
    }

    // 4. Create Tasks
    for (const es of epicsAndSprints) {
      // Tasks in Sprints (for Grooming view right pane)
      for (let i=0; i<3; i++) {
        await pool.query(`
          INSERT INTO pms_tasks (project_id, task_title, sprint_id, epic_id, story_points, status, task_type, priority, assignee_id)
          VALUES ($1, $2, $3, $4, $5, 'To Do', 'Task', 'High', $6)
        `, [es.projectId, `Sprint 1 Task ${i+1}`, es.sprints[0], es.epicId, 5, userId]);
      }
      for (let i=0; i<2; i++) {
        await pool.query(`
          INSERT INTO pms_tasks (project_id, task_title, sprint_id, epic_id, story_points, status, task_type, priority, assignee_id)
          VALUES ($1, $2, $3, $4, $5, 'Backlog', 'Task', 'Medium', $6)
        `, [es.projectId, `Sprint 2 Task ${i+1}`, es.sprints[1], es.epicId, 8, userId]);
      }

      // Backlog tasks (no sprint_id) (for Grooming view left pane)
      for (let i=0; i<4; i++) {
        await pool.query(`
          INSERT INTO pms_tasks (project_id, task_title, sprint_id, epic_id, story_points, status, task_type, priority, assignee_id)
          VALUES ($1, $2, NULL, $3, $4, 'Backlog', 'Story', 'Low', $5)
        `, [es.projectId, `Unassigned Backlog Item ${i+1}`, es.epicId, 3, userId]);
      }
    }

    console.log('Portfolio & Grooming dummy data seeded successfully!');

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    pool.end();
  }
}

seed();
