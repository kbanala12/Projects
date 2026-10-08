import { esc, attr } from './util.mjs';

export function layout({ base, site, title, description, path, ogImage, jsonLd, body, entry, bodyClass = '' }) {
  const url = new URL(path.replace(/^\//, ''), site.siteUrl).href;
  const fullTitle = title ? `${title} | ${site.title}` : `${site.title}: ${site.name}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${attr(description)}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0a0b0f">
<link rel="canonical" href="${url}">
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${base}favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="${base}apple-touch-icon.png">
<link rel="sitemap" type="application/xml" href="${base}sitemap.xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(site.title)}">
<meta property="og:title" content="${attr(fullTitle)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${new URL(ogImage || 'og-image.png', site.siteUrl).href}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(fullTitle)}">
<meta name="twitter:description" content="${attr(description)}">
<meta name="twitter:image" content="${new URL(ogImage || 'og-image.png', site.siteUrl).href}">
<script>document.documentElement.classList.add("js")</script>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script type="module" src="/src/${entry}"></script>
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="${base}" aria-label="${attr(site.title)}, home">
      <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#12141a"/><path d="M12 46 L24 30 L34 38 L52 16" fill="none" stroke="#ff5c1c" stroke-width="5" stroke-linecap="round"/><circle cx="52" cy="16" r="5" fill="#ff5c1c"/></svg>
      <span class="brand__name">${esc(site.title)}</span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      <a href="${base}#work">Work</a>
      <a href="${base}#numbers">Numbers</a>
      <a href="${base}#about">About</a>
      <a href="${site.repo.url}" rel="noopener" target="_blank">GitHub<span class="visually-hidden"> (opens in a new tab)</span></a>
    </nav>
  </div>
</header>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="site-footer">
  <div class="wrap site-footer__inner">
    <p class="mono">${esc(site.title)} / ${esc(site.name)}</p>
    <p class="mono">Source on <a href="${site.repo.url}" rel="noopener">GitHub</a>. Site generated from <a href="${site.repo.url}/blob/${site.repo.branch}/site/data/projects.json" rel="noopener">projects.json</a>.</p>
  </div>
</footer>
</body>
</html>
`;
}
