#!/usr/bin/env node
/* Post-build check. Plain Node, no dependencies.
 *
 *   node tools/check.js
 *
 * Verifies that every data entry has a page and is in the search index, that
 * every local href/src in every HTML file resolves to a file, and that no page
 * has an inline script, an inline style attribute or a third-party URL to load.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = '/Mainframe-Error-Code-Encyclopedia/';
const problems = [];
const bad = (m) => problems.push(m);

const htmlFiles = ['index.html', '404.html']
  .concat(fs.readdirSync(path.join(ROOT, 'pages')).map((f) => 'pages/' + f))
  .concat(fs.readdirSync(path.join(ROOT, 'codes')).map((f) => 'codes/' + f))
  .filter((f) => f.endsWith('.html'));

// 1. data -> pages -> index
const cats = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/categories.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/codes.json'), 'utf8'));
let total = 0;
for (const c of cats) {
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', c.key + '.json'), 'utf8'));
  total += list.length;
  const page = fs.readFileSync(path.join(ROOT, 'pages', c.key + '.html'), 'utf8');
  for (const e of list) {
    const hit = index.codes.find((x) => x.c === e.code && x.p === c.key);
    if (!hit) { bad('not in search index: ' + c.key + ' ' + e.code); continue; }
    if (!fs.existsSync(path.join(ROOT, 'codes', hit.u + '.html'))) bad('no page for ' + e.code);
    if (!page.includes('codes/' + hit.u + '.html"')) bad(c.key + '.html does not list ' + e.code);
    const html = fs.readFileSync(path.join(ROOT, 'codes', hit.u + '.html'), 'utf8');
    if (!html.includes('<dt>Programmer response</dt>')) bad('entry page incomplete: ' + e.code);
  }
}
if (index.codes.length !== total) bad('index has ' + index.codes.length + ' entries, data has ' + total);
if (htmlFiles.filter((f) => f.startsWith('codes/')).length !== total) bad('codes/ has stray or missing pages');

// 2. links and CSP hygiene
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const f of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const dir = path.dirname(f);
  const re = /\s(?:href|src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    let url = m[1].replace(/&amp;/g, '&');
    if (/^(https?:)?\/\//.test(url)) {
      if (!url.startsWith('https://mpendyala3.github.io' + BASE)) bad(f + ': external URL ' + url);
      continue;
    }
    if (url.startsWith('#') || url.startsWith('mailto:')) continue;
    url = url.split('#')[0].split('?')[0];
    let target = url.startsWith(BASE) ? url.slice(BASE.length) : path.posix.join(dir === '.' ? '' : dir, url);
    if (url.startsWith('/') && !url.startsWith(BASE)) { bad(f + ': absolute path outside the site ' + url); continue; }
    if (target === '' || target.endsWith('/') || target === '.') target = path.posix.join(target, 'index.html');
    if (!fs.existsSync(path.join(ROOT, target))) bad(f + ': broken link ' + m[1]);
  }
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)/.test(html)) bad(f + ': inline script');
  if (/\sstyle="/.test(html)) bad(f + ': inline style attribute');
  if (/\son[a-z]+="/.test(html)) bad(f + ': inline event handler');
  if (!html.includes('http-equiv="Content-Security-Policy"')) bad(f + ': no CSP');
  (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []).forEach((s) => {
    try { JSON.parse(s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')); } catch (e) { bad(f + ': invalid JSON-LD'); }
  });
  if (f !== '404.html' && !sitemap.includes(BASE + (f === 'index.html' ? '' : f) + '<')) bad(f + ': missing from sitemap');
}
for (const asset of ['assets/og-image.png', 'assets/favicon.svg', 'robots.txt', 'llms.txt', '.nojekyll']) {
  if (!fs.existsSync(path.join(ROOT, asset))) bad('missing ' + asset);
}

if (problems.length) {
  console.error(problems.slice(0, 40).join('\n'));
  console.error(problems.length + ' problem(s)');
  process.exit(1);
}
console.log('ok: ' + total + ' entries, ' + htmlFiles.length + ' pages, all links resolve');
