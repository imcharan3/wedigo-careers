const { Pool } = require('pg');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

async function testRender() {
  console.log('Testing Render Cloud PostgreSQL connection...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT NOW()');
    console.log('SUCCESS! Connected to Render PostgreSQL at:', res.rows[0].now);

    console.log('\n--- [ADMINS TABLE] ---');
    const admins = await pool.query('SELECT id, name, email, role FROM admins');
    console.table(admins.rows);

    console.log('\n--- [USERS TABLE (STUDENTS)] ---');
    const users = await pool.query('SELECT id, name, email, role FROM users');
    console.table(users.rows);

    console.log('\n--- [CERTIFICATES TABLE] ---');
    const certs = await pool.query('SELECT certificate_id, user_name, course_title, status FROM certificates');
    console.table(certs.rows);

    await pool.end();
  } catch (err) {
    console.error('Connection Error:', err.message);
  }
}

testRender();
