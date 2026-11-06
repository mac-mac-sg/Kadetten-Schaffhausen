import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../src/kadetten/js/api.js';
import {createStore, SNAPSHOT_KEY} from '../src/kadetten/js/store.js';
import {liveWindow, startLive, LIVE_INTERVAL} from '../src/kadetten/js/live.js';
import {html, decodeDeep, escapeHtml} from '../src/kadetten/js/text.js';
import {parseRoute, href} from '../src/kadetten/js/router.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
const memory = () => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m}; };

test('API liest nur, ohne Anmeldedaten, Live nie aus dem Cache', async () => {
  const calls = [];
  const api = createApi({origin: 'https://api.example', fetchImpl: async (url, init) => { calls.push([url, init]); return json({ok: true, text: 'Kadetten &amp; GC'}); }});
  assert.deepEqual(await api.get('/api/data'), {ok: true, text: 'Kadetten & GC'});
  await api.live();
  assert.equal(calls[0][0], 'https://api.example/api/data');
  assert.equal(calls[0][1].method, 'GET');
  assert.equal(calls[0][1].credentials, 'omit');
  assert.equal(calls[1][1].cache, 'no-store');
  await assert.rejects(api.get('https://evil.example/api/data'));
  await assert.rejects(api.get('/api/../admin'));
  const failing = createApi({fetchImpl: async () => new Response('<html>', {status: 200, headers: {'Content-Type': 'text/html'}})});
  await assert.rejects(failing.data(), /kein JSON/);
});

test('Datenstand: letzter gültiger Stand bleibt bei Ausfall, Live wird nie gespeichert', async () => {
  const storage = memory();
  let fail = false;
  const snapshot = {games: [{id: '1'}], tables: {QHL: []}};
  const api = {data: async () => { if (fail) throw Error('weg'); return snapshot; }, live: async () => { if (fail) throw Error('weg'); return {ok: true, match: {id: 1, score: [1, 0]}}; }};
  const store = createStore({api, storage, now: () => 1000});
  await store.refresh(); await store.refreshLive();
  assert.deepEqual(store.state.data, snapshot);
  assert.ok(storage.getItem(SNAPSHOT_KEY));
  assert.ok([...storage.m.keys()].every(k => k.startsWith('v2:') && !/live/.test(k)));
  fail = true;
  await store.refresh(); await store.refreshLive();
  assert.deepEqual(store.state.data, snapshot);
  assert.deepEqual(store.state.live.match.score, [1, 0]);
  assert.ok(store.state.dataError && store.state.liveError);
  // Unvollständige Antworten ersetzen den gültigen Stand nicht.
  const broken = createStore({api: {data: async () => ({games: []})}, storage});
  assert.deepEqual(broken.state.data, snapshot);
  await broken.refresh();
  assert.deepEqual(broken.state.data, snapshot);
});

test('Live-Abfrage nur im Spielfenster und nur bei sichtbarer App', async () => {
  const games = [{date: '2026-10-24', time: '18:00', home: 'Kadetten Schaffhausen', away: 'GC Amicitia Zürich'}];
  assert.equal(liveWindow({games, now: Date.parse('2026-10-24T12:00:00Z')}), false);
  assert.equal(liveWindow({games, now: Date.parse('2026-10-24T15:50:00Z')}), true);
  assert.equal(liveWindow({games: [{...games[0], score: [33, 27]}], now: Date.parse('2026-10-24T17:00:00Z')}), false);
  let calls = 0; const timers = [];
  const doc = {visibilityState: 'visible', listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, removeEventListener() {}};
  const store = {state: {data: {games}, live: null}, refreshLive: async () => { calls++; }};
  const stop = startLive({store, doc, now: () => Date.parse('2026-10-24T16:30:00Z'), setTimer: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimer: () => {}});
  await new Promise(r => setImmediate(r));
  assert.equal(calls, 1);
  assert.equal(timers[0][1], LIVE_INTERVAL);
  doc.visibilityState = 'hidden'; doc.listeners.visibilitychange();
  await timers[0][0]();
  assert.equal(calls, 1, 'unsichtbare App fragt nicht ab');
  stop();
});

test('Ausgabe wird maskiert, verschachtelte Vorlagen bleiben erhalten', () => {
  const name = decodeDeep('Perić &lt;script&gt;');
  assert.equal(name, 'Perić <script>');
  assert.equal(String(html`<b>${name}</b>${html`<i>ok</i>`}`), '<b>Perić &lt;script&gt;</b><i>ok</i>');
  assert.equal(escapeHtml('"a"&\''), '&quot;a&quot;&amp;&#39;');
});

test('Routen: fünf Bereiche, Spielseite, Ich, Unbekanntes führt zu Jetzt', () => {
  assert.deepEqual(parseRoute(''), {area: 'jetzt', view: 'jetzt'});
  assert.deepEqual(parseRoute('#/saison/tabellen'), {area: 'statistik', view: 'tabellen'});
  assert.deepEqual(parseRoute('#/saison/quatsch'), {area: 'saison', view: 'spielplan'});
  assert.deepEqual(parseRoute('#/team/perić'), {area: 'team', view: 'team'});
  assert.deepEqual(parseRoute('#/team/peric-10'), {area: 'team', view: 'spieler', id: 'peric-10'});
  assert.deepEqual(parseRoute('#/spiel/508338'), {area: 'saison', view: 'spiel', id: '508338'});
  assert.deepEqual(parseRoute('#/ich'), {area: null, view: 'ich'});
  assert.deepEqual(parseRoute('#home'), {area: 'jetzt', view: 'jetzt'});
  assert.equal(href.saison('spielplan'), '#/saison');
  assert.equal(href.spiel('5 6'), '#/spiel/5%206');
});
