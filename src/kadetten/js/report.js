// Spielberichte vereinheitlichen und auswerten (ohne Seitenzugriff). Getestet in tests/app-report.test.mjs.
// Quellen: SHV-Bericht (/api/reports, QHL), EHF-Archiv (/api/ehf-reports, EHL) und Matchbericht-Archiv
// (/api/match-reports, QHL). Fehlende Werte bleiben null und werden nie als 0 gezählt.
import {sameTeam} from './match.js';

const int = v => (Number.isInteger(v) && v >= 0 ? v : null);
const sum = (list, key) => (list.length && list.every(p => int(p[key]) !== null) ? list.reduce((n, p) => n + p[key], 0) : null);
export const pct = (part, whole) =>
  Number.isInteger(part) && Number.isInteger(whole) && whole > 0 && part <= whole ? Math.round((part / whole) * 1000) / 10 : null;

const clockSeconds = t => {
  const m = /^(\d{1,3}):(\d{2})$/.exec(String(t || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Text des Matchberichts, wenn gültig. */
export function reportText(archive) {
  const r = archive?.report;
  if (!r || !Array.isArray(r.paragraphs) || !r.paragraphs.length || !r.paragraphs.every(p => typeof p === 'string' && p.trim()))
    return null;
  return {
    headline: typeof r.headline === 'string' ? r.headline : '',
    paragraphs: r.paragraphs,
    generator: r.generator || null,
    generatedAt: r.generatedAt || null
  };
}

/** Tore in zeitlicher Reihenfolge: [{sec, score:[h,a], home, name, seven}] aus Archiv oder SHV-Ereignissen. */
export function goalTimeline(archive, shv) {
  if (Array.isArray(archive?.goals) && archive.goals.length) {
    const list = archive.goals
      .map(g => ({
        sec: clockSeconds(g.t),
        score: Array.isArray(g.s) ? g.s : null,
        home: g.h === true,
        name: g.n || null,
        seven: g.p === true
      }))
      .filter(g => g.sec !== null && g.score?.every(v => int(v) !== null));
    if (list.length) return list.sort((a, b) => a.sec - b.sec || a.score[0] + a.score[1] - (b.score[0] + b.score[1]));
  }
  if (Array.isArray(shv?.events)) {
    const goals = [];
    let last = [0, 0];
    for (const e of [...shv.events].sort((a, b) => a.seconds - b.seconds || a.id - b.id)) {
      if (!Array.isArray(e.score) || !e.score.every(v => int(v) !== null)) continue;
      const total = e.score[0] + e.score[1];
      if (total !== last[0] + last[1] + 1) {
        if (total > last[0] + last[1]) last = e.score;
        continue;
      }
      const home = e.score[0] === last[0] + 1;
      goals.push({
        sec: e.seconds,
        score: e.score,
        home,
        name: home ? e.homePlayer : e.awayPlayer,
        seven: /7\s*m|sieben/i.test(e.action || '')
      });
      last = e.score;
    }
    if (goals.length) return goals;
  }
  return [];
}

/** Spielverlauf: grösste Führung, längster Lauf, Führungswechsel. side: 'home' | 'away'. */
export function flow(goals) {
  if (!goals.length) return null;
  let biggest = {home: 0, away: 0},
    changes = 0,
    leader = null,
    run = {side: null, len: 0},
    bestRun = {side: null, len: 0, from: null, to: null};
  let runStart = [0, 0];
  for (const g of goals) {
    const diff = g.score[0] - g.score[1];
    if (diff > biggest.home) biggest.home = diff;
    if (-diff > biggest.away) biggest.away = -diff;
    const now = diff > 0 ? 'home' : diff < 0 ? 'away' : leader;
    if (leader && now && now !== leader && diff !== 0) changes++;
    if (diff !== 0) leader = now;
    const side = g.home ? 'home' : 'away';
    if (run.side === side) run.len++;
    else {
      run = {side, len: 1};
      runStart = [g.score[0] - (g.home ? 1 : 0), g.score[1] - (g.home ? 0 : 1)];
    }
    if (run.len > bestRun.len) bestRun = {side, len: run.len, from: runStart, to: g.score};
  }
  return {biggest, changes, run: bestRun};
}

/** Zeitstrafen und Auszeiten aus dem Archiv oder den SHV-Ereignissen. */
export function incidents(archive, shv) {
  const out = {suspensions: [], timeouts: []};
  if (Array.isArray(archive?.suspensions) || Array.isArray(archive?.timeouts)) {
    out.suspensions = (archive.suspensions || [])
      .filter(s => int(s.sec) !== null)
      .map(s => ({sec: s.sec, home: s.side === 'home', name: s.name || null}));
    out.timeouts = (archive.timeouts || []).filter(t => int(t.sec) !== null).map(t => ({sec: t.sec, home: t.side === 'home'}));
    return out;
  }
  // Aus SHV-Ereignissen nur Auszeiten (eindeutiger Code «bTO»); Strafen kommen aus dem Archiv.
  for (const e of shv?.events || [])
    if (e.homeAction === 'bTO' || e.awayAction === 'bTO') out.timeouts.push({sec: e.seconds, home: e.homeAction === 'bTO'});
  return out;
}

/** Bericht des SHV oder EHF in ein Modell bringen: {score, half, spectators, teams:[{name, players, …}], source}. */
export function normalizeReport(shv, ehf) {
  if (shv && Array.isArray(shv.teams) && shv.teams.length === 2) {
    return {
      score: shv.score,
      half: Array.isArray(shv.half) ? shv.half : [null, null],
      spectators: int(shv.spectators),
      referees: Array.isArray(shv.referees) ? shv.referees : [],
      source: 'SHV',
      teams: shv.teams.map(t => {
        const players = (t.players || []).map(p => ({
          id: p.id,
          name: p.name,
          number: int(p.number),
          keeper: Boolean(p.keeper),
          goals: int(p.goals),
          shots: int(p.shots),
          seven: int(p.seven),
          sevenShots: int(p.sevenShots),
          twoMinutes: int(p.twoMinutes),
          warnings: int(p.warnings),
          redCards: int(p.redCards),
          saves: int(p.saves),
          keeperShots: int(p.keeperShots)
        }));
        return {
          name: t.name,
          players,
          shots: int(t.shots),
          saves: int(t.saves),
          savePercentage: Number.isFinite(t.savePercentage) ? t.savePercentage : null,
          throwPercentage: Number.isFinite(t.throwPercentage) ? t.throwPercentage : null,
          seven: int(t.seven) ?? sum(players, 'seven'),
          sevenShots: int(t.sevenShots) ?? sum(players, 'sevenShots'),
          twoMinutes: int(t.twoMinutes) ?? sum(players, 'twoMinutes'),
          warnings: int(t.warnings) ?? sum(players, 'warnings'),
          turnovers: int(t.turnovers),
          timeouts: int(t.timeouts),
          misses: null,
          disqualifications: int(t.disqualifications)
        };
      })
    };
  }
  if (ehf && Array.isArray(ehf.score) && Array.isArray(ehf.players) && ehf.teamStats) {
    const team = home => {
      const ts = ehf.teamStats[home ? 'home' : 'guest'] || {};
      const own = ehf.players.filter(p => p.home === home && !(p.goalkeeper && p.savesFaced === 0));
      const keepers = own.filter(p => p.goalkeeper);
      const saves = keepers.length ? keepers.reduce((n, p) => n + (p.saves || 0), 0) : null,
        faced = keepers.reduce((n, p) => n + (p.savesFaced || 0), 0);
      const players = own.map(p => ({
        id: p.id,
        name: p.name,
        number: int(p.number),
        keeper: Boolean(p.goalkeeper),
        goals: int(p.goals),
        shots: int(p.shots),
        seven: int(p.seven),
        sevenShots: int(p.sevenShots),
        twoMinutes: int(p.twoMinutes),
        warnings: int(p.yellow),
        redCards: int(p.red),
        saves: p.goalkeeper ? int(p.saves) : null,
        keeperShots: p.goalkeeper ? int(p.savesFaced) : null
      }));
      return {
        name: home ? ehf.home : ehf.away,
        players,
        shots: int(ts.shots),
        saves,
        savePercentage: pct(saves, faced),
        throwPercentage: Number.isFinite(ts.efficiency) ? ts.efficiency : null,
        seven: int(ts.sevenGoals),
        sevenShots: int(ts.sevenShots),
        twoMinutes: int(ts.twoMinutes),
        warnings: int(ts.warnings),
        turnovers: int(ts.technicalFaults),
        timeouts: null,
        misses: int(ts.misses),
        disqualifications: int(ts.disqualifications)
      };
    };
    return {
      score: ehf.score,
      half: Array.isArray(ehf.half) ? ehf.half : [null, null],
      spectators: int(ehf.spectators),
      referees: [],
      source: 'EHF',
      teams: [team(true), team(false)],
      shotStats: ehf.shotStats || null
    };
  }
  return null;
}

/** Prüft Resultat und Teams gegen das Spiel im Spielplan. */
export function fitsGame(report, game) {
  return Boolean(
    report &&
      Array.isArray(game?.score) &&
      Array.isArray(report.score) &&
      report.score.every((v, i) => v === game.score[i]) &&
      report.teams?.length === 2 &&
      sameTeam(report.teams[0].name, game.home) &&
      sameTeam(report.teams[1].name, game.away)
  );
}

/** Zeilen für den Teamvergleich. Zeilen ohne Werte beider Teams entfallen. */
export function comparisonRows(report) {
  const [h, a] = report.teams;
  const quote = (t, goals) => t.throwPercentage ?? pct(goals, t.shots);
  const rows = [
    {label: 'Tore', home: report.score[0], away: report.score[1]},
    Array.isArray(report.half) && report.half.every(v => int(v) !== null)
      ? {label: '1. Halbzeit', home: report.half[0], away: report.half[1]}
      : null,
    Array.isArray(report.half) && report.half.every(v => int(v) !== null)
      ? {label: '2. Halbzeit', home: report.score[0] - report.half[0], away: report.score[1] - report.half[1]}
      : null,
    {label: 'Würfe', home: h.shots, away: a.shots},
    {label: 'Fehlwürfe', home: h.misses, away: a.misses, lower: true},
    {
      label: 'Wurfquote',
      home: quote(h, report.score[0]),
      away: quote(a, report.score[1]),
      homeText: h.shots !== null ? `${report.score[0]}/${h.shots} · ${fmtPct(quote(h, report.score[0]))}` : null,
      awayText: a.shots !== null ? `${report.score[1]}/${a.shots} · ${fmtPct(quote(a, report.score[1]))}` : null,
      rule: 'wurfquote'
    },
    {
      label: 'Paraden',
      home: h.saves,
      away: a.saves,
      homeText: h.saves !== null ? `${h.saves}${h.savePercentage !== null ? ' · ' + fmtPct(h.savePercentage) : ''}` : null,
      awayText: a.saves !== null ? `${a.saves}${a.savePercentage !== null ? ' · ' + fmtPct(a.savePercentage) : ''}` : null,
      rule: 'parade'
    },
    {
      label: '7-m',
      home: h.seven,
      away: a.seven,
      homeText: h.sevenShots !== null ? `${h.seven}/${h.sevenShots}` : null,
      awayText: a.sevenShots !== null ? `${a.seven}/${a.sevenShots}` : null,
      rule: '7m'
    },
    {label: 'Zeitstrafen', home: h.twoMinutes, away: a.twoMinutes, lower: true, rule: '2min'},
    {label: 'Verwarnungen', home: h.warnings, away: a.warnings, lower: true, rule: 'gelb'},
    {label: 'Disqualifikationen', home: h.disqualifications, away: a.disqualifications, lower: true, rule: 'rot'},
    {label: 'Technische Fehler', home: h.turnovers, away: a.turnovers, lower: true, rule: 'tf'}
  ];
  return rows
    .filter(r => r && Number.isFinite(r.home) && Number.isFinite(r.away))
    .map(r => ({
      ...r,
      homeText: r.homeText || fmtNum(r.home, r.label === 'Wurfquote'),
      awayText: r.awayText || fmtNum(r.away, r.label === 'Wurfquote'),
      share: r.home + r.away > 0 ? r.home / (r.home + r.away) : 0.5
    }));
}
export const fmtPct = v => (v === null || v === undefined ? '–' : `${String(Math.round(v)).replace('.', ',')} %`);
const fmtNum = (v, isPct) => (isPct ? fmtPct(v) : String(v));

/** Wurfzonen der EHF in lesbarer Reihenfolge. */
export const ZONES = [
  ['LLD', 'Links · Distanz'],
  ['CLD', 'Mitte · Distanz'],
  ['RLD', 'Rechts · Distanz'],
  ['LSD', 'Links · nah'],
  ['CSD', 'Mitte · nah'],
  ['RSD', 'Rechts · nah'],
  ['LW', 'Flügel links'],
  ['RW', 'Flügel rechts'],
  ['PTY', '7-m'],
  ['FB', 'Gegenstoss'],
  ['BT', 'Durchbruch']
];

/** Werte eines Kadetten-Spielers in einem Bericht (über die SHV- oder EHF-Spieler-ID). */
export function playerInReport(report, ids) {
  for (const team of report?.teams || []) {
    const p = team.players.find(x => ids.includes(x.id));
    if (p) return p;
  }
  return null;
}
