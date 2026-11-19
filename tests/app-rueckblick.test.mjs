import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {recap, seasonOver, fanType} from '../src/kadetten/js/rueckblick.js';
import {renderRueckblick, recapTiles, recapTeaser} from '../src/kadetten/js/views/rueckblick.js';
import {parseRoute, href} from '../src/kadetten/js/router.js';
import {weeklyQuiz, inWeek, weekIndex} from '../src/kadetten/js/quiz.js';

const OWN = 'Kadetten Schaffhausen';
const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v))};
};
const g = (id, date, home, away, score, league = 'QHL') => ({id, date, time: '18:00', home, away, league, venue: 'BBC Arena, Schaffhausen', ...(score ? {score} : {})});
const games = [
  g('1', '2026-09-05', OWN, 'Pfadi Winterthur', [31, 27]),
  g('2', '2026-09-12', 'BSV Bern', OWN, [30, 29]),
  g('3', '2026-09-19', OWN, 'HC Kriens-Luzern', [36, 26]),
  g('4', '2026-09-26', OWN, 'Wacker Thun', [25, 25]),
  g('5', '2026-10-03', 'TSV St. Otmar St. Gallen', OWN, [24, 33])
];
const tables = {QHL: [[OWN, 5, 154, 132, 7], ['BSV Bern', 5, 150, 140, 6]]};
const data = {games, tables, rankHistory: [{played: 1, rank: 3}, {played: 3, rank: 2}, {played: 5, rank: 1}], playerSeason: {players: {10: {games: 5, goals: 31, goalsPerGame: 6.2, sevenMeterGoals: 9}}}};
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

test('Rückblick: persönliche Karten nur mit Daten, Mannschaft und Fan-Typ immer', () => {
  const empty = recap({data, now, s: memory()});
  assert.deepEqual(
    empty.slides.map(s => s.id),
    ['intro', 'team', 'fan']
  );
  assert.equal(empty.slides.at(-1).name, 'Kadetten-Fan');
  const week = weekIndex(Date.parse('2026-09-30T12:00:00+02:00'));
  const quiz = weeklyQuiz(inWeek(week));
  const s = memory({'v2:app-cards': JSON.stringify({cards: {'k-10': 1, 'l-buehler': 2}, claimed: []})});
  const full = recap({
    data,
    now,
    visited: ['1', '3', '4'],
    tips: {1: [31, 27], 3: [30, 25], 2: [25, 30], 5: [20, 30]},
    live: ['2'],
    answers: {[week]: quiz.questions.map(q => q.c)},
    favourite: 10,
    s
  });
  const by = id => full.slides.find(x => x.id === id);
  assert.deepEqual(
    full.slides.map(x => x.id),
    ['intro', 'halle', 'spiel', 'tipps', 'spieler', 'sammeln', 'team', 'fan']
  );
  assert.deepEqual(by('halle').record, {S: 2, U: 1, N: 0});
  assert.equal(by('halle').goals, 31 + 36 + 25);
  assert.equal(by('halle').withYou, 67);
  assert.equal(by('halle').overall, 60);
  assert.deepEqual(by('spiel').score, [36, 26], 'höchster Sieg in der Halle');
  assert.equal(by('tipps').exact, 1);
  assert.equal(by('tipps').points, 3 + 1 + 0 + 1);
  assert.equal(by('tipps').best.opponent, 'Pfadi Winterthur');
  assert.equal(by('spieler').goals, 31);
  assert.equal(by('sammeln').weeks, 1);
  assert.equal(by('sammeln').perfect, 1);
  assert.equal(by('sammeln').have, 1, 'nur bekannte Karten zählen');
  assert.equal(by('team').rank, 1);
  assert.deepEqual(by('team').record, {S: 3, U: 1, N: 1});
  assert.equal(by('team').goalsFor, 154);
  assert.equal(by('fan').name, 'Hallen-Stammgast');
  assert.ok(recapTiles(full).length >= 4);
});

test('Ansicht: Balken, eine Karte, Tippflächen, Teilen auf der letzten Karte, Hinweis', () => {
  assert.deepEqual(parseRoute('#/rueckblick'), {area: null, view: 'rueckblick'});
  assert.equal(href.rueckblick(), '#/rueckblick');
  const doc = step => parseHTML('<html><body>' + String(renderRueckblick({state: {data}, now, ui: {rbStep: step}})) + '</body></html>').document;
  const first = doc(0);
  const n = first.querySelectorAll('.rb-bars i').length;
  assert.ok(n >= 3);
  assert.equal(first.querySelectorAll('.rb-bars i.on').length, 1);
  assert.ok(first.querySelector('[data-rb="next"]') && !first.querySelector('[data-rb="prev"]'));
  assert.equal(first.querySelector('.rb-close').getAttribute('href'), '#/ich');
  assert.match(first.querySelector('h1').textContent, /Deine/);
  const last = doc(99);
  assert.ok(last.querySelector('[data-rb-share]') && !last.querySelector('[data-rb="next"]'));
  assert.equal(last.querySelector('.rb-slide').getAttribute('data-rb-id'), 'fan');
  assert.ok(String(recapTeaser(games, now)).includes('#/rueckblick'));
  assert.equal(String(recapTeaser([...games, g('6', '2026-10-20', OWN, 'HSC Suhr Aarau')], now)), '', 'kein Hinweis vor Saisonende');
});
