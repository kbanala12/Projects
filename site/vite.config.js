import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePages } from './scripts/pages.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(fs.readFileSync(path.join(root, 'data', 'projects.json'), 'utf8'));

export default defineConfig(({ command }) => {
  // Production builds live under /<repo>/ on GitHub Pages; dev serves from /.
  const base = process.env.BASE_PATH ?? (command === 'build' ? db.site.basePath : '/');
  const pages = generatePages({ base });
  return {
    base,
    appType: 'mpa',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2020',
      modulePreload: { polyfill: false },
      rollupOptions: {
        input: Object.fromEntries(pages.map((p) => [p.name, path.join(root, p.file)])),
      },
    },
    server: { open: false },
  };
});
