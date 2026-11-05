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

/** Tippspiel ohne Einsatz: Tipps bleiben auf dem Gerät, gesperrt ab Anpfiff. */
export const TIPS_KEY = 'v2:app-tips';
export function tips(s) {
  const v = read(TIPS_KEY, {}, s);
  return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([, t]) => Array.isArray(t) && t.length === 2 && t.every(n => Number.isInteger(n) && n >= 0 && n <= 99)).slice(-300)) : {};
}
export function changeTip(id, team, delta, s) {
  const all = tips(s), current = all[id] || [28, 26];
  const next = [...current];
  next[team] = Math.max(0, Math.min(99, next[team] + delta));
  all[id] = next;
  write(TIPS_KEY, all, s);
  return next;
}
