-- ============================================================
-- Knowledge base table for the chatbot's semantic search.
-- Run once: mysql -u root -p gisc_cs < knowledge-base.sql
-- ============================================================

USE gisc_cs;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,   -- 'faculty', 'news', 'notification', 'gallery', 'pdf'
  source_id INT NULL,                 -- the original row's id, when applicable
  title VARCHAR(255),
  content TEXT NOT NULL,              -- the actual text chunk sent to the AI
  embedding LONGTEXT NOT NULL,        -- JSON array of floats (the embedding vector)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
