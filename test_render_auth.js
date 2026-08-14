const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

async function testAuth() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('--- INSPECTING ADMINS TABLE IN RENDER DB ---');
    const admins = await pool.query('SELECT * FROM admins');
    console.log(admins.rows);

    console.log('\n--- INSPECTING USERS TABLE IN RENDER DB ---');
    const users = await pool.query('SELECT * FROM users');
    console.log(users.rows);

    await pool.end();
  } catch (err) {
    console.error(err);
  }
}

testAuth();
