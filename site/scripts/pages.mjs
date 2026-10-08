// Generates the static HTML pages from data/projects.json, data/media.json,
// data/stats.json and public/charts/*.svg, plus sitemap.xml and robots.txt.
// Used by vite.config.js (dev and build) and runnable on its own.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout } from '../src/templates/layout.mjs';
import { home } from '../src/templates/home.mjs';
import { project } from '../src/templates/project.mjs';

const SITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function generatePages({ base = '/' } = {}) {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'data', f), 'utf8'));
  const db = read('projects.json');
  const media = fs.existsSync(path.join(SITE_DIR, 'data', 'media.json')) ? read('media.json') : {};
  const stats = fs.existsSync(path.join(SITE_DIR, 'data', 'stats.json')) ? read('stats.json') : { records: {}, totalRecords: 0 };
  const charts = {};
  for (const p of db.projects) {
    const f = path.join(SITE_DIR, 'public', 'charts', `${p.slug}.svg`);
    if (fs.existsSync(f)) charts[p.slug] = fs.readFileSync(f, 'utf8');
  }
  const { site } = db;
  const pages = [];

  const h = home({ base, db, charts, stats });
  write('index.html', layout({
    base,
    site,
    title: '',
    description: site.description,
    path: '',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: { '@type': 'Person', name: site.owner.name, url: site.siteUrl, sameAs: [site.owner.github] },
      hasPart: db.projects.map((p) => ({ '@type': 'CreativeWork', name: p.title, url: `${site.siteUrl}projects/${p.slug}/` })),
    },
    body: h.body,
    entry: 'main.js',
    bodyClass: 'is-home',
  }));
  pages.push({ name: 'index', file: 'index.html', path: '' });

  db.projects.forEach((p, i) => {
    const pr = project({ base, db, p, index: i, media, chart: charts[p.slug], stats });
    const og = pr.hero ? pr.hero.sources.jpg[pr.hero.sources.jpg.length - 1].src : 'og-image.png';
    const rel = `projects/${p.slug}/index.html`;
    write(rel, layout({
      base,
      site,
      title: p.title,
      description: p.pitch,
      path: `projects/${p.slug}/`,
      ogImage: og,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: p.title,
        description: p.pitch,
        url: `${site.siteUrl}projects/${p.slug}/`,
        author: { '@type': 'Person', name: site.owner.name },
        keywords: [p.domain, ...p.tools, ...p.tags].join(', '),
        dateCreated: String(p.year),
        isBasedOn: p.data.url || undefined,
      },
      body: pr.body,
      entry: 'project.js',
      bodyClass: 'is-project',
    }));
    pages.push({ name: `projects-${p.slug}`, file: rel, path: `projects/${p.slug}/` });
  });

  write('404.html', layout({
    base,
    site,
    title: 'Not found',
    description: 'That page does not exist.',
    path: '404.html',
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Not found' },
    body: `<section class="section"><div class="wrap"><p class="eyebrow">404</p><h1 class="section__title">Nothing here.</h1><p class="section__lede">The page you asked for does not exist. <a href="${base}">Back to the work.</a></p></div></section>`,
    entry: 'project.js',
  }));
  pages.push({ name: '404', file: '404.html', path: '404.html' });

  const now = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .filter((p) => p.name !== '404')
  .map((p) => `  <url><loc>${site.siteUrl}${p.path}</loc><lastmod>${now}</lastmod><priority>${p.name === 'index' ? '1.0' : '0.8'}</priority></url>`)
  .join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(SITE_DIR, 'public', 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(SITE_DIR, 'public', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.siteUrl}sitemap.xml\n`);
  return pages;

  function write(rel, html) {
    const f = path.join(SITE_DIR, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, html);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.env.BASE_PATH || '/';
  const pages = generatePages({ base });
  console.log(`[site] generated ${pages.length} pages with base ${base}`);
}
