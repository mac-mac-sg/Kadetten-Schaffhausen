// Feste Liniensymbole (24er Raster). Nur Code-Konstanten, keine Daten.
import {raw} from './text.js';

const PATHS = {
  statistik: '<path d="M4 20h16M6 16v-4M12 16V4M18 16V8"/>',
  jetzt: '<path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10"/>',
  saison: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  team: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14.2c2.4.1 4 1.7 4.5 4.3"/>',
  verein: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/>',
  ich: '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c.9-3.7 3.8-5.8 7.5-5.8s6.6 2.1 7.5 5.8"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  ticket: '<path d="M4 7.5h16v3a2 2 0 0 0 0 3v3H4v-3a2 2 0 0 0 0-3z"/><path d="M14 7.5v9" stroke-dasharray="2 2"/>',
  tv: '<rect x="3.5" y="5.5" width="17" height="11.5" rx="2"/><path d="M9 20.5h6"/>',
  share: '<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M5 13v6.5h14V13"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  go: '<path d="M9 5l7 7-7 7"/>',
  ext: '<path d="M8 16 16 8M9.5 8H16v6.5"/>',
  doc: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>',
  offline: '<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.4M19 13a10 10 0 0 0-3.2-2.1M2 9.5a15 15 0 0 1 4.2-2.7M22 9.5A15 15 0 0 0 11 5.6"/><circle cx="12" cy="20" r=".8"/>'
};

export function icon(name, size = 18) {
  return raw(`<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name] || ''}</svg>`);
}
