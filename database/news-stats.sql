-- ============================================================
-- News stats + triggers
-- Run once: mysql -u root -p gisc_portal < news-stats.sql
-- ============================================================

USE gisc_cs;

-- Single-row summary table: total news count + when it last changed.
-- Kept up to date automatically by the triggers below, so the app
-- never has to run COUNT(*) or MAX(updated) queries itself.
CREATE TABLE IF NOT EXISTS news_stats (
  id INT PRIMARY KEY DEFAULT 1,
  total_count INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP NULL
);

INSERT INTO news_stats (id, total_count, last_updated)
VALUES (1, (SELECT COUNT(*) FROM news), NOW())
ON DUPLICATE KEY UPDATE total_count = VALUES(total_count);

DROP TRIGGER IF EXISTS news_after_insert;
DROP TRIGGER IF EXISTS news_after_update;
DROP TRIGGER IF EXISTS news_after_delete;

DELIMITER $$

CREATE TRIGGER news_after_insert AFTER INSERT ON news
FOR EACH ROW
BEGIN
  UPDATE news_stats
  SET total_count = (SELECT COUNT(*) FROM news),
      last_updated = NOW()
  WHERE id = 1;
END$$

CREATE TRIGGER news_after_update AFTER UPDATE ON news
FOR EACH ROW
BEGIN
  UPDATE news_stats
  SET last_updated = NOW()
  WHERE id = 1;
END$$

CREATE TRIGGER news_after_delete AFTER DELETE ON news
FOR EACH ROW
BEGIN
  UPDATE news_stats
  SET total_count = (SELECT COUNT(*) FROM news),
      last_updated = NOW()
  WHERE id = 1;
END$$

DELIMITER ;