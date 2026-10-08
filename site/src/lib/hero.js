// Generative flow field: particles advected through a drifting Perlin field,
// bent by the cursor and phase-shifted by scroll. With prefers-reduced-motion
// a single static set of streamlines is drawn instead.
import { noise3 } from './noise.js';

const PALETTE = ['#5b2a6e', '#b23a48', '#ff5c1c', '#ffb46b', '#4fd1c5'];

export function initHero(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const hero = canvas.parentElement;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let particles = [];
  let raf = 0;
  let running = false;
  let t = 0;
  let scrollPhase = 0;
  const mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0, active: false };
  const SCALE = 0.0016;

  function resize() {
    const r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(coarse ? 700 : 1600, Math.round((w * h) / (coarse ? 2600 : 1500)));
    particles = Array.from({ length: n }, () => spawn(true));
    ctx.fillStyle = 'rgba(10,11,15,1)';
    ctx.fillRect(0, 0, w, h);
    if (reduce.matches) drawStatic();
  }

  function spawn(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : Math.random() < 0.5 ? -4 : h + 4,
      px: 0,
      py: 0,
      life: 80 + Math.random() * 220,
      c: PALETTE[(Math.random() * PALETTE.length) | 0],
      s: 0.6 + Math.random() * 1.2,
    };
  }

  function field(x, y, time) {
    const a = noise3(x * SCALE, y * SCALE, time) * Math.PI * 2.4;
    let vx = Math.cos(a);
    let vy = Math.sin(a);
    const dx = x - mouse.x;
    const dy = y - mouse.y;
    const d2 = dx * dx + dy * dy;
    const R = 160;
    if (d2 < R * R * 4) {
      const f = Math.exp(-d2 / (R * R));
      // Vortex around the cursor plus a push along its velocity.
      vx += (-dy / R) * f * 3.2 + mouse.vx * f * 0.08;
      vy += (dx / R) * f * 3.2 + mouse.vy * f * 0.08;
    }
    return [vx, vy];
  }

  function step() {
    t += 0.0022;
    const time = t + scrollPhase;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10,11,15,0.09)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const p of particles) {
      const [vx, vy] = field(p.x, p.y, time);
      p.px = p.x;
      p.py = p.y;
      p.x += vx * p.s * 1.6;
      p.y += vy * p.s * 1.6;
      p.life -= 1;
      if (p.life <= 0 || p.x < -6 || p.x > w + 6 || p.y < -6 || p.y > h + 6) {
        Object.assign(p, spawn(false));
        continue;
      }
      ctx.strokeStyle = p.c;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = p.s * 1.15;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    mouse.vx *= 0.9;
    mouse.vy *= 0.9;
    raf = requestAnimationFrame(step);
  }

  function drawStatic() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10,11,15,1)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const n = Math.round((w * h) / 9000);
    for (let i = 0; i < n; i++) {
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.strokeStyle = PALETTE[i % PALETTE.length];
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 0.8 + Math.random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 90; k++) {
        const [vx, vy] = field(x, y, 0.3);
        x += vx * 2;
        y += vy * 2;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function start() {
    if (running || reduce.matches) return;
    running = true;
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = e.clientX - r.left;
    const ny = e.clientY - r.top;
    if (mouse.active) {
      mouse.vx = nx - mouse.x;
      mouse.vy = ny - mouse.y;
    }
    mouse.x = nx;
    mouse.y = ny;
    mouse.active = true;
  });
  hero.addEventListener('pointerleave', () => {
    mouse.active = false;
    mouse.x = -1e4;
    mouse.y = -1e4;
  });
  window.addEventListener(
    'scroll',
    () => {
      scrollPhase = window.scrollY * 0.0012;
      const fade = Math.max(0, 1 - window.scrollY / Math.max(1, h * 0.9));
      canvas.style.opacity = fade.toFixed(3);
    },
    { passive: true }
  );
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.02 });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduce.addEventListener('change', () => {
    stop();
    resize();
    start();
  });
  resize();
  start();
}
