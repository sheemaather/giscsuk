const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const router = express.Router();

// ------------------------------------------------------------
// Admin credentials
// For now this reads a single admin user from environment
// variables. Set these in your .env file:
//   ADMIN_USERNAME=admin
//   ADMIN_PASSWORD_HASH=<a bcrypt hash, not the plain password>
//
// To generate a hash for a password, run this once in a node
// REPL or a small script:
//   const bcrypt = require("bcryptjs");
//   console.log(bcrypt.hashSync("your-password-here", 10));
// ------------------------------------------------------------
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || null;

// ------------------------------------------------------------
// PUBLIC: POST /api/auth/login
// Body: { username, password }
// Returns: { token }
// ------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    if (!ADMIN_PASSWORD_HASH) {
      console.error("ADMIN_PASSWORD_HASH is not set in .env — login is disabled until it is.");
      return res.status(500).json({ message: "Server auth is not configured yet." });
    }

    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "8h" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed." });
  }
});

// ------------------------------------------------------------
// Middleware: protects admin-only routes
// ------------------------------------------------------------
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = router;
module.exports.requireAuth = requireAuth;