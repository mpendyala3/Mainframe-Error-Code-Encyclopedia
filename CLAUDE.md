# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

- Platform: Windows 11, PowerShell
- GitHub account: `mpendyala3` — authenticated via `gh` CLI (stored in OS keyring)
- Hosted on GitHub Pages: `https://mpendyala3.github.io/Mainframe-Error-Code-Encyclopedia/`

## GitHub CLI

`gh` was installed via winget and may not be on PATH in a fresh PowerShell session. Always refresh PATH before calling it:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
gh <command>
```

## Local Development

No build step. Any static file server works:

```bash
python -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080`. There are no tests, no linter config, no package.json.

## Cache Busting

Every `<link>` and `<script>` tag in all 16 HTML files uses a `?v=N` query string (e.g. `main.css?v=17`). **Bump the version number whenever CSS or JS changes are deployed.** There is a PowerShell one-liner to do this across all files:

```powershell
$root = "D:\Murali - Projects\Claude Code\mainframe-error-code-encyclopedia"
$files = @("$root\index.html") + (Get-ChildItem "$root\pages\*.html" | Select-Object -ExpandProperty FullName)
foreach ($f in $files) { (Get-Content $f -Raw) -replace '\?v=17', '?v=18' | Set-Content $f -Encoding utf8 }
```

## Architecture

### Two-tier page model

**Home page** (`index.html`) loads:
1. `js/db2-sql-codes.js` → sets `window.DB2_CODES`
2. `js/home-extra-codes.js` → sets `window.HOME_EXTRA_CODES`
3. `js/main.js` — merges them: `DB2_CODES.concat(HOME_EXTRA_CODES)` for the marquee

**Category pages** (`pages/*.html`) each load:
1. A per-category data file (e.g. `js/batch-codes.js`) → sets `window.MF_CODES`
2. `js/main.js` — detects `window.MF_CODES` and skips DB2 merge; still runs nav, modal, search
3. `js/category-page.js` — builds filter buttons, renders the code grid, applies `?filter=` from URL

`main.js` uses this merge line to decide which codes to display:
```js
const CODES = window.MF_CODES ||
  (window.DB2_CODES ? window.DB2_CODES.concat(window.HOME_EXTRA_CODES || []) : []);
```

### Data schema

Every code object across all data files must conform to:
```js
{ code, title, category, severity, description, cause, fix, example }
```
`severity` values: `"ERROR"`, `"WARNING"`, `"INFO"`. `category` must match the string used in filter buttons exactly (case-sensitive).

### Nav system (entirely JS-driven)

`initNavDropdowns()` in `main.js` builds **all** dropdown `<ul>` elements dynamically from the `NAV_CATEGORIES` map. The HTML only contains the bare `<li><a>` top-level items.

- Pages `devops`, `printing`, `hardware`, `vendor` are grouped under `[MORE]` on desktop (two-level fly-out).
- On mobile (≤1024px) `initMobileNav()` replaces the `[MORE]` list item with the four individual page links inline in the horizontal scroll strip.
- `initLogoLink()` wraps `.nav-logo` in an `<a>` tag at runtime — no HTML changes needed to add/update the logo link.

**Active nav highlighting**: category pages set `data-active="<pageKey>"` on `<ul class="nav-links">`. `highlightNav()` in `category-page.js` reads it and adds `.active` to the matching `a[data-key]`. For the MORE group, it highlights `[MORE]` on desktop (`key === 'more' && MORE_GROUP.has(activeKey)`), and the individual link on mobile (since `initMobileNav()` has already replaced `[MORE]`).

**`?filter=CATEGORY` URL parameter**: set by dropdown links; auto-applied on page load in `category-page.js` to pre-select a category filter and scroll to the grid.

### Modal prefix logic

`openModal()` uses `isSqlcode = /^[+-]\d+$/.test(codeObj.code)` to decide whether to prefix the header with "SQLCODE". DB2 numeric codes get the prefix; abend codes, message IDs, etc. do not.

### Marquee responsiveness

`initGlobe()` / `build()` in `main.js` checks viewport width at build time:
- Mobile (`W < 640`): filters codes to HIGH+MED importance only, scales fonts to 0.65×
- Tablet (`640 ≤ W < 1024`): HIGH+MED pool, 0.82× scale
- Desktop: all codes, 1.0× scale

`HIGH_IMPORTANCE` and `MEDIUM_IMPORTANCE` sets at the top of `main.js` control which codes are treated as high/medium for sizing and mobile filtering.

### Adding a new category page

1. Create `js/<name>-codes.js` setting `window.MF_CODES = [...]`
2. Copy any `pages/*.html` as a template; update `data-active`, page title, `<h1>`, description, and the `<script>` tag pointing to the new data file
3. Add the page key and its categories to `NAV_CATEGORIES` in `main.js`
4. If it belongs under `[MORE]`, add it to `MORE_GROUP` and `MORE_LABELS` in `main.js`, and add `{ href, label, key }` to `MORE_PAGES` in `initMobileNav()`
5. Update `sitemap.xml`

### PowerShell notes

`&&` operator fails in PowerShell 5.1 (Windows default). Use `;` for unconditional chaining or Python3 for multi-line string replacements across files:

```powershell
python -c "import pathlib; ..."
```
