const { Pool } = require('pg');

const connectionString = 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

async function fixSchema() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Dropping broken tables on Render PostgreSQL...');
  await pool.query('DROP TABLE IF EXISTS certificates CASCADE');
  await pool.query('DROP TABLE IF EXISTS enrollments CASCADE');
  console.log('Successfully dropped old tables. Rebuilding clean schema...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS certificates (
      certificate_id VARCHAR(100) PRIMARY KEY,
      user_id INT NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      course_id INT NOT NULL,
      course_title VARCHAR(255) NOT NULL,
      course_duration VARCHAR(50) NOT NULL,
      start_date VARCHAR(100) NOT NULL DEFAULT '',
      completion_date VARCHAR(100) NOT NULL DEFAULT '',
      issue_date VARCHAR(100) NOT NULL,
      score INT DEFAULT 100,
      verification_hash VARCHAR(255) NOT NULL,
      signatory_name VARCHAR(255) DEFAULT 'Neethu Allampati',
      signatory_title VARCHAR(255) DEFAULT 'Director of Academics',
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      course_id INT NOT NULL,
      progress INT DEFAULT 0,
      completed INT DEFAULT 0,
      passed INT DEFAULT 0,
      attempts_count INT DEFAULT 0,
      highest_score INT DEFAULT 0,
      completed_modules TEXT NULL,
      start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    );
  `);

  console.log('SUCCESS! Clean PostgreSQL Schema built on Render!');
  await pool.end();
}

fixSchema();
