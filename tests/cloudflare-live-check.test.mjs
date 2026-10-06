import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLiveRoutes, listLiveRoutes} from '../scripts/lib/live-check.mjs';
import {main} from '../scripts/cloudflare-live-check.mjs';

const OLD = 'https://alt.test', NEW = 'https://neu.test';
const games = [{id: '1', home: 'Kadetten Schaffhausen', away: 'HC Kriens-Luzern'}];
const ok = {ok: true, match: null};

// responses: Pfad ohne Abfrage -> Antwort je Dienst
function fake(newOverrides = {}) {
  const calls = [];
  return {
    calls,
    async json(url) {
      calls.push(url);
      const u = new URL(url), isNew = u.origin === NEW;
      const key = u.pathname;
      if (key === '/api/data') return {status: 200, data: {games}, ms: 1};
      if (isNew && key in newOverrides) return newOverrides[key];
      return {status: 200, data: ok, ms: 1};
    }
  };
}

test('Live-Routen: Gegner und Team werden aus dem Datenstand abgeleitet, nur GET-Routen werden geprüft', async () => {
  const http = fake();
  const routes = await listLiveRoutes(http, OLD);
  assert.deepEqual(routes.map(r => r.path.split('?')[0]), ['/api/live', '/api/fcsg/live', '/api/fcsg/players', '/api/recent-games', '/api/head-to-head']);
  assert.match(routes.at(-1).path, /away=HC%20Kriens-Luzern/);
});

test('Live-Routen: gleich gesunde Dienste bestehen, gestörter neuer Dienst wird erkannt', async () => {
  let r = await checkLiveRoutes(fake(), OLD, NEW);
  assert.equal(r.failed, false);
  assert.ok(r.rows.every(x => x.verdict === 'gleich'));

  r = await checkLiveRoutes(fake({'/api/live': {status: 503, data: {ok: false, error: 'Live source unavailable'}, ms: 5}}), OLD, NEW);
  assert.equal(r.failed, true);
  const row = r.rows.find(x => x.path === '/api/live');
  assert.equal(row.verdict, 'NEUER DIENST GESTÖRT');
  assert.match(row.target, /HTTP 503 Live source unavailable/);

  r = await checkLiveRoutes(fake({'/api/fcsg/live': {status: 200, data: {ok: false}, ms: 1}}), OLD, NEW);
  assert.equal(r.failed, true, 'ok:false gilt als gestört, auch bei HTTP 200');
});

test('Live-Routen: Ausfall nur beim bisherigen Dienst ist kein Fehler des neuen', async () => {
  const http = {
    async json(url) {
      const u = new URL(url);
      if (u.pathname === '/api/data') return {status: 200, data: {games}};
      return u.origin === OLD ? {status: 503, data: {ok: false}} : {status: 200, data: ok};
    }
  };
  const r = await checkLiveRoutes(http, OLD, NEW);
  assert.equal(r.failed, false);
  assert.ok(r.rows.every(x => x.verdict === 'nur neuer Dienst gesund'));
});

test('Live-Routen: main liefert Exit-Code 1 bei gestörtem neuem Dienst und 0 sonst', async () => {
  const quiet = console.log;
  console.log = () => {};
  try {
    assert.equal(await main(fake(), OLD, NEW), 0);
    assert.equal(await main(fake({'/api/live': {status: 0, data: {error: 'x'}}}), OLD, NEW), 1);
  } finally {
    console.log = quiet;
  }
});
