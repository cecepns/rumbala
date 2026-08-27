-- Database Schema for Rumbala Learning Management System
-- Compatible with MySQL 5.7+ and MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `rumbala_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `rumbala_db`;

-- Drop tables if exists in correct foreign key order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `reschedule_requests`;
DROP TABLE IF EXISTS `student_programs`;
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

-- 2. Units Table (Cabang / Unit Belajar Rumbala)
CREATE TABLE `units` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(30) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Programs Master Table (Program Les Rumbala)
CREATE TABLE `programs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `category` ENUM('akademik', 'quran', 'bahasa', 'pracalis', 'lainnya') NOT NULL DEFAULT 'akademik',
  `default_fee` DECIMAL(12, 2) NOT NULL DEFAULT 350000.00,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tutors Table
CREATE TABLE `tutors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NOT NULL,
  `subjects` VARCHAR(255) NOT NULL,
  `units_teaching` VARCHAR(255) NULL DEFAULT 'Unit Riscon Rancaekek, Unit Panorama Jatinangor',
  `class_types` VARCHAR(255) NULL DEFAULT 'Privat, Semi Privat, Online',
  `fee_per_session` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `bio` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Students Table (Anak / Siswa)
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

-- 6. Student Programs Table (Multi-Program per Anak)
CREATE TABLE `student_programs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL,
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `tutor_id` INT NULL,
  `package_sessions` INT NOT NULL DEFAULT 8, -- 4, 8, or 12 sessions/month
  `monthly_fee` DECIMAL(12, 2) NOT NULL DEFAULT 350000.00,
  `completed_sessions_month` INT NOT NULL DEFAULT 0, -- e.g. 4/8
  `schedule_info` VARCHAR(255) NULL, -- e.g. "Senin & Rabu 15.30-17.00"
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Schedules Table
CREATE TABLE `schedules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
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

-- 8. Attendances Table (Riwayat Kehadiran Sesi Les)
CREATE TABLE `attendances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `schedule_id` INT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` ENUM('hadir', 'izin', 'sakit', 'alfa') NOT NULL DEFAULT 'hadir',
  `session_number` INT NOT NULL DEFAULT 1,
  `package_total` INT NOT NULL DEFAULT 8,
  `parent_confirmed` TINYINT(1) NOT NULL DEFAULT 0,
  `billed` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Journals (Teaching Log) Table
CREATE TABLE `journals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `attendance_id` INT NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `tutor_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `session_number` INT NOT NULL DEFAULT 1,
  `package_total` INT NOT NULL DEFAULT 8,
  `date` DATE NOT NULL,
  `topic` VARCHAR(255) NOT NULL,
  `targets_achieved` TEXT NOT NULL,
  `score` DECIMAL(5, 2) NULL,
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

-- 10. Reschedule & Izin Requests Table
CREATE TABLE `reschedule_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL,
  `schedule_id` INT NULL,
  `original_date` DATE NOT NULL,
  `reason` ENUM('izin', 'sakit', 'acara_keluarga', 'lainnya') NOT NULL DEFAULT 'izin',
  `reason_details` TEXT NOT NULL,
  `requested_new_date` DATE NULL,
  `requested_new_time` VARCHAR(50) NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Worksheets Table
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

-- 12. Worksheet Submissions Table
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

-- 13. Invoices Table (Tagihan SPP Bulanan Siswa)
CREATE TABLE `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `period_month` VARCHAR(50) NOT NULL DEFAULT 'Agustus 2026',
  `package_name` VARCHAR(150) NOT NULL DEFAULT 'Paket 8 Pertemuan/Bulan',
  `milestone_name` VARCHAR(100) NOT NULL DEFAULT 'SPP Agustus 2026',
  `sessions_count` INT NOT NULL DEFAULT 8,
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

-- 14. Invoice Items Table (Rincian per Program)
CREATE TABLE `invoice_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `attendance_id` INT NULL,
  `session_date` DATE NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Tutor Honor Recaps Table
CREATE TABLE `tutor_honor_recaps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tutor_id` INT NOT NULL,
  `period_month` VARCHAR(20) NOT NULL,
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

-- 16. AI Reports Table (Laporan Perkembangan Resmi Siswa)
CREATE TABLE `ai_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `tutor_id` INT NULL,
  `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika',
  `report_type` ENUM('daily', 'weekly', 'monthly', 'report_card') NOT NULL DEFAULT 'monthly',
  `period` VARCHAR(100) NOT NULL DEFAULT 'Agustus 2026',
  `title` VARCHAR(255) NOT NULL,
  `summary` TEXT NOT NULL,
  `strengths` TEXT NOT NULL,
  `areas_for_improvement` TEXT NOT NULL,
  `recommendations` TEXT NOT NULL,
  `ai_generated_notes` TEXT NOT NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'published',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tutor_id`) REFERENCES `tutors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- SAMPLE DATA INSERTION (Production-ready default data)
-- ========================================================

-- Insert Units
INSERT INTO `units` (`id`, `name`, `address`, `phone`) VALUES
(1, 'Unit Riscon Rancaekek', 'Perumahan Grand Riscon Rancaekek Blok B2 No. 12, Bandung', '081212788313'),
(2, 'Unit Panorama Jatinangor', 'Perumahan Panorama Jatinangor Blok C No. 5, Sumedang', '081298765432'),
(3, 'Unit Rumah Belajar Pusat', 'Jl. Raya Rancaekek - Jatinangor No. 45, Kab. Bandung', '081212788313');

-- Insert Master Programs
INSERT INTO `programs` (`id`, `name`, `category`, `default_fee`, `description`) VALUES
(1, 'Cermat Matematika', 'akademik', 350000.00, 'Bimbingan konsep matematika dasar hingga pemecahan soal berfikir tingkat tinggi (HOTS).'),
(2, 'English BEC', 'bahasa', 400000.00, 'Basic English Course, vocabulary building, active speaking, & grammar foundation.'),
(3, 'Mengaji & Tahfidz', 'quran', 300000.00, 'Tahsin Al-Qur\'an, kaidah makharijul huruf, tajwid, dan setoran hafalan juz 30.'),
(4, 'Pracalis Calistung', 'pracalis', 280000.00, 'Membaca, menulis, dan berhitung metode fonik menyenangkan untuk usia dini (TK/PAUD).');

-- Insert Default Users (Password is 'password123' bcrypt hashed)
INSERT INTO `users` (`id`, `name`, `email`, `username`, `password`, `role`, `phone`) VALUES
(1, 'Administrator Rumbala', 'admin@rumbala.com', 'admin', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'admin', '081212788313'),
(2, 'Sarah Azzahra, S.Pd', 'sarah.tutor@rumbala.com', 'tutor.sarah', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'tutor', '081234567890'),
(3, 'Budi Santoso, M.Si', 'budi.tutor@rumbala.com', 'tutor.budi', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'tutor', '081298765432'),
(4, 'Ibu Ratna Sari (Wali Keenan & Aisyah)', 'ratna.wali@gmail.com', 'wali.keenan', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'parent', '081388776655'),
(5, 'Pak Hendra (Wali Alicia)', 'hendra.wali@gmail.com', 'wali.alicia', '$2b$10$wE6vYwP9hA7k0lqN9F1Rke6qX5tC3yK7I4g0w0a9B5mN4rQj6fV3W', 'parent', '081577665544');

-- Insert Tutors
INSERT INTO `tutors` (`id`, `user_id`, `name`, `email`, `phone`, `subjects`, `units_teaching`, `class_types`, `fee_per_session`, `status`, `bio`) VALUES
(1, 2, 'Sarah Azzahra, S.Pd', 'sarah.tutor@rumbala.com', '081234567890', 'Cermat Matematika, Mengaji & Tahfidz', 'Unit Riscon Rancaekek, Unit Panorama Jatinangor', 'Privat, Semi Privat', 80000.00, 'active', 'Pengajar Matematika & Tahsin berpengalaman 5 tahun dengan metode kontekstual dan fun learning.'),
(2, 3, 'Budi Santoso, M.Si', 'budi.tutor@rumbala.com', '081298765432', 'English BEC, Fisika & Sains', 'Unit Riscon Rancaekek', 'Privat, Online', 95000.00, 'active', 'Spesialis English Speaking dan Cambridge Curriculum for Kids.');

-- Insert Students (Note: 1 Parent Ibu Ratna id=4 has 2 children: Keenan and Aisyah)
INSERT INTO `students` (`id`, `user_id`, `name`, `nickname`, `birth_date`, `parent_name`, `parent_phone`, `parent_email`, `address`, `class_grade`, `school`, `subjects`, `tuition_fee_per_session`, `status`, `total_sessions_completed`, `unbilled_sessions_count`) VALUES
(1, 4, 'Keenan Alvaro', 'Keenan', '2015-04-12', 'Ibu Ratna Sari', '081388776655', 'ratna.wali@gmail.com', 'Perumahan Grand Riscon Blok C3 No 8', 'Kelas 5 SD', 'SDIT Al-Azhar Rancaekek', 'Cermat Matematika, English BEC, Mengaji & Tahfidz', 100000.00, 'active', 11, 0),
(2, 4, 'Aisyah Alvaro', 'Aisyah', '2019-09-20', 'Ibu Ratna Sari', '081388776655', 'ratna.wali@gmail.com', 'Perumahan Grand Riscon Blok C3 No 8', 'TK B', 'TK Islam Terpadu Annur', 'Pracalis Calistung, Mengaji & Tahfidz', 90000.00, 'active', 6, 0),
(3, 5, 'Alicia Putri', 'Alicia', '2012-08-15', 'Pak Hendra Wijaya', '081577665544', 'hendra.wali@gmail.com', 'Panorama Jatinangor Kav 12', 'Kelas 8 SMP', 'SMPN 1 Jatinangor', 'English BEC, Cermat Matematika', 120000.00, 'active', 8, 0);

-- Insert Student Programs (Multi-Program per Siswa)
INSERT INTO `student_programs` (`id`, `student_id`, `program_name`, `unit_name`, `tutor_id`, `package_sessions`, `monthly_fee`, `completed_sessions_month`, `schedule_info`, `status`) VALUES
-- Keenan: 3 programs
(1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 1, 8, 350000.00, 4, 'Senin & Kamis 15.30–17.00', 'active'),
(2, 1, 'English BEC', 'Unit Riscon Rancaekek', 2, 4, 300000.00, 2, 'Rabu 15.30–17.00', 'active'),
(3, 1, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', 1, 8, 300000.00, 5, 'Selasa & Jumat 16.00–17.30', 'active'),
-- Aisyah: 2 programs
(4, 2, 'Pracalis Calistung', 'Unit Riscon Rancaekek', 1, 8, 280000.00, 4, 'Senin & Rabu 14.00–15.00', 'active'),
(5, 2, 'Mengaji & Tahfidz', 'Unit Riscon Rancaekek', 1, 4, 200000.00, 2, 'Jumat 14.00–15.00', 'active'),
-- Alicia: 1 program
(6, 3, 'English BEC', 'Unit Panorama Jatinangor', 2, 8, 400000.00, 8, 'Selasa & Kamis 16.00–17.30', 'active');

-- Insert Schedules
INSERT INTO `schedules` (`id`, `student_id`, `tutor_id`, `program_name`, `unit_name`, `day_of_week`, `start_time`, `end_time`, `subject`, `location_type`, `status`, `notes`) VALUES
(1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Senin', '15:30:00', '17:00:00', 'Matematika SD Kelas 5', 'offline', 'active', 'Ruang Belajar 1'),
(2, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Kamis', '15:30:00', '17:00:00', 'Matematika SD Kelas 5', 'offline', 'active', 'Ruang Belajar 1'),
(3, 1, 2, 'English BEC', 'Unit Riscon Rancaekek', 'Rabu', '15:30:00', '17:00:00', 'English Speaking & Grammar', 'offline', 'active', 'Lab Bahasa'),
(4, 1, 1, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', 'Selasa', '16:00:00', '17:30:00', 'Tahsin & Tahfidz Juz 30', 'offline', 'active', 'Ruang Mengaji'),
(5, 1, 1, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', 'Jumat', '16:00:00', '17:30:00', 'Tahsin & Tahfidz Juz 30', 'offline', 'active', 'Ruang Mengaji'),
(6, 2, 1, 'Pracalis Calistung', 'Unit Riscon Rancaekek', 'Senin', '14:00:00', '15:00:00', 'Membaca & Berhitung Ceria', 'offline', 'active', 'Ruang Kids'),
(7, 2, 1, 'Mengaji & Tahfidz', 'Unit Riscon Rancaekek', 'Jumat', '14:00:00', '15:00:00', 'Iqro & Hafalan Doa', 'offline', 'active', 'Ruang Kids');

-- Insert Attendances
INSERT INTO `attendances` (`id`, `student_id`, `tutor_id`, `schedule_id`, `program_name`, `unit_name`, `date`, `start_time`, `end_time`, `status`, `session_number`, `package_total`, `parent_confirmed`, `billed`, `notes`) VALUES
(1, 1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', '2026-08-03', '15:30:00', '17:00:00', 'hadir', 1, 8, 1, 1, 'Pertemuan 1/8 berjalan lancar'),
(2, 1, 1, 2, 'Cermat Matematika', 'Unit Riscon Rancaekek', '2026-08-06', '15:30:00', '17:00:00', 'hadir', 2, 8, 1, 1, 'Pertemuan 2/8 sangat aktif'),
(3, 1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', '2026-08-10', '15:30:00', '17:00:00', 'hadir', 3, 8, 1, 1, 'Pertemuan 3/8 tuntas konsep'),
(4, 1, 1, 2, 'Cermat Matematika', 'Unit Riscon Rancaekek', '2026-08-13', '15:30:00', '17:00:00', 'hadir', 4, 8, 1, 1, 'Pertemuan 4/8 - Progress 4/8 Tercapai'),
(5, 1, 2, 3, 'English BEC', 'Unit Riscon Rancaekek', '2026-08-05', '15:30:00', '17:00:00', 'hadir', 1, 4, 1, 1, 'Introduction to Daily Conversations'),
(6, 1, 2, 3, 'English BEC', 'Unit Riscon Rancaekek', '2026-08-12', '15:30:00', '17:00:00', 'hadir', 2, 4, 1, 1, 'Vocabulary & Roleplay'),
(7, 1, 1, 4, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', '2026-08-04', '16:00:00', '17:30:00', 'hadir', 1, 8, 1, 1, 'Tahsin Surah An-Naba'),
(8, 1, 1, 5, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', '2026-08-07', '16:00:00', '17:30:00', 'hadir', 2, 8, 1, 1, 'Hafalan Al-Mulk ayat 1-5'),
(9, 1, 1, 4, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', '2026-08-11', '16:00:00', '17:30:00', 'hadir', 3, 8, 1, 1, 'Tahsin Makhraj & Mad'),
(10, 1, 1, 5, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', '2026-08-14', '16:00:00', '17:30:00', 'hadir', 4, 8, 1, 1, 'Murojaah Juz 30'),
(11, 1, 1, 4, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', '2026-08-18', '16:00:00', '17:30:00', 'hadir', 5, 8, 1, 1, 'Setoran Al-Mulk ayat 6-10');

-- Insert Journals
INSERT INTO `journals` (`id`, `attendance_id`, `student_id`, `tutor_id`, `program_name`, `unit_name`, `session_number`, `package_total`, `date`, `topic`, `targets_achieved`, `score`, `fluency_rating`, `makhraj_rating`, `tajwid_rating`, `memorization_surah`, `murojaah_status`, `progress_notes`, `homework`, `next_target`) VALUES
(1, 1, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 1, 8, '2026-08-03', 'Operasi Pecahan Campuran', 'Mampu menjumlahkan pecahan berbeda penyebut dengan metode KPK.', 88.00, NULL, NULL, NULL, NULL, NULL, 'Keenan sangat cepat memahami konsep KPK penyebut pecahan.', 'Buku Rumbala hal 12 no 1-5', 'Pengurangan dan perkalian pecahan'),
(2, 2, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 2, 8, '2026-08-06', 'Perkalian dan Pembagian Pecahan', 'Menyelesaikan 10 soal cerita pecahan matematika dasar.', 92.00, NULL, NULL, NULL, NULL, NULL, 'Fokus belajar sangat prima, pengerjaan rapih.', 'Latihan mandiri modul Bab 2', 'Desimal dan Persentase'),
(3, 3, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 3, 8, '2026-08-10', 'Konversi Pecahan ke Desimal & Persen', 'Memahami trik cepat pembagian bersusun (porogapit).', 90.00, NULL, NULL, NULL, NULL, NULL, 'Bisa menyelesaikan soal latihan tanpa bantuan tutor.', 'Kerjakan kuis halaman 18', 'Soal HOTS cerita persentase diskon'),
(4, 4, 1, 1, 'Cermat Matematika', 'Unit Riscon Rancaekek', 4, 8, '2026-08-13', 'KPK & FPB Soal Cerita', 'Mampu membedakan tipe soal FPB (pembagian barang) dan KPK (jadwal bersama).', 95.00, NULL, NULL, NULL, NULL, NULL, 'Sangat percaya diri menjawab soal HOTS olimpiade tingkat dasar.', 'Review materi bab 1-3', 'Pengukuran Debit dan Kecepatan'),
(5, 5, 1, 2, 'English BEC', 'Unit Riscon Rancaekek', 1, 4, '2026-08-05', 'Self Introduction & Hobbies', 'Mampu berbicara 3 menit memperkenalkan diri dan hobi dalam Bahasa Inggris.', 85.00, NULL, NULL, NULL, NULL, NULL, 'Pronunciation jelas, perlu sedikit percaya diri saat menjawab spontan.', 'Rekam audio perkenalan 1 menit', 'Simple Present Tense & Daily Routine'),
(6, 6, 1, 2, 'English BEC', 'Unit Riscon Rancaekek', 2, 4, '2026-08-12', 'Daily Routine & Telling Time', 'Menguasai 15 kosakata aktivitas harian dan penggunaan waktu (o\'clock, half past).', 90.00, NULL, NULL, NULL, NULL, NULL, 'Active participation, sangat antusias bermain flashcard.', 'Worksheet English Unit 2', 'Family Members & Describing People'),
(7, 7, 1, 1, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', 1, 8, '2026-08-04', 'Tahsin Makharijul Huruf Halqi & Lisani', 'Membedakan pengucapan huruf Ha (ح) dan Kha (خ) serta Ain (ع).', NULL, 'Baik', 'Sesuai Kaidah', 'Berkembang', 'Surah An-Naba ayat 1-10', 'Lancar', 'Makhraj huruf tenggorokan sudah semakin tepat.', 'Murojaah di rumah 10 menit', 'Tajwid Nun Mati & Tanwin (Idzhar)'),
(8, 8, 1, 1, 'Mengaji & Tahfidz', 'Unit Panorama Jatinangor', 2, 8, '2026-08-07', 'Setoran Hafalan Surah Al-Mulk', 'Menghafal lancar Surah Al-Mulk ayat 1-5 dengan tajwid tartil.', NULL, 'Sangat Lancar', 'Sesuai Kaidah', 'Menguasai', 'Surah Al-Mulk ayat 1-5', 'Lancar', 'Hafalan sangat kuat, intonasi tartil merdu.', 'Murojaah ayat 1-5 persiapan sambung ayat', 'Al-Mulk ayat 6-10');

-- Insert Reschedule Requests
INSERT INTO `reschedule_requests` (`id`, `student_id`, `program_name`, `schedule_id`, `original_date`, `reason`, `reason_details`, `requested_new_date`, `requested_new_time`, `status`, `admin_notes`) VALUES
(1, 1, 'Cermat Matematika', 1, '2026-08-24', 'acara_keluarga', 'Menghadiri acara keluarga di luar kota pada hari Senin sore.', '2026-08-27', '15:30 - 17:00 WIB', 'approved', 'Disetujui Admin. Jadwal pengganti pada Kamis 27 Agustus 2026.');

-- Insert Monthly SPP Invoices
INSERT INTO `invoices` (`id`, `invoice_number`, `student_id`, `period_month`, `package_name`, `milestone_name`, `sessions_count`, `amount`, `due_date`, `status`, `payment_proof_url`, `paid_at`, `notes`) VALUES
(1, 'INV-RMB-202608-001', 1, 'Agustus 2026', 'Paket Multi-Program (Matematika + English + Mengaji)', 'SPP Agustus 2026 – Paket 8 Pertemuan/Bulan – Lunas', 20, 950000.00, '2026-08-10', 'paid', '/uploads-rumbala/sample-payment.png', '2026-08-05 10:30:00', 'Pembayaran SPP Bulan Agustus 2026 Lunas via Transfer BCA.'),
(2, 'INV-RMB-202608-002', 2, 'Agustus 2026', 'Paket Ceria (Pracalis + Mengaji)', 'SPP Agustus 2026 – Paket Calistung & Mengaji – Lunas', 12, 480000.00, '2026-08-10', 'paid', '/uploads-rumbala/sample-payment.png', '2026-08-05 10:35:00', 'Pembayaran SPP Bulan Agustus 2026 Lunas via Transfer BCA.');

-- Insert Invoice Items (Breakdown per Program)
INSERT INTO `invoice_items` (`id`, `invoice_id`, `program_name`, `description`, `amount`) VALUES
(1, 1, 'Cermat Matematika', 'SPP Cermat Matematika (8 Sesi/Bulan - Unit Riscon Rancaekek)', 350000.00),
(2, 1, 'English BEC', 'SPP English BEC (4 Sesi/Bulan - Unit Riscon Rancaekek)', 300000.00),
(3, 1, 'Mengaji & Tahfidz', 'SPP Mengaji & Tahfidz (8 Sesi/Bulan - Unit Panorama Jatinangor)', 300000.00),
(4, 2, 'Pracalis Calistung', 'SPP Pracalis Calistung (8 Sesi/Bulan - Unit Riscon Rancaekek)', 280000.00),
(5, 2, 'Mengaji & Tahfidz', 'SPP Mengaji & Tahfidz Anak (4 Sesi/Bulan - Unit Riscon Rancaekek)', 200000.00);

-- Insert AI Reports (Official Progress Report per Program)
INSERT INTO `ai_reports` (`id`, `student_id`, `tutor_id`, `program_name`, `report_type`, `period`, `title`, `summary`, `strengths`, `areas_for_improvement`, `recommendations`, `ai_generated_notes`, `status`) VALUES
(1, 1, 1, 'Cermat Matematika', 'monthly', 'Agustus 2026', 'Laporan Perkembangan Cermat Matematika – Agustus 2026', 'Ananda Keenan menunjukkan perkembangan pemahaman matematika yang sangat pesat, terutama dalam penguasaan konsep pecahan, KPK, dan FPB pada bulan Agustus ini.', 'Daya tangkap logika sangat cepat, mampu memecahkan soal cerita HOTS secara mandiri, dan teliti dalam perhitungan bersusun.', 'Perlu membiasakan diri menuliskan satuan akhir (misalnya cm, kg, buah) pada langkah penyelesaian soal cerita panjang.', 'Disarankan untuk terus diberikan tantangan soal cerita kontekstual dan apresiasi positif di rumah.', 'Analisis otomatis AI dari 4 pertemuan jurnal dan rata-rata skor 91.25/100.', 'published'),
(2, 1, 2, 'English BEC', 'monthly', 'Agustus 2026', 'Laporan Perkembangan English BEC – Agustus 2026', 'Keenan sangat aktif dalam sesi percakapan Bahasa Inggris harian. Kosakata dan keberanian bicaranya meningkat signifikan.', 'Percaya diri berbicara, pemahaman listening sangat baik saat instruksi berbahasa Inggris.', 'Perlu penguatan dalam pemilihan tenses masa lampau (Past Tense) saat bercerita.', 'Sering diajak menyimak lagu atau cerita pendek berbahasa Inggris di rumah.', 'Analisis performa interaktif sesi speaking dan kuis vocabulary.', 'published'),
(3, 1, 1, 'Mengaji & Tahfidz', 'monthly', 'Agustus 2026', 'Laporan Capaian Mengaji & Tahfidz – Agustus 2026', 'Alhamdulillah, Keenan telah menyelesaikan setoran hafalan Surah Al-Mulk ayat 1-10 dengan kaidah tajwid dan makhraj yang tartil.', 'Makharijul huruf halqi sangat fasih, intonasi bacaan tartil merdu dan bersemangat.', 'Perlu istiqomah meluangkan waktu murojaah harian agar hafalan ayat-ayat sebelumnya tetap mutqin.', 'Dampingi ananda murojaah 10-15 menit ba\'da Maghrib atau Subuh setiap hari.', 'Evaluasi tahsin & tahfidz sesi 1-5.', 'published');

-- Insert Tutor Honor Recaps
INSERT INTO `tutor_honor_recaps` (`id`, `tutor_id`, `period_month`, `total_sessions`, `total_hours`, `rate_per_session`, `total_honor`, `status`, `paid_at`, `notes`) VALUES
(1, 1, '2026-08', 9, 13.50, 80000.00, 720000.00, 'paid', '2026-08-25 15:00:00', 'Honor mengajar 9 sesi terlaksana di Unit Riscon & Panorama.'),
(2, 2, '2026-08', 2, 3.00, 95000.00, 190000.00, 'paid', '2026-08-25 15:00:00', 'Honor mengajar 2 sesi English BEC di Unit Riscon.');
