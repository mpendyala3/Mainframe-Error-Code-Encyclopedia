#!/usr/bin/env node
/* Site generator. Plain Node, no dependencies.
 *
 *   node tools/build.js
 *
 * Reads   data/categories.json + data/<key>.json
 * Writes  index.html, 404.html, pages/<key>.html, codes/<slug>.html,
 *         assets/codes.json, sitemap.xml, llms.txt
 *
 * Every generated page carries the same strict CSP, so: no inline scripts,
 * no inline style="" attributes, no third-party hosts.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://mpendyala3.github.io';
const BASE = '/Mainframe-Error-Code-Encyclopedia/';
const SITE = ORIGIN + BASE;
const NAME = 'Mainframe Error Code Encyclopedia';
const FIELDS = ['code', 'title', 'category', 'severity', 'description', 'cause', 'fix', 'example'];
const SEVERITIES = { ERROR: 'E', WARNING: 'W', INFO: 'I' };
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; " +
  "img-src 'self' data:; connect-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'";

// Codes shown as shortcuts on the home page, in this order.
const MOST_WANTED = ['S0C7', 'S0C4', 'S806', 'S322', 'S913', '-805', '-811', '-818', '-904', '-911',
  '+100', 'ASRA', 'AEY9', 'ICH408I', 'IEC161I', 'VSAM-23'];
// Codes used for the FAQ on the home page (visible text and FAQPage JSON-LD).
const FAQ = ['S0C7', 'S0C4', 'S806', '-805', '-811', '-818', '-904', '-911', '+100', 'ASRA'];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p).replace(/^﻿/, ''));
function write(p, text) {
  const full = path.join(ROOT, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hash = (p) => crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, p))).digest('hex').slice(0, 8);
const fail = (msg) => { console.error('build: ' + msg); process.exit(1); };

// ---------------------------------------------------------------- data ----

const isSqlcode = (code) => /^[+-]\d+$/.test(code);
const displayCode = (code) => (isSqlcode(code) ? 'SQLCODE ' + code : code);

function slugFor(code) {
  if (isSqlcode(code)) return 'sqlcode-' + (code[0] === '+' ? 'plus-' : '') + code.slice(1);
  return code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const categories = readJson('data/categories.json');
const entries = [];
const slugs = new Map();
for (const cat of categories) {
  const list = readJson('data/' + cat.key + '.json');
  if (!Array.isArray(list) || !list.length) fail('data/' + cat.key + '.json is empty');
  cat.entries = [];
  const seen = new Set();
  list.forEach((raw, i) => {
    for (const f of FIELDS) {
      if (typeof raw[f] !== 'string' || !raw[f].trim()) fail(cat.key + '.json entry ' + i + ' (' + raw.code + '): missing "' + f + '"');
    }
    if (!SEVERITIES[raw.severity]) fail(cat.key + '.json ' + raw.code + ': severity must be ERROR, WARNING or INFO');
    if (seen.has(raw.code)) fail(cat.key + '.json: duplicate code ' + raw.code);
    seen.add(raw.code);
    let slug = slugFor(raw.code);
    if (!slug) fail(cat.key + '.json: cannot make a URL for code "' + raw.code + '"');
    if (slugs.has(slug)) slug += '-' + cat.key;
    if (slugs.has(slug)) fail('URL collision for ' + raw.code);
    const e = Object.assign({}, raw, { slug, page: cat, sev: SEVERITIES[raw.severity] });
    slugs.set(slug, e);
    cat.entries.push(e);
    entries.push(e);
  });
}
const findCode = (code) => entries.find((e) => e.code === code) || fail('code ' + code + ' is referenced by the build but is not in the data');

// ----------------------------------------------------- block lettering ----
// 5x7 glyphs for the separator-page banner (the job name a line printer put
// in block capitals on the first sheet of every listing).

const GLYPHS = {
  A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.',
  C: '.###.#...##....#....#....#...#.###.', D: '####.#...##...##...##...##...#####.',
  E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....',
  G: '.###.#...##....#.####...##...#.###.', H: '#...##...##...#######...##...##...#',
  I: '#####..#....#....#....#....#..#####', J: '..###...#....#....#....#.#..#..##..',
  K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#', N: '#...###..##.#.##..###...##...##...#',
  O: '.###.#...##...##...##...##...#.###.', P: '####.#...##...#####.#....#....#....',
  Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..',
  U: '#...##...##...##...##...##...#.###.', V: '#...##...##...##...##...#.#.#...#..',
  W: '#...##...##...##.#.##.#.###.###...#', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
  0: '.###.#...##..###.#.###..##...#.###.', 1: '..#...##....#....#....#....#...###.',
  2: '.###.#...#....#...#...#...#...#####', 3: '####.....#....#.###.....#....#####.',
  4: '...#...##..#.#.#..#.#####...#....#.', 5: '######....####.....#....##...#.###.',
  6: '.###.#....#....####.#...##...#.###.', 7: '#####....#...#...#...#....#....#...',
  8: '.###.#...##...#.###.#...##...#.###.', 9: '.###.#...##...#.####....#....#.###.',
  '+': '.......#....#..#####..#....#.......', '-': '...............#####...............',
  '/': '....#....#...#...#...#...#....#....', '.': '.........................##...##...',
  $: '..#...#####.#...###...#.#####...#..', ' ': '...................................'
};

Object.keys(GLYPHS).forEach((k) => { if (GLYPHS[k].length !== 35) fail('glyph "' + k + '" must be 35 cells, is ' + GLYPHS[k].length); });

function banner(text, cls) {
  const chars = String(text).toUpperCase().split('');
  if (!chars.length || chars.length > 10 || chars.some((c) => !GLYPHS[c])) return '';
  let d = '';
  chars.forEach((ch, n) => {
    const g = GLYPHS[ch];
    for (let i = 0; i < 35; i++) {
      if (g[i] === '#') d += 'M' + (n * 6 + (i % 5)) + ' ' + Math.floor(i / 5) + 'h.86v.86h-.86z';
    }
  });
  return '<svg class="banner' + (cls ? ' ' + cls : '') + '" viewBox="0 0 ' + (chars.length * 6 - 1) + ' 7" ' +
    'preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
}

// --------------------------------------------------------------- shell ----

let V = '';   // asset version, set in main()

function jsonld(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}

function header(root, active, withSearch) {
  const home = root === '' ? './' : root;
  const nav = categories.map((c) =>
    '<li><a href="' + root + 'pages/' + c.key + '.html"' + (c.key === active ? ' aria-current="page"' : '') +
    ' title="' + esc(c.title) + '">' + esc(c.label) + '</a></li>').join('');
  return '' +
'<a class="skip" href="#main">Skip to content</a>\n' +
'<header class="top">\n' +
'  <div class="top-row">\n' +
'    <a class="brand" href="' + home + '" aria-label="' + NAME + ', home">' +
       '<span class="brand-mark" aria-hidden="true"></span>MAINFRAME<b>.ENC</b></a>\n' +
     (withSearch ? searchForm(root, 'cmd-top') : '<span class="top-fill"></span>') +
'    <button class="theme-btn" type="button" id="theme-btn" aria-label="Switch between paper and 3270 theme">THEME</button>\n' +
'  </div>\n' +
'  <nav class="cats" aria-label="Categories"><ul>' + nav + '</ul></nav>\n' +
'</header>\n';
}

function searchForm(root, cls) {
  return '' +
'    <form class="cmd ' + cls + '" id="cmd" role="search" action="' + (root === '' ? './' : root) + '" method="get">\n' +
'      <label for="q">COMMAND&nbsp;===&gt;</label>\n' +
'      <input id="q" name="q" type="search" role="combobox" aria-label="Search error codes" aria-autocomplete="list" aria-expanded="false" aria-controls="q-list"' +
         ' autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"' +
         ' placeholder="S0C7, -805, IEC161I, deadlock">\n' +
'      <kbd class="cmd-key" aria-hidden="true">/</kbd>\n' +
'      <div class="cmd-list" id="q-list" role="listbox" aria-label="Matching codes" hidden></div>\n' +
'      <p class="cmd-status sr" id="q-status" role="status"></p>\n' +
'    </form>\n';
}

function footer(root) {
  return '' +
'<footer class="foot">\n' +
'  <ul class="pf" aria-label="Keyboard shortcuts">\n' +
'    <li><kbd>/</kbd> Search</li><li><kbd>&uarr;</kbd><kbd>&darr;</kbd> Pick a result</li><li><kbd>Enter</kbd> Open</li>' +
     '<li><kbd>J</kbd><kbd>K</kbd> Move through a listing</li><li><kbd>&larr;</kbd><kbd>&rarr;</kbd> Previous / next entry</li>' +
     '<li><kbd>Esc</kbd> Close</li><li><kbd>T</kbd> Theme</li>\n' +
'  </ul>\n' +
'  <p>' + NAME + ' &middot; ' + entries.length + ' entries in ' + categories.length + ' categories &middot; Find. Understand. Fix.</p>\n' +
'  <p class="fine">An independent reference, not affiliated with or endorsed by IBM or any other vendor. Product names are trademarks of their owners. ' +
     'Entries are summaries: check the vendor documentation for your release before acting on a production system.</p>\n' +
'</footer>\n' +
'<dialog class="entry-dialog" id="entry-dialog" aria-labelledby="dlg-code"><div id="entry-slot"></div></dialog>\n';
}

function page(o) {
  const root = o.root;
  const robots = o.noindex ? 'noindex' : 'index, follow, max-image-preview:large';
  const ld = (o.jsonld || []).map(jsonld).join('\n  ');
  return '<!DOCTYPE html>\n' +
'<html lang="en" data-root="' + root + '" data-v="' + V + '">\n' +
'<head>\n' +
'  <meta charset="utf-8">\n' +
'  <meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n' +
'  <meta name="referrer" content="strict-origin-when-cross-origin">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'  <title>' + esc(o.title) + '</title>\n' +
'  <meta name="description" content="' + esc(o.description) + '">\n' +
'  <meta name="robots" content="' + robots + '">\n' +
   (o.canonical ? '  <link rel="canonical" href="' + o.canonical + '">\n' : '') +
'  <meta name="color-scheme" content="light dark">\n' +
'  <meta name="theme-color" content="#fbfaf3" media="(prefers-color-scheme: light)">\n' +
'  <meta name="theme-color" content="#060a08" media="(prefers-color-scheme: dark)">\n' +
'  <meta property="og:site_name" content="' + NAME + '">\n' +
'  <meta property="og:type" content="' + (o.ogType || 'website') + '">\n' +
'  <meta property="og:title" content="' + esc(o.ogTitle || o.title) + '">\n' +
'  <meta property="og:description" content="' + esc(o.description) + '">\n' +
   (o.canonical ? '  <meta property="og:url" content="' + o.canonical + '">\n' : '') +
'  <meta property="og:image" content="' + SITE + 'assets/og-image.png">\n' +
'  <meta property="og:image:width" content="1200">\n' +
'  <meta property="og:image:height" content="630">\n' +
'  <meta property="og:image:alt" content="' + NAME + ': abend codes, SQLCODEs and z/OS messages explained">\n' +
'  <meta name="twitter:card" content="summary_large_image">\n' +
'  <link rel="icon" type="image/svg+xml" href="' + root + 'assets/favicon.svg">\n' +
'  <link rel="preload" as="font" type="font/woff2" href="' + root + 'assets/fonts/ibm-plex-mono-latin-400-normal.woff2" crossorigin>\n' +
'  <link rel="stylesheet" href="' + root + 'css/main.css?v=' + V + '">\n' +
'  <script src="' + root + 'js/theme.js?v=' + V + '"></script>\n' +
'  <script src="' + root + 'js/app.js?v=' + V + '" defer></script>\n' +
   (ld ? '  ' + ld + '\n' : '') +
'</head>\n' +
'<body class="' + (o.bodyClass || '') + '">\n' +
header(root, o.active, !o.heroSearch) +
'<main id="main" class="sheet">\n' + o.body + '</main>\n' +
footer(root) +
'</body>\n</html>\n';
}

const crumbs = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: it[1] }))
});

function row(e, root) {
  return '<li data-cat="' + esc(e.category) + '"><a href="' + root + 'codes/' + e.slug + '.html" data-slug="' + e.slug + '">' +
    '<span class="c-code">' + esc(e.code) + '</span>' +
    '<span class="c-sev sev-' + e.sev.toLowerCase() + '" title="' + e.severity + '">' + e.sev + '<span class="sr"> ' + e.severity.toLowerCase() + '</span></span>' +
    '<span class="c-class">' + esc(e.category) + '</span>' +
    '<span class="c-title">' + esc(e.title) + '</span></a></li>';
}

const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

// ---------------------------------------------------------------- home ----

function homePage() {
  const wanted = MOST_WANTED.map(findCode);
  const faq = FAQ.map(findCode);
  const chips = wanted.map((e) =>
    '<li><a class="chip" href="codes/' + e.slug + '.html" data-slug="' + e.slug + '" title="' + esc(e.title) + '">' + esc(e.code) + '</a></li>').join('');

  const link = (code) => { const e = findCode(code); return '<a href="codes/' + e.slug + '.html" data-slug="' + e.slug + '">' + esc(code) + '</a>'; };
  const sysout =
' 02.14.07 JOB04217  ' + link('IEA995I') + ' SYMPTOM DUMP OUTPUT\n' +
'                    SYSTEM COMPLETION CODE=0C7  REASON CODE=00000007\n' +
'                     TIME=02.14.07  SEQ=00412  CPU=0000  ASID=0031\n' +
'                     PSW AT TIME OF ERROR  078D1000   A0C0A2C6  ILC 6  INTC 07\n' +
'                       ACTIVE LOAD MODULE           NAME=PAYCALC\n' +
' 02.14.07 JOB04217  IEF450I NIGHTPAY STEP020 - ABEND=' + link('S0C7') + ' U0000\n' +
' 02.14.08 JOB04217  ' + link('$HASP395') + ' NIGHTPAY ENDED - ABEND=S0C7\n';

  const dir = categories.map((c) => {
    const sample = c.entries.slice(0, 3).map((e) => esc(e.code)).join(' &middot; ');
    return '<li><a href="pages/' + c.key + '.html">' +
      '<span class="d-name">' + esc(c.label) + '</span>' +
      '<span class="d-title">' + esc(c.title) + '</span>' +
      '<span class="d-sample">' + sample + '</span>' +
      '<span class="d-count">' + c.entries.length + '<span class="sr"> entries</span></span></a></li>';
  }).join('\n      ');

  const faqHtml = faq.map((e) =>
    '<details><summary>What does ' + esc(displayCode(e.code)) + ' mean?</summary>' +
    '<p>' + esc(e.description) + ' <strong>Fix:</strong> ' + esc(e.fix) +
    ' <a href="codes/' + e.slug + '.html" data-slug="' + e.slug + '">Full entry for ' + esc(e.code) + '</a></p></details>').join('\n      ');

  const body = '' +
'  <section class="hero" aria-labelledby="hero-title">\n' +
'    <p class="jcl" aria-hidden="true">//MFENC    JOB (ABEND),\'FIND. UNDERSTAND. FIX.\',CLASS=A,MSGCLASS=X</p>\n' +
'    ' + banner('ABEND', 'banner-hero') + '\n' +
'    <h1 id="hero-title">Mainframe Error Code Encyclopedia</h1>\n' +
'    <p class="lede">' + entries.length + ' abend codes, DB2 SQLCODEs and z/OS messages, each with what it means, the likely cause, the fix and an example. Type a code.</p>\n' +
searchForm('', 'cmd-hero') +
'    <ul class="chips" aria-label="Most looked-up codes">' + chips + '</ul>\n' +
'  </section>\n\n' +
'  <section class="block" aria-labelledby="sysout-title">\n' +
'    <h2 id="sysout-title" class="rule">SYSOUT <span>what 02:14 looks like</span></h2>\n' +
'    <pre class="sysout" tabindex="0" aria-label="Sample job log of a batch job ending with abend S0C7">' + sysout + '</pre>\n' +
'    <p class="note">A made-up job log for illustration. Each underlined code opens its entry.</p>\n' +
'  </section>\n\n' +
'  <section class="block" aria-labelledby="dir-title">\n' +
'    <h2 id="dir-title" class="rule">DSLIST <span>' + categories.length + ' categories, ' + entries.length + ' entries</span></h2>\n' +
'    <ul class="dir">\n      ' + dir + '\n    </ul>\n' +
'  </section>\n\n' +
'  <section class="block" aria-labelledby="faq-title">\n' +
'    <h2 id="faq-title" class="rule">FAQ <span>the ten codes everyone meets</span></h2>\n' +
'    <div class="faq">\n      ' + faqHtml + '\n    </div>\n' +
'  </section>\n\n' +
'  <section class="block prose" aria-labelledby="about-title">\n' +
'    <h2 id="about-title" class="rule">ABOUT</h2>\n' +
'    <p>A free, searchable reference for the error codes you meet on IBM z/OS: DB2 SQLCODEs, system and user abends, JCL and JES messages, VSAM and storage, CICS and MQ, networking, security, compilers and Language Environment, SMP/E, schedulers, printing, hardware and vendor applications.</p>\n' +
'    <p>Every entry has its own page and follows the layout of a message manual: explanation, likely cause, programmer response and an example. The whole site is static, loads no third-party code and works from the keyboard.</p>\n' +
'  </section>\n';

  return page({
    root: '', heroSearch: true, bodyClass: 'home',
    title: NAME + ': abend codes, SQLCODEs and z/OS messages explained',
    ogTitle: NAME,
    description: 'Look up ' + entries.length + ' mainframe error codes: system abends (S0C4, S0C7, S806), DB2 SQLCODEs (-805, -811, -911), CICS, VSAM, JCL and z/OS messages, each with cause, fix and example.',
    canonical: SITE,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, alternateName: 'MAINFRAME.ENC', url: SITE,
        description: 'Searchable reference of abend codes, DB2 SQLCODEs and z/OS messages.', inLanguage: 'en',
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE + '?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faq.map((e) => ({ '@type': 'Question', name: 'What does ' + displayCode(e.code) + ' mean?',
          acceptedAnswer: { '@type': 'Answer', text: e.description + ' Fix: ' + e.fix } })) }
    ],
    body
  });
}

// ------------------------------------------------------------ category ----

function categoryPage(c) {
  const counts = new Map();
  c.entries.forEach((e) => counts.set(e.category, (counts.get(e.category) || 0) + 1));
  const classes = Array.from(counts.keys()).sort();
  const filters = classes.length < 2 ? '' :
'    <div class="filters" role="group" aria-label="Filter by class">\n' +
'      <button class="chip" type="button" data-cat="" aria-pressed="true">ALL <span>' + c.entries.length + '</span></button>' +
       classes.map((k) => '<button class="chip" type="button" data-cat="' + esc(k) + '" aria-pressed="false">' + esc(k) + ' <span>' + counts.get(k) + '</span></button>').join('') + '\n' +
'    </div>\n';
  const wide = Math.max.apply(null, c.entries.map((e) => e.code.length)) > 10;
  const url = SITE + 'pages/' + c.key + '.html';

  const body = '' +
'  <section class="cat-head">\n' +
'    <p class="dsn"><a href="../">MAINFRAME.ENC</a>.' + esc(c.label) + '</p>\n' +
'    ' + banner(c.label, 'banner-cat') + '\n' +
'    <h1>' + esc(c.heading) + '</h1>\n' +
'    <p class="lede">' + esc(c.intro) + ' Pick a code for the explanation, likely cause, fix and an example.</p>\n' +
'  </section>\n' +
'  <section aria-label="Entries">\n' + filters +
'    <p class="count" id="count" role="status">' + c.entries.length + ' entries</p>\n' +
'    <div class="listing-head' + (wide ? ' wide' : '') + '" aria-hidden="true"><span>CODE</span><span>SEV</span><span>CLASS</span><span>TITLE</span></div>\n' +
'    <ol class="listing' + (wide ? ' wide' : '') + '" id="listing">\n      ' + c.entries.map((e) => row(e, '../')).join('\n      ') + '\n    </ol>\n' +
'    <p class="note">SEV: <span class="sev-e">E</span> error, <span class="sev-w">W</span> warning, <span class="sev-i">I</span> information.</p>\n' +
'  </section>\n';

  return page({
    root: '../', active: c.key,
    title: c.title + ': ' + c.entries.length + ' error codes explained | ' + NAME,
    ogTitle: c.title,
    description: c.description,
    canonical: url,
    jsonld: [
      crumbs([['Home', SITE], [c.title, url]]),
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.title, url, description: c.description, inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: NAME, url: SITE },
        mainEntity: { '@type': 'ItemList', numberOfItems: c.entries.length,
          itemListElement: c.entries.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: displayCode(e.code) + ' ' + e.title, url: SITE + 'codes/' + e.slug + '.html' })) } }
    ],
    body
  });
}

// ---------------------------------------------------------------- code ----

function codePage(e) {
  const c = e.page;
  const i = c.entries.indexOf(e);
  const prev = c.entries[i - 1], next = c.entries[i + 1];
  const related = c.entries.filter((x) => x !== e && x.category === e.category).slice(0, 12);
  const url = SITE + 'codes/' + e.slug + '.html';
  const kind = isSqlcode(e.code) ? '' : (/ABEND/.test(e.category) && !/ABEND/i.test(e.code) ? ' abend' : '');
  const name = displayCode(e.code) + kind;
  const big = banner(e.code, 'banner-code');

  const body = '' +
'  <article class="entry is-' + e.sev.toLowerCase() + '">\n' +
'    <p class="dsn"><a href="../">MAINFRAME.ENC</a>.<a href="../pages/' + c.key + '.html">' + esc(c.label) + '</a>(' + esc(e.code) + ')</p>\n' +
     (big ? '    ' + big + '\n' : '') +
'    <h1><span class="entry-code' + (big ? ' sr' : '') + '">' + esc(displayCode(e.code)) + '</span> <span class="entry-title">' + esc(e.title) + '</span></h1>\n' +
'    <ul class="tags"><li class="tag-sev">' + e.sev + ' &middot; ' + e.severity + '</li><li>' + esc(e.category) + '</li><li><a href="../pages/' + c.key + '.html">' + esc(c.title) + '</a></li></ul>\n' +
'    <dl class="msg">\n' +
'      <dt>Explanation</dt><dd>' + esc(e.description) + '</dd>\n' +
'      <dt>Likely cause</dt><dd>' + esc(e.cause) + '</dd>\n' +
'      <dt>Programmer response</dt><dd>' + esc(e.fix) + '</dd>\n' +
'      <dt>Example</dt><dd><pre tabindex="0"><code>' + esc(e.example) + '</code></pre></dd>\n' +
'    </dl>\n' +
'    <p class="actions"><button class="btn" type="button" data-copy="' + esc(displayCode(e.code) + ' - ' + e.title) + '">Copy code</button>' +
       '<button class="btn" type="button" data-copy="' + url + '">Copy link</button></p>\n' +
'  </article>\n' +
'  <nav class="pager" aria-label="Neighbouring entries">\n' +
     (prev ? '    <a rel="prev" href="' + prev.slug + '.html"><span>&larr; Previous</span>' + esc(prev.code) + '</a>\n' : '    <span></span>\n') +
'    <a class="up" href="../pages/' + c.key + '.html"><span>All of</span>' + esc(c.label) + '</a>\n' +
     (next ? '    <a rel="next" href="' + next.slug + '.html"><span>Next &rarr;</span>' + esc(next.code) + '</a>\n' : '    <span></span>\n') +
'  </nav>\n' +
   (related.length ? '' +
'  <section class="block" aria-labelledby="rel-title">\n' +
'    <h2 id="rel-title" class="rule">RELATED <span>more ' + esc(e.category) + ' entries</span></h2>\n' +
'    <ol class="listing compact">\n      ' + related.map((x) => row(x, '../')).join('\n      ') + '\n    </ol>\n' +
'  </section>\n' : '');

  return page({
    root: '../', active: c.key, ogType: 'article',
    title: clip(name + ': ' + e.title, 70) + ' | cause and fix',
    ogTitle: name + ': ' + e.title,
    description: clip(e.description + ' Cause: ' + e.cause, 158),
    canonical: url,
    jsonld: [
      crumbs([['Home', SITE], [c.title, SITE + 'pages/' + c.key + '.html'], [displayCode(e.code), url]]),
      { '@context': 'https://schema.org', '@type': 'TechArticle', headline: clip(name + ': ' + e.title, 110),
        description: e.description, url, mainEntityOfPage: url, inLanguage: 'en', articleSection: c.title,
        about: [displayCode(e.code), e.category, 'IBM z/OS'],
        isPartOf: { '@type': 'WebSite', name: NAME, url: SITE },
        publisher: { '@type': 'Organization', name: NAME, url: SITE } }
    ],
    body
  });
}

// ----------------------------------------------------------------- 404 ----

function notFoundPage() {
  const body = '' +
'  <section class="hero" aria-labelledby="nf-title">\n' +
'    <p class="jcl" aria-hidden="true">IEF212I PAGE - DATA SET NOT FOUND</p>\n' +
'    ' + banner('S806', 'banner-hero') + '\n' +
'    <h1 id="nf-title">Page not found</h1>\n' +
'    <p class="lede">The module you asked for is not in this library. Search for a code, or go back to the <a href="' + BASE + '">directory</a>.</p>\n' +
'  </section>\n';
  return page({ root: BASE, noindex: true, title: 'Page not found | ' + NAME,
    description: 'That page does not exist. Search the encyclopedia for an abend code, SQLCODE or message ID.', body });
}

// ---------------------------------------------------------------- main ----

function main() {
  V = crypto.createHash('sha1').update(hash('css/main.css') + hash('js/app.js') + hash('js/theme.js')).digest('hex').slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);

  // Search index + the text the in-page entry panel needs. Its ?v= is the build version plus its own hash.
  const index = {
    pages: categories.map((c) => ({ k: c.key, l: c.label, t: c.title })),
    codes: entries.map((e) => ({ c: e.code, t: e.title, k: e.category, s: e.sev, p: e.page.key, u: e.slug,
      d: e.description, a: e.cause, f: e.fix, x: e.example }))
  };
  write('assets/codes.json', JSON.stringify(index));
  V = crypto.createHash('sha1').update(V + hash('assets/codes.json')).digest('hex').slice(0, 8);

  // Remove code pages whose entry no longer exists.
  const dir = path.join(ROOT, 'codes');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) if (/\.html$/.test(f) && !slugs.has(f.slice(0, -5))) fs.unlinkSync(path.join(dir, f));
  }

  write('index.html', homePage());
  write('404.html', notFoundPage());
  categories.forEach((c) => write('pages/' + c.key + '.html', categoryPage(c)));
  entries.forEach((e) => write('codes/' + e.slug + '.html', codePage(e)));

  const urls = [[SITE, '1.0']]
    .concat(categories.map((c) => [SITE + 'pages/' + c.key + '.html', '0.8']))
    .concat(entries.map((e) => [SITE + 'codes/' + e.slug + '.html', '0.6']));
  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + u[0] + '</loc><lastmod>' + today + '</lastmod><priority>' + u[1] + '</priority></url>').join('\n') + '\n</urlset>\n');

  write('llms.txt', '# ' + NAME + '\n\n' +
    '> A free reference of ' + entries.length + ' IBM z/OS mainframe error codes (system and user abends, DB2 SQLCODEs, JCL/JES, VSAM, CICS, MQ, RACF, ' +
    'Language Environment, SMP/E and more). Every entry gives an explanation, the likely cause, the programmer response and an example. ' +
    'Independent project, not affiliated with IBM; entries are summaries, not vendor documentation.\n\n' +
    'Each code has a stable page at ' + SITE + 'codes/<slug>.html. DB2 codes use sqlcode-805 (negative) and sqlcode-plus-100 (positive); ' +
    'other slugs are the code in lower case with punctuation replaced by hyphens (s0c7, ich408i, vsam-23).\n\n' +
    '## Data\n\n- [All entries as JSON](' + SITE + 'assets/codes.json): fields c=code, t=title, k=class, s=severity (E/W/I), p=category key, u=slug, d=explanation, a=cause, f=fix, x=example\n' +
    '- [Sitemap](' + SITE + 'sitemap.xml)\n\n' +
    '## Categories\n\n' + categories.map((c) => '- [' + c.title + '](' + SITE + 'pages/' + c.key + '.html): ' + c.entries.length + ' entries. ' + c.intro).join('\n') + '\n\n' +
    '## Most looked-up codes\n\n' + MOST_WANTED.map(findCode).map((e) => '- [' + displayCode(e.code) + ' ' + e.title + '](' + SITE + 'codes/' + e.slug + '.html)').join('\n') + '\n');

  console.log('built ' + entries.length + ' entries, ' + categories.length + ' categories, version ' + V);
}

main();
