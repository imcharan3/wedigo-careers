const { Pool } = require('pg');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

async function checkAdmins() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT * FROM admins');
    console.log('--- ALL ADMINS IN RENDER CLOUD DB ---');
    console.table(res.rows);
    await pool.end();
  } catch (err) {
    console.error(err);
  }
}

checkAdmins();
