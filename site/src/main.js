import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { initReveal } from './lib/reveal.js';
import { initHero } from './lib/hero.js';
import { initGallery } from './lib/gallery.js';
import { initNumbers } from './lib/numbers.js';

initReveal();
initHero(document.getElementById('hero-canvas'));
initGallery();
initNumbers();
