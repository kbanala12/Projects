# Showcase site

A static portfolio for the data science projects in this repository, built
with Vite and vanilla JavaScript and deployed to GitHub Pages by
`.github/workflows/deploy.yml`. Everything on the site is generated from one
file: `site/data/projects.json`.

## Run locally

```bash
cd site
npm install
npm run generate   # inventory, figures, charts, embeds, OG image (needs network once)
npm run dev        # http://localhost:5173/
```

`npm run generate` runs four scripts in order:

| Script | What it does | Output |
| --- | --- | --- |
| `scripts/discover.mjs` | Scans the repo for project folders, adds stubs for new ones, validates every entry and prints a summary table | updates `data/projects.json` |
| `scripts/media.mjs` | Downloads the README figures, crops them, converts to AVIF, WebP and JPEG at 480, 960 and 1600 px, extracts notebook HTML from the zips, renders the OG image and favicons | `public/media/`, `public/embeds/`, `data/media.json` |
| `scripts/charts.mjs` | Computes one signature SVG per project from the committed CSV and XLSX data | `public/charts/`, `data/stats.json` |
| `scripts/pages.mjs` | Renders `index.html`, `projects/<slug>/index.html`, `404.html`, `sitemap.xml` and `robots.txt` | site root and `public/` |

The generated files are git-ignored. `npm run build` regenerates the pages
and writes the production bundle to `site/dist` under the `/Projects/` base
path. `node scripts/serve.mjs` serves that build at
`http://localhost:4173/Projects/` exactly as Pages will.

## Verify

```bash
npm run build
npm run check        # headless Chromium: console errors, failed requests, broken links, images, filters, 360px overflow
npm run lighthouse   # Lighthouse mobile and desktop for the home and a project page, reports in .lighthouse/
```

## Add a project

1. Create a folder at the repository root with a `README.md` whose first `#`
   heading is the project title. Commit the data files you want linked.
2. Run `npm run discover`. A stub entry appears at the end of
   `data/projects.json` with `needsReview: true` and every `TODO` to fill:
   pitch, domain, tags, tools, languages, year, data source, the
   question/method/finding story, metrics, and alt text for each figure the
   README embeds.
3. Optional: give the project a computed chart. Add a generator function to
   `scripts/charts.mjs` that returns `{ svg, records }` and name it in the
   entry's `signature.generator`. Without one the card falls back to a blank
   panel, so this is worth doing.
4. Optional: list notebook HTML exports inside zip archives under `embeds`
   and they will be extracted and loaded lazily on the detail page.
5. Run `npm run generate && npm run build && npm run check`. Push to `main`
   and the workflow deploys.

To change an existing project, edit its entry in `projects.json` and rebuild.
Nothing else is hand-written per project.

## Fill in the About section

Replace every `PLACEHOLDER` value under `site.owner` in `projects.json`:
role, location, bio, email, LinkedIn, and optionally a resume path (drop the
PDF in `site/public/`).

## Layout

```
site/
  data/projects.json      single source of truth
  scripts/                generate, check, lighthouse, serve
  src/templates/          HTML templates (JS template literals)
  src/lib/                hero flow field, gallery filters, numbers, embeds
  src/styles/             tokens, base, components
  public/                 static assets (generated ones are git-ignored)
```

## Design notes

Dark instrument palette with one accent (`#ff5c1c`) and a six-stop
sequential ramp shared by the build-time charts and the UI tokens. Type is
Fraunces (display), Inter (body) and JetBrains Mono (data labels), all
self-hosted. The hero flow field reacts to the cursor and scroll, pauses when
off screen, and draws a single static frame under `prefers-reduced-motion`.
