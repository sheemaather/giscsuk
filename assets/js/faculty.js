// Loads faculty members from the database (via /api/faculty) and
// renders them into #facultyGrid, matching the .faculty-grid-card
// markup/styling already defined in CS.html's <style> block.

const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../../server/db");
const { requireAuth } = require("../../server/auth");
const upload = require("../js/uploads");

const router = express.Router();

const RANKS = ["professor", "associate_professor", "assistant_professor", "lecturer"];

// ------------------------------------------------------------
// PUBLIC: GET /api/departments
// Used by CS.html-style pages (not required there) and by the
// admin dashboard to populate the department dropdown.
// ------------------------------------------------------------
router.get("/departments", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, slug FROM departments ORDER BY name");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load departments." });
  }
});

// ------------------------------------------------------------
// PUBLIC: GET /api/faculty
//   ?department=computer-science  -> only that department (used by each dept page)
//   (no query)                    -> everything, with department name attached
//                                    (used by the admin dashboard's list view)
// ------------------------------------------------------------
router.get("/faculty", async (req, res) => {
  try {
    const { department } = req.query;
    let sql = `
      SELECT f.*, d.name AS department_name, d.slug AS department_slug
      FROM faculty f
      JOIN departments d ON d.id = f.department_id
    `;
    const params = [];

    if (department) {
      sql += " WHERE d.slug = ?";
      params.push(department);
    }

    sql += `
      ORDER BY
        FIELD(f.rank_level, 'professor','associate_professor','assistant_professor','lecturer'),
        f.display_order, f.id
    `;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load faculty." });
  }
});

// ------------------------------------------------------------
// PROTECTED: GET /api/admin/stats
// ------------------------------------------------------------
router.get("/admin/stats", requireAuth, async (req, res) => {
  try {
    const [[{ count: facultyCount }]] = await pool.query("SELECT COUNT(*) AS count FROM faculty");
    const [[{ count: deptCount }]] = await pool.query("SELECT COUNT(*) AS count FROM departments");
    res.json({ faculty: facultyCount, departments: deptCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load stats." });
  }
});

// ------------------------------------------------------------
// PROTECTED: POST /api/admin/faculty
// multipart/form-data with fields + optional "photo" file
// ------------------------------------------------------------
router.post("/admin/faculty", requireAuth, upload.single("photo"), async (req, res) => 
{
  try {
    const {
      department_id, name, designation, rank_level,
      role_title, qualification, bio, display_order
    } = req.body;

    if (!department_id || !name || !designation || !rank_level) {
      return res.status(400).json({ message: "Department, name, designation and rank are required." });
    }
    if (!RANKS.includes(rank_level)) {
      return res.status(400).json({ message: "Invalid rank_level." });
    }

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO faculty
        (department_id, name, designation, rank_level, role_title, qualification, bio, photo, display_order)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        department_id, name, designation, rank_level,
        role_title || null, qualification || null, bio || null,
        photoPath, display_order || 0
      ]
    );

    res.status(201).json({ id: result.insertId, message: "Faculty member added." });
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save faculty member." });
  }
});

// ------------------------------------------------------------
// PROTECTED: PUT /api/admin/faculty/:id
// Photo is optional on edit - if omitted, existing photo is kept.
// ------------------------------------------------------------
router.put("/admin/faculty/:id", requireAuth, upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      department_id, name, designation, rank_level,
      role_title, qualification, bio, display_order
    } = req.body;

    if (!department_id || !name || !designation || !rank_level) {
      return res.status(400).json({ message: "Department, name, designation and rank are required." });
    }
    if (!RANKS.includes(rank_level)) {
      return res.status(400).json({ message: "Invalid rank_level." });
    }

    const [existingRows] = await pool.query("SELECT photo FROM faculty WHERE id = ?", [id]);
    if (!existingRows.length) return res.status(404).json({ message: "Faculty member not found." });

    let photoPath = existingRows[0].photo;
    if (req.file) {
      // remove old photo file if it was a local upload
      if (photoPath && photoPath.startsWith("/uploads/")) {
        const oldFile = path.join(__dirname, "..", "public", photoPath);
        fs.unlink(oldFile, () => {});
      }
      photoPath = `/uploads/${req.file.filename}`;
    }

    await pool.query(
      `UPDATE faculty SET
        department_id=?, name=?, designation=?, rank_level=?,
        role_title=?, qualification=?, bio=?, photo=?, display_order=?
       WHERE id=?`,
      [
        department_id, name, designation, rank_level,
        role_title || null, qualification || null, bio || null,
        photoPath, display_order || 0, id
      ]
    );

    res.json({ message: "Faculty member updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update faculty member." });
  }
});

// ------------------------------------------------------------
// PROTECTED: DELETE /api/admin/faculty/:id
// ------------------------------------------------------------
router.delete("/admin/faculty/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT photo FROM faculty WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Faculty member not found." });

    if (rows[0].photo && rows[0].photo.startsWith("/uploads/")) {
      const filePath = path.join(__dirname, "..", "public", rows[0].photo);
      fs.unlink(filePath, () => {});
    }

    await pool.query("DELETE FROM faculty WHERE id = ?", [id]);
    res.json({ message: "Faculty member deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete faculty member." });
  }
});

module.exports = router;
