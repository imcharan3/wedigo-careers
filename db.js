require('dotenv').config();
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

let dbMode = 'PG';
let pgPool = null;
let mysqlPool = null;
let sqliteDb = null;
let pgErrorMsg = null;

async function initDB() {
  const cloudDbUrl = process.env.DATABASE_URL || 'postgres://wedigo_db_user:qEyAa4xxng6pDoiKjDMvGYHLjJA6KQ6C@dpg-d9va2t142hec738h81b0-a.oregon-postgres.render.com/wedigo_db';

  // 1. Try Render / Cloud PostgreSQL first
  if (process.env.DATABASE_URL || process.env.RENDER || process.env.NODE_ENV === 'production' || process.env.PGHOST) {
    try {
      pgPool = new Pool({
        connectionString: cloudDbUrl,
        ssl: { rejectUnauthorized: false }
      });
      await pgPool.query('SELECT NOW()');
      console.log('[Database] Connected to PostgreSQL Cloud Database on Render (SSL Mode)!');
      dbMode = 'PG';
      try { await initPostgresTables(); } catch (te) { console.error('Table init warning:', te.message); }
      try { await seedPostgresData(); } catch (se) { console.error('Seed warning:', se.message); }
      return;
    } catch (err) {
      pgErrorMsg = `SSL Error: ${err.message}`;
      console.warn(`[Database Warning] PostgreSQL SSL connection failed (${err.message}). Retrying with ssl: false...`);
      try {
        pgPool = new Pool({ connectionString: cloudDbUrl, ssl: false });
        await pgPool.query('SELECT NOW()');
        console.log('[Database] Connected to PostgreSQL Cloud Database on Render (Non-SSL Mode)!');
        dbMode = 'PG';
        try { await initPostgresTables(); } catch (te) { console.error('Table init warning:', te.message); }
        try { await seedPostgresData(); } catch (se) { console.error('Seed warning:', se.message); }
        return;
      } catch (err2) {
        pgErrorMsg = `Non-SSL Error: ${err2.message}`;
        console.error(`[Database Error] PostgreSQL connection failed completely: ${err2.message}`);
      }
    }
  }

  // 2. Try MySQL next
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'wedigo_careers'
  };

  try {
    const tempConn = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConn.end();

    mysqlPool = mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 10 });
    console.log(`[Database] Connected to MySQL Database [${dbConfig.database}] at ${dbConfig.host}:${dbConfig.port}`);
    dbMode = 'MYSQL';

    await initMySQLTables();
    await seedMySQLData();
    return;
  } catch (err) {
    console.warn(`[Database Warning] MySQL connection failed (${err.message}). Falling back to SQLite database...`);
    dbMode = 'SQLITE';
    await initSQLite();
  }
}

function initSQLite() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, 'certiverify.db');
    sqliteDb = new sqlite3.Database(dbPath, async (err) => {
      if (err) return reject(err);
      console.log('[Database] Connected to SQLite database file.');
      await initSQLiteTables();
      await seedSQLiteData();
      resolve();
    });
  });
}

// UNIFIED QUERY ENGINE (Supports PG, MySQL, SQLite)
async function query(sql, params = []) {
  if (dbMode === 'PG') {
    let paramIndex = 0;
    let pgSql = sql
      .replace(/INSERT IGNORE INTO/gi, 'INSERT INTO')
      .replace(/\?/g, () => `$${++paramIndex}`);

    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING *';
    }

    const res = await pgPool.query(pgSql, params);
    return res.rows.map(row => ({
      ...row,
      insertId: row.id || row.certificate_id
    }));
  } else if (dbMode === 'MYSQL') {
    const [rows] = await mysqlPool.query(sql, params);
    return rows;
  } else {
    return new Promise((resolve, reject) => {
      const trimmedSql = sql.trim();
      let adapterSql = trimmedSql
        .replace(/INSERT IGNORE INTO/gi, 'INSERT OR IGNORE INTO')
        .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
        .replace(/\bINT\b/gi, 'INTEGER');

      if (adapterSql.toUpperCase().startsWith('SELECT')) {
        sqliteDb.all(adapterSql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        sqliteDb.run(adapterSql, params, function (err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      }
    });
  }
}

async function initPostgresTables() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      modules TEXT NOT NULL,
      modules_content TEXT NULL,
      quiz_data TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pgPool.query(`
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

  try {
    await pgPool.query('SELECT certificate_id FROM certificates LIMIT 1');
  } catch (e) {
    console.log('[Schema Fix] Rebuilding certificates table...');
    await pgPool.query('DROP TABLE IF EXISTS certificates CASCADE');
  }

  await pgPool.query(`
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

  try { await pgPool.query(`ALTER TABLE courses ADD COLUMN modules_content TEXT NULL`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE courses ADD COLUMN quiz_data TEXT NULL`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE enrollments ADD COLUMN passed INT DEFAULT 0`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE enrollments ADD COLUMN attempts_count INT DEFAULT 0`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE enrollments ADD COLUMN highest_score INT DEFAULT 0`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE enrollments ADD COLUMN completed_modules TEXT NULL`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE enrollments ADD COLUMN start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE certificates ADD COLUMN start_date VARCHAR(100) NOT NULL DEFAULT ''`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE certificates ADD COLUMN completion_date VARCHAR(100) NOT NULL DEFAULT ''`); } catch (e) {}
  try { await pgPool.query(`ALTER TABLE certificates ADD COLUMN score INT DEFAULT 100`); } catch (e) {}
}

async function initMySQLTables() {
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      modules TEXT NOT NULL,
      modules_content LONGTEXT NULL,
      quiz_data LONGTEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try { await mysqlPool.query(`ALTER TABLE courses ADD COLUMN modules_content LONGTEXT NULL`); } catch (e) {}
  try { await mysqlPool.query(`ALTER TABLE courses ADD COLUMN quiz_data LONGTEXT NULL`); } catch (e) {}

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_id INT NOT NULL,
      progress INT DEFAULT 0,
      completed TINYINT(1) DEFAULT 0,
      passed TINYINT(1) DEFAULT 0,
      attempts_count INT DEFAULT 0,
      highest_score INT DEFAULT 0,
      completed_modules TEXT NULL,
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_course (user_id, course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS certificates (
      certificate_id VARCHAR(100) PRIMARY KEY,
      user_id INT NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      course_id INT NOT NULL,
      course_title VARCHAR(255) NOT NULL,
      course_duration VARCHAR(50) NOT NULL,
      start_date VARCHAR(100) NOT NULL,
      completion_date VARCHAR(100) NOT NULL,
      issue_date VARCHAR(100) NOT NULL,
      score INT DEFAULT 100,
      verification_hash VARCHAR(255) NOT NULL,
      signatory_name VARCHAR(255) DEFAULT 'Neethu Allampati',
      signatory_title VARCHAR(255) DEFAULT 'Director of Academics',
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function initSQLiteTables() {
  return new Promise((resolve) => {
    sqliteDb.serialize(() => {
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'student',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          duration TEXT NOT NULL,
          description TEXT NOT NULL,
          modules TEXT NOT NULL,
          modules_content TEXT NULL,
          quiz_data TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS enrollments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          course_id INTEGER NOT NULL,
          progress INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          passed INTEGER DEFAULT 0,
          attempts_count INTEGER DEFAULT 0,
          highest_score INTEGER DEFAULT 0,
          completed_modules TEXT NULL,
          start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, course_id)
        )
      `);
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS certificates (
          certificate_id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          user_email TEXT NOT NULL,
          course_id INTEGER NOT NULL,
          course_title TEXT NOT NULL,
          course_duration TEXT NOT NULL,
          start_date TEXT NOT NULL,
          completion_date TEXT NOT NULL,
          issue_date TEXT NOT NULL,
          score INTEGER DEFAULT 100,
          verification_hash TEXT NOT NULL,
          signatory_name TEXT DEFAULT 'Neethu Allampati',
          signatory_title TEXT DEFAULT 'Director of Academics',
          status TEXT DEFAULT 'ACTIVE',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, resolve);
    });
  });
}

async function seedPostgresData() {
  const adminEmail = 'admin@wedigocareers.com';
  const admins = await query('SELECT id FROM admins WHERE email = $1', [adminEmail]);
  if (admins.length === 0) {
    const hashedAdminPassword = bcrypt.hashSync('admin123', 10);
    await query('INSERT INTO admins (name, email, password, role) VALUES ($1, $2, $3, $4)', ['Platform Admin', adminEmail, hashedAdminPassword, 'admin']);
  }

  const studentEmail = 'student@wedigocareers.com';
  const students = await query('SELECT id FROM users WHERE email = $1', [studentEmail]);
  if (students.length === 0) {
    const hashedStudentPassword = bcrypt.hashSync('student123', 10);
    await query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', ['Jane Doe', studentEmail, hashedStudentPassword, 'student']);
  }

  const courseRows = await query('SELECT COUNT(*) as count FROM courses');
  if (parseInt(courseRows[0].count) === 0) {
    await seedCoursesData(async (c) => {
      await query('INSERT INTO courses (title, category, duration, description, modules, modules_content, quiz_data) VALUES ($1, $2, $3, $4, $5, $6, $7)', [c.title, c.category, c.duration, c.description, c.modules, c.modules_content, c.quiz_data]);
    });
  }
}

async function seedMySQLData() {
  const adminEmail = 'admin@wedigocareers.com';
  const [admins] = await mysqlPool.query('SELECT id FROM admins WHERE email = ?', [adminEmail]);
  if (admins.length === 0) {
    const hashedAdminPassword = bcrypt.hashSync('admin123', 10);
    await mysqlPool.query('INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)', ['Platform Admin', adminEmail, hashedAdminPassword, 'admin']);
  }

  const studentEmail = 'student@wedigocareers.com';
  const [students] = await mysqlPool.query('SELECT id FROM users WHERE email = ?', [studentEmail]);
  if (students.length === 0) {
    const hashedStudentPassword = bcrypt.hashSync('student123', 10);
    await mysqlPool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Jane Doe', studentEmail, hashedStudentPassword, 'student']);
  }

  const [courseRows] = await mysqlPool.query('SELECT COUNT(*) as count FROM courses');
  if (courseRows[0].count === 0) {
    await seedCoursesData(async (c) => {
      await mysqlPool.query('INSERT INTO courses (title, category, duration, description, modules, modules_content, quiz_data) VALUES (?, ?, ?, ?, ?, ?, ?)', [c.title, c.category, c.duration, c.description, c.modules, c.modules_content, c.quiz_data]);
    });
  }
}

async function seedSQLiteData() {
  const adminEmail = 'admin@wedigocareers.com';
  sqliteDb.get('SELECT id FROM admins WHERE email = ?', [adminEmail], (err, row) => {
    if (!row) {
      const hashedAdminPassword = bcrypt.hashSync('admin123', 10);
      sqliteDb.run('INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)', ['Platform Admin', adminEmail, hashedAdminPassword, 'admin']);
    }
  });

  const studentEmail = 'student@wedigocareers.com';
  sqliteDb.get('SELECT id FROM users WHERE email = ?', [studentEmail], (err, row) => {
    if (!row) {
      const hashedStudentPassword = bcrypt.hashSync('student123', 10);
      sqliteDb.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Jane Doe', studentEmail, hashedStudentPassword, 'student']);
    }
  });

  sqliteDb.get('SELECT COUNT(*) as count FROM courses', [], async (err, row) => {
    if (row && row.count === 0) {
      await seedCoursesData((c) => {
        sqliteDb.run('INSERT INTO courses (title, category, duration, description, modules, modules_content, quiz_data) VALUES (?, ?, ?, ?, ?, ?, ?)', [c.title, c.category, c.duration, c.description, c.modules, c.modules_content, c.quiz_data]);
      });
    }
  });
}

async function seedCoursesData(insertFn) {
  const defaultCourses = [
    {
      title: 'Full-Stack Web Development Internship',
      category: 'Full-Stack Engineering',
      duration: '8 Weeks',
      description: 'Comprehensive program covering modern Frontend UI architecture, Express API development, MySQL databases, and secure deployment practices.',
      modules: JSON.stringify([
        'Module 1: HTML5, CSS Glassmorphism & UI Design Systems',
        'Module 2: JavaScript ES6+ Async Programming',
        'Module 3: RESTful API Architecture with Express',
        'Module 4: MySQL Relational Schema & Security',
        'Module 5: Capstone Project & Certificate Verification'
      ]),
      modules_content: JSON.stringify([
        { id: 1, title: 'Module 1: HTML5, CSS Glassmorphism & UI Design Systems', videoUrl: 'https://www.youtube.com/embed/mU6anWqZJcc', summary: 'Learn how to build stunning modern web interfaces.', content: '<h3>Modern UI Architecture</h3>' },
        { id: 2, title: 'Module 2: JavaScript ES6+ Async Programming', videoUrl: 'https://www.youtube.com/embed/hdI2bqOjy3c', summary: 'Master asynchronous JavaScript using Promises & Async/Await.', content: '<h3>Async Programming</h3>' },
        { id: 3, title: 'Module 3: RESTful API Architecture with Express', videoUrl: 'https://www.youtube.com/embed/Oe421EPjeBE', summary: 'Understand server-side HTTP routing and Express.js APIs.', content: '<h3>REST APIs</h3>' },
        { id: 4, title: 'Module 4: MySQL Relational Schema & Security', videoUrl: 'https://www.youtube.com/embed/7S_tz1z_5bA', summary: 'Design relational database schemas and bcrypt hashing.', content: '<h3>MySQL Schema</h3>' },
        { id: 5, title: 'Module 5: Capstone Project & Certificate Verification', videoUrl: 'https://www.youtube.com/embed/UB1O30fR-EE', summary: 'Combine layers to issue canvas certificates with QR codes.', content: '<h3>Certificate Verification</h3>' }
      ]),
      quiz_data: JSON.stringify([
        { id: 1, question: 'Which CSS property is essential for glassmorphism blur?', options: ['filter', 'backdrop-filter: blur(16px)', 'opacity', 'shadow'], answerIndex: 1 },
        { id: 2, question: 'In ES6, what does async function return?', options: ['String', 'Promise', 'Array', 'Callback'], answerIndex: 1 },
        { id: 3, question: 'Which HTTP method creates a new resource?', options: ['GET', 'POST', 'PUT', 'DELETE'], answerIndex: 1 },
        { id: 4, question: 'Why hash passwords with bcrypt?', options: ['Speed', 'Compression', 'Prevent plain-text leaks', 'JSON'], answerIndex: 2 },
        { id: 5, question: 'What is the role of the QR Code?', options: ['Design', 'Link directly to database verification', 'Encrypt name', 'Download ZIP'], answerIndex: 1 }
      ])
    },
    {
      title: 'Python for Data Science & Machine Learning',
      category: 'Data Science',
      duration: '6 Weeks',
      description: 'Master data analysis, visualization, statistical modeling, and machine learning pipelines using Python, Pandas, and Scikit-Learn.',
      modules: JSON.stringify([
        'Module 1: Python Fundamentals & Data Structures',
        'Module 2: Data Wrangling with Pandas & NumPy',
        'Module 3: Data Visualization & Exploratory Analysis',
        'Module 4: Machine Learning Models & Evaluation'
      ]),
      modules_content: JSON.stringify([
        { id: 1, title: 'Module 1: Python Fundamentals & Data Structures', videoUrl: 'https://www.youtube.com/embed/rfscVS0vtbw', summary: 'Core Python syntax and data structures.', content: '<h3>Python Fundamentals</h3>' },
        { id: 2, title: 'Module 2: Data Wrangling with Pandas & NumPy', videoUrl: 'https://www.youtube.com/embed/vmEHCJofslg', summary: 'Manipulate tabular datasets.', content: '<h3>Pandas DataFrames</h3>' },
        { id: 3, title: 'Module 3: Data Visualization & Exploratory Analysis', videoUrl: 'https://www.youtube.com/embed/a9UrKTVEeZA', summary: 'Build charts with Matplotlib & Seaborn.', content: '<h3>Data Visualization</h3>' },
        { id: 4, title: 'Module 4: Machine Learning Models & Evaluation', videoUrl: 'https://www.youtube.com/embed/Gv9_4yMHFhI', summary: 'Train Scikit-Learn models.', content: '<h3>Machine Learning</h3>' }
      ]),
      quiz_data: JSON.stringify([
        { id: 1, question: 'Which Python library is primary for numerical array operations?', options: ['Flask', 'NumPy', 'BeautifulSoup', 'Requests'], answerIndex: 1 },
        { id: 2, question: 'What Pandas method loads a CSV file?', options: ['pd.load_csv()', 'pd.read_csv()', 'pd.open()', 'pd.import()'], answerIndex: 1 },
        { id: 3, question: 'Which metric measures correct classification predictions?', options: ['Accuracy', 'MSE', 'Variance', 'Std Dev'], answerIndex: 0 },
        { id: 4, question: 'What is the goal of EDA?', options: ['HTML', 'Analyzing data patterns before modeling', 'Servers', 'Icons'], answerIndex: 1 },
        { id: 5, question: 'Which Scikit-Learn function splits datasets?', options: ['train_test_split()', 'divide_data()', 'split_matrix()', 'subsets()'], answerIndex: 0 }
      ])
    },
    {
      title: 'Cloud Computing & DevOps Engineering',
      category: 'Cloud Engineering',
      duration: '4 Weeks',
      description: 'Learn containerization, CI/CD automated deployment pipelines, infrastructure security, and microservice management.',
      modules: JSON.stringify([
        'Module 1: Introduction to Cloud Infrastructure',
        'Module 2: Docker Containerization',
        'Module 3: CI/CD Pipeline Automation',
        'Module 4: Security & Monitoring Best Practices'
      ]),
      modules_content: JSON.stringify([
        { id: 1, title: 'Module 1: Introduction to Cloud Infrastructure', videoUrl: 'https://www.youtube.com/embed/ulprqHHWlng', summary: 'Cloud service models.', content: '<h3>Cloud Basics</h3>' },
        { id: 2, title: 'Module 2: Docker Containerization', videoUrl: 'https://www.youtube.com/embed/gAkwW2tuIqE', summary: 'Package apps with Docker.', content: '<h3>Docker Containers</h3>' },
        { id: 3, title: 'Module 3: CI/CD Pipeline Automation', videoUrl: 'https://www.youtube.com/embed/R8_veQiYBjU', summary: 'Automate build & test pipelines.', content: '<h3>CI/CD Pipelines</h3>' },
        { id: 4, title: 'Module 4: Security & Monitoring Best Practices', videoUrl: 'https://www.youtube.com/embed/hQcFE0RD0cQ', summary: 'SSL/TLS & Firewall security.', content: '<h3>Cloud Security</h3>' }
      ]),
      quiz_data: JSON.stringify([
        { id: 1, question: 'What is the primary benefit of containerizing with Docker?', options: ['Replacing MySQL', 'Consistent execution environment', 'CSS', 'Audio'], answerIndex: 1 },
        { id: 2, question: 'What does CI/CD stand for?', options: ['Continuous Integration / Continuous Deployment', 'Code Inspection', 'Cloud Internet', 'Central Interface'], answerIndex: 0 },
        { id: 3, question: 'Which file specifies Docker image build instructions?', options: ['package.json', 'Dockerfile', 'index.html', 'server.js'], answerIndex: 1 },
        { id: 4, question: 'Which protocol secures web traffic with SSL/TLS?', options: ['HTTP', 'FTP', 'HTTPS', 'SSH'], answerIndex: 2 },
        { id: 5, question: 'What is the purpose of a load balancer?', options: ['To distribute incoming traffic across servers', 'Video', 'SQL', 'Minify'], answerIndex: 0 }
      ])
    }
  ];

  for (const c of defaultCourses) {
    await insertFn(c);
  }
}

function getMode() {
  return dbMode;
}

function getPgError() {
  return pgErrorMsg;
}

module.exports = {
  initDB,
  query,
  getMode,
  getPgError
};
