import test from 'node:test';
import assert from 'node:assert/strict';
import {niceName, qhlInputs} from '../server/qhl-report.mjs';
import {syncQhlReports, qhlKey} from '../scripts/lib/ehf-archive.mjs';
import worker from '../server/worker.mjs';

const player = (id, name, keeper, goals, shots, extra = {}) => ({
  id,
  name,
  keeper,
  goals,
  shots,
  seven: 0,
  sevenShots: 0,
  twoMinutes: 0,
  warnings: 0,
  redCards: 0,
  saves: null,
  keeperShots: null,
  ...extra
});
const ev = (id, seconds, score, home, away, extra = {}) => ({
  id,
  seconds,
  time: null,
  score,
  action: 'Tor',
  homePlayer: home,
  awayPlayer: away,
  homeAction: null,
  awayAction: null,
  ...extra
});
const report = {
  gameId: 508373,
  score: [3, 2],
  half: [2, 1],
  source: 'https://www.handball.ch/de/matchcenter/spiele/508373',
  events: [
    ev(5, 600, [1, 1], 'LUTZ Milan', null),
    ev(1, 60, [0, 1], null, 'MÜLLER Hans-Peter'),
    ev(3, 300, [1, 0], 'LUTZ Milan', null),
    ev(6, 900, [2, 1], 'MAROS Luka', null),
    ev(7, 1000, null, null, null, {action: 'Auszeit', awayAction: 'bTO'}),
    ev(8, 2400, [2, 2], null, 'MÜLLER Hans-Peter'),
    ev(9, 3000, [3, 2], 'MAROS Luka', null)
  ].sort((a, b) => b.seconds - a.seconds),
  teams: [
    {
      id: 41473,
      name: 'Kadetten Schaffhausen',
      shots: 8,
      throwPercentage: 60,
      turnovers: 5,
      seven: 1,
      sevenShots: 1,
      twoMinutes: 2,
      warnings: 0,
      players: [
        player(1, 'LUTZ Milan', false, 1, 3),
        player(2, 'MAROS Luka', false, 2, 4),
        player(3, 'BERGMANN Leon', true, 0, 0, {saves: 12, keeperShots: 14})
      ]
    },
    {
      id: 7,
      name: 'Handball Stäfa',
      shots: 9,
      throwPercentage: 50,
      turnovers: 6,
      seven: 0,
      sevenShots: 0,
      twoMinutes: 1,
      warnings: 0,
      players: [player(4, 'MÜLLER Hans-Peter', false, 2, 5), player(5, 'KEEPER Karl', true, 0, 0, {saves: 3, keeperShots: 6})]
    }
  ]
};

test('Namen aus dem SHV-Bericht: Familienname gross geschrieben wird zu «Vorname Name»', () => {
  assert.equal(niceName('LUTZ Milan'), 'Milan Lutz');
  assert.equal(niceName('RÍKHARÐSSON Odinn'), 'Odinn Ríkharðsson');
  assert.equal(niceName('MÜLLER Hans-Peter'), 'Hans-Peter Müller');
  assert.equal(niceName('Max Muster'), 'Max Muster');
});

test('QHL-Bericht: Torfolge aus Spielstandänderungen, Auszeit, Spieler- und Teamwerte', () => {
  const x = qhlInputs(report);
  // Das unplausible Ereignis 1:0 nach 0:1 (kein einzelnes Tor) wird übersprungen.
  assert.deepEqual(
    x.ticker.goals.map(g => [g.side, g.name, g.score.join(':')]),
    [
      ['away', 'Hans-Peter Müller', '0:1'],
      ['home', 'Milan Lutz', '1:1'],
      ['home', 'Luka Maros', '2:1'],
      ['away', 'Hans-Peter Müller', '2:2'],
      ['home', 'Luka Maros', '3:2']
    ]
  );
  assert.equal(x.ticker.timeouts.length, 1);
  assert.equal(x.ticker.timeouts[0].side, 'away');
  assert.deepEqual(x.ticker.timeouts[0].score, [2, 1]);
  assert.equal(x.ticker.suspensionsKnown, false);
  assert.deepEqual(x.ticker.halftime, [2, 1]);
  assert.equal(x.players.find(p => p.name === 'Leon Bergmann').goalkeeper, true);
  assert.equal(x.teamStats.home.efficiency, 60);
});

test('QHL-Bericht: Torzahl, die nicht zum Endstand passt, ergibt keine Eingaben', () => {
  assert.throws(() => qhlInputs({...report, events: report.events.slice(1)}), /does not match/);
  assert.throws(() => qhlInputs({...report, events: undefined}), /does not match/);
});

const memory = () => {
  const m = new Map();
  return {
    m,
    get: async k => (m.has(k) ? {json: async () => JSON.parse(m.get(k))} : null),
    put: async (k, v) => {
      m.set(k, v);
    }
  };
};
const game = {id: 'staefa', league: 'QHL', home: 'Kadetten Schaffhausen', away: 'Handball Stäfa', date: '2026-10-03', score: [3, 2]};
test('QHL-Matchbericht: sachlich aus dem gesicherten Spielbericht, gespeichert, nur lesend ausgeliefert, danach fertig', async () => {
  const bucket = memory();
  bucket.m.set('kadetten/reports/508373.json', JSON.stringify(report));
  const out = await syncQhlReports(bucket, {games: [game, {...game, id: 'x1', league: 'EHL'}]});
  assert.equal(out.written, 1);
  assert.equal(out.reports, 1);
  const rec = JSON.parse(bucket.m.get(qhlKey('staefa')));
  assert.equal(rec.report.generator, 'daten');
  assert.ok(rec.report.paragraphs.length >= 2);
  assert.equal(rec.ticker, undefined);
  assert.equal(rec.players, undefined);
  assert.equal(rec.goals.length, 5);
  assert.deepEqual(rec.goals[0], {t: '1:00', s: [0, 1], h: false, n: 'Hans-Peter Müller', p: false});
  const res = await worker.fetch(new Request('https://app.test/api/match-reports/staefa'), {BUCKET: bucket});
  assert.equal(res.status, 200);
  assert.match((await res.json()).report.report.headline, /3:2/);
  assert.equal((await worker.fetch(new Request('https://app.test/api/match-reports/none'), {BUCKET: bucket})).status, 404);
  assert.equal(
    (await worker.fetch(new Request('https://app.test/api/match-reports/staefa', {method: 'POST'}), {BUCKET: bucket})).status,
    405
  );
  const again = await syncQhlReports(bucket, {games: [game]});
  assert.equal(again.kept, 1);
  assert.equal(again.written, 0);
});

test('QHL-Matchbericht: fehlender Spielbericht und falscher Endstand ergeben keinen Bericht', async () => {
  const bucket = memory();
  const none = await syncQhlReports(bucket, {games: [game]});
  assert.equal(none.written, 0);
  assert.match(none.notes[0], /kein gesicherter Spielbericht/);
  bucket.m.set('kadetten/reports/508373.json', JSON.stringify({...report, score: [9, 9]}));
  assert.match((await syncQhlReports(bucket, {games: [game]})).notes[0], /passt nicht zum Endstand/);
  bucket.m.set('kadetten/reports/508373.json', JSON.stringify(report));
  const ok = await syncQhlReports(bucket, {games: [game]});
  assert.equal(ok.reports, 1);
  const rec = JSON.parse(bucket.m.get(qhlKey('staefa')));
  assert.equal(rec.report.generator, 'daten');
  assert.equal(rec.ticker, undefined, 'Rohereignisse entfallen nach dem Bericht');
});
