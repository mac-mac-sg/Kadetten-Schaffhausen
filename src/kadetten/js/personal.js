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

/** Favorit «Spieler des Matchs» je Spiel (Stufe 1 der Spielerwahl): nur auf diesem Gerät, wird nie übertragen.
 * Gespeichert wird die Quellen-ID des Spielers und sein Name; abgestimmt wird erst nach dem Abpfiff. */
export const PICKS_KEY = 'v2:app-picks';
export function picks(s) {
  const v = read(PICKS_KEY, {}, s);
  return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([id, p]) => /^[A-Za-z0-9_-]{1,80}$/.test(id) && p && /^[A-Za-z0-9_-]{1,40}$/.test(String(p.id)) && typeof p.name === 'string').map(([id, p]) => [id, {id: String(p.id), name: p.name.slice(0, 80)}]).slice(-200)) : {};
}
export const pickFor = (gameId, s) => picks(s)[String(gameId)] || null;
/** Setzt oder entfernt den Favoriten. Gleicher Spieler nochmals: entfernt. Liefert den neuen Favoriten oder null. */
export function togglePick(gameId, player, s) {
  const all = picks(s), key = String(gameId);
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(key) || !/^[A-Za-z0-9_-]{1,40}$/.test(String(player?.id))) return all[key] || null;
  if (all[key]?.id === String(player.id)) delete all[key];
  else all[key] = {id: String(player.id), name: String(player.name || '').slice(0, 80)};
  write(PICKS_KEY, Object.keys(all).length ? all : null, s);
  return all[key] || null;
}
