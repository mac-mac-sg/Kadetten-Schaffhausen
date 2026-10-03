import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Lädt js/logic.js in einer leeren Umgebung mit festgelegter Uhrzeit.
function logic(nowIso, games = []) {
  const NOW = Date.parse(nowIso);
  class FixedDate extends Date {
    constructor(...args) {
      args.length ? super(...args) : super(NOW);
    }
    static now() {
      return NOW;
    }
  }
  const context = {Date: FixedDate, Intl, games, liveState: null, offlineData: false, navigator: {onLine: true}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/client/js/logic.js', 'utf8'), context);
  return context;
}
const game = (date, time, extra = {}) => ({
  id: date + time,
  date,
  time,
  home: 'Kadetten Schaffhausen',
  away: 'Handball Stäfa',
  league: 'QHL',
  ...extra
});

test('Spieltag wird nach Zürcher Zeit bestimmt, nicht nach UTC', () => {
  assert.equal(logic('2026-10-03T12:00:00Z').swissToday(), '2026-10-03');
  // 22:30 UTC ist in Zürich (Sommerzeit) schon 00:30 des Folgetags
  assert.equal(logic('2026-10-03T22:30:00Z').swissToday(), '2026-10-04');
});

test('Anpfiffzeit berücksichtigt Sommer- und Winterzeit', () => {
  const l = logic('2026-10-03T12:00:00Z');
  assert.equal(l.kickoffAt(game('2026-10-03', '18:00')).toISOString(), '2026-10-03T16:00:00.000Z');
  assert.equal(l.kickoffAt(game('2026-12-05', '18:00')).toISOString(), '2026-12-05T17:00:00.000Z');
  assert.equal(l.kickoffAt(game('2026-10-03', undefined)), null);
});

test('Countdown zeigt Minuten, Stunden und die Zustände nach dem Anpfiff', () => {
  const g = game('2026-10-03', '18:00'); // 16:00 UTC
  const at = iso => logic(iso).countdownText(g, new Date(iso));
  assert.equal(at('2026-10-03T15:29:55Z'), 'Anpfiff in 30:05');
  assert.equal(at('2026-10-03T14:00:00Z'), 'Anpfiff in 02:00:00');
  assert.equal(at('2026-10-03T16:00:01Z'), 'Anspielzeit erreicht · Live-Status wird geprüft');
  assert.equal(logic('2026-10-03T12:00:00Z').countdownText(game('2026-10-03', undefined)), 'Anspielzeit noch offen');
  const offline = logic('2026-10-03T12:00:00Z');
  offline.offlineData = true;
  assert.equal(offline.countdownText(g, new Date('2026-10-03T16:30:00Z')), 'Live-Status offline nicht verfügbar');
});

test('Countdown wird nur in der letzten Stunde vor dem Anpfiff "bald"', () => {
  const g = game('2026-10-03', '18:00');
  const l = logic('2026-10-03T12:00:00Z');
  assert.equal(l.countdownSoon(g, new Date('2026-10-03T15:01:00Z')), true);
  assert.equal(l.countdownSoon(g, new Date('2026-10-03T14:59:00Z')), false);
  assert.equal(l.countdownSoon(g, new Date('2026-10-03T16:00:01Z')), false);
  assert.equal(l.countdownSoon(game('2026-10-03', undefined), new Date('2026-10-03T15:30:00Z')), false);
});

test('Heutige Spiele: nur QHL und EHL, nach Anspielzeit sortiert', () => {
  const l = logic('2026-10-03T08:00:00Z', [
    game('2026-10-03', '20:00'),
    game('2026-10-03', '18:00'),
    game('2026-10-03', '19:00', {league: 'Test'}),
    game('2026-10-04', '18:00')
  ]);
  assert.deepEqual(
    l.todayGames().map(g => g.time),
    ['18:00', '20:00']
  );
});

test('Startseiten-Spiel: erst ein offenes heutiges Spiel, sonst das nächste', () => {
  const played = game('2026-10-03', '14:00', {score: [30, 20]});
  const open = game('2026-10-03', '18:00');
  const next = game('2026-10-17', '18:00');
  assert.equal(logic('2026-10-03T08:00:00Z', [played, open, next]).homeFixture().game, open);
  assert.equal(logic('2026-10-03T18:00:00Z', [played, next]).homeFixture().game, played);
  assert.equal(logic('2026-10-10T08:00:00Z', [played, next]).homeFixture().game, next);
  assert.equal(logic('2026-12-01T08:00:00Z', [played, next]).nextPreviewGame(), null);
});

test('Ergebnis aus Sicht der Kadetten, auch auswärts und mit "TSV"-Präfix', () => {
  const l = logic('2026-10-03T12:00:00Z');
  const home = l.teamResult({home: 'Kadetten Schaffhausen', away: 'X', score: [30, 20]}, 'Kadetten Schaffhausen');
  assert.deepEqual({...home}, {state: 'win', short: 'S', label: 'Sieg', for: 30, against: 20});
  const away = l.teamResult({home: 'X', away: 'Kadetten Schaffhausen', score: [30, 20]}, 'Kadetten Schaffhausen');
  assert.equal(away.state, 'loss');
  assert.equal(away.label, 'Niederlage');
  assert.equal(l.teamResult({home: 'X', away: 'Kadetten Schaffhausen', score: [25, 25]}, 'Kadetten Schaffhausen').state, 'draw');
  assert.equal(l.teamName('TSV St. Otmar St. Gallen'), 'St. Otmar St. Gallen');
});

test('Relative Tagesangabe: Morgen, Übermorgen, in N Tagen', () => {
  const l = logic('2026-10-03T12:00:00Z');
  assert.equal(l.relativeDay('2026-10-03'), '');
  assert.equal(l.relativeDay('2026-10-04'), 'Morgen');
  assert.equal(l.relativeDay('2026-10-05'), 'Übermorgen');
  assert.equal(l.relativeDay('2026-10-08'), 'in 5 Tagen');
  assert.equal(l.relativeDay('2026-10-02'), '');
  assert.equal(l.relativeDay('2027-01-01'), '');
  // kurz nach Mitternacht in Zürich zählt schon der neue Tag
  assert.equal(l.relativeDay('2026-10-05', new Date('2026-10-03T22:30:00Z')), 'Morgen');
});
