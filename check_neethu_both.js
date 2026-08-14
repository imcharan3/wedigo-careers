const { Pool } = require('pg');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

async function checkNeethu() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const a = await pool.query('SELECT * FROM admins WHERE LOWER(email) = $1', ['neethu@wedigocareers.com']);
  console.log('Admins Table:', a.rows);

  const u = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', ['neethu@wedigocareers.com']);
  console.log('Users Table:', u.rows);

  await pool.end();
}

checkNeethu();
