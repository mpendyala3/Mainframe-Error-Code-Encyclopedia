/* category-page.js - shared logic for all category pages
 * - Highlights the active nav link
 * - Builds filter buttons from the loaded category data
 * - Renders the code grid
 * - Reuses window.MAINFRAME.openModal for modal interaction
 */
(function () {
  'use strict';

  function highlightNav() {
    const list = document.querySelector('.nav-links[data-active]');
    if (!list) return;
    const activeKey = list.getAttribute('data-active');
    list.querySelectorAll('a[data-key]').forEach(a => {
      if (a.getAttribute('data-key') === activeKey) a.classList.add('active');
    });
  }

  function buildFilters(codes) {
    const bar = document.getElementById('filter-bar');
    if (!bar) return null;
    const cats = Array.from(new Set(codes.map(c => c.category))).sort();
    const all = document.createElement('button');
    all.className = 'filter-btn active';
    all.dataset.cat = 'ALL';
    all.textContent = 'ALL';
    bar.appendChild(all);
    cats.forEach(c => {
      const b = document.createElement('button');
      b.className = 'filter-btn';
      b.dataset.cat = c;
      b.textContent = c;
      bar.appendChild(b);
    });
    return bar;
  }

  function renderGrid(codes, currentCat) {
    const grid = document.getElementById('code-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const list = codes.filter(c => currentCat === 'ALL' || c.category === currentCat);
    list.forEach(c => {
      const card = document.createElement('article');
      card.className = 'code-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', c.code + ' ' + c.title);
      const code = document.createElement('div');
      code.className = 'code-card-code' + (String(c.code).startsWith('-') ? ' neg' : '');
      code.textContent = c.code;
      const title = document.createElement('div');
      title.className = 'code-card-title';
      title.textContent = c.title;
      const cat = document.createElement('div');
      cat.className = 'code-card-cat';
      cat.textContent = c.category + ' / ' + c.severity;
      card.appendChild(code);
      card.appendChild(title);
      card.appendChild(cat);
      const openIt = () => { if (window.MAINFRAME) window.MAINFRAME.openModal(c); };
      card.addEventListener('click', openIt);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIt(); }
      });
      grid.appendChild(card);
    });
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'search-result-empty';
      empty.textContent = '> NO CODES IN THIS CATEGORY._';
      grid.appendChild(empty);
    }
  }

  function init() {
    highlightNav();

    function getCodes() {
      return (window.MF_CODES && window.MF_CODES.length)
        ? window.MF_CODES
        : (window.DB2_CODES || []);
    }

    function start() {
      const codes = getCodes();
      if (!codes.length) { setTimeout(start, 50); return; }
      const bar = buildFilters(codes);
      let currentCat = 'ALL';
      if (bar) {
        bar.addEventListener('click', (e) => {
          const btn = e.target.closest('.filter-btn');
          if (!btn) return;
          bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentCat = btn.dataset.cat;
          renderGrid(codes, currentCat);
        });
      }
      renderGrid(codes, currentCat);
    }
    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
