-- ==============================================================================
-- MIGRATION: 2026_10_29_000001_make_journal_notes_nullable.sql
-- DESCRIPTION: Mengubah kolom topic, targets_achieved, dan progress_notes
--              pada tabel journals menjadi NULLable (opsional).
--              Revisi ini memungkinkan pencatatan presensi sesi bimbingan 
--              belajar tanpa keharusan langsung mengisi catatan jurnal materi,
--              sehingga tutor / admin dapat mencatat kehadiran dengan cepat
--              dan melengkapi jurnal kapan saja (tidak wajib diisi di awal).
-- DATABASE: MySQL 5.7+ / MySQL 8.0+ / MariaDB
-- ==============================================================================

-- Opsional: Aktifkan baris di bawah jika nama database belum dipilih di phpMyAdmin / cPanel / CLI:
-- USE `rumbala_db`;

-- 1. Ubah definisi kolom catatan jurnal pada tabel journals agar menjadi opsional (NULLable)
ALTER TABLE `journals` 
  MODIFY COLUMN `topic` VARCHAR(255) NULL DEFAULT 'Sesi Bimbingan',
  MODIFY COLUMN `targets_achieved` TEXT NULL,
  MODIFY COLUMN `progress_notes` TEXT NULL,
  MODIFY COLUMN `homework` TEXT NULL,
  MODIFY COLUMN `next_target` VARCHAR(255) NULL,
  MODIFY COLUMN `attendance_id` INT NULL;

-- 2. Pastikan kolom start_time dan end_time pada attendances memiliki nilai default yang aman
ALTER TABLE `attendances`
  MODIFY COLUMN `start_time` TIME NOT NULL DEFAULT '15:30:00',
  MODIFY COLUMN `end_time` TIME NOT NULL DEFAULT '17:00:00';
