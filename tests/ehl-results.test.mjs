import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEhlClubs, parseEhlResults, refreshEhlResults} from '../scripts/lib/ehl-results.mjs';

const names = ['Kadetten Schaffhausen', 'Chambéry', 'HC Izvidac', 'CSM Bucuresti'];
const row = (id, date, home, away, a = '', b = '') => `<a class="table-row table-row--results" href="/men/2026-27/matches/details/${id}/Teams/"><span class="date">${date}</span><div class="team-block--first"><span class="name">${home}</span><span class="score">${a}</span></div><div class="team-block--second"><span class="name">${away}</span><span class="score">${b}</span></div></a>`;
const results = `<div id="content_current_season">${row('202711020901028', 'Tue Oct 13, 2026', 'Chambery Savoie Mont Blanc Handball', names[0])}${row('202711020901030', 'Tue Oct 06, 2026', names[3], 'Chambery Savoie Mont Blanc Handball', 25, 33)}${row('202711020901025', 'Tue Sep 29, 2026', names[2], 'Chambery Savoie Mont Blanc Handball', 34, 33)}</div>${row('202411020902080', 'Tue Dec 05, 2023', names[3], names[1], 36, 33)}`;
const clubs = `<a class="tg-item" href="/men/2026-27/clubs/details/zh6zSrhwVj2qcyJfotLxjw/ChamberySavoieMontBlancHandball/"><span class="tg-name">Chambery Savoie Mont Blanc Handball</span></a>`;

test('EHL: Chambéry erhält nur publizierte Resultate der laufenden Saison, normalisiert und neueste zuerst', () => {
  const games = parseEhlResults(results, names[1], names, '2026-10-09');
  assert.deepEqual(games.map(g => [g.date, g.home, g.away, g.score]), [['2026-10-06', names[3], names[1], [25, 33]], ['2026-09-29', names[2], names[1], [34, 33]]]);
  assert.ok(games.every(g => g.externalUrl.startsWith('https://ehfel.eurohandball.com/men/2026-27/matches/details/')));
  assert.equal(parseEhlClubs(clubs).size, 1);
  assert.deepEqual(parseEhlResults(results, names[1], names, '2026-09-29'), []);
});

test('EHL: fehlende Seite, fremdes Team und unvollständige Resultate werden abgelehnt', () => {
  assert.throws(() => parseEhlResults('', names[1], names, '2026-10-09'));
  assert.throws(() => parseEhlResults(results, 'Anderer Verein', names, '2026-10-09'));
  assert.throws(() => parseEhlResults(results.replace('<span class="score">25</span>', '<span class="score"></span>'), names[1], names, '2026-10-09'));
});

test('EHL-Import: erfolgreiche Gegner werden ergänzt, fehlgeschlagene Quellen behalten Resultate und Zeitstempel', async () => {
  const saved = {ok: true, checkedAt: '2026-10-08T10:00:00Z', games: [{id: 'ehf-old', score: [30, 25]}]};
  const snapshot = {games: [{league: 'EHL', home: names[0], away: names[1]}], ehlRecentGames: {[names[0]]: saved}};
  const fetchFn = async url => new Response(url.endsWith('/clubs/') ? clubs : results);
  const next = await refreshEhlResults(snapshot, {fetchFn, now: new Date('2026-10-09T11:00:00Z')});
  assert.equal(next[names[1]].ok, true);
  assert.equal(next[names[1]].games.length, 2);
  assert.equal(next[names[0]].ok, false);
  assert.deepEqual(next[names[0]].games, saved.games);
  assert.equal(next[names[0]].checkedAt, saved.checkedAt);
  assert.equal(snapshot.ehlRecentGames[names[0]].ok, true);
  const failed = await refreshEhlResults(snapshot, {fetchFn: async () => {throw Error('offline');}});
  assert.deepEqual(failed[names[0]].games, saved.games);
});
