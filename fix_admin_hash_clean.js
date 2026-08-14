const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixBoth() {
  const plainPass = 'neethu123';
  const hashedPass = bcrypt.hashSync(plainPass, 10);

  console.log('Plain Pass:', plainPass);
  console.log('Hashed Pass:', hashedPass);
  console.log('Bcrypt Self Test:', bcrypt.compareSync(plainPass, hashedPass));

  // 1. Render Cloud PostgreSQL
  try {
    const pgPool = new Pool({
      connectionString: 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db',
      ssl: { rejectUnauthorized: false }
    });

    await pgPool.query('DELETE FROM admins WHERE LOWER(email) = $1', ['neethu@wedigocareers.com']);
    await pgPool.query('INSERT INTO admins (name, email, password, role) VALUES ($1, $2, $3, $4)', ['NEETHU', 'neethu@wedigocareers.com', hashedPass, 'admin']);
    console.log('[Render PostgreSQL] Successfully updated neethu@wedigocareers.com password to valid bcrypt hash!');
    await pgPool.end();
  } catch (err) {
    console.error('PG Error:', err.message);
  }

  // 2. Local MySQL
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'wedigo_careers'
    };

    const conn = await mysql.createConnection(dbConfig);
    await conn.query('DELETE FROM admins WHERE LOWER(email) = ?', ['neethu@wedigocareers.com']);
    await conn.query('INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)', ['NEETHU', 'neethu@wedigocareers.com', hashedPass, 'admin']);
    console.log('[Local MySQL] Successfully updated neethu@wedigocareers.com password to valid bcrypt hash!');
    await conn.end();
  } catch (err) {
    console.error('MySQL Error:', err.message);
  }
}

fixBoth();
