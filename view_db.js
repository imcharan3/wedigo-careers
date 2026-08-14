require('dotenv').config();
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function inspect() {
  console.log('====================================================');
  console.log('    WEDIGO CAREERS - CLOUD DATABASE INSPECTOR       ');
  console.log('====================================================\n');

  if (process.env.DATABASE_URL || process.env.PGHOST) {
    console.log('[Engine: PostgreSQL Cloud Database]\n');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    console.log('--- [ADMINS TABLE] ---');
    const admins = await pool.query('SELECT id, name, email, role, created_at FROM admins');
    console.table(admins.rows);

    console.log('\n--- [USERS TABLE (STUDENTS)] ---');
    const users = await pool.query('SELECT id, name, email, role, created_at FROM users');
    console.table(users.rows);

    console.log('\n--- [COURSES TABLE] ---');
    const courses = await pool.query('SELECT id, title, category, duration FROM courses');
    console.table(courses.rows);

    console.log('\n--- [CERTIFICATES TABLE] ---');
    const certs = await pool.query('SELECT certificate_id, user_name, user_email, course_title, issue_date, signatory_name, status FROM certificates');
    console.table(certs.rows);

    await pool.end();
    return;
  }

  // MySQL Fallback
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'wedigo_careers'
  };

  try {
    const conn = await mysql.createConnection(dbConfig);

    console.log('--- [ADMINS TABLE] ---');
    const [admins] = await conn.query('SELECT id, name, email, role, created_at FROM admins');
    console.table(admins);

    console.log('\n--- [USERS TABLE (STUDENTS)] ---');
    const [users] = await conn.query('SELECT id, name, email, role, created_at FROM users');
    console.table(users);

    console.log('\n--- [COURSES TABLE] ---');
    const [courses] = await conn.query('SELECT id, title, category, duration FROM courses');
    console.table(courses);

    console.log('\n--- [CERTIFICATES TABLE] ---');
    const [certs] = await conn.query('SELECT certificate_id, user_name, user_email, course_title, issue_date, signatory_name, status FROM certificates');
    console.table(certs);

    await conn.end();
  } catch (err) {
    console.error('Database connection error:', err.message);
  }
}

inspect();
