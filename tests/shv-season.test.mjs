import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parsePlayerSeason} from '../server/shv.mjs';

const fixture = JSON.parse(fs.readFileSync('tests/fixtures/shv-player-season.json', 'utf8'));

test('QHL-Saisonimport übernimmt jeden gelieferten Spieler und alle vorhandenen Zähler vollständig', () => {
  const result = parsePlayerSeason(fixture);
  const source = fixture.data.playerStaff[0].player;
  assert.equal(result.teamGames, 9);
  assert.equal(Object.keys(result.players).length, source.length);
  assert.equal(source.reduce((sum, p) => sum + p.totalScore, 0), 307);
  for (const original of source) {
    const imported = Object.values(result.players).find(p => p.shvPlayerId === original.playerId);
    assert.ok(imported, 'Nicht zugeordnet: ' + original.playerId);
    for (const [key, sourceKey] of Object.entries({games:'games', goals:'totalScore', fieldGoals:'totalScoreField', sevenMeterGoals:'totalScore7m', yellowCards:'totalYellowCards', twoMinutes:'total2Minutes', disqualifications:'totalSuspension'}))
      assert.equal(imported[key], original[sourceKey], original.playerId + ': ' + key);
  }
  assert.deepEqual([result.players[6].goals, result.players[6].fieldGoals, result.players[6].sevenMeterGoals, result.players[6].goalsPerGame], [67,34,33,7.4]);
  assert.equal(result.players[12], undefined);
  assert.equal(result.players[13], undefined);
});

test('QHL-Saisonimport lehnt fehlende Tore, duplizierte Spieler und falsche Saison ab', () => {
  for (const mutate of [d => d.data.playerStaff[0].player.pop(), d => d.data.playerStaff[0].player.push(d.data.playerStaff[0].player[0]), d => {d.data.teamDashboard[0].seasonId=2025;}]) {
    const broken = structuredClone(fixture); mutate(broken);
    assert.throws(() => parsePlayerSeason(broken));
  }
});

test('QHL-Saisonimport nennt bei inkonsistenten Zählern Spieler und Zahlen', () => {
  const broken = structuredClone(fixture),
    p = broken.data.playerStaff[0].player[0];
  p.totalScoreField += 1;
  assert.throws(() => parsePlayerSeason(broken), e => e.message.includes('Spieler ' + p.playerId) && e.message.includes('Total ' + p.totalScore));
});

test('QHL-Saisonimport lehnt Spieler mit mehr Spielen als das Team ab und nennt sie', () => {
  const many = structuredClone(fixture),
    q = many.data.playerStaff[0].player[0];
  q.games = many.data.teamDashboard[0].gamesTotal + 1;
  assert.throws(() => parsePlayerSeason(many), e => e.message.includes('Spieler ' + q.playerId) && e.message.includes('Spiele'));
});

// Berichte im Format von parseArchivedReport: Kadetten (41473) gegen einen Gegner, Spieler mit Toren, 7 m und Strafen.
const report = (gameId, rows, home = true) => {
  const goals = rows.reduce((n, p) => n + p.goals, 0),
    own = {id: 41473, players: rows.map(p => ({warnings: 0, twoMinutes: 0, redCards: 0, seven: 0, ...p}))},
    other = {id: 99, players: [{id: 1, goals: 20, seven: 0, warnings: 0, twoMinutes: 0, redCards: 0}]};
  return {gameId, score: home ? [goals, 20] : [20, goals], teams: home ? [own, other] : [other, own]};
};

test('QHL-Saisonwerte aus Spielberichten: summiert nur gelieferte QHL-Spiele und prüft gegen das Teamtotal', async () => {
  const {aggregatePlayerSeason} = await import('../server/shv.mjs');
  const reports = [
    report(1, [{id: 341559, goals: 7, seven: 3, twoMinutes: 1}, {id: 261608, goals: 5}, {id: 999999, goals: 2}]),
    report(2, [{id: 341559, goals: 4, seven: 1, warnings: 1}, {id: 356818, goals: 0}], false)
  ];
  const season = aggregatePlayerSeason(reports, 2);
  assert.equal(season.basis, 'Bestätigte QHL-Spielberichte');
  assert.deepEqual(season.players[6], {shvPlayerId: 341559, games: 2, goals: 11, fieldGoals: 7, sevenMeterGoals: 4, goalsPerGame: 5.5, yellowCards: 1, twoMinutes: 1, disqualifications: 0});
  assert.equal(season.players[9].games, 1);
  assert.equal(season.players[1].goals, 0);
  // Kaderspieler ohne Einsatz erhalten keinen Datensatz (die App kennzeichnet fehlende Werte).
  assert.equal(season.players[2], undefined);
});

test('QHL-Saisonwerte aus Spielberichten: fehlender Bericht oder falsche Summe wird abgelehnt', async () => {
  const {aggregatePlayerSeason} = await import('../server/shv.mjs');
  const one = report(1, [{id: 341559, goals: 7}]);
  assert.throws(() => aggregatePlayerSeason([one], 2), /Incomplete QHL season reports: 1 Berichte, 2 Spiele/);
  assert.throws(() => aggregatePlayerSeason([one, one], 2), /Incomplete/);
  const wrong = structuredClone(one);
  wrong.score[0] += 1;
  assert.throws(() => aggregatePlayerSeason([wrong], 1), /QHL report totals mismatch: Spieler 7 Tore, Team 8/);
  assert.throws(() => aggregatePlayerSeason([{gameId: 3, score: [1, 2], teams: []}], 1), /Invalid QHL report scope/);
});

test('Spielerwerte im Lauf: Berichte ersetzen eine fehlerhafte SHV-Spielerliste, ein Fehler behält den alten Stand', async () => {
  const {seasonFromReports} = await import('../server/refresh-run.mjs');
  const stored = new Map([['kadetten/reports/508338.json', report(508338, [{id: 341559, goals: 9, seven: 2}])], ['kadetten/reports/508373.json', report(508373, [{id: 341559, goals: 3}], false)]]);
  const bucket = {get: async key => (stored.has(key) ? {json: async () => stored.get(key)} : null)};
  const base = () => ({
    checkedAt: '2026-11-12T11:20:57.481Z',
    games: [{id: '508338', league: 'QHL', score: [9, 20]}, {id: 'staefa', league: 'QHL', score: [20, 3]}, {id: '508999', league: 'QHL'}, {id: 'cup', league: 'Cup', score: [30, 20]}],
    playerSeason: {players: {6: {goals: 1}}},
    status: {players: {ok: false, updatedAt: '2026-10-31T20:20:56.535Z', error: 'SHV player totals mismatch'}}
  });
  const ok = await seasonFromReports(bucket, base());
  assert.deepEqual(ok.status.players, {ok: true, updatedAt: '2026-11-12T11:20:57.481Z'});
  assert.deepEqual([ok.playerSeason.teamGames, ok.playerSeason.players[6].games, ok.playerSeason.players[6].goals], [2, 2, 12]);
  const missing = base();
  missing.games.push({id: '508400', league: 'QHL', score: [30, 30]});
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  try {
    const kept = await seasonFromReports(bucket, missing);
    assert.equal(kept.status.players.ok, false);
    assert.equal(kept.status.players.updatedAt, '2026-10-31T20:20:56.535Z');
    assert.deepEqual(kept.playerSeason, {players: {6: {goals: 1}}});
  } finally {
    globalThis.fetch = original;
  }
});
