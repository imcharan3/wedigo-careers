const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

async function setCleanAdmin() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const hash = bcrypt.hashSync('neethu123', 10);
  console.log('Generated Valid Hash:', hash);
  console.log('Testing hash locally:', bcrypt.compareSync('neethu123', hash));

  await pool.query('UPDATE admins SET password = $1, role = $2 WHERE LOWER(email) = $3', [hash, 'admin', 'neethu@wedigocareers.com']);
  console.log('Updated Render Database Admin Password successfully!');
  await pool.end();
}

setCleanAdmin();
