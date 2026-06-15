# Mainframe Error Code Encyclopedia

A static, searchable encyclopedia of DB2 SQLCODEs and z/OS mainframe errors. Styled as a liquid-glass 3270 terminal with CRT scanlines, phosphor green, and matrix-rain backdrop.

Live site: https://mpendyala3.github.io/Mainframe-Error-Code-Encyclopedia/

## Features

- 450+ error codes across 15 categories, each with description, common cause, fix, and example
- 15 category pages: Databases, Job Control and Batch, Operating System and MVS, Storage and Data Sets,
  Transaction Processing and Messaging, Networking and Communications, Security and Cryptography,
  Interactive Tools and Scripting, Languages/Compilers/Runtimes, Installation and Software Maintenance,
  Scheduling/Monitoring/Automation, DevOps/Testing/Debugging, Printing and Output Management,
  Hardware/Virtualization/DR, and Vendor/Business/Custom Applications
- Interactive globe of DB2 codes on the home page (slow left-to-right rotation, pauses on hover, push-on-hover)
- Terminal-style search bar (debounced, accepts `803`, `-803`, `SQLCODE -803`)
- Category pages with auto-generated filters (filters built from each category's data)
- Liquid-glass modal with copy-to-clipboard
- Full SEO: meta tags, Open Graph, Twitter cards, JSON-LD (WebSite, Breadcrumb, FAQ)
- Accessibility: ARIA roles, focus trap, skip link, `prefers-reduced-motion`
- Sitemap, robots.txt

## Structure

- `index.html` — landing page with the rotating DB2 code globe
- `pages/*.html` — one page per category; all share `css/main.css`, `js/main.js`, and `js/category-page.js`
- `js/<category>-codes.js` — per-category data file setting `window.MF_CODES`
- `js/db2-sql-codes.js` — DB2 data (sets `window.DB2_CODES`, used by home globe and the Databases page)

## Tech

Pure HTML5, CSS3, vanilla JavaScript. No frameworks. Google Fonts only.

## Local dev

```bash
# Any static server works
python -m http.server 8080
# or
npx serve .
```

Then open http://localhost:8080.

## Deploy

Push to `main` and enable GitHub Pages from the repository root.

## Roadmap

- Expand each category with more codes
- Per-code deep-link pages for SEO
- Cross-category global search
