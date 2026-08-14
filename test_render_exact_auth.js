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

async function testExactServerLogic() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const email = 'neethu@wedigocareers.com';
  const password = 'neethu123';
  const cleanEmail = email.trim();

  let paramIndex = 0;
  let sql = 'SELECT * FROM admins WHERE LOWER(email) = LOWER(?)'.replace(/\?/g, () => `$${++paramIndex}`);
  console.log('Generated SQL:', sql);

  const res = await pool.query(sql, [cleanEmail]);
  console.log('Found Admin Row Count:', res.rows.length);

  if (res.rows.length > 0) {
    const admin = res.rows[0];
    console.log('Admin Email:', admin.email);
    console.log('Admin Password Hash:', admin.password);
    const valid = verifyPassword(password, admin.password);
    console.log('Is Password Valid?', valid);
  }

  await pool.end();
}

testExactServerLogic();
