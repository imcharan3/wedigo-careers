const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
  console.log('--- Automated MySQL Database Setup ---');
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  };

  try {
    const conn = await mysql.createConnection(dbConfig);
    console.log(`Connected to MySQL Server as user '${dbConfig.user}'.`);

    const sqlScript = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Executing schema.sql script...');

    await conn.query(sqlScript);
    console.log('SUCCESS! Database [wedigo_careers] and tables created in MySQL.');
    await conn.end();
  } catch (err) {
    console.error('MySQL Setup Error:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n--> Tip: Update your MySQL password in the .env file (DB_PASSWORD=your_password).');
    }
  }
}

setupDatabase();
