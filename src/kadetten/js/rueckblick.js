// Saisonrückblick «Deine Saison»: Karten wie eine Geschichte, nur aus Daten auf dem Gerät und aus dem Datenstand der App.
// Karten ohne Daten fallen weg. Keine Vergleiche mit anderen Fans, weil die App keine Nutzerdaten sammelt.
import {OWN_TEAM, ownGames, hasScore, kickoff, outcome, standings, shortTeam} from './logic.js';
import {seasonSummary, tipPoints} from './moments.js';
import {weekResult} from './quiz.js';
import {pct as reportPct} from './report.js';
import {progress} from './sammeln.js';
import {SQUAD} from '../data/squad.js';
import {SEASON} from './season.js';

/** Ganze Prozent (null ohne Grundlage); rechnet mit der gemeinsamen Funktion aus report.js. */
const pct = (part, whole) => {
  const v = reportPct(part, whole);
  return v === null ? null : Math.round(v);
};
const played = (games, now) => ownGames(games).filter(g => hasScore(g) && kickoff(g) <= now);

/** Ist die Saison vorbei? Es gibt gespielte Kadetten-Spiele und keines steht mehr aus. */
export function seasonOver(games, now) {
  const own = ownGames(games);
  return own.some(hasScore) && !own.some(g => !hasScore(g));
}

/** Fan-Typ aus festen Regeln. Jede Regel hat eine Schwelle; es gewinnt die am deutlichsten erfüllte. */
export function fanType({visits, homePlayed, exact, tipped, live, ownPlayed, quizWeeks, cardShare}) {
  const rules = [
    ['Hallen-Stammgast', 'Mindestens jedes zweite Heimspiel warst du in der BBC Arena.', homePlayed ? visits / homePlayed / 0.5 : 0],
    ['Orakel', 'Drei oder mehr Resultate exakt getippt.', exact / 3],
    ['Live-Begleiter', 'Die meisten Spiele hast du live in der App verfolgt.', ownPlayed ? live / ownPlayed / 0.5 : 0],
    ['Wissensdurst', 'Mindestens 20 Wochen das Quiz gelöst.', quizWeeks / 20],
    ['Sammler', 'Drei Viertel aller Sammelkarten beisammen.', cardShare / 0.75]
  ];
  const best = rules.filter(r => r[2] >= 1).sort((a, b) => b[2] - a[2])[0];
  if (best) return {name: best[0], why: best[1]};
  return visits || tipped || live || quizWeeks
    ? {name: 'Treuer Fan', why: 'Dabei in der Halle, beim Tippen, live oder im Quiz.'}
    : {name: 'Kadetten-Fan', why: 'Nächste Saison mit Tipps, Quiz und Hallenbesuchen.'};
}

const ownGoals = g => (g.home === OWN_TEAM ? g.score[0] : g.score[1]);
const oppGoals = g => (g.home === OWN_TEAM ? g.score[1] : g.score[0]);
const hasHalf = g => Array.isArray(g.half) && g.half.length === 2 && g.half.every(Number.isInteger);
const tenth = v => Math.round(v * 10) / 10;

/** Längste Siegesserie in Spielreihenfolge: {len, from, to} (Daten der ersten und letzten Partie) oder null unter zwei Siegen. */
export function winStreak(games) {
  let best = null,
    run = [];
  for (const g of [...games].sort((a, b) => kickoff(a) - kickoff(b))) {
    run = outcome(g) === 'S' ? [...run, g] : [];
    if (run.length >= 2 && (!best || run.length > best.len)) best = {len: run.length, from: run[0].date, to: run.at(-1).date};
  }
  return best;
}

/** Spiel der Saison: der grösste aufgeholte Pausenrückstand (nicht verloren), sonst der höchste Sieg. */
export function gameOfSeason(games) {
  const done = games.filter(g => hasScore(g));
  const comebacks = done
    .filter(hasHalf)
    .map(g => ({g, deficit: g.home === OWN_TEAM ? g.half[1] - g.half[0] : g.half[0] - g.half[1], margin: ownGoals(g) - oppGoals(g)}))
    .filter(x => x.deficit > 0 && x.margin >= 0)
    .sort((a, b) => b.deficit - a.deficit || b.margin - a.margin);
  const pick = comebacks[0]
    ? {g: comebacks[0].g, kind: 'comeback', deficit: comebacks[0].deficit}
    : done
        .filter(g => outcome(g) === 'S')
        .map(g => ({g, kind: 'sieg', deficit: 0, margin: ownGoals(g) - oppGoals(g)}))
        .sort((a, b) => b.margin - a.margin)[0];
  if (!pick) return null;
  const g = pick.g;
  return {
    kind: pick.kind,
    deficit: pick.deficit,
    date: g.date,
    league: g.league || '',
    home: shortTeam(g.home),
    away: shortTeam(g.away),
    score: g.score,
    half: hasHalf(g) ? g.half : null,
    ownHome: g.home === OWN_TEAM
  };
}

/**
 * Karten des Rückblicks. input: {data, now, visited, tips, live, answers, favourite, s (Speicher, für Tests)}.
 * Schwerpunkt ist die Statistik der ganzen Saison (gleich für alle Fans); Persönliches steht nur auf der letzten Karte.
 * Jede Karte hat id und Werte; die Ansicht entscheidet über Gestaltung und Text. Karten ohne Daten fallen weg.
 */
export function recap({data, now, visited = [], tips = {}, live = [], answers = {}, s} = {}) {
  const games = data?.games || [];
  const own = played(games, now);
  const sum = seasonSummary({games, visited, tips, now});
  const homePlayed = own.filter(g => g.home === OWN_TEAM).length;
  const slides = [{id: 'intro', season: SEASON}];

  if (own.length) {
    const record = {S: 0, U: 0, N: 0};
    for (const g of own) record[outcome(g)]++;
    slides.push({id: 'bilanz', games: own.length, record, quote: pct(record.S, own.length)});
    const goalsFor = own.reduce((n, g) => n + ownGoals(g), 0),
      goalsAgainst = own.reduce((n, g) => n + oppGoals(g), 0);
    slides.push({
      id: 'tore',
      goalsFor,
      goalsAgainst,
      perGame: tenth(goalsFor / own.length),
      diff: goalsFor - goalsAgainst,
      against: goalsFor ? Math.round((goalsAgainst / goalsFor) * 100) : 0
    });
    const halves = own.filter(hasHalf);
    if (halves.length >= 3) {
      const ownHalf = g => (g.home === OWN_TEAM ? g.half[0] : g.half[1]),
        oppHalf = g => (g.home === OWN_TEAM ? g.half[1] : g.half[0]);
      const first = halves.reduce((n, g) => n + ownHalf(g), 0) / halves.length;
      const second = halves.reduce((n, g) => n + (ownGoals(g) - ownHalf(g)), 0) / halves.length;
      const led = halves.filter(g => ownHalf(g) > oppHalf(g));
      slides.push({
        id: 'halbzeit',
        games: halves.length,
        first: tenth(first),
        second: tenth(second),
        turned: halves.filter(g => ownHalf(g) < oppHalf(g) && outcome(g) === 'S').length,
        led: led.length,
        ledLost: led.filter(g => outcome(g) === 'N').length
      });
    }
  }

  const table = standings(data?.tables?.QHL),
    row = table.find(r => r.team === OWN_TEAM);
  const qhl = own.filter(g => g.league === 'QHL');
  const record = {S: 0, U: 0, N: 0};
  for (const g of qhl) record[outcome(g)]++;
  const ranks = (Array.isArray(data?.rankHistory) ? data.rankHistory : []).filter(
    e => Number.isInteger(e?.rank) && Number.isInteger(e?.played)
  );
  slides.push({
    id: 'team',
    rank: row?.rank ?? null,
    points: row?.points ?? null,
    record,
    goalsFor: qhl.reduce((n, g) => n + ownGoals(g), 0),
    goalsAgainst: qhl.reduce((n, g) => n + oppGoals(g), 0),
    ranks: ranks.map(e => [e.played, e.rank]),
    start: ranks[0]?.rank ?? null,
    best: ranks.length ? Math.min(...ranks.map(e => e.rank)) : null,
    teams: table.length
  });

  const best = gameOfSeason(own);
  if (best) slides.push({id: 'spiel', ...best});
  const streak = winStreak(own);
  if (streak) slides.push({id: 'serien', ...streak});

  const players = Object.entries(data?.playerSeason?.players || {})
    .map(([number, p]) => ({
      number: Number(number),
      name: SQUAD.find(x => x.number === Number(number))?.name || `Nr. ${number}`,
      goals: p?.goals
    }))
    .filter(p => Number.isInteger(p.goals) && p.goals > 0)
    .sort((a, b) => b.goals - a.goals);
  if (players.length >= 3) {
    const top = players.slice(0, 5),
      all = players.reduce((n, p) => n + p.goals, 0);
    slides.push({
      id: 'torjaeger',
      top,
      share: pct(
        top.reduce((n, p) => n + p.goals, 0),
        all
      )
    });
  }

  const keeper = data?.playerSeason?.keeper;
  if (keeper && Number.isInteger(keeper.saves) && Number.isInteger(keeper.faced) && keeper.faced > 0)
    slides.push({id: 'torhueter', saves: keeper.saves, faced: keeper.faced, quote: pct(keeper.saves, keeper.faced)});

  const done = Object.entries(answers)
    .map(([w, a]) => weekResult(w, a))
    .filter(r => r.done);
  const prog = progress(s);
  const tippedGames = own.filter(g => Array.isArray(tips[g.id]));
  const hits = tippedGames.filter(g => tipPoints(tips[g.id], g.score) > 0).length;
  const type = fanType({
    visits: sum.visits,
    homePlayed,
    exact: sum.exact,
    tipped: sum.tipped,
    live: live.length,
    ownPlayed: own.length,
    quizWeeks: done.length,
    cardShare: prog.total ? prog.have / prog.total : 0
  });
  slides.push({
    id: 'fan',
    ...type,
    visits: sum.visits,
    points: sum.tipped ? sum.points : null,
    tipped: sum.tipped,
    tipRate: pct(hits, tippedGames.length),
    weeks: done.length,
    have: prog.have,
    total: prog.total,
    season: SEASON
  });
  return {season: SEASON, over: seasonOver(games, now), slides};
}
