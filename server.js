require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const { initDB, query, getMode } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'wedigo_careers_jwt_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  next();
}

function generateCertId() {
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
  const year = new Date().getFullYear();
  return `CERT-${year}-${randomHex}`;
}

function formatDbDate(d = new Date()) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function calculateStartDate(completionDateObj, durationStr) {
  let weeks = 8;
  const match = durationStr ? durationStr.match(/(\d+)/) : null;
  if (match) {
    weeks = parseInt(match[1]);
  }
  const startDateObj = new Date(completionDateObj.getTime());
  startDateObj.setDate(startDateObj.getDate() - (weeks * 7));
  return startDateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2026-08-14-v2', mode: getMode() });
});

// API ROUTES

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const role = 'student';

    const result = await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    const userId = result.insertId;
    const token = jwt.sign({ id: userId, name, email, role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, name, email, role } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) return false;
  if (inputPassword === storedPassword) return true;
  try {
    return bcrypt.compareSync(inputPassword, storedPassword);
  } catch (e) {
    return false;
  }
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const cleanEmail = email.trim();
    // 1. Check Admins table first (Case-insensitive)
    const admins = await query('SELECT * FROM admins WHERE LOWER(email) = LOWER(?)', [cleanEmail]);
    if (admins.length > 0) {
      const admin = admins[0];
      if (verifyPassword(password, admin.password)) {
        const token = jwt.sign(
          { id: admin.id, name: admin.name, email: admin.email, role: 'admin' },
          JWT_SECRET,
          { expiresIn: '30d' }
        );
        return res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' } });
      }
    }

    // 2. Check Users table (Students, Case-insensitive)
    const users = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [cleanEmail]);
    const user = users[0];

    if (!user) return res.status(400).json({ error: 'Invalid credentials.' });

    if (!verifyPassword(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server authentication error.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Course Catalog
app.get('/api/courses', async (req, res) => {
  try {
    const rows = await query('SELECT id, title, category, duration, description, modules FROM courses ORDER BY id ASC');
    const courses = rows.map((r) => ({
      ...r,
      modules: typeof r.modules === 'string' ? JSON.parse(r.modules) : r.modules
    }));
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses.' });
  }
});

// Course Learning Workspace (Modules & Enrollment Progress)
app.get('/api/courses/:id/learn', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const courseId = req.params.id;

  try {
    const courseRows = await query('SELECT * FROM courses WHERE id = ?', [courseId]);
    const course = courseRows[0];
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const modulesList = typeof course.modules === 'string' ? JSON.parse(course.modules) : course.modules;
    const modulesContent = typeof course.modules_content === 'string' ? JSON.parse(course.modules_content) : course.modules_content;
    const rawQuiz = typeof course.quiz_data === 'string' ? JSON.parse(course.quiz_data) : course.quiz_data;

    const sanitizedQuiz = (rawQuiz || []).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options
    }));

    let enrollmentRows = await query('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId]);

    if (enrollmentRows.length === 0) {
      const nowStr = formatDbDate();
      await query(
        'INSERT INTO enrollments (user_id, course_id, progress, completed, passed, attempts_count, start_date) VALUES (?, ?, 0, 0, 0, 0, ?)',
        [userId, courseId, nowStr]
      );
      enrollmentRows = await query('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId]);
    }

    const enrollment = enrollmentRows[0];
    const completedModules = enrollment.completed_modules ? JSON.parse(enrollment.completed_modules) : [];

    res.json({
      course: {
        id: course.id,
        title: course.title,
        category: course.category,
        duration: course.duration,
        description: course.description,
        modules: modulesList,
        modulesContent: modulesContent,
        quiz: sanitizedQuiz
      },
      enrollment: {
        progress: enrollment.progress,
        completed: enrollment.completed,
        passed: enrollment.passed,
        attemptsCount: enrollment.attempts_count,
        attemptsLeft: Math.max(0, 5 - enrollment.attempts_count),
        highestScore: enrollment.highest_score,
        completedModules: completedModules,
        startDate: enrollment.start_date
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load learning workspace.' });
  }
});

// Mark Module Complete
app.post('/api/courses/:id/module/complete', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const courseId = req.params.id;
  const { moduleId } = req.body;

  try {
    const courseRows = await query('SELECT modules FROM courses WHERE id = ?', [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'Course not found.' });

    const totalModules = JSON.parse(courseRows[0].modules).length;
    const enrollRows = await query('SELECT completed_modules FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId]);
    
    let completedModules = enrollRows[0] && enrollRows[0].completed_modules ? JSON.parse(enrollRows[0].completed_modules) : [];
    if (!completedModules.includes(moduleId)) {
      completedModules.push(moduleId);
    }

    const progress = Math.min(100, Math.round((completedModules.length / totalModules) * 100));

    await query(
      'UPDATE enrollments SET progress = ?, completed_modules = ? WHERE user_id = ? AND course_id = ?',
      [progress, JSON.stringify(completedModules), userId, courseId]
    );

    res.json({ progress, completedModules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update module completion.' });
  }
});

// Submit Quiz & Certificate Generation (Requires 80% score & Max 5 attempts)
app.post('/api/courses/:id/quiz/submit', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const courseId = req.params.id;
  const { answers } = req.body;

  try {
    const enrollRows = await query('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId]);
    const enrollment = enrollRows[0];
    if (!enrollment) return res.status(400).json({ error: 'Please start the course before taking the quiz.' });

    if (enrollment.attempts_count >= 5 && enrollment.passed === 0) {
      return res.status(403).json({
        passed: false,
        error: 'You have reached the maximum attempt limit (5 attempts) for this course.'
      });
    }

    const courseRows = await query('SELECT * FROM courses WHERE id = ?', [courseId]);
    const course = courseRows[0];
    const quizData = typeof course.quiz_data === 'string' ? JSON.parse(course.quiz_data) : course.quiz_data;

    let correctCount = 0;
    quizData.forEach((q) => {
      if (answers && parseInt(answers[q.id]) === q.answerIndex) {
        correctCount++;
      }
    });

    const totalQuestions = quizData.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const attemptsCount = enrollment.attempts_count + 1;
    const attemptsLeft = Math.max(0, 5 - attemptsCount);
    const newHighestScore = Math.max(enrollment.highest_score || 0, score);
    const passed = score >= 80 ? 1 : (enrollment.passed || 0);

    const now = new Date();
    const nowStr = formatDbDate(now);
    if (passed) {
      await query(
        'UPDATE enrollments SET attempts_count = ?, highest_score = ?, passed = 1, completed = 1, completed_at = ? WHERE user_id = ? AND course_id = ?',
        [attemptsCount, newHighestScore, nowStr, userId, courseId]
      );
    } else {
      await query(
        'UPDATE enrollments SET attempts_count = ?, highest_score = ? WHERE user_id = ? AND course_id = ?',
        [attemptsCount, newHighestScore, userId, courseId]
      );
    }

    if (score >= 80) {
      const existingCert = await query('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?', [userId, courseId]);
      if (existingCert.length > 0) {
        return res.json({
          passed: true,
          score,
          attemptsCount,
          attemptsLeft,
          certificate: existingCert[0]
        });
      }

      // Format Start Date & Completion Date based on course duration
      const formattedCompletionDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const formattedStartDate = calculateStartDate(now, course.duration);

      const userRows = await query('SELECT * FROM users WHERE id = ?', [userId]);
      const user = userRows[0];
      const certId = generateCertId();

      const verificationHash = crypto
        .createHash('sha256')
        .update(`${certId}-${user.id}-${course.id}-${formattedCompletionDate}`)
        .digest('hex');

      await query(
        `INSERT INTO certificates 
         (certificate_id, user_id, user_name, user_email, course_id, course_title, course_duration, start_date, completion_date, issue_date, score, verification_hash, signatory_name, signatory_title) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Neethu Allampati', 'Director of Academics')`,
        [
          certId,
          user.id,
          user.name,
          user.email,
          course.id,
          course.title,
          course.duration,
          formattedStartDate,
          formattedCompletionDate,
          formattedCompletionDate,
          score,
          verificationHash
        ]
      );

      const newCert = await query('SELECT * FROM certificates WHERE certificate_id = ?', [certId]);

      return res.json({
        passed: true,
        score,
        attemptsCount,
        attemptsLeft,
        certificate: newCert[0]
      });
    }

    return res.json({
      passed: false,
      score,
      attemptsCount,
      attemptsLeft,
      message: `Score: ${score}%. Minimum 80% is required to earn your certificate. You have ${attemptsLeft} attempt(s) remaining.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Quiz evaluation failed.' });
  }
});

// Certificate Routes
app.get('/api/certificates/my-certificates', authenticateToken, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM certificates WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ certificates: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch certificates.' });
  }
});

// PUBLIC VERIFICATION ROUTE (No Auth Required)
app.get('/api/certificates/verify/:certId', async (req, res) => {
  const certId = req.params.certId.trim();
  try {
    const rows = await query('SELECT * FROM certificates WHERE certificate_id = ?', [certId]);
    const cert = rows[0];

    if (!cert) {
      return res.status(404).json({
        verified: false,
        error: 'Certificate record not found in database. Please check the Certificate ID.'
      });
    }

    res.json({
      verified: true,
      status: cert.status,
      certificate: cert
    });
  } catch (err) {
    res.status(500).json({ verified: false, error: 'Database error during verification.' });
  }
});

// ADMIN ROUTES
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const u = await query('SELECT COUNT(*) as totalUsers FROM users');
    const c = await query('SELECT COUNT(*) as totalCerts FROM certificates');
    const cr = await query('SELECT COUNT(*) as totalCourses FROM courses');
    const e = await query('SELECT COUNT(*) as totalEnrollments FROM enrollments');

    res.json({
      stats: {
        users: u[0].totalUsers,
        certificates: c[0].totalCerts,
        courses: cr[0].totalCourses,
        enrollments: e[0].totalEnrollments
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await query('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

app.get('/api/admin/certificates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM certificates ORDER BY created_at DESC');
    res.json({ certificates: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch certificates.' });
  }
});

app.post('/api/admin/create-admin', authenticateToken, requireAdmin, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    await query(
      'INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'admin']
    );
    res.json({ message: 'Admin account created successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create admin account.' });
  }
});

app.post('/api/admin/issue-manual', authenticateToken, requireAdmin, async (req, res) => {
  const { userName, userEmail, courseTitle, courseDuration } = req.body;
  if (!userName || !userEmail || !courseTitle || !courseDuration) {
    return res.status(400).json({ error: 'All manual issuance fields are required.' });
  }

  const certId = generateCertId();
  const now = new Date();
  const formattedCompletionDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedStartDate = calculateStartDate(now, courseDuration);

  const verificationHash = crypto
    .createHash('sha256')
    .update(`${certId}-MANUAL-${formattedCompletionDate}`)
    .digest('hex');

  try {
    await query(
      `INSERT INTO certificates 
       (certificate_id, user_id, user_name, user_email, course_id, course_title, course_duration, start_date, completion_date, issue_date, score, verification_hash, signatory_name, signatory_title) 
       VALUES (?, 0, ?, ?, 0, ?, ?, ?, ?, ?, 100, ?, 'Neethu Allampati', 'Director of Academics')`,
      [certId, userName, userEmail, courseTitle, courseDuration, formattedStartDate, formattedCompletionDate, formattedCompletionDate, verificationHash]
    );
    res.json({ message: 'Certificate issued successfully.', certId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to issue manual certificate.' });
  }
});

app.delete('/api/admin/certificates/:certId', authenticateToken, requireAdmin, async (req, res) => {
  const certId = req.params.certId;
  try {
    await query("UPDATE certificates SET status = 'REVOKED' WHERE certificate_id = ?", [certId]);
    res.json({ message: 'Certificate status set to REVOKED.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update certificate status.' });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      const mode = getMode();
      console.log('\n===============================================================');
      console.log(`  Wedigo Careers Server running on http://localhost:${PORT}`);
      if (mode === 'MYSQL') {
        console.log(`  DATABASE ENGINE: MySQL [connected to database: wedigo_careers]`);
        console.log(`  All user registrations & certificates are saved directly to MySQL!`);
      } else {
        console.log(`  DATABASE ENGINE: SQLite (Fallback Mode)`);
        console.log(`  NOTE: MySQL root password in .env needs to be set to connect to MySQL.`);
      }
      console.log('===============================================================\n');
    });
  })
  .catch((err) => {
    console.error('Server launch error:', err.message);
  });
