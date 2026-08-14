require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('--- Testing MySQL Connection ---');
  console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`User: ${process.env.DB_USER || 'root'}`);
  console.log(`Password: ${process.env.DB_PASSWORD ? '****** (configured)' : '(empty)'}`);
  console.log(`Port: ${process.env.DB_PORT || '3306'}\n`);

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('SUCCESS! MySQL connected successfully.');
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'wedigo_careers'}\``);
    console.log(`Database [${process.env.DB_NAME || 'wedigo_careers'}] is ready in MySQL.`);
    await conn.end();
  } catch (err) {
    console.error('MySQL Connection Error:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n--> FIX: Your MySQL root user requires a password.');
      console.log('Please edit c:\\Users\\HP\\OneDrive\\projects\\certiverify_app\\.env and set:');
      console.log('DB_PASSWORD=your_actual_mysql_password');
    }
  }
}

testConnection();
