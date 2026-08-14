const { Pool } = require('pg');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

async function promoteUser() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const email = 'neethu.test@wedigocareers.com';
  await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email]);
  console.log(`SUCCESS! Promoted ${email} to admin role!`);
  await pool.end();
}

promoteUser();
