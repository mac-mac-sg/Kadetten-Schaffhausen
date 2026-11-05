// Reine Spiel- und Spieltagslogik ohne Seiten- oder Netzwerkzugriff. Getestet in tests/app-logic.test.mjs.

export const OWN_TEAM = 'Kadetten Schaffhausen';
export const ZONE = 'Europe/Zurich';
const HOUR = 3600000;
// Ohne gemeldete Spielendzeit gilt ein Spiel etwa zwei Stunden nach Anpfiff als beendet.
export const GAME_DURATION = 2 * HOUR;
export const MATCHDAY_WINDOW = 24 * HOUR;
export const AFTERMATH_WINDOW = 24 * HOUR;

const offsetCache = new Map();
function zurichOffset(epoch) {
  const key = Math.floor(epoch / HOUR);
  if (offsetCache.has(key)) return offsetCache.get(key);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
    .formatToParts(new Date(epoch)).map(p => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = asUtc - Math.floor(epoch / 1000) * 1000;
  offsetCache.set(key, offset);
  return offset;
}

/** Anpfiff als Epoch-Millisekunden aus Datum (JJJJ-MM-TT) und Zeit (HH:MM) in Zürcher Zeit; null bei fehlenden Angaben. */
export function kickoff(game) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(game?.date || '');
  const time = /^(\d{1,2}):(\d{2})$/.exec(game?.time || '');
  if (!date || !time) return null;
  const naive = Date.UTC(+date[1], +date[2] - 1, +date[3], +time[1], +time[2]);
  let epoch = naive - zurichOffset(naive);
  epoch = naive - zurichOffset(epoch);
  return epoch;
}

/** Datum und Zeit eines Zeitpunkts in Zürcher Zeit, z. B. {date:'2026-10-24', time:'18:00'}. */
export function zurichParts(epoch) {
  const d = new Date(epoch + zurichOffset(epoch));
  const pad = n => String(n).padStart(2, '0');
  return {date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`, weekday: d.getUTCDay()};
}

export const hasScore = game => Array.isArray(game?.score) && game.score.length === 2 && game.score.every(v => Number.isInteger(v) && v >= 0);
export const involves = (game, team = OWN_TEAM) => game?.home === team || game?.away === team;

/** Ergebnis aus Sicht eines Teams: 'S', 'U', 'N' oder null, wenn kein bestätigtes Resultat vorliegt. */
export function outcome(game, team = OWN_TEAM) {
  if (!hasScore(game) || !involves(game, team)) return null;
  const [home, away] = game.score;
  const own = game.home === team ? home : away, other = game.home === team ? away : home;
  return own > other ? 'S' : own < other ? 'N' : 'U';
}

const byKickoff = (a, b) => (kickoff(a) ?? 0) - (kickoff(b) ?? 0);

export function ownGames(games, team = OWN_TEAM) {
  return (Array.isArray(games) ? games : []).filter(g => involves(g, team) && kickoff(g) !== null).sort(byKickoff);
}

/** Nächstes Spiel ohne Resultat, dessen voraussichtliches Ende noch nicht vorbei ist. */
export function nextGame(games, now) {
  return ownGames(games).find(g => !hasScore(g) && kickoff(g) + GAME_DURATION > now) || null;
}

/** Letztes Spiel mit bestätigtem Resultat. */
export function lastResult(games, now) {
  return ownGames(games).filter(g => hasScore(g) && kickoff(g) <= now).at(-1) || null;
}

/** Formkurve der letzten Spiele, neueste zuerst. */
export function form(games, team = OWN_TEAM, count = 5, league) {
  return ownGames(games, team).filter(g => hasScore(g) && (!league || g.league === league)).reverse().slice(0, count).map(g => outcome(g, team));
}

/**
 * Zustand von «Jetzt»:
 * live      – die Live-Abfrage meldet ein laufendes Kadetten-Spiel
 * spieltag  – nächster Anpfiff in höchstens 24 Stunden
 * nachspiel – ein Spiel endete vor höchstens 24 Stunden
 * alltag    – sonst
 */
export function jetztState({games, live, now}) {
  if (live?.match && involves(live.match)) return {state: 'live', game: live.match};
  const next = nextGame(games, now);
  if (next && kickoff(next) - now <= MATCHDAY_WINDOW) return {state: 'spieltag', game: next};
  const finished = live?.finished && involves(live.finished) && hasScore(live.finished) ? live.finished : null;
  const last = lastResult(games, now);
  if (finished) return {state: 'nachspiel', game: {...(last && last.date === finished.date ? last : {}), ...finished}};
  if (last && now - (kickoff(last) + GAME_DURATION) <= AFTERMATH_WINDOW) return {state: 'nachspiel', game: last};
  return {state: 'alltag', game: next, last};
}

/** Tabellenzeilen [Team, Spiele, Tore, Gegentore, Punkte] in Objekte mit Rang. */
export function standings(rows) {
  return (Array.isArray(rows) ? rows : []).filter(r => Array.isArray(r) && typeof r[0] === 'string')
    .map((r, i) => ({rank: i + 1, team: r[0], played: num(r[1]), goalsFor: num(r[2]), goalsAgainst: num(r[3]), points: num(r[4])}));
}
const num = v => Number.isFinite(v) ? v : null;

/** Kurzer Countdown wie «noch 3:30 h», «in 6 Tagen», «morgen». */
export function countdown(target, now) {
  const diff = target - now;
  if (diff <= 0) return 'jetzt';
  if (diff < MATCHDAY_WINDOW) {
    const minutes = Math.ceil(diff / 60000);
    return `noch ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} h`;
  }
  const days = Math.round((Date.parse(zurichParts(target).date) - Date.parse(zurichParts(now).date)) / (24 * HOUR));
  return days === 1 ? 'morgen' : `in ${days} Tagen`;
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
/** «Sa 24.10.» bzw. «Heute», «Morgen», «Gestern». */
export function dayLabel(game, now) {
  const at = kickoff(game);
  if (at === null) return '';
  const day = zurichParts(at), today = zurichParts(now).date;
  const diff = Math.round((Date.parse(day.date) - Date.parse(today)) / (24 * HOUR));
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Morgen';
  if (diff === -1) return 'Gestern';
  const [, m, d] = day.date.split('-');
  return `${WEEKDAYS[day.weekday]} ${d}.${m}.`;
}

/** Kurzname für Teams in engen Darstellungen. */
export function shortTeam(name) {
  const map = {'Kadetten Schaffhausen': 'Kadetten', 'GC Amicitia Zürich': 'GC Amicitia', 'HC Kriens-Luzern': 'Kriens-Luzern', 'RTV 1879 Basel': 'RTV Basel', 'TSV St. Otmar St. Gallen': 'St. Otmar', 'St. Otmar St. Gallen': 'St. Otmar', 'HSC Suhr Aarau': 'Suhr Aarau', 'Handball Stäfa': 'Stäfa'};
  return map[name] || name || '';
}

/** Zwei bis drei Buchstaben als Ersatz für ein fehlendes Wappen. */
export function initials(name) {
  const words = shortTeam(name).replace(/[^\p{L}\s-]/gu, '').split(/[\s-]+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 2).map(w => w[0]).join('') : (words[0] || '?').slice(0, 2)).toUpperCase();
}
