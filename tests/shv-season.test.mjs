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
