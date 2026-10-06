import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runProbe, createProbe, checks} from '../cloudflare/probe/worker.mjs';

test('Machbarkeitstest meldet Erfolg, Fehler und Dauer je Quelle, ohne Antwortinhalte', async () => {
  let t = 0;
  const now = () => (t += 10);
  const long = 'x'.repeat(500);
  const results = await runProbe(
    [
      ['gut', async () => ({status: 200})],
      ['schlecht', async () => { throw new Error(long); }]
    ],
    now
  );
  assert.deepEqual(results[0], {name: 'gut', ok: true, ms: 10, detail: {status: 200}});
  assert.equal(results[1].ok, false);
  assert.equal(results[1].error.length, 200);
  assert.ok(Number.isFinite(results[1].ms));
});

test('Test-Worker: nur GET /probe, alles andere abgewiesen, Standort aus der Anfrage', async () => {
  const probe = createProbe([['a', async () => ({ok: true})], ['b', async () => { throw new Error('gesperrt'); }]]);
  const get = (path, method = 'GET') => probe.fetch(Object.assign(new Request('https://probe.test' + path, {method}), {cf: {colo: 'ZRH', country: 'CH'}}));
  const ok = await get('/probe');
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.allOk, false);
  assert.equal(body.colo, 'ZRH');
  assert.equal(body.results.length, 2);
  assert.equal((await get('/probe', 'POST')).status, 405);
  assert.equal((await get('/other')).status, 404);
  assert.equal(ok.headers.get('Cache-Control'), 'no-store');
});

test('Test-Worker prüft alle Quellen der App und enthält keine Datenbindung', () => {
  const names = checks.map(c => c[0]).join('|');
  for (const host of ['kadettensh.ch', 'SHV', 'FCSG', 'fcsg.ch']) assert.ok(names.includes(host), host);
  const config = fs.readFileSync('cloudflare/probe/wrangler.toml', 'utf8');
  assert.doesNotMatch(config, /r2_buckets|kv_namespaces|\[vars\]|secret/i);
});
