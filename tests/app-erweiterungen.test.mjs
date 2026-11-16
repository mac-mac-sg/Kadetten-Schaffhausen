import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseRoute, href} from '../src/kadetten/js/router.js';
import {compareRows} from '../src/kadetten/js/views/team.js';
import {pointsCurve, competitionOf} from '../src/kadetten/js/logic.js';
import {seasonCurve, playoffBlock} from '../src/kadetten/js/views/saison.js';
import {shortCards} from '../src/kadetten/js/kurz.js';
import {
  weeklyQuiz,
  weekIndex,
  nextQuizAt,
  answerQuiz,
  quizAnswers,
  quizStats,
  QUIZ_SIZE,
  quizSize,
  SHORT_FROM,
  weekResult,
  inWeek
} from '../src/kadetten/js/quiz.js';
import {QUESTIONS} from '../src/kadetten/data/quiz.js';
import {needsWelcome, markWelcome, toggleFavourite} from '../src/kadetten/js/personal.js';
import {gegnerCheck} from '../src/kadetten/js/views/spiel.js';
import {playoffSeries, playoffStage, seriesText} from '../src/kadetten/js/playoffs.js';
import {updateRankHistory} from '../server/rank-history.mjs';

const OWN = 'Kadetten Schaffhausen';
const memory = () => {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)};
};
const game = (id, date, home, away, score, extra = {}) => ({
  id,
  date,
  time: '18:00',
  home,
  away,
  league: 'QHL',
  ...(score ? {score} : {}),
  ...extra
});

test('Schnellzugriffe: Manifest führt zu Spielen, Tabelle und Kader', () => {
  const manifest = JSON.parse(readFileSync(new URL('../src/kadetten/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.deepEqual(
    manifest.shortcuts.map(s => s.url),
    ['./#/saison', './#/statistik', './#/team']
  );
  for (const s of manifest.shortcuts) assert.equal(parseRoute(s.url.slice(2)).area !== 'jetzt', true);
});

test('Spielervergleich: Route, Adresse und Hervorhebung des höheren Werts', () => {
  assert.deepEqual(parseRoute('#/team/vergleich/10/14'), {area: 'team', view: 'vergleich', a: '10', b: '14'});
  assert.deepEqual(parseRoute('#/team/vergleich/x'), {area: 'team', view: 'vergleich', a: null, b: null});
  assert.equal(href.vergleich(10, 14), '#/team/vergleich/10/14');
  assert.equal(parseRoute('#/team/10').view, 'spieler');
  const rows = compareRows({games: 8, goals: 30, goalsPerGame: 3.8}, {games: 8, goals: 12, goalsPerGame: 1.5});
  assert.deepEqual(rows[0], {label: 'Spiele', a: '8', b: '8', lead: null});
  assert.equal(rows[1].lead, 'a');
  assert.equal(rows[2].a, '3,8');
  assert.equal(rows[3].a, '–');
});

test('Saisonkurve: Punkte je Runde und Rang aus dem Verlauf des Datendiensts', () => {
  const games = [
    game('1', '2026-09-01', OWN, 'A', [30, 20]),
    game('2', '2026-09-08', 'B', OWN, [25, 25]),
    game('3', '2026-09-15', OWN, 'C', [20, 22]),
    game('4', '2026-09-22', OWN, 'D', [31, 30], {league: 'EHL'}),
    game('5', '2026-12-01', OWN, 'E')
  ];
  assert.deepEqual(
    pointsCurve(games).map(c => c.points),
    [2, 3, 3]
  );
  const out = String(
    seasonCurve({
      games,
      tables: {
        QHL: [
          ['A', 3, 1, 1, 6],
          [OWN, 3, 75, 67, 3]
        ]
      },
      rankHistory: [{played: 2, rank: 1, points: 3}]
    })
  );
  assert.match(out, /3 von 6 möglichen Punkten nach 3 Runden/);
  assert.match(out, /2\. Runde: 1\. · 3\. Runde: 2\./);
  assert.equal(String(seasonCurve({games: games.slice(0, 1), tables: {}})), '');
});

test('Rangverlauf des Datendiensts: letzter Stand je Runde, ungültige Tabellen ändern nichts', () => {
  const table = [
    ['A', 3, 1, 1, 6],
    [OWN, 3, 75, 67, 4]
  ];
  let history = updateRankHistory(undefined, table, '2026-09-16T10:00:00Z');
  assert.deepEqual(history, [{played: 3, rank: 2, points: 4, date: '2026-09-16'}]);
  history = updateRankHistory(
    history,
    [
      [OWN, 3, 75, 67, 4],
      ['A', 4, 1, 1, 4]
    ],
    '2026-09-18'
  );
  assert.deepEqual(
    history.map(e => e.rank),
    [1]
  );
  history = updateRankHistory(history, [[OWN, 4, 99, 90, 6]], '2026-09-23');
  assert.deepEqual(
    history.map(e => [e.played, e.rank]),
    [
      [3, 1],
      [4, 1]
    ]
  );
  assert.equal(updateRankHistory(history, [['A', 4, 1, 1, 4]], 'x').length, 2);
  assert.equal(updateRankHistory(history, null, 'x').length, 2);
});

test('Spiel in 30 Sekunden: Karten nur mit vorhandenen Werten', () => {
  const g = game('9', '2026-11-01', OWN, 'Pfadi Winterthur', [31, 27], {half: [15, 14]});
  assert.equal(shortCards({game: game('8', '2026-12-01', OWN, 'X')}).length, 0);
  const only = shortCards({game: g});
  assert.deepEqual(
    only.map(c => c.kicker),
    ['Sieg']
  );
  assert.equal(only[0].text, 'Halbzeit 15:14');
  const goals = [
    {home: true, score: [1, 0], sec: 60},
    {home: true, score: [2, 0], sec: 120},
    {home: true, score: [3, 0], sec: 180},
    {home: false, score: [3, 1], sec: 240}
  ];
  const report = {
    score: [31, 27],
    teams: [
      {
        name: OWN,
        shots: 50,
        players: [
          {name: 'Luka MAROS', goals: 9, shots: 11, seven: 2},
          {name: 'Tor HÜTER', goals: 0, saves: 14, keeperShots: 40}
        ]
      },
      {name: 'Pfadi Winterthur', players: []}
    ]
  };
  const cards = shortCards({game: g, report, goals, tables: {QHL: [[OWN, 9, 1, 1, 15]]}, games: [g]});
  assert.deepEqual(
    cards.map(c => c.kicker),
    ['Sieg', 'Wendepunkt', 'Bester Werfer', 'Zahl des Spiels', 'Tabelle danach']
  );
  assert.equal(cards[1].figure, '3:0');
  assert.match(cards[2].text, /Tore aus 11 Würfen, davon 2 vom 7-m-Punkt/);
  assert.match(cards[3].text, /Fangquote 35 %/);
  assert.equal(parseRoute('#/spiel/9/kurz').tab, 'kurz');
});

test('Quiz der Woche: drei Fragen je Woche (früher fünf), Wechsel am Montag, gleiche Fragen für alle', () => {
  assert.ok(QUESTIONS.length >= 40);
  for (const q of QUESTIONS) {
    assert.equal(q.a.length, 4);
    assert.equal(new Set(q.a).size, 4, q.q);
    assert.ok(Number.isInteger(q.c) && q.c >= 0 && q.c < 4 && q.w.length > 10);
  }
  assert.equal(new Set(QUESTIONS.map(q => q.q)).size, QUESTIONS.length);
  const sunday = Date.parse('2026-11-15T23:30:00+01:00'),
    monday = Date.parse('2026-11-16T00:30:00+01:00');
  assert.equal(weekIndex(monday), weekIndex(sunday) + 1);
  assert.equal(new Date(nextQuizAt(monday)).toISOString(), '2026-11-22T23:00:00.000Z');
  const a = weeklyQuiz(monday),
    b = weeklyQuiz(monday + 3 * 86400000);
  assert.equal(a.questions.length, QUIZ_SIZE);
  assert.deepEqual(a.questions, b.questions);
  assert.notDeepEqual(a.questions, weeklyQuiz(sunday).questions);
  const seen = new Set();
  for (let w = 0; w < Math.floor(QUESTIONS.length / QUIZ_SIZE); w++)
    weeklyQuiz(monday + w * 7 * 86400000).questions.forEach(q => seen.add(q.q));
  assert.equal(seen.size, Math.floor(QUESTIONS.length / QUIZ_SIZE) * QUIZ_SIZE);
});

test('Quiz der Woche: Antworten der Reihe nach, unveränderbar, Bilanz nur aus abgeschlossenen Wochen', () => {
  const s = memory(),
    now = Date.parse('2026-11-18T12:00:00+01:00'),
    quiz = weeklyQuiz(now);
  assert.deepEqual(answerQuiz(quiz.week, 1, 0, s), []);
  quiz.questions.forEach((q, i) => answerQuiz(quiz.week, i, i === 0 ? (q.c + 1) % 4 : q.c, s));
  assert.equal(answerQuiz(quiz.week, 0, quiz.questions[0].c, s).length, QUIZ_SIZE);
  answerQuiz(quiz.week + 1, 0, 1, s);
  assert.deepEqual(quizStats(quizAnswers(s)), {weeks: 1, right: QUIZ_SIZE - 1, total: QUIZ_SIZE});
  // Wochen vor der Umstellung behalten fünf Fragen; Antworten aus dieser Zeit bleiben gültig.
  assert.equal(quizSize(SHORT_FROM - 1), 5);
  assert.equal(quizSize(SHORT_FROM), 3);
  assert.equal(weeklyQuiz(inWeek(SHORT_FROM - 1)).questions.length, 5);
  // Die ersten drei Fragen der Umstellungswoche sind dieselben wie vorher, begonnene Quiz bleiben gültig.
  assert.deepEqual(weeklyQuiz(inWeek(SHORT_FROM)).questions.map(q => q.q).length, 3);
  const old = memory();
  old.setItem('v2:app-quiz', JSON.stringify({[SHORT_FROM]: [0, 1, 2, 3, 0], [SHORT_FROM - 1]: [0, 0, 0, 0, 0]}));
  const r = weekResult(SHORT_FROM, quizAnswers(old)[SHORT_FROM]);
  assert.equal(r.size, 3);
  assert.equal(r.done, true);
  assert.equal(quizStats(quizAnswers(old)).total, 8);
  s.setItem('v2:app-quiz', '{"x":[9]}');
  assert.deepEqual(quizAnswers(s), {});
});

test('Erster Start: einmalig und nur ohne persönliche Angaben', () => {
  const s = memory();
  assert.equal(needsWelcome(s), true);
  markWelcome(s);
  assert.equal(needsWelcome(s), false);
  const used = memory();
  toggleFavourite(10, used);
  assert.equal(needsWelcome(used), false);
  assert.deepEqual(parseRoute('#/start/3'), {area: null, view: 'start', step: 3});
  assert.equal(parseRoute('#/start/9').step, 1);
  assert.equal(href.start(2), '#/start/2');
});

test('Gegner-Check: Vergleich aus der Tabelle, sonst nichts', () => {
  const g = game('7', '2026-12-01', OWN, 'Pfadi Winterthur');
  const own = {played: 8, goalsFor: 262, goalsAgainst: 232},
    opp = {played: 8, goalsFor: 250, goalsAgainst: 234};
  assert.equal(String(gegnerCheck({game: g, own: null, opp: null})), '');
  const out = String(gegnerCheck({game: g, own, opp}));
  assert.match(out, /32,8/);
  assert.match(out, /31,3/);
  assert.doesNotMatch(out, /beste Werfer/);
});

test('Playoffs: Serien aus dem Spielplan, Cup-Final zählt nicht', () => {
  const games = [
    game('1', '2027-04-01', OWN, 'BSV Bern', [30, 25], {league: 'QHL Playoff', round: 'Viertelfinal'}),
    game('2', '2027-04-04', 'BSV Bern', OWN, [28, 26], {league: 'QHL Playoff', round: 'Viertelfinal'}),
    game('3', '2027-04-08', OWN, 'BSV Bern', [33, 29], {league: 'QHL Playoff', round: 'Viertelfinal'}),
    game('4', '2027-04-11', 'BSV Bern', OWN, null, {league: 'QHL Playoff', round: 'Viertelfinal'}),
    game('5', '2027-04-14', OWN, 'BSV Bern', null, {league: 'QHL Playoff', round: 'Viertelfinal'}),
    game('6', '2027-03-01', OWN, 'Wacker Thun', [30, 20], {league: 'Schweizer Cup', round: 'Final'}),
    game('7', '2026-11-01', OWN, 'Wacker Thun', [30, 20])
  ];
  assert.equal(playoffStage(games[5]), null);
  assert.equal(playoffStage(games[6]), null);
  assert.equal(competitionOf(games[0]), 'QHL');
  const [s, ...rest] = playoffSeries(games);
  assert.equal(rest.length, 0);
  assert.deepEqual([s.stage, s.wins, s.losses, s.bestOf, s.assumed, s.needed, s.next.id], ['Viertelfinal', 2, 1, 5, false, 1, '4']);
  assert.equal(seriesText(s), 'Stand 2:1 · Noch 1 Sieg zum Weiterkommen');
  assert.match(String(playoffBlock(games, Date.parse('2027-04-09'))), /Viertelfinal · BSV Bern/);
  assert.equal(String(playoffBlock(games.slice(5), 0)), '');
  const won = playoffSeries(games.map(g => (g.id === '4' ? {...g, score: [20, 30]} : g)))[0];
  assert.equal(won.state, 'won');
  assert.equal(seriesText(won), 'Serie gewonnen 3:1');
});

test('Gegner-Check gilt auch für European League', () => {
  const g = game('e1', '2026-11-24', OWN, 'Chambery Savoie Mont Blanc HB', null, {league: 'EHL'});
  const out = String(
    gegnerCheck({game: g, own: {played: 1, goalsFor: 39, goalsAgainst: 32}, opp: {played: 1, goalsFor: 33, goalsAgainst: 34}})
  );
  assert.match(out, /39/);
  assert.match(out, /Gruppenphase der European League nach 1 Spiel\./);
  assert.doesNotMatch(out, /beste Werfer/);
});

test('Teamnamen: «Chambéry» der Tabelle und der Spielplan-Name gelten als dasselbe Team', async () => {
  const {sameTeam} = await import('../src/kadetten/js/match.js');
  assert.equal(sameTeam('Chambéry', 'Chambery Savoie Mont Blanc HB'), true);
  assert.equal(sameTeam('GC Amicitia Zürich', 'GC Amicitia Zurich'), true);
  assert.equal(sameTeam('BSV Bern', 'HC Izvidac'), false);
});

test('Spielort: Halle ohne Ort davor, BBC Arena mit Adresse, Kartenlink auf die Google-Maps-Suche', async () => {
  const {venueInfo} = await import('../src/kadetten/js/views/parts.js');
  const {spielort} = await import('../src/kadetten/js/views/spiel.js');
  assert.deepEqual(venueInfo('Thun Lachen, Thun'), {
    name: 'Lachen',
    place: 'Thun',
    home: false,
    image: null,
    url: 'https://www.google.com/maps/search/?api=1&query=Thun%20Lachen%2C%20Thun'
  });
  assert.equal(venueInfo('Le Phare, Chambéry').name, 'Le Phare');
  assert.equal(venueInfo('St. Gallen Kreuzbleiche, St. Gallen').name, 'Kreuzbleiche');
  const home = venueInfo('Schaffhausen BBC Arena A, Schaffhausen');
  assert.equal(home.name, 'BBC Arena');
  assert.equal(home.place, 'Schweizersbildstrasse 10, 8207 Schaffhausen');
  assert.match(home.url, /query=BBC%20Arena%2C%20Schweizersbildstrasse%2010/);
  assert.equal(venueInfo(''), null);
  assert.equal(home.image, 'assets/bbc-arena.webp');
  assert.equal(venueInfo('Winterthur AXA Arena, Winterthur').image, 'assets/hallen/axa-arena.webp');
  assert.match(String(spielort({venue: 'St. Gallen Kreuzbleiche, St. Gallen'})), /class="ort-img" src="assets\/hallen\/kreuzbleiche.webp"/);
  const {HALLEN} = await import('../src/kadetten/data/hallen.js');
  const {existsSync} = await import('node:fs');
  for (const h of HALLEN) {
    assert.ok(existsSync('src/kadetten/' + h.image), h.image);
    if (h.image.startsWith('assets/hallen/'))
      assert.ok(h.author && h.license && h.url.startsWith('https://commons.wikimedia.org/'), h.image);
  }
  const out = String(spielort({venue: 'Thun Lachen, Thun'}));
  assert.match(out, /In Karten öffnen/);
  assert.match(out, /target="_blank" rel="noopener noreferrer"/);
  assert.equal(String(spielort({})), '');
});
