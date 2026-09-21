/* =========================================================
   include-partials.js
   Loads shared HTML fragments (header, footer, etc.) into any
   page — the HTML equivalent of linking one shared CSS file.

   HOW TO USE ON A PAGE:
   1. Put a placeholder where the shared content should appear:
        <div data-include="partials/header.html"></div>

   2. Include this script as EARLY as possible in <body>,
      right where the placeholder is (or right after it) —
      it must run before the browser has moved on, so put it
      immediately after the LAST data-include div on the page:
        <script src="assets/js/include-partials.js"></script>

   Multiple includes on one page are fine (e.g. header AND
   footer) — every matching div gets filled in automatically.
   ========================================================= */

document.querySelectorAll("[data-include]").forEach(el => {
  const url = el.getAttribute("data-include");
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Could not load ${url}`);
      return res.text();
    })
    .then(html => {
      el.outerHTML = html; // replace the placeholder div with the actual markup
    })
    .catch(err => {
      console.error(err);
      el.innerHTML = ""; // fail quietly rather than showing broken content
    });
});
