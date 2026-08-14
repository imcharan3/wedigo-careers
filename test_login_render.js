const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) return false;
  if (inputPassword.trim() === storedPassword.trim()) return true;
  try {
    return bcrypt.compareSync(inputPassword, storedPassword);
  } catch (e) {
    return false;
  }
}

async function testLogin() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const email = 'neethu@wedigocareers.com';
  const password = 'neethu123';

  // Case insensitive check
  const res = await pool.query('SELECT * FROM admins WHERE LOWER(email) = LOWER($1)', [email]);
  console.log('Query Result Count:', res.rows.length);
  if (res.rows.length > 0) {
    const admin = res.rows[0];
    console.log('Stored Admin Record:', admin);
    console.log('Stored Password:', JSON.stringify(admin.password));
    console.log('Input Password:', JSON.stringify(password));
    console.log('Verify Result:', verifyPassword(password, admin.password));
  }
  await pool.end();
}

testLogin();
