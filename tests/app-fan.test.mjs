import test from 'node:test';
import assert from 'node:assert/strict';
import {appRoute, APP_ORIGIN, VOTES_PER_IP, buildCalendar, voteWindow} from '../server/app-fan.mjs';
import {favouriteGoals} from '../server/push-monitor.mjs';
import {pushRoute, PUSH_ORIGIN, PUSH_PREFIX} from '../server/push-subscriptions.mjs';
import worker from '../server/worker.mjs';

// KV-Attrappe mit Metadaten und Präfix-Liste wie Workers KV.
function kv() {
  const data = new Map(), meta = new Map();
  return {data,
    get: async (k, type) => data.has(k) ? (type === 'json' ? JSON.parse(data.get(k)) : type === 'arrayBuffer' ? new TextEncoder().encode(data.get(k)).buffer : data.get(k)) : null,
    put: async (k, v, o = {}) => { data.set(k, v); if (o.metadata) meta.set(k, o.metadata); },
    delete: async k => { data.delete(k); meta.delete(k); },
    list: async ({prefix}) => ({keys: [...data.keys()].filter(k => k.startsWith(prefix)).map(name => ({name, metadata: meta.get(name)})), list_complete: true})};
}
const bucket = files => ({get: async k => files[k] ? {json: async () => files[k]} : null});
const game = {id: '508393', date: '2026-11-11', time: '19:15', home: 'Kadetten Schaffhausen', away: 'HSC Suhr Aarau', league: 'QHL', venue: 'BBC Arena, Schaffhausen', score: [33, 27]};
const kickoff = Date.parse('2026-11-11T18:15:00Z');
const report = {score: [33, 27], teams: [{name: 'Kadetten Schaffhausen', players: [{id: 10, name: 'PERIĆ Josip', goals: 8, keeper: false}, {id: 1, name: 'BERGMANN Leon', keeper: true, saves: 12, keeperShots: 30}, {id: 16, name: 'SERAVALLI Mathieu', keeper: true, saves: null, keeperShots: null}]}, {name: 'HSC Suhr Aarau', players: [{id: 99, name: 'MUSTER Max', goals: 9}]}]};
const env = () => ({DATA: kv(), BUCKET: bucket({'kadetten/current.json': {games: [game]}, 'kadetten/reports/508393.json': report})});
const post = (body, {origin = APP_ORIGIN, ip = '1.2.3.4'} = {}) => new Request('https://api.test/api/app/votes/508393', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip}, body: JSON.stringify(body)});
const call = (e, r, now) => appRoute(r, e, new URL(r.url), now);
const device = n => String(n).padStart(43, 'a');

test('Fan-Wahl: Zeitfenster, Kandidaten aus dem Spielbericht, eine Stimme pro Gerät', async () => {
  const e = env(), open = kickoff + 3 * 3600000;
  assert.deepEqual(voteWindow(game, kickoff).open, false);
  let r = await call(e, new Request('https://api.test/api/app/votes/508393'), kickoff + 30 * 60000);
  let d = await r.json();
  assert.equal(d.open, false); assert.equal(d.candidates.length, 0, 'vor Spielende keine Kandidaten');
  d = await (await call(e, new Request('https://api.test/api/app/votes/508393'), open)).json();
  assert.equal(d.open, true);
  assert.deepEqual(d.candidates.map(c => c.id), ['10', '1'], 'nur Kadetten, Torhüter ohne Einsatz entfällt');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), APP_ORIGIN);
  assert.equal((await call(e, post({player: '10', device: device(1)}, {origin: 'https://evil.test'}), open)).status, 403);
  assert.equal((await call(e, post({player: '99', device: device(1)}), open)).status, 400, 'Gegner nicht wählbar');
  assert.equal((await call(e, post({player: '10', device: 'kurz'}), open)).status, 400);
  r = await call(e, post({player: '10', device: device(1)}), open);
  d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.voted, '10'); assert.equal(d.counts['10'], 1); assert.equal(d.total, 1);
  assert.equal((await call(e, post({player: '1', device: device(1)}), open)).status, 409, 'zweite Stimme desselben Geräts');
  assert.ok([...e.DATA.data.keys()].every(k => !k.includes(device(1))), 'Geräteschlüssel nur gehasht gespeichert');
  for (let i = 2; i <= VOTES_PER_IP; i++) assert.equal((await call(e, post({player: '1', device: device(i)}), open)).status, 200);
  assert.equal((await call(e, post({player: '1', device: device(99)}), open)).status, 429, 'Grenze pro Anschluss');
  assert.equal((await call(e, post({player: '1', device: device(98)}, {ip: '5.6.7.8'}), open)).status, 200);
  d = await (await call(e, new Request('https://api.test/api/app/votes/508393'), open)).json();
  assert.deepEqual([d.counts['10'], d.counts['1'], d.total], [1, VOTES_PER_IP, VOTES_PER_IP + 1]);
  assert.equal((await call(e, post({player: '10', device: device(50)}, {ip: '9.9.9.9'}), kickoff + 27 * 3600000)).status, 409, 'nach Ablauf geschlossen');
  assert.equal((await call(e, new Request('https://api.test/api/app/votes/000'), open)).status, 404);
  const preflight = new Request('https://api.test/api/app/votes/508393', {method: 'OPTIONS', headers: {Origin: APP_ORIGIN}});
  assert.equal((await call(e, preflight, open)).status, 204);
});

test('Fan-Wahl über den Worker; Datenstand bleibt schreibgeschützt', async () => {
  const DATA = kv();
  await DATA.put('kadetten/current.json', JSON.stringify({games: [game]}));
  const r = await worker.fetch(new Request('https://api.test/api/app/votes/508393'), {DATA});
  assert.equal(r.status, 200);
  assert.equal((await worker.fetch(new Request('https://api.test/api/data', {method: 'POST'}), {DATA})).status, 405);
});

test('Kalender-Abo: nur Kadetten-Spiele, Zürcher Zeit in UTC, Resultate und Link zur Spielseite', async () => {
  const text = buildCalendar([game, {...game, id: '1', score: undefined, date: '2026-12-05', time: '18:00'}, {...game, id: '2', home: 'BSV Bern', away: 'Wacker Thun'}], Date.parse('2026-11-05T10:00:00Z'));
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(text, /DTSTART:20261111T181500Z/);
  assert.match(text, /DTSTART:20261205T170000Z/);
  assert.match(text, /SUMMARY:Kadetten Schaffhausen – HSC Suhr Aarau 33:27 \(QHL\)/);
  assert.ok(text.split('\r\n').every(l => l.length <= 75));
  const r = await appRoute(new Request('https://api.test/api/app/calendar.ics'), env(), new URL('https://api.test/api/app/calendar.ics'), Date.parse('2026-11-05T10:00:00Z'));
  assert.match(r.headers.get('Content-Type'), /text\/calendar/);
  assert.equal((await appRoute(new Request('https://api.test/api/app/calendar.ics', {method: 'POST'}), env(), new URL('https://api.test/api/app/calendar.ics'))).status, 405);
});

test('Push: Tore des Lieblingsspielers einmal pro Tor und Gerät, nur frisch gesehene Tore', async () => {
  const store = kv(), sends = [];
  const deps = {send: async (_, __, payload) => { sends.push(payload); return new Response(null, {status: 201}); }};
  const fan = {key: PUSH_PREFIX + 'fan', types: ['favourite'], favourite: {shv: 10}, createdAt: 0, subscription: {}};
  const other = {key: PUSH_PREFIX + 'other', types: ['final'], createdAt: 0, subscription: {}};
  const live = events => ({home: 'Kadetten Schaffhausen', away: 'HSC Suhr Aarau', details: {players: [{id: 10, name: 'PERIĆ Josip'}, {id: 6, name: 'RIKHARDSSON Odinn'}], events}});
  const goal = (id, score, home, away) => ({id, score, action: 'Tor', homePlayer: home, awayPlayer: away});
  const base = {kv: store, env: {}, deps, id: 'm1', fixture: {id: '508393'}, subscribers: [fan, other]};
  await favouriteGoals({...base, now: 1000, live: live([goal(1, [1, 0], 'RIKHARDSSON Odinn', null), goal(2, [2, 0], 'PERIĆ Josip', null), goal(3, [2, 1], null, 'PERIĆ Josip')])});
  assert.equal(sends.length, 1); assert.equal(sends[0].title, 'Tor von Josip Perić!'); assert.match(sends[0].body, /2 : 0/); assert.match(sends[0].url, /#\/spiel\/508393\/live$/);
  await favouriteGoals({...base, now: 61000, live: live([goal(2, [2, 0], 'PERIĆ Josip', null), goal(4, [3, 1], 'PERIĆ Josip', null)])});
  assert.equal(sends.length, 2, 'bereits gemeldetes Tor nicht wiederholt');
  await favouriteGoals({...base, now: 61000 + 6 * 60000, live: live([goal(5, [4, 1], 'PERIĆ Josip', null)])});
  assert.equal(sends.length, 3);
  // Ein Gerät, das erst später das Abo einrichtet, erhält keine älteren Tore.
  await favouriteGoals({...base, subscribers: [{...fan, key: PUSH_PREFIX + 'late', createdAt: 10 ** 9}], now: 61000 + 7 * 60000, live: live([goal(5, [4, 1], 'PERIĆ Josip', null)])});
  assert.equal(sends.length, 3);
});

test('Push-Abo akzeptiert den Lieblingsspieler nur mit gültiger Spieler-ID', async () => {
  const DATA = kv(), env = {DATA, PUSH_PRIVATE_JWK: 'x', PUSH_PUBLIC_KEY: 'x'};
  const s = {endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: {p256dh: 'BPx' + 'a'.repeat(84), auth: 'b'.repeat(22)}};
  const req = body => new Request('https://api.test/api/push/device', {method: 'PUT', headers: {Origin: PUSH_ORIGIN, Authorization: 'Bearer ' + 'a'.repeat(43), 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const call = r => pushRoute(r, env, new URL(r.url));
  assert.equal((await call(req({subscription: s, clubs: ['kadetten'], types: ['favourite']}))).status, 400);
  assert.equal((await call(req({subscription: s, clubs: ['kadetten'], types: ['favourite'], favourite: {shv: 'x'}}))).status, 400);
});
