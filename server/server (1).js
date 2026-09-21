const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();
const db = require("./db");
const { requireAuth } = require("./auth");

const app = express();
const PORT = process.env.PORT || 5000;
const root = path.join(__dirname, "..");
const uploadDir = path.join(root, "uploads");
fs.mkdirSync(uploadDir, {recursive:true});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(root));
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, Date.now()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_"))
});
const upload = multer({storage});

app.get("/api/health", (_,res)=>res.json({ok:true, service:"GISC Computer Science Portal"}));

app.post("/api/auth/login", async (req,res)=>{
  try {
    const [rows] = await db.query("SELECT * FROM admins WHERE username=?", [req.body.username]);
    if (!rows.length || !(await bcrypt.compare(req.body.password, rows[0].password_hash)))
      return res.status(401).json({message:"Invalid username or password"});
    const token = jwt.sign({id:rows[0].id, username:rows[0].username}, process.env.JWT_SECRET || "dev-secret", {expiresIn:"8h"});
    res.json({token, username:rows[0].username});
  } catch(e) { res.status(500).json({message:e.message}); }
});

// --- Public read-only endpoints ---
// NEW: faculty + publications added so the public site can list them
const publicList = {
  subjects: "SELECT * FROM subjects ORDER BY semester, code",
  news: "SELECT * FROM news ORDER BY published_on DESC, id DESC",
  notifications: "SELECT * FROM notifications ORDER BY published_on DESC, id DESC",
  timetable: "SELECT * FROM timetable ORDER BY semester, FIELD(day_name,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), start_time",
  gallery: "SELECT * FROM gallery ORDER BY created_at DESC",
  faculty: "SELECT * FROM faculty ORDER BY display_order, id",
  publications: "SELECT * FROM publications ORDER BY published_on DESC, id DESC"
};

for (const [name, sql] of Object.entries(publicList)) {
  app.get(`/api/${name}`, async (_,res)=>{
    try { const [rows] = await db.query(sql); res.json(rows); }
    catch(e){ res.status(500).json({message:e.message}); }
  });
}

app.get("/api/subjects/:semester", async (req,res)=>{
  try { const [rows]=await db.query("SELECT * FROM subjects WHERE semester=? ORDER BY code",[req.params.semester]); res.json(rows); }
  catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/attendance/student/:roll", async (req,res)=>{
  try {
    const [rows] = await db.query(`
      SELECT s.roll_number,s.name,s.semester,s.section,a.attendance_date,a.check_in,a.check_out,a.status
      FROM students s LEFT JOIN attendance a ON s.id=a.student_id
      WHERE s.roll_number=? ORDER BY a.attendance_date DESC`, [req.params.roll]);
    if(!rows.length) return res.status(404).json({message:"Student not found"});
    res.json(rows);
  } catch(e){res.status(500).json({message:e.message});}
});

app.post("/api/attendance/checkin", async (req,res)=>{
  try {
    const {biometric_id, roll_number, status="Present", source="biometric"} = req.body;
    let rows;
    if (biometric_id) [rows] = await db.query("SELECT * FROM students WHERE biometric_id=?",[biometric_id]);
    else [rows] = await db.query("SELECT * FROM students WHERE roll_number=?",[roll_number]);
    if(!rows.length) return res.status(404).json({message:"Student not found"});
    const student=rows[0];
    await db.query(`
      INSERT INTO attendance(student_id,attendance_date,check_in,status,source)
      VALUES(?,CURDATE(),CURTIME(),?,?)
      ON DUPLICATE KEY UPDATE check_in=VALUES(check_in), status=VALUES(status), source=VALUES(source)`,
      [student.id,status,source]);
    res.json({ok:true, message:"Attendance recorded"});
  } catch(e){res.status(500).json({message:e.message});}
});

// NEW: faculty + publications counts added to dashboard stats
app.get("/api/admin/stats", requireAuth, async (_,res)=>{
  try {
    const [[students]] = await db.query("SELECT COUNT(*) count FROM students");
    const [[subjects]] = await db.query("SELECT COUNT(*) count FROM subjects");
    const [[news]] = await db.query("SELECT COUNT(*) count FROM news");
    const [[gallery]] = await db.query("SELECT COUNT(*) count FROM gallery");
    const [[faculty]] = await db.query("SELECT COUNT(*) count FROM faculty");
    const [[publications]] = await db.query("SELECT COUNT(*) count FROM publications");
    res.json({
      students:students.count, subjects:subjects.count, news:news.count,
      gallery:gallery.count, faculty:faculty.count, publications:publications.count
    });
  } catch(e){res.status(500).json({message:e.message});}
});

// --- Generic admin CRUD ---
// NEW: faculty (photo upload) and publications (file upload) added.
// NEW: fileFields map lets each table use its own upload field name
// instead of always assuming "image".
const tables = {
  subjects: ["semester","code","title","credit_hours","category","outline"],
  news: ["title","body","published_on","image"],
  notifications: ["title","body","published_on","is_important"],
  timetable: ["semester","day_name","start_time","end_time","subject_code","subject_title","teacher","room"],
  gallery: ["title","image","category"],
  faculty: ["name","designation","qualification","email","phone","bio","photo","display_order"],
  publications: ["title","type","body","file","published_on"]
};

const fileFields = {
  gallery: "image",
  news: "image",
  faculty: "photo",
  publications: "file"
};

for (const [table, fields] of Object.entries(tables)) {
  const fileField = fileFields[table]; // undefined for tables with no upload (subjects, notifications, timetable)
  const uploadMiddleware = fileField ? upload.single(fileField) : (req,res,next)=>next();

  app.post(`/api/admin/${table}`, requireAuth, uploadMiddleware, async (req,res)=>{
    try {
      const data={...req.body};
      if(req.file && fileField) data[fileField]="/uploads/"+req.file.filename;
      const cols=fields.filter(f=>data[f]!==undefined);
      const vals=cols.map(c=>data[c]);
      const [result]=await db.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(()=>"?").join(",")})`,vals);
      res.status(201).json({id:result.insertId,message:"Created"});
    } catch(e){res.status(500).json({message:e.message});}
  });

  app.put(`/api/admin/${table}/:id`, requireAuth, uploadMiddleware, async (req,res)=>{
    try {
      const data={...req.body};
      if(req.file && fileField) data[fileField]="/uploads/"+req.file.filename;
      const cols=fields.filter(f=>data[f]!==undefined);
      const vals=cols.map(c=>data[c]);
      await db.query(`UPDATE ${table} SET ${cols.map(c=>c+"=?").join(",")} WHERE id=?`,[...vals,req.params.id]);
      res.json({message:"Updated"});
    } catch(e){res.status(500).json({message:e.message});}
  });

  app.delete(`/api/admin/${table}/:id`, requireAuth, async (req,res)=>{
    try { await db.query(`DELETE FROM ${table} WHERE id=?`,[req.params.id]); res.json({message:"Deleted"}); }
    catch(e){res.status(500).json({message:e.message});}
  });
}

app.post("/api/admin/students", requireAuth, async(req,res)=>{
  try {
    const {roll_number,name,semester,section,email,biometric_id}=req.body;
    const [r]=await db.query("INSERT INTO students(roll_number,name,semester,section,email,biometric_id) VALUES(?,?,?,?,?,?)",[roll_number,name,semester,section,email,biometric_id]);
    res.status(201).json({id:r.insertId});
  } catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/admin/students", requireAuth, async(_,res)=>{
  try { const [rows]=await db.query("SELECT * FROM students ORDER BY semester,roll_number"); res.json(rows); }
  catch(e){res.status(500).json({message:e.message});}
});

app.listen(PORT, ()=>console.log(`GISC CS Portal running at http://localhost:${PORT}`));
