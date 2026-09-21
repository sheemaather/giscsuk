/* =========================================================
   department-faculty.js
   Fetches faculty for ONE department from the API and renders
   them into the page — used identically by every department
   page (CS.html, English.html, Urdu.html, etc).

   HOW TO USE ON A PAGE:
   1. Put the department's slug on the <body> tag:
        <body data-department="computer science">
      (slug must match the "slug" column in your departments table)

   2. Add two empty containers where content should appear:
        <div id="hodFeatured"></div>      (professors / HOD — large cards)
        <div id="facultyGrid" class="row g-4"></div>  (lecturers — grid cards)

   3. Include this script before </body>:
        <script src="assets/js/department-faculty.js"></script>

   That's it — no other per-page code needed.
   ========================================================= */

(function () {
  const slug = document.body.getAttribute("data-department");
  const featuredEl = document.getElementById("hodFeatured");
  const gridEl = document.getElementById("facultyGrid");

  if (!slug || (!featuredEl && !gridEl)) return; // page doesn't use this pattern

  const FEATURED_RANKS = ["professor", "associate_professor", "assistant_professor"];

  function initials(name) {
    return (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join("");
  }

  function photoOrInitials(member, sizeClass) {
    if (member.photo) {
      return `<img src="${member.photo}" alt="${member.name}">`;
    }
    return initials(member.name);
  }

  function renderFeatured(members) {
    if (!featuredEl) return;
    if (!members.length) { featuredEl.innerHTML = ""; return; }

    featuredEl.innerHTML = members.map(m => `
      <div class="professor-feature">
        <div class="professor-photo">${photoOrInitials(m)}</div>
        <div class="professor-info">
          ${m.role_title ? `<h6 class="role-title">${m.role_title}</h6>` : ""}
          <h5>${m.name}</h5>
          <div class="designation">${m.designation}</div>
          ${m.bio ? `<p>${m.bio}</p>` : ""}
        </div>
      </div>
    `).join("");
  }

  function renderGrid(members) {
    if (!gridEl) return;
    if (!members.length) {
      gridEl.innerHTML = `<div class="col-12"><div class="faculty-empty">No faculty members added yet.</div></div>`;
      return;
    }

    gridEl.innerHTML = members.map(m => `
      <div class="col-md-4">
        <div class="faculty-grid-card">
          <div class="faculty-grid-photo">${photoOrInitials(m)}</div>
          <h6>${m.name}</h6>
          <div class="designation">${m.designation}</div>
          ${m.qualification ? `<div class="qualification">${m.qualification}</div>` : ""}
        </div>
      </div>
    `).join("");
  }

  fetch(`/api/faculty?department=${encodeURIComponent(slug)}`)
    .then(res => {
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    })
    .then(members => {
      const featured = members.filter(m => FEATURED_RANKS.includes(m.rank_level));
      const lecturers = members.filter(m => !FEATURED_RANKS.includes(m.rank_level));
      renderFeatured(featured);
      renderGrid(lecturers);
    })
    .catch(err => {
      console.error("Failed to load faculty:", err);
      if (gridEl) {
        gridEl.innerHTML = `<div class="col-12"><div class="faculty-empty">Could not load faculty right now.</div></div>`;
      }
    });
})();
