// Filter and search over the pre-rendered cards, with a FLIP layout
// transition and URL state. OR within a group, AND across groups.
export function initGallery() {
  const grid = document.getElementById('grid');
  const form = document.getElementById('filters');
  if (!grid || !form) return;
  const cards = [...grid.querySelectorAll('.card')];
  const chips = [...form.querySelectorAll('.fchip')];
  const q = form.querySelector('#q');
  const results = document.getElementById('results');
  const clear = document.getElementById('clear');
  const empty = document.getElementById('empty');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { domain: new Set(), tool: new Set(), tag: new Set(), q: '' };

  readUrl();
  chips.forEach((c) => {
    const on = state[c.dataset.filter].has(c.dataset.value);
    c.setAttribute('aria-pressed', String(on));
    c.addEventListener('click', () => {
      const set = state[c.dataset.filter];
      set.has(c.dataset.value) ? set.delete(c.dataset.value) : set.add(c.dataset.value);
      c.setAttribute('aria-pressed', String(set.has(c.dataset.value)));
      apply();
    });
  });
  q.value = state.q;
  let timer;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = q.value.trim().toLowerCase();
      apply();
    }, 120);
  });
  clear.addEventListener('click', () => {
    for (const k of ['domain', 'tool', 'tag']) state[k].clear();
    state.q = '';
    q.value = '';
    chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
    apply();
    q.focus();
  });
  apply(true);

  function matches(card) {
    const d = card.dataset;
    const has = (set, values) => set.size === 0 || values.some((v) => set.has(v));
    return (
      has(state.domain, [d.domain]) &&
      has(state.tool, d.tools.split('|')) &&
      has(state.tag, d.tags.split('|')) &&
      (!state.q || d.search.includes(state.q))
    );
  }

  function apply(initial = false) {
    const before = new Map(cards.filter((c) => !c.hidden).map((c) => [c, c.getBoundingClientRect()]));
    let shown = 0;
    for (const c of cards) {
      const m = matches(c);
      c.hidden = !m;
      if (m) shown++;
    }
    results.textContent = `Showing ${shown} of ${cards.length}`;
    const active = state.q || state.domain.size || state.tool.size || state.tag.size;
    clear.hidden = !active;
    empty.hidden = shown > 0;
    writeUrl();
    if (initial || reduce.matches) return;
    for (const c of cards) {
      if (c.hidden) continue;
      const after = c.getBoundingClientRect();
      const prev = before.get(c);
      if (prev) {
        const dx = prev.left - after.left;
        const dy = prev.top - after.top;
        if (dx || dy) {
          c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
            duration: 420,
            easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
          });
        }
      } else {
        c.animate([{ opacity: 0, transform: 'scale(0.96) translateY(10px)' }, { opacity: 1, transform: 'none' }], {
          duration: 380,
          easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        });
      }
    }
  }

  function readUrl() {
    const sp = new URLSearchParams(location.search);
    for (const k of ['domain', 'tool', 'tag']) sp.getAll(k).forEach((v) => state[k].add(v));
    state.q = (sp.get('q') || '').toLowerCase();
  }
  function writeUrl() {
    const sp = new URLSearchParams();
    for (const k of ['domain', 'tool', 'tag']) state[k].forEach((v) => sp.append(k, v));
    if (state.q) sp.set('q', state.q);
    const qs = sp.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  }
}
