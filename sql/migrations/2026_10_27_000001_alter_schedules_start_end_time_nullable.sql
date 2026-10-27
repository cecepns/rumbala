-- ==============================================================================
-- MIGRATION: 2026_10_27_000001_alter_schedules_start_end_time_nullable.sql
-- DESCRIPTION: Mengubah kolom start_time dan end_time pada tabel schedules
--              menjadi NULLable dengan DEFAULT '00:00:00'.
--              Memungkinkan pembuatan/penyimpanan jadwal fleksibel tanpa 
--              keharusan menentukan jam tertentu di awal atau default 00:00:00.
-- DATABASE: MySQL 5.7+ / MySQL 8.0+ / MariaDB
-- ==============================================================================

-- Opsional: Aktifkan baris di bawah jika nama database Anda adalah rumbala_db dan belum dipilih:
-- USE `rumbala_db`;

-- 1. Ubah definisi kolom start_time dan end_time pada tabel schedules
ALTER TABLE `schedules` 
  MODIFY COLUMN `start_time` TIME NULL DEFAULT '00:00:00',
  MODIFY COLUMN `end_time` TIME NULL DEFAULT '00:00:00';
