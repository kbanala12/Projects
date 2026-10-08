import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_DIR = path.resolve(SITE_DIR, '..');
export const DATA_FILE = path.join(SITE_DIR, 'data', 'projects.json');
export const PUBLIC_DIR = path.join(SITE_DIR, 'public');
export const CACHE_DIR = path.join(SITE_DIR, '.cache');

export function loadProjects() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

export function saveProjects(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2) + '\n');
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function repoPath(rel) {
  return path.join(REPO_DIR, rel);
}

export function githubTreeUrl(db, rel) {
  const { url, branch } = db.site.repo;
  return `${url}/tree/${branch}/${rel.split('/').map(encodeURIComponent).join('/')}`;
}

export function githubBlobUrl(db, rel) {
  const { url, branch } = db.site.repo;
  return `${url}/blob/${branch}/${rel.split('/').map(encodeURIComponent).join('/')}`;
}

export function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
}

export function log(...args) {
  console.log('[site]', ...args);
}
