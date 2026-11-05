import test from 'node:test';
import assert from 'node:assert/strict';
import {kickoff, zurichParts, outcome, nextGame, lastResult, form, jetztState, standings, countdown, dayLabel, initials, shortTeam} from '../src/kadetten/js/logic.js';

const K = 'Kadetten Schaffhausen';
const g = (id, date, time, home, away, score) => ({id, date, time, home, away, league: 'QHL', venue: 'BBC Arena, Schaffhausen', ...(score ? {score} : {})});
const games = [
  g('1', '2026-10-03', '18:00', 'RTV 1879 Basel', K, [27, 32]),
  g('2', '2026-10-14', '18:45', K, 'GC Amicitia Zürich', [30, 30]),
  g('3', '2026-10-24', '18:00', K, 'GC Amicitia Zürich'),
  g('4', '2026-11-11', '19:15', K, 'HSC Suhr Aarau'),
  g('5', '2026-11-12', '19:15', 'BSV Bern', 'Wacker Thun')
];
const at = iso => Date.parse(iso);

test('Anpfiff in Zürcher Zeit, auch über die Zeitumstellung', () => {
  assert.equal(kickoff(games[2]), at('2026-10-24T16:00:00Z')); // Sommerzeit
  assert.equal(kickoff(games[3]), at('2026-11-11T18:15:00Z')); // Winterzeit
  assert.equal(kickoff({date: '2026-10-25', time: '02:30'}) !== null, true);
  assert.equal(kickoff({date: '2026-10-24'}), null);
  assert.deepEqual(zurichParts(at('2026-10-24T22:30:00Z')).date, '2026-10-25');
});

test('Ergebnis aus Sicht der Kadetten, fehlende Resultate bleiben leer', () => {
  assert.equal(outcome(games[0]), 'S');
  assert.equal(outcome(games[1]), 'U');
  assert.equal(outcome({...games[1], score: [29, 31]}), 'N');
  assert.equal(outcome(games[2]), null);
  assert.equal(outcome({...games[1], score: [null, 3]}), null);
  assert.equal(outcome(games[4]), null);
});

test('Nächstes Spiel, letztes Resultat und Form', () => {
  const now = at('2026-10-20T10:00:00Z');
  assert.equal(nextGame(games, now).id, '3');
  assert.equal(lastResult(games, now).id, '2');
  assert.deepEqual(form(games), ['U', 'S']);
});

test('Jetzt: Alltag, Spieltag, Live und Nachspiel', () => {
  assert.equal(jetztState({games, now: at('2026-10-20T10:00:00Z')}).state, 'alltag');
  const spieltag = jetztState({games, now: at('2026-10-24T12:30:00Z')});
  assert.deepEqual([spieltag.state, spieltag.game.id], ['spieltag', '3']);
  const liveMatch = {id: 99, home: K, away: 'GC Amicitia Zürich', score: [24, 21], phase: '2. Halbzeit', clock: '47:12'};
  assert.equal(jetztState({games, live: {match: liveMatch}, now: at('2026-10-24T17:00:00Z')}).state, 'live');
  // Fremdes Live-Spiel zählt nicht.
  assert.equal(jetztState({games, live: {match: {...liveMatch, home: 'BSV Bern', away: 'Wacker Thun'}}, now: at('2026-10-24T12:30:00Z')}).state, 'spieltag');
  const scored = games.map(x => x.id === '3' ? {...x, score: [33, 27]} : x);
  const after = jetztState({games: scored, now: at('2026-10-25T09:00:00Z')});
  assert.deepEqual([after.state, after.game.id], ['nachspiel', '3']);
  assert.equal(jetztState({games: scored, now: at('2026-10-27T09:00:00Z')}).state, 'alltag');
  // Bestätigtes Endresultat aus /api/live ergänzt den älteren Datenstand.
  const finished = jetztState({games, live: {match: null, finished: {...liveMatch, score: [33, 27], status: 'finished', date: '2026-10-24'}}, now: at('2026-10-24T19:00:00Z')});
  assert.deepEqual([finished.state, finished.game.score], ['nachspiel', [33, 27]]);
});

test('Tabelle, Countdown und Datumsangaben', () => {
  const rows = standings([['HC Kriens-Luzern', 7, 259, 213, 14], [K, 8, 262, 232, 13], ['kaputt']]);
  assert.deepEqual(rows[1], {rank: 2, team: K, played: 8, goalsFor: 262, goalsAgainst: 232, points: 13});
  assert.equal(standings([[K, 8, 262, 232, undefined]])[0].points, null);
  assert.equal(countdown(at('2026-10-24T16:00:00Z'), at('2026-10-24T12:30:00Z')), 'noch 3:30 h');
  assert.equal(countdown(at('2026-11-11T18:15:00Z'), at('2026-11-05T10:00:00Z')), 'in 6 Tagen');
  assert.equal(dayLabel(games[2], at('2026-10-24T08:00:00Z')), 'Heute');
  assert.equal(dayLabel(games[3], at('2026-11-05T08:00:00Z')), 'Mi 11.11.');
  assert.equal(shortTeam('GC Amicitia Zürich'), 'GC Amicitia');
  assert.equal(initials('HSC Suhr Aarau'), 'SA');
});
