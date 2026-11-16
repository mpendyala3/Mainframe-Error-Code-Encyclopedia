#!/usr/bin/env node
/* Local preview that mimics GitHub Pages: the site is served under
 * /Mainframe-Error-Code-Encyclopedia/ and unknown paths get 404.html.
 *
 *   node tools/serve.js [port]      then open http://localhost:8080/Mainframe-Error-Code-Encyclopedia/
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = '/Mainframe-Error-Code-Encyclopedia/';
const PORT = Number(process.argv[2]) || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') { res.writeHead(302, { Location: BASE }); res.end(); return; }
  let file = null;
  if (p.startsWith(BASE)) {
    const rel = path.normalize(p.slice(BASE.length)).replace(/^(\.\.[\\/])+/, '');
    file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) file = null;
    else if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  }
  const ok = file && fs.existsSync(file) && fs.statSync(file).isFile();
  if (!ok) file = path.join(ROOT, '404.html');
  res.writeHead(ok ? 200 : 404, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log('http://localhost:' + PORT + BASE));
