// Downloads the README figures, crops and converts them to AVIF/WebP/JPEG at
// several widths, extracts notebook HTML embeds from the project archives and
// renders the Open Graph image and favicons. Writes data/media.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { loadProjects, ensureDir, PUBLIC_DIR, CACHE_DIR, repoPath, writeJson, SITE_DIR, log } from './lib.mjs';

const WIDTHS = [480, 960, 1600];
const db = loadProjects();
const mediaCache = ensureDir(path.join(CACHE_DIR, 'media'));
const media = {};

for (const p of db.projects) {
  media[p.slug] = { visuals: [], embeds: [] };
  const outDir = ensureDir(path.join(PUBLIC_DIR, 'media', p.slug));
  for (const [i, v] of (p.visuals || []).entries()) {
    const src = await fetchAsset(v.id);
    let img = sharp(src);
    const meta = await img.metadata();
    if (v.crop) {
      const region = {
        left: Math.round(v.crop.left * meta.width),
        top: Math.round(v.crop.top * meta.height),
        width: Math.round(v.crop.width * meta.width),
        height: Math.round(v.crop.height * meta.height),
      };
      img = img.extract(region);
    }
    const base = await img.toBuffer();
    const baseMeta = await sharp(base).metadata();
    const widths = WIDTHS.filter((w) => w < baseMeta.width);
    if (!widths.includes(baseMeta.width) && baseMeta.width <= 1600) widths.push(baseMeta.width);
    if (widths.length === 0) widths.push(baseMeta.width);
    const entry = {
      id: v.id,
      role: v.role,
      alt: v.alt,
      caption: v.caption || '',
      width: baseMeta.width,
      height: baseMeta.height,
      sources: { avif: [], webp: [], jpg: [] },
    };
    for (const w of widths) {
      const h = Math.round((baseMeta.height * w) / baseMeta.width);
      const name = `${i}-${w}`;
      const resized = sharp(base).resize({ width: w, withoutEnlargement: true });
      await resized.clone().avif({ quality: 55, effort: 4 }).toFile(path.join(outDir, `${name}.avif`));
      await resized.clone().webp({ quality: 78 }).toFile(path.join(outDir, `${name}.webp`));
      await resized.clone().flatten({ background: '#101216' }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(outDir, `${name}.jpg`));
      for (const ext of ['avif', 'webp', 'jpg']) entry.sources[ext].push({ w, h, src: `media/${p.slug}/${name}.${ext}` });
    }
    const lqip = await sharp(base).resize({ width: 24 }).blur(1).jpeg({ quality: 40 }).toBuffer();
    entry.lqip = `data:image/jpeg;base64,${lqip.toString('base64')}`;
    media[p.slug].visuals.push(entry);
    log(`media ${p.slug}/${i} ${baseMeta.width}x${baseMeta.height} -> ${widths.join(',')}`);
  }

  for (const e of p.embeds || []) {
    const dest = ensureDir(path.join(PUBLIC_DIR, 'embeds', p.slug));
    const archive = repoPath(e.file);
    if (!fs.existsSync(archive)) {
      log(`embed archive missing: ${e.file}`);
      continue;
    }
    execFileSync('unzip', ['-o', '-q', archive, e.member, '-d', dest]);
    const file = path.join(dest, e.member);
    const size = fs.statSync(file).size;
    media[p.slug].embeds.push({ title: e.title, kind: e.kind, src: `embeds/${p.slug}/${e.member}`, bytes: size });
    log(`embed ${p.slug}/${e.member} (${(size / 1024).toFixed(0)} KB)`);
  }
}

await renderBrandAssets();
writeJson(path.join(SITE_DIR, 'data', 'media.json'), media);
log('wrote data/media.json');

async function fetchAsset(id) {
  const cached = path.join(mediaCache, `${id}.png`);
  if (fs.existsSync(cached)) return cached;
  const url = `https://github.com/user-attachments/assets/${id}`;
  log(`downloading ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`);
  fs.writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  return cached;
}

async function renderBrandAssets() {
  const { site } = db;
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0a0b0f"/>
  <g fill="none" stroke="#ff5c1c" stroke-width="4" stroke-linecap="round">
    <path d="M12 46 L24 30 L34 38 L52 16"/>
  </g>
  <circle cx="52" cy="16" r="4" fill="#ff5c1c"/>
</svg>`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), favicon);
  await sharp(Buffer.from(favicon)).resize(32, 32).png().toFile(path.join(PUBLIC_DIR, 'favicon-32.png'));
  await sharp(Buffer.from(favicon)).resize(180, 180).png().toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  const n = db.projects.length;
  const domains = new Set(db.projects.map((p) => p.domain)).size;
  const bars = db.projects
    .map((p, i) => {
      const h = 60 + ((i * 53) % 140);
      return `<rect x="${760 + i * 56}" y="${470 - h}" width="36" height="${h}" rx="4" fill="${i % 2 ? '#ff5c1c' : '#4fd1c5'}" opacity="${0.55 + (i % 3) * 0.15}"/>`;
    })
    .join('');
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0b0f"/>
  <g stroke="#1f2330" stroke-width="1">${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}"/>`).join('')}${Array.from({ length: 21 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630"/>`).join('')}</g>
  <text x="80" y="140" font-family="Menlo, monospace" font-size="22" fill="#ff5c1c" letter-spacing="4">DATA SCIENCE PORTFOLIO</text>
  <text x="80" y="250" font-family="Georgia, serif" font-size="88" fill="#ecebe4">${escapeXml(site.title)}</text>
  <text x="80" y="330" font-family="Georgia, serif" font-size="40" fill="#a7a9b3" font-style="italic">Questions, asked of data.</text>
  <text x="80" y="520" font-family="Menlo, monospace" font-size="22" fill="#a7a9b3">${n} projects  /  ${domains} domains  /  Python, R, Power BI</text>
  ${bars}
  <rect x="80" y="560" width="1040" height="2" fill="#ff5c1c"/>
</svg>`;
  await sharp(Buffer.from(og)).png().toFile(path.join(PUBLIC_DIR, 'og-image.png'));
  log('brand assets rendered');
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
}
