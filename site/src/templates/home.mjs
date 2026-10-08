import { esc, attr, pad } from './util.mjs';

export function home({ base, db, charts, stats }) {
  const { site, projects } = db;
  const domains = count(projects.map((p) => p.domain));
  const tools = count(projects.flatMap((p) => p.tools));
  const tags = count(projects.flatMap((p) => p.tags));
  const languages = new Set(projects.flatMap((p) => p.languages));
  const years = projects.map((p) => p.year);

  const toolIndex = new Map(tools.map(([t], i) => [t, i + 1]));
  const toolChips = (list) =>
    list.map((t) => `<span class="chip">${esc(t)}<sup><a href="#tool-${toolIndex.get(t)}" aria-label="Footnote ${toolIndex.get(t)}, ${attr(t)}">${toolIndex.get(t)}</a></sup></span>`).join('');
  const cards = projects
    .map((p, i) => {
      const svg = charts[p.slug] || '';
      return `<li class="card reveal" style="--delay:${i * 60}ms" data-slug="${p.slug}" data-domain="${attr(p.domain)}" data-tools="${attr(p.tools.join('|'))}" data-tags="${attr(p.tags.join('|'))}" data-search="${attr([p.title, p.pitch, p.domain, ...p.tools, ...p.tags, p.data.name].join(' ').toLowerCase())}">
  <a class="card__link" href="${base}projects/${p.slug}/">
    <div class="card__art" aria-hidden="true">${svg}</div>
    <div class="card__body">
      <div class="card__meta mono"><span>${pad(i + 1)}</span><span>${esc(p.domain)}</span><span>${p.year}</span></div>
      <h3 class="card__title">${esc(p.title)}</h3>
      <p class="card__pitch">${esc(p.pitch)}</p>
    </div>
  </a>
  <div class="card__chips">${toolChips(p.tools)}</div>
</li>`;
    })
    .join('\n');

  const body = `
<section class="hero" id="top">
  <canvas class="hero__canvas" id="hero-canvas" aria-hidden="true"></canvas>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="wrap hero__inner">
    <p class="eyebrow rise">Portfolio / Data science / ${Math.min(...years)} to ${Math.max(...years)}</p>
    <h1 class="hero__title rise" style="--delay:80ms">Questions,<br><em>asked of data.</em></h1>
    <p class="hero__lede rise" style="--delay:160ms">${esc(site.tagline)}</p>
    <div class="hero__cta rise" style="--delay:240ms">
      <a class="btn btn--primary" href="#work">Browse the work</a>
      <a class="btn" href="#about">About</a>
    </div>
  </div>
  <dl class="hero__readout mono" aria-label="Portfolio readout">
    <div><dt>Projects</dt><dd>${projects.length}</dd></div>
    <div><dt>Records</dt><dd>${stats.totalRecords.toLocaleString('en-US')}</dd></div>
    <div><dt>Domains</dt><dd>${domains.length}</dd></div>
    <div><dt>Tools</dt><dd>${tools.length}</dd></div>
  </dl>
</section>

<section class="section" id="work" aria-labelledby="work-title">
  <div class="wrap">
    <header class="section__head reveal">
      <p class="eyebrow">Selected work</p>
      <h2 id="work-title" class="section__title">Six studies in public data</h2>
      <p class="section__lede">Each card is a chart computed from the project's own dataset at build time. Open a project for the question, the method, the finding and the original figures. Numbered tools point to the stack notes below.</p>
    </header>
    <ul class="grid" id="grid" aria-label="Projects">
${cards}
    </ul>
    <aside class="footnotes reveal" aria-labelledby="fn-title">
      <h3 id="fn-title" class="footnotes__h">Tech stack notes</h3>
      <ol>
${tools
  .map(
    ([t, n], i) => `        <li id="tool-${i + 1}"><span class="fn__n">${pad(i + 1)}</span><span class="fn__tool">${esc(t)}</span><span class="fn__uses">${n === 1 ? 'Used in' : `Used in ${n} projects:`} ${projects
      .filter((p) => p.tools.includes(t))
      .map((p) => `<a href="${base}projects/${p.slug}/">${esc(p.shortTitle)}</a>`)
      .join(', ')}</span></li>`
  )
  .join('\n')}
      </ol>
    </aside>
  </div>
</section>

<section class="section section--numbers" id="numbers" aria-labelledby="numbers-title">
  <div class="wrap">
    <header class="section__head reveal">
      <p class="eyebrow">By the numbers</p>
      <h2 id="numbers-title" class="section__title">The portfolio, measured</h2>
      <p class="section__lede">Computed from projects.json and the data files at build time.</p>
    </header>
    <div class="stats reveal">
      <div class="stat"><span class="stat__n" data-count="${projects.length}">0</span><span class="stat__l mono">projects</span></div>
      <div class="stat"><span class="stat__n" data-count="${stats.totalRecords}">0</span><span class="stat__l mono">records analysed</span></div>
      <div class="stat"><span class="stat__n" data-count="${tools.length}">0</span><span class="stat__l mono">tools</span></div>
      <div class="stat"><span class="stat__n" data-count="${domains.length}">0</span><span class="stat__l mono">domains</span></div>
      <div class="stat"><span class="stat__n" data-count="${languages.size}">0</span><span class="stat__l mono">languages</span></div>
      <div class="stat"><span class="stat__n" data-count="${projects.reduce((a, p) => a + (p.visuals?.length || 0), 0)}">0</span><span class="stat__l mono">original figures</span></div>
    </div>
    <div class="minis">
      <figure class="mini reveal" id="mini-tools"><figcaption class="mono">Projects per tool</figcaption></figure>
      <figure class="mini reveal" id="mini-domains" style="--delay:80ms"><figcaption class="mono">Records per domain</figcaption></figure>
      <figure class="mini reveal" id="mini-languages" style="--delay:160ms"><figcaption class="mono">Languages</figcaption></figure>
      <figure class="mini reveal" id="mini-years" style="--delay:240ms"><figcaption class="mono">Timeline</figcaption></figure>
    </div>
  </div>
</section>

<section class="section section--about" id="about" aria-labelledby="about-title">
  <div class="wrap about">
    <header class="section__head reveal">
      <p class="eyebrow">About</p>
      <h2 id="about-title" class="section__title">${esc(site.owner.name)}</h2>
    </header>
    <div class="about__grid">
      <div class="about__bio reveal">
        <p class="about__role mono">${esc(site.owner.role)} / ${esc(site.owner.location)}</p>
        <p>${esc(site.owner.bio)}</p>
      </div>
      <dl class="about__contact reveal" style="--delay:100ms">
        <div><dt class="mono">Email</dt><dd><a href="mailto:${attr(site.owner.email)}">${esc(site.owner.email)}</a></dd></div>
        <div><dt class="mono">GitHub</dt><dd><a href="${attr(site.owner.github)}" rel="noopener">${esc(site.owner.github.replace('https://', ''))}</a></dd></div>
        <div><dt class="mono">LinkedIn</dt><dd>${esc(site.owner.linkedin)}</dd></div>
        <div><dt class="mono">Resume</dt><dd>${site.owner.resume ? `<a href="${attr(site.owner.resume)}">Download</a>` : 'PLACEHOLDER: link a PDF in site/public'}</dd></div>
      </dl>
    </div>
  </div>
</section>
`;
  return { body, domains, tools, tags };
}

function count(list) {
  const m = new Map();
  for (const x of list) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
