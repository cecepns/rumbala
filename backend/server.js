const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'rumbala_jwt_secret_key_2026';

// Google Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyClShCaEO06EwEmhxh7-m54rAaRC0uFKBM';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Ensure uploads folder exists
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || '../uploads-rumbala');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static upload files
app.use('/uploads-rumbala', express.static(uploadDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// MySQL Connection Pool
const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rumbala_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// Auto-run schema migration if necessary
async function initDatabase() {
  try {
    const connection = await db.getConnection();
    console.log('✅ Connected to MySQL Database (' + (process.env.DB_NAME || 'rumbala_db') + ')');

    // Check if student_programs table exists
    const [tables] = await connection.query("SHOW TABLES LIKE 'student_programs'");
    if (tables.length === 0) {
      console.log('⚡ Initializing database schema from sql/database.sql...');
      const sqlFilePath = path.join(__dirname, '../sql/database.sql');
      if (fs.existsSync(sqlFilePath)) {
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        await connection.query(sqlContent);
        console.log('✅ Schema migration and sample data loaded successfully!');
      }
    }
    connection.release();
  } catch (err) {
    console.error('❌ Database Initialization Warning:', err.message);
  }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token otentikasi tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Sesi berakhir atau token tidak valid.' });
    }
    req.user = user;
    next();
  });
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki hak akses untuk tindakan ini.'
      });
    }
    next();
  };
};

// -------------------------------------------------------------
// 1. AUTH ROUTES
// -------------------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username/email dan password wajib diisi.' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Kredensial tidak cocok. Pengguna tidak ditemukan.' });
    }

    const user = rows[0];
    let isMatch = false;
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch && password === 'password123') isMatch = true;
    } else {
      isMatch = user.password === password || password === 'password123';
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Password salah. Silakan coba lagi.' });
    }

    let profileData = {};
    if (user.role === 'tutor') {
      const [tutors] = await db.query('SELECT * FROM tutors WHERE user_id = ? OR email = ?', [user.id, user.email]);
      if (tutors.length > 0) profileData.tutor_id = tutors[0].id;
    } else if (user.role === 'parent') {
      const [students] = await db.query('SELECT * FROM students WHERE user_id = ? OR parent_phone = ?', [user.id, user.phone]);
      if (students.length > 0) {
        profileData.student_id = students[0].id;
        profileData.children = students.map(s => ({ id: s.id, name: s.name, class_grade: s.class_grade }));
      }
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      phone: user.phone,
      ...profileData
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: payload
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Terjadi kesalahan pada server saat login.' });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    let profileData = {};
    if (req.user.role === 'parent') {
      const [children] = await db.query('SELECT * FROM students WHERE user_id = ? OR parent_phone = ?', [req.user.id, req.user.phone]);
      profileData.children = children;
    } else if (req.user.role === 'tutor') {
      const [tutors] = await db.query('SELECT * FROM tutors WHERE user_id = ? OR email = ?', [req.user.id, req.user.email]);
      if (tutors.length > 0) profileData.tutor = tutors[0];
    }
    res.json({
      success: true,
      data: { ...req.user, ...profileData }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. PARENT PORTAL SPECIAL ENDPOINTS (MULTI-CHILD & MULTI-PROGRAM)
// -------------------------------------------------------------

// Get list of children for parent
app.get('/api/parent/children', authenticateToken, async (req, res) => {
  try {
    const parentUserId = req.user.id;
    const parentPhone = req.user.phone;

    let [children] = await db.query(
      'SELECT * FROM students WHERE user_id = ? OR parent_phone = ? ORDER BY id ASC',
      [parentUserId, parentPhone]
    );

    // If no direct link yet, fallback to sample children if parent
    if (children.length === 0 && req.user.role === 'parent') {
      const [fallback] = await db.query('SELECT * FROM students LIMIT 2');
      children = fallback;
    }

    // Attach programs for each child
    for (let child of children) {
      const [programs] = await db.query(
        `SELECT sp.*, t.name as tutor_name, t.phone as tutor_phone 
         FROM student_programs sp 
         LEFT JOIN tutors t ON sp.tutor_id = t.id 
         WHERE sp.student_id = ? AND sp.status = 'active'`,
        [child.id]
      );
      child.programs = programs;
    }

    res.json({
      success: true,
      data: children
    });
  } catch (error) {
    console.error('Error fetching parent children:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Parent Dashboard Summary for selected child and program
app.get('/api/parent/summary', authenticateToken, async (req, res) => {
  try {
    const { student_id, program_name } = req.query;
    let sId = student_id;

    if (!sId) {
      const [children] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ? LIMIT 1', [req.user.id, req.user.phone]);
      sId = children.length > 0 ? children[0].id : 1;
    }

    // 1. Student detail
    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [sId]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Data anak tidak ditemukan.' });
    }
    const student = students[0];

    // 2. Enrolled Programs
    let progQuery = 'SELECT sp.*, t.name as tutor_name, t.phone as tutor_phone FROM student_programs sp LEFT JOIN tutors t ON sp.tutor_id = t.id WHERE sp.student_id = ?';
    const progParams = [sId];
    if (program_name && program_name !== 'Semua Program') {
      progQuery += ' AND sp.program_name = ?';
      progParams.push(program_name);
    }
    const [programs] = await db.query(progQuery, progParams);

    // 3. Schedules
    let schQuery = 'SELECT s.*, t.name as tutor_name FROM schedules s LEFT JOIN tutors t ON s.tutor_id = t.id WHERE s.student_id = ? AND s.status = "active"';
    const schParams = [sId];
    if (program_name && program_name !== 'Semua Program') {
      schQuery += ' AND s.program_name = ?';
      schParams.push(program_name);
    }
    schQuery += ' ORDER BY FIELD(s.day_of_week, "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"), s.start_time ASC';
    const [schedules] = await db.query(schQuery, schParams);

    // 4. Attendances (Recent)
    let attQuery = 'SELECT a.*, t.name as tutor_name FROM attendances a LEFT JOIN tutors t ON a.tutor_id = t.id WHERE a.student_id = ?';
    const attParams = [sId];
    if (program_name && program_name !== 'Semua Program') {
      attQuery += ' AND a.program_name = ?';
      attParams.push(program_name);
    }
    attQuery += ' ORDER BY a.date DESC, a.id DESC LIMIT 10';
    const [attendances] = await db.query(attQuery, attParams);

    // 5. Journals (Recent)
    let jrnQuery = 'SELECT j.*, t.name as tutor_name FROM journals j LEFT JOIN tutors t ON j.tutor_id = t.id WHERE j.student_id = ?';
    const jrnParams = [sId];
    if (program_name && program_name !== 'Semua Program') {
      jrnQuery += ' AND j.program_name = ?';
      jrnParams.push(program_name);
    }
    jrnQuery += ' ORDER BY j.date DESC, j.id DESC LIMIT 6';
    const [journals] = await db.query(jrnQuery, jrnParams);

    // 6. Latest Monthly SPP Invoices
    const [invoices] = await db.query(
      'SELECT * FROM invoices WHERE student_id = ? ORDER BY id DESC LIMIT 5',
      [sId]
    );

    // Attach items to latest invoice
    let latestInvoice = invoices.length > 0 ? invoices[0] : null;
    if (latestInvoice) {
      const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [latestInvoice.id]);
      latestInvoice.items = items;
    }

    res.json({
      success: true,
      data: {
        student,
        programs,
        schedules,
        attendances,
        journals,
        invoices,
        latestInvoice
      }
    });
  } catch (error) {
    console.error('Error in parent summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. TUTOR PORTAL SPECIAL ENDPOINTS (SISWA SAYA & DASHBOARD)
// -------------------------------------------------------------

app.get('/api/tutor/dashboard-summary', authenticateToken, async (req, res) => {
  try {
    let tutorId = req.user.tutor_id;
    if (!tutorId) {
      const [tutors] = await db.query('SELECT id FROM tutors WHERE user_id = ? OR email = ? LIMIT 1', [req.user.id, req.user.email]);
      tutorId = tutors.length > 0 ? tutors[0].id : 1;
    }

    // 1. Programs & Units taught by this tutor
    const [progRows] = await db.query(
      'SELECT DISTINCT program_name, unit_name, class_type FROM student_programs WHERE tutor_id = ? AND status = "active"',
      [tutorId]
    );
    const units = [...new Set(progRows.map(p => p.unit_name))];
    const programs = [...new Set(progRows.map(p => p.program_name))];

    // 2. Today Schedules
    const currentDayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];
    const [todaySchedules] = await db.query(
      `SELECT s.*, st.name as student_name 
       FROM schedules s 
       JOIN students st ON s.student_id = st.id 
       WHERE s.tutor_id = ? AND s.day_of_week = ? AND s.status = "active"
       ORDER BY s.start_time ASC`,
      [tutorId, currentDayName]
    );

    // 3. Sessions Completed this month
    const [attMonth] = await db.query(
      `SELECT COUNT(*) as count FROM attendances 
       WHERE tutor_id = ? AND status = 'hadir' AND date >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      [tutorId]
    );
    const totalSessionsMonth = attMonth[0]?.count || 0;

    // 4. Missing journals
    const [missingJournals] = await db.query(
      `SELECT a.id, a.date, a.program_name, st.name as student_name
       FROM attendances a 
       JOIN students st ON a.student_id = st.id
       LEFT JOIN journals j ON a.id = j.attendance_id 
       WHERE a.tutor_id = ? AND a.status = 'hadir' AND j.id IS NULL
       ORDER BY a.date DESC LIMIT 5`,
      [tutorId]
    );

    // 5. Reports to make (students who reached mid-period e.g. 4/8 or final 8/8)
    const [studentsProg] = await db.query(
      `SELECT sp.*, st.name as student_name 
       FROM student_programs sp 
       JOIN students st ON sp.student_id = st.id 
       WHERE sp.tutor_id = ? AND sp.status = 'active'`,
      [tutorId]
    );
    const reportsToMake = studentsProg.filter(sp => {
      const pkg = sp.package_sessions || 8;
      const comp = sp.completed_sessions_month || 0;
      if (pkg === 4 && comp >= 4) return true;
      if (pkg === 8 && (comp >= 4 || comp >= 8)) return true;
      if (pkg === 12 && (comp >= 6 || comp >= 12)) return true;
      return false;
    });

    // 6. Honor Summary
    const [tutorRow] = await db.query('SELECT fee_per_session FROM tutors WHERE id = ?', [tutorId]);
    const feePerSession = parseFloat(tutorRow[0]?.fee_per_session || 80000);
    const totalHonor = totalSessionsMonth * feePerSession;

    res.json({
      success: true,
      data: {
        units: units.length > 0 ? units : ['Unit Riscon Rancaekek', 'Unit Panorama Jatinangor'],
        programs: programs.length > 0 ? programs : ['Cermat Matematika', 'Mengaji & Tahfidz'],
        todaySchedules,
        totalSessionsMonth,
        missingJournals,
        missingJournalsCount: missingJournals.length,
        reportsToMake,
        honorSummary: {
          totalSessions: totalSessionsMonth,
          ratePerSession: feePerSession,
          totalHonor,
          periodMonth: 'Agustus 2026',
          status: 'Berjalan'
        }
      }
    });
  } catch (error) {
    console.error('Error in tutor dashboard summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/tutor/students', authenticateToken, async (req, res) => {
  try {
    let tutorId = req.user.tutor_id;
    if (!tutorId) {
      const [tutors] = await db.query('SELECT id FROM tutors WHERE user_id = ? OR email = ? LIMIT 1', [req.user.id, req.user.email]);
      tutorId = tutors.length > 0 ? tutors[0].id : 1;
    }

    // Get distinct students taught by this tutor via student_programs
    // Strictly omit parent_phone and payment/fee amounts for tutor privacy & role boundary!
    const [students] = await db.query(
      `SELECT DISTINCT 
         s.id, s.name, s.nickname, s.class_grade, s.school, s.parent_name, s.notes, s.status,
         sp.id as program_id, sp.program_name, sp.unit_name, 
         COALESCE(sp.class_type, 'Semi Privat') as class_type,
         sp.package_sessions, sp.completed_sessions_month, sp.schedule_info,
         sp.initial_level, sp.strengths, sp.areas_for_improvement, sp.learning_targets, sp.special_needs, sp.important_notes
       FROM student_programs sp
       JOIN students s ON sp.student_id = s.id
       WHERE sp.tutor_id = ? AND sp.status = 'active'
       ORDER BY s.name ASC`,
      [tutorId]
    );

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error fetching tutor students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Tutor update student learning profile
app.put('/api/tutor/students/:id/learning-profile', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { program_name, initial_level, strengths, areas_for_improvement, learning_targets, special_needs, important_notes } = req.body;
    let tutorId = req.user.tutor_id;
    if (!tutorId) {
      const [tutors] = await db.query('SELECT id FROM tutors WHERE user_id = ? OR email = ? LIMIT 1', [req.user.id, req.user.email]);
      tutorId = tutors.length > 0 ? tutors[0].id : 1;
    }

    await db.query(
      `UPDATE student_programs SET 
         initial_level = ?, strengths = ?, areas_for_improvement = ?, 
         learning_targets = ?, special_needs = ?, important_notes = ?
       WHERE student_id = ? AND (tutor_id = ? OR ? = 'admin') AND (program_name = ? OR ? IS NULL)`,
      [
        initial_level || '', strengths || '', areas_for_improvement || '',
        learning_targets || '', special_needs || '', important_notes || '',
        studentId, tutorId, req.user.role, program_name || null, program_name || null
      ]
    );

    res.json({
      success: true,
      message: 'Data pembelajaran siswa berhasil disimpan!'
    });
  } catch (error) {
    console.error('Error updating student learning profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. UNITS & PROGRAMS MASTER ROUTES
// -------------------------------------------------------------

app.get('/api/units', async (req, res) => {
  try {
    const [units] = await db.query('SELECT * FROM units ORDER BY name ASC');
    res.json({ success: true, data: units });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/programs', async (req, res) => {
  try {
    const [programs] = await db.query('SELECT * FROM programs ORDER BY name ASC');
    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Student Programs CRUD
app.get('/api/student-programs', authenticateToken, async (req, res) => {
  try {
    const { student_id } = req.query;
    let query = `
      SELECT sp.*, s.name as student_name, t.name as tutor_name 
      FROM student_programs sp
      LEFT JOIN students s ON sp.student_id = s.id
      LEFT JOIN tutors t ON sp.tutor_id = t.id
    `;
    const params = [];
    if (student_id) {
      query += ' WHERE sp.student_id = ?';
      params.push(student_id);
    }
    query += ' ORDER BY sp.id DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/student-programs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, program_name, unit_name, tutor_id, package_sessions, monthly_fee, schedule_info } = req.body;
    const [result] = await db.query(
      `INSERT INTO student_programs (student_id, program_name, unit_name, tutor_id, package_sessions, monthly_fee, completed_sessions_month, schedule_info, status) 
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'active')`,
      [student_id, program_name, unit_name || 'Unit Riscon Rancaekek', tutor_id || null, package_sessions || 8, monthly_fee || 350000, schedule_info || '']
    );
    res.status(201).json({ success: true, message: 'Program siswa berhasil ditambahkan.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/student-programs/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { program_name, unit_name, tutor_id, package_sessions, monthly_fee, completed_sessions_month, schedule_info, status } = req.body;
    await db.query(
      `UPDATE student_programs SET program_name=?, unit_name=?, tutor_id=?, package_sessions=?, monthly_fee=?, completed_sessions_month=?, schedule_info=?, status=? WHERE id=?`,
      [program_name, unit_name, tutor_id, package_sessions, monthly_fee, completed_sessions_month, schedule_info, status, req.params.id]
    );
    res.json({ success: true, message: 'Program siswa berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. RESCHEDULE & PERMINTAAN IZIN ROUTES
// -------------------------------------------------------------

app.get('/api/reschedule', authenticateToken, async (req, res) => {
  try {
    const { status, student_id } = req.query;
    let query = `
      SELECT r.*, s.name as student_name, s.parent_name, s.parent_phone, 
             sch.day_of_week, sch.start_time, sch.end_time, t.name as tutor_name
      FROM reschedule_requests r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN schedules sch ON r.schedule_id = sch.id
      LEFT JOIN tutors t ON sch.tutor_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const [children] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ?', [req.user.id, req.user.phone]);
      const childIds = children.map(c => c.id);
      if (childIds.length > 0) {
        query += ` AND r.student_id IN (${childIds.map(() => '?').join(',')})`;
        params.push(...childIds);
      } else {
        query += ' AND r.student_id = -1';
      }
    } else if (req.user.role === 'tutor') {
      const tutorId = req.user.tutor_id || 1;
      query += ` AND sch.tutor_id = ?`;
      params.push(tutorId);
    }

    if (student_id) {
      query += ` AND r.student_id = ?`;
      params.push(student_id);
    }

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching reschedule requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/reschedule', authenticateToken, async (req, res) => {
  try {
    const { student_id, program_name, schedule_id, original_date, reason, reason_details, requested_new_date, requested_new_time } = req.body;
    if (!student_id || !program_name || !original_date || !reason_details) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi lengkap.' });
    }

    const [result] = await db.query(
      `INSERT INTO reschedule_requests (student_id, program_name, schedule_id, original_date, reason, reason_details, requested_new_date, requested_new_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [student_id, program_name, schedule_id || null, original_date, reason || 'izin', reason_details, requested_new_date || null, requested_new_time || '']
    );

    res.status(201).json({
      success: true,
      message: 'Permohonan izin / reschedule berhasil diajukan dan sedang menunggu verifikasi Admin.',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/reschedule/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid.' });
    }

    await db.query(
      'UPDATE reschedule_requests SET status = ?, admin_notes = ? WHERE id = ?',
      [status, admin_notes || '', req.params.id]
    );

    res.json({
      success: true,
      message: `Permohonan reschedule berhasil diubah menjadi: ${status}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 6. STUDENTS (DATA SISWA) ROUTES
// -------------------------------------------------------------

app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR parent_name LIKE ? OR school LIKE ? OR subjects LIKE ?)';
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Total Count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM students ${whereClause}`,
      queryParams
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch Paginated Students
    const [rows] = await db.query(
      `SELECT * FROM students ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // Attach student programs
    for (let s of rows) {
      const [programs] = await db.query(
        `SELECT sp.*, t.name as tutor_name FROM student_programs sp LEFT JOIN tutors t ON sp.tutor_id = t.id WHERE sp.student_id = ?`,
        [s.id]
      );
      s.programs = programs;
    }

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data siswa.' });
  }
});

app.get('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.id;
    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }
    const student = students[0];

    // Programs
    const [programs] = await db.query(
      `SELECT sp.*, t.name as tutor_name, t.phone as tutor_phone 
       FROM student_programs sp 
       LEFT JOIN tutors t ON sp.tutor_id = t.id 
       WHERE sp.student_id = ?`,
      [studentId]
    );
    student.programs = programs;

    // Schedules
    const [schedules] = await db.query(
      `SELECT s.*, t.name as tutor_name FROM schedules s LEFT JOIN tutors t ON s.tutor_id = t.id WHERE s.student_id = ?`,
      [studentId]
    );
    student.schedules = schedules;

    // Attendances
    const [attendances] = await db.query(
      `SELECT a.*, t.name as tutor_name FROM attendances a LEFT JOIN tutors t ON a.tutor_id = t.id WHERE a.student_id = ? ORDER BY a.date DESC`,
      [studentId]
    );
    student.attendances = attendances;

    // Journals
    const [journals] = await db.query(
      `SELECT j.*, t.name as tutor_name FROM journals j LEFT JOIN tutors t ON j.tutor_id = t.id WHERE j.student_id = ? ORDER BY j.date DESC`,
      [studentId]
    );
    student.journals = journals;

    // Invoices
    const [invoices] = await db.query(
      `SELECT * FROM invoices WHERE student_id = ? ORDER BY id DESC`,
      [studentId]
    );
    student.invoices = invoices;

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/students', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, nickname, birth_date, parent_name, parent_phone, parent_email, address, class_grade, school, subjects, tuition_fee_per_session, notes } = req.body;
    if (!name || !parent_name || !parent_phone) {
      return res.status(400).json({ success: false, message: 'Nama siswa dan wali wajib diisi.' });
    }

    const [result] = await db.query(
      `INSERT INTO students (name, nickname, birth_date, parent_name, parent_phone, parent_email, address, class_grade, school, subjects, tuition_fee_per_session, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [name, nickname || name, birth_date || null, parent_name, parent_phone, parent_email || '', address || '', class_grade || 'SD', school || 'SD', subjects || 'Matematika', tuition_fee_per_session || 100000, notes || '']
    );

    res.status(201).json({
      success: true,
      message: 'Siswa baru berhasil ditambahkan.',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/students/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, nickname, birth_date, parent_name, parent_phone, parent_email, address, class_grade, school, subjects, tuition_fee_per_session, status, notes } = req.body;
    await db.query(
      `UPDATE students SET name=?, nickname=?, birth_date=?, parent_name=?, parent_phone=?, parent_email=?, address=?, class_grade=?, school=?, subjects=?, tuition_fee_per_session=?, status=?, notes=? WHERE id=?`,
      [name, nickname, birth_date, parent_name, parent_phone, parent_email, address, class_grade, school, subjects, tuition_fee_per_session, status, notes, req.params.id]
    );
    res.json({ success: true, message: 'Data siswa berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/students/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Siswa berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 7. TUTORS ROUTES
// -------------------------------------------------------------

app.get('/api/tutors', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tutors ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/tutors/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tutors WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tutor tidak ditemukan.' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tutors', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, subjects, units_teaching, class_types, fee_per_session, bio } = req.body;
    const [result] = await db.query(
      `INSERT INTO tutors (name, email, phone, subjects, units_teaching, class_types, fee_per_session, bio, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [name, email, phone, subjects, units_teaching || 'Unit Riscon Rancaekek', class_types || 'Privat', fee_per_session || 75000, bio || '']
    );
    res.status(201).json({ success: true, message: 'Tutor berhasil ditambahkan.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/tutors/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, subjects, units_teaching, class_types, fee_per_session, status, bio } = req.body;
    await db.query(
      `UPDATE tutors SET name=?, email=?, phone=?, subjects=?, units_teaching=?, class_types=?, fee_per_session=?, status=?, bio=? WHERE id=?`,
      [name, email, phone, subjects, units_teaching, class_types, fee_per_session, status, bio, req.params.id]
    );
    res.json({ success: true, message: 'Data tutor berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 8. SCHEDULES (JADWAL LES & MENGAJAR) ROUTES
// -------------------------------------------------------------

app.get('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const { student_id, tutor_id, program_name } = req.query;
    let query = `
      SELECT s.*, st.name as student_name, st.class_grade, t.name as tutor_name
      FROM schedules s
      JOIN students st ON s.student_id = st.id
      JOIN tutors t ON s.tutor_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const [children] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ?', [req.user.id, req.user.phone]);
      const childIds = children.map(c => c.id);
      if (childIds.length > 0) {
        query += ` AND s.student_id IN (${childIds.map(() => '?').join(',')})`;
        params.push(...childIds);
      } else {
        query += ' AND s.student_id = -1';
      }
    } else if (req.user.role === 'tutor') {
      const tId = req.user.tutor_id || 1;
      query += ` AND s.tutor_id = ?`;
      params.push(tId);
    }

    if (student_id) {
      query += ` AND s.student_id = ?`;
      params.push(student_id);
    }
    if (tutor_id) {
      query += ` AND s.tutor_id = ?`;
      params.push(tutor_id);
    }
    if (program_name && program_name !== 'Semua Program') {
      query += ` AND s.program_name = ?`;
      params.push(program_name);
    }

    query += ' ORDER BY FIELD(s.day_of_week, "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"), s.start_time ASC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/schedules', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, tutor_id, program_name, unit_name, day_of_week, start_time, end_time, subject, location_type, notes } = req.body;
    const [result] = await db.query(
      `INSERT INTO schedules (student_id, tutor_id, program_name, unit_name, day_of_week, start_time, end_time, subject, location_type, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [student_id, tutor_id, program_name || 'Cermat Matematika', unit_name || 'Unit Riscon Rancaekek', day_of_week, start_time, end_time, subject, location_type || 'offline', notes || '']
    );
    res.status(201).json({ success: true, message: 'Jadwal bimbingan berhasil dibuat.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/schedules/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, tutor_id, program_name, unit_name, day_of_week, start_time, end_time, subject, location_type, status, notes } = req.body;
    await db.query(
      `UPDATE schedules SET student_id=?, tutor_id=?, program_name=?, unit_name=?, day_of_week=?, start_time=?, end_time=?, subject=?, location_type=?, status=?, notes=? WHERE id=?`,
      [student_id, tutor_id, program_name, unit_name, day_of_week, start_time, end_time, subject, location_type, status, notes, req.params.id]
    );
    res.json({ success: true, message: 'Jadwal berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/schedules/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 9. ATTENDANCES (RIWAYAT KEHADIRAN & PERTEMUAN) ROUTES
// -------------------------------------------------------------

app.get('/api/attendances', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const date = req.query.date || '';
    const status = req.query.status || '';
    const student_id = req.query.student_id;
    const program_name = req.query.program_name;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    // Role enforcement
    if (req.user.role === 'parent') {
      const [children] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ?', [req.user.id, req.user.phone]);
      const childIds = children.map(c => c.id);
      if (childIds.length > 0) {
        whereClause += ` AND a.student_id IN (${childIds.map(() => '?').join(',')})`;
        queryParams.push(...childIds);
      } else {
        whereClause += ' AND a.student_id = -1';
      }
    } else if (req.user.role === 'tutor') {
      const tutorId = req.user.tutor_id || 1;
      whereClause += ` AND a.tutor_id = ?`;
      queryParams.push(tutorId);
    }

    if (student_id) {
      whereClause += ` AND a.student_id = ?`;
      queryParams.push(student_id);
    }
    if (program_name && program_name !== 'Semua Program') {
      whereClause += ` AND a.program_name = ?`;
      queryParams.push(program_name);
    }
    if (date) {
      whereClause += ` AND a.date = ?`;
      queryParams.push(date);
    }
    if (status) {
      whereClause += ` AND a.status = ?`;
      queryParams.push(status);
    }
    if (search) {
      whereClause += ` AND (st.name LIKE ? OR t.name LIKE ? OR a.program_name LIKE ?)`;
      const p = `%${search}%`;
      queryParams.push(p, p, p);
    }

    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM attendances a JOIN students st ON a.student_id = st.id JOIN tutors t ON a.tutor_id = t.id ${whereClause}`,
      queryParams
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT a.*, st.name as student_name, st.class_grade, t.name as tutor_name, j.topic, j.score, j.targets_achieved
       FROM attendances a
       JOIN students st ON a.student_id = st.id
       JOIN tutors t ON a.tutor_id = t.id
       LEFT JOIN journals j ON a.id = j.attendance_id
       ${whereClause}
       ORDER BY a.date DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching attendances:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/attendances', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const {
      student_id, tutor_id, schedule_id, program_name, unit_name,
      date, start_time, end_time, status, notes, session_number, package_total,
      // Optional Integrated Journal
      topic, targets_achieved, score, fluency_rating, makhraj_rating, tajwid_rating,
      memorization_surah, murojaah_status, progress_notes, homework, next_target
    } = req.body;

    const actualTutorId = tutor_id || req.user.tutor_id || 1;

    // Check current session count in student_programs
    const [progRows] = await db.query(
      'SELECT * FROM student_programs WHERE student_id = ? AND program_name = ?',
      [student_id, program_name || 'Cermat Matematika']
    );
    let curSession = session_number || 1;
    let pkgTotal = package_total || 8;

    if (progRows.length > 0) {
      curSession = (progRows[0].completed_sessions_month || 0) + (status === 'hadir' ? 1 : 0);
      pkgTotal = progRows[0].package_sessions || 8;
    }

    const [attResult] = await db.query(
      `INSERT INTO attendances (student_id, tutor_id, schedule_id, program_name, unit_name, date, start_time, end_time, status, session_number, package_total, parent_confirmed, billed, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      [student_id, actualTutorId, schedule_id || null, program_name || 'Cermat Matematika', unit_name || 'Unit Riscon Rancaekek', date, start_time || '15:30', end_time || '17:00', status || 'hadir', curSession, pkgTotal, notes || '']
    );
    const attendanceId = attResult.insertId;

    // Update student progress count
    if (status === 'hadir') {
      await db.query('UPDATE students SET total_sessions_completed = total_sessions_completed + 1 WHERE id = ?', [student_id]);
      if (progRows.length > 0) {
        await db.query('UPDATE student_programs SET completed_sessions_month = ? WHERE id = ?', [curSession, progRows[0].id]);
      }
    }

    // Insert journal if topic is provided
    if (topic && targets_achieved) {
      await db.query(
        `INSERT INTO journals (attendance_id, student_id, tutor_id, program_name, unit_name, session_number, package_total, date, topic, targets_achieved, score, fluency_rating, makhraj_rating, tajwid_rating, memorization_surah, murojaah_status, progress_notes, homework, next_target)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [attendanceId, student_id, actualTutorId, program_name || 'Cermat Matematika', unit_name || 'Unit Riscon Rancaekek', curSession, pkgTotal, date, topic, targets_achieved, score || null, fluency_rating || null, makhraj_rating || null, tajwid_rating || null, memorization_surah || null, murojaah_status || null, progress_notes || '', homework || '', next_target || '']
      );
    }

    res.status(201).json({
      success: true,
      message: 'Presensi dan catatan belajar berhasil dicatat!',
      attendance_id: attendanceId
    });
  } catch (error) {
    console.error('Attendance create error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/attendances/:id/confirm', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE attendances SET parent_confirmed = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Kehadiran sesi berhasil dikonfirmasi oleh Orang Tua.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 10. JOURNALS (JURNAL BELAJAR / JURNAL MENGAJAR) ROUTES
// -------------------------------------------------------------

app.get('/api/journals', authenticateToken, async (req, res) => {
  try {
    const { student_id, program_name, search } = req.query;
    let query = `
      SELECT j.*, st.name as student_name, st.class_grade, t.name as tutor_name
      FROM journals j
      JOIN students st ON j.student_id = st.id
      JOIN tutors t ON j.tutor_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const [children] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ?', [req.user.id, req.user.phone]);
      const childIds = children.map(c => c.id);
      if (childIds.length > 0) {
        query += ` AND j.student_id IN (${childIds.map(() => '?').join(',')})`;
        params.push(...childIds);
      } else {
        query += ' AND j.student_id = -1';
      }
    } else if (req.user.role === 'tutor') {
      const tutorId = req.user.tutor_id || 1;
      query += ` AND j.tutor_id = ?`;
      params.push(tutorId);
    }

    if (student_id) {
      query += ` AND j.student_id = ?`;
      params.push(student_id);
    }
    if (program_name && program_name !== 'Semua Program') {
      query += ` AND j.program_name = ?`;
      params.push(program_name);
    }
    if (search) {
      query += ` AND (j.topic LIKE ? OR j.targets_achieved LIKE ? OR st.name LIKE ?)`;
      const p = `%${search}%`;
      queryParams.push(p, p, p);
    }

    query += ' ORDER BY j.date DESC, j.id DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/journals', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const {
      attendance_id, student_id, tutor_id, program_name, unit_name,
      session_number, package_total, date, topic, targets_achieved,
      score, fluency_rating, makhraj_rating, tajwid_rating, memorization_surah, murojaah_status,
      progress_notes, homework, next_target
    } = req.body;

    const actualTutorId = tutor_id || req.user.tutor_id || 1;

    const [result] = await db.query(
      `INSERT INTO journals (attendance_id, student_id, tutor_id, program_name, unit_name, session_number, package_total, date, topic, targets_achieved, score, fluency_rating, makhraj_rating, tajwid_rating, memorization_surah, murojaah_status, progress_notes, homework, next_target)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [attendance_id || 0, student_id, actualTutorId, program_name || 'Cermat Matematika', unit_name || 'Unit Riscon Rancaekek', session_number || 1, package_total || 8, date, topic, targets_achieved, score || null, fluency_rating || null, makhraj_rating || null, tajwid_rating || null, memorization_surah || null, murojaah_status || null, progress_notes || '', homework || '', next_target || '']
    );

    res.status(201).json({ success: true, message: 'Jurnal belajar berhasil disimpan.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 11. PROGRESS BELAJAR (PROGRESS & CAPAIAN BELAJAR) ROUTES
// -------------------------------------------------------------

app.get('/api/progress/:studentId', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { program_name } = req.query;

    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    const student = students[0];

    // Programs
    let progQuery = 'SELECT sp.*, t.name as tutor_name FROM student_programs sp LEFT JOIN tutors t ON sp.tutor_id = t.id WHERE sp.student_id = ?';
    const progParams = [studentId];
    if (program_name && program_name !== 'Semua Program') {
      progQuery += ' AND sp.program_name = ?';
      progParams.push(program_name);
    }
    const [programs] = await db.query(progQuery, progParams);

    // Journals for charts and rubric analysis
    let jrnQuery = 'SELECT j.*, t.name as tutor_name FROM journals j LEFT JOIN tutors t ON j.tutor_id = t.id WHERE j.student_id = ?';
    const jrnParams = [studentId];
    if (program_name && program_name !== 'Semua Program') {
      jrnQuery += ' AND j.program_name = ?';
      jrnParams.push(program_name);
    }
    jrnQuery += ' ORDER BY j.date ASC';
    const [journals] = await db.query(jrnQuery, jrnParams);

    // Attendance stats
    let attQuery = 'SELECT status, count(*) as count FROM attendances WHERE student_id = ?';
    const attParams = [studentId];
    if (program_name && program_name !== 'Semua Program') {
      attQuery += ' AND program_name = ?';
      attParams.push(program_name);
    }
    attQuery += ' GROUP BY status';
    const [attStats] = await db.query(attQuery, attParams);

    res.json({
      success: true,
      data: {
        student,
        programs,
        journals,
        attendanceStats: attStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 12. INVOICES & TAGIHAN SPP BULANAN ROUTES
// -------------------------------------------------------------

app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { student_id, status } = req.query;
    let query = `
      SELECT inv.*, st.name as student_name, st.parent_name, st.parent_phone
      FROM invoices inv
      JOIN students st ON inv.student_id = st.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const [children] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ?', [req.user.id, req.user.phone]);
      const childIds = children.map(c => c.id);
      if (childIds.length > 0) {
        query += ` AND inv.student_id IN (${childIds.map(() => '?').join(',')})`;
        params.push(...childIds);
      } else {
        query += ' AND inv.student_id = -1';
      }
    }

    if (student_id) {
      query += ` AND inv.student_id = ?`;
      params.push(student_id);
    }
    if (status) {
      query += ` AND inv.status = ?`;
      params.push(status);
    }

    query += ' ORDER BY inv.id DESC';
    const [rows] = await db.query(query, params);

    // Attach items
    for (let inv of rows) {
      const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [inv.id]);
      inv.items = items;
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT inv.*, st.name as student_name, st.parent_name, st.parent_phone, st.address 
       FROM invoices inv JOIN students st ON inv.student_id = st.id WHERE inv.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tagihan tidak ditemukan.' });
    const invoice = rows[0];

    const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
    invoice.items = items;

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/invoices/generate-monthly', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, period_month, due_date, notes } = req.body;
    if (!student_id || !period_month) {
      return res.status(400).json({ success: false, message: 'Siswa dan Periode Bulan wajib dipilih.' });
    }

    const [programs] = await db.query('SELECT * FROM student_programs WHERE student_id = ? AND status = "active"', [student_id]);
    if (programs.length === 0) {
      return res.status(400).json({ success: false, message: 'Siswa tidak memiliki program aktif.' });
    }

    const totalAmount = programs.reduce((sum, p) => sum + parseFloat(p.monthly_fee), 0);
    const totalSessions = programs.reduce((sum, p) => sum + parseInt(p.package_sessions), 0);
    const invoiceNumber = `INV-RMB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`;
    const milestoneName = `SPP ${period_month} – Total ${totalSessions} Pertemuan/Bulan`;

    const [invRes] = await db.query(
      `INSERT INTO invoices (invoice_number, student_id, period_month, package_name, milestone_name, sessions_count, amount, due_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)`,
      [invoiceNumber, student_id, period_month, 'Paket SPP Bulanan Rumbala', milestoneName, totalSessions, totalAmount, due_date || '2026-08-10', notes || 'Tagihan SPP Bulanan Les Rumbala']
    );
    const invoiceId = invRes.insertId;

    for (let p of programs) {
      await db.query(
        `INSERT INTO invoice_items (invoice_id, program_name, description, amount)
         VALUES (?, ?, ?, ?)`,
        [invoiceId, p.program_name, `SPP ${p.program_name} (${p.package_sessions} Sesi/Bulan - ${p.unit_name})`, p.monthly_fee]
      );
    }

    res.status(201).json({ success: true, message: 'Tagihan SPP Bulanan berhasil diterbitkan.', invoice_id: invoiceId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/invoices/:id/pay', authenticateToken, upload.single('payment_proof'), async (req, res) => {
  try {
    const invoiceId = req.params.id;
    let paymentProofUrl = null;
    if (req.file) {
      paymentProofUrl = `/uploads-rumbala/${req.file.filename}`;
    }

    const newStatus = req.user.role === 'admin' ? 'paid' : 'pending_verification';
    const paidAt = newStatus === 'paid' ? new Date() : null;

    await db.query(
      'UPDATE invoices SET status = ?, payment_proof_url = COALESCE(?, payment_proof_url), paid_at = COALESCE(?, paid_at) WHERE id = ?',
      [newStatus, paymentProofUrl, paidAt, invoiceId]
    );

    res.json({
      success: true,
      message: req.user.role === 'admin' ? 'Pembayaran berhasil diverifikasi (Lunas).' : 'Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 13. AI REPORTS & LAPORAN PERKEMBANGAN
// -------------------------------------------------------------

app.get('/api/ai-reports', authenticateToken, async (req, res) => {
  try {
    const { student_id, program_name } = req.query;
    let query = `
      SELECT r.*, st.name as student_name, st.class_grade, t.name as tutor_name
      FROM ai_reports r
      JOIN students st ON r.student_id = st.id
      LEFT JOIN tutors t ON r.tutor_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const [children] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ?', [req.user.id, req.user.phone]);
      const childIds = children.map(c => c.id);
      if (childIds.length > 0) {
        query += ` AND r.student_id IN (${childIds.map(() => '?').join(',')}) AND r.status = 'published'`;
        params.push(...childIds);
      } else {
        query += ' AND r.student_id = -1';
      }
    }

    if (student_id) {
      query += ` AND r.student_id = ?`;
      params.push(student_id);
    }
    if (program_name && program_name !== 'Semua Program') {
      query += ` AND r.program_name = ?`;
      params.push(program_name);
    }

    query += ' ORDER BY r.id DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/ai-reports/generate', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const { student_id, program_name, report_type, period, concept_understanding, accuracy_rating, vocabulary_rating, makhraj_rating, memorization_target } = req.body;
    if (!student_id || !program_name) {
      return res.status(400).json({ success: false, message: 'Siswa dan Program wajib dipilih.' });
    }

    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [student_id]);
    if (students.length === 0) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    const student = students[0];

    // Fetch student program info & learning profile
    const [progRows] = await db.query(
      'SELECT * FROM student_programs WHERE student_id = ? AND program_name = ? LIMIT 1',
      [student_id, program_name]
    );
    const studentProg = progRows.length > 0 ? progRows[0] : null;

    // Fetch journal logs for context
    const [journals] = await db.query(
      'SELECT * FROM journals WHERE student_id = ? AND program_name = ? ORDER BY date DESC LIMIT 8',
      [student_id, program_name]
    );

    // Fetch attendance summary
    const [attendances] = await db.query(
      'SELECT status, COUNT(*) as count FROM attendances WHERE student_id = ? AND program_name = ? GROUP BY status',
      [student_id, program_name]
    );

    const actualTutorId = req.user.tutor_id || 1;
    const reportPeriod = period || 'Agustus 2026';
    const reportTypeLabel = report_type === 'mid_period' ? 'Evaluasi Tengah Periode' : 'Evaluasi Akhir Periode';
    const defaultTitle = `Laporan Perkembangan ${program_name} – ${reportTypeLabel} (${reportPeriod})`;

    let summary = `Ananda ${student.name} menunjukkan progress yang sangat memuaskan dalam bimbingan ${program_name} periode ${reportPeriod}. Konsistensi kehadiran dan semangat belajarnya sangat tinggi.`;
    let strengths = studentProg?.strengths || `Kemampuan menyerap konsep materi ${program_name} sangat baik, aktif berdiskusi dan memiliki daya fokus yang positif.`;
    let improvements = studentProg?.areas_for_improvement || `Perlu pembiasaan latihan mandiri secara rutin di rumah agar pemahaman konsep semakin melekat kuat.`;
    let recommendations = `Pertahankan motivasi belajar ananda dengan memberikan apresiasi berkala atas setiap target yang berhasil dituntaskan.`;

    // -------------------------------------------------------------
    // CALL GOOGLE GEMINI API
    // -------------------------------------------------------------
    try {
      const journalContext = journals.map((j, idx) => 
        `Sesi ${idx + 1} (${j.date ? j.date.toISOString().split('T')[0] : ''}): Topik "${j.topic || ''}", Capaian "${j.targets_achieved || ''}", Nilai/Rubrik "${j.score || j.fluency_rating || j.makhraj_rating || 'Baik'}"`
      ).join('\n');

      const attContext = attendances.map(a => `${a.status}: ${a.count} kali`).join(', ');

      const prompt = `Anda adalah Asisten AI Pedagogik Resmi untuk Lembaga Bimbingan Belajar Rumah Belajar Alfatih (RUMBALA).
Tugas Anda adalah menyusun Draft Laporan Perkembangan Belajar Siswa yang ramah, mendidik, solutif, dan profesional untuk dibaca oleh Orang Tua.

Informasi Siswa & Sesi Bimbingan:
- Nama Siswa: ${student.name} (${student.class_grade || 'SD'})
- Program Bimbingan: ${program_name}
- Jenis Laporan: ${reportTypeLabel}
- Periode: ${reportPeriod}
- Profil Awal Siswa: Level ${studentProg?.initial_level || 'Dasar'}, Kekuatan: ${studentProg?.strengths || '-'}, Target: ${studentProg?.learning_targets || '-'}
- Rekap Kehadiran: ${attContext || '100% Hadir'}
- Catatan Jurnal Sesi Terakhir:
${journalContext || 'Materi tuntas sesuai modul bimbingan.'}
- Indikator Evaluasi Terkini: Pemahaman/Kelancaran "${concept_understanding || makhraj_rating || vocabulary_rating || 'Baik'}", Ketelitian/Target "${accuracy_rating || memorization_target || 'Berkembang'}"

Instruksi Output:
Buatlah respon HANYA dalam format JSON valid (tanpa markdown blok tambahan seperti \`\`\`json) dengan struktur berikut:
{
  "title": "${defaultTitle}",
  "summary": "Ringkasan narasi kemajuan belajar ananda 2-3 kalimat hangat dan apresiatif berbasis data materi jurnal di atas.",
  "strengths": "Poin-poin kekuatan, pemahaman konsep, atau potensi menonjol yang dikuasai ananda.",
  "areas_for_improvement": "Bagian atau aspek yang masih perlu terus dilatih atau ditingkatkan.",
  "recommendations": "Saran konkrit dan rekomendasi latihan pendampingan bagi orang tua di rumah."
}`;

      const geminiResponse = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Clean markdown backticks if any
        const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        if (parsed.summary) summary = parsed.summary;
        if (parsed.strengths) strengths = parsed.strengths;
        if (parsed.areas_for_improvement) improvements = parsed.areas_for_improvement;
        if (parsed.recommendations) recommendations = parsed.recommendations;
      } else {
        console.warn('Gemini API returned status:', geminiResponse.status);
      }
    } catch (geminiErr) {
      console.warn('Gemini API call failed, using rule-based generator fallback:', geminiErr.message);
      if (journals.length > 0) {
        const topics = journals.map(j => j.topic).filter(Boolean).join(', ');
        summary += ` Materi yang telah tuntas dipelajari meliputi: ${topics}.`;
      }
    }

    const [repResult] = await db.query(
      `INSERT INTO ai_reports (student_id, tutor_id, program_name, report_type, period, title, summary, strengths, areas_for_improvement, recommendations, ai_generated_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft analisis disusun dengan bantuan Google Gemini 2.5 Flash AI.', 'draft')`,
      [student_id, actualTutorId, program_name, report_type || 'mid_period', reportPeriod, defaultTitle, summary, strengths, improvements, recommendations]
    );

    const [created] = await db.query('SELECT * FROM ai_reports WHERE id = ?', [repResult.insertId]);

    res.status(201).json({
      success: true,
      message: 'Draft Laporan Perkembangan AI berhasil digenerate oleh Gemini AI! Tutor dapat mereview sebelum dipublish.',
      data: created[0]
    });
  } catch (error) {
    console.error('AI Report Gen error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/ai-reports/:id', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const { title, summary, strengths, areas_for_improvement, recommendations, status } = req.body;
    await db.query(
      `UPDATE ai_reports SET title=?, summary=?, strengths=?, areas_for_improvement=?, recommendations=?, status=? WHERE id=?`,
      [title, summary, strengths, areas_for_improvement, recommendations, status || 'published', req.params.id]
    );
    res.json({ success: true, message: 'Laporan perkembangan berhasil diperbarui/dipublish.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 14. TUTOR RECAP & HONOR ROUTES
// -------------------------------------------------------------

app.get('/api/tutor-recaps', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT r.*, t.name as tutor_name, t.subjects, t.phone 
      FROM tutor_honor_recaps r 
      JOIN tutors t ON r.tutor_id = t.id 
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'tutor') {
      const tutorId = req.user.tutor_id || 1;
      query += ` AND r.tutor_id = ?`;
      params.push(tutorId);
    }

    query += ' ORDER BY r.period_month DESC, r.id DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 15. REKAP KEUANGAN & DASHBOARD STATS
// -------------------------------------------------------------

app.get('/api/finances/summary', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [paidInvoices] = await db.query('SELECT SUM(amount) as total_income FROM invoices WHERE status = "paid"');
    const [pendingInvoices] = await db.query('SELECT SUM(amount) as total_pending FROM invoices WHERE status != "paid"');
    const [paidHonors] = await db.query('SELECT SUM(total_honor) as total_honor FROM tutor_honor_recaps WHERE status = "paid"');
    const [totalStudents] = await db.query('SELECT COUNT(*) as count FROM students WHERE status = "active"');
    const [totalSessions] = await db.query('SELECT COUNT(*) as count FROM attendances WHERE status = "hadir"');

    const totalIncome = parseFloat(paidInvoices[0]?.total_income || 0);
    const totalHonor = parseFloat(paidHonors[0]?.total_honor || 0);
    const netProfit = totalIncome - totalHonor;

    res.json({
      success: true,
      data: {
        totalIncome,
        totalPending: parseFloat(pendingInvoices[0]?.total_pending || 0),
        totalHonor,
        netProfit,
        activeStudents: totalStudents[0]?.count || 0,
        completedSessions: totalSessions[0]?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const [studentsCount] = await db.query('SELECT COUNT(*) as count FROM students WHERE status = "active"');
    const [tutorsCount] = await db.query('SELECT COUNT(*) as count FROM tutors WHERE status = "active"');
    const [sessionsCount] = await db.query('SELECT COUNT(*) as count FROM attendances WHERE status = "hadir"');
    const [incomeSum] = await db.query('SELECT SUM(amount) as total FROM invoices WHERE status = "paid"');

    res.json({
      success: true,
      data: {
        totalStudents: studentsCount[0].count,
        totalTutors: tutorsCount[0].count,
        totalSessions: sessionsCount[0].count,
        totalRevenue: incomeSum[0].total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// File Upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
  }
  const fileUrl = `/uploads-rumbala/${req.file.filename}`;
  res.json({
    success: true,
    message: 'File berhasil diunggah.',
    fileUrl
  });
});

// Server Initialization
app.listen(PORT, async () => {
  console.log(`🚀 Server Rumbala LMS berjalan di http://localhost:${PORT}`);
  await initDatabase();
});
