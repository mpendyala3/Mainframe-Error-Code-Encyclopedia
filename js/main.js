/* MAINFRAME.ENC main.js
 * - Matrix rain background
 * - Globe of error codes (elliptical layout, slow rotation, hover, click)
 * - Typewriter tagline
 * - Stat counters
 * - Search (debounced, normalized input)
 * - Modal (focus trap, ESC, click-outside)
 */
(function () {
  'use strict';

  const CODES = window.DB2_CODES || [];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- MATRIX RAIN ----------
  function initMatrix() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const chars = '01ABCDEF$%#@*&!?+-=<>{}[]|/\\;:'.split('');
    const fontSize = 14;
    let columns = Math.floor(width / fontSize);
    let drops = new Array(columns).fill(0).map(() => Math.random() * height / fontSize);

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(0).map(() => Math.random() * height / fontSize);
    }
    window.addEventListener('resize', resize);

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#00FF41';
      ctx.font = fontSize + "px 'Share Tech Mono', monospace";
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      setTimeout(() => requestAnimationFrame(draw), 60);
    }
    draw();
  }

  // ---------- TYPEWRITER ----------
  function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;
    const text = 'Decoding the mainframe, one error at a time';
    if (prefersReducedMotion) { el.textContent = text; return; }
    let i = 0;
    function type() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(type, 50);
      }
    }
    type();
  }

  // ---------- STAT COUNTERS ----------
  function initStats() {
    document.querySelectorAll('.stat-num').forEach((el) => {
      const target = parseInt(el.getAttribute('data-target'), 10) || 0;
      if (prefersReducedMotion) { el.textContent = target; return; }
      const duration = 1500;
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(eased * target);
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    });
  }

  // ---------- CODE CLOUD ----------
  function initGlobe() {
    const globe = document.getElementById('globe');
    if (!globe || CODES.length === 0) return;

    // Shuffle once for visual variety (positive/negative mixed in)
    const shuffled = CODES.slice().sort(() => Math.random() - 0.5);

    shuffled.forEach((codeObj) => {
      const token = document.createElement('span');
      token.className = 'code-token';
      token.textContent = codeObj.code;
      token.setAttribute('role', 'button');
      token.setAttribute('tabindex', '0');
      token.setAttribute('aria-label', codeObj.code + ' ' + codeObj.title);
      token.dataset.code = codeObj.code;

      // Size variety: most are 12-15px, ~12% are 18-22px for texture
      const big = Math.random() < 0.12;
      const baseSize = big
        ? 18 + Math.random() * 4
        : 12 + Math.random() * 3;
      token.style.fontSize = baseSize.toFixed(1) + 'px';

      // Color classification: negatives bias to red ~50%, otherwise mix of bright/dim
      const isNeg = codeObj.code.startsWith('-');
      const colorRand = Math.random();
      if (isNeg && colorRand < 0.5) token.classList.add('neg');
      else if (colorRand < 0.3) token.classList.add('dim');

      token.addEventListener('click', () => openModal(codeObj));
      token.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(codeObj); }
      });
      token.addEventListener('mouseenter', () => showCodeTooltip(token, codeObj));
      token.addEventListener('mouseleave', () => hideCodeTooltip(token));
      token.addEventListener('focus', () => showCodeTooltip(token, codeObj));
      token.addEventListener('blur', () => hideCodeTooltip(token));

      globe.appendChild(token);
    });
  }

  function showCodeTooltip(token, codeObj) {
    const existing = token.querySelector('.code-tooltip');
    if (existing) return;
    const tip = document.createElement('div');
    tip.className = 'code-tooltip';
    tip.textContent = codeObj.title;
    token.appendChild(tip);
  }
  function hideCodeTooltip(token) {
    const tip = token.querySelector('.code-tooltip');
    if (tip) tip.remove();
  }

  // ---------- MODAL ----------
  let lastFocusedBeforeModal = null;

  function openModal(codeObj) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    lastFocusedBeforeModal = document.activeElement;
    const isNeg = codeObj.code.startsWith('-');

    const codeEl = document.getElementById('modal-code');
    codeEl.textContent = 'SQLCODE ' + codeObj.code;
    codeEl.classList.toggle('neg', isNeg);

    document.getElementById('modal-title').textContent = codeObj.title;

    const catEl = document.getElementById('modal-category');
    catEl.textContent = codeObj.category;

    const sevEl = document.getElementById('modal-severity');
    sevEl.textContent = codeObj.severity;
    sevEl.className = 'meta-tag ' + (codeObj.severity === 'WARNING' ? 'warning' : 'error');

    document.getElementById('modal-description').textContent = codeObj.description;
    document.getElementById('modal-cause').textContent = codeObj.cause;
    document.getElementById('modal-fix').textContent = codeObj.fix;
    document.getElementById('modal-example').textContent = codeObj.example;

    const copyBtn = document.getElementById('modal-copy');
    copyBtn.classList.remove('copied');
    copyBtn.textContent = '[COPY SQLCODE]';
    copyBtn.onclick = () => {
      const txt = 'SQLCODE ' + codeObj.code + ' - ' + codeObj.title;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.textContent = '[COPIED!]';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.textContent = '[COPY SQLCODE]';
          }, 1500);
        });
      }
    };

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Focus first focusable
    const firstFocusable = overlay.querySelector('button');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
      lastFocusedBeforeModal.focus();
    }
  }

  function initModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
      if (e.key === 'Tab' && overlay.classList.contains('active')) trapFocus(e, overlay);
    });
  }

  function trapFocus(e, container) {
    const focusables = container.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---------- SEARCH ----------
  function normalizeCode(input) {
    const s = String(input).trim().toUpperCase().replace(/^SQLCODE\s*/, '').trim();
    if (!s) return '';
    if (/^[+-]?\d+$/.test(s)) {
      if (s.startsWith('+') || s.startsWith('-')) return s;
      return s; // could be +N or -N
    }
    return s;
  }

  function searchCodes(query) {
    if (!query) return [];
    const norm = normalizeCode(query);
    const q = query.toLowerCase().trim();
    const results = [];
    for (let i = 0; i < CODES.length; i++) {
      const c = CODES[i];
      const codeOnly = c.code.replace(/^[+-]/, '');
      let score = 0;
      if (c.code === norm) score = 1000;
      else if (codeOnly === norm.replace(/^[+-]/, '')) score = 900;
      else if (c.code.toLowerCase().includes(q)) score = 500;
      else if (c.title.toLowerCase().includes(q)) score = 200;
      else if (c.category.toLowerCase().includes(q)) score = 150;
      else if (c.description.toLowerCase().includes(q)) score = 80;
      else if (c.cause.toLowerCase().includes(q)) score = 50;
      if (score) results.push({ code: c, score: score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 12).map(r => r.code);
  }

  function renderResults(items) {
    const box = document.getElementById('search-results');
    if (!box) return;
    box.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-result-empty';
      empty.innerHTML = '> NO MATCH FOUND. TRY ANOTHER CODE.<span class="cursor-blink" aria-hidden="true">_</span>';
      box.appendChild(empty);
      box.classList.add('active');
      return;
    }
    items.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.setAttribute('role', 'option');
      item.tabIndex = 0;
      const code = document.createElement('span');
      code.className = 'search-result-code' + (c.code.startsWith('-') ? ' neg' : '');
      code.textContent = c.code;
      const title = document.createElement('span');
      title.className = 'search-result-title';
      title.textContent = c.title;
      item.appendChild(code);
      item.appendChild(title);
      item.addEventListener('click', () => { box.classList.remove('active'); openModal(c); });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { box.classList.remove('active'); openModal(c); }
      });
      box.appendChild(item);
    });
    box.classList.add('active');
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait);
    };
  }

  function initSearch() {
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-button');
    const box = document.getElementById('search-results');
    if (!input || !btn || !box) return;

    const doSearch = debounce(() => {
      const q = input.value;
      if (!q.trim()) { box.classList.remove('active'); box.innerHTML = ''; return; }
      renderResults(searchCodes(q));
    }, 300);

    input.addEventListener('input', doSearch);
    btn.addEventListener('click', () => {
      const q = input.value;
      const results = searchCodes(q);
      if (results.length) openModal(results[0]);
      else renderResults([]);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btn.click();
      }
      if (e.key === 'Escape') { box.classList.remove('active'); }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-search')) box.classList.remove('active');
    });

    // Honor ?q= in URL
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      input.value = q;
      const results = searchCodes(q);
      if (results.length) openModal(results[0]);
    }
  }

  // ---------- INIT ----------
  function init() {
    initMatrix();
    initTypewriter();
    initStats();
    initGlobe();
    initModal();
    initSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for db2.html
  window.MAINFRAME = { openModal: openModal, searchCodes: searchCodes };
})();
