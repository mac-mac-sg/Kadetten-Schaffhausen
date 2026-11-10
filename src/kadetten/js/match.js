// Spielbezogene Logik ohne Seitenzugriff: Spiele zuordnen, Live-Tabelle, Spielberichte vereinheitlichen.
// Getestet in tests/app-match.test.mjs.
import {OWN_TEAM, hasScore, zurichParts, ownGames, standings} from './logic.js';

/** Vereinsnamen vergleichbar machen (Quellen schreiben «TSV St. Otmar» oder «RTV 1879 Basel» unterschiedlich). */
export function normTeam(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^tsv\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export const sameTeam = (a, b) => normTeam(a) === normTeam(b) && normTeam(a) !== '';
export const isOwn = name => sameTeam(name, OWN_TEAM);

/** Spiel im Datenstand, das zu einem Live- oder Endstand passt (gleiche Teams, gleicher Tag). */
export function findGame(games, match, now) {
  if (!match) return null;
  const day = match.date || zurichParts(now).date;
  return (games || []).find(g => g.date === day && sameTeam(g.home, match.home) && sameTeam(g.away, match.away)) || null;
}

/** Zustand der Spielseite: 'vorschau', 'live' oder 'bericht'. */
export function gamePhase(game, live, now) {
  if (!game) return 'vorschau';
  if (live?.match && findGame([game], live.match, now)) return 'live';
  if (hasScore(game)) return 'bericht';
  if (live?.finished && hasScore(live.finished) && findGame([game], live.finished, now)) return 'bericht';
  return 'vorschau';
}

/** Spiel mit dem bestätigten Endresultat aus /api/live ergänzen, falls der Datenstand noch älter ist. */
export function withFinished(game, live, now) {
  if (!game || hasScore(game) || !live?.finished || !hasScore(live.finished) || !findGame([game], live.finished, now)) return game;
  return {...game, score: [...live.finished.score], ...(Array.isArray(live.finished.half) ? {half: [...live.finished.half]} : {})};
}

/**
 * Tabelle, wenn das laufende Spiel so endet. Nur für QHL-Spiele mit beiden Teams in der Tabelle.
 * Sieg 2 Punkte, Unentschieden 1 Punkt. Reihenfolge: Punkte, Tordifferenz, erzielte Tore.
 */
export function liveTable(rows, match) {
  const table = standings(rows);
  if (!match || !Array.isArray(match.score) || !/QHL/i.test(match.league || '')) return null;
  const home = table.find(r => sameTeam(r.team, match.home)),
    away = table.find(r => sameTeam(r.team, match.away));
  if (!home || !away || [home, away].some(r => [r.played, r.goalsFor, r.goalsAgainst, r.points].some(v => v === null))) return null;
  const [h, a] = match.score;
  const next = table.map(r => ({...r, previousRank: r.rank}));
  const apply = (row, own, other) => {
    const r = next.find(x => x.team === row.team);
    r.played += 1;
    r.goalsFor += own;
    r.goalsAgainst += other;
    r.points += own > other ? 2 : own === other ? 1 : 0;
  };
  apply(home, h, a);
  apply(away, a, h);
  next.sort(
    (x, y) =>
      y.points - x.points ||
      y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) ||
      y.goalsFor - x.goalsFor ||
      x.previousRank - y.previousRank
  );
  return next.map((r, i) => ({...r, rank: i + 1}));
}

/** EHF-Archiv (/api/ehf-reports) in das Format der SHV-Berichte bringen. */
export function reportFromEhf(a) {
  if (!a || !Array.isArray(a.score) || !Array.isArray(a.players) || !a.teamStats) return null;
  const team = home => {
    const ts = a.teamStats[home ? 'home' : 'guest'] || {};
    const own = a.players.filter(p => p.home === home && !(p.goalkeeper && p.savesFaced === 0));
    const keepers = own.filter(p => p.goalkeeper);
    return {
      name: home ? a.home : a.away,
      players: own.map(p => ({
        id: p.id,
        name: p.name,
        keeper: !!p.goalkeeper,
        goals: p.goals ?? null,
        shots: p.shots ?? null,
        seven: p.seven ?? null,
        sevenShots: p.sevenShots ?? null,
        twoMinutes: p.twoMinutes ?? null,
        saves: p.goalkeeper ? (p.saves ?? null) : null
      })),
      saves: keepers.length ? keepers.reduce((n, p) => n + (p.saves || 0), 0) : null,
      seven: ts.sevenGoals ?? null,
      sevenShots: ts.sevenShots ?? null,
      twoMinutes: ts.twoMinutes ?? null,
      shots: ts.shots ?? null,
      turnovers: ts.technicalFaults ?? null
    };
  };
  return {
    score: a.score,
    half: Array.isArray(a.half) ? a.half : [null, null],
    teams: [team(true), team(false)],
    spectators: a.spectators ?? null,
    source: 'EHF'
  };
}

/** Prüft, ob ein Bericht zum Spiel passt (Resultat und Teams). */
export function reportMatches(report, game) {
  return Boolean(
    report &&
      hasScore(game) &&
      Array.isArray(report.score) &&
      report.score.every((v, i) => v === game.score[i]) &&
      report.teams?.length === 2 &&
      sameTeam(report.teams[0].name, game.home) &&
      sameTeam(report.teams[1].name, game.away)
  );
}

/** Torschützen einer Mannschaft, absteigend. Fehlende Werte zählen nicht als null Tore. */
export function scorers(team) {
  return (team?.players || [])
    .filter(p => Number.isInteger(p.goals) && p.goals > 0)
    .sort((a, b) => b.goals - a.goals || String(a.name).localeCompare(String(b.name), 'de'));
}

/** Teamvergleich für den Bericht; Zeilen ohne Werte entfallen. */
export function teamComparison(report) {
  const [h, a] = report?.teams || [];
  if (!h || !a) return [];
  const rows = [
    ['Paraden', h.saves, a.saves],
    ['7-m', h.seven, a.seven, h.sevenShots, a.sevenShots],
    ['Zeitstrafen', h.twoMinutes, a.twoMinutes],
    ['Würfe', h.shots, a.shots],
    ['Technische Fehler', h.turnovers, a.turnovers]
  ];
  return rows
    .filter(r => Number.isInteger(r[1]) && Number.isInteger(r[2]))
    .map(([label, home, away, homeOf, awayOf]) => ({
      label,
      home,
      away,
      homeText: Number.isInteger(homeOf) ? `${home}/${homeOf}` : String(home),
      awayText: Number.isInteger(awayOf) ? `${away}/${awayOf}` : String(away),
      share: home + away > 0 ? home / (home + away) : 0.5
    }));
}

/** Namen aus dem SHV-Bericht («PERIĆ Josip») lesbar machen. */
export function displayName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/);
  const last = parts.filter(p => p === p.toUpperCase() && /\p{Lu}/u.test(p));
  const first = parts.filter(p => !last.includes(p));
  if (!last.length || !first.length) return String(name || '');
  const cap = w => w.toLowerCase().replace(/(^|[-'])(\p{L})/gu, (m, s, c) => s + c.toUpperCase());
  return [...first, ...last.map(cap)].join(' ');
}

/** Artikel, die zu einem Spiel gehören: am Spieltag oder bis zwei Tage danach erschienen und mit dem Gegner im Titel oder Text. */
export function storiesForGame(stories, game) {
  if (!game?.date) return [];
  const opponent = isOwn(game.home) ? game.away : game.home;
  const words = String(opponent)
    .split(/\s+/)
    .filter(w => w.length > 3 && !/^\d+$/.test(w));
  const start = Date.parse(game.date);
  return (stories || []).filter(s => {
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.date || '');
    if (!m) return false;
    const days = (Date.parse(`${m[3]}-${m[2]}-${m[1]}`) - start) / 86400000;
    const text = `${s.title} ${s.text}`.toLowerCase();
    return days >= 0 && days <= 2 && words.some(w => text.includes(w.toLowerCase()));
  });
}

/** Letzte Resultate eines Gegners aus dem Kadetten-Spielplan (falls keine eigene Quelle vorliegt). */
export function lastGamesOf(games, team, count = 5) {
  return ownGames(games, team).filter(hasScore).reverse().slice(0, count);
}
