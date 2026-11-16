/* Mainframe Error Code Encyclopedia: search, entry panel, filters, shortcuts.
 * Every page works without this file (rows are real links to static pages);
 * the script only makes lookups faster. DOM is built with h(), never innerHTML.
 */
(function () {
  'use strict';

  var doc = document, html = doc.documentElement;
  var ROOT = html.getAttribute('data-root') || '';
  var VERSION = html.getAttribute('data-v') || '';
  var SEV = { E: 'ERROR', W: 'WARNING', I: 'INFO' };
  var MAX_RESULTS = 12;

  function $(id) { return doc.getElementById(id); }

  function h(tag, attrs) {
    var el = doc.createElement(tag), i, child;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') el.className = attrs[k];
        else if (k === 'text') el.textContent = attrs[k];
        else if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
      });
    }
    for (i = 2; i < arguments.length; i++) {
      child = arguments[i];
      if (child === null || child === undefined) continue;
      el.appendChild(typeof child === 'string' ? doc.createTextNode(child) : child);
    }
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function isSqlcode(code) { return /^[+-]\d+$/.test(code); }
  function displayCode(code) { return isSqlcode(code) ? 'SQLCODE ' + code : code; }
  function entryUrl(e) { return ROOT + 'codes/' + e.u + '.html'; }

  // ------------------------------------------------------------- data ----

  var db = null, loading = null;

  function load() {
    if (loading) return loading;
    loading = fetch(ROOT + 'assets/codes.json?v=' + VERSION)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var pages = {}, bySlug = {};
        data.pages.forEach(function (p) { pages[p.k] = p; });
        data.codes.forEach(function (e) {
          bySlug[e.u] = e;
          e._code = e.c.toLowerCase();
          e._bare = e._code.replace(/^[+-]/, '');
          e._title = e.t.toLowerCase();
          e._class = e.k.toLowerCase();
          e._text = (e.d + ' ' + e.a + ' ' + e.f).toLowerCase();
        });
        db = { codes: data.codes, pages: pages, bySlug: bySlug };
        return db;
      });
    loading.catch(function () { loading = null; });   // allow a retry on the next keystroke
    return loading;
  }

  // ----------------------------------------------------------- search ----

  function search(raw) {
    var q = String(raw).toLowerCase().trim();
    if (!q || !db) return { items: [], total: 0, exact: false };
    // "sqlcode -805", "abend s0c7", "error 0c4" -> the code itself
    var n = q.replace(/^(sqlcode|sql code|abend|error code|error|code|message|msg|rc)\s*[:=]?\s*/, '').trim() || q;
    n = n.replace(/^soc(?=[0-9a-f]\b)/, 's0c');           // letter O typed for zero
    var bare = n.replace(/^[+-]/, '');
    var words = q.split(/\s+/);
    var hits = [];
    db.codes.forEach(function (e, i) {
      var s = 0;
      if (e._code === n) s = 1000;
      else if (e._bare === bare) s = 900;
      else if (e._code === 's' + n) s = 880;                // 0c7 -> S0C7, b37 -> SB37
      else if (e._code.indexOf(n) === 0) s = 700;
      else if (e._bare.indexOf(bare) === 0) s = 650;
      else if (e._code.indexOf(n) !== -1) s = 500;
      else if (e._title.indexOf(q) !== -1) s = 300;
      else if (words.every(function (w) { return e._title.indexOf(w) !== -1; })) s = 250;
      else if (e._class.indexOf(q) !== -1) s = 150;
      else if (words.every(function (w) { return e._text.indexOf(w) !== -1 || e._title.indexOf(w) !== -1; })) s = 80;
      if (s) hits.push({ e: e, s: s, i: i });
    });
    hits.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
    return { items: hits.slice(0, MAX_RESULTS).map(function (x) { return x.e; }), total: hits.length, exact: !!hits.length && hits[0].s >= 880 };
  }

  function initSearch() {
    var form = $('cmd'), input = $('q'), list = $('q-list'), status = $('q-status');
    if (!form || !input || !list) return;
    var items = [], active = -1, ticket = 0, exact = false;

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function message(text) {
      clear(list);
      items = [];
      list.appendChild(h('p', { class: 'cmd-msg', text: text }));
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (status) status.textContent = text;
    }
    function setActive(i) {
      var opts = list.querySelectorAll('[role="option"]');
      if (!opts.length) return;
      active = (i + opts.length) % opts.length;
      for (var k = 0; k < opts.length; k++) opts[k].setAttribute('aria-selected', k === active ? 'true' : 'false');
      input.setAttribute('aria-activedescendant', opts[active].id);
      opts[active].scrollIntoView({ block: 'nearest' });
    }
    function render() {
      var q = input.value;
      if (!q.trim()) { close(); if (status) status.textContent = ''; return; }
      var res = search(q);
      if (!res.items.length) { message('NO ENTRY MATCHES "' + q.trim().toUpperCase() + '". TRY A SHORTER CODE OR A KEYWORD.'); return; }
      clear(list);
      items = res.items;
      exact = res.exact;
      items.forEach(function (e, i) {
        var a = h('a', { role: 'option', id: 'q-opt-' + i, href: entryUrl(e), 'aria-selected': 'false', tabindex: '-1' },
          h('span', { class: 'r-code', text: e.c }),
          h('span', { class: 'c-sev sev-' + e.s.toLowerCase(), text: e.s, title: SEV[e.s] }),
          h('span', { class: 'r-title', text: e.t }),
          h('span', { class: 'r-page', text: db.pages[e.p].l }));
        a.addEventListener('click', function (ev) {
          if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
          ev.preventDefault();
          close();
          openEntry(e, items);
        });
        list.appendChild(a);
      });
      if (res.total > items.length) list.appendChild(h('p', { class: 'cmd-msg', text: 'FIRST ' + items.length + ' OF ' + res.total + '. KEEP TYPING TO NARROW.' }));
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      active = -1;
      if (status) status.textContent = res.total + (res.total === 1 ? ' match' : ' matches');
    }
    function update() {
      var mine = ++ticket;
      if (db) { render(); return; }
      if (input.value.trim()) message('LOADING INDEX…');
      load().then(function () { if (mine === ticket) render(); })
        .catch(function () { if (mine === ticket) message('SEARCH INDEX DID NOT LOAD. CHECK THE CONNECTION, OR BROWSE THE CATEGORIES.'); });
    }

    input.addEventListener('input', update);
    input.addEventListener('focus', function () { load().catch(function () {}); if (input.value.trim() && list.hidden) update(); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); if (list.hidden) update(); else setActive(active + 1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (!list.hidden) setActive(active - 1); }
      else if (ev.key === 'Escape') {
        if (!list.hidden) { ev.preventDefault(); close(); }
        else if (input.value) { ev.preventDefault(); input.value = ''; }
        else input.blur();
      }
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var go = function () {
        render();
        var pick = items[active >= 0 ? active : 0];
        if (pick) { close(); openEntry(pick, items); }
      };
      if (db) go(); else load().then(go).catch(function () { update(); });
    });
    doc.addEventListener('click', function (ev) { if (!form.contains(ev.target)) close(); });

    // ?q= (used by the SearchAction in the structured data, and shareable)
    var q = new URLSearchParams(location.search).get('q');
    if (q) {
      input.value = q.slice(0, 80);
      load().then(function () {
        render();
        if (items.length === 1 || (items.length && exact)) { close(); openEntry(items[0], items); }
      }).catch(function () { update(); });
    }
  }

  // ------------------------------------------------------ entry panel ----

  var dialog = null, slot = null, current = null, context = [];

  function copyButton(label, text) {
    return h('button', { class: 'btn', type: 'button', 'data-copy': text, text: label });
  }

  function openEntry(e, list) {
    if (!dialog || typeof dialog.showModal !== 'function') { location.href = entryUrl(e); return; }
    current = e;
    context = list && list.indexOf(e) !== -1 ? list : [e];
    var page = db.pages[e.p];
    var i = context.indexOf(e);
    var abs = new URL(entryUrl(e), location.href).href;
    var sev = e.s.toLowerCase();

    var prev = h('button', { class: 'btn', type: 'button', 'aria-label': 'Previous entry', text: '←' });
    var next = h('button', { class: 'btn', type: 'button', 'aria-label': 'Next entry', text: '→' });
    prev.disabled = i <= 0;
    next.disabled = i >= context.length - 1;
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    var closeBtn = h('button', { class: 'btn', type: 'button', text: 'Close' });
    closeBtn.addEventListener('click', function () { dialog.close(); });

    clear(slot);
    slot.appendChild(h('article', { class: 'entry is-' + sev },
      h('p', { class: 'dsn', text: 'MAINFRAME.ENC.' + page.l + '(' + e.c + ')' }),
      h('h1', null,
        h('span', { class: 'entry-code', id: 'dlg-code', text: displayCode(e.c) }), ' ',
        h('span', { class: 'entry-title', text: e.t })),
      h('ul', { class: 'tags' },
        h('li', { class: 'tag-sev', text: e.s + ' · ' + SEV[e.s] }),
        h('li', { text: e.k }),
        h('li', { text: page.t })),
      h('dl', { class: 'msg' },
        h('dt', { text: 'Explanation' }), h('dd', { text: e.d }),
        h('dt', { text: 'Likely cause' }), h('dd', { text: e.a }),
        h('dt', { text: 'Programmer response' }), h('dd', { text: e.f }),
        h('dt', { text: 'Example' }), h('dd', null, h('pre', { tabindex: '0' }, h('code', { text: e.x }))))));
    slot.appendChild(h('div', { class: 'dlg-bar' },
      prev, next,
      copyButton('Copy code', displayCode(e.c) + ' - ' + e.t),
      copyButton('Copy link', abs),
      h('a', { class: 'btn', href: entryUrl(e), text: 'Full page' }),
      h('span', { class: 'spacer' }),
      closeBtn));

    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    closeBtn.focus();
  }

  function step(delta) {
    var i = context.indexOf(current) + delta;
    if (i >= 0 && i < context.length) openEntry(context[i], context);
  }

  function initDialog() {
    dialog = $('entry-dialog');
    slot = $('entry-slot');
    if (!dialog || !slot) { dialog = null; return; }
    dialog.addEventListener('click', function (ev) { if (ev.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', function (ev) {
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
    });

    // Any in-page link to an entry opens the panel instead of navigating,
    // provided the index is already here. Otherwise the link just works.
    doc.addEventListener('click', function (ev) {
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
      var a = ev.target.closest ? ev.target.closest('a[data-slug]') : null;
      if (!a || !db || dialog.contains(a)) return;
      var e = db.bySlug[a.getAttribute('data-slug')];
      if (!e) return;
      ev.preventDefault();
      var holder = a.closest('.listing, .chips, .sysout, .faq');
      var list = [];
      if (holder) {
        holder.querySelectorAll('a[data-slug]').forEach(function (x) {
          var item = db.bySlug[x.getAttribute('data-slug')];
          if (item && !x.closest('[hidden]') && list.indexOf(item) === -1) list.push(item);
        });
      }
      openEntry(e, list);
    });
  }

  // ----------------------------------------------------------- copy ------

  function initCopy() {
    doc.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-copy]') : null;
      if (!btn) return;
      var label = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', label);
      var done = function (text) {
        btn.textContent = text;
        setTimeout(function () { btn.textContent = label; }, 1400);
      };
      if (!navigator.clipboard || !navigator.clipboard.writeText) { done('Copy not available'); return; }
      navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(function () { done('Copied'); }, function () { done('Copy blocked'); });
    });
  }

  // --------------------------------------------------------- filters -----

  function initFilters() {
    var listing = $('listing'), count = $('count');
    var chips = doc.querySelectorAll('.filters .chip');
    if (!listing || !chips.length) return;
    var rows = listing.querySelectorAll('li');

    function apply(cat, updateUrl) {
      var shown = 0;
      rows.forEach(function (li) {
        var hide = !!cat && li.getAttribute('data-cat') !== cat;
        li.hidden = hide;
        if (!hide) shown++;
      });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-cat') === cat ? 'true' : 'false'); });
      if (count) count.textContent = shown + (shown === 1 ? ' entry' : ' entries') + (cat ? ' in ' + cat : '');
      if (updateUrl && history.replaceState) {
        var url = new URL(location.href);
        if (cat) url.searchParams.set('filter', cat); else url.searchParams.delete('filter');
        history.replaceState(null, '', url);
      }
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { apply(c.getAttribute('data-cat'), true); });
    });

    var wanted = new URLSearchParams(location.search).get('filter');
    if (wanted) {
      var match = null;
      chips.forEach(function (c) { if (c.getAttribute('data-cat').toLowerCase() === wanted.toLowerCase()) match = c.getAttribute('data-cat'); });
      if (match) apply(match, false);
    }
  }

  // ----------------------------------------------------------- theme -----

  function initTheme() {
    var btn = $('theme-btn');
    if (!btn) return;
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function isDark() {
      var t = html.getAttribute('data-theme');
      return t ? t === 'dark' : !!(mq && mq.matches);
    }
    function paint() { btn.textContent = isDark() ? 'PAPER' : '3270'; }
    function toggle() {
      var next = isDark() ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      try { localStorage.setItem('mfenc-theme', next); } catch (e) { /* not saved, still applied */ }
      paint();
    }
    btn.addEventListener('click', toggle);
    if (mq && mq.addEventListener) mq.addEventListener('change', paint);
    paint();
    return toggle;
  }

  // ------------------------------------------------------- shortcuts -----

  function initKeys(toggleTheme) {
    doc.addEventListener('keydown', function (ev) {
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
      var t = ev.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (dialog && dialog.open) return;
      var key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
      if (key === '/') {
        var input = $('q');
        if (input) { ev.preventDefault(); input.focus(); input.select(); }
      } else if (key === 't' && toggleTheme) {
        toggleTheme();
      } else if (key === 'j' || key === 'k') {
        var links = Array.prototype.filter.call(doc.querySelectorAll('#listing a'), function (a) { return !a.closest('[hidden]'); });
        if (!links.length) return;
        var i = links.indexOf(doc.activeElement);
        var next = key === 'j' ? Math.min(links.length - 1, i + 1) : Math.max(0, i === -1 ? 0 : i - 1);
        ev.preventDefault();
        links[next].focus();
      }
    });
  }

  // ------------------------------------------------------------ init -----

  function init() {
    initDialog();
    initSearch();
    initCopy();
    initFilters();
    initKeys(initTheme());
    // Fetch the index when the browser is idle so the first lookup is instant.
    var warm = function () { load().catch(function () {}); };
    if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 2500 }); else setTimeout(warm, 800);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
