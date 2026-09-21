// ---------------------------------------------------------------
// Admin Dashboard — GISC Computer Science Portal
// ---------------------------------------------------------------

const TOKEN = localStorage.getItem("gisc_admin_token");
const USERNAME = localStorage.getItem("gisc_admin_username");

// If there's no token, bounce to login immediately
if (!TOKEN) {
  window.location.href = "login.html";
}

// Config for every section this dashboard manages.
// Add a new entry here to manage another table the same way.
const SECTIONS = {
  faculty: {
    label: "Faculty",

    listFields: [
      "photo",
      "name",
      "designation",
      "qualification",
      "department_name"
    ],

    formFields: [
      {
        name: "department_id",
        label: "Department",
        type: "department",
        required: true
      },

      {
        name: "name",
        label: "Faculty Name",
        type: "text",
        required: true
      },

      {
        name: "designation",
        label: "Designation",
        type: "text",
        required: true
      },

      {
        name: "rank_level",
        label: "Rank",
        type: "select",
        options: [
          "professor",
          "associate_professor",
          "assistant_professor",
          "lecturer"
        ],
        required: true
      },

      {
        name: "role_title",
        label: "Role / Title",
        type: "text"
      },

      {
        name: "qualification",
        label: "Qualification",
        type: "text",
        required: true
      },

      {
        name: "bio",
        label: "Bio",
        type: "textarea"
      },

      {
        name: "display_order",
        label: "Display Order",
        type: "number"
      },

      {
        name: "photo",
        label: "Photo",
        type: "file",
        required: true
      }
    ]
  },

  news: {
    label: "News",
    listFields: ["image", "title", "published_on"],
    formFields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "body", label: "Body", type: "textarea", required: true },
      { name: "published_on", label: "Published On", type: "date", required: true },
      { name: "image", label: "Image (optional)", type: "file" }
    ]
  },
  notifications: {
    label: "Notifications",
    listFields: ["title", "published_on", "is_important"],
    formFields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "body", label: "Body", type: "textarea", required: true },
      { name: "published_on", label: "Published On", type: "date", required: true },
      { name: "is_important", label: "Important?", type: "select", options: ["No", "Yes"] }
    ]
  },
  gallery: {
    label: "Gallery",
    listFields: ["image", "title", "category"],
    formFields: [
      { name: "title", label: "Title", type: "text", required: true },
      { 
        name: "category", 
        label: "Category", 
        type: "select", 
        options: ["Events", "Achievements", "Campus Life", "Sports", "Seminars", "General"] 
      },
      { name: "image", label: "Image", type: "file", required: true }
    ]
  }
};

let activeSection = "faculty";
const app = document.getElementById("adminApp");

// --- Auth-aware fetch wrapper ---
async function apiFetch(url, options = {}) {
  options.headers = { ...(options.headers || {}), Authorization: `Bearer ${TOKEN}` };
  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem("gisc_admin_token");
    localStorage.removeItem("gisc_admin_username");
    window.location.href = "login.html";
    throw new Error("Unauthorized");
  }
  return res;
}

function logout() {
  localStorage.removeItem("gisc_admin_token");
  localStorage.removeItem("gisc_admin_username");
  window.location.href = "login.html";
}

// --- Layout shell ---
function renderShell() {
  app.innerHTML = `
    <div class="admin-topbar">
      <strong>GISC CS Admin</strong>
      <div>
        <span class="text-muted me-3">Signed in as ${USERNAME || "admin"}</span>
        <button class="btn btn-sm btn-outline-danger" id="logoutBtn">Logout</button>
      </div>
    </div>
    <div class="admin-tabs" id="statsRow"></div>
    <div class="admin-tabs" id="tabButtons"></div>
    <div class="admin-content" id="tabContent"></div>
  `;
  document.getElementById("logoutBtn").addEventListener("click", logout);

  const tabButtons = document.getElementById("tabButtons");
  Object.entries(SECTIONS).forEach(([key, cfg]) => {
    const btn = document.createElement("button");
    btn.textContent = cfg.label;
    btn.className = key === activeSection ? "active" : "";
    btn.addEventListener("click", () => {
      activeSection = key;
      renderShell();
    });
    tabButtons.appendChild(btn);
  });

  loadStats();
  loadSection(activeSection);
}

// --- Stats cards ---
async function loadStats() {
  const statsRow = document.getElementById("statsRow");
  try {
    const res = await apiFetch("/api/admin/stats");
    const stats = await res.json();
    statsRow.innerHTML = Object.entries(stats).map(([key, val]) => `
      <div class="stat-card">
        <div class="num">${val}</div>
        <div class="label text-capitalize">${key}</div>
      </div>
    `).join("");
  } catch (e) { /* already redirected on 401 */ }
}

// --- List + form for the active section ---
async function loadSection(key) {
  const cfg = SECTIONS[key];
  const content = document.getElementById("tabContent");
  content.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="m-0">${cfg.label}</h5>
      <button class="btn btn-primary btn-sm" id="addBtn">+ Add ${cfg.label.slice(0, -1) || cfg.label}</button>
    </div>
    <div id="formArea"></div>
    <div id="listArea">Loading…</div>
  `;
  document.getElementById("addBtn").addEventListener("click", () => showForm(key));
  await refreshList(key);
}

async function refreshList(key) {
  const cfg = SECTIONS[key];
  const listArea = document.getElementById("listArea");
  try {
    const res = await fetch(`/api/${key}`); // public GET, no auth needed for reads
    const rows = await res.json();

    if (!rows.length) {
      listArea.innerHTML = `<p class="text-muted">No ${cfg.label.toLowerCase()} yet.</p>`;
      return;
    }

    listArea.innerHTML = rows.map(row => {
      const imageField = cfg.listFields.find(f => ["photo", "image"].includes(f));
      const thumb = imageField && row[imageField]
        ? `<img class="record-thumb" src="${row[imageField]}">`
        : `<div class="record-thumb bg-secondary-subtle"></div>`;

      const textFields = cfg.listFields.filter(f => f !== imageField)
        .map(f => f === "is_important" ? (row[f] ? "⚠ Important" : "") : (row[f] ?? "")).join(" · ");

      return `
        <div class="record-row">
          ${thumb}
          <div class="grow">${textFields}</div>
          <button class="btn btn-sm btn-outline-secondary" data-edit="${row.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-delete="${row.id}">Delete</button>
        </div>
      `;
    }).join("");

    listArea.querySelectorAll("[data-edit]").forEach(btn =>
      btn.addEventListener("click", () => {
        const row = rows.find(r => r.id == btn.dataset.edit);
        showForm(key, row);
      })
    );
    listArea.querySelectorAll("[data-delete]").forEach(btn =>
      btn.addEventListener("click", () => deleteRecord(key, btn.dataset.delete))
    );
  } catch (e) {
    listArea.innerHTML = `<p class="text-danger">Failed to load ${cfg.label.toLowerCase()}.</p>`;
  }
}

// --- Add / edit form ---
function showForm(key, existing = null) {
  const cfg = SECTIONS[key];
  const formArea = document.getElementById("formArea");

  const fieldsHtml = cfg.formFields.map(f => {
    let value = existing ? (existing[f.name] ?? "") : "";
    if (f.name === "is_important" && existing) {
      value = (value === 1 || value === "1" || value === true) ? "Yes" : "No";
    }
    if (f.type === "textarea") {
      return `<div class="mb-2"><label class="form-label">${f.label}</label>
        <textarea class="form-control" name="${f.name}" rows="3">${value}</textarea></div>`;
    }
    if (f.type === "department") {
  return `<div class="mb-2">
            <label class="form-label">${f.label}</label>
            <select class="form-control" name="${f.name}" id="departmentSelect" required>
              <option value="">Loading departments...</option>
            </select>
          </div>`;
    }
    if (f.type === "select") {
      const opts = f.options.map(o => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`).join("");
      return `<div class="mb-2"><label class="form-label">${f.label}</label>
        <select class="form-control" name="${f.name}">${opts}</select></div>`;
    }
    if (f.type === "file") {
      const preview = existing && existing[f.name]
        ? `<div class="mb-1"><img src="${existing[f.name]}" style="height:60px;border-radius:8px"></div>`
        : "";
      return `<div class="mb-2"><label class="form-label">${f.label}${existing ? " (leave empty to keep current)" : ""}</label>
        ${preview}<input class="form-control" type="file" name="${f.name}" ${f.required && !existing ? "required" : ""}></div>`;
    }
    return `<div class="mb-2"><label class="form-label">${f.label}</label>
      <input class="form-control" type="${f.type}" name="${f.name}" value="${value}" ${f.required ? "required" : ""}></div>`;
  }).join("");

  formArea.innerHTML = `
    <form id="recordForm" class="border rounded p-3 mb-3 bg-white">
      <h6>${existing ? "Edit" : "Add"} ${cfg.label.slice(0, -1) || cfg.label}</h6>
      ${fieldsHtml}
      <button class="btn btn-success btn-sm" type="submit">Save</button>
      <button class="btn btn-secondary btn-sm" type="button" id="cancelBtn">Cancel</button>
    </form>
  `;
  if (key === "faculty") {
  loadDepartmentOptions(existing);
}
  document.getElementById("cancelBtn").addEventListener("click", () => { formArea.innerHTML = ""; });

  document.getElementById("recordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    // Don't send an empty file input when editing (keeps existing file)
    cfg.formFields.filter(f => f.type === "file").forEach(f => {
      const input = form.querySelector(`[name="${f.name}"]`);
      if (input && input.files.length === 0) formData.delete(f.name);
    });

    const url = existing ? `/api/admin/${key}/${existing.id}` : `/api/admin/${key}`;
    const method = existing ? "PUT" : "POST";

    try {
      const res = await apiFetch(url, { method, body: formData });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Save failed"); return; }
      formArea.innerHTML = "";
      await refreshList(key);
      await loadStats();
    } catch (err) { /* redirected on 401 */ }
  });
}

async function loadDepartmentOptions(existing = null) {
  const select = document.getElementById("departmentSelect");

  if (!select) return;

  try {
    const res = await fetch("/api/departments");

    if (!res.ok) {
      throw new Error("Could not load departments");
    }

    const departments = await res.json();

    select.innerHTML = `
      <option value="">Select Department</option>
      ${departments.map(d => `
        <option value="${d.id}"
          ${existing && existing.department_id == d.id ? "selected" : ""}>
          ${d.name}
        </option>
      `).join("")}
    `;
  } catch (err) {
    console.error(err);

    select.innerHTML = `
      <option value="">Unable to load departments</option>
    `;
  }
}
async function deleteRecord(key, id) {
  if (!confirm("Delete this record? This cannot be undone.")) return;
  try {
    await apiFetch(`/api/admin/${key}/${id}`, { method: "DELETE" });
    await refreshList(key);
    await loadStats();
  } catch (e) { /* redirected on 401 */ }
}

renderShell();
