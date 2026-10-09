import test from 'node:test';
import assert from 'node:assert/strict';
import {ehlPlayersUrl, parseEhlPlayerSeason, refreshEhlPlayerSeason} from '../scripts/lib/ehl-player-season.mjs';

const ids = ['rIxC4ihkwRtn6YB2UXib0g', '1QMPSPgkwcOk72rTUSovvQ', 'lelfK_YYz8qfS36V-uWSRQ', 'DnKQumPZ2gFW4e65HJCChg', 'vTbkruUenUPCLKU-ejA4bA', 'wNaT9gJs5vjKpcWOs3LOgA', '3sGTZLro8ezY8Vp3S4gTxQ', 'h7d7SKRgIKRo4KquOjWkbA', 'Dmn7_Z3ZD-6YGuEMjxFlbw', 'vHCfSNWPrjGnNkLVLY5lWg'];
const player = (id, goals = 0) => ({id, shirtNumber: '99', person: {firstName: 'Test', lastName: 'Player'}, score: {goals, warningsCount: 1, twoMinPenaltiesCount: 2, redCardsCount: 0, shots: 0, goalsPercentage: 0, goalkeeperSaves: 0}});
const data = () => ({players: ids.map((id, i) => player(id, i === 0 ? 23 : 1)), goalKeepers: [player('hgA1rufJkxawfEgkIVgW_w')], playersLeft: []});
const page = '<div id="vue-container-clubDetails" data-club-id="uyEpUicNjwv8hCX9B7A3sg" data-club-details-url="/umbraco/api/clubdetailsapi/Players" data-competition-id="current-season" data-round-id="group-phase" data-content-id="138796" data-culture="en-US"></div>';

test('EHF-Spielerwerte: stabile Personen-ID statt Rückennummer; verfügbare Zähler, keine scheinbaren Null-Quoten', () => {
  const next = parseEhlPlayerSeason(data(), {hadResults: true});
  assert.equal(next.players[6].goals, 23);
  assert.equal(next.players[6].twoMinutes, 2);
  assert.equal(next.players[6].yellowCards, 1);
  assert.equal(next.players[99], undefined);
  assert.equal(next.players[6].shots, undefined);
  assert.equal(next.players[1].saves, undefined);
  const url = ehlPlayersUrl(page);
  assert.equal(url.searchParams.get('roundId'), 'group-phase');
  assert.equal(url.searchParams.get('competitionId'), 'current-season');
});

test('EHF-Spielerwerte: leere, doppelte, unvollständige und vollständig genullte Antworten werden abgelehnt', () => {
  assert.throws(() => parseEhlPlayerSeason({players: [], goalKeepers: []}));
  const duplicate = data(); duplicate.players.push(duplicate.players[0]);
  assert.throws(() => parseEhlPlayerSeason(duplicate));
  const missing = data(); delete missing.players[0].score.goals;
  assert.throws(() => parseEhlPlayerSeason(missing));
  const zeros = data(); for (const p of zeros.players) p.score.goals = 0;
  assert.throws(() => parseEhlPlayerSeason(zeros, {hadResults: true}));
  assert.throws(() => ehlPlayersUrl(page.replace('uyEpUicNjwv8hCX9B7A3sg', 'foreign-team')));
});

test('EHF-Spielerimport: Seite und API werden gelesen; Quellenfehler erhalten Werte und Zeitstempel', async () => {
  const snapshot = {games: [{league: 'EHL', score: [39, 32]}]};
  const calls = [];
  const good = await refreshEhlPlayerSeason(snapshot, {now: new Date('2026-10-09T12:00:00Z'), fetchFn: async url => {
    calls.push(url); return new Response(url.includes('/clubdetailsapi/') ? JSON.stringify(data()) : page);
  }});
  assert.equal(calls.length, 2); assert.equal(good.ok, true);
  const failed = await refreshEhlPlayerSeason({...snapshot, ehlPlayerSeason: good}, {fetchFn: async () => {throw Error('offline');}});
  assert.equal(failed.ok, false); assert.deepEqual(failed.players, good.players); assert.equal(failed.checkedAt, good.checkedAt);
});
