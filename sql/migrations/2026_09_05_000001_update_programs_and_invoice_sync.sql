-- ==============================================================================
-- Migration: 2026_09_05_000001_update_programs_and_invoice_sync.sql
-- Description: Update Master Program to 8 Official Programs and align multi-program references
-- ==============================================================================

-- 1. Truncate / Refresh Programs Table with 8 Official Programs
DELETE FROM `programs`;

INSERT INTO `programs` (`id`, `name`, `code`, `category`, `evaluation_type`, `default_fee`, `default_fee_per_session`, `default_tutor_fee`, `description`, `status`) VALUES
(1, 'Pracalis', 'PRACALIS', 'pracalis', 'general', 300000.00, 37500.00, 70000.00, 'Program dasar membaca, menulis, dan berhitung untuk usia dini.', 'active'),
(2, 'Baca Tulis Abama', 'ABAMA', 'bahasa', 'general', 300000.00, 37500.00, 70000.00, 'Metode cepat dan menyenangkan belajar membaca tanpa mengeja.', 'active'),
(3, 'Hitung Prisma kalkulator tangan', 'PRISMA', 'akademik', 'prisma', 350000.00, 43750.00, 75000.00, 'Metode berhitung cepat dengan kalkulator tangan & ketelitian tinggi.', 'active'),
(4, 'Cerdas Matematika', 'CR-MTK', 'akademik', 'math', 350000.00, 43750.00, 80000.00, 'Bimbingan logika matematika, konsep, ketelitian, dan problem solving HOTS.', 'active'),
(5, 'Bahasa inggris BEC', 'ENG-BEC', 'bahasa', 'english', 375000.00, 46875.00, 85000.00, 'English Basic & Everyday Conversation, Vocabulary, Grammar, Speaking.', 'active'),
(6, 'Bahasa Arab ( mapel )', 'ARAB', 'bahasa', 'general', 325000.00, 40625.00, 75000.00, 'Penguasaan kosakata dasar dan percakapan bahasa Arab.', 'active'),
(7, 'Mengaji metode umii & tilawati', 'MENGAJI', 'quran', 'mengaji', 300000.00, 37500.00, 75000.00, 'Bimbingan tartil, makhraj, panjang pendek, dan hukum tajwid metode ummi & tilawati.', 'active'),
(8, 'Tahfidz', 'TAHFIDZ', 'quran', 'tahfidz', 350000.00, 43750.00, 80000.00, 'Program hafalan mutqin, murojaah harian, dan setoran hafalan surah.', 'active');

-- 2. Update existing records in tables where program names might be from old names
UPDATE `student_programs` SET `program_name` = 'Pracalis' WHERE `program_name` IN ('Pracalis Calistung', 'Pracalis Ahe');
UPDATE `student_programs` SET `program_name` = 'Baca Tulis Abama' WHERE `program_name` = 'Abama Baca Cerdas';
UPDATE `student_programs` SET `program_name` = 'Hitung Prisma kalkulator tangan' WHERE `program_name` = 'Prisma Kalkulator Tangan';
UPDATE `student_programs` SET `program_name` = 'Cerdas Matematika' WHERE `program_name` = 'Cermat Matematika';
UPDATE `student_programs` SET `program_name` = 'Bahasa inggris BEC' WHERE `program_name` = 'English BEC';
UPDATE `student_programs` SET `program_name` = 'Bahasa Arab ( mapel )' WHERE `program_name` = 'Mapel Arab';
UPDATE `student_programs` SET `program_name` = 'Mengaji metode umii & tilawati' WHERE `program_name` = 'Mengaji & Tahsin';
UPDATE `student_programs` SET `program_name` = 'Tahfidz' WHERE `program_name` = 'Tahfidz Al-Qur\'an';

UPDATE `schedules` SET `program_name` = 'Pracalis' WHERE `program_name` IN ('Pracalis Calistung', 'Pracalis Ahe');
UPDATE `schedules` SET `program_name` = 'Baca Tulis Abama' WHERE `program_name` = 'Abama Baca Cerdas';
UPDATE `schedules` SET `program_name` = 'Hitung Prisma kalkulator tangan' WHERE `program_name` = 'Prisma Kalkulator Tangan';
UPDATE `schedules` SET `program_name` = 'Cerdas Matematika' WHERE `program_name` = 'Cermat Matematika';
UPDATE `schedules` SET `program_name` = 'Bahasa inggris BEC' WHERE `program_name` = 'English BEC';
UPDATE `schedules` SET `program_name` = 'Bahasa Arab ( mapel )' WHERE `program_name` = 'Mapel Arab';
UPDATE `schedules` SET `program_name` = 'Mengaji metode umii & tilawati' WHERE `program_name` = 'Mengaji & Tahsin';
UPDATE `schedules` SET `program_name` = 'Tahfidz' WHERE `program_name` = 'Tahfidz Al-Qur\'an';

UPDATE `attendances` SET `program_name` = 'Pracalis' WHERE `program_name` IN ('Pracalis Calistung', 'Pracalis Ahe');
UPDATE `attendances` SET `program_name` = 'Baca Tulis Abama' WHERE `program_name` = 'Abama Baca Cerdas';
UPDATE `attendances` SET `program_name` = 'Hitung Prisma kalkulator tangan' WHERE `program_name` = 'Prisma Kalkulator Tangan';
UPDATE `attendances` SET `program_name` = 'Cerdas Matematika' WHERE `program_name` = 'Cermat Matematika';
UPDATE `attendances` SET `program_name` = 'Bahasa inggris BEC' WHERE `program_name` = 'English BEC';
UPDATE `attendances` SET `program_name` = 'Bahasa Arab ( mapel )' WHERE `program_name` = 'Mapel Arab';
UPDATE `attendances` SET `program_name` = 'Mengaji metode umii & tilawati' WHERE `program_name` = 'Mengaji & Tahsin';
UPDATE `attendances` SET `program_name` = 'Tahfidz' WHERE `program_name` = 'Tahfidz Al-Qur\'an';

UPDATE `tutor_rates` SET `program_name` = 'Pracalis' WHERE `program_name` IN ('Pracalis Calistung', 'Pracalis Ahe');
UPDATE `tutor_rates` SET `program_name` = 'Baca Tulis Abama' WHERE `program_name` = 'Abama Baca Cerdas';
UPDATE `tutor_rates` SET `program_name` = 'Hitung Prisma kalkulator tangan' WHERE `program_name` = 'Prisma Kalkulator Tangan';
UPDATE `tutor_rates` SET `program_name` = 'Cerdas Matematika' WHERE `program_name` = 'Cermat Matematika';
UPDATE `tutor_rates` SET `program_name` = 'Bahasa inggris BEC' WHERE `program_name` = 'English BEC';
UPDATE `tutor_rates` SET `program_name` = 'Bahasa Arab ( mapel )' WHERE `program_name` = 'Mapel Arab';
UPDATE `tutor_rates` SET `program_name` = 'Mengaji metode umii & tilawati' WHERE `program_name` = 'Mengaji & Tahsin';
UPDATE `tutor_rates` SET `program_name` = 'Tahfidz' WHERE `program_name` = 'Tahfidz Al-Qur\'an';
