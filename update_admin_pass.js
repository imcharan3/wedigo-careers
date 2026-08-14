const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

async function updateAdmin() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const hashedPassword = bcrypt.hashSync('neethu123', 10);
  await pool.query('DELETE FROM admins WHERE email = $1', ['neethu@wedigocareers.com']);
  await pool.query('INSERT INTO admins (name, email, password, role) VALUES ($1, $2, $3, $4)', ['NEETHU', 'neethu@wedigocareers.com', hashedPassword, 'admin']);
  console.log('SUCCESS! Admin neethu@wedigocareers.com / neethu123 re-created with bcrypt hash on Render DB!');
  await pool.end();
}

updateAdmin();
