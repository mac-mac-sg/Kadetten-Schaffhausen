// Saisonrückblick «Deine Saison»: Karten wie eine Geschichte, nur aus Daten auf dem Gerät und aus dem Datenstand der App.
// Karten ohne Daten fallen weg. Keine Vergleiche mit anderen Fans, weil die App keine Nutzerdaten sammelt.
import {OWN_TEAM, ownGames, hasScore, kickoff, outcome, standings, shortTeam} from './logic.js';
import {seasonSummary, tipPoints} from './moments.js';
import {weekResult} from './quiz.js';
import {pct as reportPct} from './report.js';
import {progress, collection, cardById, rarityOf} from './sammeln.js';
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

const RARITY_ORDER = {legende: 3, spezial: 2, standard: 1, moment: 0};

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

/** Längste Serie gespielter Tipps mit mindestens einem Punkt, in Spielreihenfolge. */
function tipStreak(games, tips) {
  let best = 0,
    run = 0;
  for (const g of games) {
    if (!Array.isArray(tips[g.id])) continue;
    run = tipPoints(tips[g.id], g.score) > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Karten des Rückblicks. input: {data, now, visited, tips, live, answers, favourite, s (Speicher, für Tests)}.
 * Jede Karte hat id und Werte; die Ansicht entscheidet über Gestaltung und Text.
 */
export function recap({data, now, visited = [], tips = {}, live = [], answers = {}, favourite = null, s} = {}) {
  const games = data?.games || [];
  const own = played(games, now);
  const sum = seasonSummary({games, visited, tips, now});
  const homePlayed = own.filter(g => g.home === OWN_TEAM).length;
  const slides = [{id: 'intro', season: SEASON}];

  if (sum.visits) {
    const seen = own.filter(g => visited.includes(String(g.id)));
    slides.push({
      id: 'halle',
      visits: sum.visits,
      record: sum.record,
      goals: sum.goals,
      withYou: pct(sum.record.S, seen.length),
      overall: pct(own.filter(g => outcome(g) === 'S').length, own.length)
    });
    if (sum.best) {
      const g = sum.best;
      slides.push({
        id: 'spiel',
        date: g.date,
        league: g.league || '',
        home: shortTeam(g.home),
        away: shortTeam(g.away),
        score: g.score,
        margin: Math.abs(g.score[0] - g.score[1])
      });
    }
  }

  if (sum.tipped) {
    const tipped = own.filter(g => Array.isArray(tips[g.id]));
    const scored = tipped.map(g => ({g, p: tipPoints(tips[g.id], g.score)}));
    const top = scored.sort((a, b) => b.p - a.p || kickoff(b.g) - kickoff(a.g))[0];
    slides.push({
      id: 'tipps',
      points: sum.points,
      tipped: sum.tipped,
      exact: sum.exact,
      diff: scored.filter(x => x.p === 2).length,
      streak: tipStreak(own, tips),
      best:
        top && top.p > 0
          ? {tip: tips[top.g.id], opponent: shortTeam(top.g.home === OWN_TEAM ? top.g.away : top.g.home), points: top.p}
          : null
    });
  }

  const player = SQUAD.find(p => p.number === favourite);
  const stats = player ? data?.playerSeason?.players?.[player.number] : null;
  if (player && stats && Number.isFinite(stats.goals))
    slides.push({
      id: 'spieler',
      number: player.number,
      name: player.name,
      position: player.position,
      goals: stats.goals,
      games: stats.games,
      perGame: stats.goalsPerGame,
      seven: stats.sevenMeterGoals
    });

  const done = Object.entries(answers)
    .map(([w, a]) => weekResult(w, a))
    .filter(r => r.done);
  const prog = progress(s);
  if (done.length || prog.have) {
    const {cards} = collection(s);
    const rare = Object.entries(cards)
      .map(([id, at]) => ({card: cardById(id, games), at}))
      .filter(x => x.card)
      .sort((a, b) => RARITY_ORDER[rarityOf(b.card)] - RARITY_ORDER[rarityOf(a.card)] || b.at - a.at)[0];
    slides.push({
      id: 'sammeln',
      weeks: done.length,
      perfect: done.filter(r => r.right === r.size).length,
      quote: pct(
        done.reduce((n, r) => n + r.right, 0),
        done.reduce((n, r) => n + r.size, 0)
      ),
      have: prog.have,
      total: prog.total,
      rarest: rare ? rare.card.title : null
    });
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
    goalsFor: qhl.reduce((n, g) => n + (g.home === OWN_TEAM ? g.score[0] : g.score[1]), 0),
    goalsAgainst: qhl.reduce((n, g) => n + (g.home === OWN_TEAM ? g.score[1] : g.score[0]), 0),
    ranks: ranks.map(e => [e.played, e.rank]),
    teams: table.length
  });

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
  slides.push({id: 'fan', ...type, visits: sum.visits, points: sum.tipped ? sum.points : null, weeks: done.length, season: SEASON});
  return {season: SEASON, over: seasonOver(games, now), slides};
}
