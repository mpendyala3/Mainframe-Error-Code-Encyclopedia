# Mainframe Error Code Encyclopedia

A static, searchable encyclopedia of DB2 SQLCODEs and z/OS mainframe errors. Styled as a liquid-glass 3270 terminal with CRT scanlines, phosphor green, and matrix-rain backdrop.

Live site: https://mpendyala3.github.io/Mainframe-Error-Code-Encyclopedia/

## Features

- 240+ DB2 SQLCODEs with description, common cause, fix, and example
- Interactive globe of error codes (golden-angle ellipse layout, slow rotation)
- Terminal-style search bar (debounced, accepts `803`, `-803`, `SQLCODE -803`)
- Category page with filters (constraint, deadlock, bind, etc.)
- Liquid-glass modal with copy-to-clipboard
- Full SEO: meta tags, Open Graph, Twitter cards, JSON-LD (WebSite, Breadcrumb, FAQ)
- Accessibility: ARIA roles, focus trap, skip link, `prefers-reduced-motion`
- Sitemap, robots.txt

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

- JCL return codes
- VSAM status codes
- z/OS system abend codes (S0C7, S0C1, S806, etc.)
