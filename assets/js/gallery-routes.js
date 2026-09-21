// ------------------------------------------------------------
// Handles the "gallery" table: public read route for gallery.html,
// protected admin CRUD routes for the admin dashboard.
// ------------------------------------------------------------

const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../../server/db");
const { requireAuth } = require("../../server/auth");
const upload = require("./uploads");

const router = express.Router();

// ------------------------------------------------------------
// PUBLIC: GET /api/gallery
//   ?category=Events  -> only that category (used for filtering)
// ------------------------------------------------------------
router.get("/gallery", async (req, res) => {
  try {
    const { category } = req.query;
    let sql = "SELECT * FROM gallery";
    const params = [];
    if (category) {
      sql += " WHERE category = ?";
      params.push(category);
    }
    sql += " ORDER BY created_at DESC, id DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load gallery." });
  }
});

// ------------------------------------------------------------
// PROTECTED: POST /api/admin/gallery
// ------------------------------------------------------------
router.post("/admin/gallery", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || !req.file) {
      return res.status(400).json({ message: "Title and image are required." });
    }
    const imagePath = `/uploads/${req.file.filename}`;

    const [result] = await pool.query(
      "INSERT INTO gallery (title, category, image) VALUES (?,?,?)",
      [title, category || "General", imagePath]
    );
    res.status(201).json({ id: result.insertId, message: "Gallery image added." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save gallery image." });
  }
});

// ------------------------------------------------------------
// PROTECTED: PUT /api/admin/gallery/:id
// ------------------------------------------------------------
router.put("/admin/gallery/:id", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required." });

    const [existingRows] = await pool.query("SELECT image FROM gallery WHERE id = ?", [id]);
    if (!existingRows.length) return res.status(404).json({ message: "Gallery image not found." });

    let imagePath = existingRows[0].image;
    if (req.file) {
      if (imagePath && imagePath.startsWith("/uploads/")) {
        fs.unlink(path.join(__dirname, "..", "..", imagePath), () => {});
      }
      imagePath = `/uploads/${req.file.filename}`;
    }

    await pool.query(
      "UPDATE gallery SET title=?, category=?, image=? WHERE id=?",
      [title, category || "General", imagePath, id]
    );
    res.json({ message: "Gallery image updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update gallery image." });
  }
});

// ------------------------------------------------------------
// PROTECTED: DELETE /api/admin/gallery/:id
// ------------------------------------------------------------
router.delete("/admin/gallery/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT image FROM gallery WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Gallery image not found." });

    if (rows[0].image && rows[0].image.startsWith("/uploads/")) {
      fs.unlink(path.join(__dirname, "..", "..", rows[0].image), () => {});
    }
    await pool.query("DELETE FROM gallery WHERE id = ?", [id]);
    res.json({ message: "Gallery image deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete gallery image." });
  }
});

module.exports = router;
