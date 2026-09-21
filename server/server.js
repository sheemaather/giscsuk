const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./auth.js");
const facultyRoutes = require("../assets/js/faculty");
const contentRoutes = require("../assets/js/content");
const galleryRoutes = require("../assets/js/gallery");
const chatRoutes = require("../assets/js/chat");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api", facultyRoutes);
app.use("/api", contentRoutes);
app.use("/api", galleryRoutes);
app.use("/api", chatRoutes);
// Serve uploaded photos + public assets
app.use(express.static(path.join(__dirname, "..", "public")));

// Serve existing static website
app.use(express.static(path.join(__dirname, "..")));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`GISC portal server running on http://localhost:${PORT}`);
});