-- ==============================================================================
-- MIGRATION: 2026_08_27_000003_complete_admin_portal_revision.sql
-- DESCRIPTION: Tabel Settings, Program Master, Unit Master, Tutor Rates, 
--              Dukungan Multi-Program, Evaluasi Fleksibel, Transport Home Visit,
--              dan Rekap Kehadiran/Honor Tutor.
-- DATABASE: MySQL 5.7+ / MySQL 8.0+
-- ==============================================================================

USE `rumbala_db`;

-- 1. Table Settings
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key_name` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default settings if empty
INSERT IGNORE INTO `settings` (`key_name`, `value`, `description`, `category`) VALUES
('spp_due_date_day', '10', 'Tanggal jatuh tempo tagihan SPP bulanan (setiap tanggal X)', 'spp'),
('spp_invoice_prefix', 'INV/RBL/', 'Prefix nomor invoice tagihan SPP', 'spp'),
('default_home_visit_transport', '25000', 'Tarif transport standar untuk Privat Home Visit per sesi (Rp)', 'honor'),
('admin_whatsapp', '6281234567890', 'Nomor WhatsApp resmi admin untuk reminder dan informasi', 'contact'),
('bank_account_info', 'BCA 1234567890 a/n Rumah Belajar Rumbala', 'Rekening resmi pembayaran SPP & Tagihan', 'payment'),
('leave_policy_days_prior', '1', 'Batas minimal pengajuan izin/reschedule (hari sebelum sesi)', 'reschedule'),
('forfeited_unexcused_sessions', 'true', 'Ketentuan sesi hangus jika alfa / tidak ada kabar', 'reschedule');

-- 2. Enhance Programs Table with Evaluation Types
ALTER TABLE `programs` 
  ADD COLUMN IF NOT EXISTS `code` VARCHAR(50) NULL AFTER `name`,
  ADD COLUMN IF NOT EXISTS `evaluation_type` ENUM('math', 'english', 'prisma', 'mengaji', 'tahfidz', 'general') NOT NULL DEFAULT 'general' AFTER `category`,
  ADD COLUMN IF NOT EXISTS `default_fee_per_session` DECIMAL(12, 2) NOT NULL DEFAULT 45000.00 AFTER `default_fee`,
  ADD COLUMN IF NOT EXISTS `default_tutor_fee` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00 AFTER `default_fee_per_session`,
  ADD COLUMN IF NOT EXISTS `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER `description`;

-- Seed / update master programs with standard RUMBALA curriculum
INSERT INTO `programs` (`name`, `code`, `category`, `evaluation_type`, `default_fee`, `default_fee_per_session`, `default_tutor_fee`, `description`, `status`) VALUES
('Pracalis Calistung', 'PRACALIS', 'pracalis', 'general', 300000.00, 37500.00, 70000.00, 'Program dasar membaca, menulis, dan berhitung untuk usia dini.', 'active'),
('Prisma Kalkulator Tangan', 'PRISMA', 'akademik', 'prisma', 350000.00, 43750.00, 75000.00, 'Metode berhitung cepat dengan kalkulator tangan & ketelitian tinggi.', 'active'),
('Cermat Matematika', 'CR-MTK', 'akademik', 'math', 350000.00, 43750.00, 80000.00, 'Bimbingan logika matematika, konsep, ketelitian, dan problem solving HOTS.', 'active'),
('Abama Baca Cerdas', 'ABAMA', 'bahasa', 'general', 300000.00, 37500.00, 70000.00, 'Metode cepat dan menyenangkan belajar membaca tanpa mengeja.', 'active'),
('English BEC', 'ENG-BEC', 'bahasa', 'english', 375000.00, 46875.00, 85000.00, 'English Basic & Everyday Conversation, Vocabulary, Grammar, Speaking.', 'active'),
('Mengaji & Tahsin', 'MENGAJI', 'quran', 'mengaji', 300000.00, 37500.00, 75000.00, 'Bimbingan tartil, makhraj, panjang pendek, dan hukum tajwid.', 'active'),
('Tahfidz Al-Qur\'an', 'TAHFIDZ', 'quran', 'tahfidz', 350000.00, 43750.00, 80000.00, 'Program hafalan mutqin, murojaah harian, dan setoran hafalan surah.', 'active'),
('Mapel Arab', 'ARAB', 'bahasa', 'general', 325000.00, 40625.00, 75000.00, 'Penguasaan kosakata dasar dan percakapan bahasa Arab.', 'active')
ON DUPLICATE KEY UPDATE 
  `evaluation_type` = VALUES(`evaluation_type`),
  `default_fee` = VALUES(`default_fee`),
  `default_tutor_fee` = VALUES(`default_tutor_fee`);

-- 3. Enhance Units Table
ALTER TABLE `units`
  ADD COLUMN IF NOT EXISTS `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER `phone`;

INSERT INTO `units` (`name`, `address`, `phone`, `status`) VALUES
('Unit Riscon Rancaekek', 'Perumahan Riscon Grand Dago Blok A1 No. 5, Rancaekek, Kab. Bandung', '081234567801', 'active'),
('Unit Panorama Jatinangor', 'Perum Panorama Jatinangor Blok B3 No. 12, Jatinangor, Sumedang', '081234567802', 'active'),
('Rumah Belajar Pusat', 'Komplek Edukasi Rumbala No. 88, Bandung Timur', '081234567800', 'active')
ON DUPLICATE KEY UPDATE `status` = 'active';

-- 4. Tutor Rates Table (Fee per Program & Class Type + Transport)
CREATE TABLE IF NOT EXISTS `tutor_rates` (
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

-- Seed Sample Tutor Rates
INSERT IGNORE INTO `tutor_rates` (`tutor_id`, `program_name`, `class_type`, `duration_minutes`, `rate_per_session`, `transport_fee`) VALUES
(1, 'Cermat Matematika', 'Semi Privat', 90, 80000.00, 0.00),
(1, 'Cermat Matematika', 'Privat di Tempat Les', 90, 90000.00, 0.00),
(1, 'Cermat Matematika', 'Privat Home Visit', 90, 95000.00, 25000.00),
(1, 'Mengaji & Tahsin', 'Semi Privat', 60, 75000.00, 0.00),
(1, 'Mengaji & Tahsin', 'Privat Home Visit', 60, 85000.00, 25000.00),
(2, 'English BEC', 'Privat di Tempat Les', 90, 95000.00, 0.00),
(2, 'English BEC', 'Online Privat', 90, 90000.00, 0.00),
(2, 'English BEC', 'Privat Home Visit', 90, 100000.00, 30000.00);

-- 5. Enhance Schedules Table
ALTER TABLE `schedules`
  ADD COLUMN IF NOT EXISTS `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat' AFTER `unit_name`,
  ADD COLUMN IF NOT EXISTS `duration_minutes` INT NOT NULL DEFAULT 90 AFTER `end_time`,
  ADD COLUMN IF NOT EXISTS `is_home_visit` TINYINT(1) NOT NULL DEFAULT 0 AFTER `location_type`,
  ADD COLUMN IF NOT EXISTS `home_address` TEXT NULL AFTER `is_home_visit`;

-- 6. Enhance Attendances Table
ALTER TABLE `attendances`
  ADD COLUMN IF NOT EXISTS `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat' AFTER `unit_name`,
  ADD COLUMN IF NOT EXISTS `is_home_visit` TINYINT(1) NOT NULL DEFAULT 0 AFTER `class_type`,
  ADD COLUMN IF NOT EXISTS `duration_minutes` INT NOT NULL DEFAULT 90 AFTER `end_time`,
  ADD COLUMN IF NOT EXISTS `tutor_session_fee` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00 AFTER `billed`,
  ADD COLUMN IF NOT EXISTS `tutor_transport_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `tutor_session_fee`,
  ADD COLUMN IF NOT EXISTS `tutor_total_honor` DECIMAL(12, 2) NOT NULL DEFAULT 75000.00 AFTER `tutor_transport_fee`;

-- 7. Enhance Journals Table
ALTER TABLE `journals`
  ADD COLUMN IF NOT EXISTS `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat' AFTER `unit_name`,
  ADD COLUMN IF NOT EXISTS `eval_data_json` JSON NULL AFTER `score`;

-- 8. Enhance Invoices Table
ALTER TABLE `invoices`
  ADD COLUMN IF NOT EXISTS `period_month` VARCHAR(20) NOT NULL DEFAULT '2026-08' AFTER `invoice_number`,
  ADD COLUMN IF NOT EXISTS `items_json` JSON NULL AFTER `notes`,
  ADD COLUMN IF NOT EXISTS `package_sessions` INT NOT NULL DEFAULT 8 AFTER `amount`,
  ADD COLUMN IF NOT EXISTS `sessions_completed` INT NOT NULL DEFAULT 0 AFTER `package_sessions`;

-- 9. Enhance Reschedule Requests Table
ALTER TABLE `reschedule_requests`
  ADD COLUMN IF NOT EXISTS `program_name` VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika' AFTER `student_id`,
  ADD COLUMN IF NOT EXISTS `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek' AFTER `program_name`,
  ADD COLUMN IF NOT EXISTS `class_type` VARCHAR(100) NOT NULL DEFAULT 'Semi Privat' AFTER `unit_name`,
  ADD COLUMN IF NOT EXISTS `session_decision` ENUM('valid', 'forfeited') NOT NULL DEFAULT 'valid' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `admin_notes` TEXT NULL AFTER `session_decision`,
  ADD COLUMN IF NOT EXISTS `approved_by` INT NULL AFTER `admin_notes`;

-- 10. Enhance Tutor Honor Recaps Table
ALTER TABLE `tutor_honor_recaps`
  ADD COLUMN IF NOT EXISTS `home_visit_sessions` INT NOT NULL DEFAULT 0 AFTER `total_sessions`,
  ADD COLUMN IF NOT EXISTS `total_transport_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `rate_per_session`,
  ADD COLUMN IF NOT EXISTS `total_teaching_honor` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `total_transport_fee`,
  ADD COLUMN IF NOT EXISTS `breakdown_json` JSON NULL AFTER `notes`;

-- Ensure Sample Multi-Program Data for Keenan Alvaro (student_id = 3)
INSERT INTO `student_programs` (`student_id`, `program_name`, `unit_name`, `class_type`, `tutor_id`, `package_sessions`, `monthly_fee`, `completed_sessions_month`, `schedule_info`, `status`)
VALUES 
(3, 'Cermat Matematika', 'Unit Riscon Rancaekek', 'Semi Privat', 1, 8, 350000.00, 6, 'Senin & Rabu 15:30 - 17:00', 'active'),
(3, 'English BEC', 'Unit Panorama Jatinangor', 'Privat di Tempat Les', 2, 4, 380000.00, 3, 'Jumat 16:00 - 17:30', 'active')
ON DUPLICATE KEY UPDATE `package_sessions` = VALUES(`package_sessions`), `monthly_fee` = VALUES(`monthly_fee`);
