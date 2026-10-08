// Loads notebook HTML renders into sandboxed iframes on demand, or when the
// block scrolls near the viewport.
export function initEmbeds() {
  const blocks = document.querySelectorAll('.embed');
  if (!blocks.length) return;
  const load = (block) => {
    const frame = block.querySelector('.embed__frame');
    if (frame.children.length) return;
    const iframe = document.createElement('iframe');
    iframe.src = block.dataset.src;
    iframe.title = block.dataset.title;
    iframe.loading = 'lazy';
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    frame.appendChild(iframe);
    const btn = block.querySelector('.embed__load');
    btn.textContent = 'Loaded';
    btn.disabled = true;
  };
  blocks.forEach((b) => b.querySelector('.embed__load').addEventListener('click', () => load(b)));
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          load(e.target);
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '300px 0px' }
  );
  blocks.forEach((b) => io.observe(b));
}
