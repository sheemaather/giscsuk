-- ============================================================
-- GISC Computer Science Portal — Database Schema (cleaned)
-- Safe to run fresh: drops and recreates the whole database.
-- ============================================================

-- ============================================================
-- GISC Sukkur Portal - Database Schema
-- Run this once: mysql -u root -p < db/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS gisc_cs
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE gisc_cs;

-- ------------------------------------------------------------
-- Departments (9 total). "slug" must match the value you put
-- in each department page's <body data-department="..."> attr.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(150) NOT NULL,
  slug  VARCHAR(150) NOT NULL UNIQUE
);

-- Placeholder seed data — EDIT these 9 rows (or add/rename via SQL)
-- to match your real department names. "computer-science" is wired
-- up already since that's what CS.html uses.
INSERT INTO departments (name, slug) VALUES
  ('Computer Science', 'computer-science'),
  ('Mathematics',       'mathematics'),
  ('Physics',           'physics'),
  ('Chemistry',         'chemistry'),
  ('Botany',            'botany'),
  ('Zoology',           'zoology'),
  ('Commerce',          'commerce'),
  ('English',           'english'),
  ('Statistics',        'statistics')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ------------------------------------------------------------
-- Faculty. rank_level drives which layout a member appears in:
--   professor / associate_professor / assistant_professor -> LARGE feature card
--   lecturer                                               -> SMALL grid card
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculty (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  department_id  INT NOT NULL,
  name           VARCHAR(150) NOT NULL,
  designation    VARCHAR(150) NOT NULL,           -- e.g. "Associate Professor, Computer Science"
  rank_level     ENUM('professor','associate_professor','assistant_professor','lecturer') NOT NULL,
  role_title     VARCHAR(150) DEFAULT NULL,       -- e.g. "Head of Department" (feature cards only, optional)
  qualification  VARCHAR(150) DEFAULT NULL,       -- shown on small grid cards
  bio            TEXT DEFAULT NULL,               -- shown on large feature cards
  photo          VARCHAR(255) DEFAULT NULL,       -- stored as "/uploads/filename.jpg"
  display_order  INT DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

-- Helpful index for the common query (filter by department, order by rank)
CREATE INDEX idx_faculty_dept_rank ON faculty (department_id, rank_level, display_order);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  published_on DATE NOT NULL,
  is_important BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);