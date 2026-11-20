import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SEASON} from '../src/kadetten/js/season.js';
import {PRIOR} from '../src/kadetten/data/gewinnscore.js';
import {SEASON_ID, SEASON_LABEL, SEASON_YEARS, EHF_SEASON_PATH, EHF_MATCH_ID_PREFIX, PREVIOUS_SEASON_IDS} from '../server/season.mjs';

test('Saison: App und Datendienst nennen dieselbe Saison, die Werte passen zueinander', () => {
  assert.equal(SEASON, SEASON_LABEL, 'App und Datendienst gleich');
  const [from, to] = SEASON.split('/').map(Number);
  assert.equal(SEASON_ID, from, 'SHV-seasonId = Startjahr');
  assert.deepEqual(SEASON_YEARS, [from, from + 1]);
  assert.equal(EHF_SEASON_PATH, `${from}-${String(to).padStart(2, '0')}`);
  assert.match(EHF_MATCH_ID_PREFIX, new RegExp('^' + (from + 1)), 'EHF-Spiel-IDs beginnen mit dem Endjahr der Saison');
  assert.deepEqual(PREVIOUS_SEASON_IDS, [from - 1, from - 2]);
});

test('Gewinnscore: Vorsaison-Werte sind Zahlen und enthalten die Kadetten', () => {
  assert.ok('Kadetten Schaffhausen' in PRIOR);
  for (const [team, value] of Object.entries(PRIOR)) assert.ok(Number.isFinite(value), team);
});
