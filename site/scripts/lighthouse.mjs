// Runs Lighthouse against the production build served under the base path.
import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { launch } from 'chrome-launcher';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { loadProjects, SITE_DIR, ensureDir } from './lib.mjs';

const db = loadProjects();
const { server, url: origin } = await serve(4175);
const chromePath = process.env.CHROME_PATH || chromium.executablePath();
const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] });
const out = ensureDir(path.join(SITE_DIR, '.lighthouse'));
const targets = [
  { name: 'home', url: origin },
  { name: 'project', url: `${origin}projects/${db.projects[0].slug}/` },
];
const rows = [];
for (const t of targets) {
  for (const formFactor of ['mobile', 'desktop']) {
    const result = await lighthouse(
      t.url,
      { port: chrome.port, output: 'html', logLevel: 'error' },
      formFactor === 'desktop' ? desktopConfig : undefined
    );
    const c = result.lhr.categories;
    const row = {
      page: t.name,
      form: formFactor,
      performance: Math.round(c.performance.score * 100),
      accessibility: Math.round(c.accessibility.score * 100),
      bestPractices: Math.round(c['best-practices'].score * 100),
      seo: Math.round(c.seo.score * 100),
    };
    rows.push(row);
    fs.writeFileSync(path.join(out, `${t.name}-${formFactor}.html`), result.report);
    const audits = Object.values(result.lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative');
    console.log(`\n${t.name} ${formFactor}: ${JSON.stringify(row)}`);
    for (const a of audits.slice(0, 12)) console.log(`  - ${a.id}: ${Math.round(a.score * 100)} ${a.displayValue || ''}`);
  }
}
await chrome.kill();
server.close();
console.table(rows);
fs.writeFileSync(path.join(out, 'scores.json'), JSON.stringify(rows, null, 2));
