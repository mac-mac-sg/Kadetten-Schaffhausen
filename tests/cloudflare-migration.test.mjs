import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.mjs';
import {fixtureKey} from '../server/previews.mjs';
import {collect, chunk, bulkWrite, compareServices, canonical, firstDifference} from '../scripts/lib/cloudflare-migration.mjs';

const OLD = 'https://old.example.test', NEW = 'https://new.example.test';
const sha = 'b'.repeat(64);
const game = (id, extra) => ({id, home: 'Kadetten Schaffhausen', away: 'Gegner ' + id, date: '2099-01-01', time: '18:00', league: 'QHL', venue: 'Halle', image: 'team.jpg', url: 'https://kadettensh.ch/x', ...extra});
const games = [game('508338', {date: '2026-08-26', score: [28, 20]}), game('508342', {date: '2026-08-29', score: [20, 25]}), game('999001')];
const snapshot = {
  games,
  stories: [{id: '42', articleVersion: sha, title: 'Titel', text: 'Text', date: '01.10.2026', image: 'a.jpg', url: 'https://kadettensh.ch/a/'}, {id: '43', title: 'Ohne Volltext', text: 'x', date: '01.10.2026', image: 'a.jpg', url: 'https://kadettensh.ch/b/'}],
  tables: {QHL: [], EHL: []}
};
const identity = g => JSON.stringify([g.id, g.home, g.away, g.date, g.time || '']);
const pdf = new Uint8Array([...new TextEncoder().encode('%PDF-1.4\n'), 0, 255, 128, 7, ...new TextEncoder().encode('\n%%EOF')]);

function oldService() {
  const mem = new Map();
  const put = (k, v) => mem.set(k, v);
  put('kadetten/current.json', JSON.stringify(snapshot));
  put(`kadetten/articles/42/${sha}.json`, JSON.stringify({id: '42', version: sha, html: '<p>Volltext ä</p>', url: 'https://kadettensh.ch/a/'}));
  put('kadetten/reports/508338.json', JSON.stringify({score: [28, 20], teams: ['A', 'B']}));
  put('previews/kadetten/999001.json', JSON.stringify({club: 'kadetten', id: '999001', fixtureKey: fixtureKey(games[2]), headline: 'Vorschau', paragraphs: ['a'.repeat(40), 'b'.repeat(40)], sources: [{label: 'Quelle', url: 'https://kadettensh.ch/'}], generatedAt: new Date().toISOString()}));
  put('kadetten/programmes/999001.json', JSON.stringify({id: '999001', fixtureKey: identity(games[2]), sourceUrl: 'https://kadettensh.ch/p.pdf', version: 'v1', bytes: pdf.length, updatedAt: '2026-10-01T00:00:00.000Z', home: games[2].home, away: games[2].away, date: games[2].date}));
  put('kadetten/programmes/999001/v1.pdf', pdf);
  const BUCKET = {get: async k => (mem.has(k) ? {json: async () => JSON.parse(mem.get(k)), body: mem.get(k)} : null), put: async (k, v) => void mem.set(k, v)};
  return {env: {BUCKET}};
}

function newService() {
  const map = new Map();
  const DATA = {
    async get(key, type) {
      assert.equal(type, 'arrayBuffer');
      if (!map.has(key)) return null;
      const v = map.get(key);
      return (typeof v === 'string' ? new TextEncoder().encode(v) : v).slice().buffer;
    },
    async put(key, value) { map.set(key, value); }
  };
  return {map, env: {DATA}};
}

function makeHttp(oldSvc, newSvc) {
  const call = async url => {
    const env = url.startsWith(OLD) ? oldSvc.env : newSvc.env;
    return worker.fetch(new Request(url), env);
  };
  return {
    json: async url => { const r = await call(url); let data = null; try { data = await r.json(); } catch {} return {status: r.status, data}; },
    bytes: async url => { const r = await call(url); return {status: r.status, bytes: new Uint8Array(await r.arrayBuffer())}; }
  };
}

// Nachbildung der KV-Schnittstelle «Mehrere Schlüssel schreiben».
function fakeBulkFetch(newSvc, log) {
  return async (url, init) => {
    log.push({url, method: init.method, auth: init.headers.Authorization});
    for (const e of JSON.parse(init.body)) newSvc.map.set(e.key, e.base64 ? new Uint8Array(Buffer.from(e.value, 'base64')) : e.value);
    return new Response(JSON.stringify({success: true}), {status: 200});
  };
}

test('Import und Vergleich: nach dem Import stimmen beide Dienste in allen Gruppen überein, inklusive PDF', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const oldSvc = oldService(), newSvc = newService(), http = makeHttp(oldSvc, newSvc);
    const before = await compareServices(http, OLD, NEW);
    assert.ok(before.rows.find(r => r.group === 'Datenstand').different > 0, 'vor dem Import weicht der Datenstand ab');

    const {entries, summary} = await collect(http, OLD);
    const keys = entries.map(e => e.key).sort();
    assert.deepEqual(keys, [
      'kadetten/articles/42/' + sha + '.json',
      'kadetten/current.json',
      'kadetten/programmes/999001.json',
      'kadetten/programmes/999001/v1.pdf',
      'kadetten/reports/508338.json',
      'previews/kadetten/999001.json'
    ]);
    assert.equal(entries.find(e => e.key.endsWith('.pdf')).base64, true);
    assert.equal(summary['Berichte'].skipped, 1, 'Bericht ohne gespeicherten Stand (508342) wird übersprungen');
    assert.equal(summary['Artikel'].read, 1, 'Meldung ohne Volltext erzeugt keine Anfrage');
    assert.equal(newSvc.map.size, 0, 'Sammeln schreibt nichts');

    const log = [];
    const n = await bulkWrite(fakeBulkFetch(newSvc, log), {accountId: 'acc', namespaceId: 'ns', token: 'geheim'}, entries);
    assert.equal(n, entries.length);
    assert.equal(log[0].method, 'PUT');
    assert.match(log[0].url, /\/accounts\/acc\/storage\/kv\/namespaces\/ns\/bulk$/);

    const after = await compareServices(http, OLD, NEW);
    for (const row of after.rows) assert.equal(row.different, 0, row.group + ': ' + row.first);
    const by = Object.fromEntries(after.rows.map(r => [r.group, r]));
    assert.equal(by['Datenstand'].compared, 1);
    assert.equal(by['Artikel'].compared, 1);
    assert.equal(by['Berichte'].compared, 1);
    assert.ok(by['Vorschauen'].compared >= 1);
    assert.equal(by['Matchprogramme'].equal, 3);
    assert.deepEqual([...new Uint8Array(await newSvc.env.DATA.get('kadetten/programmes/999001/v1.pdf', 'arrayBuffer'))], [...pdf]);
  } finally {
    globalThis.fetch = original;
  }
});

test('Vergleich erkennt eine abweichende Antwort und eine abweichende PDF-Datei', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const oldSvc = oldService(), newSvc = newService(), http = makeHttp(oldSvc, newSvc);
    const {entries} = await collect(http, OLD);
    await bulkWrite(fakeBulkFetch(newSvc, []), {accountId: 'a', namespaceId: 'n', token: 't'}, entries);
    newSvc.map.set('kadetten/programmes/999001/v1.pdf', new Uint8Array([...pdf.slice(0, -1), 33]));
    const r = await compareServices(http, OLD, NEW);
    const row = r.rows.find(x => x.group === 'Matchprogramme');
    assert.equal(row.different, 1);
    assert.match(row.first, /999001/);
    newSvc.map.set('kadetten/current.json', JSON.stringify({...snapshot, stories: []}));
    const stateRow = (await compareServices(http, OLD, NEW)).rows.find(x => x.group === 'Datenstand');
    assert.ok(stateRow.different > 0);
    assert.match(stateRow.first, /\/api\/data .* – stories/, 'Bericht nennt das abweichende Feld');
  } finally {
    globalThis.fetch = original;
  }
});

test('Import: ungültiger Datenstand bricht ab, Schreibfehler von Cloudflare werden gemeldet ohne Zugangsdaten', async () => {
  const bad = {json: async () => ({status: 200, data: {games: [], stories: []}}), bytes: async () => ({status: 404, bytes: new Uint8Array()})};
  await assert.rejects(collect(bad, OLD), /unerwartetes Format/);
  const failing = async () => new Response(JSON.stringify({success: false, errors: [{code: 10000, message: 'Authentication error'}]}), {status: 403});
  await assert.rejects(bulkWrite(failing, {accountId: 'a', namespaceId: 'n', token: 'GEHEIMER-TOKEN'}, [{key: 'k', value: 'v'}]), e => /HTTP 403/.test(e.message) && !e.message.includes('GEHEIMER-TOKEN'));
});

test('Pakete: höchstens die erlaubte Menge und Grösse je Anfrage, keine Einträge gehen verloren', () => {
  const entries = Array.from({length: 25}, (_, i) => ({key: 'k' + i, value: 'x'.repeat(100)}));
  const parts = chunk(entries, 1000, 10);
  assert.ok(parts.every(p => p.length <= 10));
  assert.equal(parts.flat().length, 25);
  assert.equal(chunk([{key: 'a', value: 'x'.repeat(50)}, {key: 'b', value: 'y'.repeat(50)}], 60, 10).length, 2);
  assert.equal(canonical({b: 1, a: [{d: 1, c: 2}]}), canonical({a: [{c: 2, d: 1}], b: 1}));
});

test('firstDifference nennt Pfad und gekürzte Werte des ersten Unterschieds', () => {
  assert.equal(firstDifference({a: 1, b: [1, 2]}, {b: [1, 2], a: 1}), '');
  assert.equal(firstDifference({games: [{id: 1, score: '2:1'}]}, {games: [{id: 1, score: null}]}), 'games[0].score: "2:1" gegen null');
  assert.equal(firstDifference({x: 1}, {}), 'x: 1 gegen fehlt');
  assert.equal(firstDifference([1, 2], [1]), '[1]: 2 gegen fehlt');
  assert.match(firstDifference({t: 'x'.repeat(200)}, {t: 'y'}), /^t: "x{56}\.\.\. gegen "y"$/);
});
