import { esc, attr, picture, chips } from './util.mjs';

export function project({ base, db, p, index, media, chart, stats }) {
  const { site, projects } = db;
  const prev = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];
  const m = media[p.slug] || { visuals: [], embeds: [] };
  const hero = m.visuals.find((v) => v.role === 'hero') || m.visuals[0];
  const figures = m.visuals.filter((v) => v !== hero);
  const folderUrl = `${site.repo.url}/tree/${site.repo.branch}/${encodeURIComponent(p.folder)}`;
  const readmeUrl = p.readme ? `${site.repo.url}/blob/${site.repo.branch}/${p.readme.split('/').map(encodeURIComponent).join('/')}` : folderUrl;
  const records = stats.records[p.slug];

  const results = p.results?.length
    ? `<div class="block reveal">
  <h2 class="block__title">Model comparison</h2>
  <div class="table-wrap"><table class="results">
    <thead><tr><th scope="col">Model</th><th scope="col">Accuracy</th><th scope="col">Recall</th><th scope="col">F1</th></tr></thead>
    <tbody>${p.results
      .map(
        (r) => `<tr><th scope="row">${esc(r.model)}</th><td>${fmt(r.accuracy)}</td><td>${fmt(r.recall)}</td><td>${fmt(r.f1)}</td></tr>`
      )
      .join('')}</tbody>
  </table></div>
</div>`
    : '';

  const embeds = m.embeds.length
    ? `<div class="block reveal">
  <h2 class="block__title">Notebook renders</h2>
  <p class="block__lede">Static HTML exports of the analysis notebooks, loaded on demand.</p>
  ${m.embeds
    .map(
      (e, i) => `<div class="embed" data-src="${base}${e.src}" data-title="${attr(e.title)}">
    <div class="embed__bar">
      <span class="mono">${esc(e.title)} / ${(e.bytes / 1024).toFixed(0)} KB</span>
      <span class="embed__actions">
        <button type="button" class="btn btn--small embed__load">Load render</button>
        <a class="btn btn--small btn--ghost" href="${base}${e.src}" target="_blank" rel="noopener">Open<span class="visually-hidden"> ${esc(e.title)} in a new tab</span></a>
      </span>
    </div>
    <div class="embed__frame" id="embed-${i}"></div>
  </div>`
    )
    .join('')}
</div>`
    : '';

  const body = `
<article class="project">
  <header class="project__head">
    <div class="wrap">
      <nav class="crumbs mono" aria-label="Breadcrumb"><a href="${base}">Home</a> / <a href="${base}#work">Work</a> / <span aria-current="page">${esc(p.shortTitle)}</span></nav>
      <p class="eyebrow rise">${esc(p.domain)} / ${p.year} / ${String(index + 1).padStart(2, '0')} of ${projects.length}</p>
      <h1 class="project__title rise" style="--delay:60ms">${esc(p.title)}</h1>
      <p class="project__pitch rise" style="--delay:120ms">${esc(p.pitch)}</p>
      <div class="project__chips rise" style="--delay:180ms">${chips(p.tools)}</div>
    </div>
  </header>

  <div class="wrap project__hero rise" style="--delay:240ms">
    ${hero ? `<figure class="figure figure--hero">${picture(hero, { base, sizes: '(min-width: 1280px) 1200px, 100vw', loading: 'eager', fetchpriority: 'high' })}<figcaption>${esc(hero.caption || hero.alt)}</figcaption></figure>` : ''}
  </div>

  <div class="wrap project__layout">
    <div class="project__main">
      <section class="story reveal" aria-label="Story">
        <div class="story__col"><h2 class="story__h mono">Question</h2><p>${esc(p.story.question)}</p></div>
        <div class="story__col"><h2 class="story__h mono">Method</h2><p>${esc(p.story.method)}</p></div>
        <div class="story__col"><h2 class="story__h mono">Finding</h2><p>${esc(p.story.finding)}</p></div>
      </section>

      ${p.metrics?.length ? `<dl class="metrics reveal">${p.metrics.map((x) => `<div class="metric"><dt class="mono">${esc(x.label)}</dt><dd>${esc(x.value)}${x.note ? `<span class="metric__note mono">${esc(x.note)}</span>` : ''}</dd></div>`).join('')}</dl>` : ''}

      ${chart ? `<figure class="figure figure--chart reveal"><div class="chart">${chart}</div><figcaption><strong>${esc(p.signature.title)}.</strong> ${esc(p.signature.description)}</figcaption></figure>` : ''}

      ${results}

      ${figures.length ? `<div class="block reveal"><h2 class="block__title">Figures from the project</h2><div class="figures">${figures.map((f) => `<figure class="figure">${picture(f, { base, sizes: '(min-width: 900px) 600px, 100vw' })}<figcaption>${esc(f.caption || f.alt)}</figcaption></figure>`).join('')}</div></div>` : ''}

      ${embeds}
    </div>

    <aside class="project__side">
      <div class="side reveal">
        <h2 class="side__h mono">Tech stack</h2>
        <ul class="side__list">${p.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <h2 class="side__h mono">Languages</h2>
        <p>${esc(p.languages.join(', '))}</p>
        <h2 class="side__h mono">Data</h2>
        <p><strong>${esc(p.data.name)}</strong></p>
        <p>${esc(p.data.source)}</p>
        <p class="mono">${esc(p.data.records)}${records ? ` / ${records.toLocaleString('en-US')} rows read` : ''}</p>
        ${p.data.url ? `<p><a href="${attr(p.data.url)}" rel="noopener">Dataset source</a></p>` : ''}
        <h2 class="side__h mono">Code and files</h2>
        <ul class="side__list">
          <li><a href="${readmeUrl}" rel="noopener">Project README</a></li>
          <li><a href="${folderUrl}" rel="noopener">Project folder on GitHub</a></li>
          ${(p.data.files || []).map((f) => `<li><a href="${site.repo.url}/blob/${site.repo.branch}/${f.split('/').map(encodeURIComponent).join('/')}" rel="noopener">${esc(f.split('/').pop())}</a></li>`).join('')}
        </ul>
        ${p.links?.length ? `<h2 class="side__h mono">References</h2><ul class="side__list">${p.links.map((l) => `<li><a href="${attr(l.url)}" rel="noopener">${esc(l.label)}</a></li>`).join('')}</ul>` : ''}
        <h2 class="side__h mono">Tags</h2>
        <div class="side__chips">${chips(p.tags)}</div>
      </div>
      ${p.inferred?.length ? `<div class="notes reveal"><h2 class="side__h mono">Editor's notes</h2><ul>${p.inferred.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    </aside>
  </div>

  <nav class="wrap pager" aria-label="Project navigation">
    <a class="pager__link" href="${base}projects/${prev.slug}/" rel="prev"><span class="mono">Previous</span><span class="pager__t">${esc(prev.title)}</span></a>
    <a class="pager__link pager__link--next" href="${base}projects/${next.slug}/" rel="next"><span class="mono">Next</span><span class="pager__t">${esc(next.title)}</span></a>
  </nav>
</article>
`;
  return { body, hero };
}

function fmt(v) {
  return v == null ? '<span class="dim">low</span>' : v.toFixed(2);
}
