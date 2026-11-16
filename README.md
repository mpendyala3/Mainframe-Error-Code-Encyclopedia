# Mainframe Error Code Encyclopedia

A static, searchable reference of IBM z/OS error codes: system and user abends, DB2 SQLCODEs, JCL/JES, VSAM,
CICS, MQ, RACF, Language Environment, SMP/E and more. Each entry gives an explanation, the likely cause, the
programmer response and an example.

Live site: https://mpendyala3.github.io/Mainframe-Error-Code-Encyclopedia/

## What it does

- One page per code (`codes/s0c7.html`, `codes/sqlcode-805.html`), one listing per category, one home page
- Search over every entry from any page: type `0C7`, `-805`, `sqlcode 911`, `IEC161I` or a keyword like `deadlock`
- Keyboard: `/` search, arrows and Enter in the results, `J`/`K` through a listing, left/right between entries, `T` theme
- Two themes: green-bar listing paper (light) and a 3270 screen (dark); follows the system setting until you choose
- Works without JavaScript: every code is a plain link to a static page
- No third-party requests: fonts are self-hosted, there is no analytics, and a strict Content-Security-Policy is set

## Structure

- `data/categories.json` and `data/<key>.json`: the content. This is the only place to edit entries.
- `tools/build.js`: generates `index.html`, `404.html`, `pages/`, `codes/`, `assets/codes.json`, `sitemap.xml`, `llms.txt`
- `tools/check.js`: verifies every entry has a page, every link resolves and no page breaks the CSP rules
- `tools/serve.js`: local preview under the same base path GitHub Pages uses
- `css/main.css`, `js/app.js`, `js/theme.js`: the whole front end, no dependencies

## Editing

```bash
node tools/build.js
```

```bash
node tools/check.js
```

```bash
node tools/serve.js
```

Then open http://localhost:8080/Mainframe-Error-Code-Encyclopedia/. Commit the generated HTML together with the data.

## Deploy

GitHub Pages serves the `main` branch root. Pushing to `main` deploys.

## Notes

An independent project, not affiliated with or endorsed by IBM or any other vendor. Entries are summaries, not
vendor documentation. IBM Plex is used under the SIL Open Font License (`assets/fonts/OFL.txt`).
