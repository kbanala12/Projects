// Renders one signature SVG per project from the data files committed in the
// repository, and computes the figures behind the By the numbers section.
// Output: public/charts/<slug>.svg and data/stats.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { csvParse } from 'd3-dsv';
import { scaleLinear, scaleBand, scaleSequential } from 'd3-scale';
import { interpolateRgbBasis } from 'd3-interpolate';
import { mean, quantile, max, rollup, sum } from 'd3-array';
import { format } from 'd3-format';
import XLSX from 'xlsx';
import { loadProjects, ensureDir, PUBLIC_DIR, CACHE_DIR, repoPath, writeJson, SITE_DIR, log } from './lib.mjs';

const W = 600;
const H = 380;
const PAL = {
  ink: '#0a0b0f',
  line: '#2a2e38',
  text: '#ecebe4',
  text2: '#a7a9b3',
  text3: '#70737f',
  accent: '#ff5c1c',
  teal: '#4fd1c5',
  lavender: '#a78bfa',
};
// Sequential palette shared with src/styles/tokens.css
export const SEQ = ['#1b1f3a', '#5b2a6e', '#b23a48', '#ff5c1c', '#ffb46b', '#fff0d0'];
const seq = (domain) => scaleSequential(domain, interpolateRgbBasis(SEQ));
const pct = format('.0%');
const pct1 = format('.1%');

const db = loadProjects();
const chartDir = ensureDir(path.join(PUBLIC_DIR, 'charts'));
const stats = { records: {}, generatedAt: new Date().toISOString() };

const generators = {
  readmissionByInpatient,
  diabetesByDiet,
  newarkTempHeatmap,
  medicareByState,
  sdtAffect,
  programsByRegion,
};

for (const p of db.projects) {
  if (!p.signature?.generator) continue;
  const gen = generators[p.signature.generator];
  if (!gen) {
    log(`no generator named ${p.signature.generator} for ${p.slug}`);
    continue;
  }
  const { svg, records } = await gen(p);
  fs.writeFileSync(path.join(chartDir, `${p.slug}.svg`), svg);
  stats.records[p.slug] = records;
  log(`chart ${p.slug} (${records.toLocaleString()} records)`);
}
stats.totalRecords = sum(Object.values(stats.records));
writeJson(path.join(SITE_DIR, 'data', 'stats.json'), stats);
log(`total records ${stats.totalRecords.toLocaleString()}`);

// ---------- helpers ----------

function svgDoc(body, title, desc) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d" class="sig" font-family="var(--font-mono, ui-monospace, monospace)" font-size="12">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>
${body}
</svg>`;
}

function esc(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
}

function text(x, y, s, opts = {}) {
  const { fill = PAL.text2, anchor = 'start', size = 12, weight = 400, cls = '', dy = '0.35em', rotate = 0 } = opts;
  const tr = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" dy="${dy}" fill="${fill}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}"${cls ? ` class="${cls}"` : ''}${tr}>${esc(s)}</text>`;
}

function readCsv(rel) {
  return csvParse(fs.readFileSync(repoPath(rel), 'utf8'));
}

// ---------- generators ----------

async function readmissionByInpatient(p) {
  const rows = readCsv('Capstone/Patient Readmission/diabetic_data.csv');
  const cap = 6;
  const groups = rollup(
    rows,
    (v) => ({ n: v.length, rate: mean(v, (d) => (d.readmitted === '<30' ? 1 : 0)) }),
    (d) => Math.min(+d.number_inpatient, cap)
  );
  const data = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k, label: k === cap ? `${cap}+` : String(k), ...v }));
  const baseline = mean(rows, (d) => (d.readmitted === '<30' ? 1 : 0));
  const m = { top: 36, right: 24, bottom: 56, left: 52 };
  const x = scaleBand(data.map((d) => d.label), [m.left, W - m.right]).padding(0.22);
  const y = scaleLinear([0, 0.45], [H - m.bottom, m.top]);
  const color = seq([-0.15, 0.45]);
  let body = '';
  for (const t of [0, 0.1, 0.2, 0.3, 0.4]) {
    body += `<line x1="${m.left}" x2="${W - m.right}" y1="${y(t)}" y2="${y(t)}" stroke="${PAL.line}" stroke-dasharray="2 4"/>`;
    body += text(m.left - 8, y(t), pct(t), { anchor: 'end', fill: PAL.text3, size: 11, cls: 'chart-minor' });
  }
  data.forEach((d, i) => {
    body += `<rect class="bar" style="--i:${i}" x="${x(d.label)}" y="${y(d.rate)}" width="${x.bandwidth()}" height="${y(0) - y(d.rate)}" rx="3" fill="${color(d.rate)}"><title>${d.label} prior visits: ${pct1(d.rate)} of ${d.n.toLocaleString()} encounters</title></rect>`;
    body += text(x(d.label) + x.bandwidth() / 2, y(d.rate) - 10, pct1(d.rate), { anchor: 'middle', fill: PAL.text, size: 12, weight: 600 });
    body += text(x(d.label) + x.bandwidth() / 2, H - m.bottom + 16, d.label, { anchor: 'middle', fill: PAL.text2 });
  });
  body += `<line x1="${m.left}" x2="${W - m.right}" y1="${y(baseline)}" y2="${y(baseline)}" stroke="${PAL.teal}" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  body += text(W - m.right, y(baseline) - 9, `baseline ${pct1(baseline)}`, { anchor: 'end', fill: PAL.teal, size: 11 });
  body += text(W / 2, H - 14, 'inpatient visits in the prior year', { anchor: 'middle', fill: PAL.text3, size: 11, cls: 'chart-minor' });
  body += text(m.left, 16, 'readmitted within 30 days', { fill: PAL.text3, size: 11, cls: 'chart-minor' });
  return { svg: svgDoc(body, p.signature.title, p.signature.description), records: rows.length };
}

async function diabetesByDiet(p) {
  const rows = readCsv('Diabetes Analysis Project/Diabetes Data/diabetes_data.csv');
  const diet = (d) => (+d.DietQuality < 3.34 ? 'Poor' : +d.DietQuality < 6.67 ? 'Average' : 'Good');
  const bmi = (d) => (+d.BMI < 18.5 ? 'Underweight' : +d.BMI < 25 ? 'Normal' : +d.BMI < 30 ? 'Overweight' : 'Obese');
  const diets = ['Poor', 'Average', 'Good'];
  const bmis = ['Underweight', 'Normal', 'Overweight', 'Obese'];
  const cells = rollup(rows, (v) => ({ n: v.length, rate: mean(v, (d) => +d.Diagnosis) }), diet, bmi);
  const m = { top: 44, right: 24, bottom: 24, left: 96 };
  const x = scaleBand(bmis, [m.left, W - m.right]).padding(0.08);
  const y = scaleBand(diets, [m.top, H - m.bottom]).padding(0.1);
  const color = seq([0.3, 0.5]);
  let body = '';
  for (const b of bmis) body += text(x(b) + x.bandwidth() / 2, m.top - 14, b, { anchor: 'middle', fill: PAL.text2, size: 11 });
  for (const dq of diets) body += text(m.left - 12, y(dq) + y.bandwidth() / 2, `${dq} diet`, { anchor: 'end', fill: PAL.text2, size: 11 });
  let i = 0;
  for (const dq of diets) {
    for (const b of bmis) {
      const c = cells.get(dq)?.get(b) || { n: 0, rate: 0 };
      body += `<rect class="cell" style="--i:${i++}" x="${x(b)}" y="${y(dq)}" width="${x.bandwidth()}" height="${y.bandwidth()}" rx="6" fill="${color(c.rate)}"><title>${dq} diet, ${b}: ${pct1(c.rate)} diagnosed of ${c.n}</title></rect>`;
      const dark = c.rate > 0.42;
      body += text(x(b) + x.bandwidth() / 2, y(dq) + y.bandwidth() / 2 - 6, pct(c.rate), { anchor: 'middle', fill: dark ? PAL.ink : PAL.text, size: 22, weight: 600 });
      body += text(x(b) + x.bandwidth() / 2, y(dq) + y.bandwidth() / 2 + 16, `n=${c.n}`, { anchor: 'middle', fill: dark ? '#3a2a1a' : PAL.text2, size: 11, cls: 'chart-minor' });
    }
  }
  return { svg: svgDoc(body, p.signature.title, p.signature.description), records: rows.length };
}

async function newarkTempHeatmap(p) {
  const dir = ensureDir(path.join(CACHE_DIR, 'nj'));
  const archive = repoPath('New Jersey Load Prediction Project/Cleaned utility Code/JCPL.zip');
  const member = 'hourly_weather_newark_2023.csv';
  if (!fs.existsSync(path.join(dir, member))) execFileSync('unzip', ['-o', '-q', archive, member, '-d', dir]);
  const rows = csvParse(fs.readFileSync(path.join(dir, member), 'utf8'));
  const parsed = rows
    .map((d) => {
      const mt = d.Time.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)$/);
      const t = parseFloat(d.Temperature);
      if (!mt || Number.isNaN(t)) return null;
      let h = +mt[4] % 12;
      if (mt[6] === 'PM') h += 12;
      return { month: +mt[2] - 1, hour: h, temp: t };
    })
    .filter(Boolean);
  const grid = rollup(parsed, (v) => mean(v, (d) => d.temp), (d) => d.month, (d) => d.hour);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = { top: 28, right: 20, bottom: 30, left: 44 };
  const x = scaleBand(Array.from({ length: 24 }, (_, i) => i), [m.left, W - m.right]).padding(0.08);
  const y = scaleBand(Array.from({ length: 12 }, (_, i) => i), [m.top, H - m.bottom]).padding(0.12);
  const temps = parsed.map((d) => d.temp);
  const lo = quantile(temps, 0.02);
  const hi = quantile(temps, 0.98);
  const color = seq([lo, hi]);
  let body = '';
  let i = 0;
  for (let mo = 0; mo < 12; mo++) {
    body += text(m.left - 8, y(mo) + y.bandwidth() / 2, months[mo], { anchor: 'end', fill: PAL.text2, size: 11 });
    for (let h = 0; h < 24; h++) {
      const v = grid.get(mo)?.get(h);
      if (v == null) continue;
      body += `<rect class="cell" style="--i:${i++}" x="${x(h)}" y="${y(mo)}" width="${x.bandwidth()}" height="${y.bandwidth()}" rx="2" fill="${color(v)}"><title>${months[mo]} ${h}:00 mean ${v.toFixed(0)}F</title></rect>`;
    }
  }
  for (const h of [0, 6, 12, 18, 23]) body += text(x(h) + x.bandwidth() / 2, H - m.bottom + 14, `${h}h`, { anchor: 'middle', fill: PAL.text3, size: 11 });
  body += text(m.left, 12, `mean temperature, ${lo.toFixed(0)}F to ${hi.toFixed(0)}F`, { fill: PAL.text3, size: 11, cls: 'chart-minor' });
  return { svg: svgDoc(body, p.signature.title, p.signature.description), records: countArchiveRows() };
}

function countArchiveRows() {
  // Rows of hourly weather across the four utility archives, de-duplicated by file name.
  const dir = ensureDir(path.join(CACHE_DIR, 'nj'));
  const archives = ['JCPL.zip', 'PSEG.zip', 'Project-ACE-complete.zip', 'Project-RECO-complete.zip'];
  const seen = new Map();
  for (const a of archives) {
    const listing = execFileSync('unzip', ['-Z1', repoPath(`New Jersey Load Prediction Project/Cleaned utility Code/${a}`)], { encoding: 'utf8' });
    for (const member of listing.split('\n')) {
      if (!member.endsWith('.csv') || member.includes('__MACOSX')) continue;
      const base = path.basename(member);
      if (seen.has(base)) continue;
      execFileSync('unzip', ['-o', '-q', repoPath(`New Jersey Load Prediction Project/Cleaned utility Code/${a}`), member, '-d', dir]);
      const lines = fs.readFileSync(path.join(dir, member), 'utf8').split('\n').filter(Boolean).length - 1;
      seen.set(base, lines);
    }
  }
  return sum([...seen.values()]);
}

async function medicareByState(p) {
  const wb = XLSX.readFile(repoPath('Patient Outcomes Project/Project Data/Medicare Inpatient 2017.xlsx'));
  const charges = XLSX.utils.sheet_to_json(wb.Sheets['Medicare Inpatient 2017']);
  const providers = XLSX.utils.sheet_to_json(wb.Sheets['Providers']);
  const state = new Map(providers.map((r) => [r['Provider Id'], r['Provider State']]));
  const byState = rollup(
    charges,
    (v) => ({
      discharges: sum(v, (d) => +d['Total Discharges']),
      weighted: sum(v, (d) => +d['Total Discharges'] * +d['Average Total Payments']) / sum(v, (d) => +d['Total Discharges']),
    }),
    (d) => state.get(d['Provider Id']) || '??'
  );
  const data = [...byState.entries()]
    .map(([k, v]) => ({ state: k, ...v }))
    .filter((d) => d.state !== '??')
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 15);
  const national = sum(charges, (d) => +d['Total Discharges'] * +d['Average Total Payments']) / sum(charges, (d) => +d['Total Discharges']);
  const m = { top: 20, right: 70, bottom: 28, left: 40 };
  const x = scaleLinear([0, max(data, (d) => d.weighted) * 1.02], [m.left, W - m.right]);
  const y = scaleBand(data.map((d) => d.state), [m.top, H - m.bottom]).padding(0.25);
  const color = seq([national * 0.8, max(data, (d) => d.weighted)]);
  const money = format('$,.0f');
  let body = '';
  for (const t of x.ticks(4)) {
    body += `<line x1="${x(t)}" x2="${x(t)}" y1="${m.top}" y2="${H - m.bottom}" stroke="${PAL.line}" stroke-dasharray="2 4"/>`;
    body += text(x(t), H - m.bottom + 14, `$${t / 1000}K`, { anchor: 'middle', fill: PAL.text3, size: 11, cls: 'chart-minor' });
  }
  data.forEach((d, i) => {
    body += `<rect class="bar" style="--i:${i}" x="${m.left}" y="${y(d.state)}" width="${x(d.weighted) - m.left}" height="${y.bandwidth()}" rx="3" fill="${color(d.weighted)}"><title>${d.state}: ${money(d.weighted)} across ${d.discharges.toLocaleString()} discharges</title></rect>`;
    body += text(m.left - 8, y(d.state) + y.bandwidth() / 2, d.state, { anchor: 'end', fill: PAL.text2, size: 11 });
    body += text(x(d.weighted) + 6, y(d.state) + y.bandwidth() / 2, money(d.weighted), { fill: PAL.text, size: 11 });
  });
  body += `<line x1="${x(national)}" x2="${x(national)}" y1="${m.top - 6}" y2="${H - m.bottom}" stroke="${PAL.teal}" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  body += text(x(national) + 6, m.top - 6, `US ${money(national)}`, { fill: PAL.teal, size: 11 });
  return { svg: svgDoc(body, p.signature.title, p.signature.description), records: charges.length };
}

async function sdtAffect(p) {
  const rows = readCsv('Self Determination Theory Project/Final SDT Code/categorizedFinal_cleaned_data.csv');
  const freq = { Never: 'Low', Rarely: 'Low', 'Some of the time': 'Medium', 'Most of the time': 'High', 'All of the time': 'High' };
  const amount = { 'Not at all': 'Low', 'A little': 'Low', Some: 'Medium', 'A lot': 'High' };
  const needs = [
    { key: 'autonomy', label: 'Autonomy', map: freq, color: PAL.lavender },
    { key: 'relatedness', label: 'Relatedness', map: freq, color: PAL.teal },
    { key: 'competence', label: 'Competence', map: amount, color: PAL.accent },
  ];
  const levels = ['Low', 'Medium', 'High'];
  const m = { top: 40, right: 24, bottom: 36, left: 44 };
  const colW = (W - m.left - m.right) / needs.length;
  const y = scaleLinear([1.5, 4.5], [H - m.bottom, m.top]);
  let body = '';
  for (const t of [2, 2.5, 3, 3.5, 4]) {
    body += `<line x1="${m.left}" x2="${W - m.right}" y1="${y(t)}" y2="${y(t)}" stroke="${PAL.line}" stroke-dasharray="2 4"/>`;
    body += text(m.left - 8, y(t), t.toFixed(1), { anchor: 'end', fill: PAL.text3, size: 11, cls: 'chart-minor' });
  }
  needs.forEach((need, ni) => {
    const x0 = m.left + ni * colW;
    const x = scaleBand(levels, [x0 + 12, x0 + colW - 12]).padding(0.3);
    body += text(x0 + colW / 2, 16, need.label, { anchor: 'middle', fill: need.color, size: 12, weight: 600 });
    const pts = [];
    levels.forEach((lv, li) => {
      const vals = rows.filter((d) => need.map[d[need.key]] === lv).map((d) => +d.positive_affect).sort((a, b) => a - b);
      const q1 = quantile(vals, 0.25);
      const q3 = quantile(vals, 0.75);
      const mu = mean(vals);
      const cx = x(lv) + x.bandwidth() / 2;
      pts.push([cx, y(mu)]);
      body += `<line class="whisker" style="--i:${ni * 3 + li}" x1="${cx}" x2="${cx}" y1="${y(q1)}" y2="${y(q3)}" stroke="${need.color}" stroke-opacity="0.45" stroke-width="6" stroke-linecap="round"/>`;
      body += `<circle class="dot" style="--i:${ni * 3 + li}" cx="${cx}" cy="${y(mu)}" r="6" fill="${need.color}" stroke="${PAL.ink}" stroke-width="2"><title>${need.label} ${lv}: mean ${mu.toFixed(2)}, IQR ${q1.toFixed(2)} to ${q3.toFixed(2)}, n=${vals.length}</title></circle>`;
      body += text(cx, H - m.bottom + 16, lv, { anchor: 'middle', fill: PAL.text2, size: 11 });
      body += text(cx + 12, y(mu), mu.toFixed(2), { fill: PAL.text, size: 11, weight: 600, cls: 'chart-minor' });
    });
    body += `<polyline points="${pts.map((d) => d.join(',')).join(' ')}" fill="none" stroke="${need.color}" stroke-width="1.5" stroke-opacity="0.7"/>`;
    if (ni) body += `<line x1="${x0}" x2="${x0}" y1="${m.top - 8}" y2="${H - m.bottom}" stroke="${PAL.line}"/>`;
  });
  body += text(m.left, H - 6, 'mean positive affect (1 to 5) with interquartile range', { fill: PAL.text3, size: 11, cls: 'chart-minor' });
  return { svg: svgDoc(body, p.signature.title, p.signature.description), records: rows.length };
}

async function programsByRegion(p) {
  const rows = readCsv('Study Abroad Programs Project/Cleaned Combined Code/PSU-OSU-COMBINED-FINAL.csv');
  const seen = new Set();
  const unique = rows.filter((d) => {
    const k = [d['Program.Name'], d.City, d.Country, d.Region].join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const counts = rollup(unique, (v) => v.length, (d) => d.Region);
  const data = [...counts.entries()]
    .map(([region, n]) => ({ region: region === 'multiple regions' ? 'Multiple regions' : region, n }))
    .sort((a, b) => b.n - a.n);
  const total = sum(data, (d) => d.n);
  const m = { top: 20, right: 90, bottom: 16, left: 130 };
  const x = scaleLinear([0, max(data, (d) => d.n)], [m.left, W - m.right]);
  const y = scaleBand(data.map((d) => d.region), [m.top, H - m.bottom]).padding(0.28);
  const color = seq([-0.6 * max(data, (d) => d.n), max(data, (d) => d.n)]);
  let body = '';
  data.forEach((d, i) => {
    body += `<rect class="bar" style="--i:${i}" x="${m.left}" y="${y(d.region)}" width="${Math.max(2, x(d.n) - m.left)}" height="${y.bandwidth()}" rx="3" fill="${color(d.n)}"><title>${d.region}: ${d.n} programs (${pct1(d.n / total)})</title></rect>`;
    body += text(m.left - 10, y(d.region) + y.bandwidth() / 2, d.region, { anchor: 'end', fill: PAL.text2, size: 11 });
    body += text(x(d.n) + 8, y(d.region) + y.bandwidth() / 2, `${d.n}  (${d.n / total < 0.01 ? '<1%' : pct(d.n / total)})`, { fill: PAL.text, size: 11 });
  });
  return { svg: svgDoc(body, p.signature.title, p.signature.description), records: unique.length };
}
