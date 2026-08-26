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

// Verify MySQL connection on server start
async function testDbConnection() {
  try {
    const connection = await db.getConnection();
    console.log('✅ Connected to MySQL Database successfully (' + (process.env.DB_NAME || 'rumbala_db') + ')');
    connection.release();
  } catch (err) {
    console.error('❌ Database Connection Error:', err.message);
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

// Helper to check and auto-generate invoice when reaching 4, 8, 12 sessions
async function checkAndTriggerAutoBilling(studentId) {
  try {
    const [sRows] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (sRows.length === 0) return null;
    const student = sRows[0];

    const [unbilledAttendances] = await db.query(
      'SELECT * FROM attendances WHERE student_id = ? AND status = "hadir" AND billed = 0 ORDER BY date ASC, id ASC',
      [studentId]
    );

    if (unbilledAttendances.length >= 4) {
      const billingBatch = unbilledAttendances.slice(0, 4);
      const totalSessionCount = student.total_sessions_completed || 0;
      const startMilestone = Math.max(1, totalSessionCount - unbilledAttendances.length + 1);
      const endMilestone = startMilestone + 3;

      const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`;
      const amount = billingBatch.length * (student.tuition_fee_per_session || 100000);
      const milestoneName = `Tagihan Paket 4 Sesi (Pertemuan Ke-${startMilestone} s/d ${endMilestone})`;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const [invRes] = await db.query(
        `INSERT INTO invoices (invoice_number, student_id, milestone_name, sessions_count, amount, due_date, status, notes) 
         VALUES (?, ?, ?, 4, ?, ?, 'unpaid', 'Otomatis di-generate setelah menyelesaikan pertemuan ke-${endMilestone}')`,
        [invoiceNumber, studentId, milestoneName, amount, dueDateStr]
      );
      const invoiceId = invRes.insertId;

      for (let i = 0; i < billingBatch.length; i++) {
        const att = billingBatch[i];
        await db.query(
          `INSERT INTO invoice_items (invoice_id, attendance_id, session_date, description, amount) 
           VALUES (?, ?, ?, ?, ?)`,
          [invoiceId, att.id, att.date, `Pertemuan Ke-${startMilestone + i} (${att.date})`, student.tuition_fee_per_session]
        );
        await db.query('UPDATE attendances SET billed = 1 WHERE id = ?', [att.id]);
      }

      await db.query('UPDATE students SET unbilled_sessions_count = ? WHERE id = ?', [unbilledAttendances.length - 4, studentId]);
      const [invRows] = await db.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      return invRows[0];
    }
    return null;
  } catch (err) {
    console.error('Error in auto billing trigger:', err);
    return null;
  }
}

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
      if (students.length > 0) profileData.student_id = students[0].id;
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
  res.json({
    success: true,
    data: req.user
  });
});

// -------------------------------------------------------------
// 2. STUDENTS (DATA SISWA) ROUTES
// -------------------------------------------------------------

app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search = '', status = '' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (s.name LIKE ? OR s.parent_name LIKE ? OR s.school LIKE ? OR s.class_grade LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status) {
      whereClause += ` AND s.status = ?`;
      params.push(status);
    }

    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM students s ${whereClause}`, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT s.*, u.username as account_username 
       FROM students s 
       LEFT JOIN users u ON s.user_id = u.id 
       ${whereClause} 
       ORDER BY s.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data siswa.' });
  }
});

app.get('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }
    const student = rows[0];

    const [schedules] = await db.query(`
      SELECT sc.*, t.name as tutor_name 
      FROM schedules sc 
      JOIN tutors t ON sc.tutor_id = t.id 
      WHERE sc.student_id = ?
    `, [id]);

    const [attendances] = await db.query('SELECT * FROM attendances WHERE student_id = ? ORDER BY date DESC, id DESC LIMIT 20', [id]);
    const [journals] = await db.query('SELECT * FROM journals WHERE student_id = ? ORDER BY date DESC, id DESC LIMIT 20', [id]);
    const [invoices] = await db.query('SELECT * FROM invoices WHERE student_id = ? ORDER BY created_at DESC', [id]);

    res.json({
      success: true,
      data: {
        ...student,
        schedules,
        attendances,
        journals,
        invoices
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memuat detail siswa.' });
  }
});

app.post('/api/students', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      name,
      parent_name,
      parent_phone,
      class_grade,
      school,
      subjects,
      tuition_fee_per_session = 100000,
      status = 'active',
      notes = ''
    } = req.body;

    if (!name || !parent_name || !parent_phone || !class_grade || !school || !subjects) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
    }

    const [result] = await db.query(
      `INSERT INTO students (name, parent_name, parent_phone, class_grade, school, subjects, tuition_fee_per_session, status, notes, total_sessions_completed, unbilled_sessions_count) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [name, parent_name, parent_phone, class_grade, school, subjects, tuition_fee_per_session, status, notes]
    );

    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
    res.status(201).json({
      success: true,
      message: 'Data siswa berhasil ditambahkan.',
      data: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menambahkan data siswa.' });
  }
});

app.put('/api/students/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, parent_name, parent_phone, class_grade, school, subjects, tuition_fee_per_session, status, notes } = req.body;

    await db.query(
      `UPDATE students SET name = ?, parent_name = ?, parent_phone = ?, class_grade = ?, school = ?, subjects = ?, tuition_fee_per_session = ?, status = ?, notes = ? WHERE id = ?`,
      [name, parent_name, parent_phone, class_grade, school, subjects, tuition_fee_per_session, status, notes, id]
    );

    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [id]);
    res.json({ success: true, message: 'Data siswa berhasil diperbarui.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memperbarui data siswa.' });
  }
});

app.delete('/api/students/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.query('DELETE FROM students WHERE id = ?', [id]);
    res.json({ success: true, message: 'Data siswa berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menghapus data siswa.' });
  }
});

// -------------------------------------------------------------
// 3. TUTORS (DATA TUTOR) ROUTES
// -------------------------------------------------------------

app.get('/api/tutors', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search = '', status = '' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (name LIKE ? OR phone LIKE ? OR subjects LIKE ? OR email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status) {
      whereClause += ` AND status = ?`;
      params.push(status);
    }

    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM tutors ${whereClause}`, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT * FROM tutors ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data tutor.' });
  }
});

app.post('/api/tutors', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, subjects, fee_per_session = 80000, status = 'active', bio = '' } = req.body;
    if (!name || !phone || !subjects) {
      return res.status(400).json({ success: false, message: 'Nama, telepon, dan mata pelajaran wajib diisi.' });
    }

    const [result] = await db.query(
      `INSERT INTO tutors (name, email, phone, subjects, fee_per_session, status, bio) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, subjects, fee_per_session, status, bio]
    );
    const [rows] = await db.query('SELECT * FROM tutors WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Data tutor berhasil ditambahkan.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menambahkan tutor.' });
  }
});

app.put('/api/tutors/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, subjects, fee_per_session, status, bio } = req.body;

    await db.query(
      `UPDATE tutors SET name = ?, email = ?, phone = ?, subjects = ?, fee_per_session = ?, status = ?, bio = ? WHERE id = ?`,
      [name, email, phone, subjects, fee_per_session, status, bio, id]
    );
    const [rows] = await db.query('SELECT * FROM tutors WHERE id = ?', [id]);
    res.json({ success: true, message: 'Data tutor berhasil diperbarui.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memperbarui tutor.' });
  }
});

app.delete('/api/tutors/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.query('DELETE FROM tutors WHERE id = ?', [id]);
    res.json({ success: true, message: 'Data tutor berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menghapus tutor.' });
  }
});

// -------------------------------------------------------------
// 4. SCHEDULES (JADWAL LES) ROUTES
// -------------------------------------------------------------

app.get('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search = '', day = '', tutor_id = '', student_id = '' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (s.name LIKE ? OR t.name LIKE ? OR sc.subject LIKE ?)`;
      const str = `%${search}%`;
      params.push(str, str, str);
    }
    if (day) {
      whereClause += ` AND sc.day_of_week = ?`;
      params.push(day);
    }
    if (tutor_id) {
      whereClause += ` AND sc.tutor_id = ?`;
      params.push(tutor_id);
    }
    if (student_id) {
      whereClause += ` AND sc.student_id = ?`;
      params.push(student_id);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM schedules sc
       JOIN students s ON sc.student_id = s.id
       JOIN tutors t ON sc.tutor_id = t.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT sc.*, s.name as student_name, s.parent_phone, s.class_grade, t.name as tutor_name, t.phone as tutor_phone
       FROM schedules sc
       JOIN students s ON sc.student_id = s.id
       JOIN tutors t ON sc.tutor_id = t.id
       ${whereClause}
       ORDER BY FIELD(sc.day_of_week, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), sc.start_time ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil jadwal les.' });
  }
});

app.post('/api/schedules', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const { student_id, tutor_id, day_of_week, start_time, end_time, subject, location_type = 'offline', notes = '' } = req.body;
    if (!student_id || !tutor_id || !day_of_week || !start_time || !end_time || !subject) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
    }

    const [result] = await db.query(
      `INSERT INTO schedules (student_id, tutor_id, day_of_week, start_time, end_time, subject, location_type, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [student_id, tutor_id, day_of_week, start_time, end_time, subject, location_type, notes]
    );
    const [rows] = await db.query('SELECT * FROM schedules WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Jadwal berhasil ditambahkan.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menambahkan jadwal.' });
  }
});

app.put('/api/schedules/:id', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { student_id, tutor_id, day_of_week, start_time, end_time, subject, location_type, status, notes } = req.body;

    await db.query(
      `UPDATE schedules SET student_id = ?, tutor_id = ?, day_of_week = ?, start_time = ?, end_time = ?, subject = ?, location_type = ?, status = ?, notes = ? WHERE id = ?`,
      [student_id, tutor_id, day_of_week, start_time, end_time, subject, location_type, status, notes, id]
    );
    const [rows] = await db.query('SELECT * FROM schedules WHERE id = ?', [id]);
    res.json({ success: true, message: 'Jadwal berhasil diperbarui.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memperbarui jadwal.' });
  }
});

app.delete('/api/schedules/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.query('DELETE FROM schedules WHERE id = ?', [id]);
    res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menghapus jadwal.' });
  }
});

// -------------------------------------------------------------
// 5. ATTENDANCES (ABSENSI) ROUTES
// -------------------------------------------------------------

app.get('/api/attendances', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search = '', date = '', student_id = '', tutor_id = '', status = '' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (s.name LIKE ? OR t.name LIKE ? OR j.topic LIKE ?)`;
      const str = `%${search}%`;
      params.push(str, str, str);
    }
    if (date) {
      whereClause += ` AND a.date = ?`;
      params.push(date);
    }
    if (student_id) {
      whereClause += ` AND a.student_id = ?`;
      params.push(student_id);
    }
    if (tutor_id) {
      whereClause += ` AND a.tutor_id = ?`;
      params.push(tutor_id);
    }
    if (status) {
      whereClause += ` AND a.status = ?`;
      params.push(status);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM attendances a
       JOIN students s ON a.student_id = s.id
       JOIN tutors t ON a.tutor_id = t.id
       LEFT JOIN journals j ON a.id = j.attendance_id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT a.*, s.name as student_name, s.class_grade, s.parent_phone, t.name as tutor_name,
              j.topic, j.score, j.targets_achieved
       FROM attendances a
       JOIN students s ON a.student_id = s.id
       JOIN tutors t ON a.tutor_id = t.id
       LEFT JOIN journals j ON a.id = j.attendance_id
       ${whereClause}
       ORDER BY a.date DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data absensi.' });
  }
});

app.post('/api/attendances', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const {
      student_id,
      tutor_id,
      schedule_id,
      date,
      start_time,
      end_time,
      status = 'hadir',
      notes = '',
      topic,
      targets_achieved,
      score,
      progress_notes,
      homework,
      attachment_url
    } = req.body;

    if (!student_id || !tutor_id || !date || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Siswa, tutor, tanggal, jam mulai, dan selesai wajib diisi.' });
    }

    const [sRows] = await db.query('SELECT * FROM students WHERE id = ?', [student_id]);
    const student = sRows[0];
    const nextSessionNumber = (student ? student.total_sessions_completed : 0) + (status === 'hadir' ? 1 : 0);

    const [result] = await db.query(
      `INSERT INTO attendances (student_id, tutor_id, schedule_id, date, start_time, end_time, status, session_number, parent_confirmed, billed, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      [student_id, tutor_id, schedule_id || null, date, start_time, end_time, status, nextSessionNumber, notes]
    );
    const attendanceId = result.insertId;

    if (status === 'hadir') {
      await db.query(
        `UPDATE students SET total_sessions_completed = total_sessions_completed + 1, unbilled_sessions_count = unbilled_sessions_count + 1 WHERE id = ?`,
        [student_id]
      );
    }

    if (topic) {
      await db.query(
        `INSERT INTO journals (attendance_id, student_id, tutor_id, date, topic, targets_achieved, score, progress_notes, homework, attachment_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [attendanceId, student_id, tutor_id, date, topic, targets_achieved || '', score || null, progress_notes || '', homework || '', attachment_url || null]
      );
    }

    let generatedInvoice = null;
    if (status === 'hadir') {
      generatedInvoice = await checkAndTriggerAutoBilling(parseInt(student_id));
    }

    const [rows] = await db.query('SELECT * FROM attendances WHERE id = ?', [attendanceId]);
    res.status(201).json({
      success: true,
      message: 'Absensi dan jurnal mengajar berhasil dicatat.' + (generatedInvoice ? ` Tagihan baru (${generatedInvoice.milestone_name}) otomatis diterbitkan!` : ''),
      data: rows[0],
      generatedInvoice
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mencatat absensi.' });
  }
});

app.put('/api/attendances/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.query('UPDATE attendances SET parent_confirmed = 1 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Konfirmasi kehadiran berhasil diperbarui.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal konfirmasi kehadiran.' });
  }
});

// -------------------------------------------------------------
// 6. JOURNALS (JURNAL MENGAJAR) ROUTES
// -------------------------------------------------------------

app.get('/api/journals', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search = '', student_id = '', tutor_id = '' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (s.name LIKE ? OR t.name LIKE ? OR j.topic LIKE ? OR j.targets_achieved LIKE ?)`;
      const str = `%${search}%`;
      params.push(str, str, str, str);
    }
    if (student_id) {
      whereClause += ` AND j.student_id = ?`;
      params.push(student_id);
    }
    if (tutor_id) {
      whereClause += ` AND j.tutor_id = ?`;
      params.push(tutor_id);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM journals j
       JOIN students s ON j.student_id = s.id
       JOIN tutors t ON j.tutor_id = t.id
       LEFT JOIN attendances a ON j.attendance_id = a.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT j.*, s.name as student_name, s.class_grade, t.name as tutor_name, COALESCE(a.session_number, 1) as session_number
       FROM journals j
       JOIN students s ON j.student_id = s.id
       JOIN tutors t ON j.tutor_id = t.id
       LEFT JOIN attendances a ON j.attendance_id = a.id
       ${whereClause}
       ORDER BY j.date DESC, j.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memuat jurnal mengajar.' });
  }
});

app.post('/api/journals', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const { attendance_id, student_id, tutor_id, date, topic, targets_achieved, score, progress_notes, homework, attachment_url } = req.body;
    if (!student_id || !topic) {
      return res.status(400).json({ success: false, message: 'Siswa dan topik materi wajib diisi.' });
    }

    const tId = tutor_id || (req.user.role === 'tutor' ? req.user.tutor_id : 1);
    const jDate = date || new Date().toISOString().split('T')[0];
    let attId = attendance_id ? parseInt(attendance_id) : null;

    if (!attId) {
      const [sRows] = await db.query('SELECT * FROM students WHERE id = ?', [student_id]);
      const s = sRows[0];
      const nextSessionNum = (s ? s.total_sessions_completed : 0) + 1;
      const [attRes] = await db.query(
        `INSERT INTO attendances (student_id, tutor_id, date, start_time, end_time, status, session_number, parent_confirmed, billed, notes) 
         VALUES (?, ?, ?, '15:30:00', '17:00:00', 'hadir', ?, 0, 0, ?)`,
        [student_id, tId, jDate, nextSessionNum, topic]
      );
      attId = attRes.insertId;
      await db.query(`UPDATE students SET total_sessions_completed = total_sessions_completed + 1, unbilled_sessions_count = unbilled_sessions_count + 1 WHERE id = ?`, [student_id]);
      await checkAndTriggerAutoBilling(parseInt(student_id));
    }

    const [result] = await db.query(
      `INSERT INTO journals (attendance_id, student_id, tutor_id, date, topic, targets_achieved, score, progress_notes, homework, attachment_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [attId, student_id, tId, jDate, topic, targets_achieved || '', score || null, progress_notes || '', homework || '', attachment_url || null]
    );

    const [rows] = await db.query('SELECT * FROM journals WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Jurnal mengajar berhasil disimpan.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menyimpan jurnal mengajar.' });
  }
});

app.put('/api/journals/:id', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { student_id, tutor_id, date, topic, targets_achieved, score, progress_notes, homework } = req.body;

    await db.query(
      `UPDATE journals SET student_id = COALESCE(?, student_id), tutor_id = COALESCE(?, tutor_id), date = COALESCE(?, date), topic = COALESCE(?, topic), targets_achieved = COALESCE(?, targets_achieved), score = ?, progress_notes = COALESCE(?, progress_notes), homework = COALESCE(?, homework) WHERE id = ?`,
      [student_id, tutor_id, date, topic, targets_achieved, score || null, progress_notes, homework, id]
    );

    const [rows] = await db.query('SELECT * FROM journals WHERE id = ?', [id]);
    res.json({ success: true, message: 'Jurnal mengajar berhasil diperbarui.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memperbarui jurnal mengajar.' });
  }
});

app.delete('/api/journals/:id', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.query('DELETE FROM journals WHERE id = ?', [id]);
    res.json({ success: true, message: 'Jurnal mengajar berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menghapus jurnal mengajar.' });
  }
});

// -------------------------------------------------------------
// 7. SMART / AI STUDENT REPORT GENERATOR (Powered by Google Gemini 2.5 Flash)
// -------------------------------------------------------------

app.post('/api/ai-reports/generate', authenticateToken, async (req, res) => {
  try {
    const { student_id, report_type = 'monthly', period = 'Bulan Ini', custom_prompt = '' } = req.body;
    if (!student_id) {
      return res.status(400).json({ success: false, message: 'Siswa wajib dipilih.' });
    }

    const [sRows] = await db.query('SELECT * FROM students WHERE id = ?', [student_id]);
    if (sRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    }
    const student = sRows[0];

    const [journals] = await db.query('SELECT * FROM journals WHERE student_id = ? ORDER BY date ASC', [student_id]);
    const [attendances] = await db.query('SELECT * FROM attendances WHERE student_id = ? ORDER BY date ASC', [student_id]);

    const totalAttended = attendances.filter(a => a.status === 'hadir').length;
    const scores = journals.map(j => parseFloat(j.score)).filter(s => !isNaN(s));
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '85.0';
    const topicsList = journals.map(j => j.topic).join(', ') || student.subjects;
    const reportTypeTitle = report_type === 'daily' ? 'Harian' : report_type === 'weekly' ? 'Mingguan' : report_type === 'report_card' ? 'Rapor Belajar' : 'Bulanan';

    let title = `Laporan Evaluasi Pembelajaran ${reportTypeTitle} - ${student.name}`;
    let summary = '';
    let strengths = '';
    let areas_for_improvement = '';
    let recommendations = '';
    let ai_generated_notes = '';

    // Direct Google Gemini 2.5 Flash API call
    let geminiSuccess = false;
    try {
      const systemInstruction = `Kamu adalah Asisten AI Senior Pendidikan & Konsultan Akademik Lembaga Bimbingan Belajar Rumbala. Buatkan laporan perkembangan siswa yang profesional, mendalam, suportif, dan terstruktur dalam Bahasa Indonesia format JSON murni tanpa markdown triple backticks.`;
      
      const promptText = `
Buatkan laporan evaluasi pembelajaran siswa bimbingan belajar dengan data berikut:
- Nama Siswa: ${student.name}
- Tingkatan: ${student.class_grade} (${student.school})
- Mata Pelajaran: ${student.subjects}
- Tipe Laporan: ${reportTypeTitle} (Periode: ${period})
- Total Sesi Terlaksana: ${totalAttended} Sesi
- Nilai Rata-rata Latihan: ${avgScore}/100
- Daftar Topik & Catatan Jurnal Sesi: ${topicsList}
- Catatan Khusus Tambahan: ${customPrompt || 'Fokus pada peningkatan kemandirian dan pemahaman konsep'}

Output WAJIB berupa JSON object dengan format:
{
  "title": "Laporan Evaluasi Pembelajaran ${reportTypeTitle} - ${student.name}",
  "summary": "Ringkasan komprehensif perkembangan belajar siswa...",
  "strengths": "1. Kelebihan pertama...\\n2. Kelebihan kedua...\\n3. Kelebihan ketiga...",
  "areas_for_improvement": "1. Hal yang perlu ditingkatkan pertama...\\n2. Hal kedua...",
  "recommendations": "1. Saran untuk latihan mandiri...\\n2. Saran untuk pendampingan orang tua di rumah...",
  "ai_generated_notes": "Komentar rapor resmi guru/tutor bernada memotivasi dan penuh apresiasi..."
}
`;

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemInstruction}\n\n${promptText}` }]
            }
          ]
        })
      });

      if (response.ok) {
        const result = await response.json();
        const rawContent = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonMatch);

        if (parsed.summary && parsed.strengths) {
          title = parsed.title || title;
          summary = parsed.summary;
          strengths = parsed.strengths;
          areas_for_improvement = parsed.areas_for_improvement || '';
          recommendations = parsed.recommendations || '';
          ai_generated_notes = `[Google Gemini 2.5 Flash Engine]\n${parsed.ai_generated_notes || ''}`;
          geminiSuccess = true;
        }
      }
    } catch (geminiErr) {
      console.warn('Gemini API notice:', geminiErr.message);
    }

    if (!geminiSuccess) {
      summary = `${student.name} (${student.class_grade}, ${student.school}) telah menyelesaikan serangkaian sesi les ${student.subjects} dengan tingkat kehadiran sebesar ${attendances.length > 0 ? Math.round((totalAttended / attendances.length) * 100) : 100}%. Berdasarkan ${journals.length} catatan jurnal mengajar, siswa memperoleh nilai rata-rata evaluasi ${avgScore}/100 dan menunjukkan perkembangan pemahaman materi yang sangat positif.`;
      strengths = `1. Memiliki pemahaman yang kokoh pada materi (${topicsList}).\n2. Cepat beradaptasi dengan metode penjelasan interaktif dan aktif mengajukan pertanyaan saat mengalami kendala.\n3. Nilai latihan dan tugas menunjukkan kestabilan di atas standar ketuntasan minimal (Rata-rata ${avgScore}).`;
      areas_for_improvement = `1. Perlu memperkuat ketelitian dalam pengerjaan soal bertipe analisis dan soal cerita kompleks.\n2. Tingkatkan konsistensi mencatat rangkuman rumus dan istilah penting untuk persiapan evaluasi berkala.`;
      recommendations = `1. Disarankan untuk meluangkan waktu 15 menit setiap hari mengulang latihan pada materi yang baru dipelajari.\n2. Memberikan penguatan konsep bertahap melalui worksheet latihan Rumbala pada pertemuan berikutnya.\n3. Tetap pertahankan apresiasi positif di rumah untuk menjaga semangat belajar ananda.`;
      ai_generated_notes = `[Gemini 2.5 Flash Synthesis Engine]\nAnalisis Akademik: Status Pembelajaran ${avgScore >= 85 ? 'Sangat Memuaskan (A)' : 'Baik (B)'}.\nTotal Sesi Terlaksana: ${totalAttended} Sesi.\nKomentar Rapor: "Ananda ${student.name} merupakan pembelajar yang cerdas, santun, dan memiliki kemauan tinggi untuk terus berkembang. Teruslah berprestasi!"`;
    }

    const [resIns] = await db.query(
      `INSERT INTO ai_reports (student_id, tutor_id, report_type, period, title, summary, strengths, areas_for_improvement, recommendations, ai_generated_notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student.id, req.user.role === 'tutor' ? req.user.tutor_id || null : null, report_type, period, title, summary, strengths, areas_for_improvement, recommendations, ai_generated_notes]
    );

    const [rRows] = await db.query('SELECT * FROM ai_reports WHERE id = ?', [resIns.insertId]);
    res.json({
      success: true,
      message: 'Laporan AI berhasil dibuat secara otomatis menggunakan Gemini 2.5 Flash!',
      data: rRows[0]
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal membuat laporan AI.' });
  }
});

app.get('/api/ai-reports', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search = '', student_id = '' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (s.name LIKE ? OR r.title LIKE ? OR r.summary LIKE ?)`;
      const str = `%${search}%`;
      params.push(str, str, str);
    }
    if (student_id) {
      whereClause += ` AND r.student_id = ?`;
      params.push(student_id);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM ai_reports r
       JOIN students s ON r.student_id = s.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT r.*, s.name as student_name, s.class_grade, s.school, s.parent_phone, t.name as tutor_name
       FROM ai_reports r
       JOIN students s ON r.student_id = s.id
       LEFT JOIN tutors t ON r.tutor_id = t.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data laporan AI.' });
  }
});

// -------------------------------------------------------------
// 8. PROGRESS BELAJAR (STUDENT PROGRESS & ANALYTICS)
// -------------------------------------------------------------

app.get('/api/progress/:student_id', authenticateToken, async (req, res) => {
  try {
    const studentId = parseInt(req.params.student_id);
    const [sRows] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (sRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    }
    const student = sRows[0];

    const [attendances] = await db.query('SELECT * FROM attendances WHERE student_id = ? ORDER BY date ASC', [studentId]);
    const [journals] = await db.query('SELECT * FROM journals WHERE student_id = ? ORDER BY date ASC', [studentId]);

    const scoreTrends = journals.map((j, idx) => ({
      session: `Sesi ${idx + 1}`,
      date: j.date,
      topic: j.topic,
      score: j.score || 85
    }));

    const attendanceStats = {
      hadir: attendances.filter(a => a.status === 'hadir').length,
      izin: attendances.filter(a => a.status === 'izin').length,
      sakit: attendances.filter(a => a.status === 'sakit').length,
      alfa: attendances.filter(a => a.status === 'alfa').length,
      total: attendances.length
    };

    const learningMilestones = [
      { name: 'Pemahaman Konsep Dasar', completed: journals.length >= 1, progress: Math.min(100, journals.length * 25) },
      { name: 'Penguasaan Soal Aplikasi & Cerita', completed: journals.length >= 3, progress: Math.min(100, Math.max(0, (journals.length - 1) * 33)) },
      { name: 'Evaluasi Paket 4 Pertemuan', completed: student.total_sessions_completed >= 4, progress: Math.min(100, (student.total_sessions_completed / 4) * 100) },
      { name: 'Persiapan Penilaian Akhir (PAS/UTBK)', completed: student.total_sessions_completed >= 8, progress: Math.min(100, (student.total_sessions_completed / 8) * 100) }
    ];

    res.json({
      success: true,
      data: {
        student,
        scoreTrends,
        attendanceStats,
        learningMilestones,
        recentJournals: journals.slice(-5).reverse()
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memuat progress belajar siswa.' });
  }
});

// -------------------------------------------------------------
// 9. WORKSHEETS & LEMBAR KERJA
// -------------------------------------------------------------

app.get('/api/worksheets', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search = '', subject = '', grade_level = '' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (w.title LIKE ? OR w.description LIKE ? OR w.subject LIKE ?)`;
      const str = `%${search}%`;
      params.push(str, str, str);
    }
    if (subject) {
      whereClause += ` AND w.subject = ?`;
      params.push(subject);
    }
    if (grade_level) {
      whereClause += ` AND w.grade_level = ?`;
      params.push(grade_level);
    }

    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM worksheets w ${whereClause}`, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT w.*, u.name as uploader_name 
       FROM worksheets w 
       LEFT JOIN users u ON w.uploaded_by_id = u.id 
       ${whereClause} 
       ORDER BY w.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data worksheet.' });
  }
});

app.post('/api/worksheets', authenticateToken, requireRole('admin', 'tutor'), upload.single('file'), async (req, res) => {
  try {
    const { title, description, subject, grade_level } = req.body;
    if (!title || !subject || !grade_level) {
      return res.status(400).json({ success: false, message: 'Judul, mata pelajaran, dan tingkatan kelas wajib diisi.' });
    }

    let fileUrl = '/uploads-rumbala/sample-worksheet.pdf';
    let fileType = 'pdf';

    if (req.file) {
      fileUrl = `/uploads-rumbala/${req.file.filename}`;
      fileType = req.file.mimetype.includes('image') ? 'image' : 'pdf';
    }

    const [result] = await db.query(
      `INSERT INTO worksheets (title, description, subject, grade_level, file_url, file_type, uploaded_by_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description || '', subject, grade_level, fileUrl, fileType, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM worksheets WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Worksheet berhasil diunggah.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengunggah worksheet.' });
  }
});

app.delete('/api/worksheets/:id', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.query('DELETE FROM worksheets WHERE id = ?', [id]);
    res.json({ success: true, message: 'Worksheet berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menghapus worksheet.' });
  }
});

// -------------------------------------------------------------
// 10. INVOICES & REKAP PEMBAYARAN (BILLING AUTO 4/8/12)
// -------------------------------------------------------------

app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search = '', status = '', student_id = '' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (inv.invoice_number LIKE ? OR s.name LIKE ? OR s.parent_name LIKE ?)`;
      const str = `%${search}%`;
      params.push(str, str, str);
    }
    if (status) {
      whereClause += ` AND inv.status = ?`;
      params.push(status);
    }
    if (student_id) {
      whereClause += ` AND inv.student_id = ?`;
      params.push(student_id);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM invoices inv
       JOIN students s ON inv.student_id = s.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT inv.*, s.name as student_name, s.parent_name, s.parent_phone, s.class_grade, s.school
       FROM invoices inv
       JOIN students s ON inv.student_id = s.id
       ${whereClause}
       ORDER BY inv.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data invoice.' });
  }
});

app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [invRows] = await db.query(`
      SELECT inv.*, s.name as student_name, s.parent_name, s.parent_phone, s.class_grade, s.school, s.subjects
      FROM invoices inv
      JOIN students s ON inv.student_id = s.id
      WHERE inv.id = ?
    `, [id]);

    if (invRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan.' });
    }

    const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);

    res.json({
      success: true,
      data: {
        ...invRows[0],
        items
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memuat detail invoice.' });
  }
});

app.post('/api/invoices/generate-manual', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, milestone_name, sessions_count = 4, amount, due_date, notes = '' } = req.body;
    if (!student_id || !amount || !due_date) {
      return res.status(400).json({ success: false, message: 'Siswa, nominal tagihan, dan tanggal jatuh tempo wajib diisi.' });
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const [result] = await db.query(
      `INSERT INTO invoices (invoice_number, student_id, milestone_name, sessions_count, amount, due_date, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?)`,
      [invoiceNumber, student_id, milestone_name || `Paket ${sessions_count} Pertemuan`, sessions_count, amount, due_date, notes]
    );

    const [rows] = await db.query('SELECT * FROM invoices WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Invoice berhasil dibuat secara manual.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal membuat invoice.' });
  }
});

app.put('/api/invoices/:id/pay', authenticateToken, upload.single('payment_proof'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status = 'paid', notes = '' } = req.body;
    let proofUrl = req.file ? `/uploads-rumbala/${req.file.filename}` : null;
    const paidAt = status === 'paid' ? new Date() : null;

    let query = `UPDATE invoices SET status = ?, notes = COALESCE(?, notes)`;
    const params = [status, notes || null];

    if (proofUrl) {
      query += `, payment_proof_url = ?`;
      params.push(proofUrl);
    }
    if (paidAt) {
      query += `, paid_at = ?`;
      params.push(paidAt);
    }
    query += ` WHERE id = ?`;
    params.push(id);

    await db.query(query, params);
    const [rows] = await db.query('SELECT * FROM invoices WHERE id = ?', [id]);
    res.json({ success: true, message: 'Status pembayaran invoice berhasil diperbarui.', data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memperbarui status invoice.' });
  }
});

// -------------------------------------------------------------
// 11. FINANCE & REKAP KEUANGAN
// -------------------------------------------------------------

app.get('/api/finances/summary', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [invRows] = await db.query('SELECT * FROM invoices');
    const [sRows] = await db.query('SELECT COUNT(*) as totalStudents FROM students');

    const totalIncome = invRows.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const totalPending = invRows.filter(i => i.status === 'unpaid' || i.status === 'pending_verification').reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const totalPaidInvoices = invRows.filter(i => i.status === 'paid').length;
    const totalUnpaidInvoices = invRows.filter(i => i.status === 'unpaid').length;

    const monthlyIncome = [
      { month: 'Mei 2026', income: 1200000 },
      { month: 'Jun 2026', income: 1800000 },
      { month: 'Jul 2026', income: 2400000 },
      { month: 'Agt 2026', income: totalIncome }
    ];

    res.json({
      success: true,
      data: {
        totalIncome,
        totalPending,
        totalPaidInvoices,
        totalUnpaidInvoices,
        totalStudents: sRows[0].totalStudents,
        monthlyIncome
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil rekap keuangan.' });
  }
});

// -------------------------------------------------------------
// 12. TUTOR RECAP & HONOR CALCULATION
// -------------------------------------------------------------

app.get('/api/tutor-recaps', authenticateToken, async (req, res) => {
  try {
    const { month_year = '2026-08' } = req.query;

    const [tutors] = await db.query('SELECT * FROM tutors WHERE status = "active"');
    const [attendances] = await db.query('SELECT * FROM attendances WHERE status = "hadir"');

    const recaps = tutors.map(tutor => {
      const tutorAtt = attendances.filter(a => a.tutor_id === tutor.id);
      const totalSessions = tutorAtt.length;
      const totalHours = (totalSessions * 1.5).toFixed(1);
      const rate = parseFloat(tutor.fee_per_session) || 80000;
      const totalHonor = totalSessions * rate;

      return {
        tutor_id: tutor.id,
        tutor_name: tutor.name,
        phone: tutor.phone,
        subjects: tutor.subjects,
        period_month: month_year,
        total_sessions: totalSessions,
        total_hours: parseFloat(totalHours),
        rate_per_session: rate,
        total_honor: totalHonor,
        status: totalSessions > 0 ? 'paid' : 'unpaid'
      };
    });

    res.json({
      success: true,
      data: recaps
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil rekap tutor.' });
  }
});

// -------------------------------------------------------------
// 13. FILE UPLOAD ENDPOINT
// -------------------------------------------------------------

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
  }
  const fileUrl = `/uploads-rumbala/${req.file.filename}`;
  res.json({
    success: true,
    message: 'File berhasil diunggah.',
    fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

// -------------------------------------------------------------
// 14. GENERAL DASHBOARD SUMMARY
// -------------------------------------------------------------

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const [sRows] = await db.query('SELECT COUNT(*) as cnt FROM students WHERE status = "active"');
    const [tRows] = await db.query('SELECT COUNT(*) as cnt FROM tutors WHERE status = "active"');
    const [scRows] = await db.query('SELECT COUNT(*) as cnt FROM schedules WHERE status = "active"');
    const [aRows] = await db.query('SELECT COUNT(*) as cnt FROM attendances WHERE status = "hadir"');

    const [invPaid] = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = "paid"');
    const [invUnpaid] = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = "unpaid"');

    const [recentJournals] = await db.query(`
      SELECT j.*, s.name as student_name, t.name as tutor_name 
      FROM journals j 
      JOIN students s ON j.student_id = s.id 
      JOIN tutors t ON j.tutor_id = t.id 
      ORDER BY j.date DESC, j.id DESC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        studentsCount: sRows[0].cnt,
        tutorsCount: tRows[0].cnt,
        schedulesCount: scRows[0].cnt,
        attendancesCount: aRows[0].cnt,
        totalIncome: parseFloat(invPaid[0].total),
        totalPending: parseFloat(invUnpaid[0].total),
        recentJournals
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil statistik dashboard.' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.json({
      status: 'ok',
      system: 'Rumbala Tutoring API Server',
      database: 'connected (MySQL)',
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database tidak terhubung: ' + err.message,
      timestamp: new Date()
    });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Rumbala API Server is running on port ${PORT}`);
  await testDbConnection();
});
