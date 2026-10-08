// By the numbers: count-ups plus four mini charts built from projects.json.
import db from '../../data/projects.json';
import stats from '../../data/stats.json';

const SEQ = ['#5b2a6e', '#b23a48', '#ff5c1c', '#ffb46b', '#4fd1c5', '#a78bfa'];
const NS = 'http://www.w3.org/2000/svg';

export function initNumbers() {
  const section = document.getElementById('numbers');
  if (!section) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counters = section.querySelectorAll('[data-count]');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        countUp(e.target, reduce);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.4 }
  );
  counters.forEach((c) => io.observe(c));
  buildTools(document.getElementById('mini-tools'));
  buildDomains(document.getElementById('mini-domains'));
  buildLanguages(document.getElementById('mini-languages'));
  buildYears(document.getElementById('mini-years'));
}

function countUp(el, reduce) {
  const target = +el.dataset.count;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  if (reduce || target < 10) {
    el.textContent = fmt(target);
    return;
  }
  const t0 = performance.now();
  const dur = 1200;
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(target * e);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function svg(w, h, label) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', label);
  return s;
}
function el(name, attrs, text) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function buildTools(fig) {
  if (!fig) return;
  const counts = new Map();
  db.projects.forEach((p) => p.tools.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const data = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  const W = 320;
  const rowH = 24;
  const H = data.length * rowH + 8;
  const max = Math.max(...data.map((d) => d[1]));
  const s = svg(W, H, `Projects per tool: ${data.map((d) => `${d[0]} ${d[1]}`).join(', ')}`);
  data.forEach(([name, n], i) => {
    const y = i * rowH + 4;
    s.appendChild(el('text', { x: 0, y: y + 13, fill: '#a7a9b3', 'font-size': 11 }, name));
    const x0 = 118;
    const wBar = ((W - x0 - 28) * n) / max;
    s.appendChild(el('rect', { class: 'grow', style: `--i:${i}`, x: x0, y, width: wBar, height: rowH - 8, rx: 3, fill: SEQ[Math.min(5, i % 6)] }));
    s.appendChild(el('text', { x: x0 + wBar + 6, y: y + 13, fill: '#ecebe4', 'font-size': 11 }, n));
  });
  fig.prepend(s);
}

function buildDomains(fig) {
  if (!fig) return;
  const data = db.projects.map((p) => [p.domain, stats.records[p.slug] || 0]).sort((a, b) => b[1] - a[1]);
  const W = 320;
  const rowH = 26;
  const H = data.length * rowH + 8;
  const max = Math.max(...data.map((d) => d[1]));
  const s = svg(W, H, `Records per domain: ${data.map((d) => `${d[0]} ${d[1].toLocaleString('en-US')}`).join(', ')}`);
  data.forEach(([name, n], i) => {
    const y = i * rowH + 4;
    s.appendChild(el('text', { x: 0, y: y + 14, fill: '#a7a9b3', 'font-size': 11 }, name));
    const x0 = 124;
    const wBar = Math.max(3, ((W - x0 - 46) * n) / max);
    s.appendChild(el('rect', { class: 'grow', style: `--i:${i}`, x: x0, y, width: wBar, height: rowH - 8, rx: 3, fill: SEQ[(i + 1) % 6] }));
    s.appendChild(el('text', { x: x0 + wBar + 6, y: y + 14, fill: '#ecebe4', 'font-size': 11 }, compact(n)));
  });
  fig.prepend(s);
}

function buildLanguages(fig) {
  if (!fig) return;
  const counts = new Map();
  db.projects.forEach((p) => p.languages.forEach((l) => counts.set(l, (counts.get(l) || 0) + 1)));
  const data = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = data.reduce((a, d) => a + d[1], 0);
  const W = 320;
  const H = 190;
  const r = 70;
  const cx = 95;
  const cy = 95;
  const circ = 2 * Math.PI * r;
  const s = svg(W, H, `Languages used across projects: ${data.map((d) => `${d[0]} in ${d[1]}`).join(', ')}`);
  let offset = 0;
  data.forEach(([name, n], i) => {
    const len = (circ * n) / total;
    const c = el('circle', {
      class: 'arc',
      style: `--i:${i};--len:${len.toFixed(1)}`,
      cx,
      cy,
      r,
      fill: 'none',
      stroke: SEQ[(i + 2) % 6],
      'stroke-width': 22,
      'stroke-dasharray': `${len.toFixed(1)} ${circ.toFixed(1)}`,
      transform: `rotate(${(-90 + (offset / circ) * 360).toFixed(2)} ${cx} ${cy})`,
    });
    s.appendChild(c);
    s.appendChild(el('rect', { x: 190, y: 40 + i * 26, width: 10, height: 10, rx: 2, fill: SEQ[(i + 2) % 6] }));
    s.appendChild(el('text', { x: 206, y: 49 + i * 26, fill: '#a7a9b3', 'font-size': 11 }, `${name}`));
    s.appendChild(el('text', { x: 310, y: 49 + i * 26, fill: '#ecebe4', 'font-size': 11, 'text-anchor': 'end' }, n));
    offset += len;
  });
  s.appendChild(el('text', { x: cx, y: cy + 5, fill: '#ecebe4', 'font-size': 20, 'text-anchor': 'middle', 'font-family': 'var(--font-display)' }, data.length));
  fig.prepend(s);
}

function buildYears(fig) {
  if (!fig) return;
  const years = [...new Set(db.projects.map((p) => p.year))].sort();
  const W = 320;
  const H = 190;
  const s = svg(W, H, `Timeline: ${years.map((y) => `${y}: ${db.projects.filter((p) => p.year === y).map((p) => p.shortTitle).join(', ')}`).join('; ')}`);
  const x = (i) => 70 + (i * (W - 140)) / Math.max(1, years.length - 1);
  s.appendChild(el('line', { x1: 20, x2: W - 20, y1: 40, y2: 40, stroke: '#2a2e38' }));
  years.forEach((y, i) => {
    const ps = db.projects.filter((p) => p.year === y);
    s.appendChild(el('circle', { cx: x(i), cy: 40, r: 6, fill: '#ff5c1c' }));
    s.appendChild(el('text', { x: x(i), y: 24, fill: '#ecebe4', 'font-size': 12, 'text-anchor': 'middle' }, y));
    ps.forEach((p, k) => {
      s.appendChild(el('rect', { class: 'grow', style: `--i:${i * 3 + k}`, x: x(i) - 56, y: 58 + k * 30, width: 112, height: 22, rx: 4, fill: '#1a1d25', stroke: '#2a2e38' }));
      s.appendChild(el('text', { x: x(i), y: 73 + k * 30, fill: '#a7a9b3', 'font-size': 9, 'text-anchor': 'middle' }, p.shortTitle));
    });
  });
  fig.prepend(s);
}

function compact(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);
}
