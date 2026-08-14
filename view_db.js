require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'wedigo_careers'
};

async function viewMySQLDatabase() {
  console.log('====================================================');
  console.log('    WEDIGO CAREERS - MYSQL DATABASE INSPECTOR       ');
  console.log('====================================================\n');

  try {
    const conn = await mysql.createConnection(dbConfig);

    // 1. Admins Table
    console.log('--- [ADMINS TABLE] ---');
    const [admins] = await conn.query('SELECT id, name, email, role, created_at FROM admins');
    console.table(admins);

    // 2. Users Table
    console.log('\n--- [USERS TABLE (STUDENTS)] ---');
    const [users] = await conn.query('SELECT id, name, email, role, created_at FROM users');
    console.table(users);

    // 2. Courses Table
    console.log('\n--- [COURSES TABLE] ---');
    const [courses] = await conn.query('SELECT id, title, category, duration FROM courses');
    console.table(courses);

    // 3. Certificates Table
    console.log('\n--- [CERTIFICATES TABLE] ---');
    const [certs] = await conn.query('SELECT certificate_id, user_name, user_email, course_title, issue_date, signatory_name, status FROM certificates');
    console.table(certs);

    // 4. Enrollments Table
    console.log('\n--- [ENROLLMENTS TABLE] ---');
    const [enrollments] = await conn.query('SELECT * FROM enrollments');
    console.table(enrollments);

    await conn.end();
  } catch (err) {
    console.error('MySQL Error:', err.message);
    console.log('\nPlease make sure MySQL Server is running on localhost:3306.');
  }
}

viewMySQLDatabase();
