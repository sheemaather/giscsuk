const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Uploads are stored in the project-root "uploads" folder
const uploadDir = path.join(__dirname, "..", "..", "uploads");

// Make sure the folder exists (won't error if it already does)
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

// Only allow common image types
function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|jfif|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, png, jfif, gif, webp) are allowed."));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

module.exports = upload;