// ------------------------------------------------------------
// Rebuilds the entire knowledge_chunks table from your current
// data: faculty, news, notifications, gallery, and PDF files in
// assets/pub/.
//
// RUN THIS MANUALLY whenever your content changes meaningfully
// (new faculty, new PDFs, edited notices, etc):
//
//     node assets/js/build-knowledge-base.js
//
// It clears and rebuilds the table from scratch each time, so
// it's always safe to re-run.
// ------------------------------------------------------------

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../../server/db");
const { getEmbedding } = require("./embeddings");

// pdf-parse v2.x
const { PDFParse } = require("pdf-parse");

// ---------------------------------------------------------------
// PATHS
// ---------------------------------------------------------------

// Project root:
// C:\Users\zia\OneDrive\Documents\web dev\giscportaltest
const PROJECT_ROOT = "C:\\Users\\zia\\OneDrive\\Documents\\web dev\\giscportaltest";

// PDF folder:
// giscportaltest/assets/pub
const PDF_DIR =
  "C:\\Users\\zia\\OneDrive\\Documents\\web dev\\giscportaltest\\assets\\pub";

// ---------------------------------------------------------------
// TEXT CHUNKING
// ---------------------------------------------------------------

function chunkText(text, maxLen = 800) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n" + para).length > maxLen && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current
        ? current + "\n" + para
        : para;
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ---------------------------------------------------------------
// INSERT KNOWLEDGE CHUNK
// ---------------------------------------------------------------

async function insertChunk(sourceType, sourceId, title, content) {
  const trimmed = content.trim();

  if (!trimmed) return;

  const embedding = await getEmbedding(trimmed);

  await pool.query(
    `INSERT INTO knowledge_chunks
    (source_type, source_id, title, content, embedding)
    VALUES (?, ?, ?, ?, ?)`,
    [
      sourceType,
      sourceId,
      title,
      trimmed,
      JSON.stringify(embedding)
    ]
  );

  console.log(`  + [${sourceType}] ${title}`);
}

// ---------------------------------------------------------------
// FACULTY
// ---------------------------------------------------------------

async function buildFaculty() {
  console.log("Indexing faculty...");

  const [rows] = await pool.query(`
    SELECT f.*, d.name AS department_name
    FROM faculty f
    JOIN departments d ON d.id = f.department_id
  `);

  for (const f of rows) {
    const content =
      `${f.name}, ${f.designation}, Department of ${f.department_name}.` +
      (f.role_title
        ? ` Role: ${f.role_title}.`
        : "") +
      (f.qualification
        ? ` Qualification: ${f.qualification}.`
        : "") +
      (f.bio
        ? ` ${f.bio}`
        : "");

    await insertChunk(
      "faculty",
      f.id,
      f.name,
      content
    );
  }
}

// ---------------------------------------------------------------
// NEWS
// ---------------------------------------------------------------

async function buildNews() {
  console.log("Indexing news...");

  const [rows] = await pool.query(
    "SELECT * FROM news"
  );

  for (const n of rows) {
    const content =
      `News: ${n.title} ` +
      `(published ${n.published_on}). ` +
      `${n.body}`;

    await insertChunk(
      "news",
      n.id,
      n.title,
      content
    );
  }
}

// ---------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------

async function buildNotifications() {
  console.log("Indexing notifications...");

  const [rows] = await pool.query(
    "SELECT * FROM notifications"
  );

  for (const n of rows) {
    const content =
      `Notice: ${n.title} ` +
      `(published ${n.published_on})` +
      (n.is_important
        ? " [IMPORTANT]"
        : "") +
      `. ${n.body}`;

    await insertChunk(
      "notification",
      n.id,
      n.title,
      content
    );
  }
}

// ---------------------------------------------------------------
// GALLERY
// ---------------------------------------------------------------

async function buildGallery() {
  console.log("Indexing gallery...");

  const [rows] = await pool.query(
    "SELECT * FROM gallery"
  );

  for (const g of rows) {
    const content =
      `Gallery photo: "${g.title}" ` +
      `in category ${g.category}.`;

    await insertChunk(
      "gallery",
      g.id,
      g.title,
      content
    );
  }
}

// ---------------------------------------------------------------
// PDF INDEXING
// ---------------------------------------------------------------

async function buildPdfs() {
  console.log("Indexing PDFs...");

  if (!fs.existsSync(PDF_DIR)) {
    console.log(
      `  (no folder found at ${PDF_DIR}, skipping)`
    );
    return;
  }

  const files = fs
    .readdirSync(PDF_DIR)
    .filter(file =>
      file.toLowerCase().endsWith(".pdf")
    );

  for (const file of files) {
    const filePath = path.join(PDF_DIR, file);
    console.log(`  Reading PDF: ${file}`);

    const buffer = fs.readFileSync(filePath);

    const parser = new PDFParse({
      data: buffer
    });

    try {
      const parsed = await parser.getText();

      const chunks = chunkText(parsed.text);

      for (let i = 0; i < chunks.length; i++) {
        await insertChunk(
          "pdf",
          null,
          `${file} (part ${i + 1})`,
          chunks[i]
        );
      }

      console.log(
        `  ✓ ${file}: ${chunks.length} chunks`
      );
    } finally {
      await parser.destroy();
    }
  }
}

// ---------------------------------------------------------------
// STATIC HTML PAGE INDEXING
// ---------------------------------------------------------------

// Folders that should NOT be scanned for HTML knowledge.
//
// assets = CSS, JS, images, PDFs etc.
// node_modules = installed packages
// server = backend source code
// .git = Git files
const EXCLUDED_DIRECTORIES = new Set([
  "node_modules",
  "assets",
  "server",
  ".git",
  ".vscode"
]);

// ---------------------------------------------------------------
// GET ALL HTML FILES
// ---------------------------------------------------------------

function getHtmlFiles(directory, files = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }

  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      if (
        !EXCLUDED_DIRECTORIES.has(entry.name)
      ) {
        getHtmlFiles(fullPath, files);
      }
    } else if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".html")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

// ---------------------------------------------------------------
// CLEAN HTML
// ---------------------------------------------------------------

function htmlToText(html) {
  let text = html;

  // Remove comments
  text = text.replace(
    /<!--[\s\S]*?-->/g,
    " "
  );

  // Remove script sections
  text = text.replace(
    /<script[\s\S]*?<\/script>/gi,
    " "
  );

  // Remove style sections
  text = text.replace(
    /<style[\s\S]*?<\/style>/gi,
    " "
  );

  // Remove noscript
  text = text.replace(
    /<noscript[\s\S]*?<\/noscript>/gi,
    " "
  );

  // Add line breaks for important block elements
  text = text.replace(
    /<\/(p|div|section|article|header|footer|main|aside|nav|li|ul|ol|h1|h2|h3|h4|h5|h6|table|tr|td|th)>/gi,
    "\n"
  );

  // Convert list item openings
  text = text.replace(
    /<li[^>]*>/gi,
    "\n• "
  );

  // Remove all remaining HTML tags
  text = text.replace(
    /<[^>]+>/g,
    " "
  );

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  // Normalize whitespace
  text = text.replace(
    /[ \t]+/g,
    " "
  );

  text = text.replace(
    /\n\s*\n+/g,
    "\n\n"
  );

  return text.trim();
}

// ---------------------------------------------------------------
// STATIC HTML PAGES
// ---------------------------------------------------------------

async function buildStaticPages() {
  console.log("Indexing static HTML pages...");

  const htmlFiles = getHtmlFiles(
    PROJECT_ROOT
  );

  if (htmlFiles.length === 0) {
    console.log(
      "  (no HTML pages found)"
    );
    return;
  }

  console.log(
    `  Found ${htmlFiles.length} HTML page(s).`
  );

  for (const filePath of htmlFiles) {
    try {
      const html = fs.readFileSync(
        filePath,
        "utf8"
      );

      const text = htmlToText(html);

      if (!text) {
        console.log(
          `  (empty page skipped) ${filePath}`
        );
        continue;
      }

      const chunks = chunkText(
        text,
        800
      );

      // Path relative to project root
      const relativePath = path.relative(
        PROJECT_ROOT,
        filePath
      );

      // Friendly page title
      const fileName =
        path.basename(filePath);

      console.log(
        `  Reading page: ${relativePath}`
      );

      for (let i = 0; i < chunks.length; i++) {
        await insertChunk(
          "page",
          null,
          `${fileName} (part ${i + 1})`,
          chunks[i]
        );
      }

      console.log(
        `  ✓ ${relativePath}: ${chunks.length} chunks`
      );

    } catch (error) {
      console.error(
        `  ✗ Failed to index ${filePath}`
      );

      console.error(
        error.message
      );
    }
  }
}

// ---------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "OPENAI_API_KEY is not set in your .env file. " +
      "Add it before running this script."
    );

    process.exit(1);
  }

  console.log(
    "=============================================="
  );

  console.log(
    "Building GISC Knowledge Base"
  );

  console.log(
    "=============================================="
  );

  console.log(
    "Clearing existing knowledge base..."
  );

  await pool.query(
    "TRUNCATE TABLE knowledge_chunks"
  );

  // Database information
  await buildFaculty();
  await buildNews();
  await buildNotifications();
  await buildGallery();

  // Static website pages
  await buildStaticPages();

  // PDF documents
  await buildPdfs();

  console.log(
    "=============================================="
  );

  console.log(
    "Done! Knowledge base rebuilt successfully."
  );

  console.log(
    "=============================================="
  );

  process.exit(0);
}

// ---------------------------------------------------------------
// ERROR HANDLING
// ---------------------------------------------------------------

main().catch(err => {
  console.error(
    "Build failed:",
    err
  );

  process.exit(1);
});
``
