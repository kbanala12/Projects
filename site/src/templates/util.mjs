export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function attr(s) {
  return esc(s).replace(/\n/g, ' ');
}

export function picture(entry, { base, sizes = '100vw', loading = 'lazy', fetchpriority, className = '' } = {}) {
  if (!entry) return '';
  const srcset = (fmt) => entry.sources[fmt].map((s) => `${base}${s.src} ${s.w}w`).join(', ');
  const fallback = entry.sources.jpg[entry.sources.jpg.length - 1];
  const fp = fetchpriority ? ` fetchpriority="${fetchpriority}"` : '';
  return `<picture class="pic ${className}" style="--ar:${entry.width}/${entry.height}">
  <source type="image/avif" srcset="${srcset('avif')}" sizes="${sizes}">
  <source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}">
  <img src="${base}${fallback.src}" srcset="${srcset('jpg')}" sizes="${sizes}" width="${entry.width}" height="${entry.height}" alt="${attr(entry.alt)}" loading="${loading}" decoding="async"${fp} style="background-image:url(${entry.lqip})">
</picture>`;
}

export function chips(items, cls = 'chip') {
  return items.map((t) => `<span class="${cls}">${esc(t)}</span>`).join('');
}

export function pad(n) {
  return String(n).padStart(2, '0');
}
