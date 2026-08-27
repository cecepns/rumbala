-- ==============================================================================
-- MIGRATION: 2026_08_27_000002_tutor_learning_profile_and_class_type.sql
-- DESCRIPTION: Menambahkan kolom Data Pembelajaran Siswa (Initial Level,
--              Kekuatan, Bagian Perlu Ditingkatkan, Target Pembelajaran,
--              Kebutuhan Khusus) dan Jenis Kelas pada student_programs.
-- DATABASE: MySQL 5.7+ / MySQL 8.0+
-- ==============================================================================

USE `rumbala_db`;

SET @dbname = DATABASE();
SET @tablename = "student_programs";
SET @columnname = "class_type";

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE student_programs 
     ADD COLUMN class_type VARCHAR(100) NOT NULL DEFAULT 'Semi Privat' AFTER unit_name,
     ADD COLUMN initial_level VARCHAR(150) NULL AFTER schedule_info,
     ADD COLUMN strengths TEXT NULL AFTER initial_level,
     ADD COLUMN areas_for_improvement TEXT NULL AFTER strengths,
     ADD COLUMN learning_targets TEXT NULL AFTER areas_for_improvement,
     ADD COLUMN special_needs TEXT NULL AFTER learning_targets,
     ADD COLUMN important_notes TEXT NULL AFTER special_needs;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update sample initial learning profiles
UPDATE `student_programs` SET 
  `class_type` = 'Semi Privat',
  `initial_level` = 'Pemahaman Pecahan Dasar (Grade 5)',
  `strengths` = 'Logika matematika cepat tangkap, antusias dengan soal tantangan',
  `areas_for_improvement` = 'Perlu pembiasaan menuliskan langkah runtut pada soal cerita HOTS',
  `learning_targets` = 'Menguasai KPK, FPB, Pecahan Campuran, dan Desimal',
  `important_notes` = 'Lebih termotivasi dengan metode gamifikasi kuis interaktif'
WHERE `id` = 1;

UPDATE `student_programs` SET 
  `class_type` = 'Privat Home Visit',
  `initial_level` = 'Juz 30 (Surah An-Naba & Al-Mulk)',
  `strengths` = 'Makhraj huruf halqi fasih, intonasi tartil merdu',
  `areas_for_improvement` = 'Konsistensi murojaah mandiri harian di rumah',
  `learning_targets` = 'Hafal Mutqin Surah Al-Mulk ayat 1-30',
  `important_notes` = 'Fokus bimbingan tahsin makharijul huruf & mad'
WHERE `id` = 3;
