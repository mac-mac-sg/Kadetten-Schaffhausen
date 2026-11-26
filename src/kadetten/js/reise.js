// Reise zum Gegner: Luftlinie von Schaffhausen zum Spielort, als Strecke auf einer Vektorkarte (Schweiz oder Europa).
// Keine Kartendienste: Orte stehen fest hier, Umrisse in views/vorschau.js. Konzept: Design-Canvas «Reise zum Gegner».
import {venueInfo} from './views/parts.js';
import {isOwn} from './match.js';
import {hasScore} from './logic.js';

export const HOME = {name: 'Schaffhausen', lon: 8.63, lat: 47.7};

/** Hallenorte (Teil nach dem Komma der Quelle, ohne Akzente und klein) mit Koordinaten und Anzeigename. */
const PLACES = {
  aarau: ['Aarau', 8.05, 47.39],
  zurich: ['Zürich', 8.54, 47.37],
  winterthur: ['Winterthur', 8.72, 47.5],
  kriens: ['Kriens', 8.28, 47.04],
  'st. gallen': ['St. Gallen', 9.37, 47.42],
  thun: ['Thun', 7.63, 46.76],
  stafa: ['Stäfa', 8.73, 47.24],
  basel: ['Basel', 7.59, 47.56],
  gumligen: ['Gümligen', 7.5, 46.92],
  bonnigheim: ['Bönnigheim', 9.1, 49.04],
  chambery: ['Chambéry', 5.92, 45.57],
  ljubuski: ['Ljubuški', 17.54, 43.19],
  bucuresti: ['Bukarest', 26.1, 44.43]
};
const plain = text =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Zwei Kartenausschnitte: Schweiz (140 px je Grad Breite) und Europa (17 px). */
const VIEWS = {
  ch: {lon0: 5.9, lat1: 47.95, k: 140, w: 449, h: 315},
  eu: {lon0: -3, lat1: 52.5, k: 17, w: 371, h: 272}
};
const inSwitzerland = (lon, lat) => lon >= 5.9 && lon <= 10.6 && lat >= 45.7 && lat <= 47.95;
const point = (view, lon, lat) => ({
  x: Math.round((lon - view.lon0) * view.k * Math.cos((47 * Math.PI) / 180) * 10) / 10,
  y: Math.round((view.lat1 - lat) * view.k * 10) / 10
});

/** Luftlinie in Kilometern (Haversine). */
export function distanceKm(a, b) {
  const rad = d => (d * Math.PI) / 180,
    h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(h)));
}

/** Reise zu einem noch nicht gespielten Auswärtsspiel an einem bekannten Ort; sonst null (Heimspiel, gespielt, unbekannter Ort). */
export function routeFor(game) {
  if (!game || hasScore(game) || isOwn(game.home)) return null;
  const venue = venueInfo(game.venue);
  if (!venue || venue.home || !venue.place) return null;
  const entry = PLACES[plain(venue.place)];
  if (!entry) return null;
  const [name, lon, lat] = entry,
    kind = inSwitzerland(lon, lat) ? 'ch' : 'eu',
    view = VIEWS[kind],
    from = point(view, HOME.lon, HOME.lat),
    to = point(view, lon, lat);
  // Bogen nach Nordosten: Steuerpunkt senkrecht über der Mitte der Strecke.
  const dx = to.x - from.x,
    dy = to.y - from.y,
    len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len,
    ny = dx / len;
  if (nx - ny < 0) ((nx = -nx), (ny = -ny));
  const ctrl = {x: (from.x + to.x) / 2 + nx * len * 0.5, y: (from.y + to.y) / 2 + ny * len * 0.5};
  const r = v => Math.round(v * 10) / 10;
  return {
    kind,
    view: {w: view.w, h: view.h},
    name,
    km: distanceKm(HOME, {lon, lat}),
    from,
    to,
    path: `M${r(from.x)} ${r(from.y)}Q${r(ctrl.x)} ${r(ctrl.y)} ${r(to.x)} ${r(to.y)}`
  };
}
