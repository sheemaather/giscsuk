// home-updates.js
// Pulls the latest items from /api/news and /api/notifications (same
// endpoints news.html / notices.html already use) and renders them as
// Oxford-style highlight tiles on the homepage.

(function () {
  const HOW_MANY = 6; // how many tiles to show on the homepage

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  function tileFor(item) {
    const isNotice = item.type === "notice";
    const important = isNotice && item.is_important;
    const href = isNotice ? "notices.html" : "news.html";
    const tagLabel = isNotice ? (important ? "Important" : "Notice") : "News";

    if (item.image) {
      return `
        <a class="hu-tile" href="${href}">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">
          <span class="hu-tag${important ? " important" : ""}">${tagLabel}</span>
          <span class="hu-body">
            <span class="hu-date">${formatDate(item.published_on)}</span>
            <span class="hu-title">${escapeHtml(item.title)}</span>
          </span>
        </a>`;
    }

    // No photo (typical for notices) — solid navy tile with an icon instead.
    return `
      <a class="hu-tile no-photo" href="${href}">
        <i class="bi ${important ? "bi-exclamation-triangle-fill" : "bi-megaphone-fill"} hu-icon"></i>
        <span class="hu-tag${important ? " important" : ""}">${tagLabel}</span>
        <span class="hu-body">
          <span class="hu-date">${formatDate(item.published_on)}</span>
          <span class="hu-title">${escapeHtml(item.title)}</span>
        </span>
      </a>`;
  }

  async function loadHomeUpdates() {
    const grid = document.getElementById("homeUpdatesGrid");
    if (!grid) return; // section not on this page

    try {
      const [newsRes, noticesRes] = await Promise.all([
        fetch("/api/news"),
        fetch("/api/notifications")
      ]);
      if (!newsRes.ok || !noticesRes.ok) throw new Error("API error");

      const news = (await newsRes.json()).map(n => ({ ...n, type: "news" }));
      const notices = (await noticesRes.json()).map(n => ({ ...n, type: "notice" }));

      const items = [...news, ...notices]
        .sort((a, b) => new Date(b.published_on) - new Date(a.published_on))
        .slice(0, HOW_MANY);

      grid.innerHTML = items.length
        ? items.map(tileFor).join("")
        : `<div class="hu-empty">No news or notices yet.</div>`;
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="hu-error">Could not load updates right now.</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadHomeUpdates);
})();
