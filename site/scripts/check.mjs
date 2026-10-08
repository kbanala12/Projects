// Opens every built page in headless Chromium under the production base path
// and reports console errors, failed requests, broken internal links, images
// that did not load, and exercises the gallery filters and search.
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { loadProjects } from './lib.mjs';

const db = loadProjects();
const { server, url: origin } = await serve(4174);
const browser = await chromium.launch();
const problems = [];
const checked = new Set();
const pages = ['', ...db.projects.map((p) => `projects/${p.slug}/`), '404.html'];

for (const rel of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const url = origin + rel;
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`${rel || '/'}: console error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`${rel || '/'}: page error: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`${rel || '/'}: request failed: ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !(rel === '404.html')) problems.push(`${rel || '/'}: ${r.status()} ${r.url()}`);
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  const imgs = await page.$$eval('img', (els) => els.map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute('alt') })));
  for (const i of imgs) {
    if (!i.ok) problems.push(`${rel || '/'}: image failed: ${i.src}`);
    if (i.alt == null) problems.push(`${rel || '/'}: image without alt: ${i.src}`);
  }
  const links = await page.$$eval('a[href]', (els) => els.map((a) => a.href));
  for (const l of links) {
    if (!l.startsWith(origin.replace(/\/$/, '')) || checked.has(l)) continue;
    checked.add(l);
    const target = l.split('#')[0];
    const res = await page.request.get(target);
    if (res.status() >= 400) problems.push(`${rel || '/'}: broken link ${l} -> ${res.status()}`);
  }
  if (rel === '') {
    const total = await page.$$eval('.card', (c) => c.length);
    await page.click('.fchip[data-filter="tool"][data-value="Python"]');
    await page.waitForTimeout(500);
    const shown = await page.$$eval('.card:not([hidden])', (c) => c.length);
    if (shown >= total || shown === 0) problems.push(`gallery filter Python gave ${shown} of ${total}`);
    await page.click('#clear');
    await page.fill('#q', 'medicare');
    await page.waitForTimeout(400);
    const s2 = await page.$$eval('.card:not([hidden])', (c) => c.length);
    if (s2 !== 1) problems.push(`gallery search "medicare" gave ${s2} cards`);
    await page.fill('#q', 'zzzz');
    await page.waitForTimeout(400);
    const emptyShown = await page.$eval('#empty', (e) => !e.hidden);
    if (!emptyShown) problems.push('empty state did not show');
    await page.click('#clear');
    await page.waitForTimeout(300);
    const restored = await page.$$eval('.card:not([hidden])', (c) => c.length);
    if (restored !== total) problems.push(`clear restored ${restored} of ${total}`);
    await page.screenshot({ path: '.cache/shot-home.png', fullPage: true });
  } else if (rel.startsWith('projects/')) {
    await page.screenshot({ path: `.cache/shot-${rel.split('/')[1]}.png`, fullPage: true });
  }
  await page.close();
  console.log(`[check] ${rel || '/'} ok (${links.length} links, ${imgs.length} images)`);
}

const mobile = await browser.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await mobile.goto(origin, { waitUntil: 'networkidle' });
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
if (overflow) problems.push('horizontal overflow at 360px');
await mobile.screenshot({ path: '.cache/shot-mobile.png', fullPage: true });
await mobile.goto(origin + 'projects/nj-load-forecasting/', { waitUntil: 'networkidle' });
const overflow2 = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
if (overflow2) problems.push('horizontal overflow at 360px on project page');
await mobile.screenshot({ path: '.cache/shot-mobile-project.png', fullPage: true });

await browser.close();
server.close();
if (problems.length) {
  console.log('\nProblems:');
  problems.forEach((p) => console.log(' -', p));
  process.exit(1);
}
console.log('\n[check] all pages clean');
