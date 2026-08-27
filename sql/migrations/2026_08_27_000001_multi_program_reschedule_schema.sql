-- ==============================================================================
-- MIGRATION: 2026_08_27_000001_multi_program_reschedule_schema.sql
-- DESCRIPTION: Migration skema untuk mendukung Multi-Anak, Multi-Program, 
--              Unit Belajar, Permohonan Izin/Reschedule, Evaluasi Fleksibel Jurnal,
--              dan Tagihan SPP Bulanan Rumbala LMS.
-- DATABASE: MySQL 5.7+ / MySQL 8.0+ / MariaDB
-- ==============================================================================

USE `rumbala_db`;

-- ------------------------------------------------------------------------------
-- 1. Buat Tabel Master Unit Belajar
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `units` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(30) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 2. Buat Tabel Master Program Les
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `programs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `category` ENUM('akademik', 'quran', 'bahasa', 'pracalis', 'lainnya') NOT NULL DEFAULT 'akademik',
  `default_fee` DECIMAL(12, 2) NOT NULL DEFAULT 350000.00,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 3. Buat Tabel Relasi Multi-Program per Siswa
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_programs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL,
  `unit_name` VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek',
  `tutor_id` INT NULL,
  `package_sessions` INT NOT NULL DEFAULT 8,
  `monthly_fee` DECIMAL(12, 2) NOT NULL DEFAULT 350000.00,
  `completed_sessions_month` INT NOT NULL DEFAULT 0,
  `schedule_info` VARCHAR(255) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_student_program` (`student_id`, `program_name`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 4. Buat Tabel Permohonan Izin / Reschedule Jadwal
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reschedule_requests` (
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
  INDEX `idx_reschedule_student` (`student_id`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 5. Tambahkan Kolom Tambahan pada Tabel yang Sudah Ada (Idempotent Migration)
-- ------------------------------------------------------------------------------

-- Tutors Table
SET @dbname = DATABASE();
SET @tablename = "tutors";
SET @columnname = "units_teaching";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE tutors ADD COLUMN units_teaching VARCHAR(255) NULL DEFAULT 'Unit Riscon Rancaekek, Unit Panorama Jatinangor' AFTER subjects;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "class_types";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE tutors ADD COLUMN class_types VARCHAR(255) NULL DEFAULT 'Privat, Semi Privat, Online' AFTER units_teaching;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Students Table
SET @tablename = "students";
SET @columnname = "nickname";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE students ADD COLUMN nickname VARCHAR(50) NULL AFTER name, ADD COLUMN birth_date DATE NULL AFTER nickname, ADD COLUMN parent_email VARCHAR(150) NULL AFTER parent_phone, ADD COLUMN address TEXT NULL AFTER parent_email;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Schedules Table
SET @tablename = "schedules";
SET @columnname = "program_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE schedules ADD COLUMN program_name VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika' AFTER tutor_id, ADD COLUMN unit_name VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek' AFTER program_name;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Attendances Table
SET @tablename = "attendances";
SET @columnname = "program_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE attendances ADD COLUMN program_name VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika' AFTER schedule_id, ADD COLUMN unit_name VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek' AFTER program_name, ADD COLUMN package_total INT NOT NULL DEFAULT 8 AFTER session_number;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Journals Table (Flexible Evaluation Rubric)
SET @tablename = "journals";
SET @columnname = "program_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE journals 
     ADD COLUMN program_name VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika' AFTER tutor_id,
     ADD COLUMN unit_name VARCHAR(150) NOT NULL DEFAULT 'Unit Riscon Rancaekek' AFTER program_name,
     ADD COLUMN session_number INT NOT NULL DEFAULT 1 AFTER unit_name,
     ADD COLUMN package_total INT NOT NULL DEFAULT 8 AFTER session_number,
     ADD COLUMN fluency_rating VARCHAR(50) NULL AFTER score,
     ADD COLUMN makhraj_rating VARCHAR(50) NULL AFTER fluency_rating,
     ADD COLUMN tajwid_rating VARCHAR(50) NULL AFTER makhraj_rating,
     ADD COLUMN memorization_surah VARCHAR(150) NULL AFTER tajwid_rating,
     ADD COLUMN murojaah_status VARCHAR(100) NULL AFTER memorization_surah,
     ADD COLUMN next_target VARCHAR(255) NULL AFTER homework;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Invoices Table (Monthly SPP)
SET @tablename = "invoices";
SET @columnname = "period_month";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE invoices 
     ADD COLUMN period_month VARCHAR(50) NOT NULL DEFAULT 'Agustus 2026' AFTER student_id,
     ADD COLUMN package_name VARCHAR(150) NOT NULL DEFAULT 'Paket 8 Pertemuan/Bulan' AFTER period_month;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Invoice Items Table
SET @tablename = "invoice_items";
SET @columnname = "program_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE invoice_items ADD COLUMN program_name VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika' AFTER invoice_id;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- AI Reports Table
SET @tablename = "ai_reports";
SET @columnname = "program_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE ai_reports 
     ADD COLUMN program_name VARCHAR(150) NOT NULL DEFAULT 'Cermat Matematika' AFTER tutor_id,
     ADD COLUMN status ENUM('draft', 'published') NOT NULL DEFAULT 'published' AFTER ai_generated_notes;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ------------------------------------------------------------------------------
-- 6. Insert Data Master Default jika Kosong (Units & Programs)
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `units` (`id`, `name`, `address`, `phone`) VALUES
(1, 'Unit Riscon Rancaekek', 'Perumahan Grand Riscon Rancaekek Blok B2 No. 12, Bandung', '081212788313'),
(2, 'Unit Panorama Jatinangor', 'Perumahan Panorama Jatinangor Blok C No. 5, Sumedang', '081298765432'),
(3, 'Unit Rumah Belajar Pusat', 'Jl. Raya Rancaekek - Jatinangor No. 45, Kab. Bandung', '081212788313');

INSERT IGNORE INTO `programs` (`id`, `name`, `category`, `default_fee`, `description`) VALUES
(1, 'Cermat Matematika', 'akademik', 350000.00, 'Bimbingan konsep matematika dasar hingga pemecahan soal berfikir tingkat tinggi (HOTS).'),
(2, 'English BEC', 'bahasa', 400000.00, 'Basic English Course, vocabulary building, active speaking, & grammar foundation.'),
(3, 'Mengaji & Tahfidz', 'quran', 300000.00, 'Tahsin Al-Qur\'an, kaidah makharijul huruf, tajwid, dan setoran hafalan juz 30.'),
(4, 'Pracalis Calistung', 'pracalis', 280000.00, 'Membaca, menulis, dan berhitung metode fonik menyenangkan untuk usia dini (TK/PAUD).');
