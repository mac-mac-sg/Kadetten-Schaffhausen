import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPreview, tableFor} from '../server/preview-text.mjs';
import {syncPreviews as sync} from '../scripts/lib/preview-sync.mjs';
import {collectFacts} from '../scripts/lib/preview-facts.mjs';
import {previews, fixtureKey, validPreview} from '../server/previews.mjs';

const NOW = new Date('2026-10-06T11:00:00Z');
// Die Gültigkeitsprüfung des Datendienstes vergleicht mit der Uhr; sie wird auf den angenommenen Zeitpunkt gesetzt.
async function syncPreviews(bucket, data, opts) {
  const real = Date.now;
  Date.now = () => opts.now.getTime();
  try {
    return await sync(bucket, data, opts);
  } finally {
    Date.now = real;
  }
}
const kGame = {
  id: 'staefa',
  date: '2026-10-10',
  time: '18:00',
  home: 'Kadetten Schaffhausen',
  away: 'Handball Stäfa',
  league: 'QHL',
  venue: 'Schaffhausen BBC Arena A, Schaffhausen',
  url: 'https://kadettensh.ch/matchcenter/'
};
const table = {
  QHL: [
    ['HC Kriens-Luzern', 7, 259, 213, 14],
    ['Kadetten Schaffhausen', 8, 262, 232, 13],
    ['Handball Stäfa', 7, 184, 255, 0]
  ]
};
const snapshot = {games: [{id: 'alt', date: '2026-08-01', home: 'A', away: 'B', league: 'QHL', score: [1, 2]}, kGame], tables: table};
const duel = {
  id: '9',
  date: '2026-03-14',
  home: 'Handball Stäfa',
  away: 'Kadetten Schaffhausen',
  score: [27, 31],
  externalUrl: 'https://www.handball.ch/de/matchcenter/spiele/9'
};
const fGame = {
  id: '458',
  home: 'FC St.Gallen 1879',
  away: 'FC Lausanne-Sport',
  league: 'Brack Super League',
  date: '2026-10-11',
  time: '16:30',
  confirmed: true,
  status: 'NOT STARTED',
  venue: 'Berit Sitterstadion',
  url: 'https://www.fcsg.ch/pages/match-center/458'
};
const fcsg = {
  games: [fGame],
  table: [
    {rank: 1, name: 'FC St. Gallen', played: 9, gf: 20, ga: 10, points: 18},
    {rank: 4, name: 'FC Lausanne-Sport', played: 9, gf: 15, ga: 14, points: 12}
  ]
};

function memBucket(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    map,
    writes: [],
    async get(k) {
      return map.has(k) ? {json: async () => JSON.parse(map.get(k))} : null;
    },
    async put(k, v) {
      this.writes.push(k);
      map.set(k, v);
    }
  };
}

test('Vorschau-Text: nur bestätigte Angaben, keine Siege/Niederlagen-Zähler, letztes Direktduell, gültig nach den Regeln des Datendienstes', () => {
  const p = buildPreview({club: 'kadetten', game: kGame, table: table.QHL, duel, now: NOW});
  assert.equal(p.headline, 'Kadetten Schaffhausen gegen Handball Stäfa');
  assert.equal(p.paragraphs.length, 3);
  assert.equal(
    p.paragraphs[0],
    'Kadetten Schaffhausen empfängt Handball Stäfa (QHL), Samstag, 10. Oktober 2026, 18:00 Uhr in Schaffhausen BBC Arena A, Schaffhausen.'
  );
  assert.match(
    p.paragraphs[1],
    /Kadetten Schaffhausen auf dem 2\. Rang \(13 Punkte aus 8 Spielen, Torverhältnis 262:232\), Handball Stäfa auf dem 3\. Rang \(0 Punkte aus 7 Spielen, Torverhältnis 184:255\)/
  );
  assert.equal(p.paragraphs[2], 'Das letzte Direktduell (14.03.2026, Handball Stäfa – Kadetten Schaffhausen) endete 27:31.');
  assert.doesNotMatch(p.paragraphs.join(' '), /Siege|Niederlagen|Unentschieden/);
  assert.deepEqual(
    p.sources.map(s => s.url),
    ['https://kadettensh.ch/matchcenter/', duel.externalUrl]
  );
  assert.equal(p.fixtureKey, fixtureKey(kGame));
  assert.equal(validPreview({...p, generatedAt: new Date().toISOString()}), true);
});

test('Vorschau-Text: fehlende Angaben entfallen, ohne genug Daten gibt es keine Vorschau, Tabelle nur im passenden Wettbewerb', () => {
  const noTable = buildPreview({club: 'kadetten', game: kGame, table: null, duel: null, now: NOW});
  assert.equal(noTable, null, 'nur Spielangaben genügen nicht');
  const dueOnly = buildPreview({club: 'kadetten', game: kGame, table: null, duel, now: NOW});
  assert.equal(dueOnly.paragraphs.length, 2);
  const unconfirmed = buildPreview({club: 'fcsg', game: {...fGame, confirmed: false}, table: fcsg.table, now: NOW});
  assert.match(unconfirmed.paragraphs[0], /Anspielzeit noch nicht bestätigt/);
  assert.doesNotMatch(unconfirmed.paragraphs[0], /16:30/);
  assert.equal(
    tableFor('fcsg', {...fGame, league: 'Schweizer Cup'}, snapshot, fcsg),
    null,
    'Cup-Spiele werden nicht mit der Liga-Tabelle verglichen'
  );
  assert.equal(tableFor('kadetten', {...kGame, league: 'EHL'}, snapshot, fcsg), null, 'unbekannter Wettbewerb ohne Tabelle');
  const f = buildPreview({club: 'fcsg', game: fGame, table: tableFor('fcsg', fGame, snapshot, fcsg), now: NOW});
  assert.match(
    f.paragraphs[1],
    /FC St\.Gallen 1879 auf dem 1\. Rang \(18 Punkte aus 9 Spielen, Torverhältnis 20:10\), FC Lausanne-Sport auf dem 2\. Rang/
  );
  assert.equal(f.sources[0].url, fGame.url);
});

test('Vorschauen schreiben: nächste Spiele beider Vereine, öffentlich lesbar über den Datendienst, unverändert nicht neu geschrieben', async () => {
  const bucket = memBucket({'kadetten/current.json': snapshot, 'fcsg/current.json': fcsg});
  const headToHead = async () => ({games: [duel]});
  const first = await syncPreviews(bucket, {snapshot, fcsgData: fcsg}, {headToHead, now: NOW});
  assert.deepEqual([first.written, first.unchanged, first.errors], [2, 0, 0]);
  assert.deepEqual(bucket.writes.sort(), ['previews/fcsg/458.json', 'previews/kadetten/staefa.json']);
  const env = {BUCKET: bucket};
  const real = Date.now;
  Date.now = () => NOW.getTime() + 60000;
  try {
    const r = await previews(new Request('https://x.test/api/previews/kadetten/staefa'), env);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray((await r.json()).paragraphs));
    assert.equal(
      (await previews(new Request('https://x.test/api/previews/fcsg/458'), env)).status,
      400,
      'FC St. Gallen wird nicht mehr ausgeliefert'
    );
  } finally {
    Date.now = real;
  }
  const again = await syncPreviews(bucket, {snapshot, fcsgData: fcsg}, {headToHead, now: new Date(NOW.getTime() + 3 * 3600000)});
  assert.deepEqual([again.written, again.unchanged], [0, 2]);
  assert.equal(bucket.writes.length, 2, 'keine weiteren Schreibzugriffe');
  const later = await syncPreviews(bucket, {snapshot, fcsgData: fcsg}, {headToHead, now: new Date(NOW.getTime() + 13 * 3600000)});
  assert.equal(later.written, 2, 'nach 12 Stunden wird der Zeitstempel erneuert, damit die Vorschau sichtbar bleibt');
});

test('Vorschauen schreiben: gültige bestehende Vorschau anderer Herkunft bleibt, veraltete wird ersetzt, Fehler bei Direktduell und Schreibfehler stören nicht', async () => {
  const ai = {
    club: 'kadetten',
    id: 'staefa',
    fixtureKey: fixtureKey(kGame),
    headline: 'Von ChatGPT',
    paragraphs: ['a'.repeat(40), 'b'.repeat(40)],
    sources: [{label: 'Q', url: 'https://kadettensh.ch/'}],
    generatedAt: new Date(NOW.getTime() - 3600000).toISOString()
  };
  const bucket = memBucket({'previews/kadetten/staefa.json': ai});
  const r = await syncPreviews(
    bucket,
    {snapshot, fcsgData: {games: []}},
    {
      headToHead: async () => {
        throw Error('Quelle weg');
      },
      now: NOW
    }
  );
  assert.equal(r.kept, 1);
  assert.equal(bucket.writes.length, 0, 'bestehende Vorschau bleibt unberührt');

  const stale = memBucket({'previews/kadetten/staefa.json': {...ai, fixtureKey: 'alt'}});
  const s = await syncPreviews(
    stale,
    {snapshot, fcsgData: {games: []}},
    {
      headToHead: async () => {
        throw Error('Quelle weg');
      },
      now: NOW
    }
  );
  assert.equal(s.written, 1, 'ohne Direktduell reicht die Tabelle; Fehler der Duell-Quelle stört nicht');
  assert.equal(JSON.parse(stale.map.get('previews/kadetten/staefa.json')).generator, 'daten');

  const broken = memBucket();
  broken.put = async () => {
    throw Error('KV');
  };
  const e = await syncPreviews(broken, {snapshot, fcsgData: fcsg}, {now: NOW});
  assert.equal(e.errors, 2);
});

const fcsgTable = [...Array(4)]
  .map((_, i) => ({name: 'FC T' + i, played: 9, gf: 20, ga: 10, points: 30 - i}))
  .concat([{name: 'FC St. Gallen', played: 9, gf: 16, ga: 19, points: 13}]);
const fcsg2 = {games: [fGame], table: [...fcsgTable, {name: 'FC Lausanne-Sport', played: 9, gf: 7, ga: 15, points: 6}]};

test('Eine bestehende Vorschau mit KI-Kennzeichnung wird durch den sachlichen Text ersetzt', async () => {
  const bucket = memBucket();
  const headToHead = async () => ({games: [duel]});
  await syncPreviews(bucket, {snapshot, fcsgData: fcsg2}, {headToHead, now: NOW});
  const path = 'previews/kadetten/staefa.json';
  const old = JSON.parse(bucket.map.get(path));
  assert.equal(old.generator, 'daten');
  bucket.map.set(
    path,
    JSON.stringify({
      ...old,
      generator: 'ki',
      paragraphs: [
        'Text einer KI, der genug Zeichen für die Prüfung hat und nicht mehr gebraucht wird.',
        'Zweiter Absatz mit genug Zeichen für die technische Prüfung der Absätze.'
      ]
    })
  );
  const r = await syncPreviews(bucket, {snapshot, fcsgData: fcsg2}, {headToHead, now: new Date(NOW.getTime() + 3600000)});
  assert.ok(r.written >= 1);
  assert.equal(JSON.parse(bucket.map.get(path)).generator, 'daten', 'KI-Text ist ersetzt');
});

test('Fakten: letzte Resultate des eigenen Teams aus dem Datenstand, des QHL-Gegners aus der SHV-Quelle, Direktduelle; Fehler und fehlende Quellen lassen Angaben weg', async () => {
  const played = (id, date, home, away, score) => ({id, date, home, away, score, league: 'QHL'});
  const snap = {
    tables: {QHL: table},
    games: [
      played('a', '2026-09-01', 'Kadetten Schaffhausen', 'A', [30, 20]),
      played('b', '2026-09-08', 'B', 'Kadetten Schaffhausen', [25, 28]),
      played('c', '2026-09-15', 'Kadetten Schaffhausen', 'C', [31, 31]),
      played('d', '2026-09-22', 'D', 'Kadetten Schaffhausen', [20, 27]),
      {id: 'offen', date: '2026-09-29', home: 'Kadetten Schaffhausen', away: 'E', league: 'QHL'},
      kGame
    ]
  };
  const recentGames = async team => ({
    games: [
      played('x', '2026-10-01', team, 'Z', [22, 21]),
      played('y', '2026-09-20', 'Y', team, [18, 19]),
      played('spaeter', '2026-10-20', team, 'Q', [1, 2])
    ]
  });
  const f = await collectFacts(
    'kadetten',
    kGame,
    {snapshot: snap, fcsgData: fcsg},
    {headToHead: async () => ({games: [duel, duel, duel, duel]}), recentGames}
  );
  assert.deepEqual(
    f.recent[0].games.map(x => x.id ?? x.date),
    ['2026-09-22', '2026-09-15', '2026-09-08'],
    'drei neueste abgeschlossene, ohne offene und spätere'
  );
  assert.equal(f.recent[1].team, 'Handball Stäfa');
  assert.deepEqual(
    f.recent[1].games.map(x => x.date),
    ['2026-10-01', '2026-09-20'],
    'Resultate nach dem Spieltag werden ignoriert'
  );
  assert.equal(f.recent[1].shv, true);
  assert.equal(f.duels.length, 3);
  assert.equal(f.table, table);

  const ehl = await collectFacts(
    'kadetten',
    {...kGame, league: 'EHL'},
    {snapshot: {...snap, tables: {EHL: table}}, fcsgData: fcsg},
    {
      headToHead: async () => {
        throw Error('nie');
      },
      recentGames: async () => {
        throw Error('nie');
      }
    }
  );
  assert.deepEqual([ehl.recent.length, ehl.duels.length], [1, 0], 'EHL: nur das eigene Team, keine SHV-Abfragen');

  const broken = await collectFacts(
    'kadetten',
    kGame,
    {snapshot: snap, fcsgData: fcsg},
    {
      headToHead: async () => {
        throw Error('weg');
      },
      recentGames: async () => {
        throw Error('weg');
      }
    }
  );
  assert.deepEqual([broken.duels.length, broken.recent[1].games.length], [0, 0]);

  const fc = await collectFacts(
    'fcsg',
    fGame,
    {
      snapshot: snap,
      fcsgData: {
        ...fcsg,
        games: [
          {...fGame, id: 'v1', date: '2026-10-04', home: 'FC Basel', away: 'FC St.Gallen 1879', score: [1, 2], status: 'FINISHED'},
          fGame
        ]
      }
    },
    {}
  );
  assert.deepEqual(
    [fc.recent.length, fc.recent[0].team, fc.recent[0].games.length],
    [1, 'FC St.Gallen 1879', 1],
    'FCSG: nur eigene Resultate, Gegner ohne Angabe'
  );
});

test('Vorschau-Text mit letzten Resultaten und mehreren Direktduellen: Absatz drei, höchstens drei Absätze, Quellen', () => {
  const g1 = {date: '2026-09-22', home: 'D', away: 'Kadetten Schaffhausen', score: [20, 27]};
  const g2 = {date: '2026-09-15', home: 'Kadetten Schaffhausen', away: 'C', score: [31, 31]};
  const d2 = {
    ...duel,
    id: '8',
    date: '2025-11-02',
    home: 'Kadetten Schaffhausen',
    away: 'Handball Stäfa',
    score: [35, 26],
    externalUrl: 'https://www.handball.ch/de/matchcenter/spiele/8'
  };
  const p = buildPreview({
    club: 'kadetten',
    game: kGame,
    table: table.QHL,
    duels: [duel, d2],
    recent: [
      {team: 'Kadetten Schaffhausen', games: [g1, g2]},
      {team: 'Handball Stäfa', games: [{date: '2026-10-03', home: 'Handball Stäfa', away: 'BSV Bern', score: [24, 30]}], shv: true}
    ],
    now: NOW
  });
  assert.equal(p.paragraphs.length, 3);
  assert.equal(
    p.paragraphs[2],
    'Die letzten Direktduelle: 14.03.2026 Handball Stäfa – Kadetten Schaffhausen 27:31; 02.11.2025 Kadetten Schaffhausen – Handball Stäfa 35:26. Zuletzt spielte Kadetten Schaffhausen: 22.09. D – Kadetten Schaffhausen 20:27; 15.09. Kadetten Schaffhausen – C 31:31. Zuletzt spielte Handball Stäfa: 03.10. Handball Stäfa – BSV Bern 24:30.'
  );
  assert.deepEqual(
    p.sources.map(s => s.label),
    [
      'Kadetten Schaffhausen: Matchcenter',
      'handball.ch: Direktduell vom 14.03.2026',
      'handball.ch: Direktduell vom 02.11.2025',
      'handball.ch: Matchcenter'
    ]
  );
  assert.equal(validPreview({...p, generatedAt: new Date().toISOString()}), true);
  const onlyForm = buildPreview({
    club: 'kadetten',
    game: kGame,
    table: null,
    recent: [{team: 'Kadetten Schaffhausen', games: [g1]}],
    now: NOW
  });
  assert.equal(onlyForm.paragraphs.length, 2, 'Spielangaben und letzte Resultate genügen');
  const broken = buildPreview({
    club: 'kadetten',
    game: kGame,
    table: table.QHL,
    recent: [{team: 'X', games: [{date: 'kaputt', home: 'a', away: 'b', score: ['1', 2]}]}],
    now: NOW
  });
  assert.equal(broken.paragraphs.length, 2, 'ungültige Resultate werden ignoriert');
});

test('Schreiblauf: der sachliche Text enthält die gesammelten Fakten (letzte Resultate, Direktduelle)', async () => {
  const snap = {
    ...snapshot,
    games: [{id: 'c', date: '2026-09-15', home: 'Kadetten Schaffhausen', away: 'C', score: [31, 31], league: 'QHL'}, kGame]
  };
  const bucket = memBucket();
  await syncPreviews(
    bucket,
    {snapshot: snap, fcsgData: {games: []}},
    {
      headToHead: async () => ({games: [duel]}),
      recentGames: async team => ({games: [{id: 'z', date: '2026-10-01', home: team, away: 'Z', score: [22, 21]}]}),
      now: NOW
    }
  );
  const last = JSON.parse(bucket.map.get('previews/kadetten/staefa.json')).paragraphs.at(-1);
  assert.match(last, /Das letzte Direktduell/);
  assert.match(last, /Zuletzt spielte Kadetten Schaffhausen: 15\.09\. Kadetten Schaffhausen – C 31:31\./);
  assert.match(last, /Zuletzt spielte Handball Stäfa: 01\.10\. Handball Stäfa – Z 22:21\./);
});

test('Oberfläche: «KI-Match-Vorschau» nur für KI-Texte und ältere Einsendungen, «Match-Vorschau» für Texte aus Daten', () => {
  const src = fs.readFileSync('archive/matchday/client/js/views-match.js', 'utf8');
  assert.match(src, /const ai=p\.generator!=='daten'/);
  assert.match(src, /ai\?'KI-Match-Vorschau':'Match-Vorschau'/);
  assert.match(src, /generator==='ki'\?'Von einer KI aus bestätigten Spiel- und Tabellendaten formuliert/);
});
