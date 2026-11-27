import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {recap, seasonOver, fanType, winStreak, gameOfSeason} from '../src/kadetten/js/rueckblick.js';
import {renderRueckblick, recapTiles, recapTeaser} from '../src/kadetten/js/views/rueckblick.js';
import {parseRoute, href} from '../src/kadetten/js/router.js';
import {weeklyQuiz, inWeek, weekIndex} from '../src/kadetten/js/quiz.js';

const OWN = 'Kadetten Schaffhausen';
const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v))};
};
const g = (id, date, home, away, score, league = 'QHL', half) => ({
  id,
  date,
  time: '18:00',
  home,
  away,
  league,
  venue: 'BBC Arena, Schaffhausen',
  ...(score ? {score} : {}),
  ...(half ? {half} : {})
});
const games = [
  g('1', '2026-09-05', OWN, 'Pfadi Winterthur', [31, 27], 'QHL', [11, 12]),
  g('2', '2026-09-12', 'BSV Bern', OWN, [30, 29], 'QHL', [14, 16]),
  g('3', '2026-09-19', OWN, 'HC Kriens-Luzern', [36, 26], 'QHL', [20, 11]),
  g('4', '2026-09-26', OWN, 'Wacker Thun', [25, 25], 'QHL', [10, 14]),
  g('5', '2026-10-03', 'TSV St. Otmar St. Gallen', OWN, [24, 33], 'QHL', [12, 15])
];
const tables = {
  QHL: [
    [OWN, 5, 154, 132, 7],
    ['BSV Bern', 5, 150, 140, 6]
  ]
};
const data = {
  games,
  tables,
  rankHistory: [
    {played: 1, rank: 3},
    {played: 3, rank: 2},
    {played: 5, rank: 1}
  ],
  playerSeason: {players: {10: {games: 5, goals: 31, goalsPerGame: 6.2, sevenMeterGoals: 9}}}
};
const now = Date.parse('2026-10-10T12:00:00+02:00');

test('Saisonende: erst wenn kein Kadetten-Spiel mehr aussteht', () => {
  assert.equal(seasonOver(games, now), true);
  assert.equal(seasonOver([...games, g('6', '2026-10-20', OWN, 'HSC Suhr Aarau')], now), false);
  assert.equal(seasonOver([], now), false);
});

test('Fan-Typ: feste Regeln, die am deutlichsten erfüllte gewinnt', () => {
  const base = {visits: 0, homePlayed: 10, exact: 0, tipped: 0, live: 0, ownPlayed: 20, quizWeeks: 0, cardShare: 0};
  assert.equal(fanType({...base, visits: 8}).name, 'Hallen-Stammgast');
  assert.equal(fanType({...base, visits: 5, exact: 6}).name, 'Orakel', '6 exakte Tipps (2× Schwelle) schlagen 5 von 10 Heimspielen (1×)');
  assert.equal(fanType({...base, quizWeeks: 25}).name, 'Wissensdurst');
  assert.equal(fanType({...base, cardShare: 0.8}).name, 'Sammler');
  assert.equal(fanType({...base, live: 12}).name, 'Live-Begleiter');
  assert.equal(fanType({...base, tipped: 2}).name, 'Treuer Fan');
  assert.equal(fanType(base).name, 'Kadetten-Fan');
});

test('Rückblick: Statistik der Saison für alle, Persönliches nur auf der letzten Karte', () => {
  const empty = recap({data, now, s: memory()});
  assert.deepEqual(
    empty.slides.map(s => s.id),
    ['intro', 'bilanz', 'tore', 'halbzeit', 'team', 'spiel', 'fan'],
    'Torjäger, Torhüter und Serien nur mit Daten'
  );
  assert.equal(empty.slides.at(-1).name, 'Kadetten-Fan');
  const week = weekIndex(Date.parse('2026-09-30T12:00:00+02:00'));
  const quiz = weeklyQuiz(inWeek(week));
  const s = memory({'v2:app-cards': JSON.stringify({cards: {'k-10': 1, 'l-buehler': 2}, claimed: []})});
  const full = recap({
    data: {
      ...data,
      playerSeason: {
        players: {10: {goals: 31}, 11: {goals: 20}, 12: {goals: 15}, 13: {goals: 9}, 14: {goals: 5}, 15: {goals: 4}},
        keeper: {saves: 120, faced: 200}
      }
    },
    now,
    visited: ['1', '3', '4'],
    tips: {1: [31, 27], 3: [30, 25], 2: [25, 30], 5: [20, 30]},
    live: ['2'],
    answers: {[week]: quiz.questions.map(q => q.c)},
    s
  });
  const by = id => full.slides.find(x => x.id === id);
  assert.deepEqual(
    full.slides.map(x => x.id),
    ['intro', 'bilanz', 'tore', 'halbzeit', 'team', 'spiel', 'torjaeger', 'torhueter', 'fan']
  );
  assert.deepEqual([by('bilanz').games, by('bilanz').record, by('bilanz').quote], [5, {S: 3, U: 1, N: 1}, 60]);
  assert.deepEqual(
    [by('tore').goalsFor, by('tore').goalsAgainst, by('tore').perGame, by('tore').diff, by('tore').against],
    [154, 132, 30.8, 22, 86]
  );
  assert.deepEqual(
    [by('halbzeit').first, by('halbzeit').second, by('halbzeit').turned, by('halbzeit').led, by('halbzeit').ledLost],
    [14.4, 16.4, 1, 3, 1]
  );
  assert.equal(by('team').rank, 1);
  assert.deepEqual(by('team').record, {S: 3, U: 1, N: 1});
  assert.equal(by('team').goalsFor, 154);
  assert.deepEqual([by('team').start, by('team').best], [3, 1]);
  assert.deepEqual([by('spiel').kind, by('spiel').score, by('spiel').deficit], ['comeback', [25, 25], 4], 'grösster aufgeholter Rückstand');
  assert.deepEqual(
    by('torjaeger').top.map(p => p.goals),
    [31, 20, 15, 9, 5]
  );
  assert.equal(by('torjaeger').share, 95, '80 von 84 Toren gehen auf die fünf besten');
  assert.deepEqual([by('torhueter').saves, by('torhueter').faced, by('torhueter').quote], [120, 200, 60]);
  assert.equal(by('fan').name, 'Hallen-Stammgast');
  assert.equal(by('fan').visits, 3);
  assert.equal(by('fan').tipRate, 75, '3 von 4 Tipps mit Punkten');
  assert.equal(by('fan').weeks, 1);
  assert.equal(by('fan').have, 1, 'nur bekannte Karten zählen');
  assert.ok(recapTiles(full).length >= 4);
  assert.equal(recapTiles(full)[0][1], 'Pflichtspiele', 'zuerst die Saison der Kadetten');
});

test('Serien und Spiel der Saison: längste Siegesserie, Aufholjagd vor höchstem Sieg', () => {
  const list = [
    g('a', '2026-09-01', OWN, 'A', [30, 20]),
    g('b', '2026-09-08', 'B', OWN, [25, 28]),
    g('c', '2026-09-15', OWN, 'C', [31, 30]),
    g('d', '2026-09-22', 'D', OWN, [30, 20]),
    g('e', '2026-09-29', OWN, 'E', [29, 28]),
    g('f', '2026-10-06', 'F', OWN, [20, 25])
  ];
  assert.deepEqual(winStreak(list), {len: 3, from: '2026-09-01', to: '2026-09-15'});
  assert.equal(winStreak([list[0], list[3]]), null, 'weniger als zwei Siege in Folge: keine Karte');
  assert.equal(gameOfSeason(list).kind, 'sieg', 'ohne Halbzeitstände der höchste Sieg');
  assert.deepEqual(gameOfSeason(list).score, [30, 20]);
  assert.equal(gameOfSeason([]), null);
});

test('Ansicht: Balken, eine Karte, Tippflächen, Teilen auf der letzten Karte, Hinweis', () => {
  assert.deepEqual(parseRoute('#/rueckblick'), {area: null, view: 'rueckblick'});
  assert.equal(href.rueckblick(), '#/rueckblick');
  const doc = step =>
    parseHTML('<html><body>' + String(renderRueckblick({state: {data}, now, ui: {rbStep: step}})) + '</body></html>').document;
  const first = doc(0);
  const n = first.querySelectorAll('.rb-bars i').length;
  assert.ok(n >= 3);
  assert.equal(first.querySelectorAll('.rb-bars i.on').length, 0);
  assert.equal(first.querySelectorAll('.rb-bars i.now').length, 1, 'laufende Karte füllt ihren Balken');
  assert.ok(first.querySelector('[data-rb="next"]') && !first.querySelector('[data-rb="prev"]'));
  assert.equal(first.querySelector('[data-rb-pause]').getAttribute('aria-label'), 'Pause', 'sichtbarer Pause-Knopf');
  assert.equal(first.querySelector('.rb-slide').getAttribute('aria-live'), 'off', 'automatische Wechsel werden nicht vorgelesen');
  const manual = parseHTML(
    '<html><body>' + String(renderRueckblick({state: {data}, now, ui: {rbStep: 1, rbManual: true, rbPaused: true}})) + '</body></html>'
  ).document;
  assert.equal(manual.querySelector('.rb-slide').getAttribute('aria-live'), 'polite', 'Wechsel von Hand werden vorgelesen');
  assert.equal(manual.querySelector('[data-rb-pause]').getAttribute('aria-pressed'), 'true');
  assert.ok(manual.querySelector('.rb.paused'));
  const still = parseHTML(
    '<html><body>' + String(renderRueckblick({state: {data}, now, ui: {rbStep: 1, rbAuto: false}})) + '</body></html>'
  ).document;
  assert.ok(!still.querySelector('[data-rb-pause]') && !still.querySelector('.rb-bars i.now'), 'bei «Bewegung reduzieren» keine Automatik');
  assert.equal(still.querySelector('.rb-slide').getAttribute('aria-live'), 'polite');
  assert.equal(first.querySelector('.rb-close').getAttribute('href'), '#/ich');
  assert.match(first.querySelector('h1').textContent, /Kadetten/);
  const last = doc(99);
  assert.ok(last.querySelector('[data-rb-share]') && !last.querySelector('[data-rb="next"]'));
  assert.equal(last.querySelector('.rb-slide').getAttribute('data-rb-id'), 'fan');
  assert.equal(last.querySelectorAll('.rb-bars i.now').length, 0, 'letzte Karte bleibt stehen');
  assert.equal(last.querySelectorAll('.rb-bars i.on').length, n);
  assert.ok(String(recapTeaser(games, now)).includes('#/rueckblick'));
  assert.equal(String(recapTeaser([...games, g('6', '2026-10-20', OWN, 'HSC Suhr Aarau')], now)), '', 'kein Hinweis vor Saisonende');
});
