const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function promote() {
  const hash = bcrypt.hashSync('neethu123', 10);

  // 1. Render PostgreSQL
  try {
    const pgPool = new Pool({
      connectionString: 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db',
      ssl: { rejectUnauthorized: false }
    });

    await pgPool.query('UPDATE users SET role = $1 WHERE LOWER(email) = $2', ['admin', 'neethu@wedigocareers.com']);
    await pgPool.query('DELETE FROM admins WHERE LOWER(email) = $1', ['neethu@wedigocareers.com']);
    await pgPool.query('INSERT INTO admins (name, email, password, role) VALUES ($1, $2, $3, $4)', ['NEETHU ALLAMPATI', 'neethu@wedigocareers.com', hash, 'admin']);
    console.log('[Render PostgreSQL] Promoted neethu@wedigocareers.com to Admin!');
    await pgPool.end();
  } catch (e) {
    console.error('PG Error:', e.message);
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
    await conn.query('UPDATE users SET role = ? WHERE LOWER(email) = ?', ['admin', 'neethu@wedigocareers.com']);
    await conn.query('DELETE FROM admins WHERE LOWER(email) = ?', ['neethu@wedigocareers.com']);
    await conn.query('INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)', ['NEETHU ALLAMPATI', 'neethu@wedigocareers.com', hash, 'admin']);
    console.log('[Local MySQL] Promoted neethu@wedigocareers.com to Admin!');
    await conn.end();
  } catch (e) {
    console.error('MySQL Error:', e.message);
  }
}

promote();
