-- Database Schema for Rumbala Learning Management System
-- Compatible with MySQL 5.7+ and MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `rumbala_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `rumbala_db`;

-- Drop tables if exists in correct foreign key order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `reschedule_requests`;
DROP TABLE IF EXISTS `student_programs`;
DROP TABLE IF EXISTS `tutor_rates`;
DROP TABLE IF EXISTS `programs`;
DROP TABLE IF EXISTS `units`;
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

-- 1. Users Table (Admin, Tutor, Parent)
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

-- 2. Settings Table (Pengaturan Global Sistem)
CREATE TABLE `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key_name` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Units Table (Cabang / Unit Belajar Rumbala)
CREATE TABLE `units` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(30) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Programs Master Table (Program Les & Sistem Evaluasi Rumbala)
CREATE TABLE `programs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NULL,
  `category` ENUM('akademik', 'quran', 'bahasa', 'pracalis', 'lainnya') NOT NULL DEFAULT 'akademik',
  `evaluation_type` ENUM('math', 'english', 'prisma', 'mengaji', 'tahfidz', 'general') NOT NULL DEFAULT 'general',
  `default_fee` DECIMAL(12, 2) NOT NULL DEFAULT 350000.00,
  `default_fee_per_session` DECIMAL(12, 2) NOT NULL DEFAULT 43750.00,
  `default_tutor_fee` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00,
  `description` TEXT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tutors Table
CREATE TABLE `tutors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NOT NULL,
  `subjects` VARCHAR(255) NOT NULL,
  `units_teaching` VARCHAR(255) NULL DEFAULT 'Unit Riscon Rancaekek, Unit Panorama Jatinangor',
  `class_types` VARCHAR(255) NULL DEFAULT 'Semi Privat, Privat di Tempat Les, Online Privat, Privat Home Visit',
  `fee_per_session` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `bio` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tutor Rates Table (Tarif Fleksibel per Program & Jenis Kelas + Transport)
CREATE TABLE `tutor_rates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tutor_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL,
  `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat',
  `duration_minutes` INT NOT NULL DEFAULT 90,
  `rate_per_session` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00,
  `transport_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Students Table (Anak / Siswa)
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL, -- ID Orang Tua di tabel users (1 ortu bisa punya > 1 anak)
  `name` VARCHAR(150) NOT NULL,
  `nickname` VARCHAR(50) NULL,
  `birth_date` DATE NULL,
  `parent_name` VARCHAR(150) NOT NULL,
  `parent_phone` VARCHAR(30) NOT NULL,
  `parent_email` VARCHAR(150) NULL,
  `address` TEXT NULL,
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

-- 8. Student Programs Table (Multi-Program per Anak dengan Pengaturan Mandiri)
CREATE TABLE `student_programs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL,
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat',
  `tutor_id` INT NULL,
  `package_sessions` INT NOT NULL DEFAULT 8, -- 4, 8, or 12 sessions/month
  `monthly_fee` DECIMAL(12, 2) NOT NULL DEFAULT 350000.00,
  `completed_sessions_month` INT NOT NULL DEFAULT 0, -- e.g. 6/8
  `schedule_info` VARCHAR(255) NULL, -- e.g. "Senin & Rabu 15.30-17.00"
  `initial_level` VARCHAR(150) NULL,
  `strengths` TEXT NULL,
  `areas_for_improvement` TEXT NULL,
  `learning_targets` TEXT NULL,
  `special_needs` TEXT NULL,
  `important_notes` TEXT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Schedules Table
CREATE TABLE `schedules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat',
  `day_of_week` ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `duration_minutes` INT NOT NULL DEFAULT 90,
  `subject` VARCHAR(100) NOT NULL,
  `location_type` ENUM('offline', 'online') NOT NULL DEFAULT 'offline',
  `is_home_visit` TINYINT(1) NOT NULL DEFAULT 0,
  `home_address` TEXT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Attendances Table (Riwayat Kehadiran Sesi Les)
CREATE TABLE `attendances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `schedule_id` INT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat',
  `is_home_visit` TINYINT(1) NOT NULL DEFAULT 0,
  `date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `duration_minutes` INT NOT NULL DEFAULT 90,
  `status` ENUM('hadir', 'izin', 'sakit', 'alfa') NOT NULL DEFAULT 'hadir',
  `session_number` INT NOT NULL DEFAULT 1,
  `package_total` INT NOT NULL DEFAULT 8,
  `parent_confirmed` TINYINT(1) NOT NULL DEFAULT 0,
  `billed` TINYINT(1) NOT NULL DEFAULT 0,
  `tutor_session_fee` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00,
  `tutor_transport_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tutor_total_honor` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Journals (Teaching Log & Evaluasi Fleksibel Sesi) Table
CREATE TABLE `journals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `attendance_id` INT NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat',
  `session_number` INT NOT NULL DEFAULT 1,
  `package_total` INT NOT NULL DEFAULT 8,
  `date` DATE NOT NULL,
  `topic` VARCHAR(255) NOT NULL,
  `targets_achieved` TEXT NOT NULL,
  `score` DECIMAL(5, 2) NULL,
  `eval_data_json` JSON NULL,
  `fluency_rating` VARCHAR(50) NULL,
  `makhraj_rating` VARCHAR(50) NULL,
  `tajwid_rating` VARCHAR(50) NULL,
  `memorization_surah` VARCHAR(150) NULL,
  `murojaah_status` VARCHAR(100) NULL,
  `progress_notes` TEXT NOT NULL,
  `homework` TEXT NULL,
  `next_target` VARCHAR(255) NULL,
  `attachment_url` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Reschedule & Izin Requests Table
CREATE TABLE `reschedule_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat',
  `schedule_id` INT NULL,
  `original_date` DATE NOT NULL,
  `reason` ENUM('izin', 'sakit', 'acara_keluarga', 'lainnya') NOT NULL DEFAULT 'izin',
  `reason_details` TEXT NOT NULL,
  `requested_new_date` DATE NULL,
  `requested_new_time` VARCHAR(50) NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `session_decision` ENUM('valid', 'forfeited') NOT NULL DEFAULT 'valid',
  `admin_notes` TEXT NULL,
  `approved_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Invoices Table (Tagihan SPP Bulanan Siswa Multi-Program)
CREATE TABLE `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `period_month` VARCHAR(50) NOT NULL DEFAULT 'Agustus 2026',
  `amount` DECIMAL(12, 2) NOT NULL,
  `package_sessions` INT NOT NULL DEFAULT 8,
  `sessions_completed` INT NOT NULL DEFAULT 0,
  `status` ENUM('unpaid', 'paid', 'overdue') NOT NULL DEFAULT 'unpaid',
  `due_date` DATE NOT NULL,
  `paid_at` TIMESTAMP NULL,
  `payment_method` VARCHAR(50) NULL,
  `proof_url` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `items_json` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. AI Reports Table (Laporan Perkembangan AI Berkala)
CREATE TABLE `ai_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `report_type` ENUM('monthly', 'mid_package', 'final_package', 'comprehensive') NOT NULL DEFAULT 'mid_package',
  `period` VARCHAR(50) NOT NULL, -- e.g. "Agustus 2026 - Periode 1"
  `milestone_session` INT NOT NULL DEFAULT 4,
  `title` VARCHAR(255) NOT NULL,
  `summary` TEXT NOT NULL,
  `strengths` TEXT NOT NULL,
  `areas_for_improvement` TEXT NOT NULL,
  `recommendations` TEXT NOT NULL,
  `ai_generated_notes` TEXT NULL,
  `parent_feedback` TEXT NULL,
  `status` ENUM('draft', 'tutor_reviewed', 'admin_approved', 'sent_to_parent') NOT NULL DEFAULT 'tutor_reviewed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Tutor Honor Recaps Table (Rekap Sesi Terlaksana & Transport Home Visit)
CREATE TABLE `tutor_honor_recaps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tutor_id` INT NOT NULL,
  `period_month` VARCHAR(20) NOT NULL, -- e.g. "2026-08"
  `total_sessions` INT NOT NULL DEFAULT 0,
  `home_visit_sessions` INT NOT NULL DEFAULT 0,
  `total_hours` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `rate_per_session` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00,
  `total_transport_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_teaching_honor` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_honor` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
  `paid_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  `breakdown_json` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- Settings
INSERT INTO `settings` (`key_name`, `value`, `description`, `category`) VALUES
('spp_due_date_day', '10', 'Tanggal jatuh tempo tagihan SPP bulanan (setiap tanggal X)', 'spp'),
('spp_invoice_prefix', 'INV/RBL/', 'Prefix nomor invoice tagihan SPP', 'spp'),
('default_home_visit_transport', '25000', 'Tarif transport standar untuk Privat Home Visit per sesi (Rp)', 'honor'),
('admin_whatsapp', '6281234567890', 'Nomor WhatsApp resmi admin untuk reminder dan informasi', 'contact'),
('bank_account_info', 'BCA 1234567890 a/n Rumah Belajar Rumbala', 'Rekening resmi pembayaran SPP & Tagihan', 'payment'),
('leave_policy_days_prior', '1', 'Batas minimal pengajuan izin/reschedule (hari sebelum sesi)', 'reschedule'),
('forfeited_unexcused_sessions', 'true', 'Ketentuan sesi hangus jika alfa / tidak ada kabar', 'reschedule');

-- Units
INSERT INTO `units` (`id`, `name`, `address`, `phone`, `status`) VALUES
(1, 'Unit Riscon Rancaekek', 'Perumahan Riscon Grand Dago Blok A1 No. 5, Rancaekek, Kab. Bandung', '081234567801', 'active'),
(2, 'Unit Panorama Jatinangor', 'Perum Panorama Jatinangor Blok B3 No. 12, Jatinangor, Sumedang', '081234567802', 'active'),
(3, 'Rumah Belajar Pusat', 'Komplek Edukasi Rumbala No. 88, Bandung Timur', '081234567800', 'active');

-- Programs
INSERT INTO `programs` (`id`, `name`, `code`, `category`, `evaluation_type`, `default_fee`, `default_fee_per_session`, `default_tutor_fee`, `description`, `status`) VALUES
(1, 'Pracalis Calistung', 'PRACALIS', 'pracalis', 'general', 300000.00, 37500.00, 70000.00, 'Program dasar membaca, menulis, dan berhitung untuk usia dini.', 'active'),
(2, 'Prisma Kalkulator Tangan', 'PRISMA', 'akademik', 'prisma', 350000.00, 43750.00, 75000.00, 'Metode berhitung cepat dengan kalkulator tangan & ketelitian tinggi.', 'active'),
(3, 'Cermat Matematika', 'CR-MTK', 'akademik', 'math', 350000.00, 43750.00, 80000.00, 'Bimbingan logika matematika, konsep, ketelitian, dan problem solving HOTS.', 'active'),
(4, 'Abama Baca Cerdas', 'ABAMA', 'bahasa', 'general', 300000.00, 37500.00, 70000.00, 'Metode cepat dan menyenangkan belajar membaca tanpa mengeja.', 'active'),
(5, 'English BEC', 'ENG-BEC', 'bahasa', 'english', 375000.00, 46875.00, 85000.00, 'English Basic & Everyday Conversation, Vocabulary, Grammar, Speaking.', 'active'),
(6, 'Mengaji & Tahsin', 'MENGAJI', 'quran', 'mengaji', 300000.00, 37500.00, 75000.00, 'Bimbingan tartil, makhraj, panjang pendek, dan hukum tajwid.', 'active'),
(7, 'Tahfidz Al-Qur\'an', 'TAHFIDZ', 'quran', 'tahfidz', 350000.00, 43750.00, 80000.00, 'Program hafalan mutqin, murojaah harian, dan setoran hafalan surah.', 'active'),
(8, 'Mapel Arab', 'ARAB', 'bahasa', 'general', 325000.00, 40625.00, 75000.00, 'Penguasaan kosakata dasar dan percakapan bahasa Arab.', 'active');

-- Users
INSERT INTO `users` (`id`, `name`, `email`, `username`, `password`, `role`, `phone`) VALUES
(1, 'Admin Rumbala Pusat', 'admin@rumbala.com', 'admin.rumbala', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'admin', '081234567890'),
(2, 'Sarah Azzahra, S.Pd', 'sarah.tutor@rumbala.com', 'tutor.sarah', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'tutor', '081234567890'),
(3, 'Budi Santoso, M.Si', 'budi.tutor@rumbala.com', 'tutor.budi', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'tutor', '081298765432'),
(4, 'Nabila Maharani, S.Hum', 'nabila.tutor@rumbala.com', 'tutor.nabila', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'tutor', '081377889900'),
(5, 'Bunda Rina (Ortu Keenan)', 'rina.parent@rumbala.com', 'ortu.rina', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'parent', '081234567890');

-- Tutors
INSERT INTO `tutors` (`id`, `user_id`, `name`, `email`, `phone`, `subjects`, `units_teaching`, `class_types`, `fee_per_session`, `status`, `bio`) VALUES
(1, 2, 'Sarah Azzahra, S.Pd', 'sarah.tutor@rumbala.com', '081234567890', 'Cermat Matematika, Mengaji & Tahsin', 'Unit Riscon Rancaekek, Unit Panorama Jatinangor', 'Semi Privat, Privat di Tempat Les, Privat Home Visit', 80000.00, 'active', 'Pengajar Matematika & Tahsin berpengalaman 5 tahun dengan metode kontekstual dan fun learning.'),
(2, 3, 'Budi Santoso, M.Si', 'budi.tutor@rumbala.com', '081298765432', 'English BEC, Prisma Kalkulator Tangan', 'Unit Panorama Jatinangor, Unit Riscon Rancaekek', 'Privat di Tempat Les, Online Privat, Privat Home Visit', 95000.00, 'active', 'Spesialis English Speaking dan Kalkulator Tangan Cepat.'),
(3, 4, 'Nabila Maharani, S.Hum', 'nabila.tutor@rumbala.com', '081377889900', 'English BEC, Pracalis Calistung', 'Unit Panorama Jatinangor', 'Privat di Tempat Les, Semi Privat', 85000.00, 'active', 'Edukator bahasa inggris anak-anak dengan pendekatan interaktif gamified.');

-- Tutor Rates
INSERT INTO `tutor_rates` (`id`, `tutor_id`, `program_name`, `class_type`, `duration_minutes`, `rate_per_session`, `transport_fee`, `notes`) VALUES
(1, 1, 'Cermat Matematika', 'Semi Privat', 90, 80000.00, 0.00, 'Standar Semi Privat Unit'),
(2, 1, 'Cermat Matematika', 'Privat di Tempat Les', 90, 90000.00, 0.00, 'Privat di Unit Riscon/Panorama'),
(3, 1, 'Cermat Matematika', 'Privat Home Visit', 90, 95000.00, 25000.00, 'Mengajar ke rumah + Transport'),
(4, 1, 'Mengaji & Tahsin', 'Semi Privat', 60, 75000.00, 0.00, 'Semi Privat Tahsin'),
(5, 1, 'Mengaji & Tahsin', 'Privat Home Visit', 60, 85000.00, 25000.00, 'Home Visit Tahsin + Transport'),
(6, 2, 'English BEC', 'Privat di Tempat Les', 90, 95000.00, 0.00, 'Privat Speaking English'),
(7, 2, 'English BEC', 'Online Privat', 90, 90000.00, 0.00, 'Online via Zoom'),
(8, 2, 'English BEC', 'Privat Home Visit', 90, 100000.00, 30000.00, 'Home Visit English + Transport'),
(9, 3, 'English BEC', 'Privat di Tempat Les', 90, 85000.00, 0.00, 'Privat Unit Panorama');

-- Students
INSERT INTO `students` (`id`, `user_id`, `name`, `nickname`, `birth_date`, `parent_name`, `parent_phone`, `parent_email`, `address`, `class_grade`, `school`, `subjects`, `tuition_fee_per_session`, `status`, `notes`, `total_sessions_completed`, `unbilled_sessions_count`) VALUES
(1, 5, 'Keenan Alvaro Pratama', 'Keenan', '2016-04-12', 'Bunda Rina & Ayah Dimas', '081234567890', 'rina.parent@rumbala.com', 'Cluster Grand Riscon Dago Blok C2 No. 8, Rancaekek', 'Kelas 5 SD', 'SDIT Al-Madani Rancaekek', 'Cermat Matematika, English BEC', 100000.00, 'active', 'Siswa aktif, cepat memahami materi logika dan visual.', 6, 0),
(2, 5, 'Nafisa Putri Azzahra', 'Nafisa', '2019-08-20', 'Bunda Rina & Ayah Dimas', '081234567890', 'rina.parent@rumbala.com', 'Cluster Grand Riscon Dago Blok C2 No. 8, Rancaekek', 'Kelas 2 SD', 'SDIT Al-Madani Rancaekek', 'Mengaji & Tahsin, Pracalis Calistung', 85000.00, 'active', 'Anak kedua Bunda Rina, bimbingan tahsin juz 30 & calistung.', 4, 0);

-- Student Programs (Multi Program per Siswa)
INSERT INTO `student_programs` (`id`, `student_id`, `program_name`, `unit_name`, `class_type`, `tutor_id`, `package_sessions`, `monthly_fee`, `completed_sessions_month`, `schedule_info`, `initial_level`, `strengths`, `areas_for_improvement`, `learning_targets`, `special_needs`, `important_notes`, `status`) VALUES
(1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 1, 8, 350000.00, 6, 'Senin & Rabu 15:30 - 17:00', 'Pemahaman Pecahan Dasar (Grade 5)', 'Logika matematika cepat tangkap, antusias dengan soal tantangan', 'Perlu pembiasaan menuliskan langkah runtut pada soal cerita HOTS', 'Menguasai KPK, FPB, Pecahan Campuran, dan Desimal', NULL, 'Lebih termotivasi dengan metode gamifikasi kuis interaktif', 'active'),
(2, 1, 'English BEC', 'Unit Panorama Jatinangor', 'Privat di Tempat Les', 3, 4, 380000.00, 3, 'Jumat 16:00 - 17:30', 'Basic Vocabulary & Daily Phonics', 'Pronunciation bagus dan percaya diri saat speaking', 'Grammar past tense dan vocabulary variatif', 'Mampu presentasi singkat 2 menit dalam Bahasa Inggris', NULL, 'Gunakan flashcards dan storytelling', 'active'),
(3, 2, 'Mengaji & Tahsin', 'Unit Riscon Rancaekek', 'Privat Home Visit', 1, 8, 400000.00, 4, 'Selasa & Kamis 16:00 - 17:00', 'Juz 30 (Surah An-Naba & Al-Mulk)', 'Makhraj huruf halqi fasih, intonasi tartil merdu', 'Konsistensi murojaah mandiri harian di rumah', 'Hafal Mutqin Surah Al-Mulk ayat 1-30', NULL, 'Fokus bimbingan tahsin makharijul huruf & mad', 'active');

-- Schedules
INSERT INTO `schedules` (`id`, `student_id`, `tutor_id`, `program_name`, `unit_name`, `class_type`, `day_of_week`, `start_time`, `end_time`, `duration_minutes`, `subject`, `location_type`, `is_home_visit`, `home_address`, `status`, `notes`) VALUES
(1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 'Senin', '15:30:00', '17:00:00', 90, 'Matematika SD Grade 5', 'offline', 0, NULL, 'active', 'Sesi reguler semi privat di unit'),
(2, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 'Rabu', '15:30:00', '17:00:00', 90, 'Matematika SD Grade 5', 'offline', 0, NULL, 'active', 'Sesi reguler semi privat di unit'),
(3, 1, 3, 'English BEC', 'Unit Panorama Jatinangor', 'Privat di Tempat Les', 'Jumat', '16:00:00', '17:30:00', 90, 'English BEC Conversation', 'offline', 0, NULL, 'active', 'Privat intensif speaking'),
(4, 2, 1, 'Mengaji & Tahsin', 'Unit Riscon Rancaekek', 'Privat Home Visit', 'Selasa', '16:00:00', '17:00:00', 60, 'Tahsin & Tahfidz Quran', 'offline', 1, 'Cluster Grand Riscon Dago Blok C2 No. 8', 'active', 'Tutor datang ke rumah siswa (+Transport)'),
(5, 2, 1, 'Mengaji & Tahsin', 'Unit Riscon Rancaekek', 'Privat Home Visit', 'Kamis', '16:00:00', '17:00:00', 60, 'Tahsin & Tahfidz Quran', 'offline', 1, 'Cluster Grand Riscon Dago Blok C2 No. 8', 'active', 'Tutor datang ke rumah siswa (+Transport)');

-- Attendances
INSERT INTO `attendances` (`id`, `student_id`, `tutor_id`, `schedule_id`, `program_name`, `unit_name`, `class_type`, `is_home_visit`, `date`, `start_time`, `end_time`, `duration_minutes`, `status`, `session_number`, `package_total`, `parent_confirmed`, `billed`, `tutor_session_fee`, `tutor_transport_fee`, `tutor_total_honor`, `notes`) VALUES
(1, 1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 0, '2026-08-03', '15:30:00', '17:00:00', 90, 'hadir', 1, 8, 1, 1, 80000.00, 0.00, 80000.00, 'Sesi 1 Berjalan lancar.'),
(2, 1, 1, 2, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 0, '2026-08-05', '15:30:00', '17:00:00', 90, 'hadir', 2, 8, 1, 1, 80000.00, 0.00, 80000.00, 'Sesi 2 KPK & FPB.'),
(3, 1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 0, '2026-08-10', '15:30:00', '17:00:00', 90, 'hadir', 3, 8, 1, 1, 80000.00, 0.00, 80000.00, 'Sesi 3 Pecahan Desimal.'),
(4, 1, 1, 2, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 0, '2026-08-12', '15:30:00', '17:00:00', 90, 'hadir', 4, 8, 1, 1, 80000.00, 0.00, 80000.00, 'Sesi 4 Evaluasi Mid-Package.'),
(5, 1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 0, '2026-08-17', '15:30:00', '17:00:00', 90, 'hadir', 5, 8, 1, 1, 80000.00, 0.00, 80000.00, 'Sesi 5 Operasi Hitung Campuran.'),
(6, 1, 1, 2, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 0, '2026-08-19', '15:30:00', '17:00:00', 90, 'hadir', 6, 8, 1, 1, 80000.00, 0.00, 80000.00, 'Sesi 6 Soal Cerita HOTS.'),
(7, 1, 3, 3, 'English BEC', 'Unit Panorama Jatinangor', 'Privat di Tempat Les', 0, '2026-08-07', '16:00:00', '17:30:00', 90, 'hadir', 1, 4, 1, 1, 85000.00, 0.00, 85000.00, 'English Session 1 Speaking.'),
(8, 1, 3, 3, 'English BEC', 'Unit Panorama Jatinangor', 'Privat di Tempat Les', 0, '2026-08-14', '16:00:00', '17:30:00', 90, 'hadir', 2, 4, 1, 1, 85000.00, 0.00, 85000.00, 'English Session 2 Vocabulary.'),
(9, 1, 3, 3, 'English BEC', 'Unit Panorama Jatinangor', 'Privat di Tempat Les', 0, '2026-08-21', '16:00:00', '17:30:00', 90, 'hadir', 3, 4, 1, 1, 85000.00, 0.00, 85000.00, 'English Session 3 Storytelling.'),
(10, 2, 1, 4, 'Mengaji & Tahsin', 'Unit Riscon Rancaekek', 'Privat Home Visit', 1, '2026-08-04', '16:00:00', '17:00:00', 60, 'hadir', 1, 8, 1, 1, 85000.00, 25000.00, 110000.00, 'Home Visit Tahsin Session 1.'),
(11, 2, 1, 5, 'Mengaji & Tahsin', 'Unit Riscon Rancaekek', 'Privat Home Visit', 1, '2026-08-06', '16:00:00', '17:00:00', 60, 'hadir', 2, 8, 1, 1, 85000.00, 25000.00, 110000.00, 'Home Visit Tahsin Session 2.');

-- Journals
INSERT INTO `journals` (`id`, `attendance_id`, `student_id`, `tutor_id`, `program_name`, `unit_name`, `class_type`, `session_number`, `package_total`, `date`, `topic`, `targets_achieved`, `score`, `eval_data_json`, `fluency_rating`, `makhraj_rating`, `tajwid_rating`, `memorization_surah`, `murojaah_status`, `progress_notes`, `homework`, `next_target`) VALUES
(1, 1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 1, 8, '2026-08-03', 'Review Bilangan Bulat & KPK', 'Memahami konsep faktorisasi prima dengan pohon faktor.', 88.00, '{"concept_understanding": 90, "accuracy": 85, "problem_solving": 88}', NULL, NULL, NULL, NULL, NULL, 'Fokus belajar baik, antusias menjawab soal cepat.', 'Latihan mandiri no 1-5 di buku fisik', 'Konsep FPB dan soal cerita'),
(2, 2, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 2, 8, '2026-08-05', 'FPB & Aplikasi Soal Cerita', 'Mampu membedakan kata kunci soal cerita KPK vs FPB.', 92.00, '{"concept_understanding": 95, "accuracy": 90, "problem_solving": 90}', NULL, NULL, NULL, NULL, NULL, 'Penyelesaian soal cerita sangat runtut dan teliti.', 'Kuis halaman 12', 'Pecahan biasa dan desimal'),
(3, 3, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 3, 8, '2026-08-10', 'Konversi Pecahan ke Desimal & Persen', 'Memahami trik cepat pembagian bersusun (porogapit).', 90.00, '{"concept_understanding": 90, "accuracy": 88, "problem_solving": 92}', NULL, NULL, NULL, NULL, NULL, 'Bisa menyelesaikan soal latihan tanpa bantuan tutor.', 'Kerjakan kuis halaman 18', 'Soal HOTS cerita persentase diskon'),
(4, 4, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 4, 8, '2026-08-12', 'Evaluasi Mid-Package & Pecahan Campuran', 'Tuntas 15 soal evaluasi dengan skor memuaskan.', 94.00, '{"concept_understanding": 95, "accuracy": 92, "problem_solving": 95}', NULL, NULL, NULL, NULL, NULL, 'Capaian pertemuan 4 dari 8 sangat baik, siap lanjut materi lanjut.', 'Review materi bab 1', 'Perkalian dan pembagian pecahan'),
(5, 7, 1, 3, 'English BEC', 'Unit Panorama Jatinangor', 'Privat di Tempat Les', 1, 4, '2026-08-07', 'Self-Introduction & Hobbies', 'Percaya diri berbicara 10 kalimat pembuka.', 88.00, '{"vocabulary": 85, "grammar": 80, "reading": 90, "speaking": 95, "level": "Intermediate A1"}', NULL, NULL, NULL, NULL, NULL, 'Pengucapan intonasi alami dan aktif bertanya.', 'Rekam audio speaking 1 menit', 'Daily activities vocabulary'),
(6, 10, 2, 1, 'Mengaji & Tahsin', 'Unit Riscon Rancaekek', 'Privat Home Visit', 1, 8, '2026-08-04', 'Tahsin Surah Al-Mulk ayat 1-5', 'Makhraj huruf qaf dan \'\'ain tepat sesuai kaidah.', NULL, '{"kelancaran": "Lancar", "makhraj": "Sangat Baik", "tajwid": "Ikhfa & Idgham Tuntas", "hafalan": "Ayat 1-5 Mutqin"}', 'Sangat Lancar', 'Sesuai Kaidah', 'Menguasai', 'Surah Al-Mulk 1-5', 'Lancar', 'Ananda sangat santun dan fokus selama bimbingan di rumah.', 'Murojaah 3x sebelum tidur', 'Lanjut ayat 6-10');

-- Invoices (Tagihan SPP Bulanan Multi Program)
INSERT INTO `invoices` (`id`, `invoice_number`, `student_id`, `period_month`, `amount`, `package_sessions`, `sessions_completed`, `status`, `due_date`, `paid_at`, `payment_method`, `notes`, `items_json`) VALUES
(1, 'INV/RBL/202608/001', 1, 'Agustus 2026', 730000.00, 12, 9, 'paid', '2026-08-10', '2026-08-08 09:30:00', 'Transfer BCA', 'Tagihan SPP Gabungan 2 Program Bulan Agustus 2026', '[{"program_name": "Cermat Matematika", "unit_name": "Unit Riscon Rancaekek", "class_type": "Semi Privat", "package": 8, "fee": 350000}, {"program_name": "English BEC", "unit_name": "Unit Panorama Jatinangor", "class_type": "Privat di Tempat Les", "package": 4, "fee": 380000}]'),
(2, 'INV/RBL/202608/002', 2, 'Agustus 2026', 400000.00, 8, 4, 'paid', '2026-08-10', '2026-08-09 14:15:00', 'Transfer BCA', 'Tagihan SPP Mengaji Privat Home Visit Agustus 2026', '[{"program_name": "Mengaji & Tahsin", "unit_name": "Unit Riscon Rancaekek", "class_type": "Privat Home Visit", "package": 8, "fee": 400000}]');

-- AI Reports (Laporan Perkembangan Berkala)
INSERT INTO `ai_reports` (`id`, `student_id`, `tutor_id`, `program_name`, `report_type`, `period`, `milestone_session`, `title`, `summary`, `strengths`, `areas_for_improvement`, `recommendations`, `ai_generated_notes`, `status`) VALUES
(1, 1, 1, 'Cermat Matematika', 'mid_package', 'Agustus 2026 (Sesi 1-4)', 4, 'Laporan Perkembangan Belajar Cermat Matematika - Mid Package', 'Ananda Keenan menunjukkan perkembangan signifikan dalam penguasaan KPK, FPB, dan pecahan dalam 4 pertemuan pertama.', 'Daya tangkap logika sangat cepat, antusias memecahkan tantangan hitung cepat, mandiri mengerjakan soal latihan.', 'Perlu sedikit melatih ketelitian penulisan langkah runtut pada soal cerita bertingkat.', 'Lanjutkan latihan soal HOTS terapan kontekstual dan apresiasi ketelitian ananda.', 'AI Model: Analisis konsistensi nilai 88-94 dengan peningkatan pemahaman konsep 15% dari level awal.', 'admin_approved');

-- Tutor Honor Recaps
INSERT INTO `tutor_honor_recaps` (`id`, `tutor_id`, `period_month`, `total_sessions`, `home_visit_sessions`, `total_hours`, `rate_per_session`, `total_transport_fee`, `total_teaching_honor`, `total_honor`, `status`, `paid_at`, `notes`, `breakdown_json`) VALUES
(1, 1, '2026-08', 8, 2, 11.00, 80000.00, 50000.00, 650000.00, 700000.00, 'paid', '2026-08-25 10:00:00', 'Honor Mengajar Sarah Azzahra Periode Agustus 2026 (6 sesi MTK Riscon + 2 sesi Home Visit Tahsin)', '{"programs": [{"name": "Cermat Matematika", "sessions": 6, "rate": 80000, "total": 480000}, {"name": "Mengaji & Tahsin", "sessions": 2, "rate": 85000, "transport": 50000, "total": 220000}]}'),
(2, 3, '2026-08', 3, 0, 4.50, 85000.00, 0.00, 255000.00, 255000.00, 'unpaid', NULL, 'Honor Mengajar Nabila Maharani Periode Agustus 2026 (3 sesi English BEC)', '{"programs": [{"name": "English BEC", "sessions": 3, "rate": 85000, "transport": 0, "total": 255000}]}');
