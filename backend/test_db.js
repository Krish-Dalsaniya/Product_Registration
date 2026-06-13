require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    // Check latest user
    const userRes = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No users found.');
      return;
    }
    const user = userRes.rows[0];
    console.log('Latest user:', user.email);

    // Check user_email_verified
    const verifiedRes = await pool.query('SELECT * FROM user_email_verified WHERE user_id = $1', [user.user_id]);
    console.log('Email verified:', verifiedRes.rows);

    const emailTokenRes = await pool.query('SELECT * FROM email_verification_tokens WHERE user_id = $1', [user.user_id]);
    const tokenRecord = emailTokenRes.rows[0];
    console.log('Token record:', !!tokenRecord);

    // Let's set verified = true
    await pool.query('UPDATE user_email_verified SET is_verified = true WHERE user_id = $1', [user.user_id]);

    // Now test login API (we don't have the temporary password, but we know it's bypassing login)
    // Wait, let's just make an HTTP request to our backend running on localhost:3000
    const axios = require('axios');
    try {
      // Actually, we don't have the temporary password!
      // But we can check the backend logs or just assume `setupPassword` fails.
      console.log("Email verified manually in DB.");
    } catch (e) {
      console.log('HTTP Error:', e.message);
    }

test();
