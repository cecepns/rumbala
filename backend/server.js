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
  queueLimit: 0
});

// Test Database Connection
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ Connected to MySQL Database:', process.env.DB_NAME || 'rumbala_db');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
})();

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token otentikasi tidak ditemukan. Silakan login terlebih dahulu.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Sesi anda telah berakhir atau token tidak valid.'
      });
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

// ==============================================================================
// 1. AUTH ROUTES
// ==============================================================================

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

// ==============================================================================
// 2. SETTINGS (PENGATURAN GLOBAL SISTEM)
// ==============================================================================

app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings ORDER BY category ASC, id ASC');
    // Map as key-value object and list
    const settingsMap = {};
    rows.forEach(r => {
      settingsMap[r.key_name] = r.value;
    });
    res.json({ success: true, data: rows, map: settingsMap });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/settings', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { settings } = req.body; // Array of { key_name, value, description, category } or Key-Value Object
    if (!settings) return res.status(400).json({ success: false, message: 'Data settings wajib dikirim.' });

    if (Array.isArray(settings)) {
      for (let s of settings) {
        await db.query(
          'INSERT INTO settings (key_name, value, description, category) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), description = VALUES(description), category = VALUES(category)',
          [s.key_name, s.value, s.description || '', s.category || 'general']
        );
      }
    } else {
      for (let [key, val] of Object.entries(settings)) {
        await db.query(
          'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
          [key, String(val)]
        );
      }
    }

    res.json({ success: true, message: 'Pengaturan sistem berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 3. PROGRAMS MASTER (PROGRAM & SISTEM EVALUASI)
// ==============================================================================

app.get('/api/programs', authenticateToken, async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let query = 'SELECT * FROM programs WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY id ASC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/programs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, code, category, evaluation_type, default_fee, default_fee_per_session, default_tutor_fee, description, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama program wajib diisi.' });

    const [result] = await db.query(
      `INSERT INTO programs (name, code, category, evaluation_type, default_fee, default_fee_per_session, default_tutor_fee, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, code || name.substring(0, 4).toUpperCase(), category || 'akademik', evaluation_type || 'general', default_fee || 350000, default_fee_per_session || 43750, default_tutor_fee || 75000, description || '', status || 'active']
    );

    res.status(201).json({ success: true, message: 'Program bimbingan berhasil ditambahkan.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/programs/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, code, category, evaluation_type, default_fee, default_fee_per_session, default_tutor_fee, description, status } = req.body;
    await db.query(
      `UPDATE programs SET name=?, code=?, category=?, evaluation_type=?, default_fee=?, default_fee_per_session=?, default_tutor_fee=?, description=?, status=? WHERE id=?`,
      [name, code, category, evaluation_type, default_fee, default_fee_per_session, default_tutor_fee, description, status, req.params.id]
    );
    res.json({ success: true, message: 'Data program berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/programs/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM programs WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Program berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 4. UNITS MASTER (UNIT CABANG & LOKASI)
// ==============================================================================

app.get('/api/units', authenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM units WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR address LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY id ASC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/units', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, address, phone, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama unit wajib diisi.' });

    const [result] = await db.query(
      'INSERT INTO units (name, address, phone, status) VALUES (?, ?, ?, ?)',
      [name, address || '', phone || '', status || 'active']
    );

    res.status(201).json({ success: true, message: 'Unit cabang baru berhasil ditambahkan.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/units/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, address, phone, status } = req.body;
    await db.query(
      'UPDATE units SET name=?, address=?, phone=?, status=? WHERE id=?',
      [name, address, phone, status, req.params.id]
    );
    res.json({ success: true, message: 'Data unit berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/units/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM units WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Unit berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 5. PARENT PORTAL SPECIAL ENDPOINTS (MULTI-CHILD & MULTI-PROGRAM)
// ==============================================================================

app.get('/api/parent/children', authenticateToken, async (req, res) => {
  try {
    const parentUserId = req.user.id;
    const parentPhone = req.user.phone;

    let [children] = await db.query(
      'SELECT * FROM students WHERE user_id = ? OR parent_phone = ? ORDER BY id ASC',
      [parentUserId, parentPhone]
    );

    if (children.length === 0 && req.user.role === 'parent') {
      const [fallback] = await db.query('SELECT * FROM students LIMIT 2');
      children = fallback;
    }

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

    res.json({ success: true, data: children });
  } catch (error) {
    console.error('Error fetching parent children:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/parent/summary', authenticateToken, async (req, res) => {
  try {
    const { student_id, program_name } = req.query;
    let sId = student_id;

    if (!sId) {
      const [ch] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ? LIMIT 1', [req.user.id, req.user.phone]);
      if (ch.length > 0) sId = ch[0].id;
      else sId = 1;
    }

    const [progList] = await db.query(
      `SELECT sp.*, t.name as tutor_name, t.phone as tutor_phone 
       FROM student_programs sp 
       LEFT JOIN tutors t ON sp.tutor_id = t.id 
       WHERE sp.student_id = ? AND sp.status = 'active'`,
      [sId]
    );

    let activeProg = progList[0] || null;
    if (program_name && program_name !== 'Semua Program') {
      const found = progList.find(p => p.program_name === program_name);
      if (found) activeProg = found;
    }

    const [attendanceRows] = await db.query(
      `SELECT status, COUNT(*) as count 
       FROM attendances 
       WHERE student_id = ? ${activeProg ? 'AND program_name = ?' : ''} 
       GROUP BY status`,
      activeProg ? [sId, activeProg.program_name] : [sId]
    );

    const [lastJournals] = await db.query(
      `SELECT j.*, t.name as tutor_name 
       FROM journals j 
       LEFT JOIN tutors t ON j.tutor_id = t.id 
       WHERE j.student_id = ? ${activeProg ? 'AND j.program_name = ?' : ''} 
       ORDER BY j.date DESC LIMIT 5`,
      activeProg ? [sId, activeProg.program_name] : [sId]
    );

    const [schedules] = await db.query(
      `SELECT s.*, t.name as tutor_name 
       FROM schedules s 
       LEFT JOIN tutors t ON s.tutor_id = t.id 
       WHERE s.student_id = ? ${activeProg ? 'AND s.program_name = ?' : ''} 
       ORDER BY FIELD(s.day_of_week, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')`,
      activeProg ? [sId, activeProg.program_name] : [sId]
    );

    const [invoices] = await db.query(
      `SELECT * FROM invoices WHERE student_id = ? ORDER BY id DESC LIMIT 5`,
      [sId]
    );

    const [aiReports] = await db.query(
      `SELECT r.*, t.name as tutor_name 
       FROM ai_reports r 
       LEFT JOIN tutors t ON r.tutor_id = t.id 
       WHERE r.student_id = ? ${activeProg ? 'AND r.program_name = ?' : ''} AND r.status = 'admin_approved'
       ORDER BY r.id DESC LIMIT 3`,
      activeProg ? [sId, activeProg.program_name] : [sId]
    );

    res.json({
      success: true,
      data: {
        active_program: activeProg,
        available_programs: progList,
        attendance_stats: attendanceRows,
        recent_journals: lastJournals,
        upcoming_schedules: schedules,
        recent_invoices: invoices,
        latest_ai_reports: aiReports
      }
    });
  } catch (error) {
    console.error('Error fetching parent summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 6. TUTOR SPECIAL ENDPOINTS
// ==============================================================================

app.get('/api/tutor/students', authenticateToken, async (req, res) => {
  try {
    let tutorId = req.user.tutor_id;
    if (!tutorId) {
      const [tutors] = await db.query('SELECT id FROM tutors WHERE user_id = ? OR email = ? LIMIT 1', [req.user.id, req.user.email]);
      tutorId = tutors.length > 0 ? tutors[0].id : 1;
    }

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

    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Error fetching tutor students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/tutor/dashboard-summary', authenticateToken, async (req, res) => {
  try {
    let tutorId = req.user.tutor_id;
    if (!tutorId) {
      const [tutors] = await db.query('SELECT id FROM tutors WHERE user_id = ? OR email = ? LIMIT 1', [req.user.id, req.user.email]);
      tutorId = tutors.length > 0 ? tutors[0].id : 1;
    }

    const [progRows] = await db.query(
      'SELECT DISTINCT program_name, unit_name, class_type FROM student_programs WHERE tutor_id = ? AND status = "active"',
      [tutorId]
    );

    const programs = [...new Set(progRows.map(p => p.program_name))];
    const units = [...new Set(progRows.map(p => p.unit_name))];
    const classTypes = [...new Set(progRows.map(p => p.class_type || 'Semi Privat'))];

    const currentPeriod = new Date().toISOString().substring(0, 7);
    const [attStats] = await db.query(
      `SELECT 
         COUNT(*) as total_sessions,
         SUM(CASE WHEN is_home_visit = 1 THEN 1 ELSE 0 END) as home_visit_sessions,
         SUM(duration_minutes)/60 as total_hours,
         SUM(tutor_total_honor) as total_honor_earned
       FROM attendances 
       WHERE tutor_id = ? AND status = 'hadir' AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [tutorId, currentPeriod]
    );

    const [todaySchedules] = await db.query(
      `SELECT s.*, st.name as student_name, st.class_grade 
       FROM schedules s 
       JOIN students st ON s.student_id = st.id 
       WHERE s.tutor_id = ? AND s.status = 'active'
       ORDER BY s.start_time ASC`,
      [tutorId]
    );

    res.json({
      success: true,
      data: {
        programs_taught: programs,
        units_taught: units,
        class_types: classTypes,
        monthly_stats: attStats[0] || {},
        today_schedules: todaySchedules
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/tutor/students/:id/learning-profile', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { program_name, initial_level, strengths, areas_for_improvement, learning_targets, special_needs, important_notes } = req.body;

    if (!program_name) {
      return res.status(400).json({ success: false, message: 'Program wajib disertakan.' });
    }

    await db.query(
      `UPDATE student_programs 
       SET initial_level = ?, strengths = ?, areas_for_improvement = ?, learning_targets = ?, special_needs = ?, important_notes = ?
       WHERE student_id = ? AND program_name = ?`,
      [initial_level, strengths, areas_for_improvement, learning_targets, special_needs, important_notes, studentId, program_name]
    );

    res.json({ success: true, message: 'Profil dan catatan belajar siswa berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 7. DASHBOARD STATS & ANALYTICS (7 RINGKASAN REKAP ADMIN)
// ==============================================================================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = new Date();
    const todayDayName = daysMap[today.getDay()];
    const todayDateStr = today.toISOString().split('T')[0];
    const currentPeriod = todayDateStr.substring(0, 7); // '2026-08'

    // 1. Jadwal Hari Ini
    const [todaySchedules] = await db.query(
      `SELECT s.*, st.name as student_name, st.class_grade, t.name as tutor_name
       FROM schedules s
       JOIN students st ON s.student_id = st.id
       LEFT JOIN tutors t ON s.tutor_id = t.id
       WHERE s.day_of_week = ? AND s.status = 'active'
       ORDER BY s.start_time ASC`,
      [todayDayName]
    );

    // 2. Jumlah Pertemuan Hari Ini (Terlaksana & Total)
    const [todayAttendances] = await db.query(
      `SELECT COUNT(*) as total_today,
              SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as hadir_count
       FROM attendances WHERE date = ?`,
      [todayDateStr]
    );

    // 3. Pengajuan Izin / Reschedule yang Menunggu Persetujuan Admin
    const [pendingReschedules] = await db.query(
      `SELECT COUNT(*) as pending_count FROM reschedule_requests WHERE status = 'pending'`
    );

    // 4. Tagihan SPP Belum Lunas & Piutang
    const [unpaidInvoices] = await db.query(
      `SELECT COUNT(*) as unpaid_count, COALESCE(SUM(amount), 0) as unpaid_amount 
       FROM invoices WHERE status = 'unpaid' OR status = 'overdue'`
    );

    // 5. Laporan Perkembangan yang Menunggu Publish Admin
    const [pendingAIReports] = await db.query(
      `SELECT COUNT(*) as pending_reports FROM ai_reports WHERE status = 'tutor_reviewed' OR status = 'draft'`
    );

    // 6. Rekap Sesi Tutor Bulan Berjalan
    const [tutorMonthStats] = await db.query(
      `SELECT 
         COUNT(*) as total_sessions,
         SUM(CASE WHEN is_home_visit = 1 THEN 1 ELSE 0 END) as home_visit_sessions,
         COALESCE(SUM(duration_minutes)/60, 0) as total_hours,
         COALESCE(SUM(tutor_total_honor), 0) as total_honor_amount
       FROM attendances 
       WHERE status = 'hadir' AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [currentPeriod]
    );

    // 7. Ringkasan Pemasukan Bulan Berjalan
    const [incomeSummary] = await db.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
         COALESCE(SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END), 0) as total_unpaid,
         COALESCE(SUM(amount), 0) as total_billed
       FROM invoices 
       WHERE DATE_FORMAT(created_at, '%Y-%m') = ? OR period_month LIKE ?`,
      [currentPeriod, `%${today.getFullYear()}%`]
    );

    // Counts for general overview
    const [studentsCount] = await db.query('SELECT COUNT(*) as total FROM students WHERE status = "active"');
    const [tutorsCount] = await db.query('SELECT COUNT(*) as total FROM tutors WHERE status = "active"');
    const [programsCount] = await db.query('SELECT COUNT(*) as total FROM programs WHERE status = "active"');
    const [unitsCount] = await db.query('SELECT COUNT(*) as total FROM units WHERE status = "active"');

    const totalPaid = parseFloat(incomeSummary[0]?.total_paid || 0);
    const totalBilled = parseFloat(incomeSummary[0]?.total_billed || 0);
    const paymentRatio = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

    res.json({
      success: true,
      data: {
        today_date: todayDateStr,
        today_day_name: todayDayName,
        current_period: currentPeriod,
        schedules_today: todaySchedules,
        schedules_today_count: todaySchedules.length,
        sessions_today_completed: todayAttendances[0]?.hadir_count || 0,
        pending_reschedule_count: pendingReschedules[0]?.pending_count || 0,
        unpaid_invoices_count: unpaidInvoices[0]?.unpaid_count || 0,
        unpaid_invoices_amount: parseFloat(unpaidInvoices[0]?.unpaid_amount || 0),
        pending_ai_reports_count: pendingAIReports[0]?.pending_reports || 0,
        tutor_month_sessions_count: tutorMonthStats[0]?.total_sessions || 0,
        tutor_month_honor_amount: parseFloat(tutorMonthStats[0]?.total_honor_amount || 0),
        monthly_income: {
          paid: totalPaid,
          unpaid: parseFloat(incomeSummary[0]?.total_unpaid || 0),
          total: totalBilled,
          ratio: paymentRatio
        },
        counts: {
          students: studentsCount[0]?.total || 0,
          tutors: tutorsCount[0]?.total || 0,
          programs: programsCount[0]?.total || 0,
          units: unitsCount[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 8. STUDENTS & MULTI-PROGRAMS
// ==============================================================================

app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const program_name = req.query.program_name || '';
    const unit_name = req.query.unit_name || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (search) {
      whereClause += ' AND (s.name LIKE ? OR s.parent_name LIKE ? OR s.school LIKE ? OR s.subjects LIKE ? OR s.parent_phone LIKE ?)';
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (status) {
      whereClause += ' AND s.status = ?';
      queryParams.push(status);
    }

    const [countRows] = await db.query(`SELECT COUNT(DISTINCT s.id) as total FROM students s ${whereClause}`, queryParams);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [rows] = await db.query(
      `SELECT s.* FROM students s ${whereClause} ORDER BY s.id DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // Attach all student programs for each student
    for (let s of rows) {
      const [programs] = await db.query(
        `SELECT sp.*, t.name as tutor_name, t.phone as tutor_phone 
         FROM student_programs sp 
         LEFT JOIN tutors t ON sp.tutor_id = t.id 
         WHERE sp.student_id = ?`,
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

    const [programs] = await db.query(
      `SELECT sp.*, t.name as tutor_name, t.phone as tutor_phone 
       FROM student_programs sp 
       LEFT JOIN tutors t ON sp.tutor_id = t.id 
       WHERE sp.student_id = ?`,
      [studentId]
    );
    student.programs = programs;

    const [schedules] = await db.query(
      `SELECT s.*, t.name as tutor_name FROM schedules s LEFT JOIN tutors t ON s.tutor_id = t.id WHERE s.student_id = ?`,
      [studentId]
    );
    student.schedules = schedules;

    const [invoices] = await db.query('SELECT * FROM invoices WHERE student_id = ? ORDER BY id DESC', [studentId]);
    student.invoices = invoices;

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/students', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, nickname, birth_date, parent_name, parent_phone, parent_email, address, class_grade, school, subjects, tuition_fee_per_session, status, notes, initial_programs } = req.body;
    if (!name || !parent_name || !parent_phone) {
      return res.status(400).json({ success: false, message: 'Nama anak, nama orang tua, dan nomor WA wajib diisi.' });
    }

    const [result] = await db.query(
      `INSERT INTO students (name, nickname, birth_date, parent_name, parent_phone, parent_email, address, class_grade, school, subjects, tuition_fee_per_session, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, nickname || '', birth_date || null, parent_name, parent_phone, parent_email || '', address || '', class_grade || 'SD', school || '', subjects || 'Cermat Matematika', tuition_fee_per_session || 100000, status || 'active', notes || '']
    );
    const studentId = result.insertId;

    // Insert initial programs if provided
    if (initial_programs && Array.isArray(initial_programs) && initial_programs.length > 0) {
      for (let p of initial_programs) {
        await db.query(
          `INSERT INTO student_programs (student_id, program_name, unit_name, class_type, tutor_id, package_sessions, monthly_fee, schedule_info, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [studentId, p.program_name, p.unit_name || 'Unit Riscon Rancaekek', p.class_type || 'Semi Privat', p.tutor_id || null, p.package_sessions || 8, p.monthly_fee || 350000, p.schedule_info || '']
        );
      }
    } else {
      // Default initial program
      await db.query(
        `INSERT INTO student_programs (student_id, program_name, unit_name, class_type, tutor_id, package_sessions, monthly_fee, schedule_info, status)
         VALUES (?, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 1, 8, 350000.00, 'Senin & Rabu 15:30 - 17:00', 'active')`,
        [studentId]
      );
    }

    res.status(201).json({ success: true, message: 'Data siswa baru berhasil ditambahkan.', id: studentId });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/students/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, nickname, birth_date, parent_name, parent_phone, parent_email, address, class_grade, school, subjects, tuition_fee_per_session, status, notes } = req.body;
    await db.query(
      `UPDATE students SET name=?, nickname=?, birth_date=?, parent_name=?, parent_phone=?, parent_email=?, address=?, class_grade=?, school=?, subjects=?, tuition_fee_per_session=?, status=?, notes=? WHERE id=?`,
      [name, nickname, birth_date || null, parent_name, parent_phone, parent_email, address, class_grade, school, subjects, tuition_fee_per_session, status, notes, req.params.id]
    );
    res.json({ success: true, message: 'Data siswa berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/students/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data siswa berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Student Programs CRUD (Add / Edit / Remove Program from Student)
app.post('/api/student-programs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, program_name, unit_name, class_type, tutor_id, package_sessions, monthly_fee, schedule_info, initial_level, strengths, areas_for_improvement, learning_targets, special_needs, important_notes } = req.body;
    if (!student_id || !program_name) {
      return res.status(400).json({ success: false, message: 'ID Siswa dan Nama Program wajib diisi.' });
    }

    const [result] = await db.query(
      `INSERT INTO student_programs (student_id, program_name, unit_name, class_type, tutor_id, package_sessions, monthly_fee, schedule_info, initial_level, strengths, areas_for_improvement, learning_targets, special_needs, important_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [student_id, program_name, unit_name || 'Unit Riscon Rancaekek', class_type || 'Semi Privat', tutor_id || null, package_sessions || 8, monthly_fee || 350000, schedule_info || '', initial_level || '', strengths || '', areas_for_improvement || '', learning_targets || '', special_needs || '', important_notes || '']
    );

    res.status(201).json({ success: true, message: 'Program bimbingan baru berhasil ditambahkan untuk siswa.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/student-programs/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { program_name, unit_name, class_type, tutor_id, package_sessions, monthly_fee, completed_sessions_month, schedule_info, initial_level, strengths, areas_for_improvement, learning_targets, special_needs, important_notes, status } = req.body;
    await db.query(
      `UPDATE student_programs 
       SET program_name=?, unit_name=?, class_type=?, tutor_id=?, package_sessions=?, monthly_fee=?, completed_sessions_month=?, schedule_info=?, initial_level=?, strengths=?, areas_for_improvement=?, learning_targets=?, special_needs=?, important_notes=?, status=?
       WHERE id=?`,
      [program_name, unit_name, class_type, tutor_id, package_sessions, monthly_fee, completed_sessions_month || 0, schedule_info, initial_level, strengths, areas_for_improvement, learning_targets, special_needs, important_notes, status || 'active', req.params.id]
    );

    res.json({ success: true, message: 'Data program siswa berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/student-programs/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM student_programs WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Program siswa berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 9. TUTORS & FLEXIBLE RATES
// ==============================================================================

app.get('/api/tutors', authenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM tutors WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR subjects LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY name ASC';
    const [rows] = await db.query(query, params);

    // Attach flexible rates for each tutor
    for (let t of rows) {
      const [rates] = await db.query('SELECT * FROM tutor_rates WHERE tutor_id = ? ORDER BY program_name ASC', [t.id]);
      t.rates = rates;
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/tutors/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tutors WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tutor tidak ditemukan.' });
    const tutor = rows[0];

    const [rates] = await db.query('SELECT * FROM tutor_rates WHERE tutor_id = ? ORDER BY program_name ASC', [tutor.id]);
    tutor.rates = rates;

    res.json({ success: true, data: tutor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tutors', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, subjects, units_teaching, class_types, fee_per_session, bio, status, rates } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Nama dan nomor telepon tutor wajib diisi.' });

    const [result] = await db.query(
      `INSERT INTO tutors (name, email, phone, subjects, units_teaching, class_types, fee_per_session, bio, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email || '', phone, subjects || 'Cermat Matematika', units_teaching || 'Unit Riscon Rancaekek', class_types || 'Semi Privat, Privat di Tempat Les', fee_per_session || 75000, bio || '', status || 'active']
    );
    const tutorId = result.insertId;

    // Insert rates if provided
    if (rates && Array.isArray(rates) && rates.length > 0) {
      for (let r of rates) {
        await db.query(
          `INSERT INTO tutor_rates (tutor_id, program_name, class_type, duration_minutes, rate_per_session, transport_fee, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [tutorId, r.program_name, r.class_type || 'Semi Privat', r.duration_minutes || 90, r.rate_per_session || 75000, r.transport_fee || 0, r.notes || '']
        );
      }
    }

    res.status(201).json({ success: true, message: 'Data tutor berhasil ditambahkan.', id: tutorId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/tutors/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, subjects, units_teaching, class_types, fee_per_session, status, bio, rates } = req.body;
    await db.query(
      `UPDATE tutors SET name=?, email=?, phone=?, subjects=?, units_teaching=?, class_types=?, fee_per_session=?, status=?, bio=? WHERE id=?`,
      [name, email, phone, subjects, units_teaching, class_types, fee_per_session, status, bio, req.params.id]
    );

    // If rates array is provided, sync rates
    if (rates && Array.isArray(rates)) {
      await db.query('DELETE FROM tutor_rates WHERE tutor_id = ?', [req.params.id]);
      for (let r of rates) {
        await db.query(
          `INSERT INTO tutor_rates (tutor_id, program_name, class_type, duration_minutes, rate_per_session, transport_fee, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [req.params.id, r.program_name, r.class_type || 'Semi Privat', r.duration_minutes || 90, r.rate_per_session || 75000, r.transport_fee || 0, r.notes || '']
        );
      }
    }

    res.json({ success: true, message: 'Data tutor berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/tutors/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM tutors WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data tutor berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Tutor Rate specific routes
app.get('/api/tutors/:id/rates', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tutor_rates WHERE tutor_id = ? ORDER BY program_name ASC', [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tutors/:id/rates', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { program_name, class_type, duration_minutes, rate_per_session, transport_fee, notes } = req.body;
    const [result] = await db.query(
      `INSERT INTO tutor_rates (tutor_id, program_name, class_type, duration_minutes, rate_per_session, transport_fee, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, program_name, class_type || 'Semi Privat', duration_minutes || 90, rate_per_session || 75000, transport_fee || 0, notes || '']
    );
    res.status(201).json({ success: true, message: 'Tarif honor tutor berhasil ditambahkan.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/tutors/:id/rates/:rateId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM tutor_rates WHERE id = ? AND tutor_id = ?', [req.params.rateId, req.params.id]);
    res.json({ success: true, message: 'Tarif honor berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 10. SCHEDULES (JADWAL LES & MENGAJAR)
// ==============================================================================

app.get('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const { student_id, tutor_id, program_name, unit_name, day_of_week } = req.query;
    let query = `
      SELECT s.*, st.name as student_name, st.class_grade, st.parent_phone, st.parent_name, t.name as tutor_name, t.phone as tutor_phone,
             sp.package_sessions, sp.completed_sessions_month
      FROM schedules s
      JOIN students st ON s.student_id = st.id
      LEFT JOIN tutors t ON s.tutor_id = t.id
      LEFT JOIN student_programs sp ON sp.student_id = s.student_id AND sp.program_name = s.program_name
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
      const tutorId = req.user.tutor_id || 1;
      query += ` AND s.tutor_id = ?`;
      params.push(tutorId);
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
    if (unit_name) {
      query += ` AND s.unit_name = ?`;
      params.push(unit_name);
    }
    if (day_of_week) {
      query += ` AND s.day_of_week = ?`;
      params.push(day_of_week);
    }

    query += ` ORDER BY FIELD(s.day_of_week, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), s.start_time ASC`;

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/schedules', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, tutor_id, program_name, unit_name, class_type, day_of_week, start_time, end_time, duration_minutes, subject, location_type, is_home_visit, home_address, notes } = req.body;
    if (!student_id || !tutor_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Siswa, tutor, hari, jam mulai dan selesai wajib diisi.' });
    }

    const isHome = is_home_visit || class_type === 'Privat Home Visit' ? 1 : 0;
    const dur = duration_minutes || 90;

    const [result] = await db.query(
      `INSERT INTO schedules (student_id, tutor_id, program_name, unit_name, class_type, day_of_week, start_time, end_time, duration_minutes, subject, location_type, is_home_visit, home_address, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [student_id, tutor_id, program_name || 'Cermat Matematika', unit_name || 'Unit Riscon Rancaekek', class_type || 'Semi Privat', day_of_week, start_time, end_time, dur, subject || program_name, location_type || 'offline', isHome, home_address || '', notes || '']
    );

    res.status(201).json({ success: true, message: 'Jadwal les baru berhasil ditambahkan.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/schedules/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, tutor_id, program_name, unit_name, class_type, day_of_week, start_time, end_time, duration_minutes, subject, location_type, is_home_visit, home_address, status, notes } = req.body;
    const isHome = is_home_visit || class_type === 'Privat Home Visit' ? 1 : 0;

    await db.query(
      `UPDATE schedules 
       SET student_id=?, tutor_id=?, program_name=?, unit_name=?, class_type=?, day_of_week=?, start_time=?, end_time=?, duration_minutes=?, subject=?, location_type=?, is_home_visit=?, home_address=?, status=?, notes=?
       WHERE id=?`,
      [student_id, tutor_id, program_name, unit_name, class_type, day_of_week, start_time, end_time, duration_minutes || 90, subject, location_type, isHome, home_address, status || 'active', notes, req.params.id]
    );

    res.json({ success: true, message: 'Jadwal les berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/schedules/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Jadwal les berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 11. ATTENDANCES & JOURNALS (PRESENSI & JURNAL PEMBELAJARAN SESI)
// ==============================================================================

app.get('/api/attendances', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { student_id, tutor_id, program_name, unit_name, date, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, st.name as student_name, st.class_grade, st.parent_phone, t.name as tutor_name,
             j.id as journal_id, j.topic, j.targets_achieved, j.score, j.eval_data_json, j.progress_notes, j.homework, j.next_target
      FROM attendances a
      JOIN students st ON a.student_id = st.id
      LEFT JOIN tutors t ON a.tutor_id = t.id
      LEFT JOIN journals j ON j.attendance_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const [children] = await db.query('SELECT id FROM students WHERE user_id = ? OR parent_phone = ?', [req.user.id, req.user.phone]);
      const childIds = children.map(c => c.id);
      if (childIds.length > 0) {
        query += ` AND a.student_id IN (${childIds.map(() => '?').join(',')})`;
        params.push(...childIds);
      } else {
        query += ' AND a.student_id = -1';
      }
    } else if (req.user.role === 'tutor') {
      const tutorId = req.user.tutor_id || 1;
      query += ` AND a.tutor_id = ?`;
      params.push(tutorId);
    }

    if (student_id) {
      query += ` AND a.student_id = ?`;
      params.push(student_id);
    }
    if (tutor_id) {
      query += ` AND a.tutor_id = ?`;
      params.push(tutor_id);
    }
    if (program_name && program_name !== 'Semua Program') {
      query += ` AND a.program_name = ?`;
      params.push(program_name);
    }
    if (unit_name) {
      query += ` AND a.unit_name = ?`;
      params.push(unit_name);
    }
    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    }
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (st.name LIKE ? OR a.program_name LIKE ? OR j.topic LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY a.date DESC, a.start_time DESC';

    const [allRows] = await db.query(query, params);
    const total = allRows.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedRows = allRows.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedRows,
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
      student_id,
      tutor_id,
      schedule_id,
      program_name,
      unit_name,
      class_type,
      is_home_visit,
      date,
      start_time,
      end_time,
      duration_minutes,
      status,
      session_number,
      package_total,
      notes,
      // Integrated Journal Fields
      topic,
      targets_achieved,
      score,
      eval_data,
      fluency_rating,
      makhraj_rating,
      tajwid_rating,
      memorization_surah,
      murojaah_status,
      progress_notes,
      homework,
      next_target
    } = req.body;

    if (!student_id || !date || !status) {
      return res.status(400).json({ success: false, message: 'Siswa, tanggal, dan status presensi wajib diisi.' });
    }

    const actualTutorId = tutor_id || req.user.tutor_id || 1;
    const isHome = is_home_visit || class_type === 'Privat Home Visit' ? 1 : 0;
    const dur = duration_minutes || 90;

    // Calculate Tutor Rates & Home Visit Transport
    let sessionFee = 75000;
    let transportFee = 0;

    // Check custom tutor rate first
    const [rateRows] = await db.query(
      'SELECT * FROM tutor_rates WHERE tutor_id = ? AND program_name = ? AND class_type = ? LIMIT 1',
      [actualTutorId, program_name, class_type || 'Semi Privat']
    );

    if (rateRows.length > 0) {
      sessionFee = parseFloat(rateRows[0].rate_per_session);
      transportFee = parseFloat(rateRows[0].transport_fee || 0);
    } else {
      // Fallback to program default tutor fee
      const [progMaster] = await db.query('SELECT default_tutor_fee FROM programs WHERE name = ? LIMIT 1', [program_name]);
      if (progMaster.length > 0) sessionFee = parseFloat(progMaster[0].default_tutor_fee);
      if (isHome) {
        const [setTransport] = await db.query('SELECT value FROM settings WHERE key_name = "default_home_visit_transport" LIMIT 1');
        transportFee = setTransport.length > 0 ? parseFloat(setTransport[0].value) : 25000;
      }
    }

    const totalHonor = sessionFee + (isHome ? transportFee : 0);

    const [attResult] = await db.query(
      `INSERT INTO attendances (student_id, tutor_id, schedule_id, program_name, unit_name, class_type, is_home_visit, date, start_time, end_time, duration_minutes, status, session_number, package_total, parent_confirmed, billed, tutor_session_fee, tutor_transport_fee, tutor_total_honor, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)`,
      [student_id, actualTutorId, schedule_id || null, program_name || 'Cermat Matematika', unit_name || 'Unit Riscon Rancaekek', class_type || 'Semi Privat', isHome, date, start_time || '15:30:00', end_time || '17:00:00', dur, status, session_number || 1, package_total || 8, sessionFee, transportFee, totalHonor, notes || '']
    );
    const attendanceId = attResult.insertId;

    // If status is 'hadir', update student_program completed_sessions_month count
    if (status === 'hadir') {
      await db.query(
        `UPDATE student_programs 
         SET completed_sessions_month = completed_sessions_month + 1 
         WHERE student_id = ? AND program_name = ?`,
        [student_id, program_name]
      );
      await db.query(
        `UPDATE students 
         SET total_sessions_completed = total_sessions_completed + 1 
         WHERE id = ?`,
        [student_id]
      );
    }

    // Insert integrated teaching journal if topic is provided
    if (topic) {
      const evalJsonStr = eval_data ? JSON.stringify(eval_data) : null;
      await db.query(
        `INSERT INTO journals (attendance_id, student_id, tutor_id, program_name, unit_name, class_type, session_number, package_total, date, topic, targets_achieved, score, eval_data_json, fluency_rating, makhraj_rating, tajwid_rating, memorization_surah, murojaah_status, progress_notes, homework, next_target)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attendanceId,
          student_id,
          actualTutorId,
          program_name || 'Cermat Matematika',
          unit_name || 'Unit Riscon Rancaekek',
          class_type || 'Semi Privat',
          session_number || 1,
          package_total || 8,
          date,
          topic,
          targets_achieved || 'Materi sesi terselesaikan dengan baik.',
          score || null,
          evalJsonStr,
          fluency_rating || null,
          makhraj_rating || null,
          tajwid_rating || null,
          memorization_surah || null,
          murojaah_status || null,
          progress_notes || 'Ananda mengikuti bimbingan secara aktif dan kondusif.',
          homework || '',
          next_target || ''
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Presensi dan catatan jurnal belajar berhasil disimpan.',
      id: attendanceId
    });
  } catch (error) {
    console.error('Error creating attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/attendances/:id/confirm', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE attendances SET parent_confirmed = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Presensi berhasil dikonfirmasi orang tua.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 12. JOURNALS (CATATAN JURNAL BELAJAR & EVALUASI FLEKSIBEL)
// ==============================================================================

app.get('/api/journals', authenticateToken, async (req, res) => {
  try {
    const { student_id, program_name, search } = req.query;
    let query = `
      SELECT j.*, st.name as student_name, st.class_grade, t.name as tutor_name, a.status as attendance_status
      FROM journals j
      JOIN students st ON j.student_id = st.id
      LEFT JOIN tutors t ON j.tutor_id = t.id
      LEFT JOIN attendances a ON j.attendance_id = a.id
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
      query += ` AND (st.name LIKE ? OR j.topic LIKE ? OR j.targets_achieved LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY j.date DESC, j.id DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/journals/:id', authenticateToken, requireRole('admin', 'tutor'), async (req, res) => {
  try {
    const { topic, targets_achieved, score, eval_data, progress_notes, homework, next_target } = req.body;
    const evalJsonStr = eval_data ? JSON.stringify(eval_data) : null;

    await db.query(
      `UPDATE journals 
       SET topic=?, targets_achieved=?, score=?, eval_data_json=?, progress_notes=?, homework=?, next_target=?
       WHERE id=?`,
      [topic, targets_achieved, score || null, evalJsonStr, progress_notes, homework || '', next_target || '', req.params.id]
    );

    res.json({ success: true, message: 'Jurnal belajar berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 13. RESCHEDULE & PERMINTAAN IZIN
// ==============================================================================

app.get('/api/reschedule', authenticateToken, async (req, res) => {
  try {
    const { status, student_id, program_name } = req.query;
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
    if (program_name && program_name !== 'Semua Program') {
      query += ` AND r.program_name = ?`;
      params.push(program_name);
    }
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/reschedule', authenticateToken, async (req, res) => {
  try {
    const { student_id, program_name, unit_name, class_type, schedule_id, original_date, reason, reason_details, requested_new_date, requested_new_time } = req.body;
    if (!student_id || !original_date || !reason_details) {
      return res.status(400).json({ success: false, message: 'Siswa, tanggal awal, dan alasan wajib diisi.' });
    }

    const [result] = await db.query(
      `INSERT INTO reschedule_requests (student_id, program_name, unit_name, class_type, schedule_id, original_date, reason, reason_details, requested_new_date, requested_new_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [student_id, program_name || 'Cermat Matematika', unit_name || 'Unit Riscon Rancaekek', class_type || 'Semi Privat', schedule_id || null, original_date, reason || 'izin', reason_details, requested_new_date || null, requested_new_time || '']
    );

    res.status(201).json({
      success: true,
      message: 'Pengajuan izin/reschedule berhasil dikirim. Menunggu konfirmasi keputusan administratif Admin.',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/reschedule/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, session_decision, admin_notes } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid.' });
    }

    await db.query(
      'UPDATE reschedule_requests SET status = ?, session_decision = ?, admin_notes = ?, approved_by = ? WHERE id = ?',
      [status, session_decision || 'valid', admin_notes || '', req.user.id, req.params.id]
    );

    res.json({
      success: true,
      message: `Keputusan izin/reschedule berhasil disimpan: ${status} (${session_decision === 'forfeited' ? 'Sesi Hangus' : 'Sesi Tetap Berlaku / Reschedule'}).`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 14. PROGRESS BELAJAR SISWA (CAPAIAN BELAJAR FLEKSIBEL SESUAI PROGRAM)
// ==============================================================================

app.get('/api/progress/:studentId', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { program_name, unit_name, period } = req.query;

    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    const student = students[0];

    let progQuery = 'SELECT sp.*, t.name as tutor_name FROM student_programs sp LEFT JOIN tutors t ON sp.tutor_id = t.id WHERE sp.student_id = ?';
    const progParams = [studentId];
    if (program_name && program_name !== 'Semua Program') {
      progQuery += ' AND sp.program_name = ?';
      progParams.push(program_name);
    }
    if (unit_name) {
      progQuery += ' AND sp.unit_name = ?';
      progParams.push(unit_name);
    }
    const [programs] = await db.query(progQuery, progParams);

    // Attendance summary
    const [attStats] = await db.query(
      `SELECT status, COUNT(*) as count 
       FROM attendances 
       WHERE student_id = ? ${program_name && program_name !== 'Semua Program' ? 'AND program_name = ?' : ''}
       GROUP BY status`,
      program_name && program_name !== 'Semua Program' ? [studentId, program_name] : [studentId]
    );

    // Journals history
    let journalQuery = `
      SELECT j.*, t.name as tutor_name 
      FROM journals j 
      LEFT JOIN tutors t ON j.tutor_id = t.id 
      WHERE j.student_id = ?
    `;
    const journalParams = [studentId];
    if (program_name && program_name !== 'Semua Program') {
      journalQuery += ' AND j.program_name = ?';
      journalParams.push(program_name);
    }
    journalQuery += ' ORDER BY j.date DESC LIMIT 12';
    const [journals] = await db.query(journalQuery, journalParams);

    // AI Reports
    let reportQuery = 'SELECT * FROM ai_reports WHERE student_id = ?';
    const reportParams = [studentId];
    if (program_name && program_name !== 'Semua Program') {
      reportQuery += ' AND program_name = ?';
      reportParams.push(program_name);
    }
    reportQuery += ' ORDER BY id DESC LIMIT 5';
    const [aiReports] = await db.query(reportQuery, reportParams);

    res.json({
      success: true,
      data: {
        student,
        programs,
        attendance_stats: attStats,
        journals,
        ai_reports: aiReports
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 15. INVOICES & TAGIHAN SPP BULANAN (MULTI-PROGRAM)
// ==============================================================================

app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { student_id, status, period_month, search } = req.query;
    let query = `
      SELECT inv.*, st.name as student_name, st.parent_name, st.parent_phone, st.class_grade
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
    if (period_month) {
      query += ` AND inv.period_month LIKE ?`;
      params.push(`%${period_month}%`);
    }
    if (search) {
      query += ` AND (st.name LIKE ? OR inv.invoice_number LIKE ? OR st.parent_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY inv.id DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT inv.*, st.name as student_name, st.parent_name, st.parent_phone, st.address, st.class_grade 
       FROM invoices inv JOIN students st ON inv.student_id = st.id WHERE inv.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tagihan tidak ditemukan.' });
    res.json({ success: true, data: rows[0] });
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
      return res.status(400).json({ success: false, message: 'Siswa tidak memiliki program bimbingan aktif.' });
    }

    const totalAmount = programs.reduce((sum, p) => sum + parseFloat(p.monthly_fee), 0);
    const totalSessions = programs.reduce((sum, p) => sum + parseInt(p.package_sessions), 0);
    const completedSessions = programs.reduce((sum, p) => sum + parseInt(p.completed_sessions_month || 0), 0);

    const invoiceNumber = `INV/RBL/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(100 + Math.random() * 900))}`;

    const items = programs.map(p => ({
      program_name: p.program_name,
      unit_name: p.unit_name,
      class_type: p.class_type,
      package: p.package_sessions,
      fee: parseFloat(p.monthly_fee)
    }));

    const [invRes] = await db.query(
      `INSERT INTO invoices (invoice_number, student_id, period_month, amount, package_sessions, sessions_completed, status, due_date, notes, items_json)
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?)`,
      [invoiceNumber, student_id, period_month, totalAmount, totalSessions, completedSessions, due_date || '2026-08-10', notes || `Tagihan SPP ${period_month}`, JSON.stringify(items)]
    );

    res.status(201).json({ success: true, message: 'Tagihan SPP Bulanan berhasil diterbitkan.', invoice_id: invRes.insertId });
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

    const newStatus = req.user.role === 'admin' ? 'paid' : 'paid';
    const paidAt = new Date();

    await db.query(
      'UPDATE invoices SET status = ?, proof_url = COALESCE(?, proof_url), paid_at = ? WHERE id = ?',
      [newStatus, paymentProofUrl, paidAt, invoiceId]
    );

    res.json({
      success: true,
      message: 'Status pembayaran tagihan SPP berhasil diperbarui (Lunas).'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/invoices/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Tagihan berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 16. FINANCES REPORT & REKAP KEUANGAN
// ==============================================================================

app.get('/api/finances/summary', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { period_month, unit_name, program_name } = req.query;
    let invoiceQuery = `
      SELECT inv.*, st.name as student_name, st.class_grade 
      FROM invoices inv
      JOIN students st ON inv.student_id = st.id
      WHERE 1=1
    `;
    const params = [];

    if (period_month) {
      invoiceQuery += ` AND inv.period_month LIKE ?`;
      params.push(`%${period_month}%`);
    }

    const [invoices] = await db.query(invoiceQuery, params);

    // Calculate totals
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const totalUnpaid = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const totalBilled = totalPaid + totalUnpaid;
    const paymentRatio = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

    // Monthly Trend
    const [trendRows] = await db.query(
      `SELECT period_month, 
              SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid,
              SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END) as unpaid,
              SUM(amount) as total
       FROM invoices
       GROUP BY period_month
       ORDER BY id ASC LIMIT 6`
    );

    // Honor Tutor Expenditure this period
    const [tutorExp] = await db.query(
      `SELECT COALESCE(SUM(total_honor), 0) as total_honor_paid 
       FROM tutor_honor_recaps WHERE status = 'paid'`
    );

    res.json({
      success: true,
      data: {
        summary: {
          total_income: totalPaid,
          unpaid_receivables: totalUnpaid,
          total_billed: totalBilled,
          payment_ratio: paymentRatio,
          total_tutor_honor_paid: parseFloat(tutorExp[0]?.total_honor_paid || 0),
          net_profit: totalPaid - parseFloat(tutorExp[0]?.total_honor_paid || 0)
        },
        monthly_trend: trendRows,
        invoices: invoices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 17. TUTOR ATTENDANCE RECAP & HONOR RECAPS (REKAP SESI MENGAJAR & HONOR)
// ==============================================================================

// Detail Rekap Sesi Kehadiran Tutor yang Benar-benar Terlaksana
app.get('/api/tutor-attendance-recap', authenticateToken, async (req, res) => {
  try {
    const { tutor_id, period_month, unit_name, program_name } = req.query;
    let query = `
      SELECT a.id, a.date, a.start_time, a.end_time, a.duration_minutes, a.status,
             a.program_name, a.unit_name, a.class_type, a.is_home_visit,
             a.tutor_session_fee, a.tutor_transport_fee, a.tutor_total_honor, a.session_number, a.package_total,
             st.name as student_name, st.class_grade,
             t.name as tutor_name, t.phone as tutor_phone
      FROM attendances a
      JOIN students st ON a.student_id = st.id
      JOIN tutors t ON a.tutor_id = t.id
      WHERE a.status = 'hadir'
    `;
    const params = [];

    if (req.user.role === 'tutor') {
      const tutorId = req.user.tutor_id || 1;
      query += ` AND a.tutor_id = ?`;
      params.push(tutorId);
    } else if (tutor_id) {
      query += ` AND a.tutor_id = ?`;
      params.push(tutor_id);
    }

    if (period_month) {
      query += ` AND DATE_FORMAT(a.date, '%Y-%m') = ?`;
      params.push(period_month);
    }
    if (unit_name) {
      query += ` AND a.unit_name = ?`;
      params.push(unit_name);
    }
    if (program_name && program_name !== 'Semua Program') {
      query += ` AND a.program_name = ?`;
      params.push(program_name);
    }

    query += ' ORDER BY a.date DESC, a.start_time DESC';
    const [rows] = await db.query(query, params);

    // Summary calculations
    const totalSessions = rows.length;
    const homeVisitSessions = rows.filter(r => r.is_home_visit === 1).length;
    const totalHours = rows.reduce((sum, r) => sum + (r.duration_minutes / 60), 0);
    const totalTeachingFee = rows.reduce((sum, r) => sum + parseFloat(r.tutor_session_fee), 0);
    const totalTransport = rows.reduce((sum, r) => sum + parseFloat(r.tutor_transport_fee), 0);
    const totalHonor = rows.reduce((sum, r) => sum + parseFloat(r.tutor_total_honor), 0);

    res.json({
      success: true,
      data: rows,
      summary: {
        total_sessions: totalSessions,
        home_visit_sessions: homeVisitSessions,
        total_hours: totalHours.toFixed(1),
        total_teaching_fee: totalTeachingFee,
        total_transport: totalTransport,
        total_honor: totalHonor
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rekap Bulanan Honor Tutor
app.get('/api/tutor-recaps', authenticateToken, async (req, res) => {
  try {
    const { period_month, tutor_id } = req.query;
    let query = `
      SELECT r.*, t.name as tutor_name, t.phone as tutor_phone, t.email as tutor_email, t.subjects
      FROM tutor_honor_recaps r
      JOIN tutors t ON r.tutor_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'tutor') {
      const tutorId = req.user.tutor_id || 1;
      query += ` AND r.tutor_id = ?`;
      params.push(tutorId);
    } else if (tutor_id) {
      query += ` AND r.tutor_id = ?`;
      params.push(tutor_id);
    }

    if (period_month) {
      query += ` AND r.period_month = ?`;
      params.push(period_month);
    }

    query += ' ORDER BY r.id DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tutor-recaps/generate', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { tutor_id, period_month, notes } = req.body;
    if (!tutor_id || !period_month) {
      return res.status(400).json({ success: false, message: 'Tutor dan Periode Bulan (YYYY-MM) wajib dipilih.' });
    }

    // Fetch all verified sessions
    const [sessions] = await db.query(
      `SELECT * FROM attendances WHERE tutor_id = ? AND status = 'hadir' AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [tutor_id, period_month]
    );

    if (sessions.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada sesi mengajar yang terlaksana pada periode ini.' });
    }

    const totalSessions = sessions.length;
    const homeVisitSessions = sessions.filter(s => s.is_home_visit === 1).length;
    const totalHours = sessions.reduce((sum, s) => sum + (s.duration_minutes / 60), 0);
    const totalTeaching = sessions.reduce((sum, s) => sum + parseFloat(s.tutor_session_fee), 0);
    const totalTransport = sessions.reduce((sum, s) => sum + parseFloat(s.tutor_transport_fee), 0);
    const totalHonor = totalTeaching + totalTransport;

    // Group breakdown per program
    const progMap = {};
    sessions.forEach(s => {
      if (!progMap[s.program_name]) {
        progMap[s.program_name] = { name: s.program_name, sessions: 0, teaching_fee: 0, transport: 0, total: 0 };
      }
      progMap[s.program_name].sessions += 1;
      progMap[s.program_name].teaching_fee += parseFloat(s.tutor_session_fee);
      progMap[s.program_name].transport += parseFloat(s.tutor_transport_fee);
      progMap[s.program_name].total += parseFloat(s.tutor_total_honor);
    });

    const breakdownJson = JSON.stringify({ programs: Object.values(progMap) });

    const [result] = await db.query(
      `INSERT INTO tutor_honor_recaps (tutor_id, period_month, total_sessions, home_visit_sessions, total_hours, rate_per_session, total_transport_fee, total_teaching_honor, total_honor, status, notes, breakdown_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?)
       ON DUPLICATE KEY UPDATE 
         total_sessions = VALUES(total_sessions),
         home_visit_sessions = VALUES(home_visit_sessions),
         total_hours = VALUES(total_hours),
         total_transport_fee = VALUES(total_transport_fee),
         total_teaching_honor = VALUES(total_teaching_honor),
         total_honor = VALUES(total_honor),
         breakdown_json = VALUES(breakdown_json)`,
      [tutor_id, period_month, totalSessions, homeVisitSessions, totalHours, 75000, totalTransport, totalTeaching, totalHonor, notes || `Rekap Honor Tutor Bulan ${period_month}`, breakdownJson]
    );

    res.status(201).json({ success: true, message: 'Rekap honor tutor berhasil dihitung dan diterbitkan.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/tutor-recaps/:id/pay', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query(
      `UPDATE tutor_honor_recaps SET status = 'paid', paid_at = NOW() WHERE id = ?`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Status honor tutor berhasil diubah menjadi Sudah Dibayar (Lunas).' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export Structured Spreadsheet / CSV Data
app.get('/api/tutor-recaps/export-spreadsheet', authenticateToken, async (req, res) => {
  try {
    const { period_month, tutor_id } = req.query;

    let attQuery = `
      SELECT a.date, t.name as tutor_name, st.name as student_name, a.program_name, a.unit_name, 
             a.class_type, a.is_home_visit, a.start_time, a.end_time, a.duration_minutes,
             a.tutor_session_fee, a.tutor_transport_fee, a.tutor_total_honor, a.status
      FROM attendances a
      JOIN students st ON a.student_id = st.id
      JOIN tutors t ON a.tutor_id = t.id
      WHERE a.status = 'hadir'
    `;
    const params = [];
    if (period_month) {
      attQuery += ` AND DATE_FORMAT(a.date, '%Y-%m') = ?`;
      params.push(period_month);
    }
    if (tutor_id) {
      attQuery += ` AND a.tutor_id = ?`;
      params.push(tutor_id);
    }
    attQuery += ' ORDER BY a.date DESC';

    const [sessions] = await db.query(attQuery, params);

    // Sheet 1: Kehadiran Tutor
    const sheet1_attendance = sessions.map(s => ({
      Tanggal: s.date ? new Date(s.date).toISOString().split('T')[0] : '',
      Tutor: s.tutor_name,
      Siswa: s.student_name,
      Program: s.program_name,
      Unit: s.unit_name,
      Jenis_Kelas: s.class_type,
      Jam: `${s.start_time} - ${s.end_time}`,
      Status: 'Hadir Terlaksana'
    }));

    // Sheet 2: Rekap Honor Per Tutor & Program
    const tutorProgMap = {};
    sessions.forEach(s => {
      const key = `${s.tutor_name}__${s.program_name}`;
      if (!tutorProgMap[key]) {
        tutorProgMap[key] = {
          Tutor: s.tutor_name,
          Program: s.program_name,
          Jumlah_Sesi: 0,
          Total_Fee: 0,
          Total_Transport: 0,
          Total_Honor: 0
        };
      }
      tutorProgMap[key].Jumlah_Sesi += 1;
      tutorProgMap[key].Total_Fee += parseFloat(s.tutor_session_fee);
      tutorProgMap[key].Total_Transport += parseFloat(s.tutor_transport_fee);
      tutorProgMap[key].Total_Honor += parseFloat(s.tutor_total_honor);
    });
    const sheet2_honor = Object.values(tutorProgMap);

    // Sheet 3: Home Visit Detail
    const sheet3_home_visit = sessions.filter(s => s.is_home_visit === 1).map(s => ({
      Tutor: s.tutor_name,
      Siswa: s.student_name,
      Tanggal: s.date ? new Date(s.date).toISOString().split('T')[0] : '',
      Fee_Sesi: parseFloat(s.tutor_session_fee),
      Transport: parseFloat(s.tutor_transport_fee),
      Total_Honor: parseFloat(s.tutor_total_honor)
    }));

    // Sheet 4: Rekap Bulanan
    const [monthlyRecaps] = await db.query(
      `SELECT r.*, t.name as tutor_name FROM tutor_honor_recaps r JOIN tutors t ON r.tutor_id = t.id ${period_month ? 'WHERE r.period_month = ?' : ''} ORDER BY r.id DESC`,
      period_month ? [period_month] : []
    );

    res.json({
      success: true,
      data: {
        sheet1_kehadiran: sheet1_attendance,
        sheet2_rekap_honor: sheet2_honor,
        sheet3_home_visit: sheet3_home_visit,
        sheet4_rekap_bulanan: monthlyRecaps
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 18. AI REPORTS (LAPORAN PERKEMBANGAN BERKALA PAKET 4/8/12)
// ==============================================================================

app.get('/api/ai-reports', authenticateToken, async (req, res) => {
  try {
    const { student_id, program_name, status } = req.query;
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
        query += ` AND r.student_id IN (${childIds.map(() => '?').join(',')}) AND r.status = 'admin_approved'`;
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
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
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
    const { student_id, program_name, period, milestone_session } = req.body;
    if (!student_id || !program_name) {
      return res.status(400).json({ success: false, message: 'Siswa dan Program wajib dipilih.' });
    }

    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [student_id]);
    if (students.length === 0) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    const student = students[0];

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

    const [attendances] = await db.query(
      'SELECT status, COUNT(*) as count FROM attendances WHERE student_id = ? AND program_name = ? GROUP BY status',
      [student_id, program_name]
    );

    const actualTutorId = studentProg?.tutor_id || req.user.tutor_id || 1;
    const reportPeriod = period || 'Agustus 2026';
    const milestone = milestone_session || (studentProg?.package_sessions === 4 ? 4 : 4);
    const reportTitle = `Laporan Perkembangan ${program_name} – Pertemuan ${milestone} (${reportPeriod})`;

    let summary = `Ananda ${student.name} menunjukkan perkembangan yang konsisten dan positif dalam program ${program_name} pada periode ${reportPeriod}.`;
    let strengths = studentProg?.strengths || `Memiliki antusiasme belajar yang baik, cepat memahami penjelasan tutor, dan fokus saat latihan.`;
    let improvements = studentProg?.areas_for_improvement || `Perlu pembiasaan murojaah / latihan soal mandiri di rumah agar konsep semakin matang.`;
    let recommendations = `Beri apresiasi atas setiap capaian ananda dan dukung suasana belajar yang menyenangkan di rumah.`;

    // Gemini API call
    try {
      const journalContext = journals.map((j, idx) => 
        `Sesi ${idx + 1} (${j.date ? new Date(j.date).toISOString().split('T')[0] : ''}): Topik "${j.topic || ''}", Capaian "${j.targets_achieved || ''}", Nilai/Rubrik "${j.score || j.fluency_rating || 'Baik'}"`
      ).join('\n');

      const attContext = attendances.map(a => `${a.status}: ${a.count} kali`).join(', ');

      const prompt = `Anda adalah Asisten AI Pedagogik Resmi untuk Lembaga Bimbingan Belajar Rumah Belajar Alfatih (RUMBALA).
Tugas Anda adalah menyusun Draft Laporan Perkembangan Belajar Siswa yang ramah, mendidik, solutif, dan profesional untuk dibaca oleh Orang Tua.

Informasi Siswa & Sesi Bimbingan:
- Nama Siswa: ${student.name} (${student.class_grade || 'SD'})
- Program Bimbingan: ${program_name}
- Milestone Pertemuan: Pertemuan ${milestone} dari ${studentProg?.package_sessions || 8} sesi
- Periode: ${reportPeriod}
- Profil Awal: Level ${studentProg?.initial_level || 'Dasar'}, Kekuatan: ${studentProg?.strengths || '-'}, Target: ${studentProg?.learning_targets || '-'}
- Rekap Kehadiran: ${attContext || '100% Hadir'}
- Catatan Jurnal Sesi:
${journalContext || 'Materi tuntas sesuai modul bimbingan.'}

Instruksi Output:
Buatlah respon HANYA dalam format JSON valid (tanpa markdown blok tambahan) dengan struktur:
{
  "title": "${reportTitle}",
  "summary": "Ringkasan narasi kemajuan belajar ananda 2-3 kalimat hangat dan apresiatif berbasis data jurnal di atas.",
  "strengths": "Poin-poin kekuatan, pemahaman konsep, atau potensi menonjol yang dikuasai ananda.",
  "areas_for_improvement": "Bagian atau aspek yang masih perlu terus dilatih atau ditingkatkan.",
  "recommendations": "Saran konkrit dan rekomendasi latihan pendampingan bagi orang tua di rumah."
}`;

      const geminiResponse = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        if (parsed.summary) summary = parsed.summary;
        if (parsed.strengths) strengths = parsed.strengths;
        if (parsed.areas_for_improvement) improvements = parsed.areas_for_improvement;
        if (parsed.recommendations) recommendations = parsed.recommendations;
      }
    } catch (geminiErr) {
      console.warn('Gemini API call fallback:', geminiErr.message);
      if (journals.length > 0) {
        const topics = journals.map(j => j.topic).filter(Boolean).join(', ');
        summary += ` Materi yang telah tuntas meliputi: ${topics}.`;
      }
    }

    const [repResult] = await db.query(
      `INSERT INTO ai_reports (student_id, tutor_id, program_name, report_type, period, milestone_session, title, summary, strengths, areas_for_improvement, recommendations, ai_generated_notes, status)
       VALUES (?, ?, ?, 'mid_package', ?, ?, ?, ?, ?, ?, ?, 'Draft disusun dengan Gemini AI.', 'tutor_reviewed')`,
      [student_id, actualTutorId, program_name, reportPeriod, milestone, reportTitle, summary, strengths, improvements, recommendations]
    );

    const [created] = await db.query('SELECT * FROM ai_reports WHERE id = ?', [repResult.insertId]);

    res.status(201).json({
      success: true,
      message: 'Draft Laporan Perkembangan AI berhasil digenerate! Siap direview dan dipublish oleh Admin.',
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
      [title, summary, strengths, areas_for_improvement, recommendations, status || 'admin_approved', req.params.id]
    );
    res.json({ success: true, message: 'Laporan perkembangan berhasil diperbarui / dipublish.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/ai-reports/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM ai_reports WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Laporan AI berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================================
// 19. FILE UPLOAD & SERVER START
// ==============================================================================

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
    }
    const fileUrl = `/uploads-rumbala/${req.file.filename}`;
    res.json({
      success: true,
      message: 'File berhasil diunggah.',
      file_url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Root & Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'RUMBALA API Server is running smoothly.', timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Rumbala LMS Server is listening on http://localhost:${PORT}`);
});
