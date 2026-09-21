// ------------------------------------------------------------
// Handles the "news" and "notifications" tables that power the
// Publications page: public read routes (used by publications.html)
// and protected admin CRUD routes (used by the admin dashboard).
// ------------------------------------------------------------

const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../../server/db");
const { requireAuth } = require("../../server/auth");
const upload = require("./uploads");

const router = express.Router();

// ------------------------------------------------------------
// PUBLIC: GET /api/news
// ------------------------------------------------------------
router.get("/news", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM news ORDER BY published_on DESC, id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load news." });
  }
});

// ------------------------------------------------------------
// PUBLIC: GET /api/news/stats
// Backed by the news_stats table, kept current by DB triggers.
// ------------------------------------------------------------
router.get("/news/stats", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT total_count, last_updated FROM news_stats WHERE id = 1");
    res.json(rows[0] || { total_count: 0, last_updated: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load news stats." });
  }
});

// ------------------------------------------------------------
// PUBLIC: GET /api/notifications
// ------------------------------------------------------------
router.get("/notifications", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM notifications ORDER BY is_important DESC, published_on DESC, id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load notifications." });
  }
});

// ------------------------------------------------------------
// PROTECTED: POST /api/admin/news
// ------------------------------------------------------------
router.post("/admin/news", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { title, body, published_on } = req.body;
    if (!title || !body || !published_on) {
      return res.status(400).json({ message: "Title, body and published date are required." });
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      "INSERT INTO news (title, body, published_on, image) VALUES (?,?,?,?)",
      [title, body, published_on, imagePath]
    );
    res.status(201).json({ id: result.insertId, message: "News item added." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save news item." });
  }
});

// ------------------------------------------------------------
// PROTECTED: PUT /api/admin/news/:id
// ------------------------------------------------------------
router.put("/admin/news/:id", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, published_on } = req.body;
    if (!title || !body || !published_on) {
      return res.status(400).json({ message: "Title, body and published date are required." });
    }

    const [existingRows] = await pool.query("SELECT image FROM news WHERE id = ?", [id]);
    if (!existingRows.length) return res.status(404).json({ message: "News item not found." });

    let imagePath = existingRows[0].image;
    if (req.file) {
      if (imagePath && imagePath.startsWith("/uploads/")) {
        fs.unlink(path.join(__dirname, "..", "..", imagePath), () => {});
      }
      imagePath = `/uploads/${req.file.filename}`;
    }

    await pool.query(
      "UPDATE news SET title=?, body=?, published_on=?, image=? WHERE id=?",
      [title, body, published_on, imagePath, id]
    );
    res.json({ message: "News item updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update news item." });
  }
});

// ------------------------------------------------------------
// PROTECTED: DELETE /api/admin/news/:id
// ------------------------------------------------------------
router.delete("/admin/news/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT image FROM news WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "News item not found." });

    if (rows[0].image && rows[0].image.startsWith("/uploads/")) {
      fs.unlink(path.join(__dirname, "..", "..", rows[0].image), () => {});
    }
    await pool.query("DELETE FROM news WHERE id = ?", [id]);
    res.json({ message: "News item deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete news item." });
  }
});

// ------------------------------------------------------------
// PROTECTED: POST /api/admin/notifications
// ------------------------------------------------------------
router.post("/admin/notifications", requireAuth, async (req, res) => {
  try {
    const { title, body, published_on, is_important } = req.body;
    if (!title || !body || !published_on) {
      return res.status(400).json({ message: "Title, body and published date are required." });
    }
    const important = is_important === "Yes" || is_important === "1" || is_important === true ? 1 : 0;

    const [result] = await pool.query(
      "INSERT INTO notifications (title, body, published_on, is_important) VALUES (?,?,?,?)",
      [title, body, published_on, important]
    );
    res.status(201).json({ id: result.insertId, message: "Notification added." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save notification." });
  }
});

// ------------------------------------------------------------
// PROTECTED: PUT /api/admin/notifications/:id
// ------------------------------------------------------------
router.put("/admin/notifications/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, published_on, is_important } = req.body;
    if (!title || !body || !published_on) {
      return res.status(400).json({ message: "Title, body and published date are required." });
    }
    const important = is_important === "Yes" || is_important === "1" || is_important === true ? 1 : 0;

    const [result] = await pool.query(
      "UPDATE notifications SET title=?, body=?, published_on=?, is_important=? WHERE id=?",
      [title, body, published_on, important, id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Notification not found." });
    res.json({ message: "Notification updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update notification." });
  }
});

// ------------------------------------------------------------
// PROTECTED: DELETE /api/admin/notifications/:id
// ------------------------------------------------------------
router.delete("/admin/notifications/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM notifications WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Notification not found." });
    res.json({ message: "Notification deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete notification." });
  }
});

module.exports = router;