import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {kvRestStore} from '../scripts/lib/kv-rest-store.mjs';
import {main} from '../scripts/cloudflare-update.mjs';
import {runRefresh} from '../server/refresh-run.mjs';

const seed = JSON.parse(fs.readFileSync('server/seed.json', 'utf8'));
const NS = fs.readFileSync('cloudflare/api/wrangler.toml', 'utf8').match(/^id = "([a-f0-9]{32})"/m)[1];

// Nachbildung der KV-REST-Schnittstelle: einzelner Schlüssel lesen (roh, 404 wenn fehlt) und «Mehrere Schlüssel schreiben».
function fakeCloudflare(initial = {}) {
  const map = new Map(Object.entries(initial));
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    calls.push({url, method: init.method || 'GET', auth: init.headers?.Authorization});
    const m = url.match(/\/storage\/kv\/namespaces\/([a-f0-9]+)\/(values\/(.+)|bulk)$/);
    assert.ok(m, 'unerwartete Adresse ' + url);
    assert.equal(m[1], NS);
    if (m[2] === 'bulk') {
      for (const e of JSON.parse(init.body)) map.set(e.key, e.base64 ? new Uint8Array(Buffer.from(e.value, 'base64')) : e.value);
      return new Response(JSON.stringify({success: true}), {status: 200});
    }
    const key = decodeURIComponent(m[3]);
    if (!map.has(key)) return new Response(JSON.stringify({success: false}), {status: 404});
    const v = map.get(key);
    return new Response(v, {status: 200});
  };
  return {map, calls, fetchFn};
}
const posts = () => seed.stories.map((s, i) => ({id: 1000 + i, link: s.url, title: {rendered: 'Titel ' + i}, excerpt: {rendered: '<p>eins zwei drei</p>'}, date: '2026-10-01T10:00:00', content: {rendered: '<p>Text ' + i + '</p>', protected: false}, _embedded: {}}));
const env = {CLOUDFLARE_API_TOKEN: 'GEHEIM-TOKEN', CLOUDFLARE_ACCOUNT_ID: 'konto1'};
async function offline(fn) {
  const original = globalThis.fetch, log = console.log;
  globalThis.fetch = async () => { throw new Error('offline'); };
  console.log = () => {};
  try { return await fn(); } finally { globalThis.fetch = original; console.log = log; }
}

test('KV über REST: lesen (roh, 404 = null), Text und Binärdaten schreiben, Fehler ohne Zugangsdaten', async () => {
  const cf = fakeCloudflare({'a/b.json': JSON.stringify({x: 'ä'})});
  const store = kvRestStore({accountId: 'konto1', namespaceId: NS, token: 'T', fetchFn: cf.fetchFn});
  assert.equal(await store.get('fehlt'), null);
  assert.deepEqual(await (await store.get('a/b.json')).json(), {x: 'ä'});
  assert.match(cf.calls.find(c => c.url.includes('a%2Fb.json')).url, /values\/a%2Fb\.json$/, 'Schlüssel wird prozentkodiert');
  await store.put('t.json', '{"ok":true}');
  await store.put('p.pdf', new Uint8Array([37, 80, 68, 70, 0, 255]));
  assert.equal(cf.map.get('t.json'), '{"ok":true}');
  assert.deepEqual([...cf.map.get('p.pdf')], [37, 80, 68, 70, 0, 255]);
  assert.ok(cf.calls.every(c => c.auth === 'Bearer T'));
  const failing = kvRestStore({accountId: 'a', namespaceId: NS, token: 'GEHEIM-TOKEN', fetchFn: async () => new Response('{}', {status: 403})});
  await assert.rejects(failing.get('k'), e => /HTTP 403/.test(e.message) && !e.message.includes('GEHEIM-TOKEN'));
  await assert.rejects(failing.put('k', 'v'), e => /HTTP 403/.test(e.message) && !e.message.includes('GEHEIM-TOKEN'));
});

test('runRefresh: Trockenlauf schreibt nichts, normaler Lauf sichert alten Stand und schreibt den neuen', async () => {
  await offline(async () => {
    const mem = new Map();
    const bucket = {get: async k => (mem.has(k) ? {json: async () => JSON.parse(mem.get(k))} : null), put: async (k, v) => void mem.set(k, v)};
    const dry = await runRefresh(bucket, {previous: seed, hadPrevious: true, supplied: {posts: posts()}, write: false});
    assert.equal(dry.ok, true);
    assert.equal(dry.written, false);
    assert.equal(mem.size, 0);
    const real = await runRefresh(bucket, {previous: seed, hadPrevious: true, supplied: {posts: posts()}});
    assert.equal(real.written, true);
    assert.ok(mem.has('kadetten/previous.json') && mem.has('kadetten/current.json'));
    assert.equal(JSON.parse(mem.get('kadetten/current.json')).stories[0].title, 'Titel 0');
    const none = await runRefresh(bucket, {previous: seed, hadPrevious: false, supplied: {}});
    assert.equal(none.ok, false, 'ohne erreichbare Quelle gilt der Lauf als fehlgeschlagen');
  });
});

test('Aktualisierung in Actions: Trockenlauf ändert nichts, Schreiblauf aktualisiert KV, Totalausfall schreibt nichts', async () => {
  await offline(async () => {
    const start = {'kadetten/current.json': JSON.stringify(seed)};
    const dry = fakeCloudflare(start);
    await main({schreiben: false, env, fetchFn: dry.fetchFn, supplied: {posts: posts()}});
    assert.equal(dry.calls.filter(c => c.method !== 'GET').length, 0, 'Trockenlauf schreibt nicht');
    assert.equal(dry.map.get('kadetten/current.json'), start['kadetten/current.json']);

    const live = fakeCloudflare(start);
    const result = await main({schreiben: true, env, fetchFn: live.fetchFn, supplied: {posts: posts()}});
    assert.equal(result.written, true);
    assert.equal(JSON.parse(live.map.get('kadetten/current.json')).stories[0].title, 'Titel 0');
    assert.ok(live.map.has('kadetten/previous.json'));
    assert.ok(live.calls.every(c => c.auth === 'Bearer GEHEIM-TOKEN'));

    const down = fakeCloudflare(start);
    await assert.rejects(main({schreiben: true, env, fetchFn: down.fetchFn}), /Alle Quellen/);
    assert.equal(down.calls.filter(c => c.method !== 'GET').length, 0, 'bei Totalausfall bleibt der letzte Stand');
    await assert.rejects(main({schreiben: true, env: {}, fetchFn: down.fetchFn}), /fehlen/);
  });
});

test('Zeitplan: kein GitHub-Zeitplan mehr, Auslösung nur per workflow_dispatch durch den Worker', () => {
  const wf = fs.readFileSync('.github/workflows/cloudflare-update.yml', 'utf8');
  assert.doesNotMatch(wf, /^\s*schedule:/m, 'kein schedule-Trigger');
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /MODUS: \$\{\{ inputs\.modus \|\| 'schreiben' \}\}/, 'Lauf ohne Eingabe schreibt');
});
