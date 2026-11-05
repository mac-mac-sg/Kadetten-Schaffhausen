// Persönliche Angaben bleiben nur auf diesem Gerät (localStorage, Präfix v2:). Keine Übertragung, kein Konto.
export const FAVOURITE_KEY = 'v2:app-favourite';
export const MY_GAMES_KEY = 'v2:app-my-games';

const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const read = (key, fallback, s = storage()) => { try { return JSON.parse(s?.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } };
const write = (key, value, s = storage()) => { try { value === null ? s?.removeItem(key) : s?.setItem(key, JSON.stringify(value)); } catch {} };

/** Rückennummer des Lieblingsspielers oder null. */
export const favourite = (s) => { const v = read(FAVOURITE_KEY, null, s); return Number.isInteger(v) ? v : null; };
export function toggleFavourite(number, s) {
  const next = favourite(s) === number ? null : number;
  write(FAVOURITE_KEY, next, s);
  return next;
}

/** Spiele, bei denen ich in der Halle war (Spiel-IDs). */
export const myGames = (s) => { const v = read(MY_GAMES_KEY, [], s); return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 500) : []; };
export function toggleMyGame(id, s) {
  const list = myGames(s), key = String(id);
  const next = list.includes(key) ? list.filter(x => x !== key) : [...list, key];
  write(MY_GAMES_KEY, next, s);
  return next.includes(key);
}
