const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) return false;
  if (inputPassword.trim() === storedPassword.trim()) return true;
  try {
    return bcrypt.compareSync(inputPassword.trim(), storedPassword.trim());
  } catch (e) {
    return false;
  }
}

async function debugFlow() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const email = 'neethu@wedigocareers.com';
  const password = 'neethu123';

  console.log('1. Testing raw PG query:');
  const res = await pool.query('SELECT * FROM admins WHERE LOWER(email) = LOWER($1)', [email]);
  console.log('Rows found:', res.rows.length);
  if (res.rows.length > 0) {
    const admin = res.rows[0];
    console.log('Stored Admin:', admin);
    console.log('Verify Result:', verifyPassword(password, admin.password));
  }

  await pool.end();
}

debugFlow();
