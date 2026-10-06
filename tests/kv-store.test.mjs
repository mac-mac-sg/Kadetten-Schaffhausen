import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../server/worker.mjs';
import {kvStore} from '../server/kv-store.mjs';

// Nachbildung von Workers KV: get(key, 'arrayBuffer') liefert ArrayBuffer oder null, put nimmt Text oder Binärdaten.
function fakeKv() {
  const map = new Map();
  return {
    map,
    async get(key, type) {
      assert.equal(type, 'arrayBuffer');
      if (!map.has(key)) return null;
      const v = map.get(key);
      return typeof v === 'string' ? new TextEncoder().encode(v).buffer : v.slice().buffer;
    },
    async put(key, value) {
      assert.ok(typeof value === 'string' || ArrayBuffer.isView(value) || value instanceof ArrayBuffer);
      map.set(key, typeof value === 'string' ? value : new Uint8Array(value instanceof ArrayBuffer ? value : value.buffer, value.byteOffset ?? 0, value.byteLength));
    }
  };
}

test('KV-Schicht: Text, JSON und Binärdaten wie bei R2, fehlende Schlüssel ergeben null', async () => {
  const store = kvStore(fakeKv());
  assert.equal(await store.get('fehlt'), null);
  await store.put('a/b.json', JSON.stringify({x: 'Grüsse ä'}));
  const saved = await store.get('a/b.json');
  assert.deepEqual(await saved.json(), {x: 'Grüsse ä'});
  assert.equal(await saved.text(), '{"x":"Grüsse ä"}');
  const pdf = new Uint8Array([37, 80, 68, 70, 45, 0, 255, 128]);
  await store.put('p.pdf', pdf, {httpMetadata: {contentType: 'application/pdf'}});
  const file = await store.get('p.pdf');
  assert.deepEqual([...new Uint8Array(await file.arrayBuffer())], [...pdf]);
  const res = new Response(file.body, {headers: {'Content-Type': 'application/pdf'}});
  assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [...pdf]);
});

const seed = JSON.parse(fs.readFileSync('server/seed.json', 'utf8'));
const owner = {'oai-authenticated-user-id': '1', 'oai-authenticated-user-email': 'o@example.test', Origin: 'https://k.example.chatgpt.site'};
const base = {KADETTEN_OWNER_EMAIL: 'o@example.test', KADETTEN_AUTH_PROVIDER: 'sites', KADETTEN_SITES_ORIGIN: 'https://k.example.chatgpt.site'};
function r2Env() {
  const mem = new Map();
  return {mem, env: {...base, BUCKET: {get: async k => (mem.has(k) ? {json: async () => JSON.parse(mem.get(k))} : null), put: async (k, v) => void mem.set(k, v)}}};
}
function kvEnv() {
  const kv = fakeKv();
  return {kv, env: {...base, DATA: kv}};
}
const call = async (env, path, init) => {
  const r = await worker.fetch(new Request('https://k.example.chatgpt.site' + path, init), env);
  return {status: r.status, body: await r.text()};
};

test('Datendienst mit KV (DATA) antwortet wie mit R2 (BUCKET), inklusive Aktualisierung und Artikel', async () => {
  const sha = 'a'.repeat(64);
  const stories = seed.stories.map((s, i) => (i === 0 ? {...s, articleVersion: sha} : s));
  const snapshot = JSON.stringify({...seed, stories});
  const article = JSON.stringify({id: seed.stories[0].id, version: sha, html: '<p>x</p>', url: 'https://kadettensh.ch/x'});
  const r2 = r2Env(), kv = kvEnv();
  for (const m of [r2.mem, kv.kv.map]) {
    m.set('kadetten/current.json', snapshot);
    m.set('kadetten/articles/' + seed.stories[0].id + '/' + sha + '.json', article);
  }
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    for (const path of ['/api/data', '/api/access', '/api/articles/' + seed.stories[0].id, '/api/articles/nope', '/api/reports/abc']) {
      assert.deepEqual(await call(kv.env, path), await call(r2.env, path), path);
    }
    const posts = seed.stories.map((s, i) => ({id: 1000 + i, link: s.url, title: {rendered: 'Titel ' + i}, excerpt: {rendered: '<p>eins zwei drei</p>'}, date: '2026-10-01T10:00:00', content: {rendered: '<p>Text ' + i + '</p>', protected: false}, _embedded: {}}));
    const refresh = env => call(env, '/api/refresh', {method: 'POST', headers: owner, body: JSON.stringify({posts})});
    const a = await refresh(r2.env), b = await refresh(kv.env);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(JSON.parse(b.body).news, JSON.parse(a.body).news);
    const after = JSON.parse((await call(kv.env, '/api/data')).body);
    assert.equal(after.stories[0].title, 'Titel 0');
    assert.ok(kv.kv.map.has('kadetten/previous.json'));
  } finally {
    globalThis.fetch = original;
  }
});

test('Ohne Plattform-Dateien (Cloudflare) antworten unbekannte Pfade, sw.js und Manifest mit 404 statt 503; mit ASSETS bleibt alles wie bisher', async () => {
  const {env} = kvEnv();
  for (const path of ['/', '/index.html', '/sw.js', '/manifest.webmanifest', '/api/unknown']) {
    const r = await call(env, path);
    assert.equal(r.status, 404, path);
    assert.equal(JSON.parse(r.body).error, 'Not found');
  }
  const withAssets = {...env, ASSETS: {fetch: async r => new Response('asset:' + new URL(r.url).pathname)}};
  assert.equal((await call(withAssets, '/index.html')).body, 'asset:/index.html');
  assert.equal((await call(withAssets, '/sw.js')).body, 'asset:/sw.js');
});

test('Ist BUCKET vorhanden, wird DATA nicht verwendet (Sites-Betrieb unverändert)', async () => {
  const r2 = r2Env();
  const kv = fakeKv();
  kv.get = async () => { throw new Error('KV darf nicht gelesen werden'); };
  const r = await call({...r2.env, DATA: kv}, '/api/data');
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.body).games.length, seed.games.length);
});
