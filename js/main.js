/* MAINFRAME.ENC main.js
 * - Matrix rain background
 * - Infinite horizontal marquee of error codes (hover to pause + enlarge, click)
 * - Typewriter tagline
 * - Stat counters
 * - Search (debounced, normalized input)
 * - Modal (focus trap, ESC, click-outside)
 */
(function () {
  'use strict';

  const CODES = window.MF_CODES ||
    (window.DB2_CODES ? window.DB2_CODES.concat(window.HOME_EXTRA_CODES || []) : []);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fast lookup: code string -> code object (used when cloning marquee tokens)
  const byCode = {};
  CODES.forEach(function (c) { byCode[c.code] = c; });

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
  // Common SQLCODEs every mainframe dev encounters
  const HIGH_IMPORTANCE = new Set([
    // DB2 high
    '-803','-805','-811','-818','-904','-911','-913','-922','+100','-180',
    '-204','-206','-407','-551','-150','-501','-502','-530','-545','-802',
    // Non-DB2 high — the abends every mainframe dev fears
    'S0C4','S0C7','S806','S322','ASRA','ICH408I','S913'
  ]);
  const MEDIUM_IMPORTANCE = new Set([
    // DB2 medium
    '-101','-102','-104','-107','-117','-118','-181','-204','-304','-401',
    '-402','-404','-405','-406','-408','-412','-503','-504','-530','-532',
    '-533','-552','-553','-601','-612','-805','-900','-905','-912','-918',
    '-924','-925','-926','-927','+304','+222','-150','-440','-540',
    // Non-DB2 medium — common abends and important messages
    'S0C1','S0C6','S0CB','AICA','AEY9','APCT','IEC130I','IEC161I',
    'IDC3009I','VSAM-8','IEC031D37','IEC031B37','GIM27801E','EQQE037E',
    'CEE3204S','CEE3207S','IGYDS0017','ICH415I','EZA1735I'
  ]);

  function importanceFor(code) {
    if (HIGH_IMPORTANCE.has(code)) return 'high';
    if (MEDIUM_IMPORTANCE.has(code)) return 'med';
    return 'low';
  }

  function attachTokenHandlers(token, codeObj) {
    token.addEventListener('click', () => openModal(codeObj));
    token.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(codeObj); }
    });
    token.addEventListener('mouseenter', () => showCodeTooltip(token, codeObj));
    token.addEventListener('mouseleave', () => hideCodeTooltip(token));
    token.addEventListener('focus', () => showCodeTooltip(token, codeObj));
    token.addEventListener('blur', () => hideCodeTooltip(token));
  }

  function makeToken(codeObj, ariaHidden, sizeScale) {
    const token = document.createElement('span');
    token.className = 'code-token';
    token.textContent = codeObj.code;
    token.dataset.code = codeObj.code;

    // Importance-based sizing with random jitter.
    // Longer codes (8+ chars) are capped at a smaller range to reduce horizontal overlap.
    const imp = importanceFor(codeObj.code);
    const isLong = codeObj.code.length >= 8;
    let size;
    if (imp === 'high') size = isLong ? 16 + Math.random() * 4 : 22 + Math.random() * 8; // long 16-20, short 22-30
    else if (imp === 'med') size = isLong ? 13 + Math.random() * 3 : 16 + Math.random() * 5; // long 13-16, short 16-21
    else size = 11 + Math.random() * (isLong ? 2 : 4);       // long 11-13, short 11-15
    token.style.fontSize = (size * (sizeScale || 1)).toFixed(1) + 'px';

    // Color: high vivid, low can be dim, negatives bias to red
    const isNeg = codeObj.code.startsWith('-');
    const cr = Math.random();
    if (isNeg && (imp === 'high' ? cr < 0.55 : cr < 0.45)) token.classList.add('neg');
    else if (imp === 'low' && cr < 0.35) token.classList.add('dim');

    if (ariaHidden) {
      token.setAttribute('aria-hidden', 'true');
      token.setAttribute('tabindex', '-1');
    } else {
      token.setAttribute('role', 'button');
      token.setAttribute('tabindex', '0');
      token.setAttribute('aria-label', codeObj.code + ' ' + codeObj.title);
    }
    attachTokenHandlers(token, codeObj);
    return token;
  }

  // One randomly-scattered field of codes that drifts left-to-right as a whole.
  function initGlobe() {
    const globe = document.getElementById('globe');
    const container = document.getElementById('globe-container');
    if (!globe || !container || CODES.length === 0) return;

    function build() {
      globe.innerHTML = '';
      const rect = container.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (W < 10 || H < 10) { setTimeout(build, 100); return; }

      const isMobile = W < 640;
      const isTablet = W >= 640 && W < 1024;

      // On smaller screens use only HIGH+MED codes to reduce visual density
      let displayCodes;
      if (isMobile) {
        const pool = CODES.filter(c => HIGH_IMPORTANCE.has(c.code) || MEDIUM_IMPORTANCE.has(c.code));
        displayCodes = pool.length >= 20 ? pool : CODES;
      } else if (isTablet) {
        const pool = CODES.filter(c => HIGH_IMPORTANCE.has(c.code) || MEDIUM_IMPORTANCE.has(c.code));
        displayCodes = pool.length >= 60 ? pool : CODES;
      } else {
        displayCodes = CODES;
      }

      const panelMult   = isMobile ? 2.2  : isTablet ? 1.8  : 1.5;
      const sizeScale   = isMobile ? 0.65 : isTablet ? 0.82 : 1.0;
      const jitterXFact = isMobile ? 0.35 : isTablet ? 0.45 : 0.55;
      const jitterYFact = isMobile ? 0.50 : isTablet ? 0.60 : 0.75;
      const pxPerSec    = isMobile ? 12   : isTablet ? 14   : 16;

      const panelW = Math.round(W * panelMult);

      const track = document.createElement('div');
      track.className = 'marquee-track';
      track.style.width = (panelW * 2) + 'px';
      globe.appendChild(track);

      // Scatter via a randomized grid + jitter -> looks random, no big gaps.
      const n = displayCodes.length;
      const padY = 18;
      const usableH = Math.max(60, H - padY * 2);
      const aspect = panelW / usableH;
      const cols = Math.max(6, Math.round(Math.sqrt(n * aspect)));
      const rows = Math.ceil(n / cols);
      const cellW = panelW / cols;
      const cellH = usableH / rows;

      const order = displayCodes.slice().sort(() => Math.random() - 0.5);

      order.forEach((codeObj, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const jitterX = (Math.random() - 0.5) * cellW * jitterXFact;
        const jitterY = (Math.random() - 0.5) * cellH * jitterYFact;
        let x = col * cellW + cellW / 2 + jitterX;
        let y = padY + row * cellH + cellH / 2 + jitterY;
        x = Math.min(Math.max(x, 4), panelW - 4);
        y = Math.min(Math.max(y, padY), H - padY);

        // Real (focusable) token in the first panel...
        const token = makeToken(codeObj, false, sizeScale);
        token.style.left = x.toFixed(1) + 'px';
        token.style.top = y.toFixed(1) + 'px';
        track.appendChild(token);

        // ...and an identical clone shifted one panel right for the seamless loop.
        const clone = token.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('tabindex', '-1');
        clone.style.left = (x + panelW).toFixed(1) + 'px';
        attachTokenHandlers(clone, codeObj);
        track.appendChild(clone);
      });

      // Drift speed: slower on mobile for readability.
      const duration = Math.max(60, panelW / pxPerSec);
      track.style.animationDuration = duration.toFixed(0) + 's';
    }

    build();

    // Re-measure once web fonts finish loading (widths change)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build).catch(function () {});
    }

    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(build, 250);
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

  // ---------- NAV DROPDOWNS ----------
  function initNavDropdowns() {
    var NAV_CATEGORIES = {
      databases:    ['AUTHORIZATION','BIND','CONNECTION','CONSTRAINT','CURSOR','DATATYPE','DEADLOCK','OBJECT','RESOURCE','SUCCESS','SYNTAX','SYSTEM','WARNING'],
      batch:        ['JCL','JES2','JES3','SYSTEM ABEND','USER ABEND'],
      mvs:          ['ARM','CONSOLE','DFSMS','DIAGNOSTIC','I/O','LOGGER','STORAGE','SYSPLEX','SYSTEM','VSAM','WLM'],
      storage:      ['DFSMS','I/O','IDCAMS','LE/VSAM','VSAM','VSAM RC'],
      transactions: ['CICS','CICS ABEND','CICS WEB','MQ'],
      network:      ['FTP','SOCKETS','TCP/IP','VTAM'],
      security:     ['ACF2','GSKit','ICSF','RACF','RACF DIGTCERT','SECURITY ABEND','TOP SECRET'],
      tools:        ['ISPF','OMVS','REXX','SDSF','TSO/E'],
      languages:    ['BINDER','COBOL COMPILE','COBOL RUNTIME','HLASM','LE','LE ABEND','PL/I COMPILE'],
      install:      ['SMP/E'],
      scheduling:   ['CONTROL-M','MAINVIEW','NETVIEW','OMEGAMON','SA','TWS'],
      devops:       ['ABEND-AID','APA','CHANGEMAN','DEBUG TOOL','ENDEVOR','FAULT ANALYZER','FILE-AID','HIPERSTATION','IDz','TOTAL TEST','XPEDITER'],
      printing:     ['AFP','INFOPRINT','IP PrintWay','JES OUTPUT','PSF','PSF ABEND'],
      hardware:     ['CHANNEL','DASD ARRAY','DASD UTIL','FICON','GDPS','GDPS/HyperSwap','HARDWARE','I/O','PR/SM','TAPE','z/VM'],
      vendor:       ['AIRLINE/RES','BANKING','CUSTOM','ERP','EXIT','FRAMEWORK','INSURANCE','INTEGRATION','STORED PROC','USER ABEND']
    };

    // Pages grouped under the [MORE] nav item
    var MORE_GROUP = ['devops', 'printing', 'hardware', 'vendor'];
    var MORE_LABELS = { devops: '[DEV]', printing: '[PRINT]', hardware: '[HW]', vendor: '[VEND]' };

    // Determine path prefix based on whether we are in /pages/ or root
    var inPages = window.location.pathname.toLowerCase().indexOf('/pages/') !== -1;
    var pfx = inPages ? '' : 'pages/';

    document.querySelectorAll('.nav-links > li').forEach(function (li) {
      var link = li.querySelector('a');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      // Prefer data-key attribute; fall back to parsing href
      var dataKey = link.getAttribute('data-key') || '';
      var pageKey = dataKey || href.replace(/^.*\//, '').replace(/\.html.*$/, '');

      // ---- [MORE] nested dropdown ----
      if (pageKey === 'more') {
        li.classList.add('has-dropdown');
        // Prevent page jump when clicking [MORE] label directly
        link.addEventListener('click', function (e) { e.preventDefault(); });

        var moreUl = document.createElement('ul');
        moreUl.className = 'nav-dropdown more-dropdown';
        moreUl.setAttribute('role', 'menu');
        moreUl.setAttribute('aria-label', 'More categories');

        MORE_GROUP.forEach(function (key) {
          var pagePath = pfx + key + '.html';
          var cats = NAV_CATEGORIES[key] || [];

          var li2 = document.createElement('li');
          li2.setAttribute('role', 'none');
          if (cats.length) li2.classList.add('has-sub-dropdown');

          var a2 = document.createElement('a');
          a2.href = pagePath;
          a2.setAttribute('role', 'menuitem');
          a2.textContent = MORE_LABELS[key];
          li2.appendChild(a2);

          if (cats.length) {
            var subUl = document.createElement('ul');
            subUl.className = 'nav-sub-dropdown';
            subUl.setAttribute('role', 'menu');

            cats.forEach(function (cat) {
              var li3 = document.createElement('li');
              li3.setAttribute('role', 'none');
              var a3 = document.createElement('a');
              a3.href = pagePath + '?filter=' + encodeURIComponent(cat);
              a3.setAttribute('role', 'menuitem');
              a3.textContent = cat + ' ERROR CODES';
              li3.appendChild(a3);
              subUl.appendChild(li3);
            });
            li2.appendChild(subUl);
          }
          moreUl.appendChild(li2);
        });

        li.appendChild(moreUl);
        return; // done — skip regular dropdown logic
      }

      // ---- Regular flat category dropdown ----
      var cats = NAV_CATEGORIES[pageKey];
      if (!cats || !cats.length) return;

      li.classList.add('has-dropdown');

      var ul = document.createElement('ul');
      ul.className = 'nav-dropdown';
      ul.setAttribute('role', 'menu');
      ul.setAttribute('aria-label', pageKey + ' categories');

      cats.forEach(function (cat) {
        var base = href.split('?')[0];
        var li2 = document.createElement('li');
        li2.setAttribute('role', 'none');
        var a = document.createElement('a');
        a.href = base + '?filter=' + encodeURIComponent(cat);
        a.setAttribute('role', 'menuitem');
        a.textContent = cat + ' ERROR CODES';
        li2.appendChild(a);
        ul.appendChild(li2);
      });

      li.appendChild(ul);
    });
  }

  // ---------- MOBILE NAV (hamburger) ----------
  function initMobileNav() {
    var nav = document.querySelector('.top-nav');
    var navList = nav ? nav.querySelector('.nav-links') : null;
    if (!nav || !navList) return;

    var btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    // Insert before nav-links so logo stays first in the row
    nav.insertBefore(btn, navList);

    var resetMore = function () {};

    function setOpen(open) {
      nav.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (!open) resetMore();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains('nav-open'));
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && nav.classList.contains('nav-open')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('nav-open')) setOpen(false);
    });

    // [MORE] accordion: tap [MORE] → reveals DEV/PRINT/HW/VEND inline
    var moreLinkEl = navList.querySelector('a[data-key="more"]');
    if (moreLinkEl) {
      var moreLi = moreLinkEl.parentElement;
      var inPgs = window.location.pathname.toLowerCase().indexOf('/pages/') !== -1;
      var pfx2 = inPgs ? '' : 'pages/';

      var MORE_MOBILE = [
        { href: pfx2 + 'devops.html',   label: '[DEV]' },
        { href: pfx2 + 'printing.html', label: '[PRINT]' },
        { href: pfx2 + 'hardware.html', label: '[HW]' },
        { href: pfx2 + 'vendor.html',   label: '[VEND]' }
      ];

      var subList = document.createElement('ul');
      subList.className = 'mobile-more-sub';
      MORE_MOBILE.forEach(function (item) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        li.appendChild(a);
        subList.appendChild(li);
      });
      moreLi.appendChild(subList);

      resetMore = function () {
        subList.classList.remove('open');
        moreLinkEl.textContent = '[MORE]';
      };

      moreLinkEl.addEventListener('click', function (e) {
        if (nav.classList.contains('nav-open')) {
          e.preventDefault();
          var opening = !subList.classList.contains('open');
          subList.classList.toggle('open', opening);
          moreLinkEl.textContent = opening ? '[MORE -]' : '[MORE]';
        }
      });
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
    initNavDropdowns();
    initMobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for db2.html
  window.MAINFRAME = { openModal: openModal, searchCodes: searchCodes };
})();
