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

test('Live-Spielstand wird auch nach dem normalen API-Zeitlimit noch übernommen', async ({mock}) => {
  mock.timers.enable({apis: ['setTimeout']});
  const match = {id: 508393, score: [16, 14]};
  const api = createApi({fetchImpl: (url, {signal}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(json({ok: true, match})), 12000);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, {once: true});
  })});
  const store = createStore({api, storage: null});
  const live = store.refreshLive();
  const normalRequest = assert.rejects(api.data(), {name: 'AbortError'});
  mock.timers.tick(12000);
  await Promise.all([live, normalRequest]);
  assert.deepEqual(store.state.live?.match, match);
  assert.equal(store.state.liveError, null);
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

test('Ein bestätigtes Tagesresultat bleibt bei späteren Antworten ohne Endstand sichtbar', async () => {
  let now = Date.parse('2026-11-11T20:00:00Z');
  const finished = {id: 508393, date: '2026-11-11', score: [33, 27]};
  let response = {ok: true, match: null, finished};
  const store = createStore({api: {live: async () => response}, storage: null, now: () => now});
  await store.refreshLive();
  response = {ok: true, match: null, finished: null};
  await store.refreshLive();
  assert.deepEqual(store.state.live.finished, finished);
  now = Date.parse('2026-11-11T23:00:00Z');
  await store.refreshLive();
  assert.equal(store.state.live.finished, null);
});

test('Mehrfacher Wechsel in die sichtbare App startet nur einen laufenden Live-Abruf', async () => {
  let complete;
  let calls = 0;
  const games = [{date: '2026-10-24', time: '18:00', home: 'Kadetten Schaffhausen', away: 'GC Amicitia Zürich'}];
  const doc = {visibilityState: 'visible', addEventListener(t, f) { this.listener = f; }, removeEventListener() {}};
  const store = {state: {data: {games}, live: null}, refreshLive: () => {
    calls++;
    return new Promise(resolve => { complete = resolve; });
  }};
  const timers = [];
  const stop = startLive({store, doc, now: () => Date.parse('2026-10-24T16:30:00Z'), setTimer: f => timers.push(f), clearTimer: () => {}});
  for (const status of ['hidden', 'visible', 'hidden', 'visible']) {
    doc.visibilityState = status;
    doc.listener();
  }
  assert.equal(calls, 1);
  complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(timers.length, 1);
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
  assert.deepEqual(parseRoute('#/ich'), {area: 'ich', view: 'mein'});
  assert.deepEqual(parseRoute('#/ich/einstellungen'), {area: 'ich', view: 'ich'});
  assert.deepEqual(parseRoute('#/sammlung/k-10'), {area: 'ich', view: 'karte', id: 'k-10'});
  assert.deepEqual(parseRoute('#/sammlung/neu'), {area: null, view: 'neu'});
  assert.deepEqual(parseRoute('#home'), {area: 'jetzt', view: 'jetzt'});
  assert.equal(href.saison('spielplan'), '#/saison');
  assert.equal(href.spiel('5 6'), '#/spiel/5%206');
});

test('Fünfsekundentakt rechnet Abrufzeit an und bleibt unabhängig von offenen Statistiken', async () => {
  assert.equal(LIVE_INTERVAL, 5000);
  let now = Date.parse('2026-10-24T16:30:00Z'), calls = 0, detailCalls = 0, complete;
  const timers = [];
  const game = {date:'2026-10-24',time:'18:00',league:'EHL',home:'Kadetten Schaffhausen',away:'Gegner'};
  const state = {data:{games:[game]},live:{match:{id:'ehf',league:'European League'}}};
  const store = {state, refreshLive: async options => {
    assert.deepEqual(options,{source:'EHF',includeDetails:false}); calls++; now += 1200;
  }, refreshLiveDetails: () => { detailCalls++; return new Promise(resolve => { complete = resolve; }); }};
  const doc = {visibilityState:'visible',addEventListener(t,f){this.listener=f;},removeEventListener(){}};
  const stop = startLive({store,doc,now:()=>now,setTimer:(f,ms)=>{timers.push([f,ms]);return timers.length;},clearTimer:()=>{}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(timers[0][1],3800); assert.equal(detailCalls,1);
  now+=3800; await timers[0][0](); assert.equal(calls,2); assert.equal(detailCalls,1);
  complete(); await new Promise(resolve=>setImmediate(resolve));
  now+=30000; await timers[1][0](); assert.equal(detailCalls,2); complete();
  doc.visibilityState='hidden'; doc.listener();
  doc.visibilityState='visible'; doc.listener();
  await new Promise(resolve=>setImmediate(resolve)); assert.equal(calls,4,'Rückkehr prüft sofort');
  stop();
});

test('Späte Statistiken überschreiben keinen neueren Spielstand und bleiben bei Resultatabfragen erhalten', async () => {
  let response = {ok:true,checkedAt:'new',match:{id:1,score:[15,12],phase:'2. Halbzeit'}};
  let complete;
  const store = createStore({storage:null,api:{live: options => options?.includeDetails === true ? new Promise(resolve=>{complete=resolve;}) : Promise.resolve(response)}});
  await store.refreshLive({includeDetails:false});
  const details = store.refreshLiveDetails('SHV');
  complete({ok:true,checkedAt:'old',match:{id:1,score:[10,8],phase:'1. Halbzeit',details:{ok:true,players:[]}}});
  await details;
  assert.deepEqual(store.state.live.match.score,[15,12]); assert.equal(store.state.live.checkedAt,'new');
  assert.equal(store.state.live.match.phase,'2. Halbzeit');
  await store.refreshLive({includeDetails:false}); assert.equal(store.state.live.match.details.ok,true);
  const other = store.refreshLiveDetails('SHV');
  response = {ok:true,match:{id:2,score:[1,0]}}; await store.refreshLive();
  complete({ok:true,match:{id:1,details:{ok:true,players:[{id:7}]}}}); await other;
  assert.equal(store.state.live.match.details,undefined,'keine Statistiken eines anderen Spiels');
});

test('API übergibt Quelle und Detailauswahl ohne Browsercache', async () => {
  let request;
  const api=createApi({fetchImpl:async(url,init)=>{request={url,init};return json({ok:true});}});
  await api.live({source:'EHF',includeDetails:false});
  assert.equal(request.url,'/api/live?source=EHF&details=0'); assert.equal(request.init.cache,'no-store');
  await api.live({source:'SHV',includeDetails:true}); assert.equal(request.url,'/api/live?source=SHV&details=1');
});
