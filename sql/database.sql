-- Database Schema for Rumbala Learning Management System
-- Compatible with MySQL 5.7+ and MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `rumbala_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `rumbala_db`;

-- Drop tables if exists in correct foreign key order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `ai_reports`;
DROP TABLE IF EXISTS `tutor_honor_recaps`;
DROP TABLE IF EXISTS `invoice_items`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `worksheet_submissions`;
DROP TABLE IF EXISTS `worksheets`;
DROP TABLE IF EXISTS `journals`;
DROP TABLE IF EXISTS `attendances`;
DROP TABLE IF EXISTS `schedules`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `tutors`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table (Admin, Tutor, Parent/Student)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'tutor', 'parent') NOT NULL DEFAULT 'parent',
  `phone` VARCHAR(30) NULL,
  `avatar` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tutors Table
CREATE TABLE `tutors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NOT NULL,
  `subjects` VARCHAR(255) NOT NULL,
  `fee_per_session` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `bio` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Students Table
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `name` VARCHAR(150) NOT NULL,
  `parent_name` VARCHAR(150) NOT NULL,
  `parent_phone` VARCHAR(30) NOT NULL,
  `class_grade` VARCHAR(50) NOT NULL,
  `school` VARCHAR(150) NOT NULL,
  `subjects` VARCHAR(255) NOT NULL,
  `tuition_fee_per_session` DECIMAL(12, 2) NOT NULL DEFAULT 100000.00,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `notes` TEXT NULL,
  `total_sessions_completed` INT NOT NULL DEFAULT 0,
  `unbilled_sessions_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Schedules Table
CREATE TABLE `schedules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `day_of_week` ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `location_type` ENUM('offline', 'online') NOT NULL DEFAULT 'offline',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Attendances Table
CREATE TABLE `attendances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `schedule_id` INT NULL,
  `date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` ENUM('hadir', 'izin', 'sakit', 'alfa') NOT NULL DEFAULT 'hadir',
  `session_number` INT NOT NULL DEFAULT 1,
  `parent_confirmed` TINYINT(1) NOT NULL DEFAULT 0,
  `billed` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Journals (Teaching Log) Table
CREATE TABLE `journals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `attendance_id` INT NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `topic` VARCHAR(255) NOT NULL,
  `targets_achieved` TEXT NOT NULL,
  `score` DECIMAL(5, 2) NULL,
  `progress_notes` TEXT NOT NULL,
  `homework` TEXT NULL,
  `attachment_url` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Worksheets Table
CREATE TABLE `worksheets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `grade_level` VARCHAR(50) NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) DEFAULT 'pdf',
  `uploaded_by_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Worksheet Submissions Table
CREATE TABLE `worksheet_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `worksheet_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `score` DECIMAL(5, 2) NULL,
  `feedback` TEXT NULL,
  `status` ENUM('submitted', 'reviewed') NOT NULL DEFAULT 'submitted',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  FOREIGN KEY (`worksheet_id`) REFERENCES `worksheets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Invoices Table
CREATE TABLE `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `milestone_name` VARCHAR(100) NOT NULL DEFAULT 'Paket 4 Pertemuan',
  `sessions_count` INT NOT NULL DEFAULT 4,
  `amount` DECIMAL(12, 2) NOT NULL,
  `due_date` DATE NOT NULL,
  `status` ENUM('unpaid', 'pending_verification', 'paid', 'cancelled') NOT NULL DEFAULT 'unpaid',
  `payment_proof_url` VARCHAR(255) NULL,
  `paid_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Invoice Items Table
CREATE TABLE `invoice_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `attendance_id` INT NULL,
  `session_date` DATE NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Tutor Honor Recaps Table
CREATE TABLE `tutor_honor_recaps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tutor_id` INT NOT NULL,
  `period_month` VARCHAR(20) NOT NULL, -- e.g. "2026-08"
  `total_sessions` INT NOT NULL DEFAULT 0,
  `total_hours` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `rate_per_session` DECIMAL(12, 2) NOT NULL,
  `total_honor` DECIMAL(12, 2) NOT NULL,
  `status` ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
  `paid_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. AI Reports Table
CREATE TABLE `ai_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NULL,
  `report_type` ENUM('daily', 'weekly', 'monthly', 'report_card') NOT NULL DEFAULT 'monthly',
  `period` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `summary` TEXT NOT NULL,
  `strengths` TEXT NOT NULL,
  `areas_for_improvement` TEXT NOT NULL,
  `recommendations` TEXT NOT NULL,
  `ai_generated_notes` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- SAMPLE DATA INSERTION (Production-ready default data)
-- ========================================================

-- Insert Default Users (Password is 'password123' hashed with bcrypt or plain for dev fallback)
INSERT INTO `users` (`id`, `name`, `email`, `username`, `password`, `role`, `phone`) VALUES
(1, 'Administrator Rumbala', 'admin@rumbala.com', 'admin', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'admin', '081212788313'),
(2, 'Sarah Azzahra, S.Pd', 'sarah.tutor@rumbala.com', 'tutor.sarah', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'tutor', '081234567890'),
(3, 'Budi Santoso, M.Si', 'budi.tutor@rumbala.com', 'tutor.budi', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'tutor', '081298765432'),
(4, 'Ibu Ratna (Wali Keenan)', 'ratna.wali@gmail.com', 'wali.keenan', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'parent', '081388776655'),
(5, 'Pak Hendra (Wali Alicia)', 'hendra.wali@gmail.com', 'wali.alicia', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'parent', '081577665544');

-- Insert Tutors
INSERT INTO `tutors` (`id`, `user_id`, `name`, `email`, `phone`, `subjects`, `fee_per_session`, `status`, `bio`) VALUES
(1, 2, 'Sarah Azzahra, S.Pd', 'sarah.tutor@rumbala.com', '081234567890', 'Matematika, IPA SD & SMP', 80000.00, 'active', 'Pengajar Matematika berpengalaman 5 tahun dengan metode kontekstual dan fun learning.'),
(2, 3, 'Budi Santoso, M.Si', 'budi.tutor@rumbala.com', '081298765432', 'Bahasa Inggris, Fisika SMA', 95000.00, 'active', 'Alumni Fisika ITB, spesialis persiapan UTBK dan Cambridge Curriculum.');

-- Insert Students
INSERT INTO `students` (`id`, `user_id`, `name`, `parent_name`, `parent_phone`, `class_grade`, `school`, `subjects`, `tuition_fee_per_session`, `status`, `total_sessions_completed`, `unbilled_sessions_count`) VALUES
(1, 4, 'Keenan Alvaro', 'Ibu Ratna Sari', '081388776655', 'Kelas 5 SD', 'SDIT Al-Azhar', 'Matematika & IPA', 100000.00, 'active', 4, 0),
(2, 5, 'Alicia Putri', 'Pak Hendra Wijaya', '081577665544', 'Kelas 8 SMP', 'SMPN 1 Jakarta', 'Bahasa Inggris', 120000.00, 'active', 3, 3),
(3, NULL, 'Muhammad Rayhan', 'Ibu Dewi Lestari', '081299881122', 'Kelas 11 SMA', 'SMAN 8 Jakarta', 'Fisika & Matematika', 150000.00, 'active', 8, 0);

-- Insert Schedules
INSERT INTO `schedules` (`id`, `student_id`, `tutor_id`, `day_of_week`, `start_time`, `end_time`, `subject`, `location_type`, `status`, `notes`) VALUES
(1, 1, 1, 'Senin', '15:30:00', '17:00:00', 'Matematika', 'offline', 'active', 'Rumah siswa di Komplek Bintaro Indah'),
(2, 1, 1, 'Kamis', '15:30:00', '17:00:00', 'IPA', 'offline', 'active', 'Eksperimen sains sederhana'),
(3, 2, 2, 'Selasa', '16:00:00', '17:30:00', 'Bahasa Inggris', 'online', 'active', 'Zoom Meeting Rumbala'),
(4, 3, 2, 'Rabu', '18:30:00', '20:00:00', 'Fisika', 'offline', 'active', 'Persiapan ujian tengah semester');

-- Insert Attendances
INSERT INTO `attendances` (`id`, `student_id`, `tutor_id`, `schedule_id`, `date`, `start_time`, `end_time`, `status`, `session_number`, `parent_confirmed`, `billed`) VALUES
(1, 1, 1, 1, '2026-08-04', '15:30:00', '17:00:00', 'hadir', 1, 1, 1),
(2, 1, 1, 2, '2026-08-07', '15:30:00', '17:00:00', 'hadir', 2, 1, 1),
(3, 1, 1, 1, '2026-08-11', '15:30:00', '17:00:00', 'hadir', 3, 1, 1),
(4, 1, 1, 2, '2026-08-14', '15:30:00', '17:00:00', 'hadir', 4, 1, 1),
(5, 2, 2, 3, '2026-08-05', '16:00:00', '17:30:00', 'hadir', 1, 1, 0),
(6, 2, 2, 3, '2026-08-12', '16:00:00', '17:30:00', 'hadir', 2, 1, 0),
(7, 2, 2, 3, '2026-08-19', '16:00:00', '17:30:00', 'hadir', 3, 1, 0);

-- Insert Teaching Journals
INSERT INTO `journals` (`id`, `attendance_id`, `student_id`, `tutor_id`, `date`, `topic`, `targets_achieved`, `score`, `progress_notes`, `homework`) VALUES
(1, 1, 1, 1, '2026-08-04', 'Operasi Pecahan Campuran & Desimal', 'Siswa mampu mengubah pecahan biasa ke desimal dan menyelesaikan soal cerita dengan baik.', 88.00, 'Keenan sangat fokus hari ini, daya tangkap konsep operasi matematika meningkat pesat.', 'Latihan soal no. 5-10 di buku Rumbala hal. 24'),
(2, 2, 1, 1, '2026-08-07', 'Sistem Pencernaan Manusia', 'Memahami urutan organ pencernaan serta enzim yang bekerja di lambung dan usus.', 92.00, 'Sangat antusias saat membuat diagram alur pencernaan makanan.', 'Membuat rangkuman fungsi enzim ptialin & pepsin'),
(3, 3, 1, 1, '2026-08-11', 'KPK dan FPB Soal Cerita', 'Mampu membedakan kata kunci kapan menggunakan FPB atau KPK dalam soal aplikasi nyata.', 85.00, 'Sedikit kesulitan saat membaca soal cerita panjang, namun setelah dibimbing berhasil menyelesaikannya.', 'Kerjakan worksheet KPK Rumbala hal 1-2'),
(4, 4, 1, 1, '2026-08-14', 'Review Evaluasi Paket 1 (4 Pertemuan)', 'Penguasaan materi mencapai 90%, siap masuk ke bab selanjutnya geometri bangun ruang.', 90.00, 'Selamat Keenan telah menyelesaikan milestone 4 pertemuan dengan capaian memuaskan!', 'Istirahat dan review materi'),
(5, 5, 2, 2, '2026-08-05', 'Grammar: Past Continuous Tense', 'Memahami rumus dasar S + was/were + Ving dalam konteks narrative text.', 85.00, 'Alicia aktif berbicara dalam Bahasa Inggris selama sesi les online.', 'Tulis 5 kalimat kejadian kemarin sore'),
(6, 6, 2, 2, '2026-08-12', 'Reading Comprehension: Science Articles', 'Mampu menjawab 8/10 soal analisis bacaan artikel populer.', 88.00, 'Vocabulary meningkat, pemahaman idiom masih perlu diperbanyak.', 'Latihan soal TOEFL Junior reading no. 1-15'),
(7, 7, 2, 2, '2026-08-19', 'Speaking Practice: Describing Experiences', 'Kefasihan pengucapan meningkat, penggunaan tenses sudah tepat 80%.', 92.00, 'Sangat percaya diri dalam storytelling dan diskusi.', 'Merekam voice note 1 menit tentang hobi');

-- Insert Invoices (Milestone 4 sessions for Keenan)
INSERT INTO `invoices` (`id`, `invoice_number`, `student_id`, `milestone_name`, `sessions_count`, `amount`, `due_date`, `status`, `paid_at`, `notes`) VALUES
(1, 'INV-202608-001', 1, 'Tagihan Sesi 1 - 4 (Paket 4 Pertemuan)', 4, 400000.00, '2026-08-25', 'paid', '2026-08-18 10:30:00', 'Pembayaran via Transfer BCA, sudah diverifikasi.');

INSERT INTO `invoice_items` (`invoice_id`, `attendance_id`, `session_date`, `description`, `amount`) VALUES
(1, 1, '2026-08-04', 'Sesi Pertemuan Ke-1: Operasi Pecahan Campuran', 100000.00),
(1, 2, '2026-08-07', 'Sesi Pertemuan Ke-2: Sistem Pencernaan Manusia', 100000.00),
(1, 3, '2026-08-11', 'Sesi Pertemuan Ke-3: KPK dan FPB Soal Cerita', 100000.00),
(1, 4, '2026-08-14', 'Sesi Pertemuan Ke-4: Evaluasi Paket 1', 100000.00);

-- Insert Sample Worksheets
INSERT INTO `worksheets` (`id`, `title`, `description`, `subject`, `grade_level`, `file_url`, `file_type`, `uploaded_by_id`) VALUES
(1, 'Modul Pengayaan Matematika Pecahan & Desimal', 'Lembar kerja latihan soal HOTS operasi pecahan campuran dan desimal.', 'Matematika', 'Kelas 5 SD', '/uploads-rumbala/sample-math-grade5.pdf', 'pdf', 2),
(2, 'English Grammar Mastery: Past Tenses & Speaking Cards', 'Worksheet latihan past continuous vs simple past beserta topik speaking cards.', 'Bahasa Inggris', 'Kelas 8 SMP', '/uploads-rumbala/sample-english-grade8.pdf', 'pdf', 3),
(3, 'Bank Soal Fisika Kinematika Gerak Lurus', 'Ringkasan rumus GLB, GLBB, dan 25 variasi soal ujian fisika SMA.', 'Fisika', 'Kelas 11 SMA', '/uploads-rumbala/sample-physics-grade11.pdf', 'pdf', 3);

-- Insert Sample AI Reports
INSERT INTO `ai_reports` (`id`, `student_id`, `tutor_id`, `report_type`, `period`, `title`, `summary`, `strengths`, `areas_for_improvement`, `recommendations`, `ai_generated_notes`) VALUES
(1, 1, 1, 'monthly', 'Agustus 2026', 'Laporan Evaluasi Pembelajaran Bulanan - Keenan Alvaro', 
 'Keenan menunjukkan kemajuan akademis yang sangat signifikan sepanjang bulan Agustus 2026 pada mata pelajaran Matematika dan IPA. Tingkat kehadiran mencapai 100% dengan rata-rata skor latihan 88.75.',
 '1. Daya analisa matematika pada konsep operasi pecahan sangat cepat.\n2. Rasa ingin tahu yang tinggi dalam memahami eksperimen IPA.\n3. Disiplin dalam menyelesaikan tugas dan pekerjaan rumah tepat waktu.',
 '1. Perlu lebih teliti dalam membaca soal cerita cerita matematika yang memiliki informasi jebakan.\n2. Perlu pembiasaan menuliskan satuan dan langkah pengerjaan secara runtut.',
 '1. Lanjutkan latihan mandiri berbasis soal HOTS 10-15 menit per hari.\n2. Pertahankan motivasi belajar dan berikan apresiasi atas pencapaian milestone pertemuan ke-4.',
 'Smart AI Evaluation: Berdasarkan 4 jurnal pembelajaran dan nilai rata-rata 88.75/100, Keenan berada pada kategori Sangat Baik (A). Pola belajar konsisten dan interaksi dua arah dengan tutor berjalan sangat efektif.');
