// load.js

function loadHTML(file, elementID){
  fetch(file, { cache: "no-store" })
    .then(res => res.text())
    .then(data => {
      document.getElementById(elementID).innerHTML = data;
      // Once the topbar markup exists in the DOM, build the drill-down overlay.
      // (The <script> that used to live inside topbar.html never runs when
      // injected via innerHTML, so that logic lives here instead.)
      if (elementID === 'topbar') initNav();
    })
    .catch(err => console.log('Error: ', err));
}

// Builds the Oxford-style drill-down overlay from the .nav-hover list that
// just got injected, then wires up the Menu / Close buttons.
// Runs every time the topbar partial finishes loading.
function initNav(){
  const navHoverEl = document.querySelector('.nav-hover');
  const toggle = document.getElementById('navToggle');
  const overlay = document.getElementById('overlay');
  const panelsEl = document.getElementById('panels');
  const closeBtn = document.getElementById('closeMenu');
  if (!navHoverEl || !toggle || !overlay || !panelsEl) return;

  // Parse .nav-hover into { label, href, children[] } — li > a for top-level
  // items, .mega-drop .drop-item for their children.
  function parseMenu(ul){
    return Array.from(ul.children).map(li => {
      const topLink = li.querySelector(':scope > a');
      const dropItems = li.querySelectorAll('.mega-drop .drop-item');
      if (dropItems.length){
        return {
          label: topLink.textContent.trim(),
          children: Array.from(dropItems).map(a => ({
            label: a.textContent.trim(),
            href: a.getAttribute('href')
          }))
        };
      }
      return { label: topLink.textContent.trim(), href: topLink.getAttribute('href') };
    });
  }

  function buildList(items, panelId, title){
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = panelId;

    const back = document.createElement('button');
    back.className = 'goback' + (panelId === 'panel-root' ? '' : ' show');
    back.textContent = title || 'Back';
    back.addEventListener('click', () => showPanel('panel-root'));
    panel.appendChild(back);

    const ul = document.createElement('ul');
    ul.className = 'nav-list';
    items.forEach((item, i) => {
      const li = document.createElement('li');
      if (item.children){
        const childId = `${panelId}-child-${i}`;
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.innerHTML = `<span>${item.label}</span><span class="chev">\u203A</span>`;
        btn.addEventListener('click', () => showPanel(childId));
        li.appendChild(btn);
        panelsEl.appendChild(buildList(item.children, childId, item.label));
      } else {
        const a = document.createElement('a');
        a.className = 'nav-item';
        a.href = item.href || '#';
        a.innerHTML = `<span>${item.label}</span>`;
        li.appendChild(a);
      }
      ul.appendChild(li);
    });
    panel.appendChild(ul);
    return panel;
  }

  function showPanel(id){
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === id));
  }

  // Reset in case topbar gets reloaded (e.g. SPA-style navigation)
  panelsEl.innerHTML = '';
  panelsEl.appendChild(buildList(parseMenu(navHoverEl), 'panel-root'));
  showPanel('panel-root');

  toggle.addEventListener('click', () => {
    overlay.classList.add('open');
    showPanel('panel-root');
  });
  if (closeBtn){
    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  }
}

// Page load hote hi call ho jaye
loadHTML('topbar.html', 'topbar');
loadHTML('footer.html', 'footer');