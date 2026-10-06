import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.mjs';
import {fixtureKey} from '../server/previews.mjs';

// Schreibweg der KI-Vorschauen auf dem Cloudflare-Datendienst: echter Worker, Speicher über die KV-Bindung `DATA`,
// Anmeldung nur über den Automationsschlüssel (X-Kadetten-Update-Key), keine Plattform-Identität.
const ORIGIN = 'https://kadetten-api.example.workers.dev';
const KEY = 'ein-langer-zufaelliger-schluessel-nur-fuer-den-test';
const sha = async text => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))).toString('hex');
const game = {id: 'v1', home: 'Kadetten Schaffhausen', away: 'Gegner', date: '2099-01-01', time: '18:45', league: 'QHL', venue: 'Breite'};
const preview = {
  club: 'kadetten', id: 'v1', fixtureKey: fixtureKey(game), headline: 'Heimspiel gegen den Gegner',
  paragraphs: ['Eine bestätigte Information über diese Partie und den Wettbewerb.', 'Weitere bestätigte Informationen zur Form der beiden Mannschaften.'],
  sources: [{label: 'Vereinsquelle', url: 'https://kadettensh.ch/'}], generatedAt: new Date().toISOString()
};

function kv(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    map,
    async get(key) { return map.has(key) ? new TextEncoder().encode(map.get(key)).buffer : null; },
    async put(key, value) { map.set(key, typeof value === 'string' ? value : new TextDecoder().decode(value)); }
  };
}
const post = (env, headers = {}, body = {previews: [preview]}) =>
  worker.fetch(new Request(ORIGIN + '/api/previews', {method: 'POST', headers, body: JSON.stringify(body)}), env);

test('Vorschauen auf Cloudflare: mit Schlüssel schreibbar, öffentlich lesbar, in KV gespeichert', async () => {
  const DATA = kv({'kadetten/current.json': {games: [game]}});
  const env = {DATA, KADETTEN_UPDATE_KEY_SHA256: await sha(KEY)};
  const r = await post(env, {'X-Kadetten-Update-Key': KEY});
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).saved, [{club: 'kadetten', id: 'v1'}]);
  assert.ok(DATA.map.has('previews/kadetten/v1.json'));
  const read = await worker.fetch(new Request(ORIGIN + '/api/previews/kadetten/v1'), env);
  assert.equal(read.status, 200);
  assert.equal(read.headers.get('Access-Control-Allow-Origin'), 'https://mac-mac-sg.github.io');
  assert.deepEqual((await read.json()).paragraphs, preview.paragraphs);
});

test('Vorschauen auf Cloudflare: ohne oder mit falschem Schlüssel und ohne eingerichteten Schlüssel wird nichts geschrieben', async () => {
  const state = {'kadetten/current.json': {games: [game]}};
  for (const [env, headers] of [
    [{DATA: kv(state), KADETTEN_UPDATE_KEY_SHA256: await sha(KEY)}, {}],
    [{DATA: kv(state), KADETTEN_UPDATE_KEY_SHA256: await sha(KEY)}, {'X-Kadetten-Update-Key': 'falsch'}],
    [{DATA: kv(state)}, {'X-Kadetten-Update-Key': KEY}]
  ]) {
    assert.equal((await post(env, headers)).status, 403);
    assert.equal([...env.DATA.map.keys()].some(k => k.startsWith('previews/')), false);
  }
});

test('Vorschauen auf Cloudflare: Schreibweg ist bei gültigem Schlüssel erreichbar (leere Sendung 400, nicht 403)', async () => {
  const env = {DATA: kv({'kadetten/current.json': {games: [game]}}), KADETTEN_UPDATE_KEY_SHA256: await sha(KEY)};
  assert.equal((await post(env, {'X-Kadetten-Update-Key': KEY}, {previews: []})).status, 400);
  assert.equal((await post(env, {}, {previews: []})).status, 403);
});
